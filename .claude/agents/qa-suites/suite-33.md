# Suite 33 — Notifications & Toasts

## SETUP
- Launch Electron app via `_electron.launch()`
- Log in as qa_admin (qa-admin@local.test / QATest123!)
- Navigate to server view
- Toast notifications are rendered via a portal into document.body (top-right, z-[100])
- Toast store is accessible for programmatic toast injection during testing

## TESTS

### 33.01 — Toast container exists in DOM
```
ACTION:
  1. Ensure logged in and on server view
  2. Locate the toast container portal:
     window.locator('.fixed.top-4.right-4.z-\\[100\\]')
  3. Screenshot

ASSERT:
  1. Toast container div exists in the DOM (may be empty initially):
     window.locator('.fixed.top-4.right-4').isVisible() === true
  2. No toasts are currently showing (container has pointer-events-none):
     (await window.locator('[role="alert"]').count()) === 0
```

### 33.02 — Triggering a system toast makes it appear
```
ACTION:
  1. Inject a system toast via evaluate (store action, not UI interaction):
     await window.evaluate(() => {
       const { useToastStore } = (window as any).__stores || {};
       // Fallback: dispatch a custom event that the app listens for
     });
  2. Alternative — trigger a real toast by performing an action that produces one
     (e.g., attempt an action that shows a system toast)
  3. await window.waitForTimeout(500)
  4. Screenshot the top-right area

ASSERT:
  1. A toast element with role="alert" appears:
     window.locator('[role="alert"]').first().isVisible() === true
  2. Toast has a title (font-semibold text):
     window.locator('[role="alert"]').first().locator('.font-semibold').isVisible() === true
  3. Toast has a message body (text-text-secondary):
     window.locator('[role="alert"]').first().locator('.text-text-secondary').isVisible() === true
```

### 33.03 — Toast has close button that removes it
```
PRECONDITION: A toast is currently visible

ACTION:
  1. Locate the close button on the toast (X icon, flex-shrink-0):
     window.locator('[role="alert"]').first().locator('button').last()
  2. Click the close button:
     window.locator('[role="alert"]').first().locator('button').last().click()
  3. await window.waitForTimeout(500)
  4. Screenshot

ASSERT:
  1. The toast is removed from the DOM:
     (await window.locator('[role="alert"]').count()) === 0
     OR the specific toast is no longer visible
```

### 33.04 — Toast auto-dismisses after timeout (5 seconds default)
```
ACTION:
  1. Trigger a toast (via action that produces one)
  2. Verify toast is visible:
     window.locator('[role="alert"]').first().isVisible() === true
  3. Screenshot immediately
  4. Wait for auto-dismiss (5 seconds + buffer):
     await window.waitForTimeout(6000)
  5. Screenshot again

ASSERT:
  1. First screenshot shows the toast present
  2. Second screenshot shows the toast gone:
     (await window.locator('[role="alert"]').count()) === 0
  3. No error state in the app after dismissal
```

### 33.05 — Multiple toasts stack vertically
```
ACTION:
  1. Trigger two or more toasts in rapid succession
     (e.g., perform two actions that each produce a toast)
  2. await window.waitForTimeout(500)
  3. Screenshot the top-right corner

ASSERT:
  1. Multiple toast elements are visible:
     (await window.locator('[role="alert"]').count()) >= 2
  2. Toasts are stacked vertically (container uses flex-col gap-2)
  3. Each toast is independently visible and has its own close button
```

### 33.06 — Clicking a toast body triggers its onClick action
```
PRECONDITION: A toast is visible (e.g., a DM notification toast with onClick navigation)

ACTION:
  1. Click on the toast body (not the close button):
     window.locator('[role="alert"]').first().click()
  2. await window.waitForTimeout(500)
  3. Screenshot

ASSERT:
  1. The toast is removed after clicking (onClick handler calls removeToast):
     The specific toast is no longer in the DOM
  2. If the toast had a navigation onClick, the view may have changed
```

