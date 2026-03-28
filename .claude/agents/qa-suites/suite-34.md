# Suite 34 — Server Management Modals

## SETUP
- Launch Electron app via `_electron.launch()`
- Log in as qa_admin (qa-admin@local.test / QATest123!)
- Navigate to server view
- qa_admin must have admin/owner permissions for transfer ownership tests

## TESTS

### 34.01 — Create Server modal opens from sidebar
```
ACTION:
  1. Locate and click the "Create Server" trigger in the sidebar or server dropdown
     (look for a + icon or "Create a Server" button):
     window.locator('button:has-text("Create")').or(
       window.locator('button[title*="Create"]')
     ).first().click()
  2. await window.waitForTimeout(500)
  3. Screenshot

ASSERT:
  1. Modal is visible with header "Create a Server":
     window.locator('h2:has-text("Create a Server")').isVisible() === true
  2. Description text is visible:
     window.locator('text=Give your new server a name').isVisible() === true
  3. Server name input is visible:
     window.locator('input[name="server-name"]').isVisible() === true
  4. Input has placeholder "My Awesome Server":
     (await window.locator('input[name="server-name"]').getAttribute('placeholder')) === 'My Awesome Server'
  5. Input has autofocus
```

### 34.02 — Create button is disabled when server name is empty
```
PRECONDITION: Create Server modal is open

ACTION:
  1. Ensure the name input is empty:
     window.locator('input[name="server-name"]').fill('')
  2. Locate the Create button:
     window.locator('button:has-text("Create")').last()
  3. Screenshot

ASSERT:
  1. Create button is disabled:
     await window.locator('button:has-text("Create")').last().isDisabled() === true
  2. Button has disabled styling (opacity-50, cursor-not-allowed)
```

### 34.03 — Typing a server name enables the Create button
```
PRECONDITION: Create Server modal is open

ACTION:
  1. Type a server name:
     window.locator('input[name="server-name"]').fill('QA Test Server')
  2. await window.waitForTimeout(200)
  3. Screenshot

ASSERT:
  1. Create button is now enabled:
     await window.locator('button:has-text("Create")').last().isEnabled() === true
  2. Button no longer has disabled styling
```

### 34.04 — Pressing Enter in name input submits the form
```
PRECONDITION: Create Server modal open, name input has text

ACTION:
  1. Fill server name:
     window.locator('input[name="server-name"]').fill('QA Enter Test')
  2. Press Enter key:
     window.locator('input[name="server-name"]').press('Enter')
  3. await window.waitForTimeout(2000)
  4. Screenshot

ASSERT:
  1. Modal either closes (server created successfully) or shows an error:
     window.locator('h2:has-text("Create a Server")').isVisible() === false
     OR window.locator('.text-danger').isVisible() === true
  2. If successful, the new server may appear in the server list
```

### 34.05 — Pressing Escape closes the Create Server modal
```
PRECONDITION: Create Server modal is open

ACTION:
  1. Open the Create Server modal
  2. Press Escape:
     window.locator('input[name="server-name"]').press('Escape')
  3. await window.waitForTimeout(300)
  4. Screenshot

ASSERT:
  1. Modal is closed:
     window.locator('h2:has-text("Create a Server")').isVisible() === false
  2. Server view is back to normal
```

### 34.06 — Cancel button closes the Create Server modal
```
PRECONDITION: Create Server modal is open

ACTION:
  1. Click Cancel button:
     window.locator('button:has-text("Cancel")').click()
  2. await window.waitForTimeout(300)
  3. Screenshot

ASSERT:
  1. Modal is closed:
     window.locator('h2:has-text("Create a Server")').isVisible() === false
```

### 34.07 — Clicking backdrop closes the Create Server modal
```
PRECONDITION: Create Server modal is open

ACTION:
  1. Click the backdrop overlay (bg-black/60):
     window.locator('.bg-black\\/60').click({ position: { x: 10, y: 10 } })
  2. await window.waitForTimeout(300)
  3. Screenshot

ASSERT:
  1. Modal is closed:
     window.locator('h2:has-text("Create a Server")').isVisible() === false
```

### 34.08 — Transfer Ownership modal opens with danger styling
```
PRECONDITION: qa_admin is server owner. Open server settings and find transfer ownership option.

ACTION:
  1. Navigate to server settings and locate the "Transfer Ownership" option/button
  2. Click it to open the modal
  3. await window.waitForTimeout(500)
  4. Screenshot

ASSERT:
  1. Modal visible with danger header:
     window.locator('h2:has-text("Transfer Server Ownership")').isVisible() === true
  2. Header has danger/red styling (bg-danger/20 background)
  3. Warning text is visible:
     window.locator('text=This action is irreversible').isVisible() === true
  4. Modal border has danger accent (border-danger/30)
```

### 34.09 — Transfer Ownership Step 1: member select dropdown
```
PRECONDITION: Transfer Ownership modal open, Step 1 (select)

ACTION:
  1. Locate the "Select New Owner" label:
     window.locator('text=Select New Owner')
  2. Locate the select dropdown:
     window.locator('select').filter({ hasText: 'Select a member...' })
  3. Screenshot

ASSERT:
  1. "Select New Owner" label is visible
  2. Select dropdown has "Select a member..." placeholder option
  3. Continue button is disabled (no member selected):
     window.locator('button:has-text("Continue")').isDisabled() === true
  4. Continue button has muted/disabled styling (bg-bg-tertiary, text-text-muted)
```

