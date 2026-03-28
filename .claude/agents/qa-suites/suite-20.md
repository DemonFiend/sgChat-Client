# Suite 20 — Performance & Error States

## SETUP
- App launched, logged in as qa_admin
- On server view with channels visible
- Console error listener active for monitoring
- Network request listener active for monitoring

## TESTS

### Loading States

#### 20.01 — Initial app load shows skeleton or spinner (not blank screen)
```
ACTION:
  1. Close and relaunch the Electron app:
     await electronApp.close()
     electronApp = await _electron.launch(...)
     window = await electronApp.firstWindow()
  2. IMMEDIATELY take a screenshot before content loads:
     await window.screenshot({ path: 'qa-screenshots/s20-01a-loading.png' })
  3. Wait for load to complete:
     await window.waitForLoadState('load')
     await window.waitForTimeout(2000)
  4. Take screenshot after load:
     await window.screenshot({ path: 'qa-screenshots/s20-01b-loaded.png' })

ASSERT:
  1. First screenshot shows either:
     - A loading skeleton (animated placeholder elements)
     - A spinner or loading indicator
     - A splash screen with app branding
     - NOT a completely blank white or black screen
  2. Second screenshot shows the actual app UI
  3. Body text is different between screenshots (content loaded)
```

#### 20.02 — Channel switch shows loading indicator
```
PRECONDITION: Logged in, on a channel with messages

ACTION:
  1. Set up a listener for loading states:
     const loadingStates: boolean[] = [];
  2. Click a different channel:
     window.locator('button:has-text("announcements")')
       .or(window.locator('button:has-text("general")'))
       .first().click()
  3. IMMEDIATELY check for loading indicator:
     const hasLoadingIndicator = await window.locator('[class*="skeleton"], [role="progressbar"], [aria-busy="true"]')
       .or(window.locator('text=Loading'))
       .first().isVisible({ timeout: 1000 }).catch(() => false);
  4. Wait 3 seconds for messages to load
  5. Screenshot: qa-screenshots/s20-02-channel-loading.png

ASSERT:
  1. Either: a loading skeleton/spinner was briefly visible during transition
  2. Or: messages loaded fast enough that no loading state was needed (< 200ms)
  3. After loading: messages or empty state is shown
  4. No blank/white gap visible during transition
  5. Log whether loading indicator was observed
```

#### 20.03 — Image loading shows placeholder until loaded
```
ACTION:
  1. Navigate to a channel that has messages with images
  2. Scroll to find an image in the message list
  3. If images exist: check if they have loading placeholders:
     const imagePlaceholders = await window.evaluate(() => {
       const images = document.querySelectorAll('img');
       const results: { src: string; loading: string; hasPlaceholder: boolean }[] = [];
       images.forEach(img => {
         results.push({
           src: img.src?.substring(0, 60) || 'none',
           loading: img.getAttribute('loading') || 'eager',
           hasPlaceholder: !!img.closest('[class*="placeholder"], [class*="skeleton"]'),
         });
       });
       return results;
     });
  4. Screenshot: qa-screenshots/s20-03-image-loading.png

ASSERT:
  1. Images use lazy loading (loading="lazy") or have placeholder wrappers
  2. Or: images load quickly enough to not need placeholders
  3. No broken image icons visible (all images either loaded or have fallback)
  4. Log image loading attributes found
```

#### 20.04 — TanStack Query loading states shown appropriately
```
ACTION:
  1. Force a refetch by navigating away and back to server view:
     window.locator('button:has-text("Messages")').click()
     await window.waitForTimeout(1000)
     window.locator('button:has-text("Server")').click()
  2. Check for loading indicators during data fetch:
     const loadingVisible = await window.locator('[aria-busy="true"], [role="progressbar"]')
       .or(window.locator('[class*="skeleton"]'))
       .first().isVisible({ timeout: 2000 }).catch(() => false);
  3. Wait 5 seconds for data to load
  4. Screenshot: qa-screenshots/s20-04-tanstack-loading.png

ASSERT:
  1. During refetch: either loading state shown or data was cached (instant)
  2. After load: real data is visible (channels, members, messages)
  3. No stale/empty state persists after loading completes
  4. Log whether loading indicators were observed
```

### Error States

