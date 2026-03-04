import { create } from 'zustand';

interface TypingUser {
  userId: string;
  username: string;
  timestamp: number;
}

interface TypingState {
  typing: Record<string, TypingUser[]>; // channelId → list of typing users

  addTyping: (channelId: string, userId: string, username: string) => void;
  removeTyping: (channelId: string, userId: string) => void;
  /**
   * Returns filtered typing users for a channel. Uses `.filter()` internally,
   * so it returns a NEW array on every call.
   *
   * ⚠️  NEVER call this inside a Zustand selector — it will cause React error #185
   * (infinite re-render loop) because useSyncExternalStore's Object.is check
   * always fails on new array references.
   *
   * ✅ Use `s.typing[channelId]` in selectors instead, then filter in the component.
   * ✅ Safe to call via `useTypingStore.getState().getTyping()` in event handlers.
   */
  getTyping: (channelId: string) => TypingUser[];
}

const TYPING_TIMEOUT = 8000; // Clear stale typing indicators after 8s

export const useTypingStore = create<TypingState>((set, get) => ({
  typing: {},

  addTyping: (channelId, userId, username) => {
    set((s) => {
      const current = (s.typing[channelId] || []).filter((t) => t.userId !== userId);
      return {
        typing: {
          ...s.typing,
          [channelId]: [...current, { userId, username, timestamp: Date.now() }],
        },
      };
    });

    // Auto-remove after timeout
    setTimeout(() => {
      get().removeTyping(channelId, userId);
    }, TYPING_TIMEOUT);
  },

  removeTyping: (channelId, userId) =>
    set((s) => ({
      typing: {
        ...s.typing,
        [channelId]: (s.typing[channelId] || []).filter((t) => t.userId !== userId),
      },
    })),

  getTyping: (channelId) => {
    const now = Date.now();
    return (get().typing[channelId] || []).filter(
      (t) => now - t.timestamp < TYPING_TIMEOUT
    );
  },
}));
