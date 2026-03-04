import {
  Room,
  RoomEvent,
  Track,
  ConnectionQuality,
} from 'livekit-client';
import { api } from './api';
import { useAuthStore } from '../stores/authStore';

let currentRoom: Room | null = null;

export interface VoiceParticipant {
  id: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isDeafened?: boolean;
  isStreaming?: boolean;
  avatarUrl?: string;
}

type VoiceCallback = (event: string, data: any) => void;
let eventCallback: VoiceCallback | null = null;

export function onVoiceEvent(cb: VoiceCallback): () => void {
  eventCallback = cb;
  return () => { eventCallback = null; };
}

function emit(event: string, data: any) {
  eventCallback?.(event, data);
}

// Per-user volume (0-200%)
const userVolumes = new Map<string, number>();

export function setUserVolume(userId: string, volume: number) {
  userVolumes.set(userId, Math.max(0, Math.min(200, volume)));
  if (!currentRoom) return;

  const participant = currentRoom.remoteParticipants.get(userId);
  if (participant) {
    participant.audioTrackPublications.forEach((pub) => {
      if (pub.track) {
        const elements = pub.track.attachedElements;
        elements.forEach((el) => {
          (el as HTMLMediaElement).volume = volume / 100;
        });
      }
    });
  }
}

export function getUserVolume(userId: string): number {
  return userVolumes.get(userId) ?? 100;
}

export async function joinVoiceChannel(channelId: string): Promise<{
  success: boolean;
  error?: string;
  permissions?: { canSpeak: boolean; canVideo: boolean; canStream: boolean };
}> {
  try {
    const response = await api.post<{
      livekit_token?: string;
      livekit_url?: string;
      token?: string;
      url?: string;
      permissions: {
        can_speak?: boolean; can_video?: boolean; can_stream?: boolean;
        canSpeak?: boolean; canVideo?: boolean; canStream?: boolean;
      };
    }>(`/api/voice/join/${channelId}`);

    // Server returns different keys for temp_voice_generator vs regular channels
    const livekitToken = response.livekit_token || response.token;
    const livekitUrl = response.livekit_url || response.url;
    const canSpeak = response.permissions.can_speak ?? response.permissions.canSpeak ?? false;
    const canVideo = response.permissions.can_video ?? response.permissions.canVideo ?? false;
    const canStream = response.permissions.can_stream ?? response.permissions.canStream ?? false;

    if (!livekitToken || !livekitUrl) {
      return { success: false, error: 'Server returned incomplete voice connection data' };
    }

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    // Audio track subscribed
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        const element = track.attach();
        document.body.appendChild(element);
        element.style.display = 'none';

        // Apply per-user volume
        const vol = userVolumes.get(participant.identity);
        if (vol !== undefined) {
          element.volume = vol / 100;
        }
      }

      // Detect screen share
      if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
        emit('screen-share-started', {
          participantId: participant.identity,
          participantName: participant.name || participant.identity,
        });
      }

      emit('participant-update', getParticipants(room));
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      track.detach().forEach((el) => el.remove());

      if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
        emit('screen-share-stopped', { participantId: participant.identity });
      }

      emit('participant-update', currentRoom ? getParticipants(currentRoom) : []);
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      emit('participant-update', getParticipants(room));
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      emit('participant-update', getParticipants(room));
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      emit('speakers-changed', speakers.map((s) => s.identity));
      emit('participant-update', getParticipants(room));
    });

    room.on(RoomEvent.Reconnecting, () => {
      emit('reconnecting', null);
    });

    room.on(RoomEvent.Reconnected, () => {
      emit('connected', { channelId });
    });

    room.on(RoomEvent.Disconnected, () => {
      emit('disconnected', null);
      currentRoom = null;
    });

    await room.connect(livekitUrl, livekitToken);

    if (canSpeak) {
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch {
        // Token may restrict publishing (e.g. AFK channels) — silently continue
      }
    }

    currentRoom = room;
    emit('connected', { channelId });
    emit('participant-update', getParticipants(room));

    return {
      success: true,
      permissions: { canSpeak, canVideo, canStream },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to join voice channel' };
  }
}

export async function leaveVoiceChannel(): Promise<void> {
  if (currentRoom) {
    currentRoom.disconnect();
    currentRoom = null;
    emit('disconnected', null);
  }
}

