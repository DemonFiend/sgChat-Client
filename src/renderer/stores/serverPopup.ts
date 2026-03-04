import { create } from 'zustand';

const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = 'sgchat_popup_dismissed';

function getDismissedMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setDismissed(serverId: string) {
  const map = getDismissedMap();
  map[serverId] = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

function wasDismissedRecently(serverId: string): boolean {
  const map = getDismissedMap();
  const ts = map[serverId];
  if (!ts) return false;
  return Date.now() - ts < COOLDOWN_MS;
}

interface ServerPopupState {
  visibleServerId: string | null;
  show: (serverId: string) => void;
  dismiss: () => void;
  shouldShow: (serverId: string) => boolean;
}

export const useServerPopupStore = create<ServerPopupState>((set, get) => ({
  visibleServerId: null,

  show: (serverId) => {
    if (!wasDismissedRecently(serverId)) {
      set({ visibleServerId: serverId });
    }
  },

  dismiss: () => {
    const { visibleServerId } = get();
    if (visibleServerId) {
      setDismissed(visibleServerId);
    }
    set({ visibleServerId: null });
  },

  shouldShow: (serverId) => !wasDismissedRecently(serverId),
}));
