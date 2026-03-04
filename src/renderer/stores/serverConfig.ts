import { create } from 'zustand';
import { api } from '../lib/api';

export interface ServerPopupConfig {
  enabled: boolean;
  title?: string;
  body?: string;
  image_url?: string;
  show_clock?: boolean;
  timezone?: string;
}

export interface ServerConfig {
  id: string;
  name: string;
  motd?: string;
  icon_url?: string;
  banner_url?: string;
  owner_id?: string;
  claimed?: boolean;
  popup_config?: ServerPopupConfig;
}

interface ServerConfigState {
  config: ServerConfig | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  fetchConfig: (serverId: string) => Promise<void>;
  updateConfig: (serverId: string, updates: Partial<ServerConfig>) => Promise<void>;
  updatePopupConfig: (serverId: string, popup: ServerPopupConfig) => Promise<void>;
  clear: () => void;
}

export const useServerConfigStore = create<ServerConfigState>((set) => ({
  config: null,
  isLoading: false,
  isSaving: false,
  error: null,

  fetchConfig: async (serverId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<ServerConfig>(`/api/servers/${serverId}`);
      set({ config: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load config', isLoading: false });
    }
  },

  updateConfig: async (serverId, updates) => {
    set({ isSaving: true, error: null });
    try {
      const data = await api.patch<ServerConfig>(`/api/servers/${serverId}`, updates);
      set({ config: data, isSaving: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to save', isSaving: false });
    }
  },

  updatePopupConfig: async (serverId, popup) => {
    set({ isSaving: true, error: null });
    try {
      const data = await api.patch<ServerConfig>(`/api/servers/${serverId}`, { popup_config: popup });
      set({ config: data, isSaving: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to save popup config', isSaving: false });
    }
  },

  clear: () => set({ config: null, isLoading: false, isSaving: false, error: null }),
}));
