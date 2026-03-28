# Suite 9 — User Profiles & Popovers

## SETUP
- App launched, logged in as qa_admin
- On server view with at least one channel containing messages from other users
- Navigate to a text channel with messages: click a channel in the sidebar
- Wait for messages to load

## TESTS

### Popover Opening

#### 9.01 — Click username in message opens popover
```
ACTION:
  1. Navigate to a channel that has messages from another user (e.g., qa_user or any non-self user)
  2. Wait 3 seconds for messages to load
  3. Click on a username in a message (the clickable author name above or beside the message):
     window.locator('[data-user-id]').first().click()
     OR: Click a username text element that is a button/link in the message header
  4. Wait 2 seconds for popover to render (it fetches profile data)
  5. Screenshot

ASSERT:
  1. A popover/popup element appears (fixed position overlay with user profile info)
  2. Popover is visible and not behind other elements
  3. Popover contains user information (not empty)
```

#### 9.02 — Popover shows avatar, username, display name, status
```
PRECONDITION: Popover is open (from 9.01)

ACTION:
  1. Screenshot the full popover

ASSERT:
  1. Avatar visible: popover contains an img element or avatar fallback within the popover
  2. Display name visible as a heading (h3 element with the user's display name):
     The popover contains text matching the user's display name
  3. Username visible: text with the username (e.g., "qa_user" or "@qa_user")
  4. Status indicator visible: a small colored dot (online/offline/idle/dnd):
     - Online: green dot
     - Idle: yellow dot
     - DND: red dot
     - Offline: gray dot
  5. Status label text visible (e.g., "Online", "Offline", "Idle", "Do Not Disturb")
```

#### 9.03 — Popover shows banner if user has one set
```
PRECONDITION: The target user has a profile banner set (may need manual setup)

ACTION:
  1. Open popover for a user who has a banner_url set
  2. Wait 2 seconds for profile data to load
  3. Screenshot the top of the popover

ASSERT:
  1. Banner area at top of popover shows an image (background-image style or img element)
     — if the user has a banner, it should appear as the header background
  2. If no banner: the header shows a colored gradient or solid color based on role color
  3. Avatar overlaps the banner/header area (positioned at the bottom of the banner)
```

#### 9.04 — "Message" button opens DM conversation
```
PRECONDITION: Popover is open for a user who is a friend of qa_admin

ACTION:
  1. Open popover for qa_user (who should be a friend)
  2. Wait 2 seconds for friend status to load
  3. Look for the "Message" button in the popover:
     window.locator('button:has-text("Message")').click()
  4. Wait 3 seconds for DM view to open
  5. Screenshot

ASSERT:
  1. Popover closes after clicking "Message"
  2. App navigates to DM view with qa_user selected
  3. Chat panel opens showing DM conversation with qa_user
  4. Message input textarea is visible and ready for typing:
     window.locator('textarea[placeholder*="Message"]').isVisible() === true

CLEANUP:
  1. Navigate back to server view: window.locator('button:has-text("Back to Server")').click()
     OR: window.locator('button:has-text("Server")').click()
```

#### 9.05 — "Add Friend" button sends friend request
```
PRECONDITION: Popover is open for a user who is NOT a friend of qa_admin

ACTION:
  1. Open popover for a non-friend user
  2. Wait 2 seconds for friend status to load
  3. Look for "Add Friend" button:
     window.locator('button:has-text("Add Friend")').click()
  4. Wait 2 seconds
  5. Screenshot

ASSERT:
  1. Button text changes to "Request Pending" or becomes disabled
  2. No error alert
  3. Friend request is sent (can verify in DM view → Pending tab later)

CLEANUP:
  1. Close popover by clicking outside or pressing Escape
```

#### 9.06 — Role color displayed on username in popover
```
ACTION:
  1. Open popover for a user who has a role with a custom color (e.g., admin role)
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. The display name heading (h3) has a custom color via inline style:
     Read the color property:
     window.evaluate(() => {
       const nameEl = document.querySelector('[class*="popover"] h3') // approximate
       return nameEl ? getComputedStyle(nameEl).color : null
     })
  2. Color is NOT the default text color — it should match the user's role color
  3. If user has no role color, it falls back to default text-primary color
```

#### 9.07 — Custom status displayed in popover
```
PRECONDITION: Target user has a custom status set

ACTION:
  1. Open popover for a user with a custom status
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. Custom status text visible in the popover (below the status indicator)
  2. Status is rendered as text in a styled container (bg-bg-secondary rounded box)
  3. Text content matches the user's custom_status value
```

#### 9.08 — Bio / "About Me" section displayed
```
PRECONDITION: Target user has a bio set

ACTION:
  1. Open popover for a user with a bio
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. "About Me" section header visible: window.locator('text=About Me').isVisible() === true
  2. Bio text visible below the header
  3. Bio text preserves whitespace/newlines (whitespace-pre-wrap)
```

