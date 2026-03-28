# Suite 10 — User Settings

## SETUP
- App launched, logged in as qa_admin
- On server view (channels visible)
- Open User Settings:
  1. Click the gear icon in the user panel at the bottom-left: `window.locator('[title="User Settings"]').click()`
  2. A popup menu appears — click "User Settings" in the menu: `window.locator('text=User Settings').click()`
  3. Wait for the settings modal to open (full-screen overlay with sidebar tabs)
  4. `window.locator('[role="dialog"][aria-label="User Settings"]').waitFor()`

## TESTS

### Account Tab

#### 10.01 — Settings modal opens with Account tab by default
```
ACTION:
  1. Open settings (see SETUP steps above)
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. Settings modal visible: window.locator('[role="dialog"][aria-label="User Settings"]').isVisible() === true
  2. "My Account" tab is active (has selected styling)
  3. "My Account" heading visible: window.locator('text=My Account').first().isVisible() === true
  4. User avatar visible in the account card
  5. Username displayed: window.locator('text=@' + 'qa_admin').isVisible() === true
  6. Email displayed
  7. "Edit User Profile" button visible: window.locator('button:has-text("Edit User Profile")').isVisible() === true
```

#### 10.02 — All settings tabs are visible in sidebar
```
PRECONDITION: Settings modal open

ACTION:
  1. Screenshot the settings sidebar

ASSERT:
  1. "My Account" tab visible: window.locator('button:has-text("My Account")').isVisible() === true
  2. "Profile" tab visible: window.locator('button:has-text("Profile")').isVisible() === true
  3. "Appearance" tab visible: window.locator('button:has-text("Appearance")').isVisible() === true
  4. "Notifications" tab visible: window.locator('button:has-text("Notifications")').isVisible() === true
  5. "Voice & Video" tab visible: window.locator('button:has-text("Voice & Video")').isVisible() === true
  6. "Keybinds" tab visible (Electron only): window.locator('button:has-text("Keybinds")').isVisible() === true
  7. Close button visible: window.locator('[aria-label="Close"]').isVisible() === true
```

#### 10.03 — Change username (inline edit)
```
ACTION:
  1. In Account tab, locate the "Username" section
  2. Click the "Edit" button next to username:
     window.locator('button:has-text("Edit")').first().click()
  3. Wait 1 second — inline edit input appears
  4. const originalUsername = 'qa_admin'
  5. window.locator('input[name="edit-username"]').clear()
  6. window.locator('input[name="edit-username"]').fill('qa_admin_renamed')
  7. Screenshot: editing state
  8. Click "Save": window.locator('button:has-text("Save")').first().click()
  9. Wait 3 seconds
  10. Screenshot: saved state

ASSERT:
  1. Input field appeared when clicking Edit
  2. After save, username displays as "qa_admin_renamed"
  3. No error message visible

VERIFY EFFECT:
  1. Close settings: window.locator('[aria-label="Close"]').click()
  2. Check user panel at bottom-left shows updated username
  3. Check member list shows updated username

CLEANUP:
  1. Re-open settings, change username back to 'qa_admin'
  2. Save and verify it reverts
```

#### 10.04 — Change password
```
ACTION:
  1. In Account tab, click "Change Password" button:
     window.locator('button:has-text("Change Password")').click()
  2. Wait 1 second for password form to appear
  3. window.locator('input[name="current-password"]').fill('QATest123!')
  4. window.locator('input[name="new-password"]').fill('QATest456!')
  5. window.locator('input[name="confirm-password"]').fill('QATest456!')
  6. Screenshot: password form filled
  7. Click "Change Password" submit button:
     window.locator('button:has-text("Change Password")').click()
  8. Wait 3 seconds

ASSERT:
  1. Success message appears: "Password changed successfully!"
     window.locator('text=Password changed successfully').isVisible() === true
  2. Password form closes
  3. No error message

CLEANUP — CRITICAL:
  1. Change password BACK to original immediately:
  2. Click "Change Password" again
  3. Current: 'QATest456!', New: 'QATest123!', Confirm: 'QATest123!'
  4. Save and verify success
```

