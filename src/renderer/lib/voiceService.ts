import {
  Room,
  RoomEvent,
  Track,
  ConnectionQuality,
  LocalAudioTrack,
  type LocalTrackPublication,
} from 'livekit-client';
import { api } from './api';
import { emitVoiceActivity } from '../api/socket';
import { useAuthStore } from '../stores/authStore';
import { useVoiceSettingsStore } from '../stores/voiceSettingsStore';
import { soundService } from './soundService';
import { createAppAudioTrack, destroyAppAudioTrack } from './appAudioBridge';
import { noiseSuppressionService } from './noiseSuppressionService';

let currentRoom: Room | null = null;

export interface VoiceParticipant {
  id: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
  isDeafened?: boolean;
  isServerMuted?: boolean;
  isServerDeafened?: boolean;
  isStreaming?: boolean;
  avatarUrl?: string;
}

// ── Screen share types & constants ──────────────────────────────────────────

export type ScreenShareQuality = 'standard' | 'high' | 'native';

const SCREEN_SHARE_QUALITIES = {
  STANDARD: { width: 1280, height: 720, fps: 30, bitrate: 2_500_000 },
  HIGH:     { width: 1920, height: 1080, fps: 60, bitrate: 6_000_000 },
  NATIVE:   { width: 0,    height: 0,    fps: 30, bitrate: 8_000_000 },
} as const;

// ── Screen share module state ───────────────────────────────────────────────

let localScreenShareVideoElement: HTMLVideoElement | null = null;
const screenShareVideoElements = new Map<string, HTMLVideoElement>();
const screenShareAudioTracks = new Map<string, any>();
const screenShareAudioElements = new Map<string, HTMLAudioElement>();

// ── Per-app audio capture state ─────────────────────────────────────────────

let appAudioTrackPublication: LocalTrackPublication | null = null;
let audioModeResolve: ((mode: 'none' | 'app' | 'system') => void) | null = null;
let audioModePromise: Promise<'none' | 'app' | 'system'> | null = null;

const electronAPI = (window as any).electronAPI;

// Listen for audio mode selection from the main process (set during screen share picker)
electronAPI?.screenShare?.onAudioModeSelected?.((mode: 'none' | 'app' | 'system') => {
  if (audioModeResolve) {
    audioModeResolve(mode);
    audioModeResolve = null;
  }
});

// ── AFK activity tracking state ────────────────────────────────────────────

let activityListeners: Array<{ event: string; handler: () => void }> = [];
let activityDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let lastActivityPing = 0;

const ACTIVITY_DEBOUNCE_MS = 60_000; // Max 1 ping per 60s

function setupActivityTracking(): void {
  teardownActivityTracking();

  const handler = () => {
    const now = Date.now();
    if (now - lastActivityPing < ACTIVITY_DEBOUNCE_MS) return;
    lastActivityPing = now;

    if (activityDebounceTimer) clearTimeout(activityDebounceTimer);
    activityDebounceTimer = setTimeout(() => {
      emitVoiceActivity();
    }, 100); // Small delay to batch rapid events
  };

  const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
  for (const event of events) {
    window.addEventListener(event, handler, { passive: true });
    activityListeners.push({ event, handler });
  }

  // Send initial activity ping on setup
  emitVoiceActivity();
  lastActivityPing = Date.now();
}

