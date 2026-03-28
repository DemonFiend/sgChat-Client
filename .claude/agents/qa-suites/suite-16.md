# Suite 16 — Electron Native Features

## SETUP
- Launch Electron app via `_electron.launch()` using `e2e/electron-fixture.ts`
- Get first window: `electronApp.firstWindow()`
- Build first: `npm run build:main && npm run build:preload`
- Server URL already configured, logged in as qa_admin
- This suite uses Mode 1 (Electron Playwright) exclusively

## TESTS

### Window Controls

#### 16.01 — Window title is set correctly
```
ACTION:
  1. const title = await window.title()
  2. Screenshot: qa-screenshots/s16-01-window-title.png

ASSERT:
  1. title is a non-empty string
  2. title contains "sgChat" or the server/app name (not "Electron" or blank)
  3. Log actual title value
```

#### 16.02 — Window is visible with content
```
ACTION:
  1. await window.waitForLoadState('load')
  2. await window.waitForTimeout(3000)
  3. Screenshot: qa-screenshots/s16-02-window-visible.png

ASSERT:
  1. Screenshot shows real UI content (not blank white or black)
  2. window.locator('body').innerText() has length > 100
  3. At least one interactive element is visible (input, button, or link)
```

#### 16.03 — Window remembers position and size on restart
```
ACTION:
  1. Get initial bounds:
     const initialBounds = await electronApp.evaluate(({ BrowserWindow }) => {
       const win = BrowserWindow.getAllWindows()[0];
       return win?.getBounds();
     });
  2. Resize and move the window:
     await electronApp.evaluate(({ BrowserWindow }) => {
       const win = BrowserWindow.getAllWindows()[0];
       win?.setBounds({ x: 200, y: 150, width: 1100, height: 700 });
     });
  3. Wait 2 seconds for state to persist
  4. Close the app: await electronApp.close()
  5. Relaunch the app: electronApp = await _electron.launch(...)
  6. Wait for first window to load
  7. Get new bounds:
     const newBounds = await electronApp.evaluate(({ BrowserWindow }) => {
       const win = BrowserWindow.getAllWindows()[0];
       return win?.getBounds();
     });
  8. Screenshot: qa-screenshots/s16-03-window-bounds.png

ASSERT:
  1. newBounds.width === 1100 (within ±10px tolerance for DPI scaling)
  2. newBounds.height === 700 (within ±10px tolerance)
  3. newBounds.x === 200 (within ±10px tolerance)
  4. newBounds.y === 150 (within ±10px tolerance)
  5. Log both initialBounds and newBounds for comparison
```

#### 16.04 — BrowserWindow state via electronApp.evaluate
```
ACTION:
  1. Check isMaximized:
     const isMax = await electronApp.evaluate(({ BrowserWindow }) => {
       return BrowserWindow.getAllWindows()[0]?.isMaximized();
     });
  2. Check isMinimized:
     const isMin = await electronApp.evaluate(({ BrowserWindow }) => {
       return BrowserWindow.getAllWindows()[0]?.isMinimized();
     });
  3. Check isVisible:
     const isVis = await electronApp.evaluate(({ BrowserWindow }) => {
       return BrowserWindow.getAllWindows()[0]?.isVisible();
     });
  4. Check bounds:
     const bounds = await electronApp.evaluate(({ BrowserWindow }) => {
       return BrowserWindow.getAllWindows()[0]?.getBounds();
     });

ASSERT:
  1. isMax is a boolean (false at normal size)
  2. isMin is a boolean (false when visible)
  3. isVis === true
  4. bounds has numeric x, y, width, height
  5. bounds.width > 0 && bounds.height > 0
  6. Log all values
```

### IPC Bridge

