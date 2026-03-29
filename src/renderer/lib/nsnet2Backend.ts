/**
 * NSNet2 Backend — WASM-based noise suppression using @sapphi-red/web-noise-suppressor.
 *
 * Uses RNNoise with SIMD support running entirely inside the AudioWorklet thread.
 * This eliminates the postMessage round-trip latency of the old @jitsi/rnnoise-wasm
 * approach, yielding lower latency and better CPU efficiency.
 *
 * Architecture:
 *   getUserMedia → AudioContext(48kHz) → source → RnnoiseWorkletNode → destination → cleanStream
 */

import {
  RnnoiseWorkletNode,
  loadRnnoise,
} from '@sapphi-red/web-noise-suppressor';

import type { NsBackend } from './noiseSuppressionService';

const WASM_URL = import.meta.env.DEV
  ? '/rnnoise-simd-ns.wasm'
  : './rnnoise-simd-ns.wasm';
const WASM_SIMD_URL = import.meta.env.DEV
  ? '/rnnoise-simd-ns_simd.wasm'
  : './rnnoise-simd-ns_simd.wasm';
const WORKLET_URL = import.meta.env.DEV
  ? '/worklets/rnnoise-ns-worklet-processor.js'
  : './worklets/rnnoise-ns-worklet-processor.js';

export class NSNet2Backend implements NsBackend {
  readonly name = 'nsnet2';

  private _context: AudioContext | null = null;
  private _workletNode: RnnoiseWorkletNode | null = null;
  private _source: MediaStreamAudioSourceNode | null = null;
  private _destination: MediaStreamAudioDestinationNode | null = null;
  private _wasmBinary: ArrayBuffer | null = null;
  private _loading = false;

  checkCapabilities(): { supported: boolean; reason?: string } {
    if (typeof AudioContext === 'undefined') {
      return { supported: false, reason: 'AudioContext not supported' };
    }
    const ctx = new AudioContext();
    const hasWorklet = typeof ctx.audioWorklet !== 'undefined';
    ctx.close();
    if (!hasWorklet) {
      return { supported: false, reason: 'AudioWorklet not supported' };
    }
    if (typeof WebAssembly === 'undefined') {
      return { supported: false, reason: 'WebAssembly not supported' };
    }
    return { supported: true };
  }

  async createOutboundPipeline(
    rawStream: MediaStream,
    _aggressiveness: number,
  ): Promise<MediaStream> {
    // Load WASM binary if not already cached
    if (!this._wasmBinary && !this._loading) {
      this._loading = true;
      try {
        console.log('[NSNet2] Loading WASM binary...');
        this._wasmBinary = await loadRnnoise({ url: WASM_URL, simdUrl: WASM_SIMD_URL });
        console.log('[NSNet2] WASM loaded');
      } finally {
        this._loading = false;
      }
    }
    if (!this._wasmBinary) throw new Error('NSNet2 WASM binary not available');

    // Create audio context at 48kHz (RNNoise native rate)
    this._context = new AudioContext({ sampleRate: 48000 });

    // Register the worklet processor
    await this._context.audioWorklet.addModule(WORKLET_URL);

    // Build the Web Audio graph
    this._source = this._context.createMediaStreamSource(rawStream);
    this._workletNode = new RnnoiseWorkletNode(this._context, {
      maxChannels: 1,
      wasmBinary: this._wasmBinary,
    });
    this._destination = this._context.createMediaStreamDestination();

    this._source.connect(this._workletNode);
    this._workletNode.connect(this._destination);

    console.log('[NSNet2] Outbound pipeline started');
    return this._destination.stream;
  }

  setAggressiveness(_value: number): void {
    // RNNoise does not support aggressiveness tuning.
    // The slider is a no-op for this backend; DeepFilter uses it.
  }

  async destroy(): Promise<void> {
    if (this._workletNode) {
      this._workletNode.destroy();
      this._workletNode.disconnect();
      this._workletNode = null;
    }
    if (this._source) {
      this._source.disconnect();
      this._source = null;
    }
    if (this._destination) {
      this._destination.disconnect();
      this._destination = null;
    }
    if (this._context) {
      await this._context.close();
      this._context = null;
    }
    console.log('[NSNet2] Pipeline destroyed');
  }
}
