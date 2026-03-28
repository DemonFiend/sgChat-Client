# Suite 23 — Settings Parity

## SETUP
- App launched, logged in as qa_admin
- On server view, main app loaded
- Navigate to Settings via user avatar/gear icon in the bottom-left

## TESTS

### Tab Structure

#### 23.01 — All 6 settings tabs visible
```
PRECONDITION: Settings panel open

ACTION:
  1. Open Settings (click gear icon or user avatar area)
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s23-01-settings-tabs.png' })

ASSERT:
  1. window.locator('text=My Account').isVisible() === true
  2. window.locator('text=Profile').isVisible() === true
  3. window.locator('text=Appearance').isVisible() === true
  4. window.locator('text=Notifications').isVisible() === true
  5. window.locator('text=Keybinds').isVisible() === true
  6. window.locator('text=Voice & Video').isVisible() === true
  7. Exactly 6 tab items in the settings sidebar
```

#### 23.02 — My Account tab contents
```
ACTION:
  1. window.locator('text=My Account').click()
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s23-02-my-account.png' })

ASSERT:
  1. Avatar upload/change area visible
  2. Banner upload/change area visible
  3. Email section visible (shows current email or edit option)
  4. Password change section visible
  5. 2FA / Two-Factor Authentication section visible
  6. Privacy section visible
  7. Account removal section visible (at bottom)
```

#### 23.03 — Profile tab contents
```
ACTION:
  1. window.locator('text=Profile').click()
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s23-03-profile.png' })

ASSERT:
  1. window.locator('input[placeholder="How others see you"]').isVisible() === true
  2. window.locator('input[placeholder="e.g. they/them"]').isVisible() === true
  3. window.locator('textarea[placeholder="Tell us about yourself..."]').isVisible() === true
     OR window.locator('input[placeholder="Tell us about yourself..."]').isVisible() === true
  4. window.locator('input[placeholder="What\'s on your mind?"]').isVisible() === true
```

#### 23.04 — Tabs work independently (switching preserves unsaved changes within tab)
```
ACTION:
  1. window.locator('text=Profile').click()
  2. window.locator('input[placeholder="How others see you"]').fill('TempDisplayName')
  3. window.locator('text=Appearance').click()
  4. Wait 1 second
  5. window.locator('text=Profile').click()
  6. Wait 1 second
  7. window.screenshot({ path: 'qa-screenshots/s23-04-tab-independence.png' })

ASSERT:
  1. Appearance tab loaded without error when clicked
  2. Profile tab loaded without error when clicked back
  3. Each tab renders its own content (no bleed between tabs)
  4. App did not crash or show error during switching

CLEANUP:
  1. Clear the temp display name if it persisted
```

### Server-Side Sync

#### 23.05 — Notification setting persists after close and reopen
```
ACTION:
  1. Open Settings → Notifications tab
  2. window.locator('text=Notifications').click()
  3. Wait 1 second
  4. Find a notification toggle/switch and note its state
  5. Click the toggle to change it
  6. Wait 2 seconds for save
  7. window.screenshot({ path: 'qa-screenshots/s23-05-notif-changed.png' })
  8. Close Settings
  9. Reopen Settings → Notifications
  10. window.screenshot({ path: 'qa-screenshots/s23-05-notif-persisted.png' })

ASSERT:
  1. Toggle state after reopen matches the changed state (not the original)
  2. Setting was persisted server-side
```

#### 23.06 — Notification setting persists after page reload
```
PRECONDITION: Changed notification setting from 23.05

ACTION:
  1. window.reload()
  2. Wait for app to fully load (up to 15 seconds)
  3. Open Settings → Notifications
  4. window.screenshot({ path: 'qa-screenshots/s23-06-notif-after-reload.png' })

ASSERT:
  1. Toggle state matches what was set in 23.05
  2. Setting survived a full page reload (server-side persistence confirmed)

CLEANUP:
  1. Restore original notification setting
```

