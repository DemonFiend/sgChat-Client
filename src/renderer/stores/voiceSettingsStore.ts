import { create } from 'zustand';
import { saveRemoteSetting, type RemoteSettings } from '../lib/settingsSync';
import type { NoiseCancellationMode } from '../types/noiseSuppression';

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
  noiseCancellationMode: NoiseCancellationMode;
  nsAggressiveness: number;
  inputSensitivity: number;
  joinSoundEnabled: boolean;
  leaveSoundEnabled: boolean;
  joinSoundUrl: string | null;
  leaveSoundUrl: string | null;
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
  setNoiseCancellationMode: (mode: NoiseCancellationMode) => void;
  setNsAggressiveness: (value: number) => void;
  setInputSensitivity: (value: number) => void;
  setJoinSoundEnabled: (enabled: boolean) => void;
  setLeaveSoundEnabled: (enabled: boolean) => void;
  setJoinSoundUrl: (url: string | null) => void;
  setLeaveSoundUrl: (url: string | null) => void;
  /**
   * Validate saved devices against currently available hardware.
   * If a saved device ID is no longer present, reset it to 'default'.
   */
  validateDevices: (availableInputIds: string[], availableOutputIds: string[]) => void;
  /** Hydrate syncable settings from server (NOT device IDs). */
  hydrateFromServer: (remote: RemoteSettings) => void;
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
  noiseCancellationMode: 'nsnet2',
  nsAggressiveness: 0.5,
  inputSensitivity: 50,
  joinSoundEnabled: true,
  leaveSoundEnabled: true,
  joinSoundUrl: null,
  leaveSoundUrl: null,
};

function loadSettings(): VoiceSettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    // Migrate legacy aiNoiseSuppression boolean → noiseCancellationMode
    if ('aiNoiseSuppression' in parsed && !('noiseCancellationMode' in parsed)) {
      parsed.noiseCancellationMode = parsed.aiNoiseSuppression ? 'nsnet2' : 'off';
      delete parsed.aiNoiseSuppression;
      // Persist migration immediately so it only runs once
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    }

    return { ...DEFAULTS, ...(parsed as Partial<VoiceSettingsData>) };
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

/** Map from local key to remote settings key for syncable settings. */
const SYNCABLE_KEYS: Partial<Record<keyof VoiceSettingsData, keyof RemoteSettings>> = {
  noiseSuppression: 'noise_suppression',
  echoCancellation: 'echo_cancellation',
  autoGainControl: 'auto_gain_control',
  vad: 'vad',
  noiseCancellationMode: 'noise_cancellation_mode',
  nsAggressiveness: 'ns_aggressiveness',
  inputSensitivity: 'input_sensitivity',
  inputVolume: 'input_volume',
  outputVolume: 'output_volume',
  joinSoundEnabled: 'join_sound_enabled',
  leaveSoundEnabled: 'leave_sound_enabled',
};

/** Auto-persisting setter: updates zustand state + writes to localStorage + remote sync */
function autoPersist<K extends keyof VoiceSettingsData>(key: K) {
  return (value: VoiceSettingsData[K]) => {
    persist({ [key]: value });
    const remoteKey = SYNCABLE_KEYS[key];
    if (remoteKey) {
      saveRemoteSetting({ [remoteKey]: value });
    }
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
  setNoiseCancellationMode: (mode) => set(autoPersist('noiseCancellationMode')(mode)),
  setNsAggressiveness: (value) => set(autoPersist('nsAggressiveness')(value)),
  setInputSensitivity: (value) => set(autoPersist('inputSensitivity')(value)),
  setJoinSoundEnabled: (enabled) => set(autoPersist('joinSoundEnabled')(enabled)),
  setLeaveSoundEnabled: (enabled) => set(autoPersist('leaveSoundEnabled')(enabled)),
  setJoinSoundUrl: (url) => set(autoPersist('joinSoundUrl')(url)),
  setLeaveSoundUrl: (url) => set(autoPersist('leaveSoundUrl')(url)),

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

  hydrateFromServer: (remote) => {
    const updates: Partial<VoiceSettingsData> = {};
    if (remote.noise_suppression !== undefined) updates.noiseSuppression = remote.noise_suppression;
    if (remote.echo_cancellation !== undefined) updates.echoCancellation = remote.echo_cancellation;
    if (remote.auto_gain_control !== undefined) updates.autoGainControl = remote.auto_gain_control;
    if (remote.vad !== undefined) updates.vad = remote.vad;
    // New noise cancellation mode field (string enum)
    if (remote.noise_cancellation_mode !== undefined) {
      updates.noiseCancellationMode = remote.noise_cancellation_mode as NoiseCancellationMode;
    } else if (remote.ai_noise_suppression !== undefined) {
      // Backward compat: old server only has boolean ai_noise_suppression
      updates.noiseCancellationMode = remote.ai_noise_suppression ? 'nsnet2' : 'off';
    }
    if (remote.ns_aggressiveness !== undefined) updates.nsAggressiveness = remote.ns_aggressiveness;
    if (remote.input_sensitivity !== undefined) updates.inputSensitivity = remote.input_sensitivity;
    if (remote.input_volume !== undefined) updates.inputVolume = remote.input_volume;
    if (remote.output_volume !== undefined) updates.outputVolume = remote.output_volume;
    if (remote.join_sound_enabled !== undefined) updates.joinSoundEnabled = remote.join_sound_enabled;
    if (remote.leave_sound_enabled !== undefined) updates.leaveSoundEnabled = remote.leave_sound_enabled;

    if (Object.keys(updates).length > 0) {
      persist(updates);
      set(updates);
    }
  },
}));
