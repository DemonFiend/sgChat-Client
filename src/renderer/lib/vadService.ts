/**
 * Silero VAD Service — voice activity detection using @ricky0123/vad-web.
 *
 * Replaces the crude WebRTC VAD with Silero's ONNX-based model for far more
 * accurate speech detection. Runs entirely in the renderer via AudioWorklet.
 *
 * Independent of the noise suppression pipeline — can run alongside any mode.
 */

import { MicVAD, type RealTimeVADOptions } from '@ricky0123/vad-web';

const ONNX_MODEL_URL = import.meta.env.DEV
  ? '/vad/silero_vad_v5.onnx'
  : './vad/silero_vad_v5.onnx';
const WORKLET_URL = import.meta.env.DEV
  ? '/vad/vad.worklet.bundle.min.js'
  : './vad/vad.worklet.bundle.min.js';

type SpeechCallback = () => void;

class VadService {
  private _vad: MicVAD | null = null;
  private _speechStartCallbacks: Set<SpeechCallback> = new Set();
  private _speechEndCallbacks: Set<SpeechCallback> = new Set();
  private _active = false;

  /**
   * Initialize Silero VAD on the given media stream.
   * Call this when joining a voice channel with VAD enabled.
   */
  async init(stream: MediaStream): Promise<void> {
    if (this._vad) await this.destroy();

    try {
      this._vad = await MicVAD.new({
        stream,
        modelURL: ONNX_MODEL_URL,
        workletURL: WORKLET_URL,
        positiveSpeechThreshold: 0.8,
        negativeSpeechThreshold: 0.35,
        minSpeechFrames: 3,
        preSpeechPadFrames: 3,
        redemptionFrames: 8,
        onSpeechStart: () => {
          this._speechStartCallbacks.forEach((cb) => cb());
        },
        onSpeechEnd: () => {
          this._speechEndCallbacks.forEach((cb) => cb());
        },
      } as Partial<RealTimeVADOptions> as any);

      this._vad.start();
      this._active = true;
      console.log('[VADService] Silero VAD initialized and started');
    } catch (err) {
      console.error('[VADService] Failed to initialize Silero VAD:', err);
      this._vad = null;
      throw err;
    }
  }

  /**
   * Register a callback for when speech starts.
   * Returns an unsubscribe function.
   */
  onSpeechStart(callback: SpeechCallback): () => void {
    this._speechStartCallbacks.add(callback);
    return () => this._speechStartCallbacks.delete(callback);
  }

  /**
   * Register a callback for when speech ends.
   * Returns an unsubscribe function.
   */
  onSpeechEnd(callback: SpeechCallback): () => void {
    this._speechEndCallbacks.add(callback);
    return () => this._speechEndCallbacks.delete(callback);
  }

  /**
   * Tear down the VAD instance. Call on voice disconnect.
   */
  async destroy(): Promise<void> {
    if (this._vad) {
      this._vad.pause();
      this._vad.destroy();
      this._vad = null;
    }
    this._active = false;
    console.log('[VADService] Destroyed');
  }

  get isActive(): boolean {
    return this._active;
  }
}

export const vadService = new VadService();