export async function toggleMute(): Promise<boolean> {
  if (!currentRoom) return false;
  const enabled = currentRoom.localParticipant.isMicrophoneEnabled;
  await currentRoom.localParticipant.setMicrophoneEnabled(!enabled);
  emit('participant-update', getParticipants(currentRoom));
  return !enabled;
}

export async function toggleScreenShare(): Promise<boolean> {
  if (!currentRoom) return false;
  const isSharing = currentRoom.localParticipant.isScreenShareEnabled;
  await currentRoom.localParticipant.setScreenShareEnabled(!isSharing);
  return !isSharing;
}

export async function toggleDeafen(shouldDeafen: boolean): Promise<boolean> {
  if (!currentRoom) return false;

  // Mute/unmute all remote audio elements
  for (const participant of currentRoom.remoteParticipants.values()) {
    for (const pub of participant.audioTrackPublications.values()) {
      if (pub.track) {
        pub.track.attachedElements.forEach((el) => {
          (el as HTMLMediaElement).muted = shouldDeafen;
        });
      }
    }
  }

  // Also mute mic when deafening (deafen = deaf + mute, like Discord)
  if (shouldDeafen && currentRoom.localParticipant.isMicrophoneEnabled) {
    await currentRoom.localParticipant.setMicrophoneEnabled(false);
    emit('participant-update', getParticipants(currentRoom));
  }

  return shouldDeafen;
}

export function getConnectionQuality(): { ping: number; quality: 'excellent' | 'good' | 'poor' | 'lost' } | null {
  if (!currentRoom || !currentRoom.localParticipant) return null;

  const lkQuality = currentRoom.localParticipant.connectionQuality;
  const qualityMap: Record<string, 'excellent' | 'good' | 'poor' | 'lost'> = {
    [ConnectionQuality.Excellent]: 'excellent',
    [ConnectionQuality.Good]: 'good',
    [ConnectionQuality.Poor]: 'poor',
    [ConnectionQuality.Lost]: 'lost',
  };

  return {
    ping: 0, // LiveKit doesn't expose RTT directly; we use quality level instead
    quality: qualityMap[lkQuality] || 'good',
  };
}

export function isConnected(): boolean {
  return currentRoom !== null && currentRoom.state === 'connected';
}

export function getRoom(): Room | null {
  return currentRoom;
}

function getParticipants(room: Room): VoiceParticipant[] {
  const participants: VoiceParticipant[] = [];

  const local = room.localParticipant;
  const currentUser = useAuthStore.getState().user;
  participants.push({
    id: local.identity,
    username: currentUser?.display_name || currentUser?.username || local.name || local.identity,
    isMuted: !local.isMicrophoneEnabled,
    isSpeaking: local.isSpeaking,
    isStreaming: local.isScreenShareEnabled,
    avatarUrl: currentUser?.avatar_url || undefined,
  });

  room.remoteParticipants.forEach((participant) => {
    participants.push({
      id: participant.identity,
      username: participant.name || participant.identity,
      isMuted: !participant.isMicrophoneEnabled,
      isSpeaking: participant.isSpeaking,
      isStreaming: Array.from(participant.trackPublications.values()).some(
        (pub) => pub.source === Track.Source.ScreenShare,
      ),
    });
  });

  return participants;
}

// ── Device switching ────────────────────────────────────────────────────────

export async function switchInputDevice(deviceId: string): Promise<void> {
  if (!currentRoom) return;
  await currentRoom.switchActiveDevice('audioinput', deviceId);
}

export async function switchOutputDevice(deviceId: string): Promise<void> {
  if (!currentRoom) return;
  await currentRoom.switchActiveDevice('audiooutput', deviceId);
}

export function setGlobalOutputVolume(volume: number): void {
  if (!currentRoom) return;
  const normalized = Math.max(0, Math.min(200, volume)) / 100;
  for (const participant of currentRoom.remoteParticipants.values()) {
    for (const pub of participant.audioTrackPublications.values()) {
      if (pub.track) {
        pub.track.attachedElements.forEach((el) => {
          (el as HTMLMediaElement).volume = normalized;
        });
      }
    }
  }
}
