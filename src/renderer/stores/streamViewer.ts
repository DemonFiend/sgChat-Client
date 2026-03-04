import { create } from 'zustand';

interface StreamViewerState {
  isViewing: boolean;
  streamerId: string | null;
  streamerName: string | null;
  channelId: string | null;
  isLocalPreview: boolean;

  openStream: (streamerId: string, streamerName: string, channelId: string) => void;
  openLocalPreview: (channelId: string) => void;
  close: () => void;
}

export const useStreamViewerStore = create<StreamViewerState>((set) => ({
  isViewing: false,
  streamerId: null,
  streamerName: null,
  channelId: null,
  isLocalPreview: false,

  openStream: (streamerId, streamerName, channelId) =>
    set({ isViewing: true, streamerId, streamerName, channelId, isLocalPreview: false }),

  openLocalPreview: (channelId) =>
    set({ isViewing: true, streamerId: null, streamerName: 'You', channelId, isLocalPreview: true }),

  close: () =>
    set({ isViewing: false, streamerId: null, streamerName: null, channelId: null, isLocalPreview: false }),
}));
