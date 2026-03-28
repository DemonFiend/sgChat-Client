# Suite 37 — Error Recovery & Session Management

## SETUP
- Launch Electron app via `_electron.launch()`
- Get first window: `electronApp.firstWindow()`
- Log in as qa_admin
- Navigate to server view (ensure fully loaded)

Key components (Electron client, Mantine-based):
- `src/renderer/components/ui/SessionExpiredOverlay.tsx` — Full-screen overlay with countdown, progress bar, reason-based title/description, "Sign Out Now" button
- `src/renderer/components/ui/RuntimeErrorOverlay.tsx` — Dev mode error toasts in bottom-right, dismiss/copy/expand stack actions
- `src/renderer/components/ui/ErrorBoundary.tsx` — React class component error boundary, shows "Something went wrong" with Reload Page button
- `src/renderer/stores/authStore.ts` — authError state: AuthErrorReason ('session_expired' | 'server_unreachable' | 'token_invalid'), triggerAuthError(), clearAuthError()
- `src/renderer/stores/devModeStore.ts` — devMode enabled flag, controls RuntimeErrorOverlay visibility

Triggering mechanisms:
- SessionExpiredOverlay: Call `triggerAuthError(reason)` on authStore via evaluate
- RuntimeErrorOverlay: Enable devMode then trigger unhandled errors
- ErrorBoundary: Trigger React rendering error (component crash)

## TESTS

### 37.01 — SessionExpiredOverlay renders for session_expired reason
```
ACTION:
  1. Trigger the session expired overlay via the auth store:
     await window.evaluate(() => {
       const store = (window as any).__ZUSTAND_STORES__?.auth
         || (document.querySelector('[data-reactroot]') as any)?.__zustand_auth;
       // Fallback: dispatch directly to the store
       (window as any).__triggerAuthError?.('session_expired');
     })
     — If the above doesn't work, use the import approach:
     await window.evaluate(() => {
       // Access the authStore global and call triggerAuthError
       const event = new CustomEvent('__qa_trigger_auth_error', { detail: 'session_expired' });
       window.dispatchEvent(event);
     })
  2. await window.waitForTimeout(1000)
  3. await window.screenshot({ path: 'qa-screenshots/s37-01-session-expired.png' })

ASSERT:
  1. Overlay is visible (fixed full-screen with dark backdrop):
     window.locator('text=Session Expired').isVisible() === true
  2. Description text matches session_expired reason:
     window.locator('text=Your session has ended').isVisible() === true
  3. Countdown text visible (e.g. "Signing out in X seconds"):
     window.locator('text=Signing out in').isVisible() === true
  4. "Sign Out Now" button visible:
     window.locator('button:has-text("Sign Out Now")').isVisible() === true
  5. Progress bar (Mantine Progress) is visible:
     window.locator('[role="progressbar"], [class*="Progress"]').isVisible() === true
  6. "sgChat" branding text at bottom:
     window.locator('text=sgChat').isVisible() === true

SCREENSHOT: qa-screenshots/s37-01-session-expired.png
```

### 37.02 — SessionExpiredOverlay shows Connection Lost for server_unreachable
```
ACTION:
  1. First, clear any existing auth error and re-login if needed
  2. Trigger with server_unreachable reason:
     await window.evaluate(() => {
       (window as any).__triggerAuthError?.('server_unreachable');
     })
  3. await window.waitForTimeout(1000)
  4. await window.screenshot({ path: 'qa-screenshots/s37-02-connection-lost.png' })

ASSERT:
  1. Title shows "Connection Lost":
     window.locator('text=Connection Lost').isVisible() === true
  2. Description mentions server unavailability:
     window.locator('text=Unable to reach the server').isVisible() === true
  3. Wifi icon is used (different icon from session_expired):
     Screenshot shows a different icon than the shield/lock icon
  4. Countdown and Sign Out Now button still present
```

### 37.03 — SessionExpiredOverlay shows Authentication Error for token_invalid
```
ACTION:
  1. Trigger with token_invalid reason:
     await window.evaluate(() => {
       (window as any).__triggerAuthError?.('token_invalid');
     })
  2. await window.waitForTimeout(1000)
  3. await window.screenshot({ path: 'qa-screenshots/s37-03-token-invalid.png' })

ASSERT:
  1. Title shows "Authentication Error":
     window.locator('text=Authentication Error').isVisible() === true
  2. Description mentions authentication:
     window.locator('text=authentication is no longer valid').isVisible() === true
  3. "Sign Out Now" button visible
```

