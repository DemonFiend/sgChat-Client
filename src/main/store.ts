import Store from 'electron-store';

interface StoreSchema {
  serverUrl: string;
  autoStart: boolean;
  windowState: {
    x?: number;
    y?: number;
    width: number;
    height: number;
    isMaximized: boolean;
  };
}

const store = new Store<StoreSchema>({
  defaults: {
    serverUrl: '',
    autoStart: false,
    windowState: {
      width: 1280,
      height: 800,
      isMaximized: false,
    },
  },
});

export function getServerUrl(): string {
  return store.get('serverUrl');
}

export function setServerUrl(url: string): void {
  // Normalize: remove trailing slash
  const normalized = url.replace(/\/+$/, '');
  store.set('serverUrl', normalized);
}

export function hasServerUrl(): boolean {
  const url = store.get('serverUrl');
  return typeof url === 'string' && url.length > 0;
}

export function getAutoStart(): boolean {
  return store.get('autoStart');
}

export function setAutoStart(enabled: boolean): void {
  store.set('autoStart', enabled);
}

export function getWindowState(): StoreSchema['windowState'] {
  return store.get('windowState');
}

export function setWindowState(state: StoreSchema['windowState']): void {
  store.set('windowState', state);
}

export { store };