#### 20.05 — Server disconnect shows reconnection indicator
```
ACTION:
  1. Screenshot before disconnect: qa-screenshots/s20-05a-connected.png
  2. Simulate network interruption by blocking connections:
     await window.evaluate(() => {
       // Disable socket to simulate disconnect
       const io = (window as any).__socket || (window as any).io;
       if (io && io.disconnect) {
         io.disconnect();
       }
     });
  3. Wait 5 seconds for disconnect detection
  4. Screenshot after disconnect: qa-screenshots/s20-05b-disconnected.png
  5. Look for reconnection indicator:
     const hasDisconnectIndicator = await window.locator('text=Reconnecting')
       .or(window.locator('text=Disconnected'))
       .or(window.locator('text=Connection lost'))
       .or(window.locator('[class*="reconnect"], [class*="disconnect"]'))
       .first().isVisible({ timeout: 5000 }).catch(() => false);

ASSERT:
  1. hasDisconnectIndicator === true (user is informed of disconnect)
  2. Or: the app auto-reconnects within 10 seconds without visible disruption
  3. A visual indicator appears somewhere (banner, toast, or status icon change)
  4. The app does NOT silently fail with no indication

CLEANUP:
  1. Reconnect by reloading: await window.reload()
  2. Wait for app to reconnect
```

#### 20.06 — API error on message send shows feedback
```
ACTION:
  1. Navigate to a text channel
  2. Try sending a message (this should work normally):
     window.locator('textarea[placeholder*="Message"]').fill('QA test message for error states')
     window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. Wait 3 seconds
  4. Verify message was sent or error shown:
     const messageSent = await window.locator('text=QA test message for error states')
       .isVisible({ timeout: 5000 }).catch(() => false);
  5. Screenshot: qa-screenshots/s20-06-send-feedback.png

ASSERT:
  1. Either: message sent successfully and appears in chat
  2. Or: if server error occurred, an error toast/notification is shown to the user
  3. The message input does NOT silently fail (user gets feedback either way)
  4. On error: error message is user-friendly (not a raw stack trace)
```

#### 20.07 — Socket.IO disconnect shows visual indicator and auto-reconnects
```
ACTION:
  1. Check presence section to confirm connected:
     const onlineBefore = await window.locator('text=ONLINE').isVisible({ timeout: 5000 }).catch(() => false);
  2. Monitor for reconnection behavior (passive test):
     const connectionState = await window.evaluate(() => {
       // Check if socket connection state is accessible
       const state: Record<string, any> = {};
       // Look for socket.io client instance
       if ((window as any).__socketConnected !== undefined) {
         state.connected = (window as any).__socketConnected;
       }
       return state;
     });
  3. Screenshot: qa-screenshots/s20-07-socket-status.png

ASSERT:
  1. onlineBefore === true (currently connected)
  2. ONLINE section visible in member list (Socket.IO is working)
  3. The app has reconnection logic (not a single-shot connection)
  4. Log connection state info
```

#### 20.08 — Session expired redirects to login
```
ACTION:
  1. Simulate session expiry by clearing auth via IPC:
     const logoutResult = await window.evaluate(async () => {
       try {
         await (window as any).electronAPI?.auth?.logout();
         return 'logged-out';
       } catch (e: any) {
         return 'error: ' + e.message;
       }
     });
  2. Wait 5 seconds for the app to respond
  3. Screenshot: qa-screenshots/s20-08-session-expired.png

ASSERT:
  1. App redirects to login page:
     window.locator('input[name="email"]').isVisible() === true
  2. Or: an overlay prompts re-authentication
  3. The app does NOT stay on the main view with broken/empty data
  4. User is clearly informed they need to log in again

CLEANUP:
  1. Log back in as qa_admin:
     window.locator('input[name="email"]').fill('qa-admin@local.test')
     window.locator('input[name="password"]').fill('QATest123!')
     window.locator('button:has-text("Log In")').click()
  2. Wait up to 15 seconds for main app to load
```

### Empty States

#### 20.09 — Channel with no messages shows empty state
```
ACTION:
  1. Navigate to a channel that has no messages (or create a new empty channel if admin)
  2. If all channels have messages, look for the empty state pattern:
     const emptyState = await window.evaluate(() => {
       // Check current channel message area for empty state indicators
       const chatArea = document.querySelector('[class*="chat"], [class*="message-list"]');
       if (chatArea && chatArea.children.length <= 1) {
         return chatArea.textContent?.trim().substring(0, 200) || 'empty-no-text';
       }
       return 'has-messages';
     });
  3. Screenshot: qa-screenshots/s20-09-empty-channel.png

ASSERT:
  1. If channel is empty: a friendly empty state message is shown
  2. Empty state includes guidance (e.g., "Send the first message!" or similar)
  3. NOT a blank void with no text
  4. Message input is still visible and functional
  5. Log the empty state text found
```

