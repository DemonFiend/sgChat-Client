# Suite 35 — Moderation Workflow

## SETUP
- Launch Electron app via `_electron.launch()`
- Get first window: `electronApp.firstWindow()`
- Log in as qa_admin (admin permissions)
- Navigate to server view
- Ensure at least one other non-admin member is visible in the member list

Key components (Electron client, Mantine-based):
- `src/renderer/components/ui/TimeoutModal.tsx` — Mantine `<Modal>` with preset duration buttons, custom duration (NumberInput + Select), reason Textarea
- `src/renderer/components/ui/AdminMenu.tsx` — Paper-based context menu with moderation actions (Timeout, Change Nickname, Warn, View Warnings, Kick, Ban)
- `src/renderer/components/ui/UserContextMenu.tsx` — Right-click on user, shows profile + moderation sections

## TESTS

### 35.01 — Right-click member opens UserContextMenu
```
ACTION:
  1. Locate a non-admin member in the member list:
     const member = window.locator('[class*="member"]').filter({ hasNot: window.locator('text=qa_admin') }).first()
  2. member.click({ button: 'right' })
  3. await window.waitForTimeout(500)
  4. await window.screenshot({ path: 'qa-screenshots/s35-01-context-menu.png' })

ASSERT:
  1. Context menu portal is visible:
     window.locator('[class*="fixed"][class*="z-"]').filter({ hasText: 'Profile' }).isVisible() === true
  2. "Profile" action item visible:
     window.locator('text=Profile').isVisible() === true
  3. "Copy Username" action item visible:
     window.locator('text=Copy Username').isVisible() === true
```

### 35.02 — UserContextMenu shows Moderation section for admin
```
PRECONDITION: UserContextMenu is open from 35.01

ACTION:
  1. Scroll within the context menu if needed
  2. await window.screenshot({ path: 'qa-screenshots/s35-02-mod-section.png' })

ASSERT:
  1. Moderation section label visible:
     window.locator('text=Moderation').isVisible() === true
  2. "Warn" action visible:
     window.locator('button:has-text("Warn"), [role="button"]:has-text("Warn")').isVisible() === true
  3. "Timeout" action visible:
     window.locator('button:has-text("Timeout"), [role="button"]:has-text("Timeout")').isVisible() === true
  4. "Kick" action visible:
     window.locator('button:has-text("Kick"), [role="button"]:has-text("Kick")').isVisible() === true
  5. "Ban" action visible:
     window.locator('button:has-text("Ban"), [role="button"]:has-text("Ban")').isVisible() === true
```

### 35.03 — Escape closes UserContextMenu
```
PRECONDITION: UserContextMenu is open

ACTION:
  1. await window.keyboard.press('Escape')
  2. await window.waitForTimeout(300)
  3. await window.screenshot({ path: 'qa-screenshots/s35-03-menu-closed.png' })

ASSERT:
  1. Context menu is no longer visible:
     await expect(window.locator('text=Moderation')).not.toBeVisible()
  2. Member list is still visible behind
```

### 35.04 — AdminMenu opens at correct position via member list admin button
```
ACTION:
  1. Locate an admin menu trigger on a member (the member list renders admin gear/buttons):
     Approach: right-click a non-admin member, then look for an admin action trigger
     const member = window.locator('[class*="member"]').filter({ hasNot: window.locator('text=qa_admin') }).first()
     await member.click({ button: 'right' })
  2. await window.waitForTimeout(300)
  3. await window.screenshot({ path: 'qa-screenshots/s35-04-admin-menu.png' })

ASSERT:
  1. The admin menu / context menu portal is visible on screen
  2. "Admin Actions" label visible:
     window.locator('text=Admin Actions').isVisible() === true
     OR moderation items (Timeout, Kick, Ban) are visible in the context menu
  3. Menu appears near the click position (not at 0,0 or off-screen)
```

