# Suite 18 — Security

## SETUP
- App launched, logged in as qa_admin
- On server view with channels visible and message input available
- For authorization tests (18.12-15): need qa_user account (multi-user or sequential)
- Console error listener active to catch any security-related errors

## TESTS

### XSS Testing

#### 18.01 — Message with script tag rendered as text
```
ACTION:
  1. Navigate to a text channel (e.g., "general")
  2. Type XSS payload in message input:
     window.locator('textarea[placeholder*="Message"]').fill('<script>alert("xss")</script>')
  3. Press Enter to send:
     window.locator('textarea[placeholder*="Message"]').press('Enter')
  4. Wait 3 seconds for message to appear
  5. Screenshot: qa-screenshots/s18-01-xss-message.png

ASSERT:
  1. No JavaScript alert dialog appeared
  2. Message appears in chat as literal text: '<script>alert("xss")</script>'
  3. The text is visible as plain text:
     window.locator('text=<script>alert("xss")</script>').isVisible() === true
  4. No script element was injected:
     const scriptCount = await window.evaluate(() =>
       document.querySelectorAll('script[src*="xss"], script:not([src])').length
     );
     // scriptCount should be same as before (no new scripts)
  5. App is still functional — message input still works
```

#### 18.02 — Username with HTML rendered as text
```
NOTE: If username cannot be changed in settings, verify via evaluate that HTML
in display names is escaped in message rendering.

ACTION:
  1. Navigate to user settings
  2. Find the username or display name field
  3. Try to set it to: <img src=x onerror=alert(1)>
  4. If the field allows it, save and return to chat
  5. Screenshot: qa-screenshots/s18-02-xss-username.png

ASSERT:
  1. Either: the HTML is rejected (validation error)
  2. Or: the HTML is stored but rendered as escaped text in chat
  3. No image load attempt occurs (no onerror fires)
  4. No JavaScript alert dialog

CLEANUP:
  1. Restore username to 'qa_admin' if it was changed
```

#### 18.03 — Server name with HTML rendered as text
```
ACTION:
  1. Navigate to admin panel / server settings
  2. Find server name field
  3. Try to set it to: <b onmouseover=alert(1)>Evil Server</b>
  4. Save if possible
  5. Return to main view
  6. Screenshot: qa-screenshots/s18-03-xss-servername.png

ASSERT:
  1. Either: HTML is rejected on save (validation error shown)
  2. Or: server name displays as escaped text (literal angle brackets visible)
  3. No bold formatting applied by the HTML
  4. No JavaScript executes on hover

CLEANUP:
  1. Restore server name to original value
```

#### 18.04 — Channel name with HTML rendered as text
```
ACTION:
  1. Navigate to admin panel / channel settings
  2. Try creating or renaming a channel to: <svg onload=alert(1)>
  3. Save if possible
  4. Screenshot: qa-screenshots/s18-04-xss-channelname.png

ASSERT:
  1. Either: HTML is rejected (validation error)
  2. Or: channel name shows escaped text in sidebar
  3. No SVG element injected into the DOM
  4. No JavaScript alert

CLEANUP:
  1. Delete or rename the test channel back
```

#### 18.05 — Bio/status with HTML injection rendered as text
```
ACTION:
  1. Navigate to user settings
  2. Find bio or custom status field
  3. Fill with: <iframe src="javascript:alert(1)">
  4. Save
  5. Navigate to profile popover or user card to view the bio
  6. Screenshot: qa-screenshots/s18-05-xss-bio.png

ASSERT:
  1. Either: HTML rejected on save
  2. Or: bio displays as literal text '<iframe src="javascript:alert(1)">'
  3. No iframe injected into the page
  4. No JavaScript alert

CLEANUP:
  1. Clear or restore bio
```

#### 18.06 — Search query with XSS payload rendered as text
```
ACTION:
  1. Open search (Ctrl+K or search button):
     window.keyboard.press('Control+k')
  2. Wait 2 seconds for search/command palette to appear
  3. Type XSS payload in search input:
     window.locator('input[placeholder*="Search"], input[type="search"], input[role="combobox"]')
       .first().fill('<script>document.cookie</script>')
  4. Wait 2 seconds for search results
  5. Screenshot: qa-screenshots/s18-06-xss-search.png

ASSERT:
  1. No JavaScript executes
  2. If results shown: the query text is rendered as escaped literal text
  3. If no results: empty state is shown cleanly
  4. App still functional after XSS attempt
  5. Close search: window.keyboard.press('Escape')
```

### Token Security