#### 16.05 — electronAPI is exposed on window
```
ACTION:
  1. const api = await window.evaluate(() => {
       const api = (window as any).electronAPI;
       return {
         exists: !!api,
         keys: api ? Object.keys(api) : [],
       };
     });
  2. Screenshot: qa-screenshots/s16-05-ipc-bridge.png

ASSERT:
  1. api.exists === true
  2. api.keys includes: 'isElectron', 'platform', 'minimize', 'maximize', 'close'
  3. api.keys includes: 'config', 'auth', 'clipboard', 'servers'
  4. api.keys.length >= 10 (substantial API surface)
  5. Log all keys found
```

#### 16.06 — electronAPI.isElectron returns true
```
ACTION:
  1. const isElectron = await window.evaluate(() => {
       return (window as any).electronAPI?.isElectron;
     });

ASSERT:
  1. isElectron === true (strict boolean, not truthy)
```

#### 16.07 — electronAPI.platform returns correct platform
```
ACTION:
  1. const platform = await window.evaluate(() => {
       return (window as any).electronAPI?.platform;
     });

ASSERT:
  1. platform is one of: 'win32', 'darwin', 'linux'
  2. For this Windows environment: platform === 'win32'
  3. typeof platform === 'string'
```

#### 16.08 — electronAPI.config.getServerUrl returns configured URL
```
ACTION:
  1. const serverUrl = await window.evaluate(async () => {
       return await (window as any).electronAPI?.config?.getServerUrl();
     });

ASSERT:
  1. serverUrl is a non-empty string
  2. serverUrl starts with 'http://' or 'https://'
  3. serverUrl matches the configured server (e.g., 'http://localhost:3124' or production URL)
  4. Log actual URL
```

#### 16.09 — electronAPI.isMaximized returns boolean
```
ACTION:
  1. const isMax = await window.evaluate(async () => {
       return await (window as any).electronAPI?.isMaximized();
     });

ASSERT:
  1. typeof isMax === 'boolean'
  2. isMax is false when window is at normal size (consistent with 16.04)
```

### electron-store Persistence

#### 16.10 — Server URL persists across app restart
```
ACTION:
  1. Get current server URL:
     const urlBefore = await window.evaluate(async () => {
       return await (window as any).electronAPI?.config?.getServerUrl();
     });
  2. Close the app: await electronApp.close()
  3. Relaunch the app: electronApp = await _electron.launch(...)
  4. Get new window, wait for load
  5. Get server URL after restart:
     const urlAfter = await window.evaluate(async () => {
       return await (window as any).electronAPI?.config?.getServerUrl();
     });
  6. Screenshot: qa-screenshots/s16-10-persist-url.png

ASSERT:
  1. urlBefore === urlAfter
  2. Both are non-empty strings
  3. URL survived the restart
```

#### 16.11 — Settings survive app restart
```
ACTION:
  1. Read a setting before restart (e.g., auto-start state):
     const autoStartBefore = await window.evaluate(async () => {
       return await (window as any).electronAPI?.getAutoStart();
     });
  2. Close the app: await electronApp.close()
  3. Relaunch the app: electronApp = await _electron.launch(...)
  4. Wait for load
  5. Read the same setting after restart:
     const autoStartAfter = await window.evaluate(async () => {
       return await (window as any).electronAPI?.getAutoStart();
     });

ASSERT:
  1. autoStartBefore === autoStartAfter (or both are the same type)
  2. Setting value did not reset to a different value
  3. Log both values
```

### System Tray (MANUAL)

#### 16.12 — Tray icon appears in system tray
```
NOTE: MANUAL VERIFICATION REQUIRED — Playwright cannot interact with system tray.

ACTION:
  1. Verify tray is created via main process:
     const hasTray = await electronApp.evaluate(({ app }) => {
       // Check if tray module was loaded (indirect check)
       return typeof app.isReady === 'function' && app.isReady();
     });
  2. Screenshot of app window: qa-screenshots/s16-12-tray-manual.png

ASSERT:
  1. App is running and ready
  2. Log: "MANUAL: Verify tray icon appears in system notification area"
  3. Log: "MANUAL: Verify tray icon shows the sgChat logo"
```

