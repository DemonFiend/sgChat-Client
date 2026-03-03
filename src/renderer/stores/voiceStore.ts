import { create } from 'zustand';
import {
  joinVoiceChannel,
  leaveVoiceChannel,
  toggleMute as toggleMuteService,
  onVoiceEvent,
  type VoiceParticipant,
} from '../lib/voiceService';

interface VoiceState {
  channelId: string | null;
  connected: boolean;
  muted: boolean;
  deafened: boolean;
  participants: VoiceParticipant[];

  join: (channelId: string) => Promise<{ success: boolean; error?: string }>;
  leave: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => void;
  initListeners: () => () => void;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  channelId: null,
  connected: false,
  muted: false,
  deafened: false,
  participants: [],

  join: async (channelId) => {
    const result = await joinVoiceChannel(channelId);
    if (result.success) {
      set({ channelId, connected: true, muted: false, deafened: false });
    }
    return result;
  },

  leave: async () => {
    await leaveVoiceChannel();
    set({ channelId: null, connected: false, muted: false, deafened: false, participants: [] });
  },

  toggleMute: async () => {
    const newMuted = await toggleMuteService();
    set({ muted: !newMuted }); // toggleMute returns new mic enabled state
  },

  toggleDeafen: () => {
    set((s) => ({ deafened: !s.deafened }));
  },

  initListeners: () => {
    return onVoiceEvent((event, data) => {
      switch (event) {
        case 'connected':
          set({ connected: true, channelId: data.channelId });
          break;
        case 'disconnected':
          set({ connected: false, channelId: null, participants: [] });
          break;
        case 'participant-update':
          set({ participants: data });
          break;
      }
    });
  },
}));
