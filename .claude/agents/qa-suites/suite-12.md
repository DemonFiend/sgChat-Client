# Suite 12 — Voice & Video (LiveKit)

## SETUP
- App launched, logged in as qa_admin
- On server view with voice channels visible in sidebar
- LiveKit server must be running for most tests
- Tests marked REQUIRES LIVEKIT will fail gracefully without it
- Tests marked MANUAL VERIFICATION NEEDED require human confirmation

## TESTS

### Join / Leave

#### 12.01 — Click voice channel -> join voice (REQUIRES LIVEKIT)
```
ACTION:
  1. Locate a voice channel in the sidebar (look for speaker/audio icon)
  2. window.locator('[data-channel-type="voice"], button:has-text("General Voice")').first().click()
  3. Wait 5 seconds for connection
  4. Screenshot: qa-screenshots/s12-01-voice-joined.png

ASSERT:
  1. Voice connected indicator appears (green dot, "Connected" text, or VoiceConnectedBar)
  2. No error alert or connection failure message
  3. Voice controls visible (mute, deafen, disconnect buttons)
  4. Screenshot shows connected state with voice controls
```

#### 12.02 — Connected indicator shows after join (REQUIRES LIVEKIT)
```
PRECONDITION: Joined a voice channel (12.01)

ACTION:
  1. Look for the VoiceConnectedBar at bottom of sidebar
  2. Screenshot: qa-screenshots/s12-02-connected-indicator.png

ASSERT:
  1. VoiceConnectedBar is visible: window.locator('[class*="voice-connected"], [data-testid="voice-bar"]').isVisible() === true
  2. Bar shows channel name
  3. Bar shows connection status (e.g., "Voice Connected", green indicator)
  4. PingIndicator or latency display visible
  5. Screenshot shows the connected bar with status
```

#### 12.03 — User appears in voice channel member list (REQUIRES LIVEKIT)
```
PRECONDITION: Joined a voice channel

ACTION:
  1. Look at the voice channel in sidebar — it should expand to show participants
  2. Alternatively check VoiceConnectedBar participant count
  3. Screenshot: qa-screenshots/s12-03-voice-member-list.png

ASSERT:
  1. qa_admin appears in the voice channel participant list
  2. Avatar or username visible in the voice participant section
  3. Participant count shows at least 1
  4. Screenshot shows user in voice channel member list
```

#### 12.04 — Disconnect from voice channel (REQUIRES LIVEKIT)
```
PRECONDITION: Currently in a voice channel

ACTION:
  1. Click disconnect button: window.locator('button[aria-label*="disconnect" i], button[aria-label*="leave" i], button:has-text("Disconnect")').click()
  2. Wait 3 seconds
  3. Screenshot: qa-screenshots/s12-04-voice-disconnected.png

ASSERT:
  1. VoiceConnectedBar is no longer visible
  2. Voice controls are gone
  3. User no longer appears in voice channel participant list
  4. No error messages
  5. Screenshot shows disconnected state
```

#### 12.05 — Multi-user voice channel (REQUIRES LIVEKIT, MANUAL VERIFICATION NEEDED)
```
NOTE: This test requires two users connected simultaneously.
      Fully automated testing requires a second Electron instance.

ACTION:
  1. qa_admin joins a voice channel (per 12.01)
  2. Screenshot: qa-screenshots/s12-05-multi-user.png

ASSERT:
  1. If qa_user is also in the channel, both names appear in participant list
  2. Participant count matches number of connected users
  3. Each participant shows their own audio indicators

MANUAL VERIFICATION NEEDED:
  - Have qa_user join from a second client to verify both see each other
  - Verify audio is transmitted between users
```

### Controls

#### 12.06 — Mute / unmute toggle (REQUIRES LIVEKIT)
```
PRECONDITION: Connected to a voice channel

ACTION:
  1. Join voice channel if not already connected
  2. Locate mute button: window.locator('button[aria-label*="mute" i], button[aria-label*="microphone" i]').first()
  3. Screenshot before mute: qa-screenshots/s12-06a-unmuted.png
  4. muteBtn.click()
  5. Wait 1 second
  6. Screenshot after mute: qa-screenshots/s12-06b-muted.png
  7. muteBtn.click()
  8. Wait 1 second
  9. Screenshot after unmute: qa-screenshots/s12-06c-unmuted-again.png

ASSERT:
  1. After mute click: button visual changes (crossed-out mic icon, red state, aria-pressed="true")
  2. After unmute click: button returns to original state
  3. Screenshots show clear visual difference between muted and unmuted states
```