#### 10.05 — Password mismatch shows error
```
ACTION:
  1. Click "Change Password"
  2. window.locator('input[name="current-password"]').fill('QATest123!')
  3. window.locator('input[name="new-password"]').fill('NewPass123!')
  4. window.locator('input[name="confirm-password"]').fill('DifferentPass123!')
  5. Click submit
  6. Wait 2 seconds
  7. Screenshot

ASSERT:
  1. Error message: "Passwords do not match"
     window.locator('text=Passwords do not match').isVisible() === true
  2. Form remains open — not dismissed
  3. Password NOT changed

CLEANUP:
  1. Click "Cancel" to close password form
```

#### 10.06 — Log Out buttons visible
```
ACTION:
  1. Scroll down in Account tab to the "Log Out" section
  2. Screenshot

ASSERT:
  1. "Log Out" button visible: window.locator('button:has-text("Log Out")').first().isVisible() === true
  2. "Log Out & Forget Device" button visible:
     window.locator('button:has-text("Log Out & Forget Device")').isVisible() === true
  3. Both buttons are styled with danger color
```

### Profile Tab

#### 10.07 — Navigate to Profile tab and verify form fields
```
ACTION:
  1. window.locator('button:has-text("Profile")').click()
  2. Wait 2 seconds for profile data to load
  3. Screenshot

ASSERT:
  1. "Profile" heading visible: window.locator('text=Profile').first().isVisible() === true
  2. Display Name input visible: window.locator('input[name="profile-display-name"]').isVisible() === true
  3. Status input visible: window.locator('input[name="profile-custom-status"]').isVisible() === true
  4. Bio textarea visible: window.locator('textarea[placeholder*="Tell others"]').isVisible() === true
  5. Avatar section visible with "Avatar" label
  6. Banner section visible with "Upload Banner" button
  7. Preview panel visible on the right side: window.locator('text=Preview').isVisible() === true
  8. "Save Changes" button visible (may be disabled if no changes)
```

#### 10.08 — Change display name and verify in preview
```
ACTION:
  1. const newName = 'QA Admin Display ' + Date.now()
  2. window.locator('input[name="profile-display-name"]').clear()
  3. window.locator('input[name="profile-display-name"]').fill(newName)
  4. Wait 1 second for preview to update
  5. Screenshot: preview should show new name

ASSERT:
  1. Preview panel on the right shows the new display name
  2. "Save Changes" button is now enabled (green/success color, not disabled)

ACTION (save):
  3. window.locator('button:has-text("Save Changes")').click()
  4. Wait 3 seconds
  5. Screenshot

ASSERT (after save):
  1. "Saved!" success indicator appears: window.locator('text=Saved!').isVisible() === true
  2. No error message

VERIFY EFFECT:
  1. Close settings: window.locator('[aria-label="Close"]').click()
  2. Check the user panel at bottom shows the new display name
  3. Navigate to a channel and check if messages by qa_admin show the new display name

CLEANUP:
  1. Re-open settings → Profile tab
  2. Clear display name (set to empty or original value)
  3. Save
```

#### 10.09 — Change custom status
```
ACTION:
  1. window.locator('input[name="profile-custom-status"]').clear()
  2. window.locator('input[name="profile-custom-status"]').fill('QA Testing in progress')
  3. window.locator('button:has-text("Save Changes")').click()
  4. Wait 3 seconds
  5. Screenshot

ASSERT:
  1. Save success indicator appears
  2. Preview shows the custom status text
  3. Custom status placeholder is "What's on your mind?"

VERIFY EFFECT:
  1. Close settings
  2. Open own profile popover (click own name in member list)
  3. Custom status should be visible in the popover

CLEANUP:
  1. Clear custom status and save
```

#### 10.10 — Change bio with character count
```
ACTION:
  1. Navigate to Profile tab
  2. window.locator('textarea[placeholder*="Tell others"]').clear()
  3. window.locator('textarea[placeholder*="Tell others"]').fill('This is my QA bio. Testing the profile system.')
  4. Screenshot: bio filled, character count visible
  5. window.locator('button:has-text("Save Changes")').click()
  6. Wait 3 seconds

ASSERT:
  1. Character count visible below textarea (format: "XX/500")
  2. Count updates as text is typed
  3. Preview panel shows the bio text under "About Me" section
  4. Save succeeds

ACTION (test limit):
  5. Fill bio with 500 characters: 'A'.repeat(500)
  6. Try to type one more character — should be prevented (maxLength 500)
  7. Screenshot: at limit

ASSERT (limit):
  1. Character count shows "500/500" in danger color
  2. Cannot type beyond 500 characters

CLEANUP:
  1. Clear bio, save
```

