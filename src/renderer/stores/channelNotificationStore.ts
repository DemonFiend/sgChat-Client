import { create } from 'zustand';
import { api } from '../lib/api';

export type NotificationLevel = 'all' | 'mentions' | 'none' | 'default';

export interface ChannelNotificationSetting {
  channel_id: string;
  level: NotificationLevel;
  suppress_everyone: boolean;
  suppress_roles: boolean;
}

interface ChannelNotificationState {
  settings: Record<string, ChannelNotificationSetting>;
  loaded: boolean;

  fetchAll: () => Promise<void>;
  getLevel: (channelId: string) => NotificationLevel;
  getSetting: (channelId: string) => ChannelNotificationSetting | null;
  updateSetting: (channelId: string, update: Partial<Omit<ChannelNotificationSetting, 'channel_id'>>) => Promise<void>;
  removeSetting: (channelId: string) => Promise<void>;
  shouldNotify: (channelId: string, isMention: boolean, isEveryone: boolean, isRole: boolean) => boolean;
}

export const useChannelNotificationStore = create<ChannelNotificationState>((set, get) => ({
  settings: {},
  loaded: false,

  fetchAll: async () => {
    try {
      const res = await api.get<ChannelNotificationSetting[]>('/api/channels/notification-settings');
      const map: Record<string, ChannelNotificationSetting> = {};
      for (const s of res) {
        map[s.channel_id] = s;
      }
      set({ settings: map, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  getLevel: (channelId) => get().settings[channelId]?.level || 'default',

  getSetting: (channelId) => get().settings[channelId] || null,

  updateSetting: async (channelId, update) => {
    const current = get().settings[channelId] || {
      channel_id: channelId,
      level: 'default' as NotificationLevel,
      suppress_everyone: false,
      suppress_roles: false,
    };
    const merged = { ...current, ...update };
    set((s) => ({ settings: { ...s.settings, [channelId]: merged } }));
    try {
      await api.patch(`/api/channels/${channelId}/notification-settings`, {
        level: merged.level,
        suppress_everyone: merged.suppress_everyone,
        suppress_roles: merged.suppress_roles,
      });
    } catch {
      // ignore
    }
  },

  removeSetting: async (channelId) => {
    set((s) => {
      const next = { ...s.settings };
      delete next[channelId];
      return { settings: next };
    });
    try {
      await api.delete(`/api/channels/${channelId}/notification-settings`);
    } catch {
      // ignore
    }
  },

  shouldNotify: (channelId, isMention, isEveryone, isRole) => {
    const setting = get().settings[channelId];
    if (!setting || setting.level === 'default' || setting.level === 'all') {
      // Check suppress flags even on "all" / "default"
      if (setting?.suppress_everyone && isEveryone && !isMention) return false;
      if (setting?.suppress_roles && isRole && !isMention) return false;
      return true;
    }
    if (setting.level === 'none') return false;
    if (setting.level === 'mentions') return isMention;
    return true;
  },
}));
