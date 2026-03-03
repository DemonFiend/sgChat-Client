import { app, BrowserWindow, shell } from 'electron';
import path from 'path';
import { registerAppProtocol, handleAppProtocol } from './protocol';
import { initTray, destroyTray } from './tray';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import { registerIpcHandlers } from './ipc';
import { restoreWindowState, trackWindowState } from './window-state';

// Register custom protocol BEFORE app is ready
registerAppProtocol();

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

  // Prevent navigation away from the app
  win.webContents.on('will-navigate', (event, url) => {
    const devServerUrl = process.env.VITE_DEV_SERVER_URL;
    const isAllowed =
      url.startsWith('app://') ||
      (devServerUrl && url.startsWith(devServerUrl));
    if (!isAllowed) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  return win;
}

function loadApp(win: BrowserWindow): void {
  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    win.loadURL(devServerUrl);
  } else {
    win.loadURL('app://renderer/index.html');
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
    handleAppProtocol();
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
