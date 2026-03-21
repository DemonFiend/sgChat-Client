import { desktopCapturer } from 'electron';
import { execFile } from 'child_process';

export interface SerializedSource {
  id: string;
  name: string;
  thumbnail: string;
  appIcon: string | null;
  display_id: string;
  isMinimized: boolean;
}

/** 320×180 dark SVG placeholder with "Minimized" label (cached). */
let _placeholderCache: string | null = null;
function getMinimizedPlaceholder(): string {
  if (_placeholderCache) return _placeholderCache;
  _placeholderCache =
    'data:image/svg+xml,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">' +
        '<rect width="320" height="180" fill="#1a1a2e"/>' +
        '<text x="160" y="96" text-anchor="middle" fill="#666" font-size="14" font-family="sans-serif">Minimized</text>' +
        '</svg>',
    );
  return _placeholderCache;
}

interface NativeWindow {
  pid: number;
  hwnd: string;
  title: string;
  isMinimized: boolean;
}

/**
 * Use PowerShell + Win32 IsIconic to enumerate ALL top-level windows
 * including minimized ones. Returns only minimized windows with titles.
 */
function enumerateMinimizedWindows(): Promise<NativeWindow[]> {
  if (process.platform !== 'win32') return Promise.resolve([]);

  return new Promise((resolve) => {
    const script = [
      'Add-Type @"',
      'using System;',
      'using System.Runtime.InteropServices;',
      'public class Win32WE {',
      '    [DllImport("user32.dll")]',
      '    public static extern bool IsIconic(IntPtr hWnd);',
      '}',
      '"@',
      "Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $_.MainWindowTitle -ne '' } |",
      '  Where-Object { [Win32WE]::IsIconic($_.MainWindowHandle) } |',
      '  ForEach-Object {',
      '    [PSCustomObject]@{',
      '      pid = $_.Id',
      "      hwnd = $_.MainWindowHandle.ToInt64().ToString()",
      '      title = $_.MainWindowTitle',
      '      isMinimized = $true',
      '    }',
      '  } | ConvertTo-Json -Compress',
    ].join('\n');

    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 3000, windowsHide: true },
      (err, stdout) => {
        if (err) {
          console.warn('[screen-sources] PowerShell enumeration failed:', err.message);
          resolve([]);
          return;
        }
        const trimmed = stdout.trim();
        if (!trimmed) {
          resolve([]);
          return;
        }
        try {
          const parsed = JSON.parse(trimmed);
          // PowerShell returns a single object (not array) when only one result
          resolve(Array.isArray(parsed) ? parsed : [parsed]);
        } catch {
          resolve([]);
        }
      },
    );
  });
}

/**
 * Enumerate all screen/window sources, supplementing Electron's desktopCapturer
 * with native window enumeration on Windows so minimized apps are included.
 *
 * Returns both the serialized list (for the renderer) and raw desktopCapturer
 * sources (needed by setDisplayMediaRequestHandler callback).
 */
export async function getEnhancedSources(): Promise<{
  serialized: SerializedSource[];
  rawSources: Electron.DesktopCapturerSource[];
}> {
  // Run desktopCapturer and PowerShell in parallel for speed
  const [rawSources, minimizedWindows] = await Promise.all([
    desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true,
    }),
    enumerateMinimizedWindows(),
  ]);

  // Serialize visible sources from desktopCapturer
  const serialized: SerializedSource[] = rawSources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
    appIcon: s.appIcon?.toDataURL() || null,
    display_id: s.display_id,
    isMinimized: false,
  }));

  // Merge minimized windows that desktopCapturer missed
  if (minimizedWindows.length > 0) {
    // Build set of HWNDs already in desktopCapturer results
    const existingHwnds = new Set<string>();
    for (const s of rawSources) {
      const m = s.id.match(/^window:(\d+):/);
      if (m) existingHwnds.add(m[1]);
    }

    const placeholder = getMinimizedPlaceholder();

    for (const win of minimizedWindows) {
      if (existingHwnds.has(win.hwnd)) continue; // already listed

      serialized.push({
        id: `window:${win.hwnd}:0`,
        name: win.title,
        thumbnail: placeholder,
        appIcon: null,
        display_id: '',
        isMinimized: true,
      });
    }
  }

  return { serialized, rawSources };
}
