# Suite 8 — DM Messaging & Calls

## SETUP
- App launched, logged in as qa_admin
- Navigate to DM view: `window.locator('button:has-text("Messages")').click()`
- qa_admin and qa_user must be friends (complete Suite 7 friend acceptance first)
- Select qa_user from the friend list to open a DM conversation

## TESTS

### DM Messaging

#### 8.01 — Open DM with a friend
```
ACTION:
  1. window.locator('button:has-text("Messages")').click()
  2. Wait 2 seconds for DM sidebar to load
  3. window.locator('button:has-text("All")').click()
  4. Click on qa_user in the friend list to open a DM:
     window.locator('button:has-text("qa_user")').first().click()
  5. Wait 2 seconds for chat panel to load
  6. Screenshot

ASSERT:
  1. Chat panel opens on the right side
  2. Friend's name/display name visible in the chat header
  3. Message input textarea visible:
     window.locator('textarea[placeholder*="Message"]').isVisible() === true
  4. Chat area is visible (either empty state or message history)
```

#### 8.02 — Send a DM message
```
PRECONDITION: DM conversation open with qa_user (from 8.01)

ACTION:
  1. const testMessage = 'QA test DM message ' + Date.now()
  2. window.locator('textarea[placeholder*="Message"]').fill(testMessage)
  3. Screenshot: filled input
  4. window.locator('textarea[placeholder*="Message"]').press('Enter')
  5. Wait 3 seconds for message to send and appear
  6. Screenshot: sent message

ASSERT:
  1. Message input is cleared after sending
  2. The sent message appears in the chat area:
     window.locator(`text=${testMessage}`).isVisible() === true
  3. Message shows the current user's avatar or username identifier
  4. Message has a timestamp
  5. No error alert visible
```

#### 8.03 — Real-time DM delivery (MULTI-USER — requires second Electron instance or manual verification)
```
NOTE: MULTI-USER — requires second Electron instance or manual verification.

ACTION (sequential single-user approach):
  1. As qa_admin, send a DM to qa_user with unique text: 'Realtime test ' + Date.now()
  2. Log out of qa_admin
  3. Log in as qa_user
  4. Navigate to DM view
  5. Select qa_admin from friend list
  6. Wait 2 seconds
  7. Screenshot

ASSERT:
  1. The message sent by qa_admin appears in qa_user's DM chat
  2. Message content matches exactly
  3. Message shows qa_admin as the sender

CLEANUP:
  1. Log out of qa_user, log back in as qa_admin
```

#### 8.04 — Unread indicator on friend with new DM (MULTI-USER — requires second Electron instance or manual verification)
```
NOTE: MULTI-USER — requires second Electron instance or manual verification.

ACTION:
  1. As qa_user, send a DM to qa_admin
  2. Switch to qa_admin session
  3. Navigate to DM view — do NOT click on qa_user's conversation yet
  4. Screenshot the friend list

ASSERT:
  1. qa_user's entry in the friend list shows an unread count badge
  2. Badge is a number (e.g., "1") in a red/danger-colored pill
  3. After clicking on qa_user's conversation, the badge disappears
```

#### 8.05 — DM message history loads on conversation open
```
PRECONDITION: At least one message exists in DM with qa_user

ACTION:
  1. Navigate away: window.locator('button:has-text("Server")').click()
  2. Wait 2 seconds
  3. Navigate back: window.locator('button:has-text("Messages")').click()
  4. window.locator('button:has-text("All")').click()
  5. Select qa_user from friend list
  6. Wait 3 seconds for messages to load
  7. Screenshot

ASSERT:
  1. Previous messages are visible in the chat area
  2. Messages are in chronological order (oldest at top, newest at bottom)
  3. Each message shows content, sender info, and timestamp
  4. No loading spinner visible after messages load
```

#### 8.06 — Message features work in DMs (edit, delete, reply, reactions)
```
PRECONDITION: DM conversation open with at least one sent message

ACTION — Edit:
  1. Hover over a message sent by qa_admin to reveal action buttons
  2. Look for edit button or right-click context menu
  3. If edit UI appears, click edit
  4. Change message content to 'Edited DM message ' + Date.now()
  5. Confirm edit (press Enter or click Save)
  6. Wait 2 seconds
  7. Screenshot

ASSERT — Edit:
  1. Message content updates to the new text
  2. "(edited)" indicator appears on the message

ACTION — Delete:
  1. Send a new test message: 'Delete me ' + Date.now()
  2. Wait for it to appear
  3. Hover over the message to reveal action buttons
  4. Click delete button
  5. Confirm deletion if confirmation dialog appears
  6. Wait 2 seconds
  7. Screenshot

ASSERT — Delete:
  1. Message is removed from the chat area
  2. No error messages

ACTION — Reply:
  1. Hover over an existing message to reveal action buttons
  2. Click the reply button
  3. Reply indicator appears above the message input showing the original message
  4. Type reply text: 'This is a reply ' + Date.now()
  5. Press Enter to send
  6. Wait 2 seconds
  7. Screenshot

ASSERT — Reply:
  1. Reply message appears in chat with a reference to the original message
  2. Reply indicator above the new message shows original message content or author

ACTION — Reactions:
  1. Hover over a message to reveal action buttons
  2. Click the reaction button (emoji icon)
  3. Reaction picker appears
  4. Click a reaction emoji
  5. Wait 2 seconds
  6. Screenshot

ASSERT — Reactions:
  1. Reaction appears below the message
  2. Reaction shows the emoji and a count
```

#### 8.07 — Send empty message is prevented
```
ACTION:
  1. Click in the message textarea
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. Wait 1 second
  4. Screenshot

ASSERT:
  1. No message is sent (no new message appears in chat)
  2. Input remains empty
  3. No error message — just silently prevented
```

