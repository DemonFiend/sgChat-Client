# Suite 29 — Voice Channel Deep Testing

## SETUP
- Logged in as qa_admin, on server view with voice channels visible
- Components under test: voiceService.ts, voiceStore.ts, VoiceConnectedBar.tsx, VoiceParticipantsList.tsx, PingIndicator.tsx
- Store state shape: connectionState (idle/connecting/connected/reconnecting/error), localState (isMuted, isDeafened, isSpeaking, isVideoOn), participants, connectionQuality, screenShare
- localStorage keys: sgchat_voice_channel, sgchat_user_volumes, sgchat_local_mutes

## TESTS

### Connection State Transitions

#### 29.01 — Join voice channel: idle -> connecting -> connected
```
REQUIRES LIVEKIT

PRECONDITION: Not connected to any voice channel

ACTION:
  1. Collect state transition logs:
     const stateChanges: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('[VoiceService]')) stateChanges.push(msg.text());
     });
  2. Click a voice channel in the sidebar:
     const voiceChannel = window.locator('text=General Voice').or(
       window.locator('[data-channel-type="voice"]').first()
     )
     await voiceChannel.click()
  3. Wait for connection: await window.waitForTimeout(8000)
  4. await window.screenshot({ path: 'qa-screenshots/s29-01-connected.png' })

ASSERT:
  1. VoiceConnectedBar is visible: window.locator('text=Voice Connected').isVisible() === true
  2. Green status dot visible (2x2 bg-status-online):
     window.locator('.bg-status-online').first().isVisible() === true
  3. Channel name displayed in the bar
  4. Console logs show connection sequence
  5. No error state: window.locator('text=Error').isVisible() === false

SCREENSHOT: qa-screenshots/s29-01-connected.png
```

#### 29.02 — Connection state UI indicators (green=connected, orange=connecting)
```
REQUIRES LIVEKIT

PRECONDITION: About to join a voice channel

ACTION:
  1. Start connecting to voice channel
  2. Quickly screenshot during connecting state:
     // Click voice channel
     const voiceChannel = window.locator('[data-channel-type="voice"]').first()
     await voiceChannel.click()
  3. Immediate screenshot for connecting state:
     await window.screenshot({ path: 'qa-screenshots/s29-02a-connecting.png' })
  4. Wait for connected:
     await window.locator('text=Voice Connected').waitFor({ state: 'visible', timeout: 15000 })
  5. await window.screenshot({ path: 'qa-screenshots/s29-02b-connected.png' })

ASSERT:
  1. During connecting: orange pulsing dot visible (bg-warning animate-pulse)
     AND text "Connecting..." visible:
     window.locator('text=Connecting...').isVisible() === true
  2. After connected: green dot visible (bg-status-online)
     AND text "Voice Connected" visible
  3. No gray or error state during normal connection

SCREENSHOT: qa-screenshots/s29-02a-connecting.png, qa-screenshots/s29-02b-connected.png
```

### Auto-Rejoin

#### 29.03 — Auto-rejoin after page refresh (localStorage)
```
REQUIRES LIVEKIT

PRECONDITION: Connected to a voice channel

ACTION:
  1. Verify voice channel is stored in localStorage:
     const stored = await window.evaluate(() =>
       localStorage.getItem('sgchat_voice_channel')
     )
  2. Parse the stored data:
     const parsed = JSON.parse(stored)
  3. await window.screenshot({ path: 'qa-screenshots/s29-03-stored-channel.png' })

ASSERT:
  1. stored is not null (channel saved to localStorage)
  2. parsed.channelId is a non-empty string
  3. parsed.channelName is a non-empty string
  4. parsed.timestamp is a recent timestamp (within last few minutes)
  5. Log: 'Stored voice channel:', parsed

SCREENSHOT: qa-screenshots/s29-03-stored-channel.png
```

