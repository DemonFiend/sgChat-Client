/**
 * Per-app audio bridge: receives raw PCM from the main process (via WASAPI capture)
 * and converts it into a MediaStreamTrack suitable for LiveKit publishing.
 *
 * Architecture:
 *   Main process (ApplicationLoopback.exe → stdout → IPC)
 *     → Renderer (this module: AudioWorklet → MediaStreamAudioDestinationNode)
 *       → MediaStreamTrack → LiveKit publishTrack()
 */

const electronAPI = (window as any).electronAPI;

const CHANNELS = 2;

let audioContext: AudioContext | null = null;
let workletNode: AudioWorkletNode | null = null;
let mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;
let cleanupPcmListener: (() => void) | null = null;
let cleanupSourceLostListener: (() => void) | null = null;

/**
 * AudioWorklet processor code (loaded via Blob URL).
 *
 * The PCM format from ApplicationLoopback.exe is the system's default mix format:
 * 32-bit IEEE float, stereo interleaved [L, R, L, R, ...].
 * The main process ensures all IPC chunks are frame-aligned (8 bytes per frame).
 *
 * The AudioContext is created WITHOUT a fixed sampleRate so it matches the
 * system's default output device rate — the same rate WASAPI captures at.
 * This avoids sample-rate mismatches that cause robotic/pitched audio.
 *
 * A jitter buffer (~50ms) absorbs IPC timing jitter before playback begins.
 */
const WORKLET_PROCESSOR_CODE = `
class AppAudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = [];
    this.bufferLength = 0;
    this.prebuffering = true;
    // ~50ms jitter buffer in interleaved stereo samples.
    // sampleRate is a global in AudioWorkletGlobalScope.
    this.prebufferSize = Math.floor(sampleRate * 2 * 0.05);
    this.port.onmessage = (e) => {
      if (e.data.type === 'pcm-data') {
        const raw = e.data.buffer;
        const float32 = new Float32Array(raw);
        this.buffer.push(float32);
        this.bufferLength += float32.length;
      } else if (e.data.type === 'stop') {
        this.buffer = [];
        this.bufferLength = 0;
        this.prebuffering = true;
      }
    };
  }

  process(inputs, outputs) {
    const output = outputs[0];
    if (!output || output.length === 0) return true;

    const framesNeeded = output[0].length; // typically 128
    const samplesNeeded = framesNeeded * 2; // stereo interleaved

    // Pre-buffering phase: accumulate data before starting playback
    // to absorb IPC timing jitter
    if (this.prebuffering) {
      if (this.bufferLength >= this.prebufferSize) {
        this.prebuffering = false;
      } else {
        for (const channel of output) channel.fill(0);
        return true;
      }
    }

    if (this.bufferLength < samplesNeeded) {
      // Underrun: output silence but stay in playing mode
      // (only re-enter prebuffering if completely drained)
      for (const channel of output) channel.fill(0);
      if (this.bufferLength === 0) {
        this.prebuffering = true;
      }
      return true;
    }

    // Drain enough interleaved samples from the chunk queue
    const flat = new Float32Array(samplesNeeded);
    let offset = 0;
    let remaining = samplesNeeded;

    while (remaining > 0 && this.buffer.length > 0) {
      const chunk = this.buffer[0];
      const take = Math.min(chunk.length, remaining);
      flat.set(chunk.subarray(0, take), offset);
      offset += take;
      remaining -= take;

      if (take >= chunk.length) {
        this.buffer.shift();
      } else {
        this.buffer[0] = chunk.subarray(take);
      }
    }
    this.bufferLength -= samplesNeeded;

    // De-interleave stereo: [L, R, L, R, ...] -> separate channels
    const numChannels = Math.min(output.length, 2);
    for (let i = 0; i < framesNeeded; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        output[ch][i] = flat[i * 2 + ch];
      }
    }

    return true;
  }
}

registerProcessor('app-audio-processor', AppAudioProcessor);
`;

/**
 * Create a MediaStreamTrack that outputs per-app captured audio.
 * Call this after the main process has started per-app audio capture.
 */