### 33.07 — DM toast shows correct icon and "DM" label
```
PRECONDITION: A DM-type toast is triggered (another user sends a DM while on server view)

ACTION:
  1. Wait for DM toast to appear:
     await window.waitForTimeout(2000)
  2. Locate a toast with "DM" label:
     window.locator('[role="alert"]').filter({ hasText: 'DM' })
  3. Screenshot

ASSERT:
  1. Toast has the "DM" label text (flex-shrink-0):
     window.locator('[role="alert"]').filter({ hasText: 'DM' }).locator('text=DM').isVisible() === true
  2. Toast shows an avatar or the DM icon (speech bubble SVG)
  3. Toast has title (sender name) and message preview
```

### 33.08 — Warning toast has yellow border and "WARNING" label
```
PRECONDITION: A warning-type toast is triggered

ACTION:
  1. Wait for warning toast to appear or trigger one:
     await window.waitForTimeout(1000)
  2. Locate warning toast:
     window.locator('[role="alert"]').filter({ hasText: 'WARNING' })
  3. Screenshot

ASSERT:
  1. Toast has yellow border styling (border-yellow-500):
     window.locator('[role="alert"].border-2.border-yellow-500\\/50').isVisible() === true
  2. "WARNING" label is visible in yellow:
     window.locator('[role="alert"]').locator('text=WARNING').isVisible() === true
  3. Warning triangle icon is present (yellow SVG)
```

### 33.09 — Toast renders with avatar when avatarUrl is provided
```
PRECONDITION: A toast with an avatar URL is triggered (e.g., DM from user with avatar)

ACTION:
  1. Wait for a toast with avatar:
     await window.waitForTimeout(1000)
  2. Locate the toast:
     window.locator('[role="alert"]').first()
  3. Screenshot

ASSERT:
  1. Toast contains an Avatar component (img element with rounded styling):
     window.locator('[role="alert"]').first().locator('img').isVisible() === true
  2. Avatar image has a valid src attribute
  3. Avatar is sized correctly (w-10 h-10 area)
```

### 33.10 — Toast renders fallback icon when no avatarUrl
```
PRECONDITION: A system toast appears (no avatar URL)

ACTION:
  1. Trigger a system toast
  2. await window.waitForTimeout(500)
  3. Screenshot

ASSERT:
  1. Toast shows a fallback icon container (w-10 h-10 rounded-full bg-bg-tertiary):
     window.locator('[role="alert"]').first().locator('.rounded-full.bg-bg-tertiary').isVisible() === true
  2. Inside the container, an SVG icon is visible
  3. No broken image tag
```

### 33.11 — Toast title and message text are truncated (no overflow)
```
PRECONDITION: A toast with a very long title/message is triggered

ACTION:
  1. Trigger a toast with long content
  2. await window.waitForTimeout(500)
  3. Measure the toast dimensions:
     const box = await window.locator('[role="alert"]').first().boundingBox()
  4. Screenshot

ASSERT:
  1. Toast width is constrained (max-width: 380px on container):
     box.width <= 400
  2. Title text has truncate class (text does not overflow):
     window.locator('[role="alert"]').first().locator('.truncate').first().isVisible() === true
  3. Message text is also truncated
```

### 33.12 — Electron native notification fires for DM/mention toasts
```
PRECONDITION: Running in Electron, a DM or mention toast is triggered

ACTION:
  1. Set up a listener for Electron notification API calls:
     let notificationFired = false;
     await window.evaluate(() => {
       // Check if electronAPI exists
       return !!(window as any).electronAPI;
     });
  2. Trigger a DM or mention-type notification
  3. await window.waitForTimeout(1000)
  4. Screenshot

ASSERT:
  1. Electron API is available: result === true
  2. Both in-app toast AND native notification were triggered
     (toast visible in-app: window.locator('[role="alert"]').first().isVisible() === true)
  3. No errors in console related to notification API
```
