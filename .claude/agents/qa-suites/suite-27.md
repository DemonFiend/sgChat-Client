# Suite 27 — Screen Share Picker & Per-App Audio

## SETUP
- Logged in as qa_admin, on server view with voice channels visible
- For picker tests: need to be in a voice channel (or trigger screen share flow)
- Components under test: ScreenSharePicker.tsx, ScreenShareButton.tsx, appAudioBridge.ts
- Electron preload: electronAPI.screenShare.*, electronAPI.appAudio.*

## TESTS

### Picker Modal

#### 27.01 — Screen share button visible in voice controls
```
REQUIRES LIVEKIT

PRECONDITION: Connected to a voice channel (VoiceConnectedBar visible)

ACTION:
  1. Verify voice connected bar is present:
     window.locator('text=Voice Connected').waitFor({ state: 'visible', timeout: 5000 })
  2. Locate screen share button by its title attribute:
     const shareBtn = window.locator('button[title="Share Screen"]')
  3. await shareBtn.waitFor({ state: 'visible' })
  4. await window.screenshot({ path: 'qa-screenshots/s27-01-share-btn-visible.png' })

ASSERT:
  1. shareBtn.isVisible() === true
  2. shareBtn.isEnabled() === true
  3. Screenshot shows the screen share button in voice controls bar
```

#### 27.02 — Picker modal opens with Screens tab active
```
REQUIRES LIVEKIT

PRECONDITION: Connected to voice channel, screen share picker can be triggered

ACTION:
  1. Trigger the screen share picker via IPC simulation:
     await window.evaluate(() => {
       const fakeSources = [
         { id: 'screen:0:0', name: 'Entire Screen', thumbnail: 'data:image/png;base64,iVBOR', appIcon: null, display_id: '1', isMinimized: false },
         { id: 'window:123:0', name: 'Visual Studio Code', thumbnail: 'data:image/png;base64,iVBOR', appIcon: 'data:image/png;base64,abc', display_id: '', isMinimized: false },
       ];
       window.dispatchEvent(new CustomEvent('__test_screen_share_pick', { detail: fakeSources }));
     })
  2. Wait for the modal to appear:
     await window.locator('text=Choose what to share').waitFor({ state: 'visible', timeout: 5000 })
  3. await window.screenshot({ path: 'qa-screenshots/s27-02-picker-opened.png' })

ASSERT:
  1. Modal title visible: window.locator('text=Choose what to share').isVisible() === true
  2. Screens tab is active: window.locator('[role="tab"]:has-text("Screens")').getAttribute('aria-selected') === 'true'
  3. Apps tab is visible: window.locator('[role="tab"]:has-text("Apps")').isVisible() === true
  4. Share button visible but disabled: window.locator('button:has-text("Share")').isDisabled() === true
  5. Cancel button visible: window.locator('button:has-text("Cancel")').isVisible() === true

SCREENSHOT: qa-screenshots/s27-02-picker-opened.png
```

#### 27.03 — Screens tab shows display sources, Apps tab shows window sources
```
REQUIRES LIVEKIT

PRECONDITION: Screen share picker modal is open (from 27.02 or triggered via IPC)

ACTION:
  1. On the Screens tab, count source cards:
     const screenCards = window.locator('[role="tabpanel"] >> div[style*="cursor: pointer"]')
     const screenCount = await screenCards.count()
  2. Click the Apps tab:
     await window.locator('[role="tab"]:has-text("Apps")').click()
  3. await window.waitForTimeout(500)
  4. Count app source cards:
     const appCards = window.locator('[role="tabpanel"] >> div[style*="cursor: pointer"]')
     const appCount = await appCards.count()
  5. await window.screenshot({ path: 'qa-screenshots/s27-03-apps-tab.png' })

ASSERT:
  1. screenCount >= 1 (at least one display)
  2. Apps tab panel is now visible
  3. appCount >= 0 (may have zero running apps with windows)
  4. Each source card has an image thumbnail (img element)
  5. Each source card has a name text label

SCREENSHOT: qa-screenshots/s27-03-apps-tab.png
```

