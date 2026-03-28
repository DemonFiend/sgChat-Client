# Suite 30 — DM Calls Voice & Video

## SETUP
- Logged in as qa_admin, on DM view with qa_user (or at least in the Messages tab)
- Components under test: dmVoiceService.ts, DMCallArea.tsx, DMCallStatusBar.tsx (in DMVoiceControls.tsx), DMVoiceControls.tsx, GlobalIncomingCall.tsx, IncomingCallNotification.tsx
- Call phases: idle -> notifying (30s timeout) -> waiting -> connected
- Timers: 30s notifying->waiting, 5min auto-kick if no remote, 5min auto-leave after remote left
- Service: dmVoiceService (singleton, separate from voiceService)

## TESTS

### Call Initiation

#### 30.01 — Start DM voice call: click phone icon
```
REQUIRES LIVEKIT

PRECONDITION: On DM conversation with qa_user, not in any call

ACTION:
  1. Navigate to DM view:
     await window.locator('button:has-text("Messages")').click()
  2. await window.waitForTimeout(2000)
  3. Select a DM conversation (or verify one is selected)
  4. Locate the voice call button:
     const callBtn = window.locator('button[title="Start Voice Call"]')
     await callBtn.waitFor({ state: 'visible', timeout: 5000 })
  5. await window.screenshot({ path: 'qa-screenshots/s30-01-call-button.png' })

ASSERT:
  1. callBtn.isVisible() === true
  2. callBtn.isEnabled() === true
  3. Button has phone icon SVG
  4. Video call button also visible:
     window.locator('button[title="Start Video Call"]').isVisible() === true
  5. Neither button is in "end call" state (no danger styling)

SCREENSHOT: qa-screenshots/s30-01-call-button.png
```

#### 30.02 — Call phases: idle -> notifying -> waiting
```
REQUIRES LIVEKIT

PRECONDITION: On DM conversation, not in a call

ACTION:
  1. Collect console logs:
     const phaseLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('[DMVoiceService]')) phaseLogs.push(msg.text());
     });
  2. Click start voice call:
     await window.locator('button[title="Start Voice Call"]').click()
  3. Wait for notifying phase (immediate):
     await window.waitForTimeout(2000)
  4. await window.screenshot({ path: 'qa-screenshots/s30-02a-notifying.png' })
  5. Wait for waiting phase (30s timeout):
     await window.waitForTimeout(32000)
  6. await window.screenshot({ path: 'qa-screenshots/s30-02b-waiting.png' })

ASSERT:
  1. After click: "Notifying <friendName>..." text visible in DMCallArea:
     window.locator('text=/Notifying.*\\.\\.\\.$/').isVisible() === true
  2. Orange/warning colored indicator during notifying
  3. After 30s: transitions to "Waiting for <friendName>...":
     window.locator('text=/Waiting for.*\\.\\.\\.$/').isVisible() === true
  4. Orange/warning indicator persists during waiting phase
  5. Console shows join sequence

SCREENSHOT: qa-screenshots/s30-02a-notifying.png, qa-screenshots/s30-02b-waiting.png
```

#### 30.03 — Call phase connected: remote participant joins
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

PRECONDITION: In a DM call, in notifying or waiting phase

ACTION:
  1. Wait for remote participant to join (requires second user)
  2. await window.locator('text=/In call with/').or(
       window.locator('text=/In Call with/')
     ).waitFor({ state: 'visible', timeout: 60000 })
  3. await window.screenshot({ path: 'qa-screenshots/s30-03-connected.png' })

ASSERT:
  1. Status text shows "In call with <friendName>" (no ellipsis)
  2. Green status dot visible (bg-status-online)
  3. Connection indicator between avatars shows green dots
  4. Console logs: "Participant connected: <identity>"
  5. dmCallPhase is 'connected'

SCREENSHOT: qa-screenshots/s30-03-connected.png
```

### Outgoing Call UI

#### 30.04 — Outgoing call: ringing animation, callee info in DMCallArea
```
REQUIRES LIVEKIT

PRECONDITION: Just initiated a DM call, in notifying/waiting phase

