import { create } from 'zustand';
import {
  joinVoiceChannel,
  leaveVoiceChannel,
  toggleMute as toggleMuteService,
  toggleDeafen as toggleDeafenService,
  startScreenShare as startScreenShareService,
  stopScreenShare as stopScreenShareService,
  getConnectionQuality,
  getLocalScreenShareVideo,
  onVoiceEvent,
  type VoiceParticipant,
  type ScreenShareQuality,
} from '../lib/voiceService';
import { emitRaiseHand, emitLowerHand } from '../api/socket';
import { streamViewerStore } from './streamViewer';

export type { ScreenShareQuality };

export type VoiceConnectionState = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export interface VoicePermissions {
  canSpeak: boolean;
  canVideo: boolean;
  canStream: boolean;
  canMuteMembers: boolean;
  canMoveMembers: boolean;
  canDisconnectMembers: boolean;
}

export interface ScreenShareState {
  isSharing: boolean;
  streamerId: string | null;
  streamerName: string | null;
  quality: ScreenShareQuality;
}

export interface ConnectionQualityState {
  ping: number;
  quality: 'excellent' | 'good' | 'poor' | 'lost';
}

interface VoiceState {
  channelId: string | null;
  channelName: string | null;
  channelType: string | null;
  connectionState: VoiceConnectionState;
  connected: boolean;
  qualityStabilized: boolean;
  muted: boolean;
  deafened: boolean;
  participants: VoiceParticipant[];
  permissions: VoicePermissions | null;
  screenShare: ScreenShareState;
  connectionQuality: ConnectionQualityState;
  error: string | null;
  isSpeaker: boolean;
  isHandRaised: boolean;

  join: (channelId: string, channelName?: string, channelType?: string) => Promise<{ success: boolean; error?: string }>;
  leave: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => Promise<void>;
  startScreenShare: (quality?: ScreenShareQuality) => Promise<void>;
  stopScreenShare: () => Promise<void>;
  toggleScreenShare: (quality?: ScreenShareQuality) => Promise<void>;
  setConnectionQuality: (quality: ConnectionQualityState) => void;
  raiseHand: () => void;
  lowerHand: () => void;
  initListeners: () => () => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  channelId: null,
  channelName: null,
  channelType: null,
  connectionState: 'idle',
  connected: false,
  qualityStabilized: false,
  muted: false,
  deafened: false,
  participants: [],
  permissions: null,
  screenShare: { isSharing: false, streamerId: null, streamerName: null, quality: 'standard' as ScreenShareQuality },
  connectionQuality: { ping: 0, quality: 'excellent' },
  error: null,
  isSpeaker: false,
  isHandRaised: false,

  join: async (channelId, channelName, channelType) => {
    set({ connectionState: 'connecting', error: null });
    const result = await joinVoiceChannel(channelId);
    if (result.success) {
      set({
        channelId,
        channelName: channelName || null,
        channelType: channelType || null,
        connectionState: 'connected',
        connected: true,
        qualityStabilized: false,
        muted: false,
        deafened: false,
        isSpeaker: false,
        isHandRaised: false,
        permissions: result.permissions || null,
      });
      setTimeout(() => {
        if (get().connected && get().channelId === channelId) {
          set({ qualityStabilized: true });
        }
      }, 3000);
    } else {
      set({ connectionState: 'error', error: result.error || 'Failed to connect' });
    }
    return result;
  },

  leave: async () => {
    await leaveVoiceChannel();
    streamViewerStore.leaveStream();
    set({
      channelId: null,
      channelName: null,
      channelType: null,
      connectionState: 'idle',
      connected: false,
      qualityStabilized: false,
      muted: false,
      deafened: false,
      participants: [],
      permissions: null,
      screenShare: { isSharing: false, streamerId: null, streamerName: null, quality: 'standard' },
      error: null,
      isSpeaker: false,
      isHandRaised: false,
    });
  },

  toggleMute: async () => {
    const newEnabled = await toggleMuteService();
    set({ muted: !newEnabled });
  },

  toggleDeafen: async () => {
    const wasDeafened = get().deafened;
    const isNowDeafened = await toggleDeafenService(!wasDeafened);
    set({
      deafened: isNowDeafened,
      muted: isNowDeafened ? true : get().muted,
    });
  },

