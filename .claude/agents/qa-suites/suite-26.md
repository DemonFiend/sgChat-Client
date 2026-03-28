# Suite 26 — Voice Parity

## SETUP
- App launched, logged in as qa_admin (admin privileges required for mute/move tests)
- On server view with at least one voice channel visible
- qa_user exists and can join voice channels (needs second session or pre-joined)
- **REQUIRES LIVEKIT**: Most tests in this suite require a running LiveKit server and active voice connections

## TESTS

### Server Mute

#### 26.01 — Admin server-mutes a user → locked icon appears
```
REQUIRES LIVEKIT

PRECONDITION: qa_user is in a voice channel, qa_admin is also in the channel or has admin panel open

ACTION:
  1. Navigate to the voice channel where qa_user is connected
  2. Right-click qa_user in the voice participant list (or use admin controls)
  3. Click "Server Mute" option
  4. Wait 2 seconds
  5. window.screenshot({ path: 'qa-screenshots/s26-01-server-muted.png' })

ASSERT:
  1. Locked microphone icon appears next to qa_user's name
  2. qa_user's mute state shows as server-muted (distinct from self-muted)
  3. No error toast
```

#### 26.02 — Server-muted user cannot unmute (tooltip "Server Muted")
```
REQUIRES LIVEKIT

PRECONDITION: qa_user is server-muted from 26.01 (test from qa_user's perspective if possible, otherwise verify admin view)

ACTION:
  1. Observe qa_user's mute button state in the voice UI
  2. Hover over the mute indicator for qa_user
  3. Wait 1 second
  4. window.screenshot({ path: 'qa-screenshots/s26-02-server-mute-tooltip.png' })

ASSERT:
  1. Mute icon shows locked/server-muted state
  2. Tooltip shows "Server Muted" or similar text indicating admin mute
  3. User cannot self-unmute while server-muted
```

#### 26.03 — Admin unmutes → user is free to toggle
```
REQUIRES LIVEKIT

PRECONDITION: qa_user is server-muted

ACTION:
  1. Right-click qa_user → "Remove Server Mute" or toggle server mute off
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s26-03-server-unmuted.png' })

ASSERT:
  1. Locked icon removed from qa_user
  2. qa_user's mute state returns to normal (self-controlled)
  3. No error toast
```

#### 26.04 — Server deafen works the same way
```
REQUIRES LIVEKIT

ACTION:
  1. Right-click qa_user → "Server Deafen"
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s26-04-server-deafened.png' })

ASSERT:
  1. Deafen icon appears on qa_user (headphones with X or similar)
  2. User is both server-deafened and server-muted
  3. Right-click → "Remove Server Deafen"
  4. Wait 2 seconds
  5. Deafen icon removed, user returns to normal state
  6. window.screenshot({ path: 'qa-screenshots/s26-04-server-undeafened.png' })
```

### Force Move

#### 26.05 — Admin moves user to different voice channel → no disconnect flicker
```
REQUIRES LIVEKIT

PRECONDITION: qa_user is in Voice Channel A, Voice Channel B exists

ACTION:
  1. Right-click qa_user in voice participant list
  2. Select "Move to..." → choose Voice Channel B
  3. Wait 3 seconds
  4. window.screenshot({ path: 'qa-screenshots/s26-05-force-moved.png' })

ASSERT:
  1. qa_user is now shown in Voice Channel B participant list
  2. qa_user is no longer in Voice Channel A
  3. No disconnect/reconnect flicker visible (smooth transition)
  4. qa_user's audio state preserved (not re-muted or re-deafened)
```

#### 26.06 — Toast shows "Moved to {channel}" after force move
```
REQUIRES LIVEKIT

PRECONDITION: Force move just performed from 26.05

ACTION:
  1. Check for toast notification
  2. window.screenshot({ path: 'qa-screenshots/s26-06-move-toast.png' })

ASSERT:
  1. Toast notification visible with text like "Moved to {channel name}"
  2. Toast auto-dismisses after a few seconds
  3. Message clearly indicates which channel the user was moved to
```

### Auto-Rejoin