#### 27.04 — Select a source highlights it with violet border
```
REQUIRES LIVEKIT

PRECONDITION: Screen share picker modal is open with sources listed

ACTION:
  1. Click on the Screens tab: window.locator('[role="tab"]:has-text("Screens")').click()
  2. await window.waitForTimeout(300)
  3. Click the first source card:
     const firstCard = window.locator('[role="tabpanel"] >> div[style*="cursor: pointer"]').first()
     await firstCard.click()
  4. await window.waitForTimeout(300)
  5. await window.screenshot({ path: 'qa-screenshots/s27-04-source-selected.png' })

ASSERT:
  1. Selected card has violet border:
     const borderStyle = await firstCard.evaluate(el => el.style.borderColor)
     borderStyle should contain 'violet' or 'rgb(139, 92, 246)' or similar
  2. Share button is now enabled: window.locator('button:has-text("Share")').isEnabled() === true
  3. Audio section appears below tabs:
     window.locator('text=Audio').isVisible() === true
  4. SegmentedControl for audio mode is visible

SCREENSHOT: qa-screenshots/s27-04-source-selected.png
```

#### 27.05 — Double-click on source triggers quick share
```
REQUIRES LIVEKIT

PRECONDITION: Screen share picker modal is open

ACTION:
  1. Intercept the IPC call:
     await window.evaluate(() => {
       (window as any).__selectSourceCalled = false;
       const origSelectSource = (window as any).electronAPI?.screenShare?.selectSource;
       if (origSelectSource) {
         (window as any).electronAPI.screenShare.selectSource = (id: string, mode: string) => {
           (window as any).__selectSourceCalled = true;
           (window as any).__selectSourceArgs = { id, mode };
         };
       }
     })
  2. Double-click the first source card:
     await window.locator('[role="tabpanel"] >> div[style*="cursor: pointer"]').first().dblclick()
  3. await window.waitForTimeout(500)
  4. await window.screenshot({ path: 'qa-screenshots/s27-05-quick-share.png' })

ASSERT:
  1. const called = await window.evaluate(() => (window as any).__selectSourceCalled)
     called === true
  2. Modal should close: window.locator('text=Choose what to share').isVisible() === false
  3. IPC selectSource was invoked with the source ID and an audio mode

SCREENSHOT: qa-screenshots/s27-05-quick-share.png
```

### Audio Mode Selection

#### 27.06 — Audio mode defaults to "No Audio" for screen sources
```
REQUIRES LIVEKIT

PRECONDITION: Picker open, a screen source (display_id !== '') is selected

ACTION:
  1. Open picker and select a screen source (first card on Screens tab)
  2. Locate the SegmentedControl:
     const audioControl = window.locator('[role="radiogroup"], .mantine-SegmentedControl-root')
  3. await window.screenshot({ path: 'qa-screenshots/s27-06-audio-no-audio.png' })

ASSERT:
  1. audioControl.isVisible() === true
  2. "No Audio" option is selected:
     window.locator('label:has-text("No Audio") >> input[type="radio"]').isChecked() === true
     OR the active indicator is on "No Audio"
  3. "App Audio" option is NOT visible (screen sources don't have app audio)
  4. "System Audio" option is visible

SCREENSHOT: qa-screenshots/s27-06-audio-no-audio.png
```

#### 27.07 — Audio mode auto-selects "App Audio" for window sources when supported
```
REQUIRES LIVEKIT

PRECONDITION: Picker open, appAudio.isSupported() returns true

ACTION:
  1. Switch to Apps tab: window.locator('[role="tab"]:has-text("Apps")').click()
  2. await window.waitForTimeout(300)
  3. Select the first window source card:
     await window.locator('[role="tabpanel"] >> div[style*="cursor: pointer"]').first().click()
  4. await window.waitForTimeout(300)
  5. await window.screenshot({ path: 'qa-screenshots/s27-07-app-audio-auto.png' })

ASSERT:
  1. "App Audio" option is visible in the SegmentedControl
  2. "App Audio" is the selected/active option (auto-selected for window sources)
  3. Helper text visible: window.locator('text=Only audio from this application will be shared').isVisible() === true

SCREENSHOT: qa-screenshots/s27-07-app-audio-auto.png
```

