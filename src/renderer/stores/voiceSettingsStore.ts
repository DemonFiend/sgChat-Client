import { create } from 'zustand';

const STORAGE_KEY = 'sgchat_voice_settings';

interface VoiceSettingsData {
  inputDevice: string;
  outputDevice: string;
  inputVolume: number;
  outputVolume: number;
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  vad: boolean;
}

interface VoiceSettingsState extends VoiceSettingsData {
  setInputDevice: (deviceId: string) => void;
  setOutputDevice: (deviceId: string) => void;
  setInputVolume: (volume: number) => void;
  setOutputVolume: (volume: number) => void;
  setNoiseSuppression: (enabled: boolean) => void;
  setEchoCancellation: (enabled: boolean) => void;
  setAutoGainControl: (enabled: boolean) => void;
  setVad: (enabled: boolean) => void;
  /**
   * Validate saved devices against currently available hardware.
   * If a saved device ID is no longer present, reset it to 'default'.
   */
  validateDevices: (availableInputIds: string[], availableOutputIds: string[]) => void;
}

const DEFAULTS: VoiceSettingsData = {
  inputDevice: 'default',
  outputDevice: 'default',
  inputVolume: 100,
  outputVolume: 100,
  noiseSuppression: true,
  echoCancellation: true,
  autoGainControl: true,
  vad: true,
};

function loadSettings(): VoiceSettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<VoiceSettingsData>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function persist(data: Partial<VoiceSettingsData>) {
  try {
    const current = loadSettings();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...data }));
  } catch {
    // localStorage full or unavailable — ignore
  }
}

/** Auto-persisting setter: updates zustand state + writes to localStorage */
function autoPersist<K extends keyof VoiceSettingsData>(key: K) {
  return (value: VoiceSettingsData[K]) => {
    persist({ [key]: value });
    return { [key]: value } as Pick<VoiceSettingsData, K>;
  };
}

export const useVoiceSettingsStore = create<VoiceSettingsState>((set) => ({
  ...loadSettings(),

  setInputDevice: (deviceId) => set(autoPersist('inputDevice')(deviceId)),
  setOutputDevice: (deviceId) => set(autoPersist('outputDevice')(deviceId)),
  setInputVolume: (volume) => set(autoPersist('inputVolume')(volume)),
  setOutputVolume: (volume) => set(autoPersist('outputVolume')(volume)),
  setNoiseSuppression: (enabled) => set(autoPersist('noiseSuppression')(enabled)),
  setEchoCancellation: (enabled) => set(autoPersist('echoCancellation')(enabled)),
  setAutoGainControl: (enabled) => set(autoPersist('autoGainControl')(enabled)),
  setVad: (enabled) => set(autoPersist('vad')(enabled)),

  validateDevices: (availableInputIds, availableOutputIds) =>
    set((state) => {
      const updates: Partial<VoiceSettingsData> = {};
      if (state.inputDevice !== 'default' && !availableInputIds.includes(state.inputDevice)) {
        updates.inputDevice = 'default';
      }
      if (state.outputDevice !== 'default' && !availableOutputIds.includes(state.outputDevice)) {
        updates.outputDevice = 'default';
      }
      if (Object.keys(updates).length > 0) {
        persist(updates);
        return updates;
      }
      return {};
    }),
}));
