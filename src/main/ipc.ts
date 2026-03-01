import { ipcMain, BrowserWindow, Notification, app } from 'electron';
import { getServerUrl, setServerUrl, getAutoStart, setAutoStart } from './store';

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Window controls
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

  // Notifications
  ipcMain.handle('notification:show', (_event, title: string, body: string) => {
    new Notification({ title, body }).show();
  });

  ipcMain.handle('window:flashFrame', (_event, flag: boolean) => {
    mainWindow.flashFrame(flag);
  });

  // Server URL
  ipcMain.handle('server:getUrl', () => {
    return getServerUrl();
  });

  ipcMain.handle('server:setUrl', (_event, url: string) => {
    setServerUrl(url);
  });

  // Auto-start
  ipcMain.handle('autostart:get', () => {
    return getAutoStart();
  });

  ipcMain.handle('autostart:set', (_event, enabled: boolean) => {
    setAutoStart(enabled);
    app.setLoginItemSettings({ openAtLogin: enabled });
  });

  // Navigate to server after setup
  ipcMain.handle('server:connect', (_event, url: string) => {
    setServerUrl(url);
    mainWindow.loadURL(url);
  });

  // Listen for maximize/unmaximize to notify renderer
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window:maximized', true);
  });

  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window:maximized', false);
  });
}
