import { create } from 'zustand';
import { clearSession as clearCryptoSession } from '../lib/crypto';

const electronAPI = (window as any).electronAPI;

interface User {
  id: string;
  username: string;
  email: string;
  avatar_url?: string;
  status?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  serverUrl: string;

  login: (serverUrl: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (serverUrl: string, username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setServerUrl: (url: string) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  serverUrl: '',

  login: async (serverUrl, email, password) => {
    const result = await electronAPI.auth.login(serverUrl, email, password);
    if (result.success) {
      set({ user: result.user, isAuthenticated: true, serverUrl });
    }
    return result;
  },

  register: async (serverUrl, username, email, password) => {
    const result = await electronAPI.auth.register(serverUrl, username, email, password);
    if (result.success) {
      set({ user: result.user, isAuthenticated: true, serverUrl });
    }
    return result;
  },

  logout: async () => {
    clearCryptoSession();
    await electronAPI.auth.logout();
    set({ user: null, isAuthenticated: false });
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
        // Fetch current user data
        const res = await electronAPI.api.request('GET', '/api/users/me');
        if (res.ok) {
          set({ user: res.data, isAuthenticated: true, isLoading: false, serverUrl });
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
}));
