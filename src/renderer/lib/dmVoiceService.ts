import {
  Room,
  RoomEvent,
  Track,
  ConnectionQuality,
  LocalAudioTrack,
  type LocalTrackPublication,
} from 'livekit-client';
import { api } from './api';
import { useVoiceSettingsStore } from '../stores/voiceSettingsStore';
import { noiseSuppressionService } from './noiseSuppressionService';
import { soundService } from './soundService';
import { toastStore } from '../stores/toastNotifications';

let dmRoom: Room | null = null;

// ── Call phase state ───────────────────────────────────────────────────────

export type DMCallPhase = 'idle' | 'notifying' | 'waiting' | 'connected';

let callPhase: DMCallPhase = 'idle';
let notifyingTimer: ReturnType<typeof setTimeout> | null = null;
let autoKickTimer: ReturnType<typeof setTimeout> | null = null;
let autoLeaveAfterRemoteLeftTimer: ReturnType<typeof setTimeout> | null = null;
let remoteParticipantJoined = false;
let connectionQualityInterval: ReturnType<typeof setInterval> | null = null;

// ── Deafen state ───────────────────────────────────────────────────────────

let dmDeafened = false;
let wasMutedBeforeDeafen = false;

// ── Screen share state ─────────────────────────────────────────────────────

let dmScreenSharePublication: LocalTrackPublication | null = null;

// ── DM Video element tracking ─────────────────────────────────────────
const dmVideoElements = new Map<string, HTMLVideoElement>();

export interface DMVoiceParticipant {
  userId: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isDeafened?: boolean;
  isScreenSharing?: boolean;
  connectionQuality?: 'excellent' | 'good' | 'poor' | 'lost';
}

type DMVoiceCallback = (event: string, data: any) => void;
let dmEventCallback: DMVoiceCallback | null = null;

export function onDMVoiceEvent(cb: DMVoiceCallback): () => void {
  dmEventCallback = cb;
  return () => { dmEventCallback = null; };
}

function emit(event: string, data: unknown) {
  dmEventCallback?.(event, data);
}

function clearAllTimers(): void {
  if (notifyingTimer) { clearTimeout(notifyingTimer); notifyingTimer = null; }
  if (autoKickTimer) { clearTimeout(autoKickTimer); autoKickTimer = null; }
  if (autoLeaveAfterRemoteLeftTimer) { clearTimeout(autoLeaveAfterRemoteLeftTimer); autoLeaveAfterRemoteLeftTimer = null; }
  if (connectionQualityInterval) { clearInterval(connectionQualityInterval); connectionQualityInterval = null; }
}

export function getCallPhase(): DMCallPhase {
  return callPhase;
}

export function getDMConnectionQuality(): { quality: 'excellent' | 'good' | 'poor' | 'lost' } | null {
  if (!dmRoom || !dmRoom.localParticipant) return null;
  const lkQuality = dmRoom.localParticipant.connectionQuality;
  const qualityMap: Record<string, 'excellent' | 'good' | 'poor' | 'lost'> = {
    [ConnectionQuality.Excellent]: 'excellent',
    [ConnectionQuality.Good]: 'good',
    [ConnectionQuality.Poor]: 'poor',
    [ConnectionQuality.Lost]: 'lost',
  };
  return { quality: qualityMap[lkQuality] || 'good' };
}

