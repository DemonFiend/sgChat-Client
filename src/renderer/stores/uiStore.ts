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
  activeThreadId: string | null;
  view: 'servers' | 'dms' | 'friends' | 'settings';
  memberListVisible: boolean;
  replyTo: ReplyTarget | null;

  setActiveServer: (serverId: string) => void;
  setActiveChannel: (channelId: string) => void;
  setActiveDM: (dmId: string) => void;
  setView: (view: UIState['view']) => void;
  toggleMemberList: () => void;
  setReplyTo: (target: ReplyTarget | null) => void;
  openThread: (threadId: string) => void;
  closeThread: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeServerId: null,
  activeChannelId: null,
  activeDMId: null,
  activeThreadId: null,
  view: 'servers',
  memberListVisible: true,
  replyTo: null,

  setActiveServer: (serverId) =>
    set({ activeServerId: serverId, activeChannelId: null, activeThreadId: null, view: 'servers' }),

  setActiveChannel: (channelId) =>
    set({ activeChannelId: channelId, activeThreadId: null, replyTo: null }),

  setActiveDM: (dmId) =>
    set({ activeDMId: dmId, view: 'dms' }),

  setView: (view) =>
    set({ view }),

  toggleMemberList: () =>
    set((s) => ({ memberListVisible: !s.memberListVisible })),

  setReplyTo: (target) =>
    set({ replyTo: target }),

  openThread: (threadId) =>
    set({ activeThreadId: threadId }),

  closeThread: () =>
    set({ activeThreadId: null }),
}));