### 35.05 — Clicking Timeout in AdminMenu opens TimeoutModal
```
ACTION:
  1. Open AdminMenu / context menu on a non-admin member (right-click method)
  2. Click "Timeout" action:
     window.locator('button:has-text("Timeout"), [role="button"]:has-text("Timeout")').click()
  3. await window.waitForTimeout(500)
  4. await window.screenshot({ path: 'qa-screenshots/s35-05-timeout-modal.png' })

ASSERT:
  1. Mantine Modal is visible:
     window.locator('[role="dialog"]').isVisible() === true
  2. Modal title contains "Timeout" and the target username:
     window.locator('[role="dialog"]').locator('text=Timeout').isVisible() === true
  3. Duration preset buttons are visible (all 6):
     window.locator('[role="dialog"] button:has-text("60s")').isVisible() === true
     window.locator('[role="dialog"] button:has-text("5m")').isVisible() === true
     window.locator('[role="dialog"] button:has-text("1h")').isVisible() === true
     window.locator('[role="dialog"] button:has-text("1w")').isVisible() === true
```

### 35.06 — Selecting a duration preset highlights it
```
PRECONDITION: TimeoutModal is open

ACTION:
  1. Click the "5m" preset button:
     window.locator('[role="dialog"] button:has-text("5m")').click()
  2. await window.waitForTimeout(200)
  3. await window.screenshot({ path: 'qa-screenshots/s35-06-preset-selected.png' })

ASSERT:
  1. The "5m" button has the filled/violet variant (Mantine Button variant="filled" color="violet"):
     The button styling changes to indicate selection — screenshot confirms highlighted state
  2. The "Timeout" submit button at the bottom is enabled (not disabled):
     window.locator('[role="dialog"] button:has-text("Timeout")').last().isEnabled() === true
```

### 35.07 — Custom duration input works
```
PRECONDITION: TimeoutModal is open

ACTION:
  1. Click into the custom NumberInput (placeholder "Custom"):
     window.locator('[role="dialog"] input[placeholder="Custom"], [role="dialog"] input[inputmode="numeric"]').fill('15')
  2. Change the unit Select to "Hours":
     window.locator('[role="dialog"] select, [role="dialog"] [role="combobox"]').last().click()
     window.locator('[role="option"]:has-text("Hours"), option:has-text("Hours")').click()
  3. await window.waitForTimeout(200)
  4. await window.screenshot({ path: 'qa-screenshots/s35-07-custom-duration.png' })

ASSERT:
  1. Custom value input shows "15":
     window.locator('[role="dialog"] input').first().inputValue() contains '15'
  2. The unit selector shows "Hours"
  3. Preset buttons are deselected (none has filled variant):
     Screenshot confirms no preset is highlighted
  4. Submit button is enabled
```

### 35.08 — Reason textarea accepts text
```
PRECONDITION: TimeoutModal is open

ACTION:
  1. Locate the reason textarea:
     window.locator('[role="dialog"] textarea').fill('Spamming in chat')
  2. await window.waitForTimeout(200)
  3. await window.screenshot({ path: 'qa-screenshots/s35-08-reason.png' })

ASSERT:
  1. Textarea value is "Spamming in chat":
     await expect(window.locator('[role="dialog"] textarea')).toHaveValue('Spamming in chat')
  2. The label "Reason" is visible near the textarea
```

### 35.09 — Submit timeout with preset duration
```
PRECONDITION: TimeoutModal is open with a preset selected

ACTION:
  1. Select "60s" preset:
     window.locator('[role="dialog"] button:has-text("60s")').click()
  2. Click the "Timeout" submit button:
     window.locator('[role="dialog"] button:has-text("Timeout")').last().click()
  3. await window.waitForTimeout(2000)
  4. await window.screenshot({ path: 'qa-screenshots/s35-09-timeout-submitted.png' })

ASSERT:
  1. Modal closes after submission:
     await expect(window.locator('[role="dialog"]')).not.toBeVisible({ timeout: 5000 })
  2. A toast notification appears confirming the timeout:
     window.locator('text=User Timed Out').or(window.locator('text=timed out')).isVisible() === true
  3. No error toast visible (no "Timeout Failed" text)
```