#### 23.07 — Voice setting persists
```
ACTION:
  1. Open Settings → Voice & Video
  2. window.locator('text=Voice & Video').click()
  3. Wait 1 second
  4. Find a voice setting (e.g. input volume slider, noise suppression toggle)
  5. Change the setting
  6. Wait 2 seconds
  7. Close Settings
  8. Reopen Settings → Voice & Video
  9. window.screenshot({ path: 'qa-screenshots/s23-07-voice-persisted.png' })

ASSERT:
  1. Voice setting retained its changed value
  2. No reset to defaults
```

#### 23.08 — Device selection stays local (not synced to server)
```
ACTION:
  1. Open Settings → Voice & Video
  2. Look for audio input/output device dropdowns
  3. Note the selected devices
  4. window.screenshot({ path: 'qa-screenshots/s23-08-device-selection.png' })

ASSERT:
  1. Device selection dropdowns are present
  2. They show local system audio devices
  3. Device selections are stored locally (not a server round-trip)
  4. Changing device does not trigger a server save (check network or absence of save toast)
```

### Dual Logout

#### 23.09 — "Log Out" → returns to login page
```
PRECONDITION: Settings open, logged in as qa_admin

ACTION:
  1. Scroll to find "Log Out" button in settings
  2. window.locator('button:has-text("Log Out")').first().click()
  3. Wait up to 10 seconds
  4. window.screenshot({ path: 'qa-screenshots/s23-09-logout.png' })

ASSERT:
  1. Redirected to login page
  2. window.locator('input[name="email"]').isVisible() === true
  3. window.locator('input[name="password"]').isVisible() === true
  4. NOT on server setup page (server URL still remembered)

CLEANUP:
  1. Log back in as qa_admin
```

#### 23.10 — "Log Out & Forget Device" → returns to server setup page
```
PRECONDITION: Logged in as qa_admin, Settings open

ACTION:
  1. Scroll to find "Log Out & Forget Device" button
  2. window.locator('button:has-text("Log Out & Forget Device")').click()
  3. Wait up to 10 seconds
  4. window.screenshot({ path: 'qa-screenshots/s23-10-logout-forget.png' })

ASSERT:
  1. Redirected to server setup page (NOT login page)
  2. window.locator('input[type="url"]').isVisible() === true
  3. Server URL field is empty or shows placeholder (device forgotten)
  4. Login form is NOT visible

CLEANUP:
  1. Enter server URL: window.locator('input[type="url"]').fill('http://localhost:3124')
  2. window.locator('button:has-text("Connect")').click()
  3. Wait for login page, log back in as qa_admin
```

### Account Removal

#### 23.11 — Account removal section visible at bottom of My Account
```
PRECONDITION: Settings open

ACTION:
  1. window.locator('text=My Account').click()
  2. Scroll to the bottom of the My Account panel
  3. window.screenshot({ path: 'qa-screenshots/s23-11-account-removal.png' })

ASSERT:
  1. Account removal section is visible
  2. "Disable Account" option/button visible
  3. "Delete Account" option/button visible
  4. Section is at the bottom of the page (dangerous actions last)
```

#### 23.12 — "Disable Account" → shows not yet available
```
ACTION:
  1. Click "Disable Account" button
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s23-12-disable-account.png' })

ASSERT:
  1. Modal or message appears indicating feature is not yet available
  2. Account is NOT disabled (still logged in)
  3. No destructive action taken
```

#### 23.13 — "Delete Account" → shows not yet available
```
ACTION:
  1. Click "Delete Account" button
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s23-13-delete-account.png' })

ASSERT:
  1. Modal or message appears indicating feature is not yet available
  2. Account is NOT deleted (still logged in)
  3. No destructive action taken
```

### Final Cleanup
```
Ensure we're logged in as qa_admin.
Close Settings panel.
Return to server view.
```
