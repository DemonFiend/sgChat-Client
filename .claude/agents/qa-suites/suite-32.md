# Suite 32 — Channel & Category Settings Modals

## SETUP
- Launch Electron app via `_electron.launch()`
- Log in as qa_admin (qa-admin@local.test / QATest123!)
- Navigate to server view
- Requires admin permissions to see channel settings gear icon

## TESTS

### 32.01 — Gear icon appears on channel hover
```
ACTION:
  1. Hover over a text channel in the sidebar:
     window.locator('a[href*="/channels/"]').first().hover()
  2. await window.waitForTimeout(300)
  3. Screenshot the channel row

ASSERT:
  1. A settings gear button appears (title="Edit Channel"):
     window.locator('button[title="Edit Channel"]').first().isVisible() === true
  2. Gear icon was not visible before hover (opacity-0 by default)
```

### 32.02 — Clicking gear opens Channel Settings modal
```
ACTION:
  1. Hover over a text channel:
     window.locator('a[href*="/channels/"]').first().hover()
  2. Click the gear button:
     window.locator('button[title="Edit Channel"]').first().click()
  3. await window.waitForTimeout(500)
  4. Screenshot

ASSERT:
  1. Modal is visible with header text "Channel Settings":
     window.locator('text=Channel Settings').isVisible() === true
  2. Modal has a close button (X icon)
  3. Modal has tab buttons "General" and "Permissions"
```

### 32.03 — Right-click channel context menu has "Channel Settings" option
```
ACTION:
  1. Right-click on a text channel in the sidebar:
     window.locator('a[href*="/channels/"]').first().click({ button: 'right' })
  2. await window.waitForTimeout(300)
  3. Screenshot the context menu

ASSERT:
  1. Context menu appears with "Channel Settings" option:
     window.locator('text=Channel Settings').isVisible() === true
  2. Clicking it opens the modal:
     window.locator('button:has-text("Channel Settings")').or(
       window.locator('div:has-text("Channel Settings")').last()
     ).click()
  3. await window.waitForTimeout(500)
  4. window.locator('h2:has-text("Channel Settings")').isVisible() === true
```

### 32.04 — General tab renders by default with channel name input
```
PRECONDITION: Channel Settings modal is open

ACTION:
  1. Verify General tab is active (has brand-primary border)
  2. Locate the channel name input:
     window.locator('input[name="channel-name"]')
  3. Screenshot the General tab content

ASSERT:
  1. "General" tab button has active styling (border-brand-primary class)
  2. Channel name input is visible and pre-filled:
     window.locator('input[name="channel-name"]').isVisible() === true
     (await window.locator('input[name="channel-name"]').inputValue()).length > 0
  3. "Channel Name" label is visible:
     window.locator('text=Channel Name').isVisible() === true
```

### 32.05 — Topic input is visible and editable
```
PRECONDITION: Channel Settings modal open, General tab

ACTION:
  1. Locate the topic input:
     window.locator('input[name="channel-topic"]')
  2. Clear and type a new topic:
     window.locator('input[name="channel-topic"]').fill('QA test topic')
  3. Screenshot

ASSERT:
  1. Topic input is visible: window.locator('input[name="channel-topic"]').isVisible() === true
  2. "Topic" label is visible: window.locator('text=Topic').first().isVisible() === true
  3. Input value updated: (await window.locator('input[name="channel-topic"]').inputValue()) === 'QA test topic'
  4. Placeholder text is "Set a topic for this channel"
```

### 32.06 — Channel name can be edited
```
PRECONDITION: Channel Settings modal open, General tab

ACTION:
  1. Store original name:
     const original = await window.locator('input[name="channel-name"]').inputValue()
  2. Clear and type new name:
     window.locator('input[name="channel-name"]').fill('qa-test-rename')
  3. Screenshot

ASSERT:
  1. Input value changed: (await window.locator('input[name="channel-name"]').inputValue()) === 'qa-test-rename'
  2. Save button is visible: window.locator('button:has-text("Save Changes")').isVisible() === true
  3. Cancel button is visible: window.locator('button:has-text("Cancel")').isVisible() === true
```

### 32.07 — Voice channel shows bitrate slider
```
PRECONDITION: Open Channel Settings for a VOICE channel

ACTION:
  1. Close any open modal, then hover a voice channel and click gear:
     window.locator('button[title="Edit Channel"]').first().click()
  2. await window.waitForTimeout(500)
  3. Locate the bitrate slider:
     window.locator('input[name="channel-bitrate"]')
  4. Screenshot

ASSERT:
  1. Bitrate slider is visible: window.locator('input[name="channel-bitrate"]').isVisible() === true
  2. Bitrate label is visible (contains "Bitrate" and "kbps"):
     window.locator('text=/Bitrate.*kbps/').isVisible() === true
  3. Slider has min="8000" and max="384000":
     (await window.locator('input[name="channel-bitrate"]').getAttribute('min')) === '8000'
     (await window.locator('input[name="channel-bitrate"]').getAttribute('max')) === '384000'
  4. Range endpoints labeled "8kbps" and "384kbps" are visible
```

### 32.08 — Bitrate slider minimum value shows 8kbps
```
PRECONDITION: Voice channel settings modal open, General tab

ACTION:
  1. Set slider to minimum:
     window.locator('input[name="channel-bitrate"]').fill('8000')
  2. await window.waitForTimeout(200)
  3. Screenshot

ASSERT:
  1. Bitrate label shows "8kbps":
     window.locator('text=Bitrate — 8kbps').isVisible() === true
```

