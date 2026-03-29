/**
 * Noise Suppression Service — multi-backend orchestrator.
 *
 * Manages the active noise suppression pipeline, delegating to the appropriate
 * backend based on the selected mode:
 *   - off:        no AI processing (browser/OS native)
 *   - nsnet2:     WASM RNNoise with SIMD in AudioWorklet (renderer-side)
 *   - deepfilter: DeepFilterNet DFN3 native binary via IPC (main process)
 *
 * Replaces the old RNNoise-specific singleton with a backend-agnostic facade.
 */

import type { NoiseCancellationMode } from '../types/noiseSuppression';

export type CpuLevel = 'low' | 'moderate' | 'high';

export interface NsBackend {
  readonly name: string;
  checkCapabilities(): { supported: boolean; reason?: string };
  createOutboundPipeline(rawStream: MediaStream, aggressiveness: number): Promise<MediaStream>;
  setAggressiveness(value: number): void;
  destroy(): Promise<void>;
}

export class NoiseSuppressionService {
  private _activeBackend: NsBackend | null = null;
  private _activeMode: NoiseCancellationMode = 'off';
  private _nsnet2Backend: NsBackend | null = null;
  private _deepfilterBackend: NsBackend | null = null;

  // CPU monitoring (preserved from old service for UI indicator)
  private _cpuLevel: CpuLevel = 'low';
  private _cpuListeners: Set<(level: CpuLevel) => void> = new Set();

  // Fallback handling (DeepFilter → NSNet2 on crash)
  private _fallbackListeners: Set<() => void> = new Set();

  /**
   * Check capabilities for a specific mode.
   */
  checkCapabilities(mode: NoiseCancellationMode): { supported: boolean; reason?: string } {
    if (mode === 'off') return { supported: true };
    const backend = this._getBackend(mode);
    return backend.checkCapabilities();
  }

  /**
   * Process an outbound mic track through the selected noise suppression backend.
   * Returns a clean MediaStream suitable for LiveKit publishing.
   */
  async processOutboundTrack(
    rawStream: MediaStream,
    mode: NoiseCancellationMode,
    aggressiveness: number,
  ): Promise<MediaStream> {
    // Tear down any active pipeline
    await this.destroy();

    if (mode === 'off') return rawStream;

    const backend = this._getBackend(mode);
    this._activeBackend = backend;
    this._activeMode = mode;

    const cleanStream = await backend.createOutboundPipeline(rawStream, aggressiveness);
    console.log(`[NoiseSuppressionService] Active mode: ${mode}`);
    return cleanStream;
  }

  /**
   * Update aggressiveness on the active backend (live, no restart).
   */
  setAggressiveness(value: number): void {
    this._activeBackend?.setAggressiveness(value);
  }

  /**
   * Tear down all active pipelines. Call on voice disconnect.
   */
  async destroy(): Promise<void> {
    if (this._activeBackend) {
      await this._activeBackend.destroy();
      this._activeBackend = null;
      this._activeMode = 'off';
    }
    this._cpuLevel = 'low';
  }

  /**
   * Called by deepfilterBackend when crash recovery exhausts retries.
   * Notifies voice service to switch to NSNet2.
   */
  handleFallback(): void {
    this._fallbackListeners.forEach((fn) => fn());
  }

  onFallback(fn: () => void): () => void {
    this._fallbackListeners.add(fn);
    return () => this._fallbackListeners.delete(fn);
  }

  get activeMode(): NoiseCancellationMode {
    return this._activeMode;
  }

  get cpuLevel(): CpuLevel {
    return this._cpuLevel;
  }

  onCpuLevelChange(fn: (level: CpuLevel) => void): () => void {
    this._cpuListeners.add(fn);
    return () => this._cpuListeners.delete(fn);
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  private _getBackend(mode: NoiseCancellationMode): NsBackend {
    if (mode === 'nsnet2') {
      if (!this._nsnet2Backend) {
        const { NSNet2Backend } = require('./nsnet2Backend');
        this._nsnet2Backend = new NSNet2Backend();
      }
      return this._nsnet2Backend!;
    }
    if (mode === 'deepfilter') {
      if (!this._deepfilterBackend) {
        const { DeepFilterBackend } = require('./deepfilterBackend');
        this._deepfilterBackend = new DeepFilterBackend(this);
      }
      return this._deepfilterBackend!;
    }
    throw new Error(`Unknown NS mode: ${mode}`);
  }
}

// Singleton export
export const noiseSuppressionService = new NoiseSuppressionService();