export async function joinDMVoice(dmChannelId: string): Promise<{ success: boolean; error?: string }> {
  try {
    callPhase = 'notifying';
    remoteParticipantJoined = false;
    emit('call-phase-change', { phase: 'notifying' });

    const response = await api.post<{
      livekit_token: string;
      livekit_url: string;
    }>(`/api/dms/${dmChannelId}/voice/join`);

    const voiceSettings = useVoiceSettingsStore.getState();
    const nsMode = voiceSettings.noiseCancellationMode;
    const nsSupported = nsMode !== 'off' && noiseSuppressionService.checkCapabilities(nsMode).supported;
    const effectiveNsMode = nsSupported ? nsMode : 'off';

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        deviceId: voiceSettings.inputDevice !== 'default' ? voiceSettings.inputDevice : undefined,
        autoGainControl: voiceSettings.autoGainControl,
        echoCancellation: voiceSettings.echoCancellation,
        noiseSuppression: effectiveNsMode !== 'off' ? false : voiceSettings.noiseSuppression,
      },
      audioOutput: {
        deviceId: voiceSettings.outputDevice !== 'default' ? voiceSettings.outputDevice : undefined,
      },
    });

    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        const element = track.attach();
        document.body.appendChild(element);
        element.style.display = 'none';
        // If we're deafened, mute the newly attached audio
        if (dmDeafened) {
          element.muted = true;
        }
      }
      if (track.kind === Track.Kind.Video) {
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        track.attach(video);
        dmVideoElements.set(participant.identity, video);
        emit('dm-video-started', { participantId: participant.identity });
      }
      emit('participant-update', getDMParticipants(room));
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
      if (track.kind === Track.Kind.Video) {
        const video = dmVideoElements.get(participant.identity);
        if (video) {
          track.detach(video);
          video.remove();
          dmVideoElements.delete(participant.identity);
        }
        emit('dm-video-stopped', { participantId: participant.identity });
      }
      track.detach().forEach((el) => el.remove());
      emit('participant-update', dmRoom ? getDMParticipants(dmRoom) : []);
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      remoteParticipantJoined = true;
      callPhase = 'connected';
      emit('call-phase-change', { phase: 'connected' });
      // Clear notifying/waiting timers
      if (notifyingTimer) { clearTimeout(notifyingTimer); notifyingTimer = null; }
      if (autoKickTimer) { clearTimeout(autoKickTimer); autoKickTimer = null; }
      if (autoLeaveAfterRemoteLeftTimer) { clearTimeout(autoLeaveAfterRemoteLeftTimer); autoLeaveAfterRemoteLeftTimer = null; }
      emit('participant-update', getDMParticipants(room));
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      emit('participant-update', getDMParticipants(room));
      // If remote left after being connected, start 5min auto-leave timer
      if (remoteParticipantJoined && room.remoteParticipants.size === 0) {
        emit('remote-participant-left', null);
        autoLeaveAfterRemoteLeftTimer = setTimeout(() => {
          leaveDMVoice();
        }, 5 * 60 * 1000); // 5 minutes
      }
    });

    room.on(RoomEvent.ActiveSpeakersChanged, () => {
      emit('participant-update', getDMParticipants(room));
    });

    room.on(RoomEvent.Disconnected, () => {
      clearAllTimers();
      callPhase = 'idle';
      emit('call-phase-change', { phase: 'idle' });
      emit('disconnected', null);
      dmRoom = null;
    });

    await room.connect(response.livekit_url, response.livekit_token);

    // Pre-check microphone availability before attempting to enable it.
    let hasMicAccess = false;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasMic = devices.some((d) => d.kind === 'audioinput' && d.deviceId !== '');
      if (hasMic) {
        const testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        testStream.getTracks().forEach((t) => t.stop());
        hasMicAccess = true;
      }
    } catch {
      // No mic access
    }

    if (!hasMicAccess) {
      console.warn('[DMVoiceService] No microphone available, joining muted');
      toastStore.addToast({
        type: 'warning',
        title: 'No microphone detected',
        message: 'You joined the call muted. Check your mic permissions or audio device settings.',
        duration: 8000,
      });
    }

    if (hasMicAccess) {
    try {
      if (effectiveNsMode !== 'off') {
        try {
          const rawStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: voiceSettings.inputDevice !== 'default' ? { exact: voiceSettings.inputDevice } : undefined,
              autoGainControl: voiceSettings.autoGainControl,
              echoCancellation: voiceSettings.echoCancellation,
              noiseSuppression: false,
            },
          });
          const cleanStream = await noiseSuppressionService.processOutboundTrack(
            rawStream, effectiveNsMode, voiceSettings.nsAggressiveness,
          );
          const cleanTrack = cleanStream.getAudioTracks()[0];
          await room.localParticipant.publishTrack(cleanTrack, {
            source: Track.Source.Microphone,
          });
          console.log(`[DMVoiceService] Microphone enabled with ${effectiveNsMode} noise suppression`);
        } catch (nsErr: any) {
          // If mic permission was denied, don't bother with fallback — join muted
          if (nsErr?.name === 'NotAllowedError' || nsErr?.message?.includes('Permission denied')) {
            throw nsErr;
          }
          console.warn(`[DMVoiceService] ${effectiveNsMode} NS failed, falling back to browser NS:`, nsErr);
          await room.localParticipant.setMicrophoneEnabled(true);
        }
      } else {
        await room.localParticipant.setMicrophoneEnabled(true);
      }
    } catch (micErr: any) {
      // Microphone unavailable (permission denied, no device, sandboxed browser, etc.)
      // Join muted — user can unmute manually once a mic becomes available
      console.warn('[DMVoiceService] Microphone unavailable, joining muted:', micErr.message || micErr);
      toastStore.addToast({
        type: 'warning',
        title: 'No microphone detected',
        message: 'You joined the call muted. Check your mic permissions or audio device settings.',
        duration: 8000,
      });
    }
    } // close if (hasMicAccess)

    dmRoom = room;

    // 30s notifying timer — transition to 'waiting' if no one joins
    notifyingTimer = setTimeout(() => {
      if (callPhase === 'notifying') {
        callPhase = 'waiting';
        emit('call-phase-change', { phase: 'waiting' });
      }
    }, 30_000);

    // 5min auto-kick timer — disconnect if still alone
    autoKickTimer = setTimeout(() => {
      if (!remoteParticipantJoined && dmRoom) {
        leaveDMVoice();
      }
    }, 5 * 60 * 1000);

    // Connection quality polling (2s interval)
    connectionQualityInterval = setInterval(() => {
      if (dmRoom) {
        emit('connection-quality', getDMConnectionQuality());
      }
    }, 2000);

    emit('connected', { dmChannelId });
    emit('participant-update', getDMParticipants(room));

    return { success: true };
  } catch (err: unknown) {
    callPhase = 'idle';
    emit('call-phase-change', { phase: 'idle' });
    const message = err instanceof Error ? err.message : 'Failed to join DM voice';
    return { success: false, error: message };
  }
}