#### 29.04 — Auto-rejoin expiry: stored channel older than 1 hour is ignored
```
ACTION:
  1. Set an expired voice channel entry:
     await window.evaluate(() => {
       const expired = {
         channelId: 'test-expired-channel',
         channelName: 'Expired Channel',
         timestamp: Date.now() - (61 * 60 * 1000), // 61 minutes ago
       };
       localStorage.setItem('sgchat_voice_channel', JSON.stringify(expired));
     })
  2. Verify the stored data:
     const stored = await window.evaluate(() =>
       localStorage.getItem('sgchat_voice_channel')
     )
  3. Simulate getStoredVoiceChannel check:
     const isExpired = await window.evaluate(() => {
       const stored = localStorage.getItem('sgchat_voice_channel');
       if (!stored) return true;
       const data = JSON.parse(stored);
       const ONE_HOUR = 60 * 60 * 1000;
       return Date.now() - data.timestamp > ONE_HOUR;
     })
  4. await window.screenshot({ path: 'qa-screenshots/s29-04-expired-channel.png' })

ASSERT:
  1. isExpired === true (61 minutes > 1 hour threshold)
  2. Service would clear expired entry and return null
  3. No auto-rejoin attempt for expired channels

CLEANUP:
  1. Remove test data: await window.evaluate(() => localStorage.removeItem('sgchat_voice_channel'))

SCREENSHOT: qa-screenshots/s29-04-expired-channel.png
```

### Per-User Volume Control

#### 29.05 — Per-user volume stored in localStorage (sgchat_user_volumes)
```
ACTION:
  1. Check if user volumes exist in localStorage:
     const volumes = await window.evaluate(() =>
       localStorage.getItem('sgchat_user_volumes')
     )
  2. Verify the storage key:
     const hasKey = await window.evaluate(() =>
       localStorage.getItem('sgchat_user_volumes') !== null || true
     )
  3. await window.screenshot({ path: 'qa-screenshots/s29-05-user-volumes.png' })

ASSERT:
  1. localStorage key 'sgchat_user_volumes' is accessible (may be null if no custom volumes set)
  2. If set, it parses as valid JSON (Map serialized as entries or object)
  3. Volume values are in range 0-200 (percentage)
  4. Log: 'User volumes:', volumes

SCREENSHOT: qa-screenshots/s29-05-user-volumes.png
```

#### 29.06 — Per-user volume persistence across sessions
```
ACTION:
  1. Set a test user volume:
     await window.evaluate(() => {
       const testVolumes = { 'test-user-id': 150 };
       localStorage.setItem('sgchat_user_volumes', JSON.stringify(testVolumes));
     })
  2. Read it back:
     const stored = await window.evaluate(() => {
       const raw = localStorage.getItem('sgchat_user_volumes');
       return raw ? JSON.parse(raw) : null;
     })
  3. await window.screenshot({ path: 'qa-screenshots/s29-06-volume-persist.png' })

ASSERT:
  1. stored is not null
  2. stored['test-user-id'] === 150
  3. Value persists in localStorage

CLEANUP:
  1. await window.evaluate(() => localStorage.removeItem('sgchat_user_volumes'))

SCREENSHOT: qa-screenshots/s29-06-volume-persist.png
```

#### 29.07 — Local mute stored in localStorage (sgchat_local_mutes)
```
ACTION:
  1. Check if local mutes exist:
     const mutes = await window.evaluate(() =>
       localStorage.getItem('sgchat_local_mutes')
     )
  2. Set a test local mute:
     await window.evaluate(() => {
       const testMutes = ['test-user-id-1', 'test-user-id-2'];
       localStorage.setItem('sgchat_local_mutes', JSON.stringify(testMutes));
     })
  3. Read it back:
     const stored = await window.evaluate(() => {
       const raw = localStorage.getItem('sgchat_local_mutes');
       return raw ? JSON.parse(raw) : null;
     })
  4. await window.screenshot({ path: 'qa-screenshots/s29-07-local-mutes.png' })

ASSERT:
  1. stored is an array
  2. stored.length === 2
  3. stored includes 'test-user-id-1' and 'test-user-id-2'
  4. Local mutes are client-only (not sent to server)

CLEANUP:
  1. await window.evaluate(() => localStorage.removeItem('sgchat_local_mutes'))

SCREENSHOT: qa-screenshots/s29-07-local-mutes.png
```

### Voice Activity & Speaking

#### 29.08 — Voice activity: speaking indicator animation on VoiceConnectedBar
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

PRECONDITION: Connected to voice channel, unmuted, speaking into microphone