### 32.09 — Bitrate slider maximum value shows 384kbps
```
PRECONDITION: Voice channel settings modal open, General tab

ACTION:
  1. Set slider to maximum:
     window.locator('input[name="channel-bitrate"]').fill('384000')
  2. await window.waitForTimeout(200)
  3. Screenshot

ASSERT:
  1. Bitrate label shows "384kbps":
     window.locator('text=Bitrate — 384kbps').isVisible() === true
```

### 32.10 — User limit slider visible with range 0-99
```
PRECONDITION: Voice channel settings modal open, General tab

ACTION:
  1. Locate the user limit slider:
     window.locator('input[name="channel-user-limit"]')
  2. Screenshot

ASSERT:
  1. User limit slider is visible: window.locator('input[name="channel-user-limit"]').isVisible() === true
  2. Slider has min="0" and max="99":
     (await window.locator('input[name="channel-user-limit"]').getAttribute('min')) === '0'
     (await window.locator('input[name="channel-user-limit"]').getAttribute('max')) === '99'
  3. Label shows "User Limit":
     window.locator('text=/User Limit/').isVisible() === true
  4. Range labels "No limit" and "99" are visible
```

### 32.11 — User limit 0 shows "Unlimited" label
```
PRECONDITION: Voice channel settings modal open, General tab

ACTION:
  1. Set user limit to 0:
     window.locator('input[name="channel-user-limit"]').fill('0')
  2. await window.waitForTimeout(200)
  3. Screenshot

ASSERT:
  1. Label shows "Unlimited":
     window.locator('text=User Limit — Unlimited').isVisible() === true
```

### 32.12 — User limit set to specific number updates label
```
PRECONDITION: Voice channel settings modal open, General tab

ACTION:
  1. Set user limit to 25:
     window.locator('input[name="channel-user-limit"]').fill('25')
  2. await window.waitForTimeout(200)
  3. Screenshot

ASSERT:
  1. Label shows the number:
     window.locator('text=User Limit — 25').isVisible() === true
```

### 32.13 — Region/relay policy selector visible for voice channels
```
PRECONDITION: Voice channel settings modal open, General tab

ACTION:
  1. Locate the region select:
     window.locator('label:has-text("Region") + select').or(window.locator('select').last())
  2. Screenshot

ASSERT:
  1. Region label is visible: window.locator('text=Region').first().isVisible() === true
  2. Select element is visible with "Main Server" as a default option:
     window.locator('option:has-text("Main Server")').isVisible() === true
  3. Description text is visible explaining the policy
```

### 32.14 — Permissions tab renders with override list
```
PRECONDITION: Channel Settings modal open

ACTION:
  1. Click the "Permissions" tab:
     window.locator('button:has-text("Permissions")').click()
  2. await window.waitForTimeout(500)
  3. Screenshot

ASSERT:
  1. "Permissions" tab button has active styling
  2. Either permission overrides are listed OR "No permission overrides configured" text is shown:
     window.locator('text=No permission overrides configured').isVisible() === true
     OR (await window.locator('.bg-bg-secondary.cursor-pointer').count()) >= 1
  3. "Add Role Override" section is visible:
     window.locator('text=Add Role Override').isVisible() === true
```

### 32.15 — Expanding a permission override shows tri-state toggles
```
PRECONDITION: Permissions tab, at least one override exists

ACTION:
  1. Click on an existing override row to expand it:
     window.locator('.bg-bg-secondary.cursor-pointer').first().click()
  2. await window.waitForTimeout(300)
  3. Screenshot the expanded permission editor

ASSERT:
  1. Permission editor section is visible (bg-bg-tertiary panel):
     window.locator('.bg-bg-tertiary.rounded-b-lg').isVisible() === true
  2. Tri-state buttons visible — Deny (X icon), Neutral (dash), Allow (checkmark):
     window.locator('button[title="Deny"]').first().isVisible() === true
     window.locator('button[title="Neutral (Inherit)"]').first().isVisible() === true
     window.locator('button[title="Allow"]').first().isVisible() === true
  3. Permission names and descriptions are listed
```

### 32.16 — Clicking a permission toggle changes its state
```
PRECONDITION: Permission override expanded, permission editor visible

ACTION:
  1. Find the first "Allow" button and click it:
     window.locator('button[title="Allow"]').first().click()
  2. await window.waitForTimeout(800)
  3. Screenshot

ASSERT:
  1. The Allow button gains active styling (bg-status-online class):
     window.locator('button[title="Allow"].bg-status-online').first().isVisible() === true
  2. Auto-save status indicator shows "Saving..." then "Saved":
     window.locator('text=Saved').isVisible() === true
     (wait up to 3 seconds for the saved indicator)
```

### 32.17 — Remove override button deletes the override
```
PRECONDITION: Permissions tab, at least one override exists

ACTION:
  1. Count overrides before:
     const before = await window.locator('.bg-bg-secondary.cursor-pointer').count()
  2. Click the delete (trash) button on the first override:
     window.locator('button[title="Remove override"]').first().click()
  3. await window.waitForTimeout(500)
  4. Screenshot

ASSERT:
  1. Override count decreased or the override is removed:
     (await window.locator('.bg-bg-secondary.cursor-pointer').count()) < before
     OR window.locator('text=No permission overrides configured').isVisible() === true
```

### 32.18 — Cancel button closes modal without saving
```
PRECONDITION: Channel Settings modal open, some changes made

ACTION:
  1. Modify the channel name:
     window.locator('input[name="channel-name"]').fill('should-not-save')
  2. Click Cancel:
     window.locator('button:has-text("Cancel")').click()
  3. await window.waitForTimeout(300)
  4. Screenshot

ASSERT:
  1. Modal is closed — "Channel Settings" header no longer visible:
     window.locator('h2:has-text("Channel Settings")').isVisible() === false
  2. The channel name in the sidebar did NOT change to "should-not-save"
```
