import path from 'path';
import { app, type BrowserWindow } from 'electron';

// application-loopback is externalized — require at runtime
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  startAudioCapture,
  stopAudioCapture,
  getActiveWindowProcessIds,
  setExecutablesRoot,
  getLoopbackBinaryPath,
} = require('application-loopback');

// WASAPI default mix format on Windows: 32-bit float, stereo = 8 bytes per frame
const BYTES_PER_FRAME = 8;
// Send ~10ms of audio per IPC message (48000 * 0.01 * 8 = 3840 bytes)
const SEND_THRESHOLD = 3840;

interface CaptureSession {
  pid: string;
  isActive: boolean;
  watchdog: ReturnType<typeof setInterval> | null;
}

let activeSession: CaptureSession | null = null;

/**
 * Initialize executables root for packaged builds.
 * In ASAR-packed apps, the native binaries are unpacked to a separate directory.
 */
export function initAppAudioCapture(): void {
  if (app.isPackaged) {
    const unpackedBinDir = path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'node_modules',
      'application-loopback',
      'bin',
    );
    setExecutablesRoot(unpackedBinDir);
  }

  // Verify binary is accessible
  try {
    const binPath = getLoopbackBinaryPath();
    console.log('[app-audio] Binary path:', binPath);
  } catch (err) {
    console.warn('[app-audio] Could not resolve binary path:', err);
  }
}

/**
 * Resolve a desktopCapturer source ID (e.g. "window:12345:0") to a process ID.
 * Extracts the HWND from the source ID, then looks it up via getActiveWindowProcessIds().
 */
export async function resolveSourceToPid(sourceId: string): Promise<string | null> {
  const match = sourceId.match(/^window:(\d+):\d+$/);
  if (!match) return null; // Screen sources have no per-app PID

  const targetHwnd = match[1];

  try {
    const windows = await getActiveWindowProcessIds();
    const found = windows.find((w: { hwnd: string }) => w.hwnd === targetHwnd);
    return found?.processId ?? null;
  } catch (err) {
    console.error('[app-audio] Failed to enumerate windows:', err);
    return null;
  }
}

/**
 * Start capturing audio from the process that owns the given window.
 * Streams PCM data to the renderer via IPC events.
 */
export async function startAppAudioCapture(
  sourceId: string,
  mainWindow: BrowserWindow,
): Promise<{ success: boolean; error?: string }> {
  // Stop any existing capture first
  await stopAppAudioCapture();

  const pid = await resolveSourceToPid(sourceId);
  if (!pid) {
    return { success: false, error: 'Could not resolve window to process ID' };
  }

  try {
    let lastDataTimestamp = Date.now();

    // Buffer for accumulating stdout data into frame-aligned chunks.
    // Node.js stdout 'data' events can split mid-sample; we must only
    // send complete frames (8 bytes each for float32 stereo).
    let pending = Buffer.alloc(0);

    startAudioCapture(pid, {
      onData: (chunk: Uint8Array) => {
        if (!activeSession?.isActive) return;
        lastDataTimestamp = Date.now();

        // Accumulate into the pending buffer
        pending = Buffer.concat([pending, chunk]);

        // Send frame-aligned chunks once we have enough data
        while (pending.length >= SEND_THRESHOLD) {
          const aligned = pending.length - (pending.length % BYTES_PER_FRAME);
          const toSend = pending.subarray(0, aligned);
          pending = Buffer.from(pending.subarray(aligned));
          mainWindow.webContents.send('app-audio:pcm-data', toSend);
        }
      },
    });

    // Watchdog: detect when the target app stops producing audio (likely closed)
    const watchdog = setInterval(() => {
      if (Date.now() - lastDataTimestamp > 5000) {
        console.log('[app-audio] No data for 5s — source may have closed');
        mainWindow.webContents.send('app-audio:source-lost');
        stopAppAudioCapture();
      }
    }, 2000);

    activeSession = { pid, isActive: true, watchdog };
    console.log(`[app-audio] Started capture for PID ${pid} (source: ${sourceId})`);
    return { success: true };
  } catch (err: any) {
    console.error('[app-audio] Failed to start capture:', err);
    return { success: false, error: err.message || 'Failed to start audio capture' };
  }
}

/**
 * Stop the current capture session and clean up.
 */
export async function stopAppAudioCapture(): Promise<void> {
  if (!activeSession) return;

  const { pid, watchdog } = activeSession;
  activeSession.isActive = false;

  if (watchdog) clearInterval(watchdog);

  try {
    stopAudioCapture(pid);
    console.log(`[app-audio] Stopped capture for PID ${pid}`);
  } catch {
    // Process may have already exited
  }

  activeSession = null;
}

export function isCapturing(): boolean {
  return activeSession !== null && activeSession.isActive;
}

export function isAppAudioSupported(): boolean {
  return process.platform === 'win32';
}
