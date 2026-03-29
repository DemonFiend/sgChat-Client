import { app, BrowserWindow, ipcMain, session, shell } from 'electron';
import path from 'path';
import { registerAppProtocol, handleAppProtocol } from './protocol';
import { initTray, destroyTray } from './tray';
import { registerShortcuts, unregisterShortcuts } from './shortcuts';
import { registerIpcHandlers } from './ipc';
import { restoreWindowState, trackWindowState } from './window-state';
import { hasServerUrl, getServerUrl, getAccessToken } from './store';
import { negotiateCryptoSession } from './crypto';
import { initAppAudioCapture, startAppAudioCapture, stopAppAudioCapture } from './app-audio-capture';
import { getEnhancedSources } from './screen-sources';
import { initDeepFilter } from './noise-suppression/deepfilterProcessor';
import { initCrashReporter } from './crash-reporter';
import { initUpdateChecker } from './update-checker';

export type AudioMode = 'none' | 'app' | 'system';

interface ScreenShareSelection {
  id: string | null;
  audioMode: AudioMode;
}

// Pending screen share selection — resolved when renderer picks a source
let pendingScreenShareResolve: ((selection: ScreenShareSelection) => void) | null = null;

// Enable remote debugging for Playwright tests (must be before app.whenReady)
if (process.env.NODE_ENV === 'test') {
  app.commandLine.appendSwitch('remote-debugging-port', '0');
}

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
      preload: path.join(__dirname, '../preload/index.cjs'),
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

// Prevent multiple instances (skip in test mode for Playwright)
const isTestMode = process.env.NODE_ENV === 'test';
const gotSingleInstanceLock = isTestMode || app.requestSingleInstanceLock();

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

    // Inject auth headers on direct HTTP requests to the server (e.g. <img src>)
    // These bypass the IPC API proxy and need the JWT token added manually
    session.defaultSession.webRequest.onBeforeSendHeaders(
      { urls: ['http://*/*', 'https://*/*'] },
      (details, callback) => {
        const serverUrl = getServerUrl();
        const token = getAccessToken();
        if (serverUrl && token && details.url.startsWith(serverUrl)) {
          details.requestHeaders['Authorization'] = `Bearer ${token}`;
        }
        callback({ requestHeaders: details.requestHeaders });
      },
    );

    // Initialize per-app audio capture (sets binary paths for packaged builds)
    initAppAudioCapture();

    // Initialize DeepFilterNet binary availability check
    initDeepFilter();

    // Screen share: renderer sends selection via IPC (now includes audio mode)
    ipcMain.on('screen-share:source-selected', (_event, payload: ScreenShareSelection) => {
      if (pendingScreenShareResolve) {
        pendingScreenShareResolve(payload);
        pendingScreenShareResolve = null;
      }
    });

    // Enable screen capture for getDisplayMedia() — required by Electron 17+
    // Shows custom picker in the renderer instead of system picker
    session.defaultSession.setDisplayMediaRequestHandler(
      async (_request, callback) => {
        try {
          const { serialized, rawSources } = await getEnhancedSources();

          if (!mainWindow || serialized.length === 0) {
            callback({});
            return;
          }

          // Send enhanced sources (including minimized windows) to renderer picker
          mainWindow.webContents.send('screen-share:show-picker', serialized);

          // Wait for the renderer to respond with a selected source + audio mode
          const selection = await new Promise<ScreenShareSelection>((resolve) => {
            pendingScreenShareResolve = resolve;
          });

          if (!selection.id) {
            callback({});
            return;
          }

          // Look up the selected source in the raw desktopCapturer results
          const selected = rawSources.find((s) => s.id === selection.id);
          if (!selected) {
            // Selected source is a minimized window (not in desktopCapturer results).
            // The server web app's Electron path uses getUserMedia directly,
            // so this callback path may not be hit for minimized windows.
            // If it IS hit (e.g. via getDisplayMedia), we can't provide a real source.
            console.warn('[screen-share] Selected minimized window not in desktopCapturer results');
            callback({});
            return;
          }

          // Notify renderer of audio mode BEFORE resolving getDisplayMedia
          // (avoids race where setScreenShareEnabled resolves before mode arrives)
          mainWindow!.webContents.send('screen-share:audio-mode-selected', selection.audioMode);

          // Handle audio mode: per-app capture, system loopback, or no audio
          switch (selection.audioMode) {
            case 'app':
              // Start per-app capture, then resolve getDisplayMedia with video-only
              startAppAudioCapture(selection.id, mainWindow!);
              callback({ video: selected });
              break;
            case 'system':
              // Full system loopback (existing behavior)
              callback({ video: selected, audio: 'loopback' });
              break;
            case 'none':
            default:
              // Video only, no audio
              callback({ video: selected });
              break;
          }
        } catch (err) {
          console.error('[screen-share] Error:', err);
          callback({});
        }
      },
    );

    // Allow media and display-capture permissions
    session.defaultSession.setPermissionRequestHandler(
      (_webContents, permission, callback) => {
        const allowed = ['media', 'display-capture', 'audioCapture', 'videoCapture'];
        callback(allowed.includes(permission));
      },
    );

    session.defaultSession.setPermissionCheckHandler(
      (_webContents, permission) => {
        const allowed = ['media', 'display-capture', 'audioCapture', 'videoCapture'];
        return allowed.includes(permission);
      },
    );

    // Negotiate crypto session if server URL is already configured
    if (hasServerUrl()) {
      negotiateCryptoSession().catch((err) => {
        console.warn('[crypto] Initial negotiation failed:', err.message);
      });
    }

    loadApp(mainWindow);
    initTray(mainWindow);
    registerShortcuts(mainWindow);
    initCrashReporter();
    initUpdateChecker(mainWindow);
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
