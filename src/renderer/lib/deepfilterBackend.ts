/**
 * DeepFilterNet Backend — renderer-side orchestrator for DeepFilterNet mode.
 *
 * Captures mic audio via AudioWorklet, sends PCM to main process via IPC,
 * receives cleaned PCM back, and reconstructs a MediaStreamTrack for LiveKit.
 *
 * Architecture:
 *   getUserMedia → mic-capture-worklet → IPC → Main (DeepFilter binary) → IPC
 *   → mic-playback-worklet → MediaStreamDestination → cleanTrack → LiveKit
 */

import type { NsBackend, NoiseSuppressionService } from './noiseSuppressionService';

const CAPTURE_WORKLET_URL = import.meta.env.DEV
  ? '/worklets/mic-capture-worklet-processor.js'
  : './worklets/mic-capture-worklet-processor.js';
const PLAYBACK_WORKLET_URL = import.meta.env.DEV
  ? '/worklets/mic-playback-worklet-processor.js'
  : './worklets/mic-playback-worklet-processor.js';

export class DeepFilterBackend implements NsBackend {
  readonly name = 'deepfilter';

  private _service: NoiseSuppressionService;
  private _context: AudioContext | null = null;
  private _captureNode: AudioWorkletNode | null = null;
  private _playbackNode: AudioWorkletNode | null = null;
  private _source: MediaStreamAudioSourceNode | null = null;
  private _destination: MediaStreamAudioDestinationNode | null = null;
  private _unsubProcessed: (() => void) | null = null;
  private _unsubFallback: (() => void) | null = null;

  constructor(service: NoiseSuppressionService) {
    this._service = service;
  }

  checkCapabilities(): { supported: boolean; reason?: string } {
    const api = (window as any).electronAPI;
    if (!api?.micNs) {
      return { supported: false, reason: 'Electron micNs API not available' };
    }
    // Actual binary availability is async — checked separately in UI
    return { supported: true };
  }

  async checkAvailability(): Promise<boolean> {
    const api = (window as any).electronAPI;
    if (!api?.micNs?.isAvailable) return false;
    return api.micNs.isAvailable();
  }

  async createOutboundPipeline(
    rawStream: MediaStream,
    aggressiveness: number,
  ): Promise<MediaStream> {
    const api = (window as any).electronAPI;
    if (!api?.micNs) throw new Error('Electron micNs API not available');

    // 1. Start DeepFilterNet in main process
    const started = await api.micNs.start(aggressiveness);
    if (!started) throw new Error('DeepFilterNet binary not available');

    // 2. Create audio context at 48kHz
    this._context = new AudioContext({ sampleRate: 48000 });

    // 3. Register both worklets
    await Promise.all([
      this._context.audioWorklet.addModule(CAPTURE_WORKLET_URL),
      this._context.audioWorklet.addModule(PLAYBACK_WORKLET_URL),
    ]);

    // 4. Build capture side: source → capture-worklet (extracts PCM, sends to main)
    this._source = this._context.createMediaStreamSource(rawStream);
    this._captureNode = new AudioWorkletNode(this._context, 'mic-capture-processor');

    this._captureNode.port.onmessage = (e) => {
      if (e.data.type === 'pcm-frame') {
        // Forward PCM frame to main process via IPC
        api.micNs.sendPcm(e.data.buffer);
      }
    };

    this._source.connect(this._captureNode);
    // Capture worklet outputs silence — connect to avoid garbage collection
    this._captureNode.connect(this._context.destination);

    // 5. Build playback side: receives cleaned PCM → output → MediaStreamDestination
    this._playbackNode = new AudioWorkletNode(this._context, 'mic-playback-processor', {
      outputChannelCount: [1],
    });
    this._destination = this._context.createMediaStreamDestination();
    this._playbackNode.connect(this._destination);

    // 6. Listen for processed PCM from main process
    this._unsubProcessed = api.micNs.onProcessedPcm((data: Buffer) => {
      if (!this._playbackNode) return;
      // Convert Buffer to ArrayBuffer for transfer to worklet
      const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      this._playbackNode.port.postMessage({ type: 'pcm-data', buffer: ab }, [ab]);
    });

    // 7. Listen for fallback signal (DeepFilter crashed too many times)
    this._unsubFallback = api.micNs.onFallback(() => {
      console.warn('[DeepFilter] Fallback signal received — switching to NSNet2');
      this._service.handleFallback();
    });

    console.log('[DeepFilter] Outbound pipeline started');
    return this._destination.stream;
  }

  setAggressiveness(value: number): void {
    const api = (window as any).electronAPI;
    api?.micNs?.setAggressiveness(value);
  }

  async destroy(): Promise<void> {
    const api = (window as any).electronAPI;

    // Unsubscribe IPC listeners
    this._unsubProcessed?.();
    this._unsubProcessed = null;
    this._unsubFallback?.();
    this._unsubFallback = null;

    // Stop DeepFilterNet in main process
    try { await api?.micNs?.stop(); } catch { /* ignore */ }

    // Tear down audio graph
    if (this._captureNode) {
      this._captureNode.port.postMessage({ type: 'set-enabled', enabled: false });
      this._captureNode.disconnect();
      this._captureNode = null;
    }
    if (this._playbackNode) {
      this._playbackNode.port.postMessage({ type: 'stop' });
      this._playbackNode.disconnect();
      this._playbackNode = null;
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
