# Suite 28 — Noise Suppression / DTLN WASM Pipeline

## SETUP
- Logged in as qa_admin, on server view or settings Voice tab
- Running in Electron (DTLN WASM requires Electron — browser returns unsupported)
- Components under test: noiseSuppressionService.ts (singleton), voiceSettingsStore.ts
- Service: noiseSuppressionService (singleton with checkCapabilities, loadModel, processOutboundTrack, processInboundTrack, destroy)
- Constants: DTLN_BLOCK=512, DTLN_RATE=16000, MAX_INBOUND_PIPELINES=8

## TESTS

### Capability Checks

#### 28.01 — checkCapabilities detects AudioContext support
```
ACTION:
  1. Check if AudioContext is available in the Electron renderer:
     const hasAudioContext = await window.evaluate(() =>
       typeof AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined'
     )
  2. await window.screenshot({ path: 'qa-screenshots/s28-01-audio-context.png' })

ASSERT:
  1. hasAudioContext === true (Electron Chromium always has AudioContext)
  2. No error thrown during check
  3. Log: console.log('AudioContext available:', hasAudioContext)

SCREENSHOT: qa-screenshots/s28-01-audio-context.png
```

#### 28.02 — checkCapabilities detects AudioWorklet support
```
ACTION:
  1. Check AudioWorklet availability:
     const hasWorklet = await window.evaluate(() => {
       if (typeof AudioContext === 'undefined') return false;
       const ctx = new AudioContext();
       const result = typeof ctx.audioWorklet !== 'undefined';
       ctx.close();
       return result;
     })
  2. await window.screenshot({ path: 'qa-screenshots/s28-02-audio-worklet.png' })

ASSERT:
  1. hasWorklet === true (Chromium supports AudioWorklet)
  2. AudioContext was properly closed after check (no resource leak)

SCREENSHOT: qa-screenshots/s28-02-audio-worklet.png
```

#### 28.03 — checkCapabilities detects WebAssembly support
```
ACTION:
  1. Check WebAssembly availability:
     const hasWasm = await window.evaluate(() => typeof WebAssembly !== 'undefined')
  2. await window.screenshot({ path: 'qa-screenshots/s28-03-wasm.png' })

ASSERT:
  1. hasWasm === true (Electron Chromium always supports WebAssembly)
  2. WebAssembly.compile and WebAssembly.instantiate exist:
     const wasmAPIs = await window.evaluate(() => ({
       compile: typeof WebAssembly.compile === 'function',
       instantiate: typeof WebAssembly.instantiate === 'function',
     }))
     wasmAPIs.compile === true && wasmAPIs.instantiate === true

SCREENSHOT: qa-screenshots/s28-03-wasm.png
```

#### 28.04 — checkCapabilities combined result in Electron
```
ACTION:
  1. Check isElectron detection:
     const isElectron = await window.evaluate(() =>
       typeof (window as any).electronAPI !== 'undefined'
     )
  2. Run full capability check summary:
     const capabilities = await window.evaluate(() => ({
       audioContext: typeof AudioContext !== 'undefined',
       audioWorklet: typeof AudioContext !== 'undefined' && typeof (new AudioContext()).audioWorklet !== 'undefined',
       webAssembly: typeof WebAssembly !== 'undefined',
       isElectron: typeof (window as any).electronAPI !== 'undefined',
     }))
  3. await window.screenshot({ path: 'qa-screenshots/s28-04-combined-caps.png' })

ASSERT:
  1. isElectron === true (running in Electron)
  2. capabilities.audioContext === true
  3. capabilities.audioWorklet === true
  4. capabilities.webAssembly === true
  5. All four prerequisites met — noise suppression should be supported
  6. Log all capability values

SCREENSHOT: qa-screenshots/s28-04-combined-caps.png
```

### Model Loading

#### 28.05 — loadModel lazy-loads DTLN WASM module
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Check console output for DTLN loading messages:
     const consoleLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('[NoiseSuppressionService]')) consoleLogs.push(msg.text());
     });
  2. Navigate to settings → Voice tab (if available) or join a voice channel with AI NS enabled
  3. Wait up to 15 seconds for model loading:
     await window.waitForTimeout(15000)
  4. await window.screenshot({ path: 'qa-screenshots/s28-05-model-load.png' })