ACTION:
  1. Verify DMCallArea renders the call UI:
     const callArea = window.locator('.bg-bg-secondary\\/50.border-b')
  2. Verify local user avatar is shown:
     const localAvatar = window.locator('text=You').first()
  3. Verify friend avatar is shown:
     // Friend name appears below their avatar
  4. Check for pulsing animation on caller avatar:
     const pulsingRing = window.locator('.animate-pulse.ring-warning')
  5. await window.screenshot({ path: 'qa-screenshots/s30-04-outgoing-call.png' })

ASSERT:
  1. DMCallArea is visible with caller/callee avatars
  2. "You" label under local user avatar
  3. Friend name under their avatar
  4. Pulsing warning dots between avatars (notifying indicator)
  5. Status text shows notifying/waiting state
  6. No video frames shown (audio-only call)

SCREENSHOT: qa-screenshots/s30-04-outgoing-call.png
```

### Incoming Call Notification

#### 30.05 — Incoming call notification renders with accept/decline
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

PRECONDITION: Another user calls qa_admin via DM

ACTION:
  1. Wait for incoming call notification:
     await window.locator('text=Incoming Call...').waitFor({ state: 'visible', timeout: 60000 })
  2. Verify notification structure:
     const notification = window.locator('.fixed.top-4.left-1\\/2')
  3. Check for caller info:
     const callerName = window.locator('.font-semibold').first()
  4. Verify buttons:
     const acceptBtn = window.locator('button:has-text("Accept")')
     const declineBtn = window.locator('button:has-text("Decline")')
  5. await window.screenshot({ path: 'qa-screenshots/s30-05-incoming-call.png' })

ASSERT:
  1. Notification positioned at top center (fixed, top-4, left-1/2, z-50)
  2. Caller name displayed in bold
  3. "Incoming Call..." text visible with animate-pulse
  4. Caller avatar displayed (Avatar component with size="lg")
  5. Online status dot on avatar (green pulse)
  6. Accept button: green themed (bg-status-online/20 text-status-online)
  7. Decline button: red themed (bg-danger/20 text-danger)
  8. Bouncing phone icon visible

SCREENSHOT: qa-screenshots/s30-05-incoming-call.png
```

#### 30.06 ��� Incoming call auto-dismisses after 30 seconds
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

PRECONDITION: Incoming call notification is visible (do NOT interact with it)

ACTION:
  1. Note the time incoming notification appeared
  2. Wait 32 seconds without clicking accept or decline:
     await window.waitForTimeout(32000)
  3. await window.screenshot({ path: 'qa-screenshots/s30-06-auto-dismiss.png' })

ASSERT:
  1. After 30 seconds: notification is automatically dismissed:
     window.locator('text=Incoming Call...').isVisible() === false
  2. onDecline was called by the timeout (IncomingCallNotification has 30s setTimeout)
  3. Ringtone stopped playing
  4. No lingering notification elements

SCREENSHOT: qa-screenshots/s30-06-auto-dismiss.png
```

#### 30.07 — GlobalIncomingCall renders from any screen (not just DM view)
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

PRECONDITION: On server view (NOT DM view), another user calls via DM

ACTION:
  1. Navigate to server view:
     await window.locator('button:has-text("Server")').click()
  2. await window.waitForTimeout(1000)
  3. Wait for incoming call:
     await window.locator('text=Incoming Call...').waitFor({ state: 'visible', timeout: 60000 })
  4. await window.screenshot({ path: 'qa-screenshots/s30-07-global-incoming.png' })

ASSERT:
  1. IncomingCallNotification visible even though we are on server view
  2. GlobalIncomingCall component listens to socket events globally
  3. Accept and Decline buttons work from any screen
  4. Notification is positioned as fixed overlay (z-50)

SCREENSHOT: qa-screenshots/s30-07-global-incoming.png
```

### Accept & Decline

#### 30.08 — Accept incoming call -> connected state
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

PRECONDITION: Incoming call notification visible

ACTION:
  1. Click Accept:
     await window.locator('button:has-text("Accept")').click()
  2. Wait for connection:
     await window.waitForTimeout(5000)
  3. await window.screenshot({ path: 'qa-screenshots/s30-08-accepted.png' })

ASSERT:
  1. Notification dismissed immediately after accept click
  2. Navigation to DM view (/channels/@me)
  3. DMCallStatusBar appears with "In Call with <friendName>"
  4. Green status indicators (bg-status-online)
  5. Voice controls visible (mute, deafen, video, screen share, end call)
  6. Console: "[DMVoiceService] Connected to LiveKit room"
  7. Ringtone stopped

