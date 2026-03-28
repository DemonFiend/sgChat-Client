# Suite 21 — Auth Parity

## SETUP
- App launched, server URL configured
- Start on login page (log out first if already logged in)
- qa_admin account available for admin-level tests (tests 21.21+)

## TESTS

### RegisterPage Validation

#### 21.01 — Register form renders all Mantine-styled fields
```
PRECONDITION: On login page

ACTION:
  1. window.locator('text=Register').click()
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s21-01-register-form.png' })

ASSERT:
  1. window.locator('input[name="email"]').isVisible() === true
  2. window.locator('input[name="username"]').isVisible() === true
  3. window.locator('input[name="password"]').isVisible() === true
  4. window.locator('input[name="confirm-password"]').isVisible() === true
  5. window.locator('button:has-text("Create Account")').isVisible() === true
  6. All inputs have Mantine styling (border, focus ring — visual check via screenshot)
```

#### 21.02 — Password mismatch → "Passwords do not match"
```
PRECONDITION: On register page

ACTION:
  1. window.locator('input[name="email"]').fill('mismatch-test@local.test')
  2. window.locator('input[name="username"]').fill('mismatch_user')
  3. window.locator('input[name="password"]').fill('QATest123!')
  4. window.locator('input[name="confirm-password"]').fill('DifferentPass!')
  5. window.locator('button:has-text("Create Account")').click()
  6. Wait 2 seconds
  7. window.screenshot({ path: 'qa-screenshots/s21-02-password-mismatch.png' })

ASSERT:
  1. window.locator('text=Passwords do not match').isVisible() === true
  2. Still on register page — form still visible
  3. No navigation occurred
```

#### 21.03 — Username < 2 chars → "Username must be at least 2 characters"
```
ACTION:
  1. window.locator('input[name="username"]').clear()
  2. window.locator('input[name="username"]').fill('a')
  3. window.locator('input[name="password"]').fill('QATest123!')
  4. window.locator('input[name="confirm-password"]').fill('QATest123!')
  5. window.locator('button:has-text("Create Account")').click()
  6. Wait 2 seconds
  7. window.screenshot({ path: 'qa-screenshots/s21-03-username-short.png' })

ASSERT:
  1. window.locator('text=Username must be at least 2 characters').isVisible() === true
  2. Still on register page
```

#### 21.04 — Username > 32 chars → validation error
```
ACTION:
  1. window.locator('input[name="username"]').clear()
  2. window.locator('input[name="username"]').fill('a'.repeat(33))
  3. window.locator('button:has-text("Create Account")').click()
  4. Wait 2 seconds
  5. window.screenshot({ path: 'qa-screenshots/s21-04-username-long.png' })

ASSERT:
  1. Validation error visible about username length/max
  2. Still on register page
```

#### 21.05 — Username with spaces → "Username can only contain letters, numbers, underscores, and hyphens"
```
ACTION:
  1. window.locator('input[name="username"]').clear()
  2. window.locator('input[name="username"]').fill('bad user name')
  3. window.locator('button:has-text("Create Account")').click()
  4. Wait 2 seconds
  5. window.screenshot({ path: 'qa-screenshots/s21-05-username-spaces.png' })

ASSERT:
  1. window.locator('text=Username can only contain letters, numbers, underscores, and hyphens').isVisible() === true
  2. Still on register page
```

#### 21.06 — Password < 8 chars → "Password must be at least 8 characters"
```
ACTION:
  1. window.locator('input[name="username"]').clear()
  2. window.locator('input[name="username"]').fill('valid_user')
  3. window.locator('input[name="password"]').clear()
  4. window.locator('input[name="password"]').fill('short')
  5. window.locator('input[name="confirm-password"]').clear()
  6. window.locator('input[name="confirm-password"]').fill('short')
  7. window.locator('button:has-text("Create Account")').click()
  8. Wait 2 seconds
  9. window.screenshot({ path: 'qa-screenshots/s21-06-password-short.png' })

ASSERT:
  1. window.locator('text=Password must be at least 8 characters').isVisible() === true
  2. Still on register page
```

#### 21.07 — Invalid email format → validation error
```
ACTION:
  1. window.locator('input[name="email"]').clear()
  2. window.locator('input[name="email"]').fill('not-an-email')
  3. window.locator('input[name="username"]').clear()
  4. window.locator('input[name="username"]').fill('valid_user')
  5. window.locator('input[name="password"]').clear()
  6. window.locator('input[name="password"]').fill('QATest123!')
  7. window.locator('input[name="confirm-password"]').clear()
  8. window.locator('input[name="confirm-password"]').fill('QATest123!')
  9. window.locator('button:has-text("Create Account")').click()
  10. Wait 2 seconds
  11. window.screenshot({ path: 'qa-screenshots/s21-07-invalid-email.png' })

ASSERT:
  1. Validation error about invalid email visible
  2. Still on register page
```

