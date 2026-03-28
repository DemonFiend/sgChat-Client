# Suite 2 — Authentication & Session Management

## SETUP
- App launched, on login page (or already logged in)
- If already logged in, log out first via Settings → Log Out
- Server URL already configured (Suite 1 handles this)

## TESTS

### Server Setup Validation

#### 2.01 — Valid server URL → redirects to login
```
PRECONDITION: On server setup page. If not, use Log Out & Forget Device to get there.

ACTION:
  1. window.locator('input[type="url"]').clear()
  2. window.locator('input[type="url"]').fill('http://localhost:3124')
  3. window.locator('button:has-text("Connect")').click()
  4. Wait up to 10s

ASSERT:
  1. Login page loads: window.locator('input[name="email"]').isVisible() === true
  2. No error message visible
  3. Screenshot: login form
```

#### 2.02 — Invalid server URL → health check fails, error shown
```
ACTION:
  1. Navigate to server setup (if needed: Settings → Log Out & Forget Device)
  2. window.locator('input[type="url"]').clear()
  3. window.locator('input[type="url"]').fill('http://localhost:9999')
  4. window.locator('button:has-text("Connect")').click()
  5. Wait 5 seconds

ASSERT:
  1. Error message appears (look for red/danger-colored text element)
  2. Still on server setup page (not redirected)
  3. window.locator('input[type="url"]').isVisible() === true
  4. Screenshot: error state
```

#### 2.03 — Non-URL text → validation error
```
ACTION:
  1. window.locator('input[type="url"]').clear()
  2. window.locator('input[type="url"]').fill('not-a-url')
  3. window.locator('button:has-text("Connect")').click()
  4. Wait 3 seconds

ASSERT:
  1. Error message or validation feedback shown
  2. Still on server setup page
  3. Screenshot: validation error

CLEANUP:
  1. Fill valid URL and connect to get back to login page
  2. window.locator('input[type="url"]').fill('http://localhost:3124')
  3. window.locator('button:has-text("Connect")').click()
```

### Sign In

#### 2.04 — Navigate to /login (verify form elements)
```
PRECONDITION: On login page

ACTION:
  1. Screenshot the login page

ASSERT (every form element present):
  1. window.locator('input[name="email"]').isVisible() === true
  2. window.locator('input[name="password"]').isVisible() === true
  3. window.locator('button:has-text("Log In")').isVisible() === true
  4. window.locator('text=Forgot your password?').isVisible() === true
  5. window.locator('text=Register').isVisible() === true
  6. Remember Me checkbox exists (label with "Remember me")
```

#### 2.05 — Valid credentials → success, redirected to app
```
ACTION:
  1. window.locator('input[name="email"]').fill('qa-admin@local.test')
  2. window.locator('input[name="password"]').fill('QATest123!')
  3. Screenshot: filled form (password masked)
  4. window.locator('button:has-text("Log In")').click()
  5. Wait up to 15 seconds

ASSERT:
  1. Login form is gone
  2. Main app visible (channels or message input)
  3. No error alert: window.locator('[role="alert"][data-variant="light"]').isVisible() === false
  4. Screenshot: main app after login
```

#### 2.06 — Wrong password → generic error "Invalid email or password"
```
PRECONDITION: Logged out, on login page

ACTION:
  1. window.locator('input[name="email"]').fill('qa-admin@local.test')
  2. window.locator('input[name="password"]').fill('WrongPassword999!')
  3. window.locator('button:has-text("Log In")').click()
  4. Wait 3 seconds

ASSERT:
  1. Error alert appears: look for Alert with red/danger color
  2. Error text includes "Invalid" or "invalid" or "incorrect"
  3. NOT a specific "password is wrong" message (no user enumeration)
  4. Still on login page — form still visible
  5. Screenshot: error state
```

#### 2.07 — Non-existent email → same generic error (no user enumeration)
```
ACTION:
  1. window.locator('input[name="email"]').fill('nonexistent-user-abc@local.test')
  2. window.locator('input[name="password"]').fill('QATest123!')
  3. window.locator('button:has-text("Log In")').click()
  4. Wait 3 seconds

ASSERT:
  1. Error alert appears with same message as 2.06
  2. Message does NOT say "user not found" or "email not registered" (no enumeration)
  3. Still on login page
  4. Screenshot: error state
```

#### 2.08 — Empty fields → submit button disabled or validation errors
```
ACTION:
  1. window.locator('input[name="email"]').clear()
  2. window.locator('input[name="password"]').clear()
  3. window.locator('button:has-text("Log In")').click()
  4. Wait 2 seconds

ASSERT (at least one of):
  1. Login button is disabled: window.locator('button:has-text("Log In")').isDisabled()
  2. OR: validation error messages appear on the fields
  3. OR: nothing happens (no navigation, no crash)
  4. No crash — app still responsive
  5. Screenshot: empty field state
```

