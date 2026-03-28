// Server-side settings sync — load/save user settings via REST API.
// Server wins on first load, local wins on change (fire-and-forget PATCH).

import { api } from './api';

export interface RemoteSettings {
  // Notification prefs
  desktop_notifications?: boolean;
  notification_sounds?: boolean;
  flash_taskbar?: boolean;
  mention_only?: boolean;
  // Voice prefs (NOT device IDs — those stay local)
  noise_suppression?: boolean;
  echo_cancellation?: boolean;
  auto_gain_control?: boolean;
  vad?: boolean;
  ai_noise_suppression?: boolean;
  input_sensitivity?: number;
  input_volume?: number;
  output_volume?: number;
  join_sound_enabled?: boolean;
  leave_sound_enabled?: boolean;
}

/**
 * Fetch the authenticated user's settings from the server.
 * Returns null on any error (network, 404, etc.) — caller should
 * silently fall back to local defaults.
 */
export async function loadRemoteSettings(): Promise<RemoteSettings | null> {
  try {
    const data = await api.get<RemoteSettings>('/api/users/me/settings');
    return data;
  } catch {
    return null;
  }
}

/**
 * Fire-and-forget PATCH to persist setting changes server-side.
 * Caller should NOT await this in the UI hot path.
 */
export function saveRemoteSetting(updates: Partial<RemoteSettings>): void {
  api.patch('/api/users/me/settings', updates).catch(() => {
    // Silent fail — local state is the source of truth after first load
  });
}
