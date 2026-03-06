import { create } from 'zustand';

export interface StreamInfo {
  streamerId: string;
  streamerName: string;
  streamerAvatar: string | null;
  channelId: string;
  isLocalPreview: boolean;
}

interface StreamViewerState {
  activeStream: StreamInfo | null;
  videoElement: HTMLVideoElement | null;
  audioAvailableVersion: number;
  isMinimized: boolean;
}

interface StreamViewerActions {
  watchStream: (stream: StreamInfo) => void;
  leaveStream: () => void;
  setVideoElement: (el: HTMLVideoElement | null) => void;
  minimizeStream: () => void;
  maximizeStream: () => void;
  toggleMinimize: () => void;
  isWatchingStream: () => boolean;
  isWatchingStreamer: (streamerId: string) => boolean;
  notifyAudioAvailable: () => void;
}

export const useStreamViewerStore = create<StreamViewerState & StreamViewerActions>(
  (set, get) => ({
    activeStream: null,
    videoElement: null,
    audioAvailableVersion: 0,
    isMinimized: false,

    watchStream: (stream) => set({ activeStream: stream, isMinimized: false }),
    leaveStream: () => set({ activeStream: null, videoElement: null, isMinimized: false }),
    setVideoElement: (el) => set({ videoElement: el }),
    minimizeStream: () => set({ isMinimized: true }),
    maximizeStream: () => set({ isMinimized: false }),
    toggleMinimize: () => set((s) => ({ isMinimized: !s.isMinimized })),
    isWatchingStream: () => get().activeStream !== null,
    isWatchingStreamer: (streamerId) => get().activeStream?.streamerId === streamerId,
    notifyAudioAvailable: () =>
      set((s) => ({ audioAvailableVersion: s.audioAvailableVersion + 1 })),
  }),
);

// Non-hook convenience alias for use in voiceService / voiceStore
export const streamViewerStore = {
  getState: () => useStreamViewerStore.getState(),
  watchStream: (stream: StreamInfo) => useStreamViewerStore.getState().watchStream(stream),
  leaveStream: () => useStreamViewerStore.getState().leaveStream(),
  setVideoElement: (el: HTMLVideoElement | null) => useStreamViewerStore.getState().setVideoElement(el),
  isWatchingStream: () => useStreamViewerStore.getState().isWatchingStream(),
  isWatchingStreamer: (id: string) => useStreamViewerStore.getState().isWatchingStreamer(id),
  notifyAudioAvailable: () => useStreamViewerStore.getState().notifyAudioAvailable(),
  minimizeStream: () => useStreamViewerStore.getState().minimizeStream(),
  maximizeStream: () => useStreamViewerStore.getState().maximizeStream(),
  toggleMinimize: () => useStreamViewerStore.getState().toggleMinimize(),
};
