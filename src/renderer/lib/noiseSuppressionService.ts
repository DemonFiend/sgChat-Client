/**
 * AI Noise Suppression Service
 *
 * Client-side noise suppression using RNNoise (Recurrent Neural Network for
 * noise suppression) via the @jitsi/rnnoise-wasm Emscripten module. Processes
 * audio entirely on-device — no audio data leaves the user's machine.
 *
 * Architecture:
 *   Outbound: Mic MediaStream → AudioWorklet (buffer 480) → Main thread RNNoise → clean MediaStream
 *   Inbound:  Remote audio element → AudioWorklet (buffer 480) → Main thread RNNoise → clean output
 *
 * RNNoise operates natively at 48kHz with 480-sample frames (10ms), so no
 * resampling is needed — the AudioContext sample rate matches directly.
 */

import type { RnnoiseModule } from '@jitsi/rnnoise-wasm';

const RNNOISE_FRAME = 480;
const BYTES_PER_FLOAT32 = 4;
const MAX_INBOUND_PIPELINES = 8;

export type CpuLevel = 'low' | 'moderate' | 'high';

interface Pipeline {
  context: AudioContext;
  workletNode: AudioWorkletNode;
  source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode;
  destination?: MediaStreamAudioDestinationNode;
}

interface RnnoiseInstance {
  state: number;
  inputPtr: number;
  outputPtr: number;
}

class NoiseSuppressionService {
  private _supported: boolean | null = null;
  private _unsupportedReason: string | null = null;
  private _rnnoiseModule: RnnoiseModule | null = null;
  private _ready = false;
  private _loading = false;
  private _loadTimeMs = 0;

  // Outbound pipeline (local mic)
  private _outboundPipeline: Pipeline | null = null;
  private _outboundInstance: RnnoiseInstance | null = null;

  // Inbound pipelines (remote participants)
  private _inboundPipelines: Map<string, Pipeline> = new Map();
  private _inboundInstances: Map<string, RnnoiseInstance> = new Map();

  // CPU monitoring
  private _cpuLevel: CpuLevel = 'low';
  private _cpuListeners: Set<(level: CpuLevel) => void> = new Set();

  /**
   * Check whether the current environment supports AI noise suppression.
   */
  checkCapabilities(): { supported: boolean; reason?: string } {
    if (this._supported !== null) {
      return { supported: this._supported, reason: this._unsupportedReason || undefined };
    }

    // Check AudioWorklet support
    if (typeof AudioContext === 'undefined' && typeof (window as any).webkitAudioContext === 'undefined') {
      this._supported = false;
      this._unsupportedReason = 'AudioContext is not supported in this browser';
      return { supported: false, reason: this._unsupportedReason };
    }

    const ctx = new AudioContext();
    const hasWorklet = typeof ctx.audioWorklet !== 'undefined';
    ctx.close();

    if (!hasWorklet) {
      this._supported = false;
      this._unsupportedReason = 'AudioWorklet is not supported in this browser';
      return { supported: false, reason: this._unsupportedReason };
    }

    // Check WebAssembly support
    if (typeof WebAssembly === 'undefined') {
      this._supported = false;
      this._unsupportedReason = 'WebAssembly is not supported in this browser';
      return { supported: false, reason: this._unsupportedReason };
    }

    this._supported = true;
    return { supported: true };
  }

  /**
   * Lazily load the RNNoise WASM module.
   */
  async loadModel(): Promise<void> {
    if (this._ready || this._loading) return;
    this._loading = true;

    const LOAD_TIMEOUT_MS = 10_000;
    const t0 = performance.now();
    try {
      console.log('[NoiseSuppressionService] Loading RNNoise model...');

      const { createRNNWasmModule } = await import('@jitsi/rnnoise-wasm');

      this._rnnoiseModule = await Promise.race([
        createRNNWasmModule(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('RNNoise WASM load timed out after 10s')), LOAD_TIMEOUT_MS),
        ),
      ]);

      this._rnnoiseModule._rnnoise_init();
      this._ready = true;

      this._loadTimeMs = performance.now() - t0;
      console.log(`[NoiseSuppressionService] RNNoise loaded in ${this._loadTimeMs.toFixed(0)}ms`);