function teardownActivityTracking(): void {
  for (const { event, handler } of activityListeners) {
    window.removeEventListener(event, handler);
  }
  activityListeners = [];
  if (activityDebounceTimer) {
    clearTimeout(activityDebounceTimer);
    activityDebounceTimer = null;
  }
  lastActivityPing = 0;
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

// ── Participant info cache (populated from socket events) ────────────────────
// Maps user ID → display info so we can resolve LiveKit identity UUIDs to names

interface CachedParticipantInfo {
  username: string;
  displayName?: string;
  avatarUrl?: string;
}

const participantInfoCache = new Map<string, CachedParticipantInfo>();

export function cacheParticipantInfo(userId: string, info: CachedParticipantInfo): void {
  participantInfoCache.set(userId, info);
}

export function clearParticipantInfoCache(): void {
  participantInfoCache.clear();
}

// ── Server-side voice state (server mute/deafen, not reflected in LiveKit) ───

interface ServerVoiceState {
  isServerMuted?: boolean;
  isServerDeafened?: boolean;
}

const serverVoiceStates = new Map<string, ServerVoiceState>();

export function updateServerVoiceState(userId: string, state: Partial<ServerVoiceState>): void {
  const existing = serverVoiceStates.get(userId) || {};
  serverVoiceStates.set(userId, { ...existing, ...state });
  // Trigger participant update so the UI reflects the new state
  if (currentRoom) {
    emit('participant-update', getParticipants(currentRoom));
  }
}

export function clearServerVoiceStates(): void {
  serverVoiceStates.clear();
}

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

    // Read voice settings for audio capture defaults
    const voiceSettings = useVoiceSettingsStore.getState();
    const useAiNs = voiceSettings.aiNoiseSuppression && noiseSuppressionService.checkCapabilities().supported;

    const room = new Room({
      adaptiveStream: true,
      dynacast: true,
      audioCaptureDefaults: {
        deviceId: voiceSettings.inputDevice !== 'default' ? voiceSettings.inputDevice : undefined,
        autoGainControl: voiceSettings.autoGainControl,
        echoCancellation: voiceSettings.echoCancellation,
        noiseSuppression: useAiNs ? false : voiceSettings.noiseSuppression,
      },
      audioOutput: {
        deviceId: voiceSettings.outputDevice !== 'default' ? voiceSettings.outputDevice : undefined,
      },
      publishDefaults: {
        dtx: true,  // Discontinuous Transmission — save bandwidth during silence
        red: true,  // Redundant encoding — resilience against packet loss
      },
    });

    // Audio/video track subscribed
    room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        // Screen share audio — store for StreamViewer to manage
        if (publication.source === Track.Source.ScreenShareAudio) {
          screenShareAudioTracks.set(participant.identity, track);
          emit('screen-share-audio-available', { participantId: participant.identity });
        } else {
          // Regular mic audio — auto-attach
          const element = track.attach();
          document.body.appendChild(element);
          element.style.display = 'none';
          const vol = userVolumes.get(participant.identity);
          if (vol !== undefined) {
            element.volume = vol / 100;
          }
        }
      }

      // Detect screen share video
      if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
        // Create and store video element for this streamer
        const video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        track.attach(video);
        screenShareVideoElements.set(participant.identity, video);

        emit('screen-share-started', {
          participantId: participant.identity,
          participantName: participant.name || participant.identity,
        });
      }

      emit('participant-update', getParticipants(room));
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      // Clean up screen share audio
      if (publication.source === Track.Source.ScreenShareAudio) {
        detachScreenShareAudio(participant.identity);
      }

      // Clean up screen share video
      if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
        const video = screenShareVideoElements.get(participant.identity);
        if (video) {
          track.detach(video);
          video.remove();
          screenShareVideoElements.delete(participant.identity);
        }
        emit('screen-share-stopped', { participantId: participant.identity });
      }

      // Detach all other elements
      track.detach().forEach((el) => el.remove());

      emit('participant-update', currentRoom ? getParticipants(currentRoom) : []);
    });

    room.on(RoomEvent.ParticipantConnected, () => {
      // Play stream-join sound when we're screen sharing and a viewer joins
      if (room.localParticipant.isScreenShareEnabled) {
        soundService.play('stream-join');
      }
      emit('participant-update', getParticipants(room));
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      // Play stream-leave sound when we're screen sharing and a viewer leaves
      if (room.localParticipant.isScreenShareEnabled) {
        soundService.play('stream-leave');
      }
      emit('participant-update', getParticipants(room));
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      emit('speakers-changed', speakers.map((s) => s.identity));
      emit('participant-update', getParticipants(room));
    });

    // Track mute/unmute — updates muted icon when a remote user toggles mic
    room.on(RoomEvent.TrackMuted, () => {
      emit('participant-update', getParticipants(room));
    });

    room.on(RoomEvent.TrackUnmuted, () => {
      emit('participant-update', getParticipants(room));
    });

    room.on(RoomEvent.Reconnecting, () => {
      emit('reconnecting', null);
    });

    room.on(RoomEvent.Reconnected, () => {
      emit('connected', { channelId });
      // Refresh participant list after reconnection to fix stale state
      emit('participant-update', getParticipants(room));
    });

    room.on(RoomEvent.Disconnected, () => {
      emit('disconnected', null);
      currentRoom = null;
    });

    await room.connect(livekitUrl, livekitToken);

    if (canSpeak) {
      if (useAiNs) {
        try {
          await noiseSuppressionService.loadModel();
          const rawStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              deviceId: voiceSettings.inputDevice !== 'default' ? { exact: voiceSettings.inputDevice } : undefined,
              autoGainControl: voiceSettings.autoGainControl,
              echoCancellation: voiceSettings.echoCancellation,
              noiseSuppression: false,
            },
          });
          const cleanStream = await noiseSuppressionService.processOutboundTrack(rawStream);
          const cleanTrack = cleanStream.getAudioTracks()[0];
          await room.localParticipant.publishTrack(cleanTrack, {
            source: Track.Source.Microphone,
          });
          console.log('[VoiceService] Microphone enabled with AI noise suppression');
        } catch (nsErr) {
          console.warn('[VoiceService] AI NS failed, falling back to browser NS:', nsErr);
          await room.localParticipant.setMicrophoneEnabled(true);
        }
      } else {
        try {
          await room.localParticipant.setMicrophoneEnabled(true);
        } catch {
          // Token may restrict publishing (e.g. AFK channels) — silently continue
        }
      }
    }

    currentRoom = room;
    // Join sound is played via the socket voice.join event handler (supports custom sounds + AFK check)
    setupActivityTracking();
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
  teardownActivityTracking();
  if (currentRoom) {
    // Leave sound is NOT played for the leaving user — only remaining users hear it via socket event

    // Clean up per-app audio capture
    if (appAudioTrackPublication) {
      appAudioTrackPublication = null;
      destroyAppAudioTrack();
    }

    cleanupLocalScreenSharePreview();
    screenShareAudioElements.forEach((audio) => { audio.pause(); audio.srcObject = null; audio.remove(); });
    screenShareAudioElements.clear();
    screenShareAudioTracks.clear();
    screenShareVideoElements.forEach((video) => { video.pause(); video.srcObject = null; video.remove(); });
    screenShareVideoElements.clear();
    await noiseSuppressionService.destroy();
    currentRoom.disconnect();
    currentRoom = null;
    clearParticipantInfoCache();
    clearServerVoiceStates();
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

// ── Screen share ────────────────────────────────────────────────────────────

export async function startScreenShare(quality: ScreenShareQuality = 'standard'): Promise<boolean> {
  if (!currentRoom) {
    console.warn('[voiceService] Cannot start screen share — not in a room');
    return false;
  }

  try {
    console.log(`[voiceService] Starting screen share with quality: ${quality}`);
    const qualityKey = quality.toUpperCase() as keyof typeof SCREEN_SHARE_QUALITIES;
    const config = SCREEN_SHARE_QUALITIES[qualityKey];

    // Set up a promise to receive the audio mode from the picker (via main process IPC).
    // The main process sends the mode BEFORE resolving getDisplayMedia.
    audioModePromise = new Promise((resolve) => { audioModeResolve = resolve; });

    // Request screen share. The main process controls what audio comes back
    // via setDisplayMediaRequestHandler (system loopback, none, or per-app).
    // We always request audio: true so the main process can decide.
    await currentRoom.localParticipant.setScreenShareEnabled(true, {
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

    // Wait for the audio mode (should already be resolved by now)
    const audioMode = await audioModePromise;
    audioModePromise = null;
    console.log(`[voiceService] Audio mode selected: ${audioMode}`);

    // If per-app audio was selected, publish a custom audio track from WASAPI capture
    if (audioMode === 'app') {
      try {
        const appAudioMediaTrack = await createAppAudioTrack();
        if (appAudioMediaTrack) {
          const localAudioTrack = new LocalAudioTrack(appAudioMediaTrack, undefined, true);
          appAudioTrackPublication = await currentRoom.localParticipant.publishTrack(
            localAudioTrack,
            {
              source: Track.Source.ScreenShareAudio,
              dtx: false, // Never use DTX for captured audio — underrun silence would suppress transmission
              red: true,
            },
          );
          console.log('[voiceService] Per-app audio track published');
        }
      } catch (audioErr) {
        console.warn('[voiceService] Failed to publish per-app audio:', audioErr);
        // Screen share video still works without audio
      }
    }

    console.log('[voiceService] Screen share enabled successfully');
    createLocalScreenSharePreview();
    emit('participant-update', getParticipants(currentRoom));
    return true;
  } catch (err: any) {
    if (err.name === 'NotAllowedError') {
      console.log('[voiceService] Screen share cancelled by user');
      return false;
    }
    console.error('[voiceService] Screen share error:', err);
    throw err;
  }
}

export async function stopScreenShare(): Promise<void> {
  if (!currentRoom) return;

  // Clean up per-app audio capture if active
  if (appAudioTrackPublication) {
    try {
      await currentRoom.localParticipant.unpublishTrack(
        appAudioTrackPublication.track!,
        true, // stopOnUnpublish
      );
    } catch {
      // Track may already be unpublished
    }
    appAudioTrackPublication = null;
    destroyAppAudioTrack();
  }

  await currentRoom.localParticipant.setScreenShareEnabled(false);
  cleanupLocalScreenSharePreview();
  emit('participant-update', getParticipants(currentRoom));
}

export async function toggleScreenShare(quality?: ScreenShareQuality): Promise<boolean> {
  if (!currentRoom) return false;
  if (currentRoom.localParticipant.isScreenShareEnabled) {
    await stopScreenShare();
    return false;
  }
  return startScreenShare(quality);
}

// ── Local screen share preview ──────────────────────────────────────────────

function createLocalScreenSharePreview(): void {
  if (!currentRoom) return;
  const screenPub = currentRoom.localParticipant.getTrackPublication(Track.Source.ScreenShare);
  if (!screenPub?.track) return;

  const video = document.createElement('video');
  video.autoplay = true;
  video.playsInline = true;
  video.muted = true; // Prevent audio feedback
  screenPub.track.attach(video);
  localScreenShareVideoElement = video;
}

function cleanupLocalScreenSharePreview(): void {
  if (localScreenShareVideoElement) {
    localScreenShareVideoElement.pause();
    localScreenShareVideoElement.srcObject = null;
    localScreenShareVideoElement.remove();
    localScreenShareVideoElement = null;
  }
}

export function getLocalScreenShareVideo(): HTMLVideoElement | null {
  return localScreenShareVideoElement;
}

export function isLocalUserStreamer(streamerId: string): boolean {
  if (!currentRoom) return false;
  return currentRoom.localParticipant.identity === streamerId;
}

export function getVideoElementForStreamer(streamerId: string): HTMLVideoElement | null {
  // Check local first
  if (currentRoom && currentRoom.localParticipant.identity === streamerId) {
    return localScreenShareVideoElement;
  }
  return screenShareVideoElements.get(streamerId) || null;
}

// ── Screen share audio management ───────────────────────────────────────────

export function hasScreenShareAudio(streamerId: string): boolean {
  return screenShareAudioTracks.has(streamerId);
}

export function attachScreenShareAudio(
  streamerId: string, volume: number = 100, muted: boolean = false,
): HTMLAudioElement | null {
  const track = screenShareAudioTracks.get(streamerId);
  if (!track) return null;

  let audio = screenShareAudioElements.get(streamerId);
  if (audio) {
    audio.volume = volume / 100;
    audio.muted = muted;
    return audio;
  }

  audio = document.createElement('audio');
  audio.autoplay = true;
  audio.volume = volume / 100;
  audio.muted = muted;
  track.attach(audio);
  screenShareAudioElements.set(streamerId, audio);
  return audio;
}

export function updateScreenShareAudio(streamerId: string, volume: number, muted: boolean): void {
  const audio = screenShareAudioElements.get(streamerId);
  if (audio) {
    audio.volume = volume / 100;
    audio.muted = muted;
  }
}

export function detachScreenShareAudio(streamerId: string): void {
  const audio = screenShareAudioElements.get(streamerId);
  if (audio) {
    audio.pause();
    audio.srcObject = null;
    audio.remove();
    screenShareAudioElements.delete(streamerId);
  }
  screenShareAudioTracks.delete(streamerId);
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
  const localServerState = serverVoiceStates.get(local.identity);
  participants.push({
    id: local.identity,
    username: currentUser?.display_name || currentUser?.username || local.name || local.identity,
    isMuted: !local.isMicrophoneEnabled || !!localServerState?.isServerMuted,
    isSpeaking: local.isSpeaking,
    isStreaming: local.isScreenShareEnabled,
    isServerMuted: localServerState?.isServerMuted,
    isServerDeafened: localServerState?.isServerDeafened,
    avatarUrl: currentUser?.avatar_url || undefined,
  });

  room.remoteParticipants.forEach((participant) => {
    const cached = participantInfoCache.get(participant.identity);
    const serverState = serverVoiceStates.get(participant.identity);
    participants.push({
      id: participant.identity,
      username: participant.name || cached?.displayName || cached?.username || participant.identity,
      isMuted: !participant.isMicrophoneEnabled || !!serverState?.isServerMuted,
      isSpeaking: participant.isSpeaking,
      isStreaming: Array.from(participant.trackPublications.values()).some(
        (pub) => pub.source === Track.Source.ScreenShare,
      ),
      isServerMuted: serverState?.isServerMuted,
      isServerDeafened: serverState?.isServerDeafened,
      avatarUrl: cached?.avatarUrl,
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
  const globalNorm = Math.max(0, Math.min(200, volume)) / 100;
  for (const participant of currentRoom.remoteParticipants.values()) {
    const userVol = (userVolumes.get(participant.identity) ?? 100) / 100;
    const finalVol = Math.min(2, globalNorm * userVol);
    for (const pub of participant.audioTrackPublications.values()) {
      if (pub.track) {
        pub.track.attachedElements.forEach((el) => {
          (el as HTMLMediaElement).volume = finalVol;
        });
      }
    }
  }
}

/**
 * Apply updated audio processing settings to the active room's local microphone track.
 * Call this when noise suppression, echo cancellation, AGC, or VAD toggles change.
 */
export async function applyAudioProcessingSettings(): Promise<void> {
  if (!currentRoom) return;
  const { noiseSuppression, echoCancellation, autoGainControl, inputDevice, aiNoiseSuppression } =
    useVoiceSettingsStore.getState();

  // When AI NS is active, browser noiseSuppression constraint stays false
  const effectiveNoiseSuppression = aiNoiseSuppression && noiseSuppressionService.checkCapabilities().supported
    ? false
    : noiseSuppression;

  const localPub = currentRoom.localParticipant.getTrackPublication(Track.Source.Microphone);
  if (!localPub?.track?.mediaStreamTrack) return;

  try {
    await localPub.track.mediaStreamTrack.applyConstraints({
      echoCancellation,
      noiseSuppression: effectiveNoiseSuppression,
      autoGainControl,
      deviceId: inputDevice !== 'default' ? { exact: inputDevice } : undefined,
    });
  } catch {
    // Constraint not supported — restart track with new settings instead
    if (currentRoom.localParticipant.isMicrophoneEnabled) {
      await currentRoom.localParticipant.setMicrophoneEnabled(false);
      await currentRoom.localParticipant.setMicrophoneEnabled(true, {
        deviceId: inputDevice !== 'default' ? inputDevice : undefined,
        autoGainControl,
        echoCancellation,
        noiseSuppression: effectiveNoiseSuppression,
      });
    }
  }
}