#### 12.07 — Deafen / undeafen toggle (REQUIRES LIVEKIT)
```
PRECONDITION: Connected to a voice channel

ACTION:
  1. Locate deafen button: window.locator('button[aria-label*="deafen" i], button[aria-label*="headphone" i]').first()
  2. Screenshot before: qa-screenshots/s12-07a-undeafened.png
  3. deafenBtn.click()
  4. Wait 1 second
  5. Screenshot after deafen: qa-screenshots/s12-07b-deafened.png
  6. deafenBtn.click()
  7. Wait 1 second

ASSERT:
  1. After deafen: button shows deafened state (crossed-out headphone icon)
  2. Deafening also mutes the microphone (mute button shows muted state)
  3. After undeafen: both deafen and mute return to normal
  4. Screenshots show clear state transitions
```

#### 12.08 — Electron global shortcut: Ctrl+Shift+M mute toggle (REQUIRES LIVEKIT)
```
PRECONDITION: Connected to a voice channel, unmuted

ACTION:
  1. Verify current mute state (unmuted)
  2. window.keyboard.press('Control+Shift+M')
  3. Wait 1 second
  4. Screenshot: qa-screenshots/s12-08a-shortcut-muted.png
  5. window.keyboard.press('Control+Shift+M')
  6. Wait 1 second
  7. Screenshot: qa-screenshots/s12-08b-shortcut-unmuted.png

ASSERT:
  1. First Ctrl+Shift+M: mute button shows muted state
  2. Second Ctrl+Shift+M: mute button returns to unmuted state
  3. Global shortcut works even if app window is not focused (MANUAL VERIFICATION NEEDED)
```

#### 12.09 — Electron global shortcut: Ctrl+Shift+D deafen toggle (REQUIRES LIVEKIT)
```
PRECONDITION: Connected to a voice channel, undeafened

ACTION:
  1. window.keyboard.press('Control+Shift+D')
  2. Wait 1 second
  3. Screenshot: qa-screenshots/s12-09a-shortcut-deafened.png
  4. window.keyboard.press('Control+Shift+D')
  5. Wait 1 second
  6. Screenshot: qa-screenshots/s12-09b-shortcut-undeafened.png

ASSERT:
  1. First Ctrl+Shift+D: deafen button shows deafened state
  2. Second Ctrl+Shift+D: deafen button returns to normal
  3. Screenshots confirm state changes via keyboard shortcut
```

#### 12.10 — Server mute indicator (REQUIRES LIVEKIT, MANUAL VERIFICATION NEEDED)
```
NOTE: Requires admin to server-mute another user via admin controls.

ACTION:
  1. If a server-muted user is in voice, observe their mute indicator
  2. Screenshot: qa-screenshots/s12-10-server-mute.png

ASSERT:
  1. Server-muted user shows a distinct "server mute" icon (locked mic)
  2. Server-muted user cannot unmute themselves (button disabled or locked)
  3. Non-muted users see the server-mute indicator on the affected user

MANUAL VERIFICATION NEEDED:
  - Admin must server-mute qa_user from admin panel
  - Then observe qa_user's client to confirm mute button is locked
```

### Screen Share

#### 12.11 — Screen share source picker (REQUIRES LIVEKIT)
```
PRECONDITION: Connected to a voice channel

ACTION:
  1. Locate screen share button: window.locator('button[aria-label*="screen" i], button[aria-label*="share" i]').first()
  2. shareBtn.click()
  3. Wait 2 seconds for source picker dialog
  4. Screenshot: qa-screenshots/s12-11-screen-share-picker.png

ASSERT:
  1. Source picker dialog appears showing available screens/windows
  2. At least one screen or window option visible
  3. Options show thumbnails or names of available sources
  4. Screenshot shows the source picker

NOTE: Electron's desktopCapturer provides the source list.
      The native OS picker may appear instead of a custom dialog.
      MANUAL VERIFICATION NEEDED if native OS picker appears.
```

#### 12.12 — Start screen share (REQUIRES LIVEKIT, MANUAL VERIFICATION NEEDED)
```
PRECONDITION: Source picker open (12.11)

ACTION:
  1. Select a source from the picker (click first available option)
  2. Confirm/start sharing
  3. Wait 3 seconds
  4. Screenshot: qa-screenshots/s12-12-screen-sharing.png

ASSERT:
  1. Screen share indicator visible (e.g., "You are sharing your screen" banner)
  2. Share button state changes to "Stop Sharing" or shows active state
  3. No error messages
  4. Screenshot shows active screen share state
```