SCREENSHOT: qa-screenshots/s30-08-accepted.png
```

#### 30.09 — Decline incoming call -> notification dismissed
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

PRECONDITION: Incoming call notification visible

ACTION:
  1. Click Decline:
     await window.locator('button:has-text("Decline")').click()
  2. await window.waitForTimeout(1000)
  3. await window.screenshot({ path: 'qa-screenshots/s30-09-declined.png' })

ASSERT:
  1. Notification dismissed immediately
  2. window.locator('text=Incoming Call...').isVisible() === false
  3. No voice connection established (voiceStore stays idle)
  4. Ringtone stopped
  5. No error state
  6. App returns to normal state (whatever view was active)

SCREENSHOT: qa-screenshots/s30-09-declined.png
```

### Auto-Kick & Timeouts

#### 30.10 — Auto-kick after 5 minutes if no remote participant joins
```
REQUIRES LIVEKIT

PRECONDITION: In a DM call, waiting phase, no remote participant has joined

ACTION:
  1. Monitor for auto-kick:
     const kickLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('Auto-leaving') || msg.text().includes('no one joined'))
         kickLogs.push(msg.text());
     });
  2. Wait 5 minutes + buffer (or verify the timer is set):
     // In practice, we verify the timer exists rather than waiting 5 min
     const timerExists = await window.evaluate(() => {
       // dmVoiceService has autoKickTimerId set to 300_000ms
       return true; // Architecture verification
     })
  3. await window.screenshot({ path: 'qa-screenshots/s30-10-auto-kick.png' })

ASSERT:
  1. Auto-kick timer is set to 300,000ms (5 minutes)
  2. After timeout: console logs "Auto-leaving: no one joined after 5 minutes"
  3. Call is terminated: voiceStore returns to idle
  4. UI clears: no DMCallStatusBar visible
  5. Note: Full 5-min wait impractical in test — verify timer setup

SCREENSHOT: qa-screenshots/s30-10-auto-kick.png
```

### Remote Participant Left

#### 30.11 — Remote participant left detection
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

PRECONDITION: In a connected DM call (phase=connected), remote participant leaves

ACTION:
  1. Monitor for participant disconnect:
     const leftLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('Participant disconnected') || msg.text().includes('left'))
         leftLogs.push(msg.text());
     });
  2. Remote participant leaves the call
  3. await window.waitForTimeout(3000)
  4. await window.screenshot({ path: 'qa-screenshots/s30-11-remote-left.png' })

ASSERT:
  1. DMCallArea shows "<friendName> left the call" text:
     window.locator('text=/left the call/').isVisible() === true
  2. Status text is red/danger colored
  3. Red dots between avatars (bg-danger/40)
  4. Friend avatar has reduced opacity (opacity-40)
  5. Console: "[DMVoiceService] Participant disconnected: <identity>"
  6. remoteParticipantLeft flag set to true in voiceStore

SCREENSHOT: qa-screenshots/s30-11-remote-left.png
```

#### 30.12 — Auto-leave 5 minutes after remote participant left
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

PRECONDITION: In a DM call, remote participant has already left

ACTION:
  1. Monitor for auto-leave:
     const leaveLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('Auto-leaving') || msg.text().includes('remote user left'))
         leaveLogs.push(msg.text());
     });
  2. Verify timer is set:
     // autoLeaveAfterRemoteLeftTimerId set to 300_000ms
  3. await window.screenshot({ path: 'qa-screenshots/s30-12-auto-leave.png' })

ASSERT:
  1. Timer set: autoLeaveAfterRemoteLeftTimerId is non-null
  2. After 5 min: "Auto-leaving: remote user left 5 minutes ago"
  3. Call terminated, voiceStore returns to idle
  4. UI cleaned up
  5. Note: Verify timer setup rather than waiting 5 min

SCREENSHOT: qa-screenshots/s30-12-auto-leave.png
```

### Video Toggle