#### 18.07 — No auth tokens in localStorage
```
PRECONDITION: Logged in as qa_admin

ACTION:
  1. Read localStorage keys:
     const keys = await window.evaluate(() => Object.keys(localStorage));
  2. Read localStorage values for any suspicious keys:
     const values = await window.evaluate(() => {
       const entries: Record<string, string> = {};
       for (let i = 0; i < localStorage.length; i++) {
         const key = localStorage.key(i)!;
         entries[key] = localStorage.getItem(key)?.substring(0, 100) || '';
       }
       return entries;
     });

ASSERT:
  1. No key contains 'token', 'jwt', 'auth', 'session', 'bearer' (case-insensitive)
  2. No value looks like a JWT (contains two dots with base64 segments)
  3. Log all keys found (for audit)
```

#### 18.08 — No auth tokens in sessionStorage
```
ACTION:
  1. const keys = await window.evaluate(() => Object.keys(sessionStorage));
  2. const values = await window.evaluate(() => {
       const entries: Record<string, string> = {};
       for (let i = 0; i < sessionStorage.length; i++) {
         const key = sessionStorage.key(i)!;
         entries[key] = sessionStorage.getItem(key)?.substring(0, 100) || '';
       }
       return entries;
     });

ASSERT:
  1. No key contains 'token', 'jwt', 'auth', 'bearer' (case-insensitive)
  2. No value looks like a JWT
  3. Log all keys found
```

#### 18.09 — No auth tokens in cookies
```
ACTION:
  1. const cookies = await window.evaluate(() => document.cookie);

ASSERT:
  1. cookies is empty string OR contains no auth-related values
  2. No cookie named 'token', 'jwt', 'session', 'auth' (case-insensitive)
  3. Log cookie string (or "empty")
```

#### 18.10 — Authorization header present on API calls
```
ACTION:
  1. Set up request interception to capture headers:
     const apiRequests: { url: string; hasAuth: boolean }[] = [];
     window.on('request', (req) => {
       if (req.url().includes('/api/')) {
         apiRequests.push({
           url: req.url(),
           hasAuth: !!req.headers()['authorization'],
         });
       }
     });
  2. Trigger an API call by navigating or performing an action
     (e.g., switch channels, load messages)
  3. Wait 5 seconds for requests to complete

ASSERT:
  1. At least one /api/ request was captured
  2. All /api/ requests have authorization header OR
     auth is handled via IPC proxy (electronAPI.api.request) which adds it server-side
  3. If IPC proxy is used: verify API calls go through electronAPI.api.request:
     const usesProxy = await window.evaluate(() => {
       return typeof (window as any).electronAPI?.api?.request === 'function';
     });
  4. Log request URLs and auth status
```

#### 18.11 — Token refresh works
```
ACTION:
  1. Verify token refresh API exists:
     const hasRefresh = await window.evaluate(async () => {
       return typeof (window as any).electronAPI?.auth?.refreshToken === 'function';
     });
  2. Trigger a token refresh:
     const refreshResult = await window.evaluate(async () => {
       try {
         const result = await (window as any).electronAPI?.auth?.refreshToken();
         return { success: true, hasData: !!result };
       } catch (e: any) {
         return { success: false, error: e.message };
       }
     });

ASSERT:
  1. hasRefresh === true
  2. refreshResult.success === true (refresh did not throw)
  3. App is still logged in after refresh (not kicked to login)
  4. Screenshot: qa-screenshots/s18-11-token-refresh.png
```

### Authorization

#### 18.12 — Non-admin cannot access admin features
```
ACTION:
  1. Log out of qa_admin
  2. Log in as qa_user (qa-user@local.test / QATest123!)
  3. Wait for main app to load
  4. Look for admin button:
     const adminVisible = await window.locator('button[aria-label="Admin"]')
       .or(window.locator('button:has-text("Admin")'))
       .or(window.locator('button[aria-label="Server Settings"]'))
       .isVisible({ timeout: 3000 }).catch(() => false);
  5. Screenshot: qa-screenshots/s18-12-non-admin-no-access.png

ASSERT:
  1. adminVisible === false (admin button not shown to non-admin)
  2. No admin panel sections visible in UI
```

#### 18.13 — Non-admin cannot modify others' messages
```
PRECONDITION: Logged in as qa_user

ACTION:
  1. Navigate to a channel with messages from other users
  2. Hover over a message from qa_admin:
     window.locator('[data-message-id]').first().hover()
  3. Look for edit or delete controls:
     const hasEdit = await window.locator('button[aria-label="Edit"]')
       .or(window.locator('button:has-text("Edit")'))
       .isVisible({ timeout: 2000 }).catch(() => false);
     const hasDelete = await window.locator('button[aria-label="Delete"]')
       .or(window.locator('button:has-text("Delete")'))
       .isVisible({ timeout: 2000 }).catch(() => false);
  4. Screenshot: qa-screenshots/s18-13-no-modify-others.png

ASSERT:
  1. hasEdit === false (cannot edit others' messages)
  2. hasDelete === false (cannot delete others' messages, unless moderation role)
  3. Only own messages should show edit/delete
```

