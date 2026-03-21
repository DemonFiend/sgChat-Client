/**
 * RNNoise AudioWorklet Processor
 *
 * Buffers audio frames and relays them to/from the main thread for RNNoise
 * inference. The actual WASM processing happens on the main thread.
 *
 * Protocol:
 *   Main → Worklet:  { type: 'processed', samples: Float32Array }
 *                     { type: 'set-enabled', enabled: boolean }
 *   Worklet → Main:  { type: 'frame', samples: Float32Array }
 *
 * Architecture:
 *   Mic (48kHz, 128/frame) → [buffer 480 samples] → postMessage to main
 *   Main thread: RNNoise inference (480 samples at 48kHz, no resampling)
 *   Worklet: double-buffer output, drain 128 samples per process() call
 */

const RNNOISE_FRAME = 480;

class RnnoiseWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    this._enabled = true;

    // Input accumulation buffer
    this._inputBuffer = new Float32Array(RNNOISE_FRAME);
    this._inputPos = 0;

    // Double-buffered output: one being drained, one being filled
    this._outputA = new Float32Array(RNNOISE_FRAME);
    this._outputB = new Float32Array(RNNOISE_FRAME);
    this._activeOutput = this._outputA;
    this._outputPos = 0;
    this._hasOutput = false;

    this.port.onmessage = (e) => {
      const msg = e.data;
      if (msg.type === 'processed') {
        // Swap buffers: the one we were draining becomes the fill target
        if (this._activeOutput === this._outputA) {
          this._outputB.set(msg.samples);
          this._activeOutput = this._outputB;
        } else {
          this._outputA.set(msg.samples);
          this._activeOutput = this._outputA;
        }
        this._outputPos = 0;
        this._hasOutput = true;
      } else if (msg.type === 'set-enabled') {
        this._enabled = msg.enabled;
        if (!msg.enabled) {
          this._hasOutput = false;
          this._inputPos = 0;
        }
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];
    if (!input?.[0] || !output?.[0]) return true;

    const inData = input[0];
    const outData = output[0];
    const len = inData.length;

    // If disabled, passthrough
    if (!this._enabled) {
      outData.set(inData);
      return true;
    }

    // Accumulate input samples
    const remaining = RNNOISE_FRAME - this._inputPos;
    const toCopy = Math.min(len, remaining);
    this._inputBuffer.set(inData.subarray(0, toCopy), this._inputPos);
    this._inputPos += toCopy;

    // When we have a full block, send it to main thread for RNNoise processing
    if (this._inputPos >= RNNOISE_FRAME) {
      this.port.postMessage(
        { type: 'frame', samples: this._inputBuffer.slice() },
      );
      this._inputPos = 0;

      // Handle leftover samples from this frame
      if (toCopy < len) {
        const leftover = len - toCopy;
        this._inputBuffer.set(inData.subarray(toCopy), 0);
        this._inputPos = leftover;
      }
    }

    // Output: drain from the active output buffer
    // 480/128 = 3.75, so the last quantum gets a partial copy + zero-fill
    if (this._hasOutput) {
      const available = Math.min(len, this._activeOutput.length - this._outputPos);
      if (available > 0) {
        outData.set(this._activeOutput.subarray(this._outputPos, this._outputPos + available));
        if (available < len) {
          outData.fill(0, available);
        }
        this._outputPos += available;
      } else {
        outData.fill(0);
      }
    } else {
      // No processed data yet — output silence
      outData.fill(0);
    }

    return true;
  }
}

registerProcessor('rnnoise-worklet-processor', RnnoiseWorkletProcessor);
