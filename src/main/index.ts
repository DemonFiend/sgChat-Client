import { app, BrowserWindow, shell, session } from 'electron';
import path from 'path';
import { initTray, destroyTray } from './tray';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import { registerIpcHandlers } from './ipc';
import { restoreWindowState, trackWindowState } from './window-state';
import { getServerUrl, hasServerUrl } from './store';

let mainWindow: BrowserWindow | null = null;

function createWindow(): BrowserWindow {
  const savedState = restoreWindowState();

  const win = new BrowserWindow({
    width: savedState.width ?? 1280,
    height: savedState.height ?? 800,
    x: savedState.x,
    y: savedState.y,
    minWidth: 940,
    minHeight: 560,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#111214',
      symbolColor: '#e1e1e6',
      height: 32,
    },
    show: false,
    backgroundColor: '#1a1b1e',
    icon: path.join(__dirname, '../../resources/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  // Restore maximized state
  if (savedState.isMaximized) {
    win.maximize();
  }

  // Track window state changes for persistence
  trackWindowState(win);

  // Show when ready to avoid flash
  win.once('ready-to-show', () => {
    win.show();
  });

  // Open external links in system browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation away from the server
  win.webContents.on('will-navigate', (event, url) => {
    const serverUrl = getServerUrl();
    if (serverUrl && !url.startsWith(serverUrl)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  return win;
}

function loadApp(win: BrowserWindow): void {
  if (hasServerUrl()) {
    const serverUrl = getServerUrl();
    // Set CSP for the server
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            `default-src 'self' ${serverUrl}; ` +
            `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${serverUrl}; ` +
            `style-src 'self' 'unsafe-inline' ${serverUrl}; ` +
            `img-src 'self' data: blob: ${serverUrl} https:; ` +
            `media-src 'self' blob: ${serverUrl} https:; ` +
            `connect-src 'self' ${serverUrl} wss: ws: https:; ` +
            `font-src 'self' ${serverUrl} data:;`
          ],
        },
      });
    });

    win.loadURL(serverUrl);
  } else {
    // First run — show server configuration page
    win.loadFile(path.join(__dirname, '../../pages/setup.html'));
  }
}

// Prevent multiple instances
const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    mainWindow = createWindow();
    registerIpcHandlers(mainWindow);
    loadApp(mainWindow);
    initTray(mainWindow);
    registerShortcuts(mainWindow);
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow();
      loadApp(mainWindow);
    }
  });

  app.on('will-quit', () => {
    unregisterShortcuts();
    destroyTray();
  });
}

export { mainWindow };