#### 10.11 — Timezone privacy toggle
```
ACTION:
  1. Navigate to Profile tab
  2. Scroll down to "Privacy" section
  3. Wait for privacy settings to load
  4. Screenshot: privacy section

ASSERT:
  1. "Your Timezone" dropdown visible
  2. "Show timezone publicly" toggle visible
  3. Toggle has a current state (on or off)

ACTION (toggle):
  4. Click the "Show timezone publicly" toggle button
  5. Wait 2 seconds for auto-save
  6. Screenshot: toggled state

ASSERT (toggle effect):
  1. Toggle visually changes state (moves to opposite position)
  2. Setting is auto-saved (no manual save button needed for privacy settings)
  3. No error in console

CLEANUP:
  1. Toggle back to original state
```

### Appearance Tab

#### 10.12 — Navigate to Appearance tab
```
ACTION:
  1. window.locator('button:has-text("Appearance")').click()
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. "Appearance" heading visible: window.locator('text=Appearance').first().isVisible() === true
  2. "Theme" section visible with theme buttons
  3. "Message Display" section visible with Cozy/Compact options
  4. "Font Size" section visible with a range slider
  5. "Advanced" section visible with Developer Mode toggle
```

#### 10.13 — Change theme and verify CSS variable change
```
ACTION:
  1. Record current background color:
     const bgBefore = await window.evaluate(() =>
       getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim());
  2. Click a different theme button (e.g., if current is "dark", click "midnight"):
     window.locator('button:has-text("Midnight")').click()
     (OR try other theme names from themeNames map)
  3. Wait 2 seconds for theme to apply
  4. Screenshot: new theme applied
  5. Record new background color:
     const bgAfter = await window.evaluate(() =>
       getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim());

ASSERT:
  1. bgBefore !== bgAfter — the CSS variable actually changed
  2. Theme button shows active/selected state (border-brand-primary styling)
  3. The entire settings modal and visible UI reflects the new theme colors
  4. No flash of white or unstyled content

VERIFY EFFECT:
  1. Close settings
  2. Main app also uses the new theme colors
  3. Re-read --bg-primary outside settings — should match bgAfter
```

#### 10.14 — Change font size via slider and verify computed font-size
```
ACTION:
  1. Read current font size CSS variable:
     const fontBefore = await window.evaluate(() =>
       getComputedStyle(document.documentElement).getPropertyValue('--chat-font-size').trim());
  2. Locate the font size slider: window.locator('input[type="range"]').first()
  3. Change slider to maximum (24):
     await window.locator('input[type="range"]').first().fill('24')
  4. Wait 1 second
  5. Screenshot
  6. Read new font size:
     const fontAfter = await window.evaluate(() =>
       getComputedStyle(document.documentElement).getPropertyValue('--chat-font-size').trim());

ASSERT:
  1. fontAfter === '24px' (or contains '24')
  2. fontBefore !== fontAfter (value actually changed)
  3. Slider display shows "24px" text
  4. Font size label between the slider shows current value

ACTION (test minimum):
  7. Change slider to minimum (10):
     await window.locator('input[type="range"]').first().fill('10')
  8. Wait 1 second
  9. const fontMin = await window.evaluate(() =>
       getComputedStyle(document.documentElement).getPropertyValue('--chat-font-size').trim());

ASSERT (minimum):
  1. fontMin === '10px'
  2. Slider display shows "10px"

CLEANUP:
  1. Reset to default (16): await window.locator('input[type="range"]').first().fill('16')
```

#### 10.15 — Compact mode toggle
```
ACTION:
  1. In Appearance tab, locate Message Display section
  2. Record current density:
     const densityBefore = await window.evaluate(() =>
       document.documentElement.getAttribute('data-density'));
  3. Click "Compact" button:
     window.locator('button:has-text("Compact")').click()
  4. Wait 1 second
  5. Screenshot
  6. const densityAfter = await window.evaluate(() =>
       document.documentElement.getAttribute('data-density'));

ASSERT:
  1. densityAfter === 'compact'
  2. "Compact" button has selected styling (border-brand-primary)
  3. "Cozy" button does NOT have selected styling

ACTION (switch back):
  7. Click "Cozy": window.locator('button:has-text("Cozy")').click()
  8. Wait 1 second
  9. const densityReset = await window.evaluate(() =>
       document.documentElement.getAttribute('data-density'));

ASSERT (reset):
  1. densityReset === 'cozy'
  2. "Cozy" button now has selected styling
```

