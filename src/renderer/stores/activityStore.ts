import { create } from 'zustand';

export interface UserActivity {
  type: 'playing' | 'listening' | 'watching' | 'streaming' | 'competing' | 'custom';
  name: string;
  details?: string | null;
  state?: string | null;
  started_at?: string | null;
  large_image_url?: string | null;
  small_image_url?: string | null;
}

interface ActivityState {
  /** Other users' activities, keyed by userId */
  activities: Record<string, UserActivity | null>;
  /** Current user's own activity (if set) */
  myActivity: UserActivity | null;

  updateActivity: (userId: string, activity: UserActivity | null) => void;
  setMyActivity: (activity: UserActivity | null) => void;
  getActivity: (userId: string) => UserActivity | null;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  activities: {},
  myActivity: null,

  updateActivity: (userId, activity) =>
    set((s) => ({
      activities: { ...s.activities, [userId]: activity },
    })),

  setMyActivity: (activity) => set({ myActivity: activity }),

  getActivity: (userId) => get().activities[userId] || null,
}));