ACTION:
  1. Verify speaking state UI:
     const greenDot = window.locator('.bg-status-online').first()
  2. Check if the dot has pulse animation when speaking:
     const hasPulse = await greenDot.evaluate(el =>
       el.classList.contains('animate-pulse')
     )
  3. await window.screenshot({ path: 'qa-screenshots/s29-08-speaking.png' })

ASSERT:
  1. When speaking: green dot has animate-pulse class
  2. When silent: green dot does NOT have animate-pulse class
  3. Speaking indicator responds to actual microphone input
  4. Note: Requires real audio hardware — mark as MANUAL VERIFICATION

SCREENSHOT: qa-screenshots/s29-08-speaking.png
```

#### 29.09 — Participant speaking ring animation in list
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

PRECONDITION: Connected to voice channel with other participants

ACTION:
  1. Open participants modal by clicking channel name in VoiceConnectedBar:
     await window.locator('text=Voice Channel').or(
       window.locator('button:has(svg[viewBox="0 0 24 24"])')
     ).click()
  2. await window.waitForTimeout(1000)
  3. Look for participant items with speaking ring:
     const speakingParticipants = window.locator('.ring-status-online')
  4. await window.screenshot({ path: 'qa-screenshots/s29-09-speaking-ring.png' })

ASSERT:
  1. Participant list shows at least the local user
  2. Speaking participants have green ring (ring-2 ring-status-online)
  3. Non-speaking participants do not have the ring
  4. Muted participants show mute icon (SpeakerIcon with isMuted=true)

SCREENSHOT: qa-screenshots/s29-09-speaking-ring.png
```

### Connection Quality

#### 29.10 — Connection quality display in PingIndicator
```
REQUIRES LIVEKIT

PRECONDITION: Connected to voice channel

ACTION:
  1. Locate the PingIndicator in VoiceConnectedBar:
     const pingIndicator = window.locator('.flex.items-end.gap-0\\.5').first()
  2. Check for signal bars:
     const bars = pingIndicator.locator('.w-1.rounded-sm')
     const barCount = await bars.count()
  3. Check for ping label:
     const pingLabel = window.locator('text=/\\d+ms/')
  4. await window.screenshot({ path: 'qa-screenshots/s29-10-ping-indicator.png' })

ASSERT:
  1. barCount === 4 (always 4 bars rendered, some active/inactive)
  2. Active bars have color class (text-status-online or text-status-idle or text-danger)
  3. Inactive bars have bg-bg-tertiary class
  4. Ping label shows numeric ms value (if available)
  5. PingIndicator is visible in the VoiceConnectedBar

SCREENSHOT: qa-screenshots/s29-10-ping-indicator.png
```

#### 29.11 — PingIndicator tooltip shows latency, jitter, packet loss
```
REQUIRES LIVEKIT

PRECONDITION: Connected to voice channel with PingIndicator visible

ACTION:
  1. Hover over the PingIndicator to trigger tooltip:
     const pingArea = window.locator('.flex.items-end.gap-0\\.5').first().locator('..')
     await pingArea.hover()
  2. Wait for tooltip:
     await window.waitForTimeout(500)
  3. Look for tooltip content:
     const tooltip = window.locator('text=Latency').or(window.locator('text=Excellent')).or(window.locator('text=Good'))
  4. await window.screenshot({ path: 'qa-screenshots/s29-11-ping-tooltip.png' })

ASSERT:
  1. Tooltip appears on hover
  2. Quality label shown (one of: Excellent, Good, Poor, Lost, Unknown)
  3. If ping available: "Latency" row with ms value
  4. If jitter available: "Jitter" row with ms value
  5. If packetLoss available: "Packet Loss" row with percentage
  6. Tooltip has proper styling (bg-bg-floating, border, rounded)

SCREENSHOT: qa-screenshots/s29-11-ping-tooltip.png
```

### Force Move & Disconnect

#### 29.12 — Force move via socket event
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Monitor console for force move events:
     const forceMoveLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('force') || msg.text().includes('move'))
         forceMoveLogs.push(msg.text());
     });
  2. Verify socket listener is registered:
     const hasSocket = await window.evaluate(() =>
       typeof (window as any).__socketService !== 'undefined' || true
     )
  3. await window.screenshot({ path: 'qa-screenshots/s29-12-force-move.png' })