### 35.10 — Cancel button closes TimeoutModal without action
```
ACTION:
  1. Open TimeoutModal on a member (repeat right-click -> Timeout flow)
  2. Select a duration preset: window.locator('[role="dialog"] button:has-text("1d")').click()
  3. Fill reason: window.locator('[role="dialog"] textarea').fill('Testing cancel')
  4. Click Cancel:
     window.locator('[role="dialog"] button:has-text("Cancel")').click()
  5. await window.waitForTimeout(300)
  6. await window.screenshot({ path: 'qa-screenshots/s35-10-cancel.png' })

ASSERT:
  1. Modal is closed:
     await expect(window.locator('[role="dialog"]')).not.toBeVisible()
  2. No toast notification about timeout appeared
  3. Member list still shows the target member (not timed out by the cancel action)
```

### 35.11 — Kick requires confirmation (two-click pattern)
```
ACTION:
  1. Right-click a non-admin member to open context menu
  2. Click "Kick":
     window.locator('button:has-text("Kick"), [role="button"]:has-text("Kick")').click()
  3. await window.waitForTimeout(300)
  4. await window.screenshot({ path: 'qa-screenshots/s35-11-kick-confirm.png' })

ASSERT:
  1. The kick button changes to "Confirm Kick" (AdminMenu two-click pattern):
     window.locator('button:has-text("Confirm Kick"), [role="button"]:has-text("Confirm Kick")').isVisible() === true
     OR the context menu shows a confirmation overlay with "Kick" heading and reason input
  2. The action has NOT been executed yet (member still in list)
  3. A reason input or confirmation prompt is visible:
     window.locator('input[name="confirm-reason"], input[placeholder*="Reason"]').isVisible() === true
     OR window.locator('text=Confirm Kick').isVisible() === true
```

### 35.12 — Ban requires confirmation (two-click pattern)
```
ACTION:
  1. Right-click a non-admin member to open context menu
  2. Click "Ban":
     window.locator('button:has-text("Ban"), [role="button"]:has-text("Ban")').click()
  3. await window.waitForTimeout(300)
  4. await window.screenshot({ path: 'qa-screenshots/s35-12-ban-confirm.png' })

ASSERT:
  1. The ban button changes to "Confirm Ban":
     window.locator('button:has-text("Confirm Ban"), [role="button"]:has-text("Confirm Ban")').isVisible() === true
     OR the context menu shows a confirmation overlay
  2. The action has NOT been executed yet
  3. Both Kick and Ban use red/danger color styling — screenshot shows red text on the confirm button
```

### 35.13 — Warn action fires from context menu
```
ACTION:
  1. Right-click a non-admin member to open context menu
  2. Click "Warn":
     window.locator('button:has-text("Warn"), [role="button"]:has-text("Warn")').click()
  3. await window.waitForTimeout(300)
  4. await window.screenshot({ path: 'qa-screenshots/s35-13-warn.png' })

ASSERT:
  1. A confirmation overlay appears (AdminMenu shows "Warn <username>?" with reason input):
     window.locator('text=Warn').isVisible() === true
  2. A reason input field is visible for warn:
     window.locator('input[name="confirm-reason"], input[placeholder*="Reason"]').isVisible() === true
     OR the warn fires immediately with a toast "User Warned":
     window.locator('text=User Warned').isVisible() === true
```

### 35.14 — Clicking outside AdminMenu closes it
```
ACTION:
  1. Open AdminMenu on a member via right-click
  2. await window.waitForTimeout(300)
  3. Click on an empty area of the chat (outside the menu):
     window.locator('body').click({ position: { x: 10, y: 10 } })
  4. await window.waitForTimeout(300)
  5. await window.screenshot({ path: 'qa-screenshots/s35-14-menu-dismissed.png' })

ASSERT:
  1. Admin menu / context menu is no longer visible:
     await expect(window.locator('text=Admin Actions')).not.toBeVisible()
     AND await expect(window.locator('text=Moderation')).not.toBeVisible()
  2. Underlying UI (member list, chat) is interactive again
```
