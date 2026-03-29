import { create } from 'zustand';

interface PresenceState {
  statuses: Record<string, string>; // userId → 'online' | 'idle' | 'dnd' | 'offline'
  statusComments: Record<string, string>; // userId → custom status text

  updatePresence: (userId: string, status: string) => void;
  updateStatusComment: (userId: string, comment: string) => void;
  getStatus: (userId: string) => string;
  getStatusComment: (userId: string) => string;
  /** Set a batch of presence statuses (e.g. from initial member list load) */
  setBulkPresence: (statuses: Record<string, string>) => void;
  /** Clear all presence data (e.g. on socket disconnect) */
  clearAll: () => void;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  statuses: {},
  statusComments: {},

  updatePresence: (userId, status) =>
    set((s) => ({
      statuses: { ...s.statuses, [userId]: status },
    })),

  updateStatusComment: (userId, comment) =>
    set((s) => ({
      statusComments: { ...s.statusComments, [userId]: comment },
    })),

  getStatus: (userId) => get().statuses[userId] || 'offline',

  getStatusComment: (userId) => get().statusComments[userId] || '',

  setBulkPresence: (statuses) => set({ statuses }),

  clearAll: () => set({ statuses: {}, statusComments: {} }),
}));
