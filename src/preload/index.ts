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

  // Saved servers (quick switcher)
  servers: {
    getSaved: () => ipcRenderer.invoke('servers:getSaved'),
    save: (server: any) => ipcRenderer.invoke('servers:save', server),
    remove: (url: string) => ipcRenderer.invoke('servers:remove', url),
    switch: (targetUrl: string) => ipcRenderer.invoke('servers:switch', targetUrl),
    saveCurrentSession: () => ipcRenderer.invoke('servers:saveCurrentSession'),
  },

  // Auth
  auth: {
    login: (serverUrl: string, email: string, password: string) =>
      ipcRenderer.invoke('auth:login', serverUrl, email, password),
    register: (serverUrl: string, username: string, email: string, password: string, inviteCode?: string) =>
      ipcRenderer.invoke('auth:register', serverUrl, username, email, password, inviteCode),
    logout: () => ipcRenderer.invoke('auth:logout'),
    hashPassword: (password: string) => ipcRenderer.invoke('auth:hashPassword', password) as Promise<string>,
    check: () => ipcRenderer.invoke('auth:check'),
    getSocketToken: () => ipcRenderer.invoke('auth:getSocketToken'),
    refreshToken: () => ipcRenderer.invoke('auth:refreshToken'),
  },

  // API proxy
  api: {
    request: (method: string, path: string, body?: any) =>
      ipcRenderer.invoke('api:request', method, path, body),
    upload: (path: string, fileBuffer: ArrayBuffer, fileName: string, mimeType: string, extraFields?: Record<string, string>) =>
      ipcRenderer.invoke('api:upload', path, fileBuffer, fileName, mimeType, extraFields),
  },

  // Screen share
  screenShare: {
    getSources: () => ipcRenderer.invoke('screen-share:getSources'),
    onPickRequest: (callback: (sources: any[]) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, sources: any[]) => callback(sources);
      ipcRenderer.on('screen-share:show-picker', handler);
      return () => ipcRenderer.removeListener('screen-share:show-picker', handler);
    },
    selectSource: (id: string | null, audioMode: 'none' | 'app' | 'system' = 'none') =>
      ipcRenderer.send('screen-share:source-selected', { id, audioMode }),
    onAudioModeSelected: (callback: (mode: 'none' | 'app' | 'system') => void) => {
      const handler = (_event: Electron.IpcRendererEvent, mode: 'none' | 'app' | 'system') => callback(mode);
      ipcRenderer.on('screen-share:audio-mode-selected', handler);
      return () => ipcRenderer.removeListener('screen-share:audio-mode-selected', handler);
    },
  },

  // Per-app audio capture
  appAudio: {
    onPcmData: (callback: (data: Buffer) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: Buffer) => callback(data);
      ipcRenderer.on('app-audio:pcm-data', handler);
      return () => ipcRenderer.removeListener('app-audio:pcm-data', handler);
    },
    onSourceLost: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('app-audio:source-lost', handler);
      return () => ipcRenderer.removeListener('app-audio:source-lost', handler);
    },
    stop: () => ipcRenderer.invoke('app-audio:stop'),
    isSupported: () => ipcRenderer.invoke('app-audio:isSupported'),
  },

  // Clipboard
  clipboard: {
    writeText: (text: string) => ipcRenderer.invoke('clipboard:writeText', text),
  },

  // Crash reporting
  crashReport: {
    submit: (report: { error_type: string; error_message: string; stack_trace: string; metadata?: Record<string, unknown> }) =>
      ipcRenderer.invoke('crash-report:submit', report),
  },

  // Update checker
  updates: {
    onUpdateAvailable: (callback: (release: any) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, release: any) => callback(release);
      ipcRenderer.on('update:available', handler);
      return () => ipcRenderer.removeListener('update:available', handler);
    },
    dismiss: (version: string) => ipcRenderer.invoke('update:dismiss', version),
    download: (url: string) => ipcRenderer.invoke('update:download', url),
  },

  // Shortcuts (dynamic keybind registration)
  shortcuts: {
    update: (keybinds: Record<string, string>) => ipcRenderer.invoke('shortcuts:update', keybinds),
    set: (action: string, combo: string) => ipcRenderer.invoke('shortcuts:set', action, combo),
  },

  // Crypto (payload encryption)
  crypto: {
    negotiate: () => ipcRenderer.invoke('crypto:negotiate'),
    getKeyMaterial: () => ipcRenderer.invoke('crypto:getKeyMaterial'),
    getSessionInfo: () => ipcRenderer.invoke('crypto:getSessionInfo'),
    isActive: () => ipcRenderer.invoke('crypto:isActive'),
    clear: () => ipcRenderer.invoke('crypto:clear'),
    onSessionRefreshed: (callback: (data: { sessionId: string; key: string }) => void) => {
      const handler = (_event: Electron.IpcRendererEvent, data: any) => callback(data);
      ipcRenderer.on('crypto:sessionRefreshed', handler);
      return () => ipcRenderer.removeListener('crypto:sessionRefreshed', handler);
    },
  },
});
