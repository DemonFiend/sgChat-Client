/**
 * DeepFilterNet3 Backend — WASM-based noise suppression using deepfilternet3-noise-filter.
 *
 * Runs DeepFilterNet3 entirely in the renderer via AudioWorklet + WASM.
 * Same architecture as NSNet2 but with significantly better noise removal quality.
 * No native binary, no IPC bridge, no main process involvement.
 *
 * Architecture:
 *   getUserMedia → AudioContext(48kHz) → source → DeepFilterNet3 WorkletNode → destination → cleanStream
 */

import { DeepFilterNet3Core } from 'deepfilternet3-noise-filter';
import type { NsBackend } from './noiseSuppressionService';

// Local asset path — WASM + model bundled in public/, no external CDN fetch
const LOCAL_ASSET_BASE = import.meta.env.DEV
  ? '/deepfilter'
  : './deepfilter';

export class DeepFilterBackend implements NsBackend {
  readonly name = 'deepfilter';

  private _core: DeepFilterNet3Core | null = null;
  private _context: AudioContext | null = null;
  private _workletNode: AudioWorkletNode | null = null;
  private _source: MediaStreamAudioSourceNode | null = null;
  private _destination: MediaStreamAudioDestinationNode | null = null;

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
    aggressiveness: number,
  ): Promise<MediaStream> {
    // Initialize DeepFilterNet3 core (loads WASM + model from local bundled assets)
    this._core = new DeepFilterNet3Core({
      sampleRate: 48000,
      noiseReductionLevel: Math.round(aggressiveness * 100),
      assetConfig: { cdnUrl: LOCAL_ASSET_BASE },
    });
    await this._core.initialize();

    // Create audio context at 48kHz (DeepFilterNet native rate)
    this._context = new AudioContext({ sampleRate: 48000 });

    // Create the DeepFilterNet3 AudioWorklet node (WASM runs inside worklet)
    this._workletNode = await this._core.createAudioWorkletNode(this._context);

    // Build the Web Audio graph
    this._source = this._context.createMediaStreamSource(rawStream);
    this._destination = this._context.createMediaStreamDestination();

    this._source.connect(this._workletNode);
    this._workletNode.connect(this._destination);

    console.log('[DeepFilter] Outbound pipeline started (WASM)');
    return this._destination.stream;
  }

  setAggressiveness(value: number): void {
    // Map 0.0-1.0 to 0-100 suppression level
    this._core?.setSuppressionLevel(Math.round(value * 100));
  }

  async destroy(): Promise<void> {
    if (this._core) {
      this._core.destroy();
      this._core = null;
    }
    if (this._workletNode) {
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
    console.log('[DeepFilter] Pipeline destroyed');
  }
}
