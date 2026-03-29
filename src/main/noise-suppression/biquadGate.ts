/**
 * Noise Gate — amplitude-based gate applied before DeepFilterNet processing.
 *
 * Silences audio below a dB threshold with smooth attack/release ramps
 * to avoid clicking artifacts. Operates on Float32 PCM frames (mono, 48kHz).
 *
 * This is NOT a biquad filter — the name references the simple two-state
 * (open/closed) gating model with envelope following.
 */

export interface GateConfig {
  /** Threshold in dBFS below which audio is gated. Default: -35 */
  thresholdDb: number;
  /** Attack time in ms — how fast the gate opens. Default: 10 */
  attackMs: number;
  /** Release time in ms — how fast the gate closes. Default: 150 */
  releaseMs: number;
}

const DEFAULT_CONFIG: GateConfig = {
  thresholdDb: -35,
  attackMs: 10,
  releaseMs: 150,
};

export class NoiseGate {
  private _config: GateConfig;
  private _envelope = 0; // Current gate envelope [0, 1]
  private _sampleRate: number;
  private _attackCoeff: number;
  private _releaseCoeff: number;

  constructor(sampleRate = 48000, config?: Partial<GateConfig>) {
    this._config = { ...DEFAULT_CONFIG, ...config };
    this._sampleRate = sampleRate;
    this._attackCoeff = this._computeCoeff(this._config.attackMs);
    this._releaseCoeff = this._computeCoeff(this._config.releaseMs);
  }

  /**
   * Process a Float32 PCM frame in-place.
   * Returns the frame (same buffer, modified) for chaining.
   */
  process(frame: Float32Array): Float32Array {
    const threshold = this._dbToLinear(this._config.thresholdDb);
    const attackCoeff = this._attackCoeff;
    const releaseCoeff = this._releaseCoeff;
    let envelope = this._envelope;

    for (let i = 0; i < frame.length; i++) {
      const absVal = Math.abs(frame[i]);

      // Envelope follower: fast attack, slow release
      if (absVal > envelope) {
        envelope = attackCoeff * envelope + (1 - attackCoeff) * absVal;
      } else {
        envelope = releaseCoeff * envelope + (1 - releaseCoeff) * absVal;
      }

      // Gate: ramp gain based on envelope vs threshold
      if (envelope < threshold) {
        // Below threshold — compute gain ramp toward 0
        const gain = envelope / threshold; // Smooth ramp [0, 1]
        frame[i] *= gain * gain; // Quadratic curve for smoother fade
      }
      // Above threshold — pass through unmodified
    }

    this._envelope = envelope;
    return frame;
  }

  /** Update gate configuration. Takes effect on next process() call. */
  setConfig(config: Partial<GateConfig>): void {
    if (config.thresholdDb !== undefined) this._config.thresholdDb = config.thresholdDb;
    if (config.attackMs !== undefined) {
      this._config.attackMs = config.attackMs;
      this._attackCoeff = this._computeCoeff(config.attackMs);
    }
    if (config.releaseMs !== undefined) {
      this._config.releaseMs = config.releaseMs;
      this._releaseCoeff = this._computeCoeff(config.releaseMs);
    }
  }

  /** Reset internal state (call on pipeline restart). */
  reset(): void {
    this._envelope = 0;
  }

  get config(): Readonly<GateConfig> {
    return this._config;
  }

  // Convert time constant in ms to single-pole IIR coefficient
  private _computeCoeff(timeMs: number): number {
    if (timeMs <= 0) return 0;
    return Math.exp(-1 / (this._sampleRate * timeMs * 0.001));
  }

  // Convert dBFS to linear amplitude
  private _dbToLinear(db: number): number {
    return Math.pow(10, db / 20);
  }
}