#### 20.10 — No friends shows empty state
```
ACTION:
  1. Navigate to DM/friends view:
     window.locator('button:has-text("Messages")').click()
  2. Wait 3 seconds
  3. Look for friends section or tab:
     window.locator('button:has-text("Friends")').or(window.locator('text=Friends')).click()
       .catch(() => {}) // May not exist as separate tab
  4. Wait 2 seconds
  5. Screenshot: qa-screenshots/s20-10-no-friends.png

ASSERT:
  1. If no friends: empty state shown with guidance ("Add a friend" or similar)
  2. If friends exist: friend list is visible
  3. Either way: no blank void, always meaningful content or empty state
  4. An "Add Friend" button or action is accessible
```

#### 20.11 — No search results shows helpful message
```
ACTION:
  1. Open search/command palette:
     await window.keyboard.press('Control+k')
  2. Wait 2 seconds
  3. Type a search query that should return nothing:
     window.locator('input[placeholder*="Search"], input[type="search"], input[role="combobox"]')
       .first().fill('zzzznonexistentzzzzquery12345')
  4. Wait 3 seconds for search results
  5. Screenshot: qa-screenshots/s20-11-no-results.png

ASSERT:
  1. "No results" message is shown (not a blank dropdown)
  2. The message is helpful (e.g., "No results found" or "Try a different search")
  3. Search input remains focused and editable
  4. No error message or crash

CLEANUP:
  1. Press Escape to close search
```

#### 20.12 — No DM conversations shows empty state
```
ACTION:
  1. Navigate to DM view:
     window.locator('button:has-text("Messages")').click()
  2. Wait 3 seconds
  3. Check for DM list or empty state:
     const dmContent = await window.evaluate(() => {
       const dmArea = document.querySelector('[class*="dm-list"], [class*="conversation-list"]');
       return dmArea ? dmArea.textContent?.trim().substring(0, 200) : document.body.textContent?.substring(0, 200);
     });
  4. Screenshot: qa-screenshots/s20-12-no-dms.png

ASSERT:
  1. If no DMs: empty state message shown (not blank)
  2. If DMs exist: conversation list is visible with participants
  3. A way to start a new DM is visible
  4. Log what the DM area contains

CLEANUP:
  1. Navigate back to server view:
     window.locator('button:has-text("Server")').click()
```

### Performance

#### 20.13 — Many messages use virtualized list with smooth scrolling
```
ACTION:
  1. Navigate to a channel with many messages (e.g., "general")
  2. Wait 3 seconds for messages to load
  3. Check if message list uses virtualization:
     const listInfo = await window.evaluate(() => {
       // Look for virtualized container indicators
       const list = document.querySelector('[class*="message"], [role="list"]');
       const allMessages = document.querySelectorAll('[data-message-id]');
       const visibleHeight = list ? list.clientHeight : 0;
       const scrollHeight = list ? list.scrollHeight : 0;
       return {
         visibleMessages: allMessages.length,
         visibleHeight,
         scrollHeight,
         isVirtualized: scrollHeight > visibleHeight * 2, // More content than visible area
       };
     });
  4. Scroll up to load older messages:
     await window.locator('[role="list"], [class*="message-list"]').first()
       .evaluate(el => el.scrollTop = 0);
  5. Wait 2 seconds
  6. Screenshot: qa-screenshots/s20-13-virtualized-list.png

ASSERT:
  1. Message list renders without visible lag
  2. DOM contains a reasonable number of message elements (not 1000+)
  3. listInfo.isVirtualized === true if many messages exist (scroll height >> visible height)
  4. Scrolling is smooth (no jank — subjective from screenshots)
  5. Log visible message count and scroll metrics
```

#### 20.14 — Server with many channels renders without lag
```
ACTION:
  1. Measure time to render channel sidebar:
     const startTime = Date.now();
     const channelCount = await window.locator('button:has-text("#"), [class*="channel"]').count();
     const renderTime = Date.now() - startTime;
  2. Screenshot: qa-screenshots/s20-14-many-channels.png

ASSERT:
  1. Channel sidebar renders within 2 seconds
  2. channelCount > 0 (channels are visible)
  3. renderTime < 2000 (counting took less than 2 seconds)
  4. All channel names are readable (not clipped or overlapping)
  5. Log channel count and render time
```