#### 21.08 — Valid registration → success (account created)
```
NOTE: Creates a real account. Use unique timestamped email.

ACTION:
  1. window.locator('input[name="email"]').clear()
  2. window.locator('input[name="email"]').fill('qa-parity-' + Date.now() + '@local.test')
  3. window.locator('input[name="username"]').clear()
  4. window.locator('input[name="username"]').fill('qa_parity_' + Date.now())
  5. window.locator('input[name="password"]').clear()
  6. window.locator('input[name="password"]').fill('QATest123!')
  7. window.locator('input[name="confirm-password"]').clear()
  8. window.locator('input[name="confirm-password"]').fill('QATest123!')
  9. window.locator('button:has-text("Create Account")').click()
  10. Wait up to 15 seconds
  11. window.screenshot({ path: 'qa-screenshots/s21-08-valid-register.png' })

ASSERT:
  1. Registration form is gone
  2. Either: redirected to main app (auto sign-in)
  3. Or: redirected to pending approval page (window.locator('text=Account Created').isVisible())
  4. No error alert visible

CLEANUP:
  1. Log out if auto-signed in
  2. Return to login page for next tests
```

#### 21.09 — Invite code field appears when server requires it
```
PRECONDITION: On register page, server has invite codes enabled

ACTION:
  1. Navigate to register page
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s21-09-invite-code.png' })

ASSERT:
  1. If server requires invite codes:
     window.locator('input[placeholder="Enter your invite code"]').isVisible() === true
  2. If server does NOT require invite codes:
     window.locator('input[placeholder="Enter your invite code"]').isVisible() === false
  3. Screenshot documents which state the server is in
```

#### 21.10 — Pending approval page renders correctly
```
PRECONDITION: Server has approval required. Register a new account to reach this page.

ACTION:
  1. Register a new account (if not already on pending approval page)
  2. Wait for pending approval page to load
  3. window.screenshot({ path: 'qa-screenshots/s21-10-pending-approval.png' })

ASSERT:
  1. window.locator('text=Account Created').isVisible() === true
  2. window.locator('text=pending admin approval').isVisible() === true
  3. window.locator('text=Back to Login').isVisible() === true
  4. Page has a clock/timer icon (visual check via screenshot)
```

### LoginPage Rate Limiting

#### 21.11 — Multiple wrong passwords → rate limit alert with countdown
```
PRECONDITION: On login page

ACTION:
  1. Repeat 5-6 times:
     a. window.locator('input[name="email"]').fill('qa-admin@local.test')
     b. window.locator('input[name="password"]').fill('WrongPassword!')
     c. window.locator('button:has-text("Log In")').click()
     d. Wait 1 second
  2. window.screenshot({ path: 'qa-screenshots/s21-11-rate-limit.png' })

ASSERT:
  1. Rate limit alert appears (look for Alert with countdown text)
  2. Alert mentions waiting or a countdown timer
  3. Login button state changed (disabled or form shows warning)
```

#### 21.12 — Rate limit disables login button
```
PRECONDITION: Rate limit triggered from 21.11

ACTION:
  1. window.screenshot({ path: 'qa-screenshots/s21-12-button-disabled.png' })

ASSERT:
  1. window.locator('button:has-text("Log In")').isDisabled() === true
     OR: button text changed to include countdown
  2. Attempting to click does nothing (no network request)
```

#### 21.13 — Rate limit countdown ticks down
```
PRECONDITION: Rate limit active from 21.11

ACTION:
  1. Read the countdown value
  2. Wait 3 seconds
  3. Read the countdown value again
  4. window.screenshot({ path: 'qa-screenshots/s21-13-countdown-tick.png' })

ASSERT:
  1. Second countdown value is lower than the first
  2. Timer is visually counting down
```

#### 21.14 — pending_approval user → redirected to approval page on login
```
PRECONDITION: Have a pending_approval account (from 21.08 if approval required)

ACTION:
  1. window.locator('input[name="email"]').fill('<pending-approval-email>')
  2. window.locator('input[name="password"]').fill('QATest123!')
  3. window.locator('button:has-text("Log In")').click()
  4. Wait up to 10 seconds
  5. window.screenshot({ path: 'qa-screenshots/s21-14-pending-redirect.png' })

ASSERT:
  1. Redirected to pending approval page, NOT main app
  2. window.locator('text=pending admin approval').isVisible() === true
  3. Login form is gone
```

### PendingApprovalPage

#### 21.15 — Pending page has clock icon and status text
```
PRECONDITION: On pending approval page

ACTION:
  1. window.screenshot({ path: 'qa-screenshots/s21-15-pending-page.png' })

ASSERT:
  1. Clock icon visible (SVG or icon element in the page)
  2. window.locator('text=Account Created').isVisible() === true
  3. window.locator('text=pending admin approval').isVisible() === true
```

#### 21.16 — Intake form visible if server has one configured
```
PRECONDITION: On pending approval page, server has intake form enabled

ACTION:
  1. Look for intake form fields
  2. window.screenshot({ path: 'qa-screenshots/s21-16-intake-form.png' })

ASSERT:
  1. If intake form exists: form fields are visible and fillable
  2. Submit button for intake is visible
  3. If no intake form: just the pending status message shown
```