#### 10.16 — Developer Mode toggle
```
ACTION:
  1. In Appearance tab, scroll to "Advanced" section
  2. Locate "Developer Mode" toggle and its current state
  3. Click the Developer Mode toggle button
  4. Wait 1 second
  5. Screenshot

ASSERT:
  1. Toggle visually changes state (knob moves, background color changes)
  2. If toggled ON: background is green (bg-success)
  3. If toggled OFF: background is gray (bg-bg-tertiary)
```

### Notifications Tab

#### 10.17 — Navigate to Notifications tab and verify all toggles
```
ACTION:
  1. window.locator('button:has-text("Notifications")').click()
  2. Wait 2 seconds for settings to load
  3. Screenshot

ASSERT:
  1. "Notifications" heading visible: window.locator('text=Notifications').first().isVisible() === true
  2. "Enable Desktop Notifications" toggle visible:
     window.locator('text=Enable Desktop Notifications').isVisible() === true
  3. "Enable Sounds" toggle visible:
     window.locator('text=Enable Sounds').isVisible() === true
  4. "Mentions Only" toggle visible:
     window.locator('text=Mentions Only').isVisible() === true
  5. "Flash Taskbar" toggle visible (Electron only):
     window.locator('text=Flash Taskbar').isVisible() === true
```

#### 10.18 — Toggle Desktop Notifications and verify state
```
ACTION:
  1. Locate the toggle button next to "Enable Desktop Notifications"
  2. Determine current state by checking the toggle's background color:
     const toggleBefore = await window.evaluate(() => {
       const toggles = document.querySelectorAll('[class*="rounded-full"][class*="relative"][class*="w-11"]');
       return toggles[0]?.className.includes('bg-success');
     });
  3. Click the toggle:
     window.locator('text=Enable Desktop Notifications').locator('..').locator('..').locator('button[class*="rounded-full"]').click()
  4. Wait 2 seconds (auto-saves to server)
  5. Screenshot

ASSERT:
  1. Toggle visual state changed (green to gray or gray to green)
  2. Setting is auto-saved (no save button click needed)
  3. No error in console

CLEANUP:
  1. Toggle back to original state
```

#### 10.19 — Toggle Sounds and verify state
```
ACTION:
  1. Click the toggle next to "Enable Sounds"
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. Toggle visual state changed
  2. Auto-saved to server

CLEANUP:
  1. Toggle back to original
```

#### 10.20 — Toggle Mentions Only
```
ACTION:
  1. Click the toggle next to "Mentions Only"
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. Toggle visual state changed
  2. Description says "Only notify for messages that mention you directly"
  3. Auto-saved

CLEANUP:
  1. Toggle back to original
```

### Voice & Video Tab

#### 10.21 — Navigate to Voice & Video tab and verify controls
```
ACTION:
  1. window.locator('button:has-text("Voice & Video")').click()
  2. Wait 3 seconds for device enumeration and settings load
  3. Screenshot

ASSERT:
  1. "Voice & Video" heading visible: window.locator('text=Voice & Video').first().isVisible() === true
  2. "Input Device" dropdown visible with "Default" option
  3. "Output Device" dropdown visible with "Default" option
  4. Input Volume slider visible: window.locator('input[name="input-volume"]').isVisible() === true
  5. Output Volume slider visible: window.locator('input[name="output-volume"]').isVisible() === true
  6. Input Sensitivity slider visible: window.locator('input[name="input-sensitivity"]').isVisible() === true
  7. "Test Microphone" button visible: window.locator('button:has-text("Test Microphone")').isVisible() === true
  8. "Test Speakers" button visible: window.locator('button:has-text("Test Speakers")').isVisible() === true
```

#### 10.22 — Input volume slider at extremes
```
ACTION:
  1. Set input volume to minimum (0):
     await window.locator('input[name="input-volume"]').fill('0')
  2. Wait 1 second
  3. Screenshot: label should show "Input Volume - 0%"

  4. Set input volume to maximum (200):
     await window.locator('input[name="input-volume"]').fill('200')
  5. Wait 1 second
  6. Screenshot: label should show "Input Volume - 200%"

ASSERT:
  1. At 0: label shows "Input Volume - 0%"
  2. At 200: label shows "Input Volume - 200%"
  3. Slider position visually matches the value
  4. No crash at extremes

CLEANUP:
  1. Reset to 100: await window.locator('input[name="input-volume"]').fill('100')
```