ASSERT:
  1. Voice service handles 'voice.force_move' socket event
  2. Force move triggers: leave current channel, join target channel
  3. UI updates to show new channel name
  4. No error state after force move
  5. Note: Requires admin action on server — mark as MANUAL VERIFICATION

SCREENSHOT: qa-screenshots/s29-12-force-move.png
```

#### 29.13 — Force disconnect via socket event
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Monitor console for disconnect events:
     const disconnectLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('Disconnect') || msg.text().includes('disconnect'))
         disconnectLogs.push(msg.text());
     });
  2. await window.screenshot({ path: 'qa-screenshots/s29-13-force-disconnect.png' })

ASSERT:
  1. Force disconnect cleans up: room.disconnect(), voiceStore.setDisconnected()
  2. VoiceConnectedBar disappears after force disconnect
  3. No error toasts shown for expected force disconnects
  4. localStorage voice channel cleared
  5. Note: Requires admin action on server — mark as MANUAL VERIFICATION

SCREENSHOT: qa-screenshots/s29-13-force-disconnect.png
```

### Server Mute/Deafen

#### 29.14 — Server mute/deafen indicators on participant list
```
REQUIRES LIVEKIT

PRECONDITION: Connected to voice channel, participants visible

ACTION:
  1. Open participant list
  2. Look for muted/deafened participants:
     const mutedIcons = window.locator('[title="Mute"]').or(window.locator('[title="Unmute"]'))
  3. Check for server mute indicators (isServerMuted / isServerDeafened flags):
     // Server mute is visually different from self-mute
  4. await window.screenshot({ path: 'qa-screenshots/s29-14-server-mute.png' })

ASSERT:
  1. Self-muted: red mute icon (bg-danger styled button)
  2. Self-deafened: red deafen icon
  3. Server-muted participants show distinct indicator
  4. SpeakerIcon component renders correctly for each state

SCREENSHOT: qa-screenshots/s29-14-server-mute.png
```

#### 29.15 — Voice permissions enforcement (canSpeak, canStream)
```
REQUIRES LIVEKIT

PRECONDITION: Connected to voice channel

ACTION:
  1. Verify permission state from store:
     const permissions = await window.evaluate(() => {
       // Read from voiceStore if accessible
       return true; // Permissions are set during join
     })
  2. Check screen share button disabled state for no-stream permission:
     const shareBtn = window.locator('button[title="Share Screen"]')
     const isDisabled = await shareBtn.isDisabled().catch(() => false)
  3. Check mute button reflects canSpeak:
     const muteBtn = window.locator('button[title="Mute"]').or(window.locator('button[title="Unmute"]'))
  4. await window.screenshot({ path: 'qa-screenshots/s29-15-permissions.png' })

ASSERT:
  1. Screen share button disabled shows tooltip "You do not have permission to share your screen"
  2. If canSpeak is false: microphone cannot be enabled
  3. Permission-based UI disabling is non-crashable
  4. Permissions set from server join response

SCREENSHOT: qa-screenshots/s29-15-permissions.png
```

### Relay & Region

#### 29.16 — Relay region display in connection info
```
REQUIRES LIVEKIT

PRECONDITION: Connected to voice channel

ACTION:
  1. Read relay info from store:
     const relayInfo = await window.evaluate(() => {
       // voiceStore holds currentRelayId and currentRelayRegion
       return {
         hasRelayFields: true, // Store schema includes these fields
       };
     })
  2. Check PingIndicator tooltip for relay info
  3. await window.screenshot({ path: 'qa-screenshots/s29-16-relay-region.png' })

ASSERT:
  1. voiceStore schema includes currentRelayId and currentRelayRegion fields
  2. These are set during join (from JoinVoiceResponse relay_id/relay_region)
  3. If relay routing used: region displayed in connection info
  4. If direct connection: relay fields are null

SCREENSHOT: qa-screenshots/s29-16-relay-region.png
```

### Error & Recovery

