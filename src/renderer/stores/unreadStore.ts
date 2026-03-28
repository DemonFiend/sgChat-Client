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
  /** Server-level aggregated unreads (keyed by serverId) */
  serverUnreads: Record<string, UnreadEntry>;
  increment: (channelId: string, isMention?: boolean) => void;
  markRead: (channelId: string) => void;
  incrementDM: (conversationId: string) => void;
  markDMRead: (conversationId: string) => void;
  /** Increment server-level unread counters. */
  incrementServer: (serverId: string, isMention?: boolean) => void;
  /** Mark a server's channel as read — decrements server counters by channel's unreads. */
  markServerRead: (serverId: string, channelId: string) => void;
  getUnread: (channelId: string) => UnreadEntry;
  getCategoryUnreadCount: (channelIds: string[]) => number;
  getTotalUnread: () => number;
  getTotalDMUnread: () => number;
  getTotalMentions: () => number;
}

export const useUnreadStore = create<UnreadState>((set, get) => ({
  unreads: {},
  dmUnreads: {},
  serverUnreads: {},

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

  incrementServer: (serverId, isMention = false) => {
    set((s) => {
      const prev = s.serverUnreads[serverId] || { count: 0, mentions: 0 };
      return {
        serverUnreads: {
          ...s.serverUnreads,
          [serverId]: {
            count: prev.count + 1,
            mentions: isMention ? prev.mentions + 1 : prev.mentions,
          },
        },
      };
    });
  },

  markServerRead: (serverId, channelId) => {
    const channelEntry = get().unreads[channelId];
    if (!channelEntry) return;
    set((s) => {
      const prev = s.serverUnreads[serverId];
      if (!prev) return {};
      const newCount = Math.max(0, prev.count - channelEntry.count);
      const newMentions = Math.max(0, prev.mentions - channelEntry.mentions);
      if (newCount === 0 && newMentions === 0) {
        const { [serverId]: _, ...rest } = s.serverUnreads;
        return { serverUnreads: rest };
      }
      return {
        serverUnreads: {
          ...s.serverUnreads,
          [serverId]: { count: newCount, mentions: newMentions },
        },
      };
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
