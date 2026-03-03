import { create } from 'zustand';

interface UIState {
  activeServerId: string | null;
  activeChannelId: string | null;
  activeDMId: string | null;
  view: 'servers' | 'dms' | 'friends' | 'settings';
  memberListVisible: boolean;

  setActiveServer: (serverId: string) => void;
  setActiveChannel: (channelId: string) => void;
  setActiveDM: (dmId: string) => void;
  setView: (view: UIState['view']) => void;
  toggleMemberList: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeServerId: null,
  activeChannelId: null,
  activeDMId: null,
  view: 'servers',
  memberListVisible: true,

  setActiveServer: (serverId) =>
    set({ activeServerId: serverId, activeChannelId: null, view: 'servers' }),

  setActiveChannel: (channelId) =>
    set({ activeChannelId: channelId }),

  setActiveDM: (dmId) =>
    set({ activeDMId: dmId, view: 'dms' }),

  setView: (view) =>
    set({ view }),

  toggleMemberList: () =>
    set((s) => ({ memberListVisible: !s.memberListVisible })),
}));