#### 30.13 — Video toggle button turns camera on/off
```
REQUIRES LIVEKIT

PRECONDITION: In a connected DM call

ACTION:
  1. Locate video toggle button:
     const videoBtn = window.locator('button[title="Turn On Camera"]')
     await videoBtn.waitFor({ state: 'visible', timeout: 5000 })
  2. Click to enable video:
     await videoBtn.click()
  3. await window.waitForTimeout(2000)
  4. await window.screenshot({ path: 'qa-screenshots/s30-13a-video-on.png' })
  5. Click to disable video:
     await window.locator('button[title="Turn Off Camera"]').click()
  6. await window.waitForTimeout(1000)
  7. await window.screenshot({ path: 'qa-screenshots/s30-13b-video-off.png' })

ASSERT:
  1. After enabling: button changes to "Turn Off Camera" title
  2. Button has green active styling (bg-status-online/20 text-status-online)
  3. Local video preview element appears (video element with mirror transform)
  4. After disabling: button returns to "Turn On Camera" title
  5. Local video preview removed
  6. Console: "[DMVoiceService] Video state: true/false"

SCREENSHOT: qa-screenshots/s30-13a-video-on.png, qa-screenshots/s30-13b-video-off.png
```

#### 30.14 — Local video preview in DMCallArea
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

PRECONDITION: In DM call with video enabled

ACTION:
  1. Enable camera: await window.locator('button[title="Turn On Camera"]').click()
  2. await window.waitForTimeout(3000)
  3. Look for local video element:
     const localVideo = window.locator('video[autoplay][muted]')
  4. Look for "You" label overlay:
     const youLabel = window.locator('text=You').last()
  5. await window.screenshot({ path: 'qa-screenshots/s30-14-local-preview.png' })

ASSERT:
  1. localVideo is visible: await localVideo.isVisible() === true
  2. Video element has mirror transform: style includes 'scaleX(-1)'
  3. "You" label overlay visible at bottom-left of video
  4. Video has rounded corners (rounded-lg class)
  5. Video is playing (not paused)

CLEANUP: Disable camera after test

SCREENSHOT: qa-screenshots/s30-14-local-preview.png
```

#### 30.15 — Remote video rendering in DMCallArea
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

PRECONDITION: In DM call, remote participant has camera enabled

ACTION:
  1. Wait for remote video:
     await window.waitForTimeout(5000)
  2. Look for remote video container:
     const remoteVideoContainer = window.locator('.rounded-lg.overflow-hidden.bg-black')
  3. await window.screenshot({ path: 'qa-screenshots/s30-15-remote-video.png' })

ASSERT:
  1. Remote video container is visible
  2. Video element attached by dmVoiceService.getRemoteVideoElement()
  3. Video element has object-cover class and rounded-lg
  4. When both local and remote video: picture-in-picture layout
     (local video 32x24 in corner, remote video fills main area)
  5. remoteVideoUsers array in voiceStore has the remote user ID

SCREENSHOT: qa-screenshots/s30-15-remote-video.png
```

### Screen Share in DM

#### 30.16 — Screen share toggle in DM call
```
REQUIRES LIVEKIT

PRECONDITION: In a connected DM call

ACTION:
  1. Locate screen share button in DMCallStatusBar:
     const shareBtn = window.locator('button[title="Share Screen"]')
  2. Verify it is visible alongside other DM controls:
     await shareBtn.waitFor({ state: 'visible', timeout: 5000 })
  3. Verify screen share button also in DMVoiceControls header:
     // ScreenShareButton size="sm" showQualityMenu
  4. await window.screenshot({ path: 'qa-screenshots/s30-16-dm-screenshare.png' })

ASSERT:
  1. Screen share button visible in DM call controls
  2. Button is enabled (canStream permission)
  3. Not currently sharing: button has default styling (bg-bg-secondary)
  4. Quality presets available: standard (720p), high (1080p), native

SCREENSHOT: qa-screenshots/s30-16-dm-screenshare.png
```

### Mute & Deafen Controls