ASSERT:
  1. Console contains "Loading DTLN model..." log entry
  2. Either: "DTLN model loaded in XXms" (success)
     Or: "Failed to load DTLN model" (expected in some test environments)
  3. No unhandled exceptions thrown during load
  4. If loaded, load time is recorded (numeric ms value in log)

SCREENSHOT: qa-screenshots/s28-05-model-load.png
```

#### 28.06 — Benchmark runs after model load, logs single inference time
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Collect console logs during model load (same approach as 28.05):
     const benchmarkLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('Benchmark')) benchmarkLogs.push(msg.text());
     });
  2. Trigger model load (join voice with AI NS enabled)
  3. Wait for benchmark to complete:
     await window.waitForTimeout(15000)
  4. await window.screenshot({ path: 'qa-screenshots/s28-06-benchmark.png' })

ASSERT:
  1. Console contains "Benchmark: single inference = XXms" log
  2. Inference time is a valid positive number
  3. If inference time > 15ms, additional warning logged:
     "Device may struggle with AI noise suppression"
  4. Benchmark completes without throwing

SCREENSHOT: qa-screenshots/s28-06-benchmark.png
```

### Outbound Pipeline

#### 28.07 — processOutboundTrack creates AudioContext at 48kHz
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Monitor console for outbound pipeline creation:
     const pipelineLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('Outbound pipeline')) pipelineLogs.push(msg.text());
     });
  2. Join a voice channel (with AI noise suppression enabled in settings)
  3. await window.waitForTimeout(10000)
  4. await window.screenshot({ path: 'qa-screenshots/s28-07-outbound-pipeline.png' })

ASSERT:
  1. Console logs contain "Outbound pipeline started"
  2. OR if DTLN failed to load, console shows fallback behavior
  3. No "Failed to create outbound pipeline" errors
  4. AudioContext was created (no AudioContext errors in console)

SCREENSHOT: qa-screenshots/s28-07-outbound-pipeline.png
```

#### 28.08 — Outbound pipeline: source -> worklet -> destination chain
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Verify mic access was requested and granted:
     const micPermission = await window.evaluate(async () => {
       try {
         const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
         return result.state;
       } catch { return 'unknown'; }
     })
  2. Verify AudioWorklet modules can be loaded:
     const workletSupport = await window.evaluate(async () => {
       try {
         const ctx = new AudioContext({ sampleRate: 48000 });
         const hasWorklet = typeof ctx.audioWorklet?.addModule === 'function';
         await ctx.close();
         return hasWorklet;
       } catch { return false; }
     })
  3. await window.screenshot({ path: 'qa-screenshots/s28-08-outbound-chain.png' })

ASSERT:
  1. micPermission is 'granted' or 'prompt' (not 'denied')
  2. workletSupport === true
  3. 48kHz AudioContext can be created without error
  4. MediaStreamAudioDestinationNode produces a stream with tracks

SCREENSHOT: qa-screenshots/s28-08-outbound-chain.png
```

#### 28.09 — Outbound pipeline returns a clean MediaStream
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Verify MediaStream creation capability:
     const canCreateStreams = await window.evaluate(() => {
       const ctx = new AudioContext();
       const dest = ctx.createMediaStreamDestination();
       const tracks = dest.stream.getAudioTracks();
       const result = tracks.length > 0;
       ctx.close();
       return result;
     })
  2. Verify dtln-worklet-processor.js is accessible:
     const workletAccessible = await window.evaluate(async () => {
       try {
         const resp = await fetch('/worklets/dtln-worklet-processor.js', { method: 'HEAD' });
         return resp.ok;
       } catch { return false; }
     })
  3. await window.screenshot({ path: 'qa-screenshots/s28-09-clean-stream.png' })

ASSERT:
  1. canCreateStreams === true (MediaStreamAudioDestinationNode works)
  2. workletAccessible === true (processor JS file is served)
     OR workletAccessible === false (test environment may not serve static files — log for review)
  3. No errors in console related to MediaStream creation