#### 20.15 — Server with many members list performs well
```
ACTION:
  1. Ensure member list panel is visible (right sidebar on server view)
  2. Count members:
     const memberCount = await window.evaluate(() => {
       const members = document.querySelectorAll('[class*="member"], [data-user-id]');
       return members.length;
     });
  3. Scroll the member list:
     await window.locator('[class*="member-list"], [class*="members"]').first()
       .evaluate(el => el.scrollTop = el.scrollHeight)
       .catch(() => {});
  4. Wait 2 seconds
  5. Screenshot: qa-screenshots/s20-15-many-members.png

ASSERT:
  1. Member list renders (at least 1 member visible)
  2. Scrolling is responsive
  3. No visual glitches after scrolling
  4. Log member count
```

#### 20.16 — Rapid channel switching causes no memory leaks
```
ACTION:
  1. Collect console errors:
     const errors: string[] = [];
     window.on('console', msg => {
       if (msg.type() === 'error') errors.push(msg.text());
     });
  2. Get initial memory (if accessible):
     const memBefore = await window.evaluate(() => {
       return (performance as any).memory?.usedJSHeapSize || 0;
     });
  3. Rapidly switch between channels 10 times:
     for (let i = 0; i < 10; i++) {
       await window.locator('button:has-text("general")').click();
       await window.waitForTimeout(500);
       await window.locator('button:has-text("announcements")')
         .or(window.locator('button:has-text("random")'))
         .first().click();
       await window.waitForTimeout(500);
     }
  4. Get memory after:
     const memAfter = await window.evaluate(() => {
       return (performance as any).memory?.usedJSHeapSize || 0;
     });
  5. Screenshot: qa-screenshots/s20-16-rapid-switch.png

ASSERT:
  1. App is still responsive after rapid switching
  2. No "maximum update depth exceeded" errors in console
  3. No "Cannot update state on unmounted component" errors
  4. If memory stats available: memAfter is not drastically larger than memBefore
     (allow 50% growth — garbage collection may not have run)
  5. errors array has no critical errors (filter out benign warnings)
  6. Log error count and memory delta
```

### Error Boundaries

#### 20.17 — Component error caught by error boundary
```
ACTION:
  1. Check if error boundary component exists:
     const hasErrorBoundary = await window.evaluate(() => {
       // Look for error boundary fallback elements in the DOM
       const boundaries = document.querySelectorAll('[class*="error-boundary"], [data-error-boundary]');
       return {
         count: boundaries.length,
         // Check for React error boundary wrapper by looking at component structure
         hasReactBoundary: !!document.querySelector('[class*="ErrorBoundary"]'),
       };
     });
  2. Try to trigger a render error (carefully):
     // This is passive — we look for evidence of error boundary setup rather than
     // deliberately crashing the app
  3. Screenshot: qa-screenshots/s20-17-error-boundary.png

ASSERT:
  1. Error boundary infrastructure exists in the app
  2. No current error boundary fallback is visible (app is healthy)
  3. If an error occurs naturally: fallback UI is shown (not blank screen)
  4. Log error boundary detection results
```

#### 20.18 — Runtime error overlay (Electron)
```
ACTION:
  1. Verify crash reporter is available:
     const hasCrashReporter = await window.evaluate(() => {
       return typeof (window as any).electronAPI?.crashReport?.submit === 'function';
     });
  2. Check for error overlay infrastructure:
     const hasErrorOverlay = await window.evaluate(() => {
       // Look for error overlay components or global error handlers
       return {
         hasOnError: typeof window.onerror === 'function',
         hasOnUnhandledRejection: typeof window.onunhandledrejection === 'function',
         hasErrorHandler: !!(window as any).__errorHandler,
       };
     });
  3. Screenshot: qa-screenshots/s20-18-error-overlay.png

ASSERT:
  1. hasCrashReporter === true (crash reporting IPC is available)
  2. Global error handlers are set up (at least one of onerror or onunhandledrejection)
  3. The app has mechanisms to catch and report runtime errors
  4. Log error handler detection results
```

### Final Cleanup
```
Ensure we're logged in as qa_admin on the server view.
Clear any console error listeners.
Verify app is responsive after all performance tests.
```