#### 26.07 — Join voice → refresh → auto-rejoin
```
REQUIRES LIVEKIT

ACTION:
  1. Join a voice channel by clicking on it
  2. Wait 3 seconds for voice connection to establish
  3. window.screenshot({ path: 'qa-screenshots/s26-07-voice-joined.png' })
  4. window.reload()
  5. Wait up to 15 seconds for app to reload and reconnect
  6. window.screenshot({ path: 'qa-screenshots/s26-07-auto-rejoined.png' })

ASSERT:
  1. Before reload: connected to voice channel (voice connected bar visible)
  2. After reload: automatically rejoined the same voice channel
  3. Voice connected bar is visible again after reload
  4. No manual re-join action needed
```

#### 26.08 — Auto-rejoin expires after 1 hour
```
REQUIRES LIVEKIT

NOTE: This test verifies the auto-rejoin expiry mechanism. Full 1-hour wait is impractical;
verify the mechanism exists (stored timestamp) or test with a mocked/shortened expiry.

ACTION:
  1. Check for auto-rejoin state storage (evaluate or inspect):
     const rejoinState = await window.evaluate(() =>
       JSON.parse(localStorage.getItem('voiceAutoRejoin') || sessionStorage.getItem('voiceAutoRejoin') || '{}'));
  2. window.screenshot({ path: 'qa-screenshots/s26-08-rejoin-expiry.png' })

ASSERT:
  1. Auto-rejoin state exists with a timestamp or expiry field
  2. The expiry is set to approximately 1 hour from join time
  3. After expiry, auto-rejoin should not trigger (verify logic exists)
```

### VoiceConnectedBar

#### 26.09 — PingIndicator visible in voice connected bar
```
REQUIRES LIVEKIT

PRECONDITION: Connected to a voice channel

ACTION:
  1. Look at the voice connected bar at the bottom of the screen
  2. window.screenshot({ path: 'qa-screenshots/s26-09-ping-indicator.png' })

ASSERT:
  1. Voice connected bar is visible at the bottom
  2. PingIndicator element visible (shows latency, colored dot, or signal bars)
  3. Ping value updates (not static — may need two screenshots to verify)
```

#### 26.10 — Participant count badge + popover
```
REQUIRES LIVEKIT

PRECONDITION: In voice channel with at least 1 other participant

ACTION:
  1. Look for participant count badge on the voice connected bar
  2. Click the participant count badge
  3. Wait 1 second
  4. window.screenshot({ path: 'qa-screenshots/s26-10-participant-popover.png' })

ASSERT:
  1. Participant count badge visible (shows number like "2")
  2. Clicking opens a popover/dropdown listing participants
  3. Popover shows usernames and avatars of voice participants
  4. Close popover by clicking outside or pressing Escape
```

#### 26.11 — Pencil icon for voice status edit
```
REQUIRES LIVEKIT

PRECONDITION: Connected to voice channel

ACTION:
  1. Look for pencil/edit icon on the voice connected bar
  2. Click the pencil icon
  3. Wait 1 second
  4. window.screenshot({ path: 'qa-screenshots/s26-11-voice-status-edit.png' })

ASSERT:
  1. Pencil icon visible on the voice connected bar
  2. Clicking opens a status edit input or modal
  3. Can type a voice status message
  4. Status is displayed to other participants after saving
```

### Sound Service

#### 26.12 — Incoming DM call → ringtone plays
```
REQUIRES LIVEKIT

PRECONDITION: qa_user initiates a DM voice call to qa_admin

ACTION:
  1. Wait for incoming call notification
  2. window.screenshot({ path: 'qa-screenshots/s26-12-incoming-call.png' })

ASSERT:
  1. Incoming call UI appears (ringing indicator, caller info)
  2. Ringtone sound is playing (check via audio element or Sound Service state):
     const audioPlaying = await window.evaluate(() => {
       const audios = document.querySelectorAll('audio');
       return Array.from(audios).some(a => !a.paused);
     });
  3. audioPlaying === true
  4. Accept and Decline buttons visible
```