#### 16.13 — Tray context menu (MANUAL)
```
NOTE: MANUAL VERIFICATION REQUIRED

ASSERT:
  1. Log: "MANUAL: Right-click tray icon -> context menu appears"
  2. Log: "MANUAL: Context menu has Show/Hide option"
  3. Log: "MANUAL: Context menu has Quit option"
```

#### 16.14 — Tray click shows/hides window (MANUAL)
```
NOTE: MANUAL VERIFICATION REQUIRED

ASSERT:
  1. Log: "MANUAL: Single-click tray icon toggles window visibility"
  2. Log: "MANUAL: Window restores to previous size/position after hide/show"
```

### Notifications (MANUAL)

#### 16.15 — Native notification on DM (MANUAL)
```
NOTE: MANUAL VERIFICATION REQUIRED — OS notifications are outside Playwright scope.

ASSERT:
  1. Log: "MANUAL: Receive DM while window is minimized -> OS notification appears"
  2. Log: "MANUAL: Notification shows sender name and message preview"
  3. Log: "MANUAL: Clicking notification brings app to foreground"
```

#### 16.16 — Flash frame on mention (MANUAL)
```
NOTE: MANUAL VERIFICATION REQUIRED

ACTION:
  1. Trigger flash frame via IPC (can verify the call works):
     const result = await window.evaluate(async () => {
       return await (window as any).electronAPI?.flashFrame(true);
     });

ASSERT:
  1. flashFrame call does not throw
  2. Log: "MANUAL: Verify taskbar flashes when window is not focused"
```

#### 16.17 — Notification settings affect delivery
```
NOTE: Partially testable — verify the settings toggle exists and changes state.

ACTION:
  1. Navigate to user settings
  2. Find notification toggle or section
  3. Screenshot: qa-screenshots/s16-17-notif-settings.png

ASSERT:
  1. Notification settings section exists in user settings
  2. Toggle or checkbox for notifications is interactive
  3. Log: "MANUAL: Verify toggling off actually suppresses OS notifications"
```

### Auto-Start (MANUAL)

#### 16.18 — Auto-start enable (MANUAL)
```
ACTION:
  1. Check current auto-start state:
     const current = await window.evaluate(async () => {
       return await (window as any).electronAPI?.getAutoStart();
     });
  2. Toggle auto-start on:
     await window.evaluate(async () => {
       await (window as any).electronAPI?.setAutoStart(true);
     });
  3. Verify it was set:
     const after = await window.evaluate(async () => {
       return await (window as any).electronAPI?.getAutoStart();
     });

ASSERT:
  1. The setAutoStart call does not throw
  2. after === true (or truthy value indicating enabled)
  3. Log: "MANUAL: Verify app starts on system boot"

CLEANUP:
  1. Restore original state:
     await window.evaluate(async () => {
       await (window as any).electronAPI?.setAutoStart(false);
     });
```

#### 16.19 — Auto-start disable (MANUAL)
```
ACTION:
  1. Set auto-start to false:
     await window.evaluate(async () => {
       await (window as any).electronAPI?.setAutoStart(false);
     });
  2. Verify:
     const result = await window.evaluate(async () => {
       return await (window as any).electronAPI?.getAutoStart();
     });

ASSERT:
  1. result === false (or falsy value indicating disabled)
  2. Log: "MANUAL: Verify app does NOT start on system boot"
```

### Clipboard

#### 16.20 — Copy text and verify via clipboard API
```
ACTION:
  1. Write text to clipboard:
     await window.evaluate(async () => {
       await (window as any).electronAPI?.clipboard?.writeText('sgChat QA clipboard test');
     });
  2. Read text back from clipboard:
     const clipText = await window.evaluate(async () => {
       return await (window as any).electronAPI?.clipboard?.readText();
     });
  3. Screenshot: qa-screenshots/s16-20-clipboard.png

ASSERT:
  1. clipText === 'sgChat QA clipboard test'
  2. Clipboard round-trip works without data loss
```