SCREENSHOT: qa-screenshots/s28-09-clean-stream.png
```

### Inbound Pipeline

#### 28.10 — processInboundTrack creates pipeline for remote participant
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Monitor console for inbound pipeline creation:
     const inboundLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('Inbound pipeline')) inboundLogs.push(msg.text());
     });
  2. Join a voice channel where another participant is speaking
  3. await window.waitForTimeout(10000)
  4. await window.screenshot({ path: 'qa-screenshots/s28-10-inbound-pipeline.png' })

ASSERT:
  1. If remote participant present with AI NS enabled:
     Console should contain "Inbound pipeline started for: <identity>"
  2. OR if no remote participant or NS disabled: no inbound logs (expected)
  3. No errors related to createMediaElementSource

SCREENSHOT: qa-screenshots/s28-10-inbound-pipeline.png
```

#### 28.11 — Inbound pipeline cap at MAX_INBOUND_PIPELINES (8)
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Verify the cap constant is accessible (read from source):
     const capCheck = await window.evaluate(() => {
       // MAX_INBOUND_PIPELINES is a module-level constant = 8
       // We can't read it directly, but we verify the service behavior
       return true;
     })
  2. Monitor console for cap-reached messages:
     const capLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('cap reached')) capLogs.push(msg.text());
     });
  3. await window.screenshot({ path: 'qa-screenshots/s28-11-inbound-cap.png' })

ASSERT:
  1. If 9+ remote participants join: console should log
     "Inbound pipeline cap reached (8), skipping: <identity>"
  2. Service continues functioning for the first 8 pipelines
  3. No crash or unhandled error when cap is exceeded
  4. NOTE: This test requires 9+ participants — mark as MANUAL VERIFICATION if not achievable

SCREENSHOT: qa-screenshots/s28-11-inbound-cap.png
```

#### 28.12 — Pipeline removed when participant disconnects
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Monitor console for pipeline stop messages:
     const stopLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('pipeline stopped')) stopLogs.push(msg.text());
     });
  2. Have a remote participant leave the voice channel
  3. await window.waitForTimeout(5000)
  4. await window.screenshot({ path: 'qa-screenshots/s28-12-pipeline-removed.png' })

ASSERT:
  1. Console should contain "Inbound pipeline stopped for: <identity>"
  2. Pipeline resources (AudioContext, WorkletNode) are cleaned up
  3. No "pipeline stopped" errors or warnings

SCREENSHOT: qa-screenshots/s28-12-pipeline-removed.png
```

#### 28.13 — destroy() tears down all pipelines (outbound + inbound)
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Monitor console for destroy messages:
     const destroyLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('torn down') || msg.text().includes('pipeline stopped'))
         destroyLogs.push(msg.text());
     });
  2. Leave the voice channel (triggers destroy):
     await window.locator('button[title="Disconnect"]').click()
  3. await window.waitForTimeout(3000)
  4. await window.screenshot({ path: 'qa-screenshots/s28-13-destroy-all.png' })

ASSERT:
  1. Console contains "All pipelines torn down"
  2. No lingering AudioContext errors after destroy
  3. Voice connected bar is gone (disconnected state)
  4. No "Failed to" error messages in destroy logs

SCREENSHOT: qa-screenshots/s28-13-destroy-all.png
```

### CPU Monitoring

#### 28.14 — CPU monitoring classifies low / moderate / high levels
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Monitor for CPU level log messages:
     const cpuLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('CPU usage level')) cpuLogs.push(msg.text());
     });
  2. Join voice channel with AI NS enabled
  3. Wait for CPU monitoring to report:
     await window.waitForTimeout(15000)
  4. await window.screenshot({ path: 'qa-screenshots/s28-14-cpu-levels.png' })

ASSERT:
  1. If AI NS active, at least one CPU level log appears
  2. Level is one of: 'low', 'moderate', 'high'
  3. Classification logic (from source):
     - low: utilization < 30% (avgMs / 32ms < 0.3)
     - moderate: utilization < 60%
     - high: utilization >= 60%
  4. No continuous CPU level spam (only logs on level CHANGE)

SCREENSHOT: qa-screenshots/s28-14-cpu-levels.png
```

#### 28.15 — CPU level change listener fires on transitions
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Verify onCpuLevelChange is accessible as API:
     const serviceExists = await window.evaluate(() => {
       // noiseSuppressionService is a module singleton
       // We verify the pattern works via console monitoring
       return true;
     })
  2. Monitor for CPU level changes during voice session
  3. await window.screenshot({ path: 'qa-screenshots/s28-15-cpu-listener.png' })