### Popover from Different Locations

#### 9.09 — Click username in member list opens same popover
```
ACTION:
  1. Navigate to server view with member list visible on the right
  2. Click on a username in the member list sidebar (right side)
  3. Wait 2 seconds for popover
  4. Screenshot

ASSERT:
  1. Same popover UI appears as when clicking a username in a message
  2. Popover shows avatar, display name, username, status
  3. Action buttons visible (Message, Add Friend, etc.)
  4. Popover is positioned correctly (not off-screen)

CLEANUP:
  1. Close popover: window.keyboard.press('Escape')
```

#### 9.10 — Popover for yourself shows correct info
```
ACTION:
  1. Find own message in the chat or own entry in member list
  2. Click on own username to open popover
  3. Wait 2 seconds
  4. Screenshot

ASSERT:
  1. Popover opens showing qa_admin's profile
  2. Display name matches qa_admin's display name
  3. Username shows "qa_admin" or "@qa_admin"
  4. Status shows as online
  5. "Message" and "Add Friend" buttons are NOT shown (isCurrentUser is true)
  6. No action buttons for self — just profile view
```

### Popover Interaction

#### 9.11 — Close popover by clicking outside
```
ACTION:
  1. Open a user popover (click any username)
  2. Wait 2 seconds — confirm popover is visible
  3. Screenshot: popover open
  4. Click on an empty area outside the popover (e.g., the chat background):
     window.locator('body').click({ position: { x: 10, y: 10 } })
  5. Wait 1 second
  6. Screenshot: popover closed

ASSERT:
  1. Popover disappears after clicking outside
  2. Underlying UI is interactive again
```

#### 9.12 — Close popover with Escape key
```
ACTION:
  1. Open a user popover (click any username)
  2. Wait 2 seconds — confirm popover is visible
  3. window.keyboard.press('Escape')
  4. Wait 1 second
  5. Screenshot

ASSERT:
  1. Popover disappears after pressing Escape
  2. No other modal or dialog opens
```

#### 9.13 — Popover position does not overflow viewport
```
ACTION:
  1. Click on a username at the far right of the screen (member list, last entry)
  2. Wait 2 seconds
  3. Screenshot
  4. Measure popover position:
     const popoverRect = await window.evaluate(() => {
       const el = document.querySelector('[class*="fixed"][class*="z-"]');
       return el ? el.getBoundingClientRect() : null;
     });

ASSERT:
  1. Popover left edge >= 0 (not off left side)
  2. Popover right edge <= viewport width (not off right side)
  3. Popover top edge >= 0 (not off top)
  4. Popover bottom edge <= viewport height (not off bottom)
  5. Popover is fully visible within the window

CLEANUP:
  1. Close popover: window.keyboard.press('Escape')
```

### Voice Controls in Popover

#### 9.14 — Popover for user in voice channel shows voice controls
```
REQUIRES LIVEKIT — verify manually if not available

PRECONDITION: Another user is connected to a voice channel, and qa_admin is also in the same voice channel

ACTION:
  1. Open popover for the user in the voice channel
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. Voice controls section visible in the popover (if showVoiceControls is true)
  2. Volume slider visible
  3. Local mute toggle visible
  4. If user has mod permissions: server mute/deafen/disconnect/move buttons visible
```

### Moderation Actions in Popover

#### 9.15 — Moderator sees warn/kick/ban buttons for other users
```
PRECONDITION: qa_admin has moderator permissions (can warn, kick, ban members)

ACTION:
  1. Open popover for a non-admin user
  2. Scroll down in the popover to the moderation section
  3. Wait 2 seconds
  4. Screenshot

ASSERT:
  1. If qa_admin has canWarnMembers: "Warn" button visible
  2. If qa_admin has canKickMembers: "Kick" button visible
  3. If qa_admin has canBanMembers: "Ban" button visible
  4. These buttons are NOT visible on the popover for qa_admin's own profile
  5. Clicking a mod action button shows a confirmation dialog with reason field
```

#### 9.16 — Warn action shows confirmation dialog
```
PRECONDITION: qa_admin has warn permission, popover open for another user

ACTION:
  1. Click "Warn" button in the popover
  2. Wait 1 second
  3. Screenshot the confirmation dialog

ASSERT:
  1. Confirmation dialog appears within the popover
  2. Reason input field visible (text input for moderation reason)
  3. Confirm and Cancel buttons visible
  4. Pressing Escape closes the confirmation dialog (not the whole popover)

CLEANUP:
  1. Press Escape to close the confirmation dialog
  2. Press Escape again to close the popover
```

### Final Cleanup
```
Ensure:
  1. All popovers closed
  2. Logged in as qa_admin
  3. On server view
```
