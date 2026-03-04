import { create } from 'zustand';
import { api } from '../lib/api';

interface UnreadEntry {
  count: number;
  mentions: number;
}

const EMPTY_UNREAD: UnreadEntry = { count: 0, mentions: 0 };

interface UnreadState {
  unreads: Record<string, UnreadEntry>;
  increment: (channelId: string, isMention?: boolean) => void;
  markRead: (channelId: string) => void;
  getUnread: (channelId: string) => UnreadEntry;
  getCategoryUnreadCount: (channelIds: string[]) => number;
  getTotalUnread: () => number;
}

export const useUnreadStore = create<UnreadState>((set, get) => ({
  unreads: {},

  increment: (channelId, isMention = false) => {
    set((s) => {
      const prev = s.unreads[channelId] || { count: 0, mentions: 0 };
      return {
        unreads: {
          ...s.unreads,
          [channelId]: {
            count: prev.count + 1,
            mentions: isMention ? prev.mentions + 1 : prev.mentions,
          },
        },
      };
    });
  },

  markRead: (channelId) => {
    set((s) => {
      const { [channelId]: _, ...rest } = s.unreads;
      return { unreads: rest };
    });
    // Fire and forget the server ack
    api.post(`/api/channels/${channelId}/ack`, {}).catch(() => {});
  },

  getUnread: (channelId) => {
    return get().unreads[channelId] || EMPTY_UNREAD;
  },

  getCategoryUnreadCount: (channelIds) => {
    const unreads = get().unreads;
    return channelIds.reduce((sum, id) => sum + (unreads[id]?.count || 0), 0);
  },

  getTotalUnread: () => {
    const unreads = get().unreads;
    return Object.values(unreads).reduce((sum, entry) => sum + entry.count, 0);
  },
}));