#### 8.08 — Typing indicator shows when composing (MULTI-USER — requires second Electron instance or manual verification)
```
NOTE: MULTI-USER — requires second Electron instance or manual verification.

ACTION:
  1. In qa_admin's session, start typing in the DM textarea:
     window.locator('textarea[placeholder*="Message"]').pressSequentially('typing test...', { delay: 100 })
  2. In qa_user's session (or after switching), check for typing indicator
  3. Screenshot

ASSERT:
  1. Typing indicator visible in qa_user's DM chat panel
  2. Indicator disappears after qa_admin stops typing (wait 5 seconds)
```

### DM Voice Calls

#### 8.09 — Voice call button visible in DM header
```
REQUIRES LIVEKIT — verify manually if not available

PRECONDITION: DM conversation open with qa_user

ACTION:
  1. Look for voice call button in the DM chat panel header area
  2. Screenshot the DM header area

ASSERT:
  1. Voice call button (phone icon) is visible in the chat panel header
  2. Button is clickable/enabled
  3. Video call button may also be present
```

#### 8.10 — Initiate voice call shows ringing/connecting state
```
REQUIRES LIVEKIT — verify manually if not available

ACTION:
  1. Click the voice call button in the DM header
  2. Wait 3 seconds
  3. Screenshot

ASSERT:
  1. Call UI appears — either:
     a. A call status bar showing "Ringing..." or "Connecting..."
     b. A call area with controls (mute, deafen, end call)
  2. DM voice controls become visible (DMVoiceControls / DMCallStatusBar)
  3. If LiveKit server is not available: an error message appears (not a crash)
```

#### 8.11 — End call / cancel outgoing call
```
REQUIRES LIVEKIT — verify manually if not available

PRECONDITION: Call initiated in 8.10

ACTION:
  1. Click the end call / hang up button (red phone icon or X button)
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. Call UI disappears
  2. Chat panel returns to normal messaging state
  3. A system message may appear in chat indicating "Missed call" or "Call ended"
  4. No audio continues playing
```

#### 8.12 — Mute/unmute during call
```
REQUIRES LIVEKIT — verify manually if not available

PRECONDITION: Active call with qa_user (requires MULTI-USER)

ACTION:
  1. Click the mute toggle button in the call controls
  2. Wait 1 second
  3. Screenshot: muted state
  4. Click the mute toggle button again
  5. Wait 1 second
  6. Screenshot: unmuted state

ASSERT:
  1. Mute button changes visual state when toggled (icon change or color change)
  2. Muted state: microphone icon shows strikethrough or red indicator
  3. Unmuted state: microphone icon returns to normal
```

### DM Video Calls

#### 8.13 — Initiate video call
```
REQUIRES LIVEKIT — verify manually if not available

ACTION:
  1. Click the video call button in the DM header (camera icon)
  2. Wait 3 seconds
  3. Screenshot

ASSERT:
  1. Video call UI appears with camera controls
  2. Similar to 8.10 but with video-specific elements
  3. If LiveKit not available: graceful error, not a crash
```

#### 8.14 — Local video preview visible during call
```
REQUIRES LIVEKIT — verify manually if not available

PRECONDITION: Video call active (8.13)

ACTION:
  1. Look for local video preview element (DMCallArea component)
  2. Screenshot the call area

ASSERT:
  1. Local video preview element exists (video element or placeholder)
  2. If camera permissions granted: video stream visible
  3. If camera permissions denied: placeholder shown with camera-off indicator
  4. Video controls visible (toggle camera, toggle mic, end call)
```

#### 8.15 — Decline incoming call (MULTI-USER — requires second Electron instance or manual verification)
```
REQUIRES LIVEKIT — verify manually if not available
MULTI-USER — requires second Electron instance or manual verification

ACTION:
  1. As qa_user, initiate a call to qa_admin
  2. In qa_admin's session, incoming call notification should appear
  3. Click the decline button
  4. Wait 2 seconds
  5. Screenshot

ASSERT:
  1. Incoming call indicator disappears after declining
  2. No call connection established
  3. A "Missed call" system message may appear in the DM chat
```

### Edge Cases

#### 8.16 — Send very long DM message (at or near MAX_MESSAGE_LENGTH)
```
ACTION:
  1. Generate a long message: const longMsg = 'A'.repeat(2000)
  2. window.locator('textarea[placeholder*="Message"]').fill(longMsg)
  3. window.locator('textarea[placeholder*="Message"]').press('Enter')
  4. Wait 3 seconds
  5. Screenshot

ASSERT:
  1. Either: message sends successfully and appears in chat (if within limit)
  2. Or: message is truncated or validation error shown (if exceeds MAX_MESSAGE_LENGTH)
  3. App does NOT crash
  4. No unhandled error
```

#### 8.17 — DM with blocked user shows blocked state
```
PRECONDITION: qa_user is blocked by qa_admin

ACTION:
  1. If DM conversation with qa_user is still accessible, open it
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. Chat panel shows blocked indicator (isPartnerBlocked prop triggers blocked UI)
  2. Message input is either disabled or shows a blocked notice
  3. Cannot send messages to blocked user

CLEANUP:
  1. Unblock qa_user for subsequent suites
```

#### 8.18 — Navigate back from DM view to server view
```
ACTION:
  1. While in DM view, click "Back to Server" button:
     window.locator('button:has-text("Back to Server")').click()
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. Server view loads with channel sidebar
  2. Channel list visible with channel names
  3. Message input textarea visible (for server channel)
  4. DM sidebar is no longer visible
```

### Final Cleanup
```
Ensure:
  1. Logged in as qa_admin
  2. On server view
  3. qa_user is unblocked and friendship status is known
```