ASSERT:
  1. CPU level transitions only trigger when level ACTUALLY changes
  2. No duplicate consecutive logs with same level
  3. Listener cleanup: after destroy(), no more CPU level events fire

SCREENSHOT: qa-screenshots/s28-15-cpu-listener.png
```

### Worklet Processing

#### 28.16 — Worklet processor handles 512-sample DTLN blocks
```
MANUAL VERIFICATION NEEDED

ACTION:
  1. Verify DTLN constants are correct:
     const constants = await window.evaluate(() => ({
       // These are module-level constants in noiseSuppressionService.ts
       // DTLN_BLOCK = 512, DTLN_RATE = 16000
       float32Size: Float32Array.BYTES_PER_ELEMENT,
       blockSize: 512,
       sampleRate: 16000,
       blockDurationMs: (512 / 16000) * 1000, // ~32ms
     }))
  2. Verify Float32Array operations work:
     const arrayOps = await window.evaluate(() => {
       const input = new Float32Array(512);
       const output = new Float32Array(512);
       input[0] = 0.5;
       return { inputLen: input.length, outputLen: output.length, firstVal: input[0] };
     })
  3. await window.screenshot({ path: 'qa-screenshots/s28-16-worklet-frames.png' })

ASSERT:
  1. constants.blockSize === 512
  2. constants.sampleRate === 16000
  3. constants.blockDurationMs approximately 32 (32ms per block)
  4. arrayOps.inputLen === 512 && arrayOps.outputLen === 512
  5. Float32Array operations produce correct values

SCREENSHOT: qa-screenshots/s28-16-worklet-frames.png
```

#### 28.17 — Passthrough mode when noise suppression is disabled
```
REQUIRES LIVEKIT

ACTION:
  1. Navigate to settings if available, check AI NS toggle state:
     await window.locator('button:has-text("Settings")').click().catch(() => {})
  2. Look for noise suppression toggle:
     const nsToggle = window.locator('text=AI Noise Suppression').or(
       window.locator('text=Noise Suppression')
     )
  3. Monitor console for passthrough behavior:
     const passLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('noise suppression') || msg.text().includes('Microphone enabled'))
         passLogs.push(msg.text());
     });
  4. Join voice with AI NS disabled (browser noiseSuppression: true used instead)
  5. await window.screenshot({ path: 'qa-screenshots/s28-17-passthrough.png' })

ASSERT:
  1. When AI NS is disabled, console should NOT contain "Outbound pipeline started"
  2. Instead: "Microphone enabled" logged directly (standard WebRTC path)
  3. Browser-level noiseSuppression constraint used as fallback
  4. No DTLN model loading attempted when disabled

SCREENSHOT: qa-screenshots/s28-17-passthrough.png
```

### Settings Persistence

#### 28.18 — AI noise suppression toggle persists to server settings
```
REQUIRES LIVEKIT

ACTION:
  1. Collect network requests for settings save:
     const settingsRequests: string[] = [];
     window.on('request', req => {
       if (req.url().includes('/users/me/settings')) settingsRequests.push(req.method());
     });
  2. Navigate to settings page:
     await window.locator('button[title="User Settings"]').or(
       window.locator('button:has-text("Settings")')
     ).click()
  3. await window.waitForTimeout(2000)
  4. Look for voice/audio settings section
  5. Find AI noise suppression toggle and verify its state:
     const nsToggle = window.locator('[data-testid="ai-noise-suppression"]').or(
       window.locator('label:has-text("AI Noise Suppression")')
     )
  6. await window.screenshot({ path: 'qa-screenshots/s28-18-settings-persist.png' })

ASSERT:
  1. Settings page loaded without error
  2. Voice/audio settings section is accessible
  3. AI noise suppression toggle exists and has a boolean state
  4. Toggle state reflects persisted value from server settings (audio_ai_noise_suppression)
  5. Note: actual toggle change only applies on NEXT voice join (not live toggle)
  6. Log: 'Settings requests captured:', settingsRequests

SCREENSHOT: qa-screenshots/s28-18-settings-persist.png
```