### 34.10 — Selecting a member enables the Continue button
```
PRECONDITION: Transfer Ownership modal open, Step 1

ACTION:
  1. Open the select dropdown and pick the first eligible member:
     window.locator('select').filter({ hasText: 'Select a member...' }).selectOption({ index: 1 })
  2. await window.waitForTimeout(200)
  3. Screenshot

ASSERT:
  1. Continue button is now enabled:
     window.locator('button:has-text("Continue")').isEnabled() === true
  2. Continue button has danger styling (bg-danger, text-white)
  3. A member name is selected in the dropdown (not "Select a member...")
```

### 34.11 — Clicking Continue advances to Step 2 (confirmation)
```
PRECONDITION: A member is selected in Step 1

ACTION:
  1. Click Continue:
     window.locator('button:has-text("Continue")').click()
  2. await window.waitForTimeout(300)
  3. Screenshot

ASSERT:
  1. Step 2 is now shown with the selected member's info:
     window.locator('text=You are about to transfer ownership to').isVisible() === true
  2. Selected member's username is displayed in the confirmation card
  3. Confirmation input is visible with label 'Type TRANSFER to confirm':
     window.locator('input[name="transfer-confirm"]').isVisible() === true
  4. Input has placeholder "TRANSFER":
     (await window.locator('input[name="transfer-confirm"]').getAttribute('placeholder')) === 'TRANSFER'
  5. "Transfer Ownership" button is disabled:
     window.locator('button:has-text("Transfer Ownership")').isDisabled() === true
```

### 34.12 — Typing wrong text keeps Transfer Ownership button disabled
```
PRECONDITION: Transfer Ownership modal, Step 2

ACTION:
  1. Type wrong text:
     window.locator('input[name="transfer-confirm"]').fill('transfer')
  2. await window.waitForTimeout(200)
  3. Screenshot

ASSERT:
  1. "Transfer Ownership" button remains disabled (case-sensitive, needs "TRANSFER"):
     window.locator('button:has-text("Transfer Ownership")').isDisabled() === true
  2. Button has muted/disabled styling
```

### 34.13 — Typing "TRANSFER" enables the Transfer Ownership button
```
PRECONDITION: Transfer Ownership modal, Step 2

ACTION:
  1. Clear and type the exact confirmation text:
     window.locator('input[name="transfer-confirm"]').fill('TRANSFER')
  2. await window.waitForTimeout(200)
  3. Screenshot

ASSERT:
  1. "Transfer Ownership" button is now enabled:
     window.locator('button:has-text("Transfer Ownership")').isEnabled() === true
  2. Button has danger styling (bg-danger, text-white)
```

### 34.14 — Back button in Step 2 returns to Step 1
```
PRECONDITION: Transfer Ownership modal, Step 2

ACTION:
  1. Click Back button:
     window.locator('button:has-text("Back")').click()
  2. await window.waitForTimeout(300)
  3. Screenshot

ASSERT:
  1. Step 1 is shown again — "Select New Owner" label visible:
     window.locator('text=Select New Owner').isVisible() === true
  2. Confirmation input is gone:
     window.locator('input[name="transfer-confirm"]').isVisible() === false
  3. Continue button is visible again
```

### 34.15 — Claim Admin modal renders with code input
```
PRECONDITION: Server is unclaimed OR modal is triggered manually

ACTION:
  1. Trigger the ClaimAdminModal (click "Claim Ownership" from banner or settings)
  2. await window.waitForTimeout(500)
  3. Screenshot

ASSERT:
  1. Modal header "Claim Server Ownership" is visible:
     window.locator('text=Claim Server Ownership').isVisible() === true
  2. Lock icon is visible (decorative element)
  3. "This server has no owner yet!" text is visible:
     window.locator('text=This server has no owner yet').isVisible() === true
  4. Claim Code label and input are visible:
     window.locator('text=Claim Code').isVisible() === true
  5. Input has placeholder about 32-character claim code:
     window.locator('input[placeholder*="claim code"]').isVisible() === true
  6. "Claim Ownership" submit button is visible but disabled when input is empty:
     window.locator('button:has-text("Claim Ownership")').isDisabled() === true
```

### 34.16 — Unclaimed Server Banner displays amber warning
```
PRECONDITION: Server has no admin/owner (unclaimed state)

ACTION:
  1. Navigate to server view
  2. Look for the amber banner at top:
     window.locator('.bg-warning\\/20')
  3. Screenshot

ASSERT:
  1. Banner is visible with amber/warning styling:
     window.locator('.bg-warning\\/20').isVisible() === true
  2. Banner text "This server has no owner yet!" is shown:
     window.locator('text=This server has no owner yet').isVisible() === true
  3. Subtext about claiming ownership is visible:
     window.locator('text=claim ownership with your admin code').isVisible() === true
  4. "Claim Ownership" button is visible in the banner:
     window.locator('button:has-text("Claim Ownership")').isVisible() === true
  5. Button has warning/amber background (bg-warning, text-black)
```
