import { create } from 'zustand';

import type { AdminSection } from '../pages/ServerAdminView';

const DM_STORAGE_KEY = 'sgchat-active-dm';

function getPersistedDMId(): string | null {
  try {
    return localStorage.getItem(DM_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

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
  view: 'servers' | 'dms' | 'friends' | 'settings' | 'server-admin';
  adminSection: AdminSection;
  memberListVisible: boolean;
  memberListWidth: number;
  channelSidebarWidth: number;
  eventsOpen: boolean;
  replyTo: ReplyTarget | null;

  setActiveServer: (serverId: string) => void;
  setActiveChannel: (channelId: string) => void;
  setActiveDM: (dmId: string) => void;
  setView: (view: UIState['view']) => void;
  setAdminSection: (section: AdminSection) => void;
  openAdminView: (section?: AdminSection) => void;
  toggleMemberList: () => void;
  setMemberListWidth: (width: number) => void;
  setChannelSidebarWidth: (width: number) => void;
  toggleEventsPanel: () => void;
  setReplyTo: (target: ReplyTarget | null) => void;
  openThread: (threadId: string) => void;
  closeThread: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeServerId: null,
  activeChannelId: null,
  activeDMId: getPersistedDMId(),
  activeThreadId: null,
  view: 'servers',
  adminSection: 'roles',
  memberListVisible: true,
  memberListWidth: 240,
  channelSidebarWidth: 240,
  eventsOpen: false,
  replyTo: null,

  setActiveServer: (serverId) =>
    set({ activeServerId: serverId, activeChannelId: null, activeThreadId: null, view: 'servers' }),

  setActiveChannel: (channelId) =>
    set({ activeChannelId: channelId, activeThreadId: null, replyTo: null }),

  setActiveDM: (dmId) => {
    try { localStorage.setItem(DM_STORAGE_KEY, dmId); } catch { /* noop */ }
    set({ activeDMId: dmId, view: 'dms' });
  },

  setView: (view) =>
    set({ view }),

  setAdminSection: (section) =>
    set({ adminSection: section }),

  openAdminView: (section) =>
    set((s) => ({
      view: 'server-admin',
      adminSection: section ?? s.adminSection,
    })),

  toggleMemberList: () =>
    set((s) => ({ memberListVisible: !s.memberListVisible })),

  setMemberListWidth: (width) =>
    set({ memberListWidth: Math.max(180, Math.min(400, width)) }),

  setChannelSidebarWidth: (width) =>
    set({ channelSidebarWidth: Math.max(192, Math.min(384, width)) }),

  toggleEventsPanel: () =>
    set((s) => ({ eventsOpen: !s.eventsOpen })),

  setReplyTo: (target) =>
    set({ replyTo: target }),

  openThread: (threadId) =>
    set({ activeThreadId: threadId }),

  closeThread: () =>
    set({ activeThreadId: null }),
}));