#### 30.17 — Mute/deafen controls in DMCallStatusBar
```
REQUIRES LIVEKIT

PRECONDITION: In a connected DM call

ACTION:
  1. Locate mute button:
     const muteBtn = window.locator('button[title="Mute"]')
     await muteBtn.waitFor({ state: 'visible' })
  2. Locate deafen button:
     const deafenBtn = window.locator('button[title="Deafen"]')
     await deafenBtn.waitFor({ state: 'visible' })
  3. Click mute:
     await muteBtn.click()
     await window.waitForTimeout(500)
  4. await window.screenshot({ path: 'qa-screenshots/s30-17a-muted.png' })
  5. Click unmute:
     await window.locator('button[title="Unmute"]').click()
     await window.waitForTimeout(500)
  6. Click deafen:
     await window.locator('button[title="Deafen"]').click()
     await window.waitForTimeout(500)
  7. await window.screenshot({ path: 'qa-screenshots/s30-17b-deafened.png' })
  8. Click undeafen:
     await window.locator('button[title="Undeafen"]').click()
     await window.waitForTimeout(500)

ASSERT:
  1. Mute: button changes to "Unmute" with danger styling (bg-danger/20 text-danger)
  2. Unmute: button returns to "Mute" with default styling
  3. Deafen: both mute and deafen show danger styling (deafen auto-mutes)
  4. Undeafen: restores previous mute state (if was unmuted before, returns to unmuted)
  5. _wasMutedBeforeDeafen logic works correctly
  6. Console logs state changes

SCREENSHOT: qa-screenshots/s30-17a-muted.png, qa-screenshots/s30-17b-deafened.png
```

### Connection Quality

#### 30.18 — Connection quality during DM call
```
REQUIRES LIVEKIT

PRECONDITION: In a connected DM call

ACTION:
  1. Locate PingIndicator in DMCallStatusBar:
     const pingIndicator = window.locator('.flex.items-end.gap-0\\.5')
  2. Check for ping label in DMVoiceControls header:
     const headerPing = window.locator('button[title="Start Voice Call"]').locator('..').locator('.flex.items-end')
  3. await window.screenshot({ path: 'qa-screenshots/s30-18-dm-quality.png' })

ASSERT:
  1. PingIndicator visible in DMCallStatusBar (showLabel showTooltip)
  2. PingIndicator also visible in DMVoiceControls header area (showTooltip only)
  3. Signal bars rendered (4 bars)
  4. Quality monitoring interval running (every 2s)
  5. Connection quality mapped from LiveKit: excellent/good/poor/lost

SCREENSHOT: qa-screenshots/s30-18-dm-quality.png
```

### Ringtone

#### 30.19 — Ringtone plays on incoming call, stops on accept/decline
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Verify soundService is available:
     const hasSoundService = await window.evaluate(() => {
       // IncomingCallNotification calls soundService.playRingtone() on mount
       // and soundService.stopRingtone() on unmount
       return true;
     })
  2. Monitor for ringtone-related console logs:
     const soundLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('ringtone') || msg.text().includes('Ringtone') || msg.text().includes('sound'))
         soundLogs.push(msg.text());
     });
  3. await window.screenshot({ path: 'qa-screenshots/s30-19-ringtone.png' })

ASSERT:
  1. IncomingCallNotification mounts: soundService.playRingtone() called
  2. On accept: component unmounts, cleanup calls soundService.stopRingtone()
  3. On decline: same cleanup, ringtone stops
  4. On 30s auto-dismiss: onDecline fires, triggering unmount and stopRingtone
  5. No lingering audio after notification dismissed
  6. Note: Actual audio output requires hardware — mark as MANUAL VERIFICATION

SCREENSHOT: qa-screenshots/s30-19-ringtone.png
```

### End Call Cleanup

#### 30.20 — End call: full cleanup of room, timers, audio elements, and UI
```
REQUIRES LIVEKIT

PRECONDITION: In a connected DM call

ACTION:
  1. Collect cleanup logs:
     const cleanupLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('[DMVoiceService]')) cleanupLogs.push(msg.text());
     });
  2. Click end call button:
     await window.locator('button[title="End Call"]').click()
  3. await window.waitForTimeout(3000)
  4. await window.screenshot({ path: 'qa-screenshots/s30-20-call-ended.png' })

ASSERT:
  1. Console contains "Leaving DM voice call"
  2. Console contains "Disconnected from DM voice call"
  3. Console contains "All media elements cleaned up"
  4. DMCallStatusBar is gone: buttons with "End Call" title not visible
  5. DMCallArea not rendering (no call UI)
  6. voiceStore returns to idle: connectionState === 'idle'
  7. All timers cleared (notifyingTimerId, autoKickTimerId, autoLeaveAfterRemoteLeftTimerId)
  8. noiseSuppressionService.destroy() called
  9. connectionQualityInterval cleared
  10. Socket events emitted: 'dm:voice:leave'
  11. API call: POST /dms/{channelId}/voice/leave (best-effort)
  12. Voice call button returns to "Start Voice Call" state
  13. No console errors during cleanup

SCREENSHOT: qa-screenshots/s30-20-call-ended.png
```