#### 10.23 — Output volume slider at extremes
```
ACTION:
  1. Set output volume to 0:
     await window.locator('input[name="output-volume"]').fill('0')
  2. Wait 1 second
  3. Screenshot

  4. Set output volume to 200:
     await window.locator('input[name="output-volume"]').fill('200')
  5. Wait 1 second
  6. Screenshot

ASSERT:
  1. At 0: label shows "Output Volume - 0%"
  2. At 200: label shows "Output Volume - 200%"

CLEANUP:
  1. Reset to 100
```

#### 10.24 — Echo cancellation toggle
```
ACTION:
  1. Scroll to "Audio Processing" section
  2. Locate "Echo Cancellation" toggle
  3. Click the toggle
  4. Wait 2 seconds
  5. Screenshot

ASSERT:
  1. Toggle changes visual state (green/success to gray or vice versa)
  2. Setting auto-saves

CLEANUP:
  1. Toggle back to original state (should be ON by default)
```

#### 10.25 — AI Noise Suppression toggle
```
ACTION:
  1. Locate "AI Noise Suppression" toggle
  2. Check if it's enabled/disabled (may be unsupported in some environments)
  3. If enabled, click the toggle
  4. Wait 2 seconds
  5. Screenshot

ASSERT:
  1. If supported: toggle changes state, shows CPU indicator dot when enabled
  2. If unsupported: toggle is disabled with explanation text
  3. Description says "AI-powered noise removal using DTLN" or unsupported reason
  4. When AI NS is disabled, "Browser Noise Suppression" fallback toggle appears
```

#### 10.26 — Voice Activity Detection toggle
```
ACTION:
  1. Locate "Voice Activity Detection" toggle
  2. Click the toggle
  3. Wait 2 seconds
  4. Screenshot

ASSERT:
  1. Toggle changes state
  2. Description says "Automatically detect when you're speaking"

CLEANUP:
  1. Toggle back to original
```

#### 10.27 — Test Microphone button
```
ACTION:
  1. Click "Test Microphone": window.locator('button:has-text("Test Microphone")').click()
  2. Wait 3 seconds (microphone permission dialog may appear)
  3. Screenshot

ASSERT:
  1. Button text changes to "Stop Testing" while active
  2. Mic level indicator bar appears below the input volume slider
  3. If microphone permission denied: graceful error (not a crash)

CLEANUP:
  1. Click "Stop Testing" to end the test:
     window.locator('button:has-text("Stop Testing")').click()
```

### Keybinds Tab

#### 10.28 — Navigate to Keybinds tab (Electron only)
```
PRECONDITION: Running in Electron (Keybinds tab is conditionally rendered only in Electron)

ACTION:
  1. window.locator('button:has-text("Keybinds")').click()
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. "Keybinds" heading visible: window.locator('text=Keybinds').first().isVisible() === true
  2. Keybind actions listed:
     - "Toggle Microphone" visible
     - "Toggle Deafen" visible
     - "Push to Talk" visible
     - "Toggle Overlay" visible
  3. Each action has a keybind input button (showing current binding or "Not set")
  4. "Save Keybinds" button visible: window.locator('button:has-text("Save Keybinds")').isVisible() === true
```

#### 10.29 — Record a keybind
```
ACTION:
  1. Click the keybind button next to "Toggle Microphone":
     window.locator('text=Toggle Microphone').locator('..').locator('button').first().click()
  2. Wait 1 second — input should enter recording mode with pulse animation
  3. Screenshot: recording mode
  4. Press Ctrl+Shift+M:
     window.keyboard.press('Control+Shift+M')
  5. Wait 1 second
  6. Screenshot: keybind recorded

ASSERT:
  1. Recording state: input shows "Press a key combo..." placeholder
  2. After pressing keys: input shows the recorded combo (e.g., "Ctrl+Shift+M")
  3. Keybind is NOT saved yet (need to click Save)
```

