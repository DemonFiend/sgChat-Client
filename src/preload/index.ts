import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Identity
  isElectron: true,
  platform: process.platform,

  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),

  // Window events
  onMaximizedChange: (callback: (maximized: boolean) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, maximized: boolean) => callback(maximized);
    ipcRenderer.on('window:maximized', handler);
    return () => ipcRenderer.removeListener('window:maximized', handler);
  },

  // Notifications
  showNotification: (title: string, body: string) =>
    ipcRenderer.invoke('notification:show', title, body),
  flashFrame: (flag: boolean) =>
    ipcRenderer.invoke('window:flashFrame', flag),

  // Global shortcuts
  onGlobalShortcut: (callback: (action: string) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, action: string) => callback(action);
    ipcRenderer.on('global-shortcut', handler);
    return () => ipcRenderer.removeListener('global-shortcut', handler);
  },

  // Server connection
  getServerUrl: () => ipcRenderer.invoke('server:getUrl'),
  setServerUrl: (url: string) => ipcRenderer.invoke('server:setUrl', url),
  connectToServer: (url: string) => ipcRenderer.invoke('server:connect', url),

  // Auto-start
  getAutoStart: () => ipcRenderer.invoke('autostart:get'),
  setAutoStart: (enabled: boolean) => ipcRenderer.invoke('autostart:set', enabled),
});
