import { create } from 'zustand';
import { api } from '../lib/api';

interface IgnoredUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  ignored_at: string;
}

interface IgnoredUsersState {
  ignoredUserIds: Set<string>;
  ignoredUsers: IgnoredUser[];
  loaded: boolean;
  fetchIgnored: () => Promise<void>;
  ignoreUser: (userId: string) => Promise<void>;
  unignoreUser: (userId: string) => Promise<void>;
  isIgnored: (userId: string) => boolean;
}

export const useIgnoredUsersStore = create<IgnoredUsersState>((set, get) => ({
  ignoredUserIds: new Set(),
  ignoredUsers: [],
  loaded: false,

  fetchIgnored: async () => {
    try {
      const res = await api.get<IgnoredUser[] | { data: IgnoredUser[] }>('/api/users/ignored');
      const users = Array.isArray(res) ? res : (res as any).data ?? [];
      const ids = new Set(users.map((u: IgnoredUser) => u.id));
      set({ ignoredUsers: users, ignoredUserIds: ids, loaded: true });
    } catch {
      set({ loaded: true });
    }
  },

  ignoreUser: async (userId: string) => {
    const prevIds = get().ignoredUserIds;
    const prevUsers = get().ignoredUsers;
    const newIds = new Set(prevIds);
    newIds.add(userId);
    set({
      ignoredUserIds: newIds,
      ignoredUsers: [
        ...prevUsers,
        {
          id: userId,
          username: '',
          display_name: null,
          avatar_url: null,
          ignored_at: new Date().toISOString(),
        },
      ],
    });

    try {
      await api.post(`/api/users/${userId}/ignore`, {});
    } catch (err) {
      set({ ignoredUserIds: prevIds, ignoredUsers: prevUsers });
      console.error('[ignoredUsers] Failed to ignore user:', err);
    }
  },

  unignoreUser: async (userId: string) => {
    const prevIds = get().ignoredUserIds;
    const prevUsers = get().ignoredUsers;
    const removedUser = prevUsers.find((u) => u.id === userId);
    const newIds = new Set(prevIds);
    newIds.delete(userId);
    set({ ignoredUserIds: newIds, ignoredUsers: prevUsers.filter((u) => u.id !== userId) });

    try {
      await api.delete(`/api/users/${userId}/ignore`);
    } catch (err) {
      set({ ignoredUserIds: prevIds, ignoredUsers: prevUsers });
      console.error('[ignoredUsers] Failed to unignore user:', err);
    }
  },

  isIgnored: (userId: string) => get().ignoredUserIds.has(userId),
}));

export const ignoredUsersStore = {
  state: () => useIgnoredUsersStore.getState(),
  fetchIgnored: () => useIgnoredUsersStore.getState().fetchIgnored(),
  ignoreUser: (userId: string) => useIgnoredUsersStore.getState().ignoreUser(userId),
  unignoreUser: (userId: string) => useIgnoredUsersStore.getState().unignoreUser(userId),
  isIgnored: (userId: string) => useIgnoredUsersStore.getState().isIgnored(userId),
};