export async function leaveDMVoice(): Promise<void> {
  clearAllTimers();
  callPhase = 'idle';
  dmDeafened = false;
  wasMutedBeforeDeafen = false;
  remoteParticipantJoined = false;
  if (dmScreenSharePublication) {
    dmScreenSharePublication = null;
  }
  // Clean up video elements
  dmVideoElements.forEach((video) => { video.pause(); video.srcObject = null; video.remove(); });
  dmVideoElements.clear();
  if (dmRoom) {
    await noiseSuppressionService.destroy();
    dmRoom.disconnect();
    dmRoom = null;
    emit('call-phase-change', { phase: 'idle' });
    emit('disconnected', null);
  }
}

/**
 * Get the video element for a DM participant (by user ID / LiveKit identity).
 */
export function getDMVideoElement(participantId: string): HTMLVideoElement | null {
  return dmVideoElements.get(participantId) || null;
}

export async function toggleDMMute(): Promise<boolean> {
  if (!dmRoom) return false;
  const enabled = dmRoom.localParticipant.isMicrophoneEnabled;
  await dmRoom.localParticipant.setMicrophoneEnabled(!enabled);
  emit('participant-update', getDMParticipants(dmRoom));
  return !enabled;
}

export async function toggleDMDeafen(shouldDeafen?: boolean): Promise<boolean> {
  if (!dmRoom) return false;
  const newDeafened = shouldDeafen !== undefined ? shouldDeafen : !dmDeafened;

  if (newDeafened && !dmDeafened) {
    // Going deaf — save current mute state, mute mic
    wasMutedBeforeDeafen = !dmRoom.localParticipant.isMicrophoneEnabled;
    await dmRoom.localParticipant.setMicrophoneEnabled(false);
  } else if (!newDeafened && dmDeafened) {
    // Undeafening — restore previous mute state
    if (!wasMutedBeforeDeafen) {
      await dmRoom.localParticipant.setMicrophoneEnabled(true);
    }
  }

  dmDeafened = newDeafened;

  // Mute/unmute all remote audio elements
  for (const participant of dmRoom.remoteParticipants.values()) {
    for (const pub of participant.audioTrackPublications.values()) {
      if (pub.track) {
        pub.track.attachedElements.forEach((el) => {
          (el as HTMLMediaElement).muted = newDeafened;
        });
      }
    }
  }

  emit('participant-update', getDMParticipants(dmRoom));
  return newDeafened;
}

