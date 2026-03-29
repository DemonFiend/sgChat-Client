/**
 * Mic Playback Worklet — reconstructs a MediaStreamTrack from processed PCM.
 *
 * Receives cleaned Float32 mono PCM frames from the renderer main thread
 * (originating from DeepFilterNet in the Electron main process) and outputs
 * them through a MediaStreamDestination for LiveKit publishing.
 *
 * Includes a ~30ms jitter buffer to smooth IPC timing variance.
 * Adapted from the appAudioBridge.ts inline worklet pattern.
 */

class MicPlaybackProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.chunks = [];
    this.bufferedSamples = 0;
    this.prebuffering = true;
    // ~30ms jitter buffer at current sample rate (mono)
    this.prebufferSize = Math.floor(sampleRate * 0.03);
    this.port.onmessage = (e) => {
      if (e.data.type === 'pcm-data') {
        const float32 = new Float32Array(e.data.buffer);
        this.chunks.push(float32);
        this.bufferedSamples += float32.length;
      } else if (e.data.type === 'stop') {
        this.chunks = [];
        this.bufferedSamples = 0;
        this.prebuffering = true;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0]?.[0];
    if (!output) return true;
    const needed = output.length; // 128 samples per quantum

    // Wait until jitter buffer is filled
    if (this.prebuffering) {
      if (this.bufferedSamples >= this.prebufferSize) {
        this.prebuffering = false;
      } else {
        output.fill(0);
        return true;
      }
    }

    // Underrun — output silence and re-enter prebuffering
    if (this.bufferedSamples < needed) {
      output.fill(0);
      if (this.bufferedSamples === 0) this.prebuffering = true;
      return true;
    }

    // Drain mono samples from chunk queue
    let offset = 0;
    let remaining = needed;
    while (remaining > 0 && this.chunks.length > 0) {
      const chunk = this.chunks[0];
      const take = Math.min(chunk.length, remaining);
      output.set(chunk.subarray(0, take), offset);
      offset += take;
      remaining -= take;
      if (take >= chunk.length) {
        this.chunks.shift();
      } else {
        this.chunks[0] = chunk.subarray(take);
      }
    }
    this.bufferedSamples -= needed;

    return true;
  }
}

registerProcessor('mic-playback-processor', MicPlaybackProcessor);