#### 27.08 — Switching audio mode to "System Audio" shows warning
```
REQUIRES LIVEKIT

PRECONDITION: Picker open, a source selected, audio SegmentedControl visible

ACTION:
  1. Click "System Audio" option:
     await window.locator('label:has-text("System Audio"), [data-value="system"]').click()
  2. await window.waitForTimeout(300)
  3. await window.screenshot({ path: 'qa-screenshots/s27-08-system-audio-warning.png' })

ASSERT:
  1. "System Audio" is now the active option
  2. Warning text visible (yellow):
     window.locator('text=All system audio will be shared').isVisible() === true
  3. Warning mentions echo: text contains "echo" (case-insensitive)

SCREENSHOT: qa-screenshots/s27-08-system-audio-warning.png
```

### Source Card Details

#### 27.09 — App audio helper text appears only for "app" mode
```
REQUIRES LIVEKIT

PRECONDITION: Picker open, window source selected with App Audio active

ACTION:
  1. Verify "App Audio" helper text is visible:
     await window.locator('text=Only audio from this application will be shared').waitFor({ state: 'visible' })
  2. Switch to "No Audio":
     await window.locator('label:has-text("No Audio"), [data-value="none"]').click()
  3. await window.waitForTimeout(300)
  4. await window.screenshot({ path: 'qa-screenshots/s27-09-no-helper-text.png' })

ASSERT:
  1. "Only audio from this application" text is no longer visible
  2. System audio echo warning is also not visible
  3. No helper text shown for "No Audio" mode

SCREENSHOT: qa-screenshots/s27-09-no-helper-text.png
```

#### 27.10 — System audio echo warning only for "system" mode
```
REQUIRES LIVEKIT

PRECONDITION: Picker open, source selected

ACTION:
  1. Select "System Audio" mode
  2. Verify warning: window.locator('text=may cause echo').isVisible() === true
  3. Switch to "No Audio" mode
  4. await window.screenshot({ path: 'qa-screenshots/s27-10-system-warning-toggle.png' })

ASSERT:
  1. After switching to "No Audio", echo warning is gone:
     window.locator('text=may cause echo').isVisible() === false
  2. No stale warning text remains

SCREENSHOT: qa-screenshots/s27-10-system-warning-toggle.png
```

#### 27.11 — Minimized window shows "Minimized" badge overlay
```
REQUIRES LIVEKIT

PRECONDITION: Picker open with at least one minimized window source (isMinimized: true)

ACTION:
  1. Trigger picker with minimized source via evaluate:
     await window.evaluate(() => {
       // Simulate IPC with a minimized window
       const fakeSources = [
         { id: 'screen:0:0', name: 'Display 1', thumbnail: 'data:image/png;base64,iVBOR', appIcon: null, display_id: '1', isMinimized: false },
         { id: 'window:456:0', name: 'Minimized App', thumbnail: 'data:image/png;base64,iVBOR', appIcon: null, display_id: '', isMinimized: true },
       ];
       // Trigger via IPC event
     })
  2. Navigate to Apps tab
  3. await window.screenshot({ path: 'qa-screenshots/s27-11-minimized-badge.png' })

ASSERT:
  1. Minimized window card has "Minimized" text badge:
     window.locator('text=Minimized').isVisible() === true
  2. Minimized card thumbnail has reduced opacity (style contains 'opacity: 0.6')
  3. Non-minimized cards do NOT have the "Minimized" badge

SCREENSHOT: qa-screenshots/s27-11-minimized-badge.png
```

#### 27.12 — App icons render next to source names
```
REQUIRES LIVEKIT

PRECONDITION: Picker open with window sources that have appIcon set

ACTION:
  1. Switch to Apps tab: window.locator('[role="tab"]:has-text("Apps")').click()
  2. await window.waitForTimeout(300)
  3. Count app icon images within source cards:
     const appIcons = window.locator('[role="tabpanel"] img[alt=""]')
  4. await window.screenshot({ path: 'qa-screenshots/s27-12-app-icons.png' })

ASSERT:
  1. At least one app icon is visible (16x16 image next to name)
  2. Each source card has a name text (Text component with size="xs")
  3. Icons are 16x16 pixels: await appIcons.first().evaluate(el => ({ w: el.width, h: el.height }))
     result should be { w: 16, h: 16 }

SCREENSHOT: qa-screenshots/s27-12-app-icons.png
```

### Share & Cancel Actions

