import { create } from 'zustand';
import { api } from '../lib/api';

interface ImpersonatedUser {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
}

interface ImpersonationState {
  isImpersonating: boolean;
  impersonatedUser: ImpersonatedUser | null;
  serverId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface ImpersonationActions {
  startImpersonation: (serverId: string, userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  reset: () => void;
}

const initialState: ImpersonationState = {
  isImpersonating: false,
  impersonatedUser: null,
  serverId: null,
  isLoading: false,
  error: null,
};

export const useImpersonationStore = create<ImpersonationState & ImpersonationActions>(
  (set, get) => ({
    ...initialState,

    startImpersonation: async (serverId, userId) => {
      set({ isLoading: true, error: null });
      try {
        const result = await api.post<{ user: ImpersonatedUser }>(
          `/api/servers/${serverId}/admin/impersonate`,
          { user_id: userId },
        );
        set({
          isImpersonating: true,
          impersonatedUser: result.user,
          serverId,
          isLoading: false,
        });
      } catch (err: unknown) {
        set({
          isLoading: false,
          error: (err as Error).message || 'Failed to start impersonation',
        });
      }
    },

    stopImpersonation: async () => {
      const { serverId } = get();
      if (!serverId) {
        set(initialState);
        return;
      }

      set({ isLoading: true });
      try {
        await api.post(`/api/servers/${serverId}/admin/stop-impersonate`);
      } catch {
        // Stop locally even if API fails
      } finally {
        set(initialState);
      }
    },

    reset: () => set(initialState),
  }),
);
