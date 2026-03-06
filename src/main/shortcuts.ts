import { globalShortcut, BrowserWindow, ipcMain } from 'electron';

/** Map from action name → currently registered accelerator */
const registeredShortcuts = new Map<string, string>();

/** Map from server-style combo to Electron accelerator, e.g. "Ctrl+Shift+M" → "CommandOrControl+Shift+M" */
function toElectronAccelerator(combo: string): string {
  return combo
    .replace(/Ctrl/g, 'CommandOrControl')
    .replace(/Meta/g, 'Super');
}

/** Map from action name (server keybind key) → global-shortcut action string sent to renderer */
const ACTION_MAP: Record<string, string> = {
  toggle_mute: 'toggle-mute',
  toggle_deafen: 'toggle-deafen',
  push_to_talk: 'push-to-talk',
  toggle_screen_share: 'toggle-screen-share',
  disconnect_voice: 'disconnect-voice',
  open_settings: 'open-settings',
};

let mainWindowRef: BrowserWindow | null = null;

function registerSingleShortcut(action: string, combo: string): boolean {
  if (!mainWindowRef || !combo) return false;

  const rendererAction = ACTION_MAP[action];
  if (!rendererAction) return false;

  // Unregister old shortcut for this action
  const old = registeredShortcuts.get(action);
  if (old) {
    try { globalShortcut.unregister(old); } catch { /* already unregistered */ }
    registeredShortcuts.delete(action);
  }

  const accelerator = toElectronAccelerator(combo);
  try {
    const ok = globalShortcut.register(accelerator, () => {
      mainWindowRef?.webContents.send('global-shortcut', rendererAction);
    });
    if (ok) {
      registeredShortcuts.set(action, accelerator);
    }
    return ok;
  } catch {
    return false;
  }
}

/**
 * Register default shortcuts on startup.
 * Also sets up IPC handler for dynamic keybind updates from renderer.
 */
export function registerShortcuts(mainWindow: BrowserWindow): void {
  mainWindowRef = mainWindow;

  // Defaults
  registerSingleShortcut('toggle_mute', 'Ctrl+Shift+M');
  registerSingleShortcut('toggle_deafen', 'Ctrl+Shift+D');

  // IPC: renderer sends updated keybinds after fetching from server
  ipcMain.handle('shortcuts:update', (_event, keybinds: Record<string, string>) => {
    for (const [action, combo] of Object.entries(keybinds)) {
      if (ACTION_MAP[action]) {
        registerSingleShortcut(action, combo);
      }
    }
  });

  // IPC: update a single shortcut
  ipcMain.handle('shortcuts:set', (_event, action: string, combo: string) => {
    return registerSingleShortcut(action, combo);
  });
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
  registeredShortcuts.clear();
  mainWindowRef = null;
}
