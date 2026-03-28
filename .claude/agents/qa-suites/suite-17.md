# Suite 17 — Multi-Server Switching

## SETUP
- Launch Electron app via `_electron.launch()` using `e2e/electron-fixture.ts`
- App is connected to a primary server (e.g., http://localhost:3124)
- Logged in as qa_admin
- Build first: `npm run build:main && npm run build:preload`
- A second server URL is needed for switching tests (use a different port or production URL)
- If no second server is available, use a fake URL for error handling tests

## TESTS

### Server Selector UI

#### 17.01 — Open server/network selector
```
ACTION:
  1. Look for a server selector or network switcher in the UI:
     window.locator('button[aria-label="Switch Server"]')
       .or(window.locator('button[aria-label="Server Selector"]'))
       .or(window.locator('button:has-text("Switch Server")'))
  2. If not found in UI, verify the API exists:
     const hasServers = await window.evaluate(() => {
       const api = (window as any).electronAPI;
       return {
         hasSaved: typeof api?.servers?.getSaved === 'function',
         hasSave: typeof api?.servers?.save === 'function',
         hasRemove: typeof api?.servers?.remove === 'function',
         hasSwitch: typeof api?.servers?.switch === 'function',
       };
     });
  3. Screenshot: qa-screenshots/s17-01-server-selector.png

ASSERT:
  1. Either: a server selector UI element is visible and clickable
  2. Or: the servers IPC API surface exists (all four methods present)
  3. hasServers.hasSaved === true
  4. hasServers.hasSave === true
  5. hasServers.hasRemove === true
  6. hasServers.hasSwitch === true
```

#### 17.02 — Current server URL displayed correctly
```
ACTION:
  1. Get current server URL:
     const currentUrl = await window.evaluate(async () => {
       return await (window as any).electronAPI?.config?.getServerUrl();
     });
  2. If server selector UI exists, open it and check the displayed URL
  3. Screenshot: qa-screenshots/s17-02-current-server.png

ASSERT:
  1. currentUrl is a non-empty string
  2. currentUrl starts with 'http://' or 'https://'
  3. If selector UI is open: the displayed URL matches currentUrl
  4. Log actual URL value
```

### Server Management

#### 17.03 — Save a second server URL
```
ACTION:
  1. Save a second server via IPC:
     const saveResult = await window.evaluate(async () => {
       try {
         await (window as any).electronAPI?.servers?.save({
           url: 'http://localhost:9999',
           name: 'QA Test Server 2',
         });
         return 'success';
       } catch (e: any) {
         return 'error: ' + e.message;
       }
     });
  2. Verify it was saved:
     const saved = await window.evaluate(async () => {
       return await (window as any).electronAPI?.servers?.getSaved();
     });
  3. Screenshot: qa-screenshots/s17-03-saved-server.png

ASSERT:
  1. saveResult === 'success'
  2. saved is an array
  3. saved contains an entry with url 'http://localhost:9999' or name 'QA Test Server 2'
  4. Log saved servers list
```

#### 17.04 — Switch to second server triggers reconnect
```
NOTE: This test may fail if the second server is not running. That is expected
and is covered by 17.08. Only test switching if a real second server is available.

ACTION:
  1. Record current URL:
     const urlBefore = await window.evaluate(async () => {
       return await (window as any).electronAPI?.config?.getServerUrl();
     });
  2. Attempt switch to second server:
     const switchResult = await window.evaluate(async () => {
       try {
         await (window as any).electronAPI?.servers?.switch('http://localhost:9999');
         return 'success';
       } catch (e: any) {
         return 'error: ' + e.message;
       }
     });
  3. Wait 5 seconds for reconnection
  4. Check new URL:
     const urlAfter = await window.evaluate(async () => {
       return await (window as any).electronAPI?.config?.getServerUrl();
     });
  5. Screenshot: qa-screenshots/s17-04-switched-server.png

ASSERT:
  1. switchResult is 'success' or a graceful error (not a crash)
  2. If success: urlAfter === 'http://localhost:9999'
  3. If success: urlAfter !== urlBefore
  4. App is still responsive (no hang or crash)
```

#### 17.05 — Switch back to original server restores session
```
PRECONDITION: Successfully switched to second server in 17.04

ACTION:
  1. Switch back to original server:
     const switchBack = await window.evaluate(async () => {
       try {
         await (window as any).electronAPI?.servers?.switch('http://localhost:3124');
         return 'success';
       } catch (e: any) {
         return 'error: ' + e.message;
       }
     });
  2. Wait 10 seconds for reconnection and session restoration
  3. Verify URL:
     const url = await window.evaluate(async () => {
       return await (window as any).electronAPI?.config?.getServerUrl();
     });
  4. Wait for app to reload, then check session:
     await window.waitForLoadState('load')
  5. Screenshot: qa-screenshots/s17-05-restored-session.png

ASSERT:
  1. switchBack === 'success'
  2. url === 'http://localhost:3124' (original server)
  3. App shows logged-in state (channels visible or message input visible):
     window.locator('textarea[placeholder*="Message"]').isVisible()
     OR window.locator('text=ONLINE').isVisible()
  4. Session was restored (not kicked to login page)
```

#### 17.06 — Saved servers list shows all added servers
```
ACTION:
  1. Get full list of saved servers:
     const servers = await window.evaluate(async () => {
       return await (window as any).electronAPI?.servers?.getSaved();
     });
  2. Screenshot: qa-screenshots/s17-06-saved-list.png

ASSERT:
  1. servers is an array
  2. servers.length >= 1 (at least the test server from 17.03)
  3. Each entry has a 'url' field that is a non-empty string
  4. Log all saved servers
```

#### 17.07 — Remove a saved server
```
ACTION:
  1. Get saved servers before removal:
     const before = await window.evaluate(async () => {
       return await (window as any).electronAPI?.servers?.getSaved();
     });
  2. Remove the test server:
     const removeResult = await window.evaluate(async () => {
       try {
         await (window as any).electronAPI?.servers?.remove('http://localhost:9999');
         return 'success';
       } catch (e: any) {
         return 'error: ' + e.message;
       }
     });
  3. Get saved servers after removal:
     const after = await window.evaluate(async () => {
       return await (window as any).electronAPI?.servers?.getSaved();
     });
  4. Screenshot: qa-screenshots/s17-07-removed-server.png

ASSERT:
  1. removeResult === 'success'
  2. after.length === before.length - 1 (one fewer server)
  3. after does NOT contain an entry with url 'http://localhost:9999'
  4. Log before and after lists
```

### Error Handling

#### 17.08 — Switch to unavailable server shows error
```
ACTION:
  1. Attempt switch to a server that is not running:
     const errorResult = await window.evaluate(async () => {
       try {
         await (window as any).electronAPI?.servers?.switch('http://localhost:55555');
         return { status: 'no-error' };
       } catch (e: any) {
         return { status: 'error', message: e.message };
       }
     });
  2. Wait 5 seconds for timeout
  3. Screenshot: qa-screenshots/s17-08-unavailable-server.png

ASSERT:
  1. Either: errorResult.status === 'error' (switch threw an error)
  2. Or: the app shows a connection error indicator in the UI
  3. Error message is user-friendly (not a raw stack trace)
  4. App does NOT crash — still responsive
  5. Original server connection is still active (or can be restored)
```

### Connection Behavior

#### 17.09 — Socket.IO reconnects after server switch
```
PRECONDITION: On primary server, logged in

ACTION:
  1. Check Socket.IO connection state before switch (look for ONLINE presence):
     const onlineBefore = await window.locator('text=ONLINE').isVisible();
  2. Save current session:
     await window.evaluate(async () => {
       await (window as any).electronAPI?.servers?.saveCurrentSession();
     });
  3. If a valid second server is available, switch and switch back
  4. Wait 10 seconds for Socket.IO to reconnect
  5. Check connection state after:
     const onlineAfter = await window.locator('text=ONLINE').isVisible();
  6. Screenshot: qa-screenshots/s17-09-socket-reconnect.png

ASSERT:
  1. onlineBefore === true (was connected before)
  2. onlineAfter === true (reconnected after switch-back)
  3. Member list shows presence data (not all empty)
```

#### 17.10 — TanStack Query cache invalidated on server switch
```
PRECONDITION: On primary server, logged in, some data loaded

ACTION:
  1. Verify channels are loaded on current server:
     const channelsBefore = await window.locator('[class*="channel"], button:has-text("general")').count();
  2. Note the channel names visible
  3. If switching to a different server: the old channel names should not appear
  4. Switch back to primary server and verify channels reload:
     await window.waitForTimeout(5000)
  5. const channelsAfter = await window.locator('[class*="channel"], button:has-text("general")').count();
  6. Screenshot: qa-screenshots/s17-10-cache-invalidated.png

ASSERT:
  1. channelsBefore > 0 (channels were loaded initially)
  2. channelsAfter > 0 (channels reloaded after switch-back)
  3. Data is fresh (not stale from previous server)
  4. No stale server name or channel names from a different server visible
```

### Final Cleanup
```
1. Ensure we're connected to the primary server (http://localhost:3124)
2. Remove any test servers added during this suite:
   await window.evaluate(async () => {
     await (window as any).electronAPI?.servers?.remove('http://localhost:9999');
     await (window as any).electronAPI?.servers?.remove('http://localhost:55555');
   });
3. Verify logged in as qa_admin
```
