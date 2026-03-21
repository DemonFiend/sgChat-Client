import { create } from 'zustand';

// ── Types ────────────────────────────────────────────────────────

export interface RelayServer {
  id: string;
  name: string;
  region: string;
  health_url: string | null;
  livekit_url?: string;
  status?: 'online' | 'offline' | 'degraded';
}

export type ConnectionStatus = 'idle' | 'testing' | 'connected' | 'failed';

// ── Storage Helpers ──────────────────────────────────────────────

const STORAGE_KEYS = {
  relays: 'sgchat-relays',
  selectedRelay: 'sgchat-selected-relay',
};

function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error('Failed to save to localStorage:', err);
  }
}

// ── Store ────────────────────────────────────────────────────────

interface NetworkState {
  relays: RelayServer[];
  selectedRelayId: string | null;
  pings: Record<string, number>; // relayId → latencyMs
  connectionStatus: ConnectionStatus;
  connectionError: string | null;
  lastFetched: number | null;
}

interface NetworkActions {
  setRelays: (relays: RelayServer[]) => void;
  selectRelay: (relayId: string | null) => void;
  updatePing: (relayId: string, latencyMs: number) => void;
  updatePings: (pings: Record<string, number>) => void;
  setConnectionStatus: (status: ConnectionStatus, error?: string | null) => void;
  bestRelay: () => RelayServer | null;
  clearRelays: () => void;
}

export const useNetworkStore = create<NetworkState & NetworkActions>((set, get) => ({
  relays: loadFromStorage<RelayServer[]>(STORAGE_KEYS.relays, []),
  selectedRelayId: loadFromStorage<string | null>(STORAGE_KEYS.selectedRelay, null),
  pings: {},
  connectionStatus: 'idle',
  connectionError: null,
  lastFetched: null,

  setRelays: (relays) => {
    set({ relays, lastFetched: Date.now() });
    saveToStorage(STORAGE_KEYS.relays, relays);
  },

  selectRelay: (relayId) => {
    set({ selectedRelayId: relayId });
    saveToStorage(STORAGE_KEYS.selectedRelay, relayId);
  },

  updatePing: (relayId, latencyMs) => {
    const { pings } = get();
    set({ pings: { ...pings, [relayId]: latencyMs } });
  },

  updatePings: (pings) => {
    set({ pings: { ...get().pings, ...pings } });
  },

  setConnectionStatus: (status, error = null) => {
    set({ connectionStatus: status, connectionError: error });
  },

  bestRelay: () => {
    const { relays, pings } = get();
    const online = relays.filter((r) => r.status !== 'offline');
    if (online.length === 0) return null;

    // Pick the relay with lowest ping; fall back to first online if no pings
    let best: RelayServer | null = null;
    let bestPing = Infinity;
    for (const relay of online) {
      const ping = pings[relay.id];
      if (ping !== undefined && ping < bestPing) {
        bestPing = ping;
        best = relay;
      }
    }
    return best ?? online[0];
  },

  clearRelays: () => {
    set({ relays: [], pings: {}, selectedRelayId: null, lastFetched: null });
    localStorage.removeItem(STORAGE_KEYS.relays);
    localStorage.removeItem(STORAGE_KEYS.selectedRelay);
  },
}));

// ── Non-hook accessor ────────────────────────────────────────────

export const networkStore = {
  getState: () => useNetworkStore.getState(),
  relays: () => useNetworkStore.getState().relays,
  selectedRelayId: () => useNetworkStore.getState().selectedRelayId,
  pings: () => useNetworkStore.getState().pings,
  setRelays: (relays: RelayServer[]) => useNetworkStore.getState().setRelays(relays),
  selectRelay: (id: string | null) => useNetworkStore.getState().selectRelay(id),
  updatePing: (id: string, ms: number) => useNetworkStore.getState().updatePing(id, ms),
  updatePings: (pings: Record<string, number>) => useNetworkStore.getState().updatePings(pings),
  bestRelay: () => useNetworkStore.getState().bestRelay(),
  clearRelays: () => useNetworkStore.getState().clearRelays(),
};
