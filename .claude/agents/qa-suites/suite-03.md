# Suite 3 — Core Navigation & Routing

## SETUP
- App launched and logged in as qa_admin (Suite 1 handles setup/login)
- On server view with channels visible
- Window at default size

## TESTS

### Page Load & Auth State

#### 3.01 — Page loads based on auth state
```
ACTION:
  1. Detect current state:
     const hasMessageInput = await window.locator('textarea[placeholder*="Message"]').isVisible();
     const hasLogin = await window.locator('input[name="email"]').isVisible();
     const hasSetup = await window.locator('input[type="url"]').isVisible();
  2. Screenshot: qa-screenshots/s3-01-auth-state.png

ASSERT:
  1. Exactly one of hasMessageInput, hasLogin, hasSetup is true
  2. If logged in (hasMessageInput), channel sidebar is visible with at least one channel name
  3. If not logged in, perform login (Suite 1 steps) before continuing

SCREENSHOT: qa-screenshots/s3-01-auth-state.png
```

### Server List

#### 3.02 — Server icon visible in left sidebar
```
PRECONDITION: Logged in, on server view

ACTION:
  1. window.locator('button:has-text("Server")').click()
  2. await window.waitForTimeout(2000)
  3. Look for server icons in the leftmost sidebar area
  4. Screenshot: qa-screenshots/s3-02-server-icons.png

ASSERT:
  1. Server nav button is active/highlighted: window.locator('button:has-text("Server")') has an active style
  2. Channel sidebar is visible with channel names
  3. At least one category header visible (uppercase text like "GENERAL CHAT" or "VOICE CHANNELS")

SCREENSHOT: qa-screenshots/s3-02-server-icons.png
```

### Channel List Navigation

#### 3.03 — Click text channel → messages load in chat area
```
ACTION:
  1. Identify first text channel in sidebar:
     const firstChannel = window.locator('text=general').first()
  2. firstChannel.click()
  3. await window.waitForTimeout(2000)
  4. Screenshot: qa-screenshots/s3-03-channel-click.png

ASSERT:
  1. Chat area is visible: window.locator('textarea[placeholder*="Message"]').isVisible() === true
  2. Channel name appears in the chat header area
  3. Message area has content (messages or empty state text)
  4. The clicked channel appears selected/highlighted in sidebar

SCREENSHOT: qa-screenshots/s3-03-channel-click.png
```

#### 3.04 — Click second channel → messages change
```
ACTION:
  1. Note current chat content:
     const firstContent = await window.locator('[class*="message"], [class*="chat"]').first().innerText()
  2. Click a different channel (e.g. "announcements" or second visible channel):
     const channels = window.locator('[class*="channel"]').filter({ hasText: /^(?!.*GENERAL|.*VOICE)/ })
     OR use: window.locator('text=announcements').first().click()
     OR: click the second text channel visible in sidebar
  3. await window.waitForTimeout(2000)
  4. Screenshot: qa-screenshots/s3-04-second-channel.png

ASSERT:
  1. Message input textarea still visible
  2. Channel header text changed to reflect new channel
  3. Previously selected channel is no longer highlighted
  4. Newly selected channel IS highlighted

SCREENSHOT: qa-screenshots/s3-04-second-channel.png
```

#### 3.05 — Click each text channel in sequence → no errors
```
ACTION:
  1. Collect all clickable channel items in sidebar (non-category, non-voice):
     Iterate through visible channel name elements in the sidebar
  2. For each channel:
     a. channel.click()
     b. await window.waitForTimeout(1500)
     c. Verify no error boundary: window.locator('[class*="error-boundary"]').isVisible() === false
     d. Verify message input still present
  3. Screenshot after last channel: qa-screenshots/s3-05-all-channels.png

ASSERT:
  1. Every channel click results in message input remaining visible
  2. No error boundaries appeared during navigation
  3. No console errors (collect via window.on('console'))
  4. Log count of channels clicked

SCREENSHOT: qa-screenshots/s3-05-all-channels.png
```

### Voice Channels

#### 3.06 — Voice channels visible with icon
```
ACTION:
  1. Look for "VOICE CHANNELS" category header:
     window.locator('text=VOICE CHANNELS').isVisible()
  2. Identify voice channel entries below the header
  3. Screenshot: qa-screenshots/s3-06-voice-channels.png

ASSERT:
  1. "VOICE CHANNELS" category header is visible (or similar category name)
  2. At least one voice channel is listed under the category
  3. Voice channels have a distinct icon (speaker/audio icon differentiating from text channels)
  4. Voice channels are visually distinct from text channels

SCREENSHOT: qa-screenshots/s3-06-voice-channels.png
```

### Category Headers

