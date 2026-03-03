import { ipcMain, BrowserWindow, Notification, app, net } from 'electron';
import {
  getAutoStart, setAutoStart,
  getServerUrl, setServerUrl, hasServerUrl,
  getRememberedEmail, setRememberedEmail,
  isAuthenticated,
} from './store';
import { login, register, logout, getToken, refreshAccessToken } from './auth';
import { apiRequest, apiUpload } from './api-proxy';

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
    logout();
  });

  ipcMain.handle('auth:check', () => {
    return isAuthenticated();
  });

  ipcMain.handle('auth:getSocketToken', async () => {
    try {
      const token = getToken();
      if (!token) return { token: null };
      return { token, serverUrl: getServerUrl() };
    } catch {
      return { token: null };
    }
  });

  ipcMain.handle('auth:refreshToken', async () => {
    try {
      const token = await refreshAccessToken();
      return { success: true, token };
    } catch {
      return { success: false };
    }
  });

  // ── API Proxy ──────────────────────────────────────────────────────────
  ipcMain.handle('api:request', async (_event, method: string, path: string, body?: any) => {
    return apiRequest(method, path, body);
  });

  ipcMain.handle('api:upload', async (_event, path: string, fileBuffer: ArrayBuffer, fileName: string, mimeType: string) => {
    return apiUpload(path, Buffer.from(fileBuffer), fileName, mimeType);
  });

  // ── Window events ──────────────────────────────────────────────────────
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized', false);
  });
}