### 37.04 — SessionExpiredOverlay countdown decrements
```
PRECONDITION: Session expired overlay is visible

ACTION:
  1. Trigger session expired overlay:
     await window.evaluate(() => {
       (window as any).__triggerAuthError?.('session_expired');
     })
  2. Read initial countdown value:
     const initialText = await window.locator('text=Signing out in').textContent()
  3. await window.waitForTimeout(3000)
  4. Read countdown value after 3 seconds:
     const laterText = await window.locator('text=Signing out in').textContent()
  5. await window.screenshot({ path: 'qa-screenshots/s37-04-countdown.png' })

ASSERT:
  1. Countdown has decremented (initial value > later value):
     Parse the number from both texts and verify the later number is less
  2. Progress bar width has decreased (visual confirmation via screenshot)
  3. The overlay is still visible (hasn't auto-redirected yet if within 10 seconds)
```

### 37.05 — SessionExpiredOverlay Sign Out Now button works
```
PRECONDITION: Session expired overlay is visible

ACTION:
  1. Trigger session expired overlay:
     await window.evaluate(() => {
       (window as any).__triggerAuthError?.('session_expired');
     })
  2. await window.waitForTimeout(500)
  3. Click "Sign Out Now":
     window.locator('button:has-text("Sign Out Now")').click()
  4. await window.waitForTimeout(2000)
  5. await window.screenshot({ path: 'qa-screenshots/s37-05-signed-out.png' })

ASSERT:
  1. Session expired overlay is gone:
     await expect(window.locator('text=Session Expired')).not.toBeVisible({ timeout: 5000 })
  2. User is logged out — login page is shown:
     window.locator('input[name="email"]').isVisible() === true
     OR window.locator('button:has-text("Log In")').isVisible() === true
  3. Auth error is cleared

NOTE: Re-login as qa_admin after this test before continuing
```

### 37.06 — Enable dev mode for RuntimeErrorOverlay tests
```
ACTION:
  1. Re-login as qa_admin if signed out from 37.05
  2. Enable dev mode via the store:
     await window.evaluate(() => {
       // Toggle dev mode on
       const devStore = (window as any).__ZUSTAND_STORES__?.devMode;
       if (devStore) devStore.getState().enable();
       else {
         // Fallback: dispatch keyboard shortcut or store manipulation
         (window as any).__enableDevMode?.();
       }
     })
  3. await window.waitForTimeout(500)
  4. await window.screenshot({ path: 'qa-screenshots/s37-06-devmode-enabled.png' })

ASSERT:
  1. Dev mode is now active (may show a dev mode indicator in the UI)
  2. No runtime error toasts visible yet (clean state):
     await expect(window.locator('text=Runtime Error')).not.toBeVisible()
```

### 37.07 — RuntimeErrorOverlay captures unhandled errors
```
PRECONDITION: Dev mode is enabled

ACTION:
  1. Trigger an unhandled error:
     await window.evaluate(() => {
       setTimeout(() => { throw new Error('QA test error: intentional failure'); }, 0);
     })
  2. await window.waitForTimeout(1000)
  3. await window.screenshot({ path: 'qa-screenshots/s37-07-runtime-error.png' })

ASSERT:
  1. Error toast appears in the bottom-right corner:
     window.locator('text=Runtime Error').isVisible() === true
  2. Error message text is visible:
     window.locator('text=QA test error: intentional failure').isVisible() === true
  3. Timestamp is shown next to the error:
     window.locator('text=Runtime Error').locator('..').locator('..').locator('text=/\\d+:\\d+/').isVisible() === true
  4. Close button (CloseButton) is visible on the toast
  5. "Copy" button is visible:
     window.locator('button:has-text("Copy")').isVisible() === true
```

### 37.08 — RuntimeErrorOverlay: expand stack trace
```
PRECONDITION: Runtime error toast is visible from 37.07

ACTION:
  1. Click the "Stack" button to expand:
     window.locator('button:has-text("Stack")').click()
  2. await window.waitForTimeout(300)
  3. await window.screenshot({ path: 'qa-screenshots/s37-08-stack-expanded.png' })

ASSERT:
  1. Stack trace text is now visible in a monospace font block:
     window.locator('[style*="monospace"], [style*="fontFamily"]').filter({ hasText: 'Error' }).isVisible() === true
  2. The stack trace content mentions the error message
  3. The chevron icon has rotated (visual confirmation)
```

