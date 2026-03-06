import { create } from 'zustand';
import { api } from '../lib/api';

const electronAPI = (window as any).electronAPI;

const DEFAULT_KEYBINDS: Record<string, string> = {
  toggle_mute: 'Ctrl+Shift+M',
  toggle_deafen: 'Ctrl+Shift+D',
  push_to_talk: '',
  toggle_screen_share: '',
  disconnect_voice: '',
  open_settings: '',
  navigate_up: '',
  navigate_down: '',
  mark_as_read: '',
};

const KEYBIND_LABELS: Record<string, string> = {
  toggle_mute: 'Toggle Mute',
  toggle_deafen: 'Toggle Deafen',
  push_to_talk: 'Push to Talk',
  toggle_screen_share: 'Toggle Screen Share',
  disconnect_voice: 'Disconnect from Voice',
  open_settings: 'Open Settings',
  navigate_up: 'Navigate Up',
  navigate_down: 'Navigate Down',
  mark_as_read: 'Mark as Read',
};

interface KeybindsState {
  keybinds: Record<string, string>;
  loaded: boolean;
  loading: boolean;

  fetchKeybinds: () => Promise<void>;
  updateKeybind: (action: string, combo: string) => Promise<void>;
  resetKeybind: (action: string) => Promise<void>;
  getLabel: (action: string) => string;
}

export { KEYBIND_LABELS, DEFAULT_KEYBINDS };

export const useKeybindsStore = create<KeybindsState>((set, get) => ({
  keybinds: { ...DEFAULT_KEYBINDS },
  loaded: false,
  loading: false,

  fetchKeybinds: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const res = await api.get<{ keybinds: Record<string, string> }>('/api/users/me/keybinds');
      const merged = { ...DEFAULT_KEYBINDS, ...(res.keybinds || {}) };
      set({ keybinds: merged, loaded: true, loading: false });
      // Push all keybinds to main process for global shortcut registration
      electronAPI?.shortcuts?.update(merged);
    } catch {
      set({ loaded: true, loading: false });
    }
  },

  updateKeybind: async (action, combo) => {
    set((s) => ({ keybinds: { ...s.keybinds, [action]: combo } }));
    // Update global shortcut in main process
    electronAPI?.shortcuts?.set(action, combo);
    try {
      await api.patch('/api/users/me/keybinds', { [action]: combo });
    } catch {
      // Revert on failure could be added, but server is authoritative on next fetch
    }
  },

  resetKeybind: async (action) => {
    const defaultValue = DEFAULT_KEYBINDS[action] || '';
    set((s) => ({ keybinds: { ...s.keybinds, [action]: defaultValue } }));
    // Update global shortcut in main process
    electronAPI?.shortcuts?.set(action, defaultValue);
    try {
      await api.patch('/api/users/me/keybinds', { [action]: defaultValue });
    } catch {
      // ignore
    }
  },

  getLabel: (action) => KEYBIND_LABELS[action] || action,
}));
