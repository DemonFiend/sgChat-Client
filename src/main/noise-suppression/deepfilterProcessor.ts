/**
 * DeepFilterNet Processor — main process handler for the DeepFilterNet DFN3 binary.
 *
 * Spawns the DeepFilterNet binary as a child process, piping Float32 mono PCM
 * at 48kHz through stdin/stdout. Includes SHA256 checksum verification, crash
 * recovery with exponential backoff, and dB level reporting.
 *
 * Audio flow:
 *   Renderer IPC 'mic-ns:pcm-outbound' → biquadGate → DeepFilterNet stdin
 *   DeepFilterNet stdout → frame-align → IPC 'mic-ns:pcm-inbound' → Renderer
 */

import { spawn, type ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { type BrowserWindow, ipcMain, app } from 'electron';
import { NoiseGate } from './biquadGate';

// PCM format: mono float32 48kHz, 480 samples per 10ms frame
const BYTES_PER_SAMPLE = 4;
const FRAME_SAMPLES = 480;
const FRAME_BYTES = FRAME_SAMPLES * BYTES_PER_SAMPLE;

const MAX_RESTARTS = 3;
const LEVEL_REPORT_INTERVAL_MS = 33; // ~30fps

// Expected SHA256 of the DeepFilterNet binary (update on each version bump)
const EXPECTED_SHA256 = ''; // TODO: fill when binary is obtained

let deepFilterProcess: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;
let restartCount = 0;
let isActive = false;
let currentAggressiveness = 0.5;
let pendingStdout = Buffer.alloc(0);
let lastLevelReportTime = 0;

const noiseGate = new NoiseGate(48000);

// ── Binary resolution ────────────────────────────────────────────────────────

function getBinaryPath(): string {
  const binaryName = process.platform === 'win32' ? 'deepfilter.exe' : 'deepfilter';
  // In packaged app: resources/deepfilter/
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'deepfilter', binaryName);
  }
  // In development: resources/deepfilter/ relative to project root
  return path.join(app.getAppPath(), 'resources', 'deepfilter', binaryName);
}

/**
 * Initialize DeepFilter — resolve binary path and verify availability.
 * Call on app.whenReady().
 */
export function initDeepFilter(): void {
  const binPath = getBinaryPath();
  const available = fs.existsSync(binPath);
  console.log(`[deepfilter] Binary path: ${binPath}, available: ${available}`);
}

/**
 * Check if the DeepFilterNet binary exists and passes checksum verification.
 */
