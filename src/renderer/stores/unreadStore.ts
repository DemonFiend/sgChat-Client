import { create } from 'zustand';
import { api } from '../lib/api';

interface UnreadEntry {
  count: number;
  mentions: number;
}

const EMPTY_UNREAD: UnreadEntry = { count: 0, mentions: 0 };

interface UnreadState {
  /** Server channel unreads (keyed by channelId) */
  unreads: Record<string, UnreadEntry>;
  /** DM conversation unreads (keyed by conversationId) */
  dmUnreads: Record<string, number>;
  increment: (channelId: string, isMention?: boolean) => void;
  markRead: (channelId: string) => void;
  incrementDM: (conversationId: string) => void;
  markDMRead: (conversationId: string) => void;
  getUnread: (channelId: string) => UnreadEntry;
  getCategoryUnreadCount: (channelIds: string[]) => number;
  getTotalUnread: () => number;
  getTotalDMUnread: () => number;
  getTotalMentions: () => number;
}

export const useUnreadStore = create<UnreadState>((set, get) => ({
  unreads: {},
  dmUnreads: {},

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

  incrementDM: (conversationId) => {
    set((s) => ({
      dmUnreads: {
        ...s.dmUnreads,
        [conversationId]: (s.dmUnreads[conversationId] || 0) + 1,
      },
    }));
  },

  markDMRead: (conversationId) => {
    set((s) => {
      const { [conversationId]: _, ...rest } = s.dmUnreads;
      return { dmUnreads: rest };
    });
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

  getTotalDMUnread: () => {
    const dmUnreads = get().dmUnreads;
    return Object.values(dmUnreads).reduce((sum, count) => sum + count, 0);
  },

  getTotalMentions: () => {
    const unreads = get().unreads;
    return Object.values(unreads).reduce((sum, entry) => sum + entry.mentions, 0);
  },
}));
