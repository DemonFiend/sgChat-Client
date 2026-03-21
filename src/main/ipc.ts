import { ipcMain, BrowserWindow, Notification, app, net, clipboard } from 'electron';
import {
  getAutoStart, setAutoStart,
  getServerUrl, setServerUrl, hasServerUrl,
  getRememberedEmail, setRememberedEmail,
  isAuthenticated,
  getSavedServers, saveServer, removeSavedServer, switchToServer,
  getAccessToken, getRefreshToken, getUserId,
  type SavedServer,
} from './store';
import { login, register, logout, getToken, refreshAccessToken, hashPassword } from './auth';
import { apiRequest, apiUpload } from './api-proxy';
import {
  negotiateCryptoSession, clearCryptoSession,
  getKeyMaterial, getSessionInfo, getSessionId,
  hasActiveSession,
} from './crypto';
import { stopAppAudioCapture, isAppAudioSupported } from './app-audio-capture';
import { getEnhancedSources } from './screen-sources';

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // ── Window controls ────────────────────────────────────────────────────
  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow.isMaximized();
  });

  // ── Notifications ──────────────────────────────────────────────────────
  ipcMain.handle('notification:show', (_event, title: string, body: string) => {
    new Notification({ title, body }).show();
  });

  ipcMain.handle('window:flashFrame', (_event, flag: boolean) => {
    mainWindow.flashFrame(flag);
  });

  // ── Auto-start ─────────────────────────────────────────────────────────
  ipcMain.handle('autostart:get', () => {
    return getAutoStart();
  });

  ipcMain.handle('autostart:set', (_event, enabled: boolean) => {
    setAutoStart(enabled);
    app.setLoginItemSettings({ openAtLogin: enabled });
  });

  // ── Server config ──────────────────────────────────────────────────────
  ipcMain.handle('config:getServerUrl', () => {
    return getServerUrl();
  });

  ipcMain.handle('config:setServerUrl', (_event, url: string) => {
    clearCryptoSession(); // Crypto session is tied to specific server
    setServerUrl(url);
  });

  ipcMain.handle('config:hasServerUrl', () => {
    return hasServerUrl();
  });

  ipcMain.handle('config:getRememberedEmail', () => {
    return getRememberedEmail();
  });

  ipcMain.handle('config:setRememberedEmail', (_event, email: string) => {
    setRememberedEmail(email);
  });

  ipcMain.handle('config:healthCheck', async (_event, url: string) => {
    try {
      const res = await net.fetch(`${url}/health`);
      if (!res.ok) return { ok: false, error: `Server returned ${res.status}` };
      const data = await res.json();
      if (!data.name && !data.status) return { ok: false, error: 'Not a valid sgChat server' };
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Could not reach server' };
    }
  });

  // ── Saved Servers (quick switcher) ────────────────────────────────────
  ipcMain.handle('servers:getSaved', () => {
    return getSavedServers();
  });

  ipcMain.handle('servers:save', (_event, server: Omit<SavedServer, 'lastUsed'>) => {
    saveServer(server);
  });

  ipcMain.handle('servers:remove', (_event, url: string) => {
    removeSavedServer(url);
  });

  ipcMain.handle('servers:switch', (_event, targetUrl: string) => {
    clearCryptoSession();
    const result = switchToServer(targetUrl);
    return result;
  });

  ipcMain.handle('servers:saveCurrentSession', () => {
    const url = getServerUrl();
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    const userId = getUserId();
    const email = getRememberedEmail();
    if (url && accessToken) {
      const existing = getSavedServers().find((s) => s.url === url);
      saveServer({
        url,
        name: existing?.name || url,
        email,
        accessToken,
        refreshToken,
        userId,
      });
    }
  });

  // ── Auth ───────────────────────────────────────────────────────────────
  ipcMain.handle('auth:login', async (_event, serverUrl: string, email: string, password: string) => {
    setServerUrl(serverUrl);
    return login(serverUrl, email, password);
  });

  ipcMain.handle('auth:register', async (_event, serverUrl: string, username: string, email: string, password: string) => {
    setServerUrl(serverUrl);
    return register(serverUrl, username, email, password);
  });

  ipcMain.handle('auth:logout', () => {
    clearCryptoSession();
    logout();
  });

  ipcMain.handle('auth:check', () => {
    return isAuthenticated();
  });

  ipcMain.handle('auth:getSocketToken', async () => {
    try {
      const token = getToken();
      if (!token) return { token: null };
      return {
        token,
        serverUrl: getServerUrl(),
        cryptoSessionId: getSessionId(),
      };
    } catch {
      return { token: null };
    }
  });

  ipcMain.handle('auth:hashPassword', (_event, password: string) => {
    return hashPassword(password);
  });

  ipcMain.handle('auth:refreshToken', async () => {
    try {
      const token = await refreshAccessToken();
      return { success: true, token };
    } catch {
      return { success: false };
    }
  });

  // ── Crypto (payload encryption) ────────────────────────────────────────
  ipcMain.handle('crypto:negotiate', async () => {
    try {
      const session = await negotiateCryptoSession();
      if (!session) return { ok: false, supported: false };
      return { ok: true, supported: true, sessionId: session.sessionId };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('crypto:getKeyMaterial', () => {
    return getKeyMaterial();
  });

  ipcMain.handle('crypto:getSessionInfo', () => {
    return getSessionInfo();
  });

  ipcMain.handle('crypto:isActive', () => {
    return hasActiveSession();
  });

  ipcMain.handle('crypto:clear', () => {
    clearCryptoSession();
  });

  // ── API Proxy ──────────────────────────────────────────────────────────
  ipcMain.handle('api:request', async (_event, method: string, path: string, body?: any) => {
    return apiRequest(method, path, body);
  });

  ipcMain.handle('api:upload', async (_event, path: string, fileBuffer: ArrayBuffer, fileName: string, mimeType: string, extraFields?: Record<string, string>) => {
    return apiUpload(path, Buffer.from(fileBuffer), fileName, mimeType, extraFields);
  });

  // ── Screen share ──────────────────────────────────────────────────────
  ipcMain.handle('screen-share:getSources', async () => {
    try {
      const { serialized } = await getEnhancedSources();
      return serialized;
    } catch (err) {
      console.error('[ipc] Failed to get screen sources:', err);
      return [];
    }
  });

  // ── Per-app audio capture ─────────────────────────────────────────────
  ipcMain.handle('app-audio:stop', async () => {
    await stopAppAudioCapture();
  });

  ipcMain.handle('app-audio:isSupported', () => {
    return isAppAudioSupported();
  });

  // ── Clipboard ────────────────────────────────────────────────────────
  ipcMain.handle('clipboard:writeText', (_event, text: string) => {
    clipboard.writeText(text);
  });

  // ── Window events ──────────────────────────────────────────────────────
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized', false);
  });
}