#### 26.13 — Accept or decline stops ringtone
```
REQUIRES LIVEKIT

PRECONDITION: Incoming call ringing from 26.12

ACTION:
  1. Click "Accept" or "Decline" button
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s26-13-ringtone-stopped.png' })

ASSERT:
  1. Ringtone stopped playing:
     const audioPlaying = await window.evaluate(() => {
       const audios = document.querySelectorAll('audio');
       return Array.from(audios).some(a => !a.paused && a.src.includes('ring'));
     });
  2. audioPlaying === false
  3. If accepted: DM voice call connected
  4. If declined: returned to normal DM view

CLEANUP:
  1. Disconnect from call if accepted
```

#### 26.14 — Disable sounds setting
```
ACTION:
  1. Open Settings → Notifications (or Sound settings)
  2. Find "Disable Sounds" or sound toggle setting
  3. Enable the disable-sounds toggle
  4. Wait 1 second
  5. window.screenshot({ path: 'qa-screenshots/s26-14-sounds-disabled.png' })

ASSERT:
  1. Sound toggle switched to disabled state
  2. Sound effects should no longer play for events
  3. Setting persists (close and reopen to verify)

CLEANUP:
  1. Re-enable sounds
```

#### 26.15 — Voice join sounds toggle
```
REQUIRES LIVEKIT

ACTION:
  1. Open Settings → Notifications or Voice & Video
  2. Find voice join/leave sounds toggle
  3. Note current state and toggle it
  4. Wait 1 second
  5. window.screenshot({ path: 'qa-screenshots/s26-15-join-sounds-toggle.png' })

ASSERT:
  1. Toggle switches state
  2. When enabled: joining/leaving voice should play a sound
  3. When disabled: no sound on join/leave
  4. Setting persists

CLEANUP:
  1. Restore original state
```

### DM Voice Controls

#### 26.16 — Deafen button available in DM call
```
REQUIRES LIVEKIT

PRECONDITION: In an active DM voice call

ACTION:
  1. Look for the deafen button in the DM call control bar
  2. window.screenshot({ path: 'qa-screenshots/s26-16-dm-deafen.png' })

ASSERT:
  1. Deafen button (headphones icon) visible in DM call controls
  2. Click deafen → icon changes to deafened state (headphones with X)
  3. Click again → returns to normal
  4. Deafen toggles correctly without disconnecting from call
```

#### 26.17 — Screen share button in DM call
```
REQUIRES LIVEKIT

PRECONDITION: In an active DM voice call

ACTION:
  1. Look for screen share button in the DM call control bar
  2. window.screenshot({ path: 'qa-screenshots/s26-17-dm-screenshare.png' })

ASSERT:
  1. Screen share button (monitor/screen icon) visible in DM call controls
  2. Button is clickable (not disabled)
  3. Clicking opens screen/window picker dialog (OS-level — may need to cancel)

CLEANUP:
  1. Cancel screen share picker if opened
```

#### 26.18 — DM call phases: "Ringing..." / "No answer yet..."
```
REQUIRES LIVEKIT

ACTION:
  1. Initiate a DM voice call to qa_user (or a user who won't answer)
  2. Immediately screenshot during ringing phase:
     window.screenshot({ path: 'qa-screenshots/s26-18-call-ringing.png' })
  3. Wait 15-20 seconds without the other user answering
  4. window.screenshot({ path: 'qa-screenshots/s26-18-no-answer.png' })

ASSERT:
  1. First screenshot shows "Ringing..." text or ringing animation
  2. Call UI shows the callee's name/avatar
  3. After timeout: text changes to "No answer yet..." or similar unanswered state
  4. Cancel/hang-up button available throughout

CLEANUP:
  1. Cancel the call
  2. Return to normal DM view
```

### Screen Share Parity

#### 26.19 — Screen share button visible when in voice channel
```
PARITY CHECK: Server web UI has screen share. Client must match with Electron-enhanced picker.
REQUIRES LIVEKIT

ACTION:
  1. Join a voice channel
  2. Wait for connected state
  3. Look for screen share button in voice controls (VoiceConnectedBar or VoiceControls)
  4. window.screenshot({ path: 'qa-screenshots/s26-19-screenshare-btn.png' })

ASSERT:
  1. Screen share button visible (monitor/screen icon)
  2. Button has tooltip ("Share Screen" or similar)
  3. Button is clickable (not disabled)
  4. Button styling matches server web UI's screen share button placement
```