export async function createAppAudioTrack(): Promise<MediaStreamTrack | null> {
  // Clean up any existing bridge
  destroyAppAudioTrack(false);

  // Don't specify sampleRate — let it match the system default.
  // WASAPI captures at the system's shared-mode format rate; matching it avoids resampling artifacts.
  audioContext = new AudioContext();

  // Ensure the context is running (Chromium autoplay policy may suspend it
  // if the user gesture context was lost during async operations).
  if (audioContext.state !== 'running') {
    console.log(`[appAudioBridge] AudioContext state: ${audioContext.state}, resuming...`);
    await audioContext.resume();
  }
  console.log(`[appAudioBridge] AudioContext sampleRate: ${audioContext.sampleRate}, state: ${audioContext.state}`);

  // Load AudioWorklet from inline code via Blob URL
  const blob = new Blob([WORKLET_PROCESSOR_CODE], { type: 'application/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    await audioContext.audioWorklet.addModule(blobUrl);
  } finally {
    URL.revokeObjectURL(blobUrl);
  }

  workletNode = new AudioWorkletNode(audioContext, 'app-audio-processor', {
    outputChannelCount: [CHANNELS],
    numberOfOutputs: 1,
  });

  mediaStreamDestination = audioContext.createMediaStreamDestination();
  workletNode.connect(mediaStreamDestination);

  // Listen for PCM data from main process.
  // IPC + contextBridge delivers Buffer/Uint8Array data. We need a clean
  // ArrayBuffer copy to send to the AudioWorklet.
  if (electronAPI?.appAudio?.onPcmData) {
    let pcmChunkCount = 0;
    cleanupPcmListener = electronAPI.appAudio.onPcmData((data: any) => {
      if (!workletNode) return;

      // Convert whatever we received into a standalone ArrayBuffer.
      // IPC may give us a Uint8Array whose .buffer is shared/offset.
      let arrayBuffer: ArrayBuffer;
      if (data instanceof ArrayBuffer) {
        arrayBuffer = data;
      } else if (ArrayBuffer.isView(data)) {
        // Uint8Array / Buffer — copy the relevant slice into a new ArrayBuffer
        arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      } else {
        console.warn('[appAudioBridge] Unknown data type from IPC:', typeof data);
        return;
      }

      pcmChunkCount++;
      if (pcmChunkCount <= 5 || pcmChunkCount % 100 === 0) {
        console.log(`[appAudioBridge] PCM chunk #${pcmChunkCount}: ${arrayBuffer.byteLength} bytes`);
      }

      workletNode.port.postMessage({ type: 'pcm-data', buffer: arrayBuffer }, [arrayBuffer]);
    });
  } else {
    console.warn('[appAudioBridge] electronAPI.appAudio.onPcmData not available!');
  }

  // Listen for source-lost events (app was closed)
  if (electronAPI?.appAudio?.onSourceLost) {
    cleanupSourceLostListener = electronAPI.appAudio.onSourceLost(() => {
      console.log('[appAudioBridge] Source lost — app may have closed');
      // Don't destroy the bridge here; voiceService handles the full cleanup
    });
  }

  const tracks = mediaStreamDestination.stream.getAudioTracks();
  if (tracks.length === 0) {
    console.error('[appAudioBridge] No audio tracks from MediaStreamDestination');
    destroyAppAudioTrack(false);
    return null;
  }

  console.log('[appAudioBridge] Audio track created successfully');
  return tracks[0];
}

/**
 * Stop the audio bridge and clean up all resources.
 * @param stopMainCapture - Whether to tell the main process to stop capture (default true)
 */
export function destroyAppAudioTrack(stopMainCapture = true): void {
  if (workletNode) {
    workletNode.port.postMessage({ type: 'stop' });
    workletNode.disconnect();
    workletNode = null;
  }

  if (mediaStreamDestination) {
    // Stop all tracks
    mediaStreamDestination.stream.getAudioTracks().forEach((t) => t.stop());
    mediaStreamDestination.disconnect();
    mediaStreamDestination = null;
  }

  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }

  if (cleanupPcmListener) {
    cleanupPcmListener();
    cleanupPcmListener = null;
  }

  if (cleanupSourceLostListener) {
    cleanupSourceLostListener();
    cleanupSourceLostListener = null;
  }

  if (stopMainCapture) {
    electronAPI?.appAudio?.stop?.();
  }
}