#### 27.13 — Share button sends selectSource IPC and closes modal
```
REQUIRES LIVEKIT

PRECONDITION: Picker open, a source selected, Share button enabled

ACTION:
  1. Intercept IPC: (same as 27.05 intercept pattern)
  2. Select a source (click first card)
  3. Click Share button: await window.locator('button:has-text("Share")').click()
  4. await window.waitForTimeout(500)
  5. await window.screenshot({ path: 'qa-screenshots/s27-13-share-clicked.png' })

ASSERT:
  1. selectSource IPC was called:
     const args = await window.evaluate(() => (window as any).__selectSourceArgs)
     args.id should be the selected source ID
     args.mode should be the current audio mode ('none', 'app', or 'system')
  2. Modal is closed: window.locator('text=Choose what to share').isVisible() === false

SCREENSHOT: qa-screenshots/s27-13-share-clicked.png
```

#### 27.14 — Cancel button sends null selectSource and closes modal
```
REQUIRES LIVEKIT

PRECONDITION: Picker open

ACTION:
  1. Intercept IPC as in 27.05
  2. Click Cancel button: await window.locator('button:has-text("Cancel")').click()
  3. await window.waitForTimeout(500)
  4. await window.screenshot({ path: 'qa-screenshots/s27-14-cancel-clicked.png' })

ASSERT:
  1. selectSource IPC called with null ID:
     const args = await window.evaluate(() => (window as any).__selectSourceArgs)
     args.id === null
     args.mode === 'none'
  2. Modal is closed: window.locator('text=Choose what to share').isVisible() === false

SCREENSHOT: qa-screenshots/s27-14-cancel-clicked.png
```

### IPC & Electron Integration

#### 27.15 — electronAPI.screenShare.selectSource sends correct IPC payload
```
REQUIRES LIVEKIT

ACTION:
  1. Verify the preload API exposes selectSource:
     const hasSelectSource = await window.evaluate(() =>
       typeof (window as any).electronAPI?.screenShare?.selectSource === 'function'
     )
  2. Verify getSources is available:
     const hasGetSources = await window.evaluate(() =>
       typeof (window as any).electronAPI?.screenShare?.getSources === 'function'
     )
  3. await window.screenshot({ path: 'qa-screenshots/s27-15-ipc-api.png' })

ASSERT:
  1. hasSelectSource === true
  2. hasGetSources === true
  3. electronAPI.screenShare.onPickRequest is a function:
     const hasOnPick = await window.evaluate(() =>
       typeof (window as any).electronAPI?.screenShare?.onPickRequest === 'function'
     )
     hasOnPick === true
  4. electronAPI.screenShare.onAudioModeSelected is a function:
     const hasOnAudioMode = await window.evaluate(() =>
       typeof (window as any).electronAPI?.screenShare?.onAudioModeSelected === 'function'
     )
     hasOnAudioMode === true

SCREENSHOT: qa-screenshots/s27-15-ipc-api.png
```

#### 27.16 — Per-app audio support check via electronAPI.appAudio.isSupported
```
ACTION:
  1. Call the isSupported API:
     const isSupported = await window.evaluate(async () => {
       return await (window as any).electronAPI?.appAudio?.isSupported?.()
     })
  2. Verify the appAudio API surface:
     const apiShape = await window.evaluate(() => ({
       isSupported: typeof (window as any).electronAPI?.appAudio?.isSupported,
       onPcmData: typeof (window as any).electronAPI?.appAudio?.onPcmData,
       onSourceLost: typeof (window as any).electronAPI?.appAudio?.onSourceLost,
       stop: typeof (window as any).electronAPI?.appAudio?.stop,
     }))
  3. await window.screenshot({ path: 'qa-screenshots/s27-16-app-audio-support.png' })

ASSERT:
  1. isSupported is a boolean (true on Windows, false on macOS/Linux)
  2. apiShape.isSupported === 'function'
  3. apiShape.onPcmData === 'function'
  4. apiShape.onSourceLost === 'function'
  5. apiShape.stop === 'function'
  6. Log result: console.log('Per-app audio supported:', isSupported)

SCREENSHOT: qa-screenshots/s27-16-app-audio-support.png
```