#### 26.20 — Screen share picker opens with source selection
```
REQUIRES LIVEKIT

ACTION:
  1. Click the screen share button
  2. Wait 3 seconds for source enumeration
  3. window.screenshot({ path: 'qa-screenshots/s26-20-screenshare-picker.png' })

ASSERT:
  1. Screen share picker modal opens
  2. Sources displayed with thumbnails (screens and/or windows)
  3. Server web UI has basic getDisplayMedia picker; client has enhanced picker with:
     - Screens and Apps tabs (Electron enhancement)
     - Audio mode selector (Electron-only: App Audio option)
     - Minimized window support (Windows only)
  4. Share and Cancel buttons present

CLEANUP:
  1. Click Cancel to close picker without sharing
```

#### 26.21 — Screen share audio mode options (Electron-only enhancement)
```
REQUIRES LIVEKIT

ACTION:
  1. Click screen share button → picker opens
  2. Select a window source (not a screen)
  3. Look for audio mode selector
  4. window.screenshot({ path: 'qa-screenshots/s26-21-audio-modes.png' })

ASSERT:
  1. Audio mode selector visible with options:
     - "No Audio" (always available)
     - "App Audio" (Windows only — if on Windows, should be available for window sources)
     - "System Audio" (captures all system sound)
  2. For window sources on Windows: "App Audio" auto-selected
  3. Server web UI only has "No Audio" and "System Audio" — "App Audio" is Electron-only enhancement
  4. Helper text explains each mode

CLEANUP:
  1. Cancel screen share picker
```

### Noise Suppression Parity

#### 26.22 — Noise suppression toggle exists in Voice settings
```
PARITY CHECK: Server web UI has DTLN noise suppression toggle. Client has RNNoise toggle. Both should be in same settings location.

ACTION:
  1. Navigate to Settings → Voice & Video tab
  2. Scroll to find noise suppression controls
  3. window.screenshot({ path: 'qa-screenshots/s26-22-noise-suppression.png' })

ASSERT:
  1. "AI Noise Suppression" toggle visible (or similar label)
  2. Toggle is interactive (can be clicked to change state)
  3. Description text explains what it does
  4. Toggle position in settings matches server web UI placement (same tab, similar section)
  5. Browser-level noise suppression toggle also present as separate option
```

#### 26.23 — Noise suppression toggle persists across settings close/reopen
```
ACTION:
  1. Note current AI noise suppression state
  2. Toggle it (click the switch)
  3. window.screenshot({ path: 'qa-screenshots/s26-23-ns-toggled.png' })
  4. Navigate away from Settings (click Server tab)
  5. Navigate back to Settings → Voice & Video
  6. window.screenshot({ path: 'qa-screenshots/s26-23-ns-persisted.png' })

ASSERT:
  1. Toggle state matches what we set (persisted)
  2. Setting synced to server (matches server web UI if checked)

CLEANUP:
  1. Restore original noise suppression state
  2. Navigate back to server view
```

#### 26.24 — Noise suppression implementation note (RNNoise vs DTLN)
```
PARITY NOTE: This is a documentation/awareness test, not a functional test.

The server web UI uses DTLN (Deep Temporal-Lightweight Network) for noise suppression.
The Electron client uses RNNoise (Recurrent Neural Network Noise Suppression via WASM).

Both implementations serve the same purpose but are different under the hood.
The user-facing toggle should behave identically:
  - Toggle ON → mic audio processed through NS before publishing
  - Toggle OFF → raw mic audio published
  - Setting persists across sessions
  - Only applies on next voice join (not live-switched)

If behavior differs between server web UI and client, file a bead:
  bd create --title="Noise suppression behavior differs between web and Electron client" --type=bug --priority=2
```

### Final Cleanup
```
Disconnect from any voice channels.
Ensure we're logged in as qa_admin on server view.
Restore all sound/notification settings to defaults.
Remove any server mutes/deafens applied to qa_user.
Restore noise suppression toggle to original state.
```