  startScreenShare: async (quality: ScreenShareQuality = 'standard') => {
    try {
      const started = await startScreenShareService(quality);
      if (started) {
        set({
          screenShare: {
            isSharing: true,
            streamerId: 'local',
            streamerName: 'You',
            quality,
          },
        });
        // Auto-open host preview
        const channelId = get().channelId;
        if (channelId) {
          streamViewerStore.watchStream({
            streamerId: 'local',
            streamerName: 'You',
            streamerAvatar: null,
            channelId,
            isLocalPreview: true,
          });
          // Attach local preview video element
          const video = getLocalScreenShareVideo();
          if (video) {
            streamViewerStore.setVideoElement(video);
          }
        }
      }
    } catch (err) {
      console.error('[voiceStore] Screen share failed:', err);
    }
  },

  stopScreenShare: async () => {
    try {
      await stopScreenShareService();
      set({
        screenShare: { isSharing: false, streamerId: null, streamerName: null, quality: 'standard' },
      });
      streamViewerStore.leaveStream();
    } catch (err) {
      console.error('[voiceStore] Stop screen share failed:', err);
    }
  },

  toggleScreenShare: async (quality?: ScreenShareQuality) => {
    const { screenShare } = get();
    if (screenShare.isSharing) {
      await get().stopScreenShare();
    } else {
      await get().startScreenShare(quality);
    }
  },

  setConnectionQuality: (quality) => {
    set({ connectionQuality: quality });
  },

  raiseHand: () => {
    const channelId = get().channelId;
    if (channelId) {
      emitRaiseHand(channelId);
      set({ isHandRaised: true });
    }
  },

  lowerHand: () => {
    const channelId = get().channelId;
    if (channelId) {
      emitLowerHand(channelId);
      set({ isHandRaised: false });
    }
  },

  initListeners: () => {
    const qualityInterval = setInterval(() => {
      const quality = getConnectionQuality();
      if (quality && get().connected) {
        set({ connectionQuality: quality });
      }
    }, 2000);

    const cleanup = onVoiceEvent((event, data) => {
      switch (event) {
        case 'connected':
          set({ connectionState: 'connected', connected: true, channelId: data.channelId });
          break;
        case 'disconnected':
          // During reconnection, suppress disconnect events — they're temporary
          if (get().connectionState === 'reconnecting') break;
          set({
            connectionState: 'idle',
            connected: false,
            channelId: null,
            channelName: null,
            participants: [],
            screenShare: { isSharing: false, streamerId: null, streamerName: null, quality: 'standard' },
          });
          break;
        case 'reconnecting':
          set({ connectionState: 'reconnecting' });
          break;
        case 'participant-update':
          // During reconnection, keep existing participants if the update is empty
          // (prevents flicker from momentary disconnect/reconnect cycle)
          if (get().connectionState === 'reconnecting' && data.length <= 1) break;
          set({ participants: data });
          break;
        case 'screen-share-started': {
          // Remote user started sharing
          const currentScreenShare = get().screenShare;
          if (!currentScreenShare.isSharing) {
            set({
              screenShare: {
                ...currentScreenShare,
                isSharing: true,
                streamerId: data.participantId,
                streamerName: data.participantName,
              },
            });
          }
          break;
        }
        case 'screen-share-stopped':
          set({ screenShare: { isSharing: false, streamerId: null, streamerName: null, quality: 'standard' } });
          if (streamViewerStore.isWatchingStreamer(data.participantId)) {
            streamViewerStore.leaveStream();
          }
          break;
        case 'screen-share-audio-available':
          streamViewerStore.notifyAudioAvailable();
          break;
        case 'stage:speaker-added':
          set({ isSpeaker: true, isHandRaised: false });
          break;
        case 'stage:speaker-removed':
          set({ isSpeaker: false });
          break;
      }
    });

    return () => {
      cleanup();
      clearInterval(qualityInterval);
    };
  },
}));

// Convenience alias for non-hook contexts
export const voiceStore = {
  getState: () => useVoiceStore.getState(),
  join: (channelId: string, channelName?: string) => useVoiceStore.getState().join(channelId, channelName),
  leave: () => useVoiceStore.getState().leave(),
};
