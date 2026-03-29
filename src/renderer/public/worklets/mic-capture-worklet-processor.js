/**
 * Mic Capture Worklet — extracts mono Float32 PCM frames from mic input.
 *
 * Buffers 480 samples (10ms at 48kHz) then sends the frame to the renderer
 * main thread via postMessage. The renderer forwards it to the main process
 * for DeepFilterNet processing.
 *
 * This worklet outputs silence — the clean audio comes from the playback worklet.
 */

class MicCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(480);
    this._pos = 0;
    this._enabled = true;
    this.port.onmessage = (e) => {
      if (e.data.type === 'set-enabled') this._enabled = e.data.enabled;
    };
  }

  process(inputs, outputs) {
    if (!this._enabled) return true;
    const input = inputs[0]?.[0]; // Mono: channel 0 only
    if (!input) return true;

    let offset = 0;
    while (offset < input.length) {
      const remaining = 480 - this._pos;
      const toCopy = Math.min(input.length - offset, remaining);
      this._buffer.set(input.subarray(offset, offset + toCopy), this._pos);
      this._pos += toCopy;
      offset += toCopy;

      if (this._pos >= 480) {
        // Send a copy of the buffer to main thread
        const copy = this._buffer.slice();
        this.port.postMessage({ type: 'pcm-frame', buffer: copy.buffer }, [copy.buffer]);
        this._buffer = new Float32Array(480);
        this._pos = 0;
      }
    }

    // Output silence — clean audio comes from playback worklet
    const out = outputs[0]?.[0];
    if (out) out.fill(0);
    return true;
  }
}

registerProcessor('mic-capture-processor', MicCaptureProcessor);
