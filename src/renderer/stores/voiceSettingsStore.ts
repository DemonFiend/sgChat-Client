import { create } from 'zustand';

interface VoiceSettingsState {
  inputDevice: string;
  outputDevice: string;
  inputVolume: number;
  outputVolume: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  vad: boolean;

  setInputDevice: (deviceId: string) => void;
  setOutputDevice: (deviceId: string) => void;
  setInputVolume: (volume: number) => void;
  setOutputVolume: (volume: number) => void;
  setNoiseSuppression: (enabled: boolean) => void;
  setEchoCancellation: (enabled: boolean) => void;
  setVad: (enabled: boolean) => void;
}

export const useVoiceSettingsStore = create<VoiceSettingsState>((set) => ({
  inputDevice: 'default',
  outputDevice: 'default',
  inputVolume: 100,
  outputVolume: 100,
  noiseSuppression: true,
  echoCancellation: true,
  vad: true,

  setInputDevice: (deviceId) => set({ inputDevice: deviceId }),
  setOutputDevice: (deviceId) => set({ outputDevice: deviceId }),
  setInputVolume: (volume) => set({ inputVolume: volume }),
  setOutputVolume: (volume) => set({ outputVolume: volume }),
  setNoiseSuppression: (enabled) => set({ noiseSuppression: enabled }),
  setEchoCancellation: (enabled) => set({ echoCancellation: enabled }),
  setVad: (enabled) => set({ vad: enabled }),
}));