#### 27.17 — PCM pipeline: appAudioBridge creates AudioContext and worklet
```
MANUAL VERIFICATION NEEDED
REQUIRES LIVEKIT

ACTION:
  1. Verify createAppAudioTrack and destroyAppAudioTrack are importable:
     const bridgeExists = await window.evaluate(() => {
       // Check if the app audio bridge module is loaded
       return typeof (window as any).electronAPI?.appAudio?.onPcmData === 'function'
     })
  2. Verify AudioContext and AudioWorklet are available:
     const webAudioSupport = await window.evaluate(() => ({
       hasAudioContext: typeof AudioContext !== 'undefined',
       hasAudioWorklet: typeof AudioContext !== 'undefined' && typeof (new AudioContext()).audioWorklet !== 'undefined',
     }))
  3. await window.screenshot({ path: 'qa-screenshots/s27-17-pcm-pipeline.png' })

ASSERT:
  1. bridgeExists === true
  2. webAudioSupport.hasAudioContext === true
  3. webAudioSupport.hasAudioWorklet === true
  4. No console errors related to AudioWorklet

SCREENSHOT: qa-screenshots/s27-17-pcm-pipeline.png
```

#### 27.18 — Source lost event handling (app closed during share)
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Verify onSourceLost listener is available:
     const hasSourceLost = await window.evaluate(() =>
       typeof (window as any).electronAPI?.appAudio?.onSourceLost === 'function'
     )
  2. Register a listener and verify it receives events:
     await window.evaluate(() => {
       (window as any).__sourceLostReceived = false;
       (window as any).electronAPI?.appAudio?.onSourceLost?.(() => {
         (window as any).__sourceLostReceived = true;
       });
     })
  3. await window.screenshot({ path: 'qa-screenshots/s27-18-source-lost.png' })

ASSERT:
  1. hasSourceLost === true
  2. Listener registered without error
  3. When source-lost fires, the cleanup path is available:
     const hasStop = await window.evaluate(() =>
       typeof (window as any).electronAPI?.appAudio?.stop === 'function'
     )
     hasStop === true

SCREENSHOT: qa-screenshots/s27-18-source-lost.png
```

#### 27.19 — destroyAppAudioTrack cleanup: stops worklet, closes context, calls appAudio.stop
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Verify appAudio.stop is callable:
     const hasStop = await window.evaluate(() =>
       typeof (window as any).electronAPI?.appAudio?.stop === 'function'
     )
  2. Verify no AudioContext leak by checking document audio contexts:
     const preCleanupContexts = await window.evaluate(() => {
       // Count active audio contexts (approximate — no standard API)
       return typeof AudioContext !== 'undefined'
     })
  3. await window.screenshot({ path: 'qa-screenshots/s27-19-cleanup.png' })

ASSERT:
  1. hasStop === true
  2. appAudio.stop can be invoked without error:
     const stopResult = await window.evaluate(async () => {
       try { await (window as any).electronAPI?.appAudio?.stop?.(); return 'ok'; }
       catch (e) { return e.message; }
     })
     stopResult === 'ok'
  3. No dangling audio resources after cleanup

SCREENSHOT: qa-screenshots/s27-19-cleanup.png
```

### Quality Presets

#### 27.20 — Quality preset menu shows Standard / High Quality / Native options
```
REQUIRES LIVEKIT

PRECONDITION: Connected to voice channel, actively screen sharing (isScreenSharing = true)

ACTION:
  1. Locate the screen share settings button (gear icon while sharing):
     const settingsBtn = window.locator('button[title="Screen Share Settings"]')
  2. await settingsBtn.click()
  3. await window.waitForTimeout(300)
  4. await window.screenshot({ path: 'qa-screenshots/s27-20-quality-presets.png' })

ASSERT:
  1. Quality menu is visible: window.locator('text=Change Quality').isVisible() === true
  2. Three quality options visible:
     - window.locator('text=Standard').isVisible() === true
     - window.locator('text=High Quality').isVisible() === true
     - window.locator('text=Native').isVisible() === true
  3. Detail labels visible:
     - window.locator('text=720p @ 30fps').isVisible() === true
     - window.locator('text=1080p @ 60fps').isVisible() === true
     - window.locator('text=Full resolution').isVisible() === true
  4. Badge labels: "SD", "HD", "4K" are visible
  5. One option is marked as active (checkmark icon visible)
  6. Close button visible: window.locator('button:has-text("Close")').isVisible() === true

SCREENSHOT: qa-screenshots/s27-20-quality-presets.png
```
