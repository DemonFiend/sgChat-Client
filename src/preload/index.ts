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

  // Auto-start
  getAutoStart: () => ipcRenderer.invoke('autostart:get'),
  setAutoStart: (enabled: boolean) => ipcRenderer.invoke('autostart:set', enabled),

  // Server config
  config: {
    getServerUrl: () => ipcRenderer.invoke('config:getServerUrl'),
    setServerUrl: (url: string) => ipcRenderer.invoke('config:setServerUrl', url),
    hasServerUrl: () => ipcRenderer.invoke('config:hasServerUrl'),
    healthCheck: (url: string) => ipcRenderer.invoke('config:healthCheck', url),
    getRememberedEmail: () => ipcRenderer.invoke('config:getRememberedEmail'),
    setRememberedEmail: (email: string) => ipcRenderer.invoke('config:setRememberedEmail', email),
  },

  // Auth
  auth: {
    login: (serverUrl: string, email: string, password: string) =>
      ipcRenderer.invoke('auth:login', serverUrl, email, password),
    register: (serverUrl: string, username: string, email: string, password: string) =>
      ipcRenderer.invoke('auth:register', serverUrl, username, email, password),
    logout: () => ipcRenderer.invoke('auth:logout'),
    check: () => ipcRenderer.invoke('auth:check'),
    getSocketToken: () => ipcRenderer.invoke('auth:getSocketToken'),
    refreshToken: () => ipcRenderer.invoke('auth:refreshToken'),
  },

  // API proxy
  api: {
    request: (method: string, path: string, body?: any) =>
      ipcRenderer.invoke('api:request', method, path, body),
    upload: (path: string, fileBuffer: ArrayBuffer, fileName: string, mimeType: string) =>
      ipcRenderer.invoke('api:upload', path, fileBuffer, fileName, mimeType),
  },
});