#### 3.07 — Category header collapse/expand toggle
```
ACTION:
  1. Locate a category header (e.g. "GENERAL CHAT"):
     const categoryHeader = window.locator('text=GENERAL CHAT').first()
  2. Count channels visible under it before collapse:
     const beforeCount = await window.locator('[class*="channel"]').count()
  3. categoryHeader.click()
  4. await window.waitForTimeout(500)
  5. Screenshot collapsed: qa-screenshots/s3-07a-collapsed.png
  6. Count channels visible after collapse:
     const afterCount = await window.locator('[class*="channel"]').count()
  7. categoryHeader.click()
  8. await window.waitForTimeout(500)
  9. Screenshot expanded: qa-screenshots/s3-07b-expanded.png

ASSERT:
  1. afterCount < beforeCount (channels were hidden on collapse)
  2. After second click, channel count restores to original
  3. Category header remains visible in both states
  4. Category header has a visual toggle indicator (chevron/arrow rotates)

SCREENSHOT: qa-screenshots/s3-07a-collapsed.png, qa-screenshots/s3-07b-expanded.png
```

### Channel Active State

#### 3.08 — Selected channel has highlighted/active styling
```
ACTION:
  1. Click "general" channel: window.locator('text=general').first().click()
  2. await window.waitForTimeout(1000)
  3. Get background color of the selected channel element:
     const activeStyle = await window.locator('text=general').first().evaluate(el => {
       const styles = getComputedStyle(el.closest('[class*="channel"]') || el);
       return { bg: styles.backgroundColor, color: styles.color, fontWeight: styles.fontWeight };
     })
  4. Get style of a NON-selected channel for comparison
  5. Screenshot: qa-screenshots/s3-08-active-channel.png

ASSERT:
  1. Active channel has a different background color than inactive channels
  2. OR active channel has bolder/different text weight
  3. OR active channel has an accent-colored indicator
  4. Visual distinction exists between active and inactive channels

SCREENSHOT: qa-screenshots/s3-08-active-channel.png
```

### Browser Navigation (N/A for Electron)

#### 3.09 — Browser Back/Forward — N/A
```
NOTE: Browser Back/Forward buttons do not apply in Electron thin client.
      The app does not have standard browser chrome navigation.
      Electron BrowserWindow does not expose Back/Forward by default.
      SKIP — documented as not applicable.
```

#### 3.10 — Direct URL entry — N/A
```
NOTE: Direct URL entry in address bar does not apply in Electron.
      The app loads from server URL configured in electron-store.
      There is no user-accessible address bar.
      SKIP — documented as not applicable.
```

#### 3.11 — Non-existent route redirect — N/A
```
NOTE: Route handling is server-side (SPA fallback).
      Electron loads the server URL directly; the web app handles all routing.
      No client-side 404 redirect to test from Electron.
      SKIP — documented as not applicable.
```

### DM Navigation

#### 3.12 — DM icon → Direct Messages view
```
ACTION:
  1. window.locator('button:has-text("Messages")').click()
  2. await window.waitForTimeout(2000)
  3. Screenshot: qa-screenshots/s3-12-dm-view.png

ASSERT:
  1. window.locator('text=Direct Messages').isVisible() === true
  2. Server channel sidebar is no longer visible (or replaced by DM list)
  3. "Messages" nav button appears active/highlighted
  4. DM list area or empty state ("No conversations yet") is visible

SCREENSHOT: qa-screenshots/s3-12-dm-view.png
```

#### 3.13 — Back to Server from DM view
```
PRECONDITION: Currently in DM view (test 3.12)

ACTION:
  1. window.locator('button:has-text("Server")').click()
  2. await window.waitForTimeout(2000)
  3. Screenshot: qa-screenshots/s3-13-back-to-server.png

ASSERT:
  1. Channel sidebar is visible again with channel names
  2. Message input textarea visible
  3. "Server" nav button appears active/highlighted
  4. DM list is no longer visible

SCREENSHOT: qa-screenshots/s3-13-back-to-server.png
```

### TitleBar / Header Navigation

#### 3.14 — Server header button clickable
```
ACTION:
  1. window.locator('button:has-text("Server")').click()
  2. await window.waitForTimeout(1000)
  3. Screenshot: qa-screenshots/s3-14-server-nav.png

ASSERT:
  1. Button responds to click (no error)
  2. Server view is active — channels visible
  3. Button has active/highlighted state

SCREENSHOT: qa-screenshots/s3-14-server-nav.png
```

#### 3.15 — Friends header button clickable
```
ACTION:
  1. window.locator('button:has-text("Friends")').click()
  2. await window.waitForTimeout(2000)
  3. Screenshot: qa-screenshots/s3-15-friends-nav.png

ASSERT:
  1. Friends view loads (friends list or empty state)
  2. "Friends" button appears active
  3. No error boundary visible
  4. Previous view (server) is replaced

SCREENSHOT: qa-screenshots/s3-15-friends-nav.png
```

