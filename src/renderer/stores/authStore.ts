import { create } from 'zustand';
import { clearSession as clearCryptoSession } from '../lib/crypto';
import type { UserPermissions } from './permissions';

const electronAPI = (window as any).electronAPI;

export interface User {
  id: string;
  email: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bio: string | null;
  pronouns: string | null;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  custom_status: string | null;
  custom_status_expires_at: string | null;
  created_at: string;
  permissions?: UserPermissions;
  privacy_friend_requests?: 'anyone' | 'friends_of_friends' | 'nobody';
  privacy_dms?: 'server_members' | 'friends_only';
  privacy_show_online?: boolean;
  privacy_show_activity?: boolean;
  two_factor_enabled?: boolean;
}

export type AuthErrorReason = 'session_expired' | 'server_unreachable' | 'token_invalid';

export interface LoginResult {
  success: boolean;
  error?: string;
  error_code?: string;
  retry_after?: string;
  pending_approval?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isPendingApproval: boolean;
  serverUrl: string;
  authError: AuthErrorReason | null;
  serverSignupsDisabled: boolean;

  login: (serverUrl: string, email: string, password: string) => Promise<LoginResult>;
  register: (serverUrl: string, username: string, email: string, password: string, inviteCode?: string) => Promise<{ success: boolean; error?: string; pending_approval?: boolean }>;
  logout: (forgetDevice?: boolean) => Promise<void>;
  checkAuth: () => Promise<void>;
  setServerUrl: (url: string) => void;
  setIsPendingApproval: (pending: boolean) => void;
  setServerSignupsDisabled: (disabled: boolean) => void;
  triggerAuthError: (reason: AuthErrorReason) => void;
  clearAuthError: () => void;
  updateStatus: (status: User['status']) => void;
  updateCustomStatus: (custom_status: string | null, expires_at?: string | null) => void;
  clearExpiredCustomStatus: () => boolean;
  refreshUser: () => Promise<User | null>;
  updateAvatarUrl: (avatar_url: string | null) => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isPendingApproval: false,
  serverUrl: '',
  authError: null,
  serverSignupsDisabled: false,

  login: async (serverUrl, email, password) => {
    const result = await electronAPI.auth.login(serverUrl, email, password);
    if (result.success) {
      set({ user: result.user, isAuthenticated: true, serverUrl, isPendingApproval: false });
    } else if (result.pending_approval) {
      set({ isPendingApproval: true, serverUrl });
    }
    return result;
  },

  register: async (serverUrl, username, email, password, inviteCode?) => {
    const result = await electronAPI.auth.register(serverUrl, username, email, password, inviteCode);
    if (result.success) {
      if (result.pending_approval) {
        // Server may or may not issue tokens for pending users
        if (result.user) {
          set({ user: result.user, isAuthenticated: true, isPendingApproval: true, serverUrl });
        } else {
          set({ isPendingApproval: true, serverUrl });
        }
      } else {
        set({ user: result.user, isAuthenticated: true, serverUrl, isPendingApproval: false });
      }
    }
    return result;
  },

  logout: async (forgetDevice) => {
    clearCryptoSession();
    await electronAPI.auth.logout();
    if (forgetDevice) {
      electronAPI.config.clearServerUrl?.();
      set({ user: null, isAuthenticated: false, authError: null, isPendingApproval: false, serverUrl: '' });
    } else {
      set({ user: null, isAuthenticated: false, authError: null, isPendingApproval: false });
    }
  },

  checkAuth: async () => {
    try {
      const hasServer = await electronAPI.config.hasServerUrl();
      if (!hasServer) {
        set({ isLoading: false, isAuthenticated: false, serverUrl: '' });
        return;
      }

      const serverUrl = await electronAPI.config.getServerUrl();

      // Ensure crypto session is negotiated (non-blocking)
      electronAPI.crypto.negotiate().catch(() => {});

      const isAuth = await electronAPI.auth.check();

      if (isAuth) {
        const res = await electronAPI.api.request('GET', '/api/users/me');
        if (res.ok) {
          // Server may indicate the user is pending approval
          const isPending = res.data?.pending_approval === true;
          set({
            user: res.data,
            isAuthenticated: true,
            isLoading: false,
            serverUrl,
            isPendingApproval: isPending,
          });
          return;
        }
      }

      set({ isLoading: false, isAuthenticated: false, serverUrl });
    } catch {
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  setServerUrl: (url) => {
    electronAPI.config.setServerUrl(url);
    set({ serverUrl: url });
  },

  setIsPendingApproval: (pending) => set({ isPendingApproval: pending }),

  setServerSignupsDisabled: (disabled) => set({ serverSignupsDisabled: disabled }),

  triggerAuthError: (reason) => {
    if (get().authError === null) set({ authError: reason });
  },

  clearAuthError: () => set({ authError: null }),

  updateStatus: (status) =>
    set((s) => ({ user: s.user ? { ...s.user, status } : null })),

  updateCustomStatus: (custom_status, expires_at) =>
    set((s) => ({
      user: s.user
        ? { ...s.user, custom_status, custom_status_expires_at: expires_at ?? null }
        : null,
    })),

  clearExpiredCustomStatus: () => {
    const user = get().user;
    if (user?.custom_status_expires_at && new Date(user.custom_status_expires_at) <= new Date()) {
      set((s) => ({
        user: s.user
          ? { ...s.user, custom_status: null, custom_status_expires_at: null }
          : null,
      }));
      return true;
    }
    return false;
  },

  refreshUser: async () => {
    try {
      const res = await electronAPI.api.request('GET', '/api/users/me');
      if (res.ok) {
        set({ user: res.data });
        return res.data;
      }
      return null;
    } catch {
      return null;
    }
  },

  updateAvatarUrl: (avatar_url) =>
    set((s) => ({ user: s.user ? { ...s.user, avatar_url } : null })),

  updateUser: (updates) =>
    set((s) => ({ user: s.user ? { ...s.user, ...updates } : null })),
}));

// Convenience alias for non-hook contexts
export const authStore = {
  getState: () => useAuthStore.getState(),
  state: () => {
    const s = useAuthStore.getState();
    return { user: s.user, isAuthenticated: s.isAuthenticated, isLoading: s.isLoading };
  },
  triggerAuthError: (reason: AuthErrorReason) => useAuthStore.getState().triggerAuthError(reason),
  updateStatus: (status: User['status']) => useAuthStore.getState().updateStatus(status),
  updateCustomStatus: (custom_status: string | null, expires_at?: string | null) =>
    useAuthStore.getState().updateCustomStatus(custom_status, expires_at),
  refreshUser: () => useAuthStore.getState().refreshUser(),
  updateUser: (updates: Partial<User>) => useAuthStore.getState().updateUser(updates),
};