      // Run a quick benchmark for device performance detection
      await this._benchmarkDevice();
    } catch (err) {
      console.error('[NoiseSuppressionService] Failed to load RNNoise:', err);
      this._ready = false;
      throw err;
    } finally {
      this._loading = false;
    }
  }

  /**
   * Run a single inference to estimate device performance.
   */
  private async _benchmarkDevice(): Promise<void> {
    if (!this._rnnoiseModule) return;

    const instance = this._createInstance();
    const silence = new Float32Array(RNNOISE_FRAME);

    const t0 = performance.now();
    this._processFrameSync(silence, instance);
    const elapsed = performance.now() - t0;

    this._destroyInstance(instance);

    console.log(`[NoiseSuppressionService] Benchmark: single inference = ${elapsed.toFixed(1)}ms`);
    if (elapsed > 5) {
      console.warn('[NoiseSuppressionService] Device may struggle with AI noise suppression');
    }
  }

  /**
   * Process an outbound microphone track through RNNoise.
   * Returns a new MediaStreamTrack with noise-suppressed audio.
   */
  async processOutboundTrack(rawStream: MediaStream): Promise<MediaStream> {
    if (!this._ready || !this._rnnoiseModule) {
      await this.loadModel();
    }
    if (!this._rnnoiseModule) throw new Error('RNNoise model not available');

    // Clean up any existing outbound pipeline
    if (this._outboundPipeline) {
      this._destroyPipeline(this._outboundPipeline, this._outboundInstance);
      this._outboundInstance = null;
    }

    const context = new AudioContext({ sampleRate: 48000 });

    // Register the worklet processor
    const workletPath = import.meta.env.DEV
      ? '/worklets/rnnoise-worklet-processor.js'
      : './worklets/rnnoise-worklet-processor.js';
    await context.audioWorklet.addModule(workletPath);

    // Create the RNNoise instance for outbound
    this._outboundInstance = this._createInstance();

    // Build the Web Audio graph
    const source = context.createMediaStreamSource(rawStream);
    const workletNode = new AudioWorkletNode(context, 'rnnoise-worklet-processor');
    const destination = context.createMediaStreamDestination();

    // Handle frames from the worklet
    workletNode.port.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'frame') {
        this._processFrame(msg.samples, workletNode, this._outboundInstance);
      } else if (msg.type === 'cpu-timing') {
        this._updateCpuLevel(msg.avgMs);
      }
    };

    // Connect: source → worklet → destination
    source.connect(workletNode);
    workletNode.connect(destination);

    this._outboundPipeline = { context, workletNode, source, destination };

    console.log('[NoiseSuppressionService] Outbound pipeline started');
    return destination.stream;
  }

  /**
   * Process an inbound remote participant's audio through RNNoise.
   */
  async processInboundTrack(
    participantIdentity: string,
    audioElement: HTMLAudioElement,
  ): Promise<void> {
    if (!this._ready || !this._rnnoiseModule) return;

    // Respect the cap
    if (this._inboundPipelines.size >= MAX_INBOUND_PIPELINES) {
      console.log(`[NoiseSuppressionService] Inbound pipeline cap reached (${MAX_INBOUND_PIPELINES}), skipping:`, participantIdentity);
      return;
    }

    // Clean up existing pipeline for this participant if any
    this.removeInboundTrack(participantIdentity);

    const context = new AudioContext({ sampleRate: 48000 });

    const workletPath = import.meta.env.DEV
      ? '/worklets/rnnoise-worklet-processor.js'
      : './worklets/rnnoise-worklet-processor.js';
    await context.audioWorklet.addModule(workletPath);

    const instance = this._createInstance();
    const source = context.createMediaElementSource(audioElement);
    const workletNode = new AudioWorkletNode(context, 'rnnoise-worklet-processor');

    workletNode.port.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'frame') {
        this._processFrame(msg.samples, workletNode, instance);
      }
    };

    // Connect: source → worklet → speakers
    source.connect(workletNode);
    workletNode.connect(context.destination);

    this._inboundPipelines.set(participantIdentity, { context, workletNode, source });
    this._inboundInstances.set(participantIdentity, instance);

    console.log('[NoiseSuppressionService] Inbound pipeline started for:', participantIdentity);
  }

  /**
   * Remove an inbound pipeline for a disconnected participant.
   */
  removeInboundTrack(participantIdentity: string): void {
    const pipeline = this._inboundPipelines.get(participantIdentity);
    const instance = this._inboundInstances.get(participantIdentity);
    if (pipeline) {
      this._destroyPipeline(pipeline, instance || null);
      this._inboundPipelines.delete(participantIdentity);
      this._inboundInstances.delete(participantIdentity);
      console.log('[NoiseSuppressionService] Inbound pipeline stopped for:', participantIdentity);
    }
  }

  /**
   * Tear down all pipelines. Call on voice disconnect.
   */
  async destroy(): Promise<void> {
    // Destroy outbound
    if (this._outboundPipeline) {
      this._destroyPipeline(this._outboundPipeline, this._outboundInstance);
      this._outboundPipeline = null;
      this._outboundInstance = null;
    }

    // Destroy all inbound
    for (const [identity, pipeline] of this._inboundPipelines) {
      const instance = this._inboundInstances.get(identity);
      this._destroyPipeline(pipeline, instance || null);
    }
    this._inboundPipelines.clear();
    this._inboundInstances.clear();

    this._cpuLevel = 'low';
    console.log('[NoiseSuppressionService] All pipelines torn down');
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private _createInstance(): RnnoiseInstance {
    const mod = this._rnnoiseModule!;
    const state = mod._rnnoise_create();
    const inputPtr = mod._malloc(RNNOISE_FRAME * BYTES_PER_FLOAT32);
    const outputPtr = mod._malloc(RNNOISE_FRAME * BYTES_PER_FLOAT32);
    return { state, inputPtr, outputPtr };
  }

  private _destroyInstance(instance: RnnoiseInstance): void {
    if (!this._rnnoiseModule) return;
    try {
      this._rnnoiseModule._rnnoise_destroy(instance.state);
      this._rnnoiseModule._free(instance.inputPtr);
      this._rnnoiseModule._free(instance.outputPtr);
    } catch {
      // Ignore cleanup errors
    }
  }

  /**
   * Process a single frame: scale float→int16, run RNNoise, scale back, send to worklet.
   */
  private _processFrame(
    samples: Float32Array,
    workletNode: AudioWorkletNode,
    instance: RnnoiseInstance | null,
  ): void {
    if (!this._rnnoiseModule || !instance) return;

    const output = this._processFrameSync(samples, instance);

    // Send processed samples back to worklet
    workletNode.port.postMessage(
      { type: 'processed', samples: output },
    );
  }

  /**
   * Synchronous RNNoise inference on a single 480-sample frame.
   * Handles float↔int16 scaling (RNNoise expects int16 range).
   */
  private _processFrameSync(samples: Float32Array, instance: RnnoiseInstance): Float32Array {
    const mod = this._rnnoiseModule!;
    const { state, inputPtr, outputPtr } = instance;

    // Create fresh views over HEAPF32 (buffer can detach if WASM memory grows)
    const inputOffset = inputPtr / BYTES_PER_FLOAT32;
    const outputOffset = outputPtr / BYTES_PER_FLOAT32;
    const inputHeap = mod.HEAPF32.subarray(inputOffset, inputOffset + RNNOISE_FRAME);
    const outputHeap = mod.HEAPF32.subarray(outputOffset, outputOffset + RNNOISE_FRAME);

    // Scale from Web Audio float [-1, 1] to int16 range [-32768, 32767]
    for (let i = 0; i < RNNOISE_FRAME; i++) {
      inputHeap[i] = samples[i] * 32768;
    }

    // RNNoise inference (synchronous) — returns VAD probability [0, 1]
    mod._rnnoise_process_frame(state, outputPtr, inputPtr);

    // Scale back to Web Audio float range
    const output = new Float32Array(RNNOISE_FRAME);
    for (let i = 0; i < RNNOISE_FRAME; i++) {
      output[i] = outputHeap[i] / 32768;
    }

    return output;
  }

  private _destroyPipeline(pipeline: Pipeline, instance: RnnoiseInstance | null): void {
    try {
      pipeline.workletNode.port.postMessage({ type: 'set-enabled', enabled: false });
      pipeline.workletNode.disconnect();
      pipeline.source.disconnect();
      pipeline.destination?.disconnect();
      pipeline.context.close();
    } catch {
      // Ignore errors during cleanup
    }
    if (instance) {
      this._destroyInstance(instance);
    }
  }

  private _updateCpuLevel(avgMs: number): void {
    // RNNoise frame = 480 samples at 48kHz = 10ms
    const blockDurationMs = (RNNOISE_FRAME / 48000) * 1000; // 10ms
    const utilization = avgMs / blockDurationMs;

    let level: CpuLevel;
    if (utilization < 0.3) level = 'low';
    else if (utilization < 0.6) level = 'moderate';
    else level = 'high';

    if (level !== this._cpuLevel) {
      this._cpuLevel = level;
      console.log(`[NoiseSuppressionService] CPU usage level: ${level}`);
      this._cpuListeners.forEach((fn) => fn(level));
    }
  }

  // ─── Public getters ──────────────────────────────────────────────────────────

  get isReady(): boolean {
    return this._ready;
  }

  get isLoading(): boolean {
    return this._loading;
  }

  get cpuLevel(): CpuLevel {
    return this._cpuLevel;
  }

  get loadTimeMs(): number {
    return this._loadTimeMs;
  }

  get activeInboundCount(): number {
    return this._inboundPipelines.size;
  }

  onCpuLevelChange(fn: (level: CpuLevel) => void): () => void {
    this._cpuListeners.add(fn);
    return () => this._cpuListeners.delete(fn);
  }
}

// Singleton export
export const noiseSuppressionService = new NoiseSuppressionService();
