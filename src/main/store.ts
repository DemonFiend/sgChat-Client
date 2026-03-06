import Store from 'electron-store';
import { randomBytes } from 'crypto';
import path from 'path';

// ── Settings Store (unencrypted) ──────────────────────────────────────────────

export interface SavedServer {
  url: string;
  name: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  userId: string;
  lastUsed: number;
}

interface SettingsSchema {
  autoStart: boolean;
  windowState: {
    x?: number;
    y?: number;
    width: number;
    height: number;
    isMaximized: boolean;
  };
  savedServers: SavedServer[];
}

const settingsStore = new Store<SettingsSchema>({
  name: 'settings',
  defaults: {
    autoStart: false,
    windowState: {
      width: 1280,
      height: 800,
      isMaximized: false,
    },
    savedServers: [],
  },
});

export function getAutoStart(): boolean {
  return settingsStore.get('autoStart');
}

export function setAutoStart(enabled: boolean): void {
  settingsStore.set('autoStart', enabled);
}

export function getWindowState(): SettingsSchema['windowState'] {
  return settingsStore.get('windowState');
}

export function setWindowState(state: SettingsSchema['windowState']): void {
  settingsStore.set('windowState', state);
}

// ── Auth Store (encrypted) ────────────────────────────────────────────────────

interface AuthSchema {
  serverUrl: string;
  accessToken: string;
  refreshToken: string;
  userId: string;
  rememberedEmail: string;
  encryptionSalt: string;
}

// Generate a machine-specific encryption key
function getEncryptionKey(): string {
  const keyStore = new Store<{ key: string }>({ name: 'keychain' });
  let key = keyStore.get('key');
  if (!key) {
    key = randomBytes(32).toString('hex');
    keyStore.set('key', key);
  }
  return key;
}

const authStore = new Store<AuthSchema>({
  name: 'auth',
  encryptionKey: getEncryptionKey(),
  defaults: {
    serverUrl: '',
    accessToken: '',
    refreshToken: '',
    userId: '',
    rememberedEmail: '',
    encryptionSalt: '',
  },
});

export function getServerUrl(): string {
  return authStore.get('serverUrl');
}

export function setServerUrl(url: string): void {
  const normalized = url.replace(/\/+$/, '');
  authStore.set('serverUrl', normalized);
}

export function hasServerUrl(): boolean {
  const url = authStore.get('serverUrl');
  return typeof url === 'string' && url.length > 0;
}

export function getAccessToken(): string {
  return authStore.get('accessToken');
}

export function getRefreshToken(): string {
  return authStore.get('refreshToken');
}

export function getUserId(): string {
  return authStore.get('userId');
}

export function setTokens(accessToken: string, refreshToken: string, userId: string): void {
  authStore.set('accessToken', accessToken);
  authStore.set('refreshToken', refreshToken);
  authStore.set('userId', userId);
}

export function clearTokens(): void {
  authStore.set('accessToken', '');
  authStore.set('refreshToken', '');
  authStore.set('userId', '');
}

export function isAuthenticated(): boolean {
  return !!authStore.get('accessToken') && !!authStore.get('refreshToken');
}

export function getRememberedEmail(): string {
  return authStore.get('rememberedEmail');
}

export function setRememberedEmail(email: string): void {
  authStore.set('rememberedEmail', email);
}

// ── Saved Servers (quick switcher) ────────────────────────────────────────────

export function getSavedServers(): SavedServer[] {
  return settingsStore.get('savedServers') || [];
}

export function saveServer(server: Omit<SavedServer, 'lastUsed'>): void {
  const servers = getSavedServers();
  const idx = servers.findIndex((s) => s.url === server.url);
  const entry: SavedServer = { ...server, lastUsed: Date.now() };
  if (idx >= 0) {
    servers[idx] = entry;
  } else {
    servers.push(entry);
  }
  settingsStore.set('savedServers', servers);
}

export function removeSavedServer(url: string): void {
  const servers = getSavedServers().filter((s) => s.url !== url);
  settingsStore.set('savedServers', servers);
}

/**
 * Save current session to saved servers, then load a different server's credentials.
 * Returns the loaded server's tokens for the renderer to use.
 */
export function switchToServer(targetUrl: string): SavedServer | null {
  const servers = getSavedServers();
  const target = servers.find((s) => s.url === targetUrl);
  if (!target) return null;

  // Save current session before switching
  const currentUrl = getServerUrl();
  const currentAccessToken = getAccessToken();
  const currentRefreshToken = getRefreshToken();
  const currentUserId = getUserId();
  const currentEmail = getRememberedEmail();
  if (currentUrl && currentAccessToken) {
    const currentName = servers.find((s) => s.url === currentUrl)?.name || currentUrl;
    saveServer({
      url: currentUrl,
      name: currentName,
      email: currentEmail,
      accessToken: currentAccessToken,
      refreshToken: currentRefreshToken,
      userId: currentUserId,
    });
  }

  // Load target server credentials
  setServerUrl(target.url);
  setTokens(target.accessToken, target.refreshToken, target.userId);
  setRememberedEmail(target.email);

  // Update lastUsed
  target.lastUsed = Date.now();
  const updatedServers = getSavedServers();
  const idx = updatedServers.findIndex((s) => s.url === target.url);
  if (idx >= 0) updatedServers[idx] = target;
  settingsStore.set('savedServers', updatedServers);

  return target;
}

export { settingsStore, authStore };