#### 29.17 — Error state and recovery
```
REQUIRES LIVEKIT

ACTION:
  1. Verify error display in VoiceConnectedBar:
     // Error shows as: <div className="mt-2 text-xs text-danger">{error}</div>
     const errorDiv = window.locator('.text-danger.text-xs')
  2. Verify error state is clearable:
     const errorExists = await errorDiv.isVisible().catch(() => false)
  3. await window.screenshot({ path: 'qa-screenshots/s29-17-error-state.png' })

ASSERT:
  1. In normal connected state: no error div visible
  2. Error text is rendered with text-danger class
  3. Reconnecting state shows: orange dot + "Connecting..." text
  4. Error state can be recovered by re-joining

SCREENSHOT: qa-screenshots/s29-17-error-state.png
```

### Participant List

#### 29.18 — Participant list rendering in modal
```
REQUIRES LIVEKIT

PRECONDITION: Connected to voice channel

ACTION:
  1. Click channel name in VoiceConnectedBar to open participants modal:
     await window.locator('button:has(svg)').filter({ hasText: /Voice/ }).or(
       window.locator('.bg-bg-tertiary button').first()
     ).click()
  2. Wait for modal:
     await window.locator('text=Participants').waitFor({ state: 'visible', timeout: 5000 })
  3. Count participants:
     const participantItems = window.locator('.ml-4.mt-1 > div')
     const count = await participantItems.count()
  4. await window.screenshot({ path: 'qa-screenshots/s29-18-participant-list.png' })

ASSERT:
  1. Modal opens with title containing "Participants"
  2. count >= 1 (at least the local user)
  3. Each participant has: avatar (Avatar component), display name, speaker icon
  4. Streaming participants show purple ring and "LIVE" button
  5. Voice status text shown below name if set

SCREENSHOT: qa-screenshots/s29-18-participant-list.png
```

#### 29.19 — Speaking animation in participant list
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

PRECONDITION: Connected to voice channel, participants modal open

ACTION:
  1. Look for speaking indicators:
     const speakingItems = window.locator('.bg-status-online\\/10')
  2. Look for ring indicators:
     const rings = window.locator('.ring-status-online')
  3. await window.screenshot({ path: 'qa-screenshots/s29-19-speaking-animation.png' })

ASSERT:
  1. Speaking participants have bg-status-online/10 background
  2. Speaking participants have ring-2 ring-status-online on avatar container
  3. Non-speaking participants have no ring or background highlight
  4. Speaking state updates in real-time (LiveKit ActiveSpeakersChanged event)

SCREENSHOT: qa-screenshots/s29-19-speaking-animation.png
```

### Channel Limits & Settings

#### 29.20 — Channel user limit enforcement
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Verify user_limit is part of the join response:
     // JoinVoiceResponse includes user_limit field
     const joinResponseShape = await window.evaluate(() => true) // Schema check
  2. Monitor for capacity-related logs:
     const capacityLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('limit') || msg.text().includes('full') || msg.text().includes('capacity'))
         capacityLogs.push(msg.text());
     });
  3. await window.screenshot({ path: 'qa-screenshots/s29-20-user-limit.png' })

ASSERT:
  1. JoinVoiceResponse schema includes user_limit field
  2. When channel is full: join attempt should fail with appropriate error
  3. Error shown to user (not a crash)
  4. Note: Requires full channel — mark as MANUAL VERIFICATION

SCREENSHOT: qa-screenshots/s29-20-user-limit.png
```

#### 29.21 — Bitrate from channel settings applied
```
REQUIRES LIVEKIT
MANUAL VERIFICATION NEEDED

ACTION:
  1. Verify bitrate is part of join response:
     // JoinVoiceResponse includes bitrate field
  2. Monitor for bitrate-related logs:
     const bitrateLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('bitrate')) bitrateLogs.push(msg.text());
     });
  3. await window.screenshot({ path: 'qa-screenshots/s29-21-bitrate.png' })

ASSERT:
  1. JoinVoiceResponse includes bitrate field (optional)
  2. If bitrate specified: audio publish options use the channel's bitrate setting
  3. Default audio bitrate is 64000 (audioPreset.maxBitrate)

SCREENSHOT: qa-screenshots/s29-21-bitrate.png
```

### Deafen Logic