#### 3.16 — Settings header button clickable
```
ACTION:
  1. window.locator('button:has-text("Settings")').click()
  2. await window.waitForTimeout(2000)
  3. Screenshot: qa-screenshots/s3-16-settings-nav.png

ASSERT:
  1. Settings panel or page loads
  2. Settings categories/options visible (e.g., "Profile", "Appearance", "Notifications")
  3. "Settings" button appears active
  4. No error boundary

SCREENSHOT: qa-screenshots/s3-16-settings-nav.png

CLEANUP:
  1. Navigate back: window.locator('button:has-text("Server")').click()
```

#### 3.17 — Admin header button clickable (qa_admin has admin role)
```
ACTION:
  1. window.locator('button:has-text("Admin")').click()
  2. await window.waitForTimeout(2000)
  3. Screenshot: qa-screenshots/s3-17-admin-nav.png

ASSERT:
  1. Admin panel loads with admin-specific options
  2. "Admin" button appears active
  3. No error or access denied for qa_admin user
  4. Admin features visible (user management, server settings, etc.)

SCREENSHOT: qa-screenshots/s3-17-admin-nav.png

CLEANUP:
  1. Navigate back: window.locator('button:has-text("Server")').click()
```

### Window Resize

#### 3.18 — Resize to 800x600 → layout usable, no overflow
```
ACTION:
  1. Set window size to 800x600:
     await electronApp.evaluate(({ BrowserWindow }) => {
       BrowserWindow.getAllWindows()[0]?.setSize(800, 600);
     })
  2. await window.waitForTimeout(1500)
  3. Screenshot: qa-screenshots/s3-18-small-window.png
  4. Check for horizontal overflow:
     const hasOverflow = await window.evaluate(() => {
       return document.documentElement.scrollWidth > document.documentElement.clientWidth;
     })

ASSERT:
  1. hasOverflow === false (no horizontal scrollbar)
  2. Message input still visible: window.locator('textarea[placeholder*="Message"]').isVisible()
  3. At least some channel sidebar content is visible or accessible
  4. No elements overflow off-screen or overlap badly
  5. App is still functional — not crashed or broken layout

SCREENSHOT: qa-screenshots/s3-18-small-window.png
```

#### 3.19 — Resize to 2560x1440 → layout scales, no thin strip
```
ACTION:
  1. Set window size to 2560x1440:
     await electronApp.evaluate(({ BrowserWindow }) => {
       BrowserWindow.getAllWindows()[0]?.setSize(2560, 1440);
     })
  2. await window.waitForTimeout(1500)
  3. Screenshot: qa-screenshots/s3-19-large-window.png
  4. Check chat area width:
     const chatWidth = await window.locator('textarea[placeholder*="Message"]').evaluate(el => {
       return el.closest('[class*="chat"], [class*="content"], main')?.getBoundingClientRect().width || 0;
     })

ASSERT:
  1. chatWidth > 400 (chat area expanded, not a thin strip)
  2. Message input visible and usable
  3. Sidebar visible with channels
  4. Member list visible on right side (if applicable at this size)
  5. No massive empty gaps — content fills the space appropriately

SCREENSHOT: qa-screenshots/s3-19-large-window.png

CLEANUP:
  1. Restore default window size:
     await electronApp.evaluate(({ BrowserWindow }) => {
       BrowserWindow.getAllWindows()[0]?.setSize(1280, 720);
     })
```

### All Nav Buttons Cycle Without Error

#### 3.20 — Rapid navigation cycle: Server → Messages → Friends → Settings → Admin → Server
```
ACTION:
  1. Collect console errors:
     const errors: string[] = [];
     window.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  2. window.locator('button:has-text("Server")').click()
     await window.waitForTimeout(1000)
  3. window.locator('button:has-text("Messages")').click()
     await window.waitForTimeout(1000)
  4. window.locator('button:has-text("Friends")').click()
     await window.waitForTimeout(1000)
  5. window.locator('button:has-text("Settings")').click()
     await window.waitForTimeout(1000)
  6. window.locator('button:has-text("Admin")').click()
     await window.waitForTimeout(1000)
  7. window.locator('button:has-text("Server")').click()
     await window.waitForTimeout(1000)
  8. Screenshot: qa-screenshots/s3-20-nav-cycle.png

ASSERT:
  1. No error boundary appeared: window.locator('[class*="error-boundary"]').isVisible() === false
  2. errors array has no critical React errors (filter benign warnings)
  3. Final state: back on server view with channels visible
  4. Message input visible — app is functional after full cycle
  5. Body text does NOT contain "Something went wrong"

SCREENSHOT: qa-screenshots/s3-20-nav-cycle.png
```
