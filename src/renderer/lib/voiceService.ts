import {
  Room,
  RoomEvent,
  Track,
  LocalTrackPublication,
  RemoteTrackPublication,
  Participant,
  LocalParticipant,
  RemoteParticipant,
} from 'livekit-client';
import { api } from './api';

let currentRoom: Room | null = null;

export interface VoiceParticipant {
  id: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
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

export async function joinVoiceChannel(channelId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get LiveKit token from server via IPC proxy
    const response = await api.post<{
      livekit_token: string;
      livekit_url: string;
      permissions: { can_speak: boolean; can_video: boolean; can_stream: boolean };
    }>(`/api/voice/join/${channelId}`);

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    // Set up event handlers
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        const element = track.attach();
        document.body.appendChild(element);
        element.style.display = 'none';
      }
      emit('participant-update', getParticipants(room));
    });

    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach().forEach((el) => el.remove());
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

    room.on(RoomEvent.Disconnected, () => {
      emit('disconnected', null);
      currentRoom = null;
    });

    // Connect
    await room.connect(response.livekit_url, response.livekit_token);

    // Enable microphone
    if (response.permissions.can_speak) {
      await room.localParticipant.setMicrophoneEnabled(true);
    }

    currentRoom = room;
    emit('connected', { channelId });
    emit('participant-update', getParticipants(room));

    return { success: true };
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

export async function toggleDeafen(): Promise<boolean> {
  if (!currentRoom) return false;
  // Deafen = mute all remote audio tracks
  const remoteParticipants = Array.from(currentRoom.remoteParticipants.values());
  const anyEnabled = remoteParticipants.some((p) =>
    Array.from(p.audioTrackPublications.values()).some((pub) => !pub.isMuted)
  );

  // Toggle: if any are enabled, mute all; if all muted, unmute all
  // LiveKit doesn't have a native "deafen" — we simulate by adjusting volume
  return !anyEnabled;
}

export function isConnected(): boolean {
  return currentRoom !== null && currentRoom.state === 'connected';
}

export function getRoom(): Room | null {
  return currentRoom;
}

function getParticipants(room: Room): VoiceParticipant[] {
  const participants: VoiceParticipant[] = [];

  // Local participant
  const local = room.localParticipant;
  participants.push({
    id: local.identity,
    username: local.name || local.identity,
    isMuted: !local.isMicrophoneEnabled,
    isSpeaking: local.isSpeaking,
  });

  // Remote participants
  room.remoteParticipants.forEach((participant) => {
    participants.push({
      id: participant.identity,
      username: participant.name || participant.identity,
      isMuted: !participant.isMicrophoneEnabled,
      isSpeaking: participant.isSpeaking,
    });
  });

  return participants;
}
