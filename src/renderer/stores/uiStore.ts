import { create } from 'zustand';

interface ReplyTarget {
  id: string;
  content: string;
  author: { id: string; username: string };
}

interface UIState {
  activeServerId: string | null;
  activeChannelId: string | null;
  activeDMId: string | null;
  view: 'servers' | 'dms' | 'friends' | 'settings';
  memberListVisible: boolean;
  replyTo: ReplyTarget | null;

  setActiveServer: (serverId: string) => void;
  setActiveChannel: (channelId: string) => void;
  setActiveDM: (dmId: string) => void;
  setView: (view: UIState['view']) => void;
  toggleMemberList: () => void;
  setReplyTo: (target: ReplyTarget | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeServerId: null,
  activeChannelId: null,
  activeDMId: null,
  view: 'servers',
  memberListVisible: true,
  replyTo: null,

  setActiveServer: (serverId) =>
    set({ activeServerId: serverId, activeChannelId: null, view: 'servers' }),

  setActiveChannel: (channelId) =>
    set({ activeChannelId: channelId, replyTo: null }),

  setActiveDM: (dmId) =>
    set({ activeDMId: dmId, view: 'dms' }),

  setView: (view) =>
    set({ view }),

  toggleMemberList: () =>
    set((s) => ({ memberListVisible: !s.memberListVisible })),

  setReplyTo: (target) =>
    set({ replyTo: target }),
}));
