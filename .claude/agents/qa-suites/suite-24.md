# Suite 24 — Server Sidebar & UI Parity

## SETUP
- App launched, logged in as qa_admin
- On server view with channels visible
- A second server exists (or second channel with unread messages) for badge tests
- qa_user exists for @mention tests

## TESTS

### Unread/Mention Badges

#### 24.01 — Message in other channel → white unread pill on server icon
```
PRECONDITION: Logged in, viewing one channel. Another channel receives a new message (from qa_user or another session).

ACTION:
  1. Ensure we're in a channel (e.g. #general)
  2. Have qa_user send a message in a different channel (e.g. #random)
  3. Wait 3 seconds for real-time update
  4. window.screenshot({ path: 'qa-screenshots/s24-01-unread-pill.png' })

ASSERT:
  1. White unread indicator pill appears next to the channel with new message in sidebar
  2. The pill is visible without scrolling (if channel is in view)
  3. Current channel does NOT show unread pill
```

#### 24.02 — @mention → red badge with count
```
ACTION:
  1. Have qa_user send a message mentioning @qa_admin in a different channel
  2. Wait 3 seconds
  3. window.screenshot({ path: 'qa-screenshots/s24-02-mention-badge.png' })

ASSERT:
  1. Red badge with number appears on the channel in sidebar
  2. Badge shows count (at least "1")
  3. Badge is red/colored differently from the white unread pill
  4. If server icon in server list also has a badge, verify it shows there too
```

#### 24.03 — Clicking channel with unread clears badges
```
PRECONDITION: Unread/mention badges visible from 24.01/24.02

ACTION:
  1. Click the channel that has unread messages/mentions
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s24-03-badges-cleared.png' })

ASSERT:
  1. White unread pill is gone from that channel
  2. Red mention badge is gone from that channel
  3. Messages are now visible in the chat area
  4. The channel appears as "read" state in sidebar
```

#### 24.04 — DM button shows unread count
```
ACTION:
  1. Have qa_user send a DM to qa_admin
  2. Wait 3 seconds (stay on server view, do not open DMs)
  3. window.screenshot({ path: 'qa-screenshots/s24-04-dm-unread.png' })

ASSERT:
  1. DM/Messages button in the navigation shows unread badge/count
  2. Badge number is at least 1
  3. Badge is visible on the "Messages" tab/button in TitleBar
```

### Loading Skeleton

#### 24.05 — Hard refresh → skeleton layout appears
```
ACTION:
  1. window.reload()
  2. Immediately take screenshot (within 500ms):
     window.screenshot({ path: 'qa-screenshots/s24-05-skeleton-loading.png' })
  3. Wait for full load (up to 15 seconds)
  4. window.screenshot({ path: 'qa-screenshots/s24-05-skeleton-loaded.png' })

ASSERT:
  1. First screenshot shows skeleton/loading state (placeholder elements)
  2. Skeleton layout is visible (grey shimmer bars or placeholder shapes)
  3. Second screenshot shows the fully loaded app
```

#### 24.06 — Skeleton matches app structure
```
PRECONDITION: Capture skeleton from 24.05

ACTION:
  1. Compare skeleton screenshot to loaded screenshot visually

ASSERT:
  1. Skeleton has a sidebar-shaped region on the left
  2. Skeleton has a main content area in the center
  3. Skeleton has a member list region on the right (if applicable)
  4. Layout proportions roughly match the loaded app
```

#### 24.07 — Skeleton animates (shimmer effect)
```
ACTION:
  1. During reload, capture two screenshots 500ms apart:
     window.reload()
     window.screenshot({ path: 'qa-screenshots/s24-07-skeleton-frame1.png' })
     Wait 500ms
     window.screenshot({ path: 'qa-screenshots/s24-07-skeleton-frame2.png' })

ASSERT:
  1. Skeleton elements have animation CSS (animation or @keyframes present)
  2. Visual difference between the two frames (shimmer moved)
     OR: skeleton elements have CSS animation property set
```

### Command Palette

#### 24.08 — Ctrl+K opens command palette
```
PRECONDITION: Logged in, on server view, no modals open

ACTION:
  1. window.keyboard.press('Control+k')
  2. Wait 1 second
  3. window.screenshot({ path: 'qa-screenshots/s24-08-command-palette.png' })

ASSERT:
  1. Command palette overlay/modal is visible
  2. Search input is visible with placeholder containing "Search"
  3. Search input is auto-focused (can immediately type)
```

#### 24.09 — Type channel name → channel results appear
```
PRECONDITION: Command palette open from 24.08

ACTION:
  1. Type a known channel name (e.g. 'general') into the search input
  2. Wait 1 second
  3. window.screenshot({ path: 'qa-screenshots/s24-09-channel-results.png' })

ASSERT:
  1. Results list shows matching channels
  2. Channel name "general" appears in results
  3. Channel results have a channel icon (# symbol or channel icon)
  4. Results are filtered to match the search query
```

#### 24.10 — Type username → member results appear
```
ACTION:
  1. Clear the search input
  2. Type a known username (e.g. 'qa') into the search input
  3. Wait 1 second
  4. window.screenshot({ path: 'qa-screenshots/s24-10-member-results.png' })

ASSERT:
  1. Results list shows matching members/users
  2. At least one user result visible (e.g. qa_admin or qa_user)
  3. User results show avatar or user icon
```