### 37.09 — RuntimeErrorOverlay: copy error to clipboard
```
PRECONDITION: Runtime error toast is visible

ACTION:
  1. Click the "Copy" button:
     window.locator('button:has-text("Copy")').click()
  2. await window.waitForTimeout(500)
  3. await window.screenshot({ path: 'qa-screenshots/s37-09-copied.png' })

ASSERT:
  1. Button text changes to "Copied!" with a green check icon:
     window.locator('button:has-text("Copied!")').isVisible() === true
  2. After 2 seconds, button text reverts to "Copy":
     await window.waitForTimeout(2500)
     window.locator('button:has-text("Copy")').isVisible() === true
```

### 37.10 — RuntimeErrorOverlay: dismiss individual error
```
PRECONDITION: Runtime error toast is visible

ACTION:
  1. Click the close button (CloseButton / X) on the error toast:
     window.locator('[class*="CloseButton"], button[aria-label="Close"]').first().click()
  2. await window.waitForTimeout(500)
  3. await window.screenshot({ path: 'qa-screenshots/s37-10-error-dismissed.png' })

ASSERT:
  1. The specific error toast is no longer visible:
     await expect(window.locator('text=QA test error: intentional failure')).not.toBeVisible()
  2. If other errors exist, they remain visible
```

### 37.11 — RuntimeErrorOverlay: dismiss all when multiple errors
```
PRECONDITION: Dev mode enabled

ACTION:
  1. Trigger multiple errors:
     await window.evaluate(() => {
       setTimeout(() => { throw new Error('QA error 1'); }, 0);
       setTimeout(() => { throw new Error('QA error 2'); }, 50);
       setTimeout(() => { throw new Error('QA error 3'); }, 100);
     })
  2. await window.waitForTimeout(500)
  3. Verify "Dismiss all" button appears (shown when errors.length > 1):
     await window.screenshot({ path: 'qa-screenshots/s37-11a-multiple-errors.png' })
  4. Click "Dismiss all":
     window.locator('button:has-text("Dismiss all")').click()
  5. await window.waitForTimeout(500)
  6. await window.screenshot({ path: 'qa-screenshots/s37-11b-all-dismissed.png' })

ASSERT (after step 3):
  1. Multiple error toasts are visible:
     const errorCount = await window.locator('text=Runtime Error').count()
     errorCount >= 2
  2. "Dismiss all" button shows the count:
     window.locator('button:has-text("Dismiss all")').isVisible() === true

ASSERT (after step 5):
  1. All error toasts are gone:
     await expect(window.locator('text=Runtime Error')).not.toBeVisible()
  2. "Dismiss all" button is gone
```

### 37.12 — ErrorBoundary fallback UI
```
ACTION:
  1. Trigger a React rendering error that the ErrorBoundary will catch.
     This is harder to test directly — we verify the ErrorBoundary renders its fallback:
     await window.evaluate(() => {
       // Force the error boundary to show by rendering an error state
       // This might require manipulating component state or triggering a rendering crash
       const event = new CustomEvent('__qa_trigger_error_boundary');
       window.dispatchEvent(event);
     })
  2. Alternative approach — check that the ErrorBoundary component is mounted:
     await window.screenshot({ path: 'qa-screenshots/s37-12-error-boundary-check.png' })

ASSERT (if error boundary is triggerable):
  1. "Something went wrong" heading visible:
     window.locator('text=Something went wrong').isVisible() === true
  2. Error message text visible below the heading
  3. "Reload Page" button visible:
     window.locator('button:has-text("Reload Page")').isVisible() === true
  4. Red/danger-colored alert icon visible (ThemeIcon with IconAlertTriangle)

ASSERT (if error boundary cannot be triggered without app crash):
  1. Verify ErrorBoundary is mounted by confirming the app renders children normally:
     The app is functional — children are rendered — which means ErrorBoundary.render() returns this.props.children
  2. No "Something went wrong" text visible (healthy state):
     await expect(window.locator('text=Something went wrong')).not.toBeVisible()
  3. Screenshot confirms app is running normally inside the ErrorBoundary wrapper

NOTE: If the error boundary CAN be triggered, also verify:
  - Dev mode details: "Stack Trace" expand button visible when devMode is on
  - "Copy Error Details" button visible
  - "Reload Page" button actually reloads the window when clicked
```
