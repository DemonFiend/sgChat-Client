import { create } from 'zustand';
import { saveRemoteSetting, type RemoteSettings } from '../lib/settingsSync';

const STORAGE_KEY = 'sgchat_notification_settings';

interface NotificationSettingsData {
  desktopNotifications: boolean;
  notificationSounds: boolean;
  flashTaskbar: boolean;
  mentionOnly: boolean;
}

interface NotificationSettingsState extends NotificationSettingsData {
  setDesktopNotifications: (enabled: boolean) => void;
  setNotificationSounds: (enabled: boolean) => void;
  setFlashTaskbar: (enabled: boolean) => void;
  setMentionOnly: (enabled: boolean) => void;
  /** Hydrate from server settings (server wins on first load). */
  hydrateFromServer: (remote: RemoteSettings) => void;
}

const DEFAULTS: NotificationSettingsData = {
  desktopNotifications: true,
  notificationSounds: true,
  flashTaskbar: true,
  mentionOnly: false,
};

function loadLocal(): NotificationSettingsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<NotificationSettingsData>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function persistLocal(data: Partial<NotificationSettingsData>): void {
  try {
    const current = loadLocal();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...data }));
  } catch {
    // localStorage full or unavailable
  }
}

function setAndSync<K extends keyof NotificationSettingsData>(
  key: K,
  remoteKey: keyof RemoteSettings,
) {
  return (value: NotificationSettingsData[K]) => {
    persistLocal({ [key]: value });
    saveRemoteSetting({ [remoteKey]: value });
    return { [key]: value } as Pick<NotificationSettingsData, K>;
  };
}

export const useNotificationSettingsStore = create<NotificationSettingsState>((set) => ({
  ...loadLocal(),

  setDesktopNotifications: (enabled) =>
    set(setAndSync('desktopNotifications', 'desktop_notifications')(enabled)),

  setNotificationSounds: (enabled) =>
    set(setAndSync('notificationSounds', 'notification_sounds')(enabled)),

  setFlashTaskbar: (enabled) =>
    set(setAndSync('flashTaskbar', 'flash_taskbar')(enabled)),

  setMentionOnly: (enabled) =>
    set(setAndSync('mentionOnly', 'mention_only')(enabled)),

  hydrateFromServer: (remote) => {
    const updates: Partial<NotificationSettingsData> = {};
    if (remote.desktop_notifications !== undefined) updates.desktopNotifications = remote.desktop_notifications;
    if (remote.notification_sounds !== undefined) updates.notificationSounds = remote.notification_sounds;
    if (remote.flash_taskbar !== undefined) updates.flashTaskbar = remote.flash_taskbar;
    if (remote.mention_only !== undefined) updates.mentionOnly = remote.mention_only;

    if (Object.keys(updates).length > 0) {
      persistLocal(updates);
      set(updates);
    }
  },
}));