#### 24.11 — Type "settings" or "mute" → quick action results
```
ACTION:
  1. Clear the search input
  2. Type 'settings' into the search input
  3. Wait 1 second
  4. window.screenshot({ path: 'qa-screenshots/s24-11-quick-actions.png' })

ASSERT:
  1. Quick action results appear (e.g. "Open Settings", "Notification Settings")
  2. Results are contextual actions, not just text matches
  3. Clear and type 'mute':
  4. Mute-related quick action appears (e.g. "Mute Channel", "Mute Server")
```

#### 24.12 — Arrow keys navigate results
```
PRECONDITION: Command palette open with results visible

ACTION:
  1. Type a search term that produces multiple results
  2. window.keyboard.press('ArrowDown')
  3. Wait 300ms
  4. window.screenshot({ path: 'qa-screenshots/s24-12-arrow-down.png' })
  5. window.keyboard.press('ArrowDown')
  6. Wait 300ms
  7. window.screenshot({ path: 'qa-screenshots/s24-12-arrow-down2.png' })
  8. window.keyboard.press('ArrowUp')
  9. Wait 300ms
  10. window.screenshot({ path: 'qa-screenshots/s24-12-arrow-up.png' })

ASSERT:
  1. First ArrowDown highlights/selects the first result
  2. Second ArrowDown moves highlight to second result
  3. ArrowUp moves highlight back up one
  4. Highlighted item has distinct visual styling (background color change)
```

#### 24.13 — Escape closes command palette
```
PRECONDITION: Command palette open

ACTION:
  1. window.keyboard.press('Escape')
  2. Wait 500ms
  3. window.screenshot({ path: 'qa-screenshots/s24-13-palette-closed.png' })

ASSERT:
  1. Command palette is no longer visible
  2. Main app is visible behind (chat area, sidebar)
  3. No overlay or modal remaining
  4. Focus returns to the main app
```

### Notification Panel Parity

#### 24.14 — Bell icon in TitleBar opens notification panel
```
PARITY CHECK: Server web UI has NotificationPanel with unread/read sections. Client must match.

ACTION:
  1. Locate the bell icon in the TitleBar (right side, near window controls)
  2. Check for unread count badge on the bell
  3. window.screenshot({ path: 'qa-screenshots/s24-14-bell-before.png' })
  4. Click the bell icon
  5. Wait 2 seconds
  6. window.screenshot({ path: 'qa-screenshots/s24-14-notification-panel.png' })

ASSERT:
  1. Notification panel opens (fixed position, slides in or appears)
  2. Panel has a header with title ("Notifications" or similar)
  3. Panel shows either notifications or an empty state
  4. Close button (X) visible in panel header
```

#### 24.15 — Notification panel shows unread and read sections
```
ACTION:
  1. With notification panel open, examine the content
  2. window.screenshot({ path: 'qa-screenshots/s24-15-notif-sections.png' })

ASSERT:
  1. If notifications exist: unread notifications appear at top, read below
  2. Each notification shows: content text, timestamp, source (channel/user)
  3. "Mark All Read" button visible if unread notifications exist
  4. Individual notification has mark-as-read (checkmark) and delete (trash) icons
  5. If no notifications: empty state text like "No notifications" or "All caught up"
```

#### 24.16 — Mark all read clears unread section
```
PRECONDITION: At least one unread notification exists

ACTION:
  1. Click "Mark All Read" button
  2. Wait 1 second
  3. window.screenshot({ path: 'qa-screenshots/s24-16-marked-read.png' })

ASSERT:
  1. Unread section is now empty (all moved to read section)
  2. Unread count badge on bell icon updated (removed or shows 0)
  3. No error toast
```

#### 24.17 — Close notification panel
```
ACTION:
  1. Click the X button on the notification panel
  2. Wait 1 second
  3. window.screenshot({ path: 'qa-screenshots/s24-17-panel-closed.png' })

ASSERT:
  1. Notification panel is no longer visible
  2. Main app content visible behind
  3. Bell icon still visible in TitleBar
```

### Toast System Parity

#### 24.18 — Toast notifications appear and auto-dismiss
```
PARITY CHECK: Server web UI uses NotificationToast with Framer Motion. Client must match.

ACTION:
  1. Trigger a toast by performing an action that creates one (e.g. copy message text,
     pin a message, or send a message that triggers a success toast)
  2. Wait 1 second
  3. window.screenshot({ path: 'qa-screenshots/s24-18-toast.png' })
  4. Wait 5 seconds for auto-dismiss
  5. window.screenshot({ path: 'qa-screenshots/s24-18-toast-dismissed.png' })

ASSERT:
  1. Toast appears in a consistent position (top-right or bottom-right)
  2. Toast shows: icon, title/message text
  3. Toast has appropriate color for type (success=green, warning=yellow, error=red)
  4. Toast auto-dismisses after timeout (~5 seconds)
  5. Second screenshot shows toast is gone
```

### Final Cleanup
```
Ensure command palette is closed.
Ensure notification panel is closed.
Ensure we're logged in as qa_admin on server view.
Clear any unread badges by visiting affected channels.
```