export function isDeepFilterAvailable(): boolean {
  const binPath = getBinaryPath();
  if (!fs.existsSync(binPath)) return false;

  // Skip checksum verification if hash not yet configured
  if (!EXPECTED_SHA256) return true;

  try {
    const binary = fs.readFileSync(binPath);
    const hash = crypto.createHash('sha256').update(binary).digest('hex');
    if (hash !== EXPECTED_SHA256) {
      console.warn(`[deepfilter] Checksum mismatch: expected ${EXPECTED_SHA256}, got ${hash}`);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ── dB level computation ─────────────────────────────────────────────────────

function computeDbLevel(pcm: Float32Array): number {
  let sumSq = 0;
  for (let i = 0; i < pcm.length; i++) {
    sumSq += pcm[i] * pcm[i];
  }
  const rms = Math.sqrt(sumSq / pcm.length);
  if (rms < 1e-10) return -100;
  return 20 * Math.log10(rms);
}

function reportLevels(inputDb: number, outputDb: number): void {
  const now = Date.now();
  if (now - lastLevelReportTime < LEVEL_REPORT_INTERVAL_MS) return;
  lastLevelReportTime = now;
  mainWindow?.webContents.send('mic-ns:level-update', { inputDb, outputDb });
}

// ── Process lifecycle ────────────────────────────────────────────────────────

function spawnDeepFilter(): void {
  const binPath = getBinaryPath();
  if (!fs.existsSync(binPath)) {
    console.error('[deepfilter] Binary not found:', binPath);
    mainWindow?.webContents.send('mic-ns:fallback');
    return;
  }

  // DeepFilterNet DFN3 CLI expects: --atten-lim <dB> for aggressiveness
  // Map 0.0-1.0 aggressiveness to 10-100 dB attenuation limit
  const attenLimit = Math.round(10 + currentAggressiveness * 90);

  deepFilterProcess = spawn(binPath, [
    '--atten-lim', String(attenLimit),
    '-', // stdin/stdout mode
  ], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  console.log(`[deepfilter] Spawned PID ${deepFilterProcess.pid}, atten-lim=${attenLimit}`);

  // Handle stdout — cleaned PCM frames
  deepFilterProcess.stdout!.on('data', (chunk: Buffer) => {
    if (!isActive || !mainWindow) return;

    pendingStdout = Buffer.concat([pendingStdout, chunk]);

    // Frame-align and send complete frames
    while (pendingStdout.length >= FRAME_BYTES) {
      const frame = pendingStdout.subarray(0, FRAME_BYTES);
      pendingStdout = Buffer.from(pendingStdout.subarray(FRAME_BYTES));

      // Compute output dB for level reporting
      const outputPcm = new Float32Array(frame.buffer, frame.byteOffset, FRAME_SAMPLES);
      const outputDb = computeDbLevel(outputPcm);
      // inputDb was computed when we received the inbound chunk (stored in lastInputDb)
      reportLevels(lastInputDb, outputDb);

      mainWindow.webContents.send('mic-ns:pcm-inbound', frame);
    }
  });

  deepFilterProcess.stderr!.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) console.warn('[deepfilter] stderr:', msg);
  });

  deepFilterProcess.on('exit', (code) => {
    console.log(`[deepfilter] Process exited with code ${code}`);
    deepFilterProcess = null;

    if (!isActive) return; // Normal shutdown

    // Crash recovery
    restartCount++;
    if (restartCount <= MAX_RESTARTS) {
      const backoffMs = Math.min(1000 * Math.pow(2, restartCount - 1), 5000);
      console.warn(`[deepfilter] Crash #${restartCount}/${MAX_RESTARTS}, restarting in ${backoffMs}ms...`);
      setTimeout(() => {
        if (isActive) spawnDeepFilter();
      }, backoffMs);
    } else {
      console.error('[deepfilter] Max restarts exceeded, falling back to NSNet2');
      isActive = false;
      mainWindow?.webContents.send('mic-ns:fallback');
    }
  });
}

let lastInputDb = -100;

function handleIncomingPcm(_event: Electron.IpcMainEvent, data: Buffer): void {
  if (!isActive || !deepFilterProcess?.stdin?.writable) return;

  // Convert to Float32Array for gate processing + level computation
  const pcm = new Float32Array(
    data.buffer,
    data.byteOffset,
    data.byteLength / BYTES_PER_SAMPLE,
  );

  lastInputDb = computeDbLevel(pcm);

  // Apply noise gate before DeepFilterNet
  noiseGate.process(pcm);

  // Pipe gated PCM to DeepFilterNet stdin
  deepFilterProcess.stdin.write(Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength));
}

// ── Public API ───────────────────────────────────────────────────────────────

export function startDeepFilter(win: BrowserWindow, aggressiveness: number): boolean {
  if (isActive) stopDeepFilter();

  if (!isDeepFilterAvailable()) {
    console.warn('[deepfilter] Binary not available');
    return false;
  }

  mainWindow = win;
  currentAggressiveness = Math.max(0, Math.min(1, aggressiveness));
  isActive = true;
  restartCount = 0;
  pendingStdout = Buffer.alloc(0);
  lastInputDb = -100;
  noiseGate.reset();

  ipcMain.on('mic-ns:pcm-outbound', handleIncomingPcm);
  spawnDeepFilter();
  return true;
}

export function stopDeepFilter(): void {
  isActive = false;
  ipcMain.removeListener('mic-ns:pcm-outbound', handleIncomingPcm);

  if (deepFilterProcess) {
    deepFilterProcess.stdin?.end();
    deepFilterProcess.kill();
    deepFilterProcess = null;
  }

  pendingStdout = Buffer.alloc(0);
  console.log('[deepfilter] Stopped');
}

export function setDeepFilterAggressiveness(value: number): void {
  currentAggressiveness = Math.max(0, Math.min(1, value));
  // Restart process to apply new attenuation limit
  if (isActive && deepFilterProcess) {
    console.log(`[deepfilter] Updating aggressiveness to ${value}, restarting process...`);
    deepFilterProcess.stdin?.end();
    deepFilterProcess.kill();
    // The exit handler will restart with the new aggressiveness
    // (restartCount is not incremented for intentional restarts)
    restartCount = -1; // Will be incremented to 0 by exit handler
  }
}
