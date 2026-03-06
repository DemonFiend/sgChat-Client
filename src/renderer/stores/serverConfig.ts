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

export const useServerConfigStore = create<ServerConfigState>((set, get) => ({
  config: null,
  isLoading: false,
  isSaving: false,
  error: null,

  fetchConfig: async (serverId) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<ServerConfig>(`/api/servers/${serverId}`);
      // Also fetch dedicated popup config endpoint which is authoritative
      try {
        const popupData = await api.get<ServerPopupConfig>('/api/server/popup-config');
        data.popup_config = popupData;
      } catch {
        // popup-config endpoint may not exist or return empty — keep whatever server returned
      }
      set({ config: data, isLoading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to load config', isLoading: false });
    }
  },

  updateConfig: async (serverId, updates) => {
    set({ isSaving: true, error: null });
    try {
      const data = await api.patch<ServerConfig>(`/api/servers/${serverId}`, updates);
      // Preserve popup_config from current state (PATCH may not return it)
      const current = get().config;
      if (current?.popup_config && !data.popup_config) {
        data.popup_config = current.popup_config;
      }
      set({ config: data, isSaving: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to save', isSaving: false });
    }
  },

  updatePopupConfig: async (_serverId, popup) => {
    set({ isSaving: true, error: null });
    try {
      // Use dedicated popup config endpoint
      await api.put('/api/server/popup-config', popup);
      // Update local state
      set((s) => ({
        config: s.config ? { ...s.config, popup_config: popup } : s.config,
        isSaving: false,
      }));
    } catch {
      // Fallback: try PATCH on the server endpoint
      try {
        await api.patch(`/api/servers/${_serverId}`, { popup_config: popup });
        set((s) => ({
          config: s.config ? { ...s.config, popup_config: popup } : s.config,
          isSaving: false,
        }));
      } catch (err: any) {
        set({ error: err.message || 'Failed to save popup config', isSaving: false });
      }
    }
  },

  clear: () => set({ config: null, isLoading: false, isSaving: false, error: null }),
}));