#### 18.14 — Non-admin cannot access restricted channels
```
PRECONDITION: Logged in as qa_user

ACTION:
  1. Check channel list for any restricted/admin-only channels
  2. If an admin-only channel exists:
     - Attempt to click it
     - Wait 3 seconds
  3. Screenshot: qa-screenshots/s18-14-restricted-channels.png

ASSERT:
  1. Either: restricted channels are NOT visible in qa_user's channel list
  2. Or: clicking a restricted channel shows "Access Denied" or similar
  3. No admin-only channel content is visible to qa_user
```

#### 18.15 — URL manipulation cannot bypass route guards
```
PRECONDITION: Logged in as qa_user

ACTION:
  1. Try to navigate to admin route:
     await window.evaluate(() => {
       window.history.pushState(null, '', '/admin');
     });
  2. Wait 3 seconds
  3. Screenshot route-guard-1: qa-screenshots/s18-15a-url-admin.png
  4. Try to navigate to another user's settings:
     await window.evaluate(() => {
       window.history.pushState(null, '', '/users/other-user-id/settings');
     });
  5. Wait 3 seconds
  6. Screenshot route-guard-2: qa-screenshots/s18-15b-url-settings.png

ASSERT:
  1. Admin route is blocked: redirected or shows unauthorized
  2. Other user's settings route is blocked
  3. No private data from other users is rendered
  4. App does not crash on invalid routes

CLEANUP:
  1. Log out qa_user
  2. Log back in as qa_admin
```

### Input Validation

#### 18.16 — Message with 100,000+ characters handled gracefully
```
PRECONDITION: Logged in as qa_admin, in a text channel

ACTION:
  1. Generate a very long message:
     const longMsg = 'A'.repeat(100000);
  2. Fill message input:
     await window.locator('textarea[placeholder*="Message"]').fill(longMsg)
  3. Press Enter to send:
     await window.locator('textarea[placeholder*="Message"]').press('Enter')
  4. Wait 5 seconds
  5. Screenshot: qa-screenshots/s18-16-long-message.png

ASSERT:
  1. Either: message is truncated (with a character limit applied)
  2. Or: error message shown ("Message too long" or similar)
  3. Or: message sends but is handled without crash
  4. App does NOT hang or become unresponsive
  5. Message input is still usable after the attempt
  6. No browser/renderer crash
```

#### 18.17 — Username with null bytes handled
```
ACTION:
  1. Navigate to user settings
  2. Find username or display name field
  3. Attempt to set username with null bytes:
     await window.evaluate(() => {
       const input = document.querySelector('input[name="username"], input[name="displayName"]') as HTMLInputElement;
       if (input) {
         input.value = 'qa\x00admin\x00test';
         input.dispatchEvent(new Event('input', { bubbles: true }));
         input.dispatchEvent(new Event('change', { bubbles: true }));
       }
     });
  4. Try to save
  5. Screenshot: qa-screenshots/s18-17-null-bytes.png

ASSERT:
  1. Either: null bytes are stripped (saved as 'qaadmintest' or similar)
  2. Or: validation error shown (invalid characters)
  3. Or: the field rejects the input entirely
  4. No server error / 500 response
  5. App is still functional

CLEANUP:
  1. Restore username if changed
```

#### 18.18 — File upload with path traversal name rejected
```
ACTION:
  1. Navigate to a text channel
  2. Find the file upload button:
     window.locator('button[aria-label="Upload"]')
       .or(window.locator('button[aria-label="Attach"]'))
       .or(window.locator('input[type="file"]'))
  3. If file input exists, try uploading a file with path traversal name:
     await window.evaluate(() => {
       const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
       if (fileInput) {
         const file = new File(['test content'], '../../etc/passwd', { type: 'text/plain' });
         const dt = new DataTransfer();
         dt.items.add(file);
         fileInput.files = dt.files;
         fileInput.dispatchEvent(new Event('change', { bubbles: true }));
       }
     });
  4. Wait 3 seconds
  5. Screenshot: qa-screenshots/s18-18-path-traversal.png

ASSERT:
  1. Either: file is rejected (error message about invalid filename)
  2. Or: filename is sanitized (path components stripped, saved as 'passwd' or similar)
  3. The file does NOT write outside the intended upload directory
  4. No server crash or 500 error
  5. App still functional
```

### Final Cleanup
```
Ensure we're logged in as qa_admin.
If username or server name was modified during XSS tests, restore original values.
Verify app is still responsive and on the main server view.
```
