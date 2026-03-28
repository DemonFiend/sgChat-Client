# Suite 1 — Environment & Connection Health

## SETUP
- Launch Electron app via `_electron.launch()`
- Get first window: `electronApp.firstWindow()`
- Wait for `domcontentloaded`
- No login yet — this suite starts from cold boot

## TESTS

### 1.01 — App launches without blank screen
```
ACTION:
  1. await window.waitForLoadState('load')
  2. await window.waitForTimeout(4000)
  3. await window.screenshot({ path: 'qa-screenshots/s1-01-launch.png' })

ASSERT:
  1. Screenshot is NOT a blank white or black screen (visual check via pixel sampling)
  2. window.locator('body').innerText() has length > 100
  3. At least one of these is visible:
     - window.locator('input[name="email"]')     → login page
     - window.locator('input[type="url"]')        → server setup page
     - window.locator('textarea[placeholder*="Message"]')  → already logged in
```

### 1.02 — No console errors on initial load
```
ACTION:
  1. Collect console messages during load:
     const errors: string[] = [];
     window.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  2. Wait 2 seconds for any deferred errors

ASSERT:
  1. Filter out known benign errors (e.g. favicon 404, DevTools warnings)
  2. errors.length === 0 for real errors
  3. No element matching locator('[class*="error-boundary"]') exists
  4. Body text does NOT contain "Something went wrong"
```

### 1.03 — No failed network requests (4xx/5xx)
```
ACTION:
  1. Collect network responses:
     const failures: string[] = [];
     window.on('response', res => { if (res.status() >= 400) failures.push(`${res.status()} ${res.url()}`); });
  2. Navigate around the app for 5 seconds

ASSERT:
  1. No 5xx responses (server errors)
  2. 4xx responses only for expected cases (e.g. 404 favicon)
  3. Log all failures for review
```

### 1.04 — Detect current page state
```
ACTION:
  1. Check which page we're on:
     - Is server setup? → window.locator('input[type="url"]').isVisible()
     - Is login page?   → window.locator('input[name="email"]').isVisible()
     - Is main app?     → window.locator('textarea[placeholder*="Message"]').isVisible()
  2. Screenshot current state

ASSERT:
  1. Exactly ONE of the above is true (not zero, not multiple)
  2. Log which page we're on
```

### 1.05 — If server setup page: configure server URL
```
PRECONDITION: Test 1.04 detected server setup page. Skip if not.

ACTION:
  1. window.locator('input[type="url"]').fill('http://localhost:3124')
  2. window.locator('button:has-text("Connect")').click()
  3. Wait up to 10 seconds for navigation

ASSERT:
  1. After connect, we're on the login page:
     window.locator('input[name="email"]').isVisible() === true
  2. Server setup page is gone
  3. Screenshot shows login form
```

### 1.06 — Log in as qa_admin
```
PRECONDITION: On login page (or already logged in — skip if so)

ACTION (form-based login, NOT evaluate):
  1. window.locator('input[name="email"]').fill('qa-admin@local.test')
  2. window.locator('input[name="password"]').fill('QATest123!')
  3. window.locator('button:has-text("Log In")').click()
  4. Wait up to 15 seconds for the main app to load

ASSERT:
  1. Login form is gone
  2. Main app is visible: window.locator('textarea[placeholder*="Message"]').isVisible()
     OR channel sidebar is visible with channel names
  3. No error alert visible: window.locator('[role="alert"]').isVisible() === false
  4. Screenshot shows the main app interface
```

### 1.07 — Socket.IO connection active (presence shows ONLINE section)
```
PRECONDITION: Logged in, on server view

ACTION:
  1. Navigate to server view (click "Server" tab in TitleBar)
  2. Wait 3 seconds for member list to populate
  3. Screenshot the right sidebar (member list area)

ASSERT:
  1. window.locator('text=ONLINE').isVisible() === true
  2. window.locator('text=OFFLINE').isVisible() === true
  3. Member list contains our username:
     window.locator('text=qa_admin').or(window.locator('text=qa-admin')).isVisible() === true
  4. At least one member avatar is visible
```

### 1.08 — Server view: channels load, member list populates
```
ACTION:
  1. Ensure on server view
  2. Screenshot the full app showing sidebar + chat + member list

ASSERT (channel sidebar):
  1. At least one channel name visible (e.g. "general", "announcements")
  2. At least one category header visible (e.g. "GENERAL CHAT", "VOICE CHANNELS")
  3. Channel sidebar has more than 2 items

ASSERT (member list):
  1. Member list section visible on right side
  2. At least one member name visible
  3. Member has avatar (Avatar element present)

ASSERT (chat area):
  1. Message input textarea visible: window.locator('textarea[placeholder*="Message"]')
  2. Chat area has at least some content (messages or empty state)
```

### 1.09 — Navigate to DM view
```
ACTION:
  1. Click "Messages" tab: window.locator('button:has-text("Messages")').click()
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. window.locator('text=Direct Messages').isVisible() === true
  2. Server channel sidebar is no longer visible
  3. DM list area is visible (either conversations or empty state)
  4. Navigate back: window.locator('button:has-text("Server")').click()
```

### 1.10 — Mantine dark theme applied (CSS variables)
```
ACTION:
  1. Read CSS variables via evaluate:
     const bgPrimary = await window.evaluate(() =>
       getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim());
     const bgSecondary = await window.evaluate(() =>
       getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim());
     const textPrimary = await window.evaluate(() =>
       getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim());

ASSERT:
  1. bgPrimary is a dark color (not '#ffffff', not empty)
  2. textPrimary is a light color (not '#000000', not empty)
  3. All three variables are non-empty strings
  4. Log actual values for verification
```