#### 10.30 — Save keybinds
```
PRECONDITION: Keybind changed in 10.29

ACTION:
  1. window.locator('button:has-text("Save Keybinds")').click()
  2. Wait 3 seconds
  3. Screenshot

ASSERT:
  1. "Keybinds saved!" success message appears:
     window.locator('text=Keybinds saved!').isVisible() === true
  2. No error message
```

#### 10.31 — Clear a keybind
```
ACTION:
  1. Locate the clear button (X icon) next to a set keybind:
     window.locator('[title="Clear keybind"]').first().click()
  2. Wait 1 second
  3. Screenshot

ASSERT:
  1. Keybind button now shows "Not set" instead of the key combo
  2. Clear button disappears (only shown when a keybind is set)

CLEANUP:
  1. Save keybinds to persist the cleared state
```

### Settings Persistence

#### 10.32 — Theme persists after page reload
```
ACTION:
  1. Open settings, go to Appearance tab
  2. Select a theme different from default (e.g., click "Midnight" or another non-default theme)
  3. Wait 2 seconds
  4. Record the theme CSS variable:
     const themeVar = await window.evaluate(() =>
       getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim());
  5. Close settings
  6. Reload the page: window.evaluate(() => location.reload())
  7. Wait for app to fully reload (up to 10 seconds)
  8. Record the CSS variable again:
     const themeAfterReload = await window.evaluate(() =>
       getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim());
  9. Screenshot

ASSERT:
  1. themeVar === themeAfterReload — theme survived the reload
  2. The app still shows the selected theme (not reverted to default)

CLEANUP:
  1. Re-open settings, switch back to default theme ("Dark" or original)
```

#### 10.33 — Font size persists after page reload
```
ACTION:
  1. Open settings → Appearance tab
  2. Change font size to 20: await window.locator('input[type="range"]').first().fill('20')
  3. Wait 2 seconds for debounced save
  4. Close settings
  5. Reload page: window.evaluate(() => location.reload())
  6. Wait for full reload (10 seconds)
  7. const fontAfterReload = await window.evaluate(() =>
       getComputedStyle(document.documentElement).getPropertyValue('--chat-font-size').trim());
  8. Screenshot

ASSERT:
  1. fontAfterReload === '20px' — font size persisted

CLEANUP:
  1. Reset font size to 16
```

#### 10.34 — Display name persists after page reload
```
ACTION:
  1. Open settings → Profile tab
  2. Set display name to 'Persistent Name Test'
  3. Save
  4. Wait 3 seconds
  5. Close settings
  6. Reload page
  7. Wait for full reload
  8. Re-open settings → Profile tab
  9. Read the display name input value:
     const name = await window.locator('input[name="profile-display-name"]').inputValue()
  10. Screenshot

ASSERT:
  1. name === 'Persistent Name Test' — display name persisted

CLEANUP:
  1. Clear display name, save
```

#### 10.35 — Notification settings persist after page reload
```
ACTION:
  1. Open settings → Notifications tab
  2. Toggle "Mentions Only" ON (if it was OFF)
  3. Wait 2 seconds for auto-save
  4. Close settings
  5. Reload page
  6. Wait for full reload
  7. Re-open settings → Notifications tab
  8. Wait 2 seconds for settings to load from server
  9. Screenshot

ASSERT:
  1. "Mentions Only" toggle is still ON after reload
  2. Setting persisted to server and loaded back correctly

CLEANUP:
  1. Toggle "Mentions Only" back OFF
```

### Close Settings

#### 10.36 — Close settings with close button
```
ACTION:
  1. Ensure settings modal is open
  2. Click the close button: window.locator('[aria-label="Close"]').click()
  3. Wait 1 second
  4. Screenshot

ASSERT:
  1. Settings modal is gone
  2. Main app (channels, chat) is visible again
  3. App is interactive (can click on channels, type messages)
```

#### 10.37 — Close settings with Escape key
```
ACTION:
  1. Re-open settings
  2. window.keyboard.press('Escape')
  3. Wait 1 second
  4. Screenshot

ASSERT:
  1. Settings modal closes
  2. Main app visible and interactive
```

### Final Cleanup
```
Ensure:
  1. Settings modal closed
  2. Logged in as qa_admin
  3. All settings reverted to defaults:
     - Theme: dark (or original)
     - Font size: 16
     - Display name: cleared
     - Custom status: cleared
     - Bio: cleared
     - All notification toggles at defaults
  4. On server view
```