### Keyboard Shortcuts

#### 16.21 — Global shortcuts registered
```
ACTION:
  1. Check that shortcut registration works via IPC:
     const result = await window.evaluate(async () => {
       const api = (window as any).electronAPI;
       // Verify shortcuts namespace exists
       return {
         hasShortcuts: !!api?.shortcuts,
         hasUpdate: typeof api?.shortcuts?.update === 'function',
         hasSet: typeof api?.shortcuts?.set === 'function',
         hasOnGlobalShortcut: typeof api?.onGlobalShortcut === 'function',
       };
     });

ASSERT:
  1. result.hasShortcuts === true
  2. result.hasUpdate === true
  3. result.hasSet === true
  4. result.hasOnGlobalShortcut === true
  5. Log: "Shortcut API surface is complete"
```

#### 16.22 — Mute/deafen shortcuts during voice (MANUAL)
```
NOTE: Requires active voice connection — partially testable.

ACTION:
  1. Verify shortcut listener can be registered:
     const canRegister = await window.evaluate(() => {
       const api = (window as any).electronAPI;
       const unsub = api?.onGlobalShortcut?.((action: string) => {
         console.log('Global shortcut:', action);
       });
       // Cleanup
       if (typeof unsub === 'function') unsub();
       return typeof unsub === 'function';
     });

ASSERT:
  1. canRegister === true (listener registrable and unsubscribable)
  2. Log: "MANUAL: Press Ctrl+Shift+M during voice call -> toggles mute"
  3. Log: "MANUAL: Press Ctrl+Shift+D during voice call -> toggles deafen"
```

### Auto-Updater (MANUAL)

#### 16.23 — Update notification (MANUAL)
```
ACTION:
  1. Verify update API surface:
     const hasUpdates = await window.evaluate(() => {
       const api = (window as any).electronAPI;
       return {
         hasOnUpdateAvailable: typeof api?.updates?.onUpdateAvailable === 'function',
         hasDismiss: typeof api?.updates?.dismiss === 'function',
         hasDownload: typeof api?.updates?.download === 'function',
       };
     });

ASSERT:
  1. hasUpdates.hasOnUpdateAvailable === true
  2. hasUpdates.hasDismiss === true
  3. hasUpdates.hasDownload === true
  4. Log: "MANUAL: Update notification appears when new version is available"
```

#### 16.24 — Update download and install (MANUAL)
```
NOTE: MANUAL VERIFICATION REQUIRED — cannot simulate real update.

ASSERT:
  1. Log: "MANUAL: Click download -> progress shown"
  2. Log: "MANUAL: After download -> install/restart prompt appears"
```

### Crash Reporter

#### 16.25 — Crash reporter API available (MANUAL)
```
ACTION:
  1. Verify crash report API:
     const hasCrashReport = await window.evaluate(() => {
       const api = (window as any).electronAPI;
       return {
         hasSubmit: typeof api?.crashReport?.submit === 'function',
       };
     });
  2. Test submitting a mock crash report:
     const submitResult = await window.evaluate(async () => {
       try {
         await (window as any).electronAPI?.crashReport?.submit({
           error_type: 'QA_TEST',
           error_message: 'QA test crash report - not a real crash',
           stack_trace: 'at qa-test:1:1',
           metadata: { suite: '16', test: '25', qa: true },
         });
         return 'success';
       } catch (e: any) {
         return 'error: ' + e.message;
       }
     });

ASSERT:
  1. hasCrashReport.hasSubmit === true
  2. submitResult === 'success' or does not throw with a crash
  3. Log: "MANUAL: Verify runtime error overlay on unhandled exception"
```

### Final Cleanup
```
Ensure app is still running and responsive.
If app was closed during persistence tests, relaunch and verify login state.
```