#### 2.09 — SQL injection in email → error shown, no crash
```
ACTION:
  1. window.locator('input[name="email"]').fill("' OR 1=1 --")
  2. window.locator('input[name="password"]').fill('anything')
  3. window.locator('button:has-text("Log In")').click()
  4. Wait 3 seconds

ASSERT:
  1. Error message shown (validation or server error)
  2. App does NOT crash
  3. No redirect to main app (injection didn't bypass auth)
  4. Still on login page
  5. Screenshot
```

#### 2.10 — XSS in email → rendered as text
```
ACTION:
  1. window.locator('input[name="email"]').fill('<script>alert(1)</script>@test.com')
  2. window.locator('input[name="password"]').fill('anything')
  3. window.locator('button:has-text("Log In")').click()
  4. Wait 3 seconds

ASSERT:
  1. No JavaScript alert dialog appeared
  2. If error shown, the email text is displayed as literal text, not executed
  3. App still functional
  4. Screenshot
```

### Registration

#### 2.11 — Navigate to register page
```
ACTION:
  1. Click register link: window.locator('text=Register').click()
  2. Wait 2 seconds

ASSERT:
  1. Register form visible:
     - window.locator('input[name="email"]').isVisible()
     - window.locator('input[name="username"]').isVisible()
     - window.locator('input[name="password"]').isVisible()
     - window.locator('input[name="confirm-password"]').isVisible()
  2. "Create Account" button visible
  3. "Log in" link visible
  4. Screenshot: registration form
```

#### 2.12 — Valid registration data → registers, auto signs in
```
NOTE: This creates a real account. Use a unique email.

ACTION:
  1. window.locator('input[name="email"]').fill('qa-temp-' + Date.now() + '@local.test')
  2. window.locator('input[name="username"]').fill('qa_temp_' + Date.now())
  3. window.locator('input[name="password"]').fill('QATest123!')
  4. window.locator('input[name="confirm-password"]').fill('QATest123!')
  5. window.locator('button:has-text("Create Account")').click()
  6. Wait up to 15 seconds

ASSERT:
  1. Either: redirected to main app (registration succeeded)
  2. Or: "pending approval" page (if server requires approval)
  3. Registration form is gone
  4. Screenshot

CLEANUP:
  1. Log out after this test
  2. Log back in as qa-admin for remaining tests
```

#### 2.13 — Duplicate email → error shown
```
ACTION:
  1. Navigate to register page
  2. Fill in qa-admin@local.test (existing email)
  3. Fill valid username, password, confirm
  4. Click "Create Account"
  5. Wait 5 seconds

ASSERT:
  1. Error message about duplicate/existing email
  2. Still on register page
  3. Screenshot
```

#### 2.15 — Password mismatch → validation error
```
ACTION:
  1. window.locator('input[name="password"]').fill('QATest123!')
  2. window.locator('input[name="confirm-password"]').fill('DifferentPassword!')
  3. Click "Create Account"

ASSERT:
  1. Validation error: "Passwords do not match" (on the confirm-password field)
  2. Form NOT submitted
  3. Screenshot: mismatch error
```

#### 2.16 — Password too short → validation error
```
ACTION:
  1. window.locator('input[name="password"]').fill('short')
  2. window.locator('input[name="confirm-password"]').fill('short')
  3. Click "Create Account"

ASSERT:
  1. Validation error: "Password must be at least 8 characters"
  2. Form NOT submitted
  3. Screenshot
```

### Forgot/Reset Password

#### 2.17 — Navigate to forgot password
```
ACTION:
  1. Navigate back to login page
  2. window.locator('text=Forgot your password?').click()
  3. Wait 2 seconds

ASSERT:
  1. Forgot password form visible with email input
  2. Submit button visible
  3. Screenshot
```

### Session Protection / Token Security

#### 2.23a — No auth tokens in localStorage
```
PRECONDITION: Logged in as qa_admin

ACTION:
  1. Read localStorage keys:
     const keys = await window.evaluate(() => Object.keys(localStorage));

ASSERT:
  1. No key contains 'token', 'jwt', 'auth', 'session' (case-insensitive)
  2. Log all keys found
```

#### 2.23b — No auth tokens in sessionStorage
```
ACTION:
  1. const keys = await window.evaluate(() => Object.keys(sessionStorage));

ASSERT:
  1. No key contains 'token', 'jwt', 'auth' (case-insensitive)
```

#### 2.23c — No auth tokens in cookies
```
ACTION:
  1. const cookies = await window.evaluate(() => document.cookie);

ASSERT:
  1. cookies is empty string OR contains no auth-related values
```

### Final Cleanup
```
Ensure we're logged in as qa_admin before next suite runs.
If logged out during testing, log back in via 2.05 steps.
```
