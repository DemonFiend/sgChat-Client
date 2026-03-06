import { create } from 'zustand';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  data: Record<string, any>;
  priority?: string;
  read: boolean;
  created_at: string;
}

interface NotificationState {
  panelOpen: boolean;
  togglePanel: () => void;
  closePanel: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  panelOpen: false,
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
  closePanel: () => set({ panelOpen: false }),
}));
