import { create } from 'zustand';
import {
  joinVoiceChannel,
  leaveVoiceChannel,
  toggleMute as toggleMuteService,
  toggleDeafen as toggleDeafenService,
  toggleScreenShare as toggleScreenShareService,
  getConnectionQuality,
  onVoiceEvent,
  type VoiceParticipant,
} from '../lib/voiceService';

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
}

export interface ConnectionQualityState {
  ping: number;
  quality: 'excellent' | 'good' | 'poor' | 'lost';
}

interface VoiceState {
  channelId: string | null;
  channelName: string | null;
  connectionState: VoiceConnectionState;
  connected: boolean;
  muted: boolean;
  deafened: boolean;
  participants: VoiceParticipant[];
  permissions: VoicePermissions | null;
  screenShare: ScreenShareState;
  connectionQuality: ConnectionQualityState;
  error: string | null;

  join: (channelId: string, channelName?: string) => Promise<{ success: boolean; error?: string }>;
  leave: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  setConnectionQuality: (quality: ConnectionQualityState) => void;
  initListeners: () => () => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  channelId: null,
  channelName: null,
  connectionState: 'idle',
  connected: false,
  muted: false,
  deafened: false,
  participants: [],
  permissions: null,
  screenShare: { isSharing: false, streamerId: null, streamerName: null },
  connectionQuality: { ping: 0, quality: 'excellent' },
  error: null,

  join: async (channelId, channelName) => {
    set({ connectionState: 'connecting', error: null });
    const result = await joinVoiceChannel(channelId);
    if (result.success) {
      set({
        channelId,
        channelName: channelName || null,
        connectionState: 'connected',
        connected: true,
        muted: false,
        deafened: false,
        permissions: result.permissions || null,
      });
    } else {
      set({ connectionState: 'error', error: result.error || 'Failed to connect' });
    }
    return result;
  },

  leave: async () => {
    await leaveVoiceChannel();
    set({
      channelId: null,
      channelName: null,
      connectionState: 'idle',
      connected: false,
      muted: false,
      deafened: false,
      participants: [],
      permissions: null,
      screenShare: { isSharing: false, streamerId: null, streamerName: null },
      error: null,
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

  toggleScreenShare: async () => {
    try {
      const isSharing = await toggleScreenShareService();
      set({
        screenShare: {
          isSharing,
          streamerId: isSharing ? 'local' : null,
          streamerName: isSharing ? 'You' : null,
        },
      });
    } catch {
      // User cancelled screen share or error
    }
  },

  setConnectionQuality: (quality) => {
    set({ connectionQuality: quality });
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
          set({
            connectionState: 'idle',
            connected: false,
            channelId: null,
            channelName: null,
            participants: [],
            screenShare: { isSharing: false, streamerId: null, streamerName: null },
          });
          break;
        case 'reconnecting':
          set({ connectionState: 'reconnecting' });
          break;
        case 'participant-update':
          set({ participants: data });
          break;
        case 'screen-share-started':
          set({
            screenShare: {
              isSharing: true,
              streamerId: data.participantId,
              streamerName: data.participantName,
            },
          });
          break;
        case 'screen-share-stopped':
          set({ screenShare: { isSharing: false, streamerId: null, streamerName: null } });
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
