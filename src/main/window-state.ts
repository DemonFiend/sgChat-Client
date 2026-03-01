import { BrowserWindow } from 'electron';
import { getWindowState, setWindowState } from './store';

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

export function restoreWindowState(): WindowState {
  return getWindowState();
}

export function trackWindowState(win: BrowserWindow): void {
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;

  const save = () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (win.isDestroyed()) return;

      const isMaximized = win.isMaximized();

      if (!isMaximized) {
        const bounds = win.getBounds();
        setWindowState({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized: false,
        });
      } else {
        const current = getWindowState();
        setWindowState({
          ...current,
          isMaximized: true,
        });
      }
    }, 500);
  };

  win.on('resize', save);
  win.on('move', save);
  win.on('maximize', save);
  win.on('unmaximize', save);
}
