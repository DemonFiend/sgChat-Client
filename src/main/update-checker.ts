import { app, BrowserWindow, ipcMain } from 'electron';
import { net } from 'electron';
import { getServerUrl } from './store';
import Store from 'electron-store';

interface ReleaseInfo {
  id: string;
  version: string;
  platform: string;
  download_url: string;
  changelog: string | null;
  required: boolean;
  published_at: string;
}

// Lazy init — electron-store needs app to be ready for userData path resolution
let _updateStore: Store<{ dismissedVersion: string }> | null = null;
function getUpdateStore(): Store<{ dismissedVersion: string }> {
  if (!_updateStore) {
    _updateStore = new Store<{ dismissedVersion: string }>({
      name: 'updates',
      defaults: { dismissedVersion: '' },
    });
  }
  return _updateStore;
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

export async function checkForUpdates(mainWindow: BrowserWindow): Promise<void> {
  const serverUrl = getServerUrl();
  if (!serverUrl) return;

  try {
    const res = await net.fetch(`${serverUrl}/api/releases/latest?platform=windows`, {
      method: 'GET',
    });

    if (!res.ok) return;

    const release: ReleaseInfo = await res.json();
    const currentVersion = app.getVersion();

    if (compareVersions(release.version, currentVersion) <= 0) return;

    // Skip if user already dismissed this version (unless required)
    if (!release.required && getUpdateStore().get('dismissedVersion') === release.version) return;

    mainWindow.webContents.send('update:available', release);
  } catch {
    // Server unreachable — silently ignore
  }
}

export function initUpdateChecker(mainWindow: BrowserWindow): void {
  // Check on startup (delayed to let app settle)
  setTimeout(() => checkForUpdates(mainWindow), 5000);

  // IPC handler to dismiss an optional update
  ipcMain.handle('update:dismiss', (_event, version: string) => {
    getUpdateStore().set('dismissedVersion', version);
  });

  // IPC handler to open download URL
  ipcMain.handle('update:download', (_event, url: string) => {
    const { shell } = require('electron');
    shell.openExternal(url);
  });
}