#### 21.17 — Submit intake form
```
PRECONDITION: Intake form visible from 21.16

ACTION:
  1. Fill in all intake form fields with valid data
  2. Click submit button
  3. Wait 3 seconds
  4. window.screenshot({ path: 'qa-screenshots/s21-17-intake-submitted.png' })

ASSERT:
  1. Success feedback shown (message or state change)
  2. Form fields disabled or hidden after submission
  3. Still on pending approval page (not redirected yet)
```

#### 21.18 — Denied state shows reason
```
PRECONDITION: Admin has denied the pending account (requires admin action first)

ACTION:
  1. Login as the denied account
  2. Wait for redirect
  3. window.screenshot({ path: 'qa-screenshots/s21-18-denied-state.png' })

ASSERT:
  1. Denial message visible with reason text
  2. Not redirected to main app
  3. Page clearly indicates account was denied
```

#### 21.19 — Logout link on pending page works
```
PRECONDITION: On pending approval page

ACTION:
  1. window.locator('text=Back to Login').click()
  2. Wait 3 seconds
  3. window.screenshot({ path: 'qa-screenshots/s21-19-back-to-login.png' })

ASSERT:
  1. Redirected to login page
  2. window.locator('input[name="email"]').isVisible() === true
  3. Pending approval page is gone
```

#### 21.20 — Admin approves → user redirected to app on next login
```
PRECONDITION: Admin has approved the pending account

ACTION:
  1. Login as the newly approved account
  2. Wait up to 15 seconds
  3. window.screenshot({ path: 'qa-screenshots/s21-20-approved-login.png' })

ASSERT:
  1. Redirected to main app (NOT pending approval page)
  2. Main app visible: window.locator('textarea[placeholder*="Message"]').isVisible()
     OR channel sidebar visible
  3. No error alerts

CLEANUP:
  1. Log out
  2. Log back in as qa_admin
```

### AccessControlPanel (Server Settings)

#### 21.21 — Access Control panel visible in Server Settings
```
PRECONDITION: Logged in as qa_admin (admin), on server view

ACTION:
  1. Open server settings (click server name → Server Settings, or gear icon)
  2. Look for Access Control section/tab
  3. window.screenshot({ path: 'qa-screenshots/s21-21-access-control.png' })

ASSERT:
  1. Access Control section is visible in server settings
  2. Contains signup and approval related controls
```

#### 21.22 — Signups toggle works
```
PRECONDITION: In Access Control panel

ACTION:
  1. Locate the signups toggle/switch
  2. Note current state (on/off)
  3. Click the toggle
  4. Wait 2 seconds
  5. window.screenshot({ path: 'qa-screenshots/s21-22-signups-toggle.png' })

ASSERT:
  1. Toggle state changed (aria-checked flipped)
  2. Setting persisted (close and reopen to verify)
  3. No error toast

CLEANUP:
  1. Restore original toggle state
```

#### 21.23 — Approvals toggle works
```
ACTION:
  1. Locate the approvals toggle/switch
  2. Note current state
  3. Click the toggle
  4. Wait 2 seconds
  5. window.screenshot({ path: 'qa-screenshots/s21-23-approvals-toggle.png' })

ASSERT:
  1. Toggle state changed
  2. Setting persisted
  3. No error toast

CLEANUP:
  1. Restore original toggle state
```

#### 21.24 — Intake form editor visible and functional
```
ACTION:
  1. Locate intake form editor in Access Control
  2. window.screenshot({ path: 'qa-screenshots/s21-24-intake-editor.png' })

ASSERT:
  1. Editor area for intake form questions is visible
  2. Can add/remove/edit form fields
  3. Save button available
```

#### 21.25 — Approvals list with filter
```
ACTION:
  1. Navigate to approvals list section
  2. Check for filter/search controls
  3. window.screenshot({ path: 'qa-screenshots/s21-25-approvals-list.png' })

ASSERT:
  1. List of pending approvals visible (may be empty)
  2. Filter/tab controls present (e.g. Pending / Approved / Denied)
  3. Each entry shows username and email
```

#### 21.26 — Approve, deny, and blacklist actions
```
PRECONDITION: At least one pending approval exists (create via 21.08 if needed)

ACTION:
  1. Find a pending approval entry
  2. Look for Approve / Deny / Blacklist action buttons
  3. window.screenshot({ path: 'qa-screenshots/s21-26-approval-actions.png' })

ASSERT:
  1. Approve button visible on pending entry
  2. Deny button visible on pending entry
  3. Blacklist option available (button or menu item)
  4. Clicking Approve → entry moves to approved state
  5. Screenshot shows state change
```

#### 21.27 — Blacklist management
```
ACTION:
  1. Navigate to blacklist section in Access Control
  2. window.screenshot({ path: 'qa-screenshots/s21-27-blacklist.png' })

ASSERT:
  1. Blacklist entries visible (or empty state)
  2. Can add entry to blacklist (email/IP)
  3. Can remove entry from blacklist
  4. Changes persist after save
```

### Final Cleanup
```
Ensure we're logged in as qa_admin before next suite runs.
Restore any toggled settings (signups, approvals) to original state.
```
