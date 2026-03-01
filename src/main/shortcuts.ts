import { globalShortcut, BrowserWindow } from 'electron';

export function registerShortcuts(mainWindow: BrowserWindow): void {
  // Toggle mute
  globalShortcut.register('CommandOrControl+Shift+M', () => {
    mainWindow.webContents.send('global-shortcut', 'toggle-mute');
  });

  // Toggle deafen
  globalShortcut.register('CommandOrControl+Shift+D', () => {
    mainWindow.webContents.send('global-shortcut', 'toggle-deafen');
  });
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
}