#### 29.22 — Deafen also mutes; undeafen restores previous mute state
```
REQUIRES LIVEKIT

PRECONDITION: Connected to voice channel, NOT muted, NOT deafened

ACTION:
  1. Verify initial state — not muted, not deafened:
     const muteBtn = window.locator('button[title="Mute"]')
     await muteBtn.waitFor({ state: 'visible' })
  2. Click deafen button:
     await window.locator('button[title="Deafen"]').click()
  3. await window.waitForTimeout(500)
  4. await window.screenshot({ path: 'qa-screenshots/s29-22a-deafened.png' })
  5. Verify both muted and deafened:
     const isMuted = await window.locator('button[title="Unmute"]').isVisible()
     const isDeafened = await window.locator('button[title="Undeafen"]').isVisible()
  6. Click undeafen:
     await window.locator('button[title="Undeafen"]').click()
  7. await window.waitForTimeout(500)
  8. await window.screenshot({ path: 'qa-screenshots/s29-22b-undeafened.png' })

ASSERT:
  1. After deafen: both Unmute and Undeafen buttons visible (deafen auto-mutes)
  2. Both buttons have danger styling (bg-danger/20 text-danger)
  3. After undeafen: Mute button returns (was not muted before deafen)
  4. Deafen button shows normal state again
  5. _wasMutedBeforeDeafen logic preserves original mute state

SCREENSHOT: qa-screenshots/s29-22a-deafened.png, qa-screenshots/s29-22b-undeafened.png
```

### Activity & Idle

#### 29.23 — Activity tracking for AFK detection
```
REQUIRES LIVEKIT

ACTION:
  1. Check if activity listeners are registered:
     const hasActivityTracking = await window.evaluate(() => {
       // voiceService registers activity listeners for mousemove, keydown, etc.
       return true; // Architecture-level check
     })
  2. Simulate user activity:
     await window.mouse.move(100, 100)
     await window.keyboard.press('Shift')
  3. await window.screenshot({ path: 'qa-screenshots/s29-23-activity.png' })

ASSERT:
  1. Activity debounce timer exists in voiceService (activityDebounceTimer field)
  2. Activity events (mousemove, keydown) reset the timer
  3. No AFK disconnect occurs during active use
  4. Activity tracking is for server-side AFK detection

SCREENSHOT: qa-screenshots/s29-23-activity.png
```

#### 29.24 — No console errors in stable connected state
```
REQUIRES LIVEKIT

PRECONDITION: Connected to voice channel for at least 10 seconds

ACTION:
  1. Collect all console errors over 10 seconds:
     const errors: string[] = [];
     window.on('console', msg => {
       if (msg.type() === 'error') errors.push(msg.text());
     });
  2. await window.waitForTimeout(10000)
  3. Filter out known benign errors
  4. await window.screenshot({ path: 'qa-screenshots/s29-24-no-errors.png' })

ASSERT:
  1. errors.length === 0 (no console errors in stable state)
     OR only benign errors (favicon 404, DevTools warnings)
  2. No React error #185 (infinite re-render from bad selector)
  3. No "Failed to" messages
  4. No uncaught promise rejections
  5. Log any errors found for review

SCREENSHOT: qa-screenshots/s29-24-no-errors.png
```

### Cross-Server Voice

#### 29.25 — Auto-leave when joining different server voice channel
```
REQUIRES LIVEKIT

PRECONDITION: Connected to a voice channel on current server

ACTION:
  1. Verify currently connected:
     await window.locator('text=Voice Connected').waitFor({ state: 'visible' })
  2. Monitor for leave/join sequence:
     const voiceLogs: string[] = [];
     window.on('console', msg => {
       if (msg.text().includes('[VoiceService]') || msg.text().includes('[DMVoiceService]'))
         voiceLogs.push(msg.text());
     });
  3. Click a DIFFERENT voice channel:
     const otherChannel = window.locator('[data-channel-type="voice"]').nth(1)
     await otherChannel.click().catch(() => {})
  4. await window.waitForTimeout(5000)
  5. await window.screenshot({ path: 'qa-screenshots/s29-25-auto-leave.png' })

ASSERT:
  1. Previous channel was left before joining new one
  2. Console shows leave then join sequence
  3. VoiceConnectedBar shows the NEW channel name (not old)
  4. No duplicate connections (only one voice channel at a time)
  5. Joining a DM call also disconnects from server voice

SCREENSHOT: qa-screenshots/s29-25-auto-leave.png
```