export function isDMDeafened(): boolean {
  return dmDeafened;
}

export async function toggleDMVideo(): Promise<boolean> {
  if (!dmRoom) return false;
  const enabled = dmRoom.localParticipant.isCameraEnabled;
  await dmRoom.localParticipant.setCameraEnabled(!enabled);
  emit('participant-update', getDMParticipants(dmRoom));
  return !enabled;
}

// ── DM Screen share ───────────────────────────────────────────────────────

export type DMScreenShareQuality = 'standard' | 'high' | 'native';

const DM_SCREEN_QUALITIES = {
  standard: { width: 1280, height: 720, fps: 30, bitrate: 2_500_000 },
  high:     { width: 1920, height: 1080, fps: 60, bitrate: 6_000_000 },
  native:   { width: 0,    height: 0,    fps: 30, bitrate: 8_000_000 },
} as const;

export async function startDMScreenShare(quality: DMScreenShareQuality = 'standard'): Promise<boolean> {
  if (!dmRoom) return false;
  try {
    const config = DM_SCREEN_QUALITIES[quality];
    await dmRoom.localParticipant.setScreenShareEnabled(true, {
      audio: true,
      resolution: quality === 'native' ? undefined : {
        width: config.width,
        height: config.height,
        frameRate: config.fps,
      },
    }, {
      screenShareEncoding: {
        maxBitrate: config.bitrate,
        maxFramerate: config.fps,
      },
    });
    emit('participant-update', getDMParticipants(dmRoom));
    return true;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'NotAllowedError') return false;
    console.error('[DMVoiceService] Screen share error:', err);
    return false;
  }
}

export async function stopDMScreenShare(): Promise<void> {
  if (!dmRoom) return;
  if (dmScreenSharePublication) {
    try {
      await dmRoom.localParticipant.unpublishTrack(dmScreenSharePublication.track!, true);
    } catch {
      // Track may already be unpublished
    }
    dmScreenSharePublication = null;
  }
  await dmRoom.localParticipant.setScreenShareEnabled(false);
  emit('participant-update', getDMParticipants(dmRoom));
}

export function isDMScreenSharing(): boolean {
  if (!dmRoom) return false;
  return dmRoom.localParticipant.isScreenShareEnabled;
}

export function isDMConnected(): boolean {
  return dmRoom !== null && dmRoom.state === 'connected';
}

function getDMParticipants(room: Room): DMVoiceParticipant[] {
  const participants: DMVoiceParticipant[] = [];

  const local = room.localParticipant;
  const lkQuality = local.connectionQuality;
  const qualityMap: Record<string, 'excellent' | 'good' | 'poor' | 'lost'> = {
    [ConnectionQuality.Excellent]: 'excellent',
    [ConnectionQuality.Good]: 'good',
    [ConnectionQuality.Poor]: 'poor',
    [ConnectionQuality.Lost]: 'lost',
  };

  participants.push({
    userId: local.identity,
    username: local.name || local.identity,
    isMuted: !local.isMicrophoneEnabled,
    isSpeaking: local.isSpeaking,
    isDeafened: dmDeafened,
    isScreenSharing: local.isScreenShareEnabled,
    connectionQuality: qualityMap[lkQuality] || 'good',
  });

  room.remoteParticipants.forEach((p) => {
    const rQuality = p.connectionQuality;
    participants.push({
      userId: p.identity,
      username: p.name || p.identity,
      isMuted: !p.isMicrophoneEnabled,
      isSpeaking: p.isSpeaking,
      isScreenSharing: Array.from(p.trackPublications.values()).some(
        (pub) => pub.source === Track.Source.ScreenShare,
      ),
      connectionQuality: qualityMap[rQuality] || 'good',
    });
  });

  return participants;
}