#### 12.13 — Other users see screen share (REQUIRES LIVEKIT, MANUAL VERIFICATION NEEDED)
```
NOTE: Requires a second user connected to the same voice channel.

ASSERT:
  1. Second user sees a video stream from the sharing user
  2. Screen share participant shows a screen share icon
  3. Video feed renders without corruption

MANUAL VERIFICATION NEEDED:
  - Connect qa_user to the same voice channel from a second client
  - Verify qa_user sees the screen share feed
```

#### 12.14 — Stop screen share (REQUIRES LIVEKIT)
```
PRECONDITION: Currently sharing screen

ACTION:
  1. Click stop share button: window.locator('button:has-text("Stop Sharing"), button[aria-label*="stop shar" i]').click()
  2. Wait 2 seconds
  3. Screenshot: qa-screenshots/s12-14-screen-share-stopped.png

ASSERT:
  1. Screen share indicator gone
  2. Share button returns to default state (not active)
  3. No error messages
  4. Screenshot shows sharing has stopped
```

### Voice Settings

#### 12.15 — Change input device (REQUIRES LIVEKIT)
```
ACTION:
  1. Open user settings: window.locator('button[aria-label*="settings" i], button:has-text("Settings")').click()
  2. Navigate to Voice tab: window.locator('button:has-text("Voice"), [role="tab"]:has-text("Voice")').click()
  3. Wait 2 seconds
  4. Locate input device selector: window.locator('select[name*="input" i], [data-testid="input-device"]').first()
  5. Screenshot: qa-screenshots/s12-15-input-device.png

ASSERT:
  1. Input device dropdown is visible and populated
  2. At least one audio input device listed (or "Default" option)
  3. Dropdown is interactive (can be clicked to show options)
  4. Screenshot shows the input device selector

NOTE: Actual device list depends on system hardware.
      MANUAL VERIFICATION NEEDED to confirm selected device is used for capture.
```

#### 12.16 — Change output device (REQUIRES LIVEKIT)
```
PRECONDITION: On Voice settings tab

ACTION:
  1. Locate output device selector: window.locator('select[name*="output" i], [data-testid="output-device"]').first()
  2. Screenshot: qa-screenshots/s12-16-output-device.png

ASSERT:
  1. Output device dropdown is visible and populated
  2. At least one audio output device listed (or "Default" option)
  3. Dropdown is interactive
  4. Screenshot shows the output device selector

CLEANUP:
  1. Close settings modal
```

#### 12.17 — Noise suppression toggle
```
PRECONDITION: On Voice settings tab

ACTION:
  1. Locate noise suppression toggle: window.locator('input[type="checkbox"][name*="noise" i], [data-testid="noise-suppression"], label:has-text("Noise Suppression")').first()
  2. Screenshot before toggle: qa-screenshots/s12-17a-noise-suppression-before.png
  3. Click the toggle
  4. Wait 1 second
  5. Screenshot after toggle: qa-screenshots/s12-17b-noise-suppression-after.png

ASSERT:
  1. Toggle state changes visually (on/off)
  2. Setting persists (close and reopen settings to verify)
  3. Screenshots show state change

CLEANUP:
  1. Close settings modal
```

### Connection Quality

#### 12.18 — Quality indicator visible during call (REQUIRES LIVEKIT)
```
PRECONDITION: Connected to a voice channel

ACTION:
  1. Join voice channel if not connected
  2. Locate quality/ping indicator in VoiceConnectedBar
  3. Screenshot: qa-screenshots/s12-18-quality-indicator.png

ASSERT:
  1. PingIndicator or connection quality icon is visible
  2. Shows a latency value (ms) or quality bars (green/yellow/red)
  3. Value is a reasonable number (< 1000ms for local server)
  4. Screenshot shows the quality indicator
```

#### 12.19 — No excessive errors in console during voice session (REQUIRES LIVEKIT)
```
PRECONDITION: Connected to a voice channel for at least 10 seconds

ACTION:
  1. Collect console errors during voice session:
     const errors: string[] = [];
     window.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  2. Stay connected for 10 seconds
  3. Disconnect from voice
  4. Screenshot: qa-screenshots/s12-19-voice-console.png

ASSERT:
  1. Filter out known benign errors (LiveKit ICE candidate warnings, etc.)
  2. No repeated/looping errors (same error appearing > 5 times)
  3. No "WebSocket connection failed" errors
  4. No "Permission denied" errors for media devices
  5. Log all unique errors found for review
```

### Final Cleanup
```
1. Disconnect from any voice channel
2. Close any open settings modals
3. Return to server text channel view for next suite
```
