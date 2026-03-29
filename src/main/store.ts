import Store from 'electron-store';
import { safeStorage } from 'electron';
import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { app } from 'electron';

// ── Lazy Store Initialization ────────────────────────────────────────────────
// electron-store v10 needs `app.getPath('userData')` to resolve the config dir.
// At module-load time in bundled CJS, the Electron `app` module isn't ready yet,
// causing `conf` to throw "Please specify the `projectName` option."
// We defer store creation to first access, which is always after app.whenReady().

// ── Settings Store (encrypted with OS-level key) ─────────────────────────────

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
  favoriteServerUrl: string;
}

let _settingsStore: Store<SettingsSchema> | null = null;

const SETTINGS_DEFAULTS: SettingsSchema = {
  autoStart: false,
  windowState: {
    width: 1280,
    height: 800,
    isMaximized: false,
  },
  savedServers: [],
  favoriteServerUrl: '',
};

/**
 * Migrate old plaintext settings.json to encrypted format.
 * Reads the old file, deletes it, then lets the encrypted store re-create it.
 */
function migrateOldSettings(): SettingsSchema | null {
  const oldPath = path.join(app.getPath('userData'), 'settings.json');
  if (!fs.existsSync(oldPath)) return null;
  try {
    const raw = fs.readFileSync(oldPath, 'utf-8');
    const data = JSON.parse(raw);
    // If it parses as JSON with known fields, it's the old plaintext format
    if (data && (data.savedServers || data.autoStart !== undefined || data.windowState)) {
      fs.unlinkSync(oldPath); // Delete plaintext file
      return data as SettingsSchema;
    }
  } catch {
    // Not valid JSON — either already encrypted or corrupted, ignore
  }
  return null;
}

function getSettingsStore(): Store<SettingsSchema> {
  if (!_settingsStore) {
    // Check for old plaintext settings before creating the encrypted store
    const migratedData = migrateOldSettings();

    _settingsStore = new Store<SettingsSchema>({
      name: 'settings',
      encryptionKey: getEncryptionKey(),
      defaults: SETTINGS_DEFAULTS,
    });

    // Restore migrated data into the new encrypted store
    if (migratedData) {
      if (migratedData.autoStart !== undefined) _settingsStore.set('autoStart', migratedData.autoStart);
      if (migratedData.windowState) _settingsStore.set('windowState', migratedData.windowState);
      if (migratedData.savedServers?.length) _settingsStore.set('savedServers', migratedData.savedServers);
      if (migratedData.favoriteServerUrl) _settingsStore.set('favoriteServerUrl', migratedData.favoriteServerUrl);
    }
  }
  return _settingsStore;
}

export function getAutoStart(): boolean {
  return getSettingsStore().get('autoStart');
}

export function setAutoStart(enabled: boolean): void {
  getSettingsStore().set('autoStart', enabled);
}

export function getWindowState(): SettingsSchema['windowState'] {
  return getSettingsStore().get('windowState');
}

export function setWindowState(state: SettingsSchema['windowState']): void {
  getSettingsStore().set('windowState', state);
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

// ── OS-Protected Encryption Key ──────────────────────────────────────────────
// The encryption key is protected by the OS credential store (DPAPI on Windows,
// Keychain on macOS, libsecret on Linux). The key file on disk is an opaque
// encrypted blob that only the current OS user session can decrypt.

const KEY_FILE = 'encryption-key.bin';

function getKeyFilePath(): string {
  return path.join(app.getPath('userData'), KEY_FILE);
}

function getEncryptionKey(): string {
  const keyPath = getKeyFilePath();

  // Try to load existing OS-protected key
  if (fs.existsSync(keyPath)) {
    try {
      const encryptedBuffer = fs.readFileSync(keyPath);
      return safeStorage.decryptString(encryptedBuffer);
    } catch {
      // Corrupted or inaccessible — regenerate below
    }
  }

  // Migrate from old plaintext keychain.json if it exists
  const oldKeychainPath = path.join(app.getPath('userData'), 'keychain.json');
  let key: string | null = null;
  if (fs.existsSync(oldKeychainPath)) {
    try {
      const oldData = JSON.parse(fs.readFileSync(oldKeychainPath, 'utf-8'));
      if (oldData.key) {
        key = oldData.key;
        // Delete the old plaintext key file
        fs.unlinkSync(oldKeychainPath);
      }
    } catch {
      // Old file unreadable — generate fresh key
    }
  }

  // Generate new key if no migration
  if (!key) {
    key = randomBytes(32).toString('hex');
  }

  // Encrypt and save with OS-level protection
  const encryptedBuffer = safeStorage.encryptString(key);
  fs.writeFileSync(keyPath, encryptedBuffer);

  return key;
}

let _authStore: Store<AuthSchema> | null = null;

function getAuthStore(): Store<AuthSchema> {
  if (!_authStore) {
    _authStore = new Store<AuthSchema>({
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
  }
  return _authStore;
}

export function getServerUrl(): string {
  return getAuthStore().get('serverUrl');
}

export function setServerUrl(url: string): void {
  const normalized = url.replace(/\/+$/, '');
  getAuthStore().set('serverUrl', normalized);
}

export function hasServerUrl(): boolean {
  const url = getAuthStore().get('serverUrl');
  return typeof url === 'string' && url.length > 0;
}

export function getAccessToken(): string {
  return getAuthStore().get('accessToken');
}

export function getRefreshToken(): string {
  return getAuthStore().get('refreshToken');
}

export function getUserId(): string {
  return getAuthStore().get('userId');
}

export function setTokens(accessToken: string, refreshToken: string, userId: string): void {
  getAuthStore().set('accessToken', accessToken);
  getAuthStore().set('refreshToken', refreshToken);
  getAuthStore().set('userId', userId);
}

export function clearTokens(): void {
  getAuthStore().set('accessToken', '');
  getAuthStore().set('refreshToken', '');
  getAuthStore().set('userId', '');
}

export function isAuthenticated(): boolean {
  return !!getAuthStore().get('accessToken') && !!getAuthStore().get('refreshToken');
}

export function getRememberedEmail(): string {
  return getAuthStore().get('rememberedEmail');
}

export function setRememberedEmail(email: string): void {
  getAuthStore().set('rememberedEmail', email);
}

// ── Saved Servers (quick switcher) ────────────────────────────────────────────

export function getSavedServers(): SavedServer[] {
  return getSettingsStore().get('savedServers') || [];
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
  getSettingsStore().set('savedServers', servers);
}

export function removeSavedServer(url: string): void {
  const servers = getSavedServers().filter((s) => s.url !== url);
  getSettingsStore().set('savedServers', servers);
  // Clear favorite if the removed server was the favorite
  if (getFavoriteServerUrl() === url) {
    setFavoriteServerUrl('');
  }
}

// ── Favorite Server ──────────────────────────────────────────────────────────

export function getFavoriteServerUrl(): string {
  return getSettingsStore().get('favoriteServerUrl') || '';
}

export function setFavoriteServerUrl(url: string): void {
  getSettingsStore().set('favoriteServerUrl', url);
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
  getSettingsStore().set('savedServers', updatedServers);

  return target;
}

