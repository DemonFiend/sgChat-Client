# Suite 19 — Accessibility

## SETUP
- App launched, logged in as qa_admin
- On server view with channels visible
- For login form tests (19.01): may need to navigate to login page first
- Ensure dark theme is active (default Mantine dark)

## TESTS

### Keyboard Navigation

#### 19.01 — Tab through login form reaches all fields and buttons
```
PRECONDITION: On login page. If already logged in, log out first.

ACTION:
  1. Log out to reach login page
  2. Click on the page body to establish focus:
     window.locator('body').click()
  3. Press Tab repeatedly and track focused elements:
     const focusedElements: string[] = [];
     for (let i = 0; i < 10; i++) {
       await window.keyboard.press('Tab');
       const focused = await window.evaluate(() => {
         const el = document.activeElement;
         return el ? `${el.tagName}[name=${el.getAttribute('name')}][type=${el.getAttribute('type')}]` : 'none';
       });
       focusedElements.push(focused);
     }
  4. Screenshot: qa-screenshots/s19-01-tab-login.png

ASSERT:
  1. Email input was focused at some point: focusedElements includes element with name="email"
  2. Password input was focused: focusedElements includes element with name="password"
  3. Login button was focused: focusedElements includes a BUTTON element
  4. Tab order is logical (email -> password -> remember me -> login -> links)
  5. No element is skipped in the tab sequence
  6. Log all focused elements in order

CLEANUP:
  1. Log back in as qa_admin
```

#### 19.02 — Tab through message list navigates messages
```
PRECONDITION: Logged in, in a channel with messages

ACTION:
  1. Click on the message area to set focus context:
     window.locator('[role="list"], [data-message-id]').first().click()
  2. Press Tab multiple times to navigate through messages:
     const focusLog: string[] = [];
     for (let i = 0; i < 5; i++) {
       await window.keyboard.press('Tab');
       const tag = await window.evaluate(() => {
         const el = document.activeElement;
         return el ? `${el.tagName}#${el.id || el.getAttribute('data-message-id') || 'unknown'}` : 'none';
       });
       focusLog.push(tag);
     }
  3. Screenshot: qa-screenshots/s19-02-tab-messages.png

ASSERT:
  1. Focus moves through message elements or interactive elements within messages
  2. At least one message-related element received focus
  3. Focus does not get stuck on a single element
  4. Log all focus targets
```

#### 19.03 — Tab through channel list selects channels
```
ACTION:
  1. Click on the channel sidebar area to set focus context:
     window.locator('nav, [role="navigation"]').first().click()
       .catch(() => window.locator('text=general').click())
  2. Press Tab/Arrow keys to navigate channels:
     const channelFocusLog: string[] = [];
     for (let i = 0; i < 5; i++) {
       await window.keyboard.press('Tab');
       const focused = await window.evaluate(() => {
         const el = document.activeElement;
         return el ? el.textContent?.trim().substring(0, 50) || el.tagName : 'none';
       });
       channelFocusLog.push(focused);
     }
  3. Screenshot: qa-screenshots/s19-03-tab-channels.png

ASSERT:
  1. Channel names appear in the focus log (e.g., "general", "announcements")
  2. Focus moves between different channels
  3. Tab order through channels is top-to-bottom
  4. Log all focused elements
```

#### 19.04 — Enter/Space activates buttons
```
ACTION:
  1. Tab to a button (e.g., a channel in sidebar):
     window.locator('button:has-text("general")').focus()
  2. Press Enter:
     await window.keyboard.press('Enter')
  3. Wait 2 seconds
  4. Screenshot after Enter: qa-screenshots/s19-04a-enter-activate.png
  5. Tab to another button
  6. Press Space:
     await window.keyboard.press('Space')
  7. Wait 2 seconds
  8. Screenshot after Space: qa-screenshots/s19-04b-space-activate.png

ASSERT:
  1. Enter activated the button (channel was selected, or action was triggered)
  2. Space activated the button (same behavior as click)
  3. Both keyboard activations produce the same result as mouse click
```

#### 19.05 — Escape closes modals and popovers
```
ACTION:
  1. Open a modal or popover (e.g., user settings or command palette):
     await window.keyboard.press('Control+k')
  2. Wait 1 second for modal to appear
  3. Verify modal is visible:
     const modalBefore = await window.locator('[role="dialog"], [role="listbox"]')
       .first().isVisible({ timeout: 3000 }).catch(() => false);
  4. Screenshot before Escape: qa-screenshots/s19-05a-modal-open.png
  5. Press Escape:
     await window.keyboard.press('Escape')
  6. Wait 1 second
  7. Screenshot after Escape: qa-screenshots/s19-05b-modal-closed.png

ASSERT:
  1. modalBefore === true (modal was open)
  2. After Escape, modal is no longer visible:
     window.locator('[role="dialog"], [role="listbox"]').first()
       .isVisible({ timeout: 1000 }).catch(() => false) === false
  3. App returns to normal state
```

### Focus Management

#### 19.06 — Modal traps focus inside
```
ACTION:
  1. Open a modal (e.g., settings modal or command palette):
     await window.keyboard.press('Control+k')
  2. Wait 1 second
  3. Tab through the modal contents many times (more than the number of elements):
     const focusInsideModal: boolean[] = [];
     for (let i = 0; i < 15; i++) {
       await window.keyboard.press('Tab');
       const isInModal = await window.evaluate(() => {
         const modal = document.querySelector('[role="dialog"], [role="listbox"]');
         return modal ? modal.contains(document.activeElement) : false;
       });
       focusInsideModal.push(isInModal);
     }
  4. Screenshot: qa-screenshots/s19-06-focus-trap.png

ASSERT:
  1. All focusInsideModal entries are true (focus never escaped the modal)
  2. Focus wraps around within the modal (cycles back to first element)
  3. Background elements behind the modal did NOT receive focus

CLEANUP:
  1. Press Escape to close modal
```

#### 19.07 — Close modal returns focus to trigger element
```
ACTION:
  1. Focus on a specific trigger button and record it:
     const triggerSelector = 'button[aria-label="Settings"]';
     await window.locator(triggerSelector)
       .or(window.locator('button[aria-label="User Settings"]'))
       .first().focus();
  2. Record the trigger element:
     const triggerBefore = await window.evaluate(() => document.activeElement?.tagName);
  3. Press Enter to open the modal/settings:
     await window.keyboard.press('Enter')
  4. Wait 2 seconds for modal to open
  5. Press Escape to close:
     await window.keyboard.press('Escape')
  6. Wait 1 second
  7. Check where focus returned:
     const focusAfter = await window.evaluate(() => {
       const el = document.activeElement;
       return el ? `${el.tagName}[aria-label=${el.getAttribute('aria-label')}]` : 'none';
     });
  8. Screenshot: qa-screenshots/s19-07-focus-return.png

ASSERT:
  1. Focus returned to or near the original trigger element
  2. Focus is NOT on the body or a random element
  3. Log triggerBefore and focusAfter for comparison
```

#### 19.08 — Channel navigation focuses message input
```
ACTION:
  1. Click a different channel than the current one:
     window.locator('button:has-text("general")').click()
  2. Wait 2 seconds for channel to load
  3. Check if message input received focus:
     const focusedTag = await window.evaluate(() => {
       const el = document.activeElement;
       return el ? `${el.tagName}[placeholder=${el.getAttribute('placeholder')}]` : 'none';
     });
  4. Screenshot: qa-screenshots/s19-08-channel-focus.png

ASSERT:
  1. Focus is on the message input textarea (or within the message composition area)
  2. focusedTag contains 'TEXTAREA' or 'placeholder=Message'
  3. User can immediately start typing without clicking the input
```

### Screen Reader Support

#### 19.09 — All interactive elements have accessible labels
```
ACTION:
  1. Count unlabeled buttons:
     const unlabeledButtons = await window.evaluate(() => {
       const buttons = document.querySelectorAll('button');
       const unlabeled: string[] = [];
       buttons.forEach(btn => {
         const hasAriaLabel = btn.hasAttribute('aria-label');
         const hasTitle = btn.hasAttribute('title');
         const hasText = btn.textContent?.trim().length > 0;
         const hasAriaLabelledBy = btn.hasAttribute('aria-labelledby');
         if (!hasAriaLabel && !hasTitle && !hasText && !hasAriaLabelledBy) {
           unlabeled.push(btn.outerHTML.substring(0, 100));
         }
       });
       return { count: unlabeled.length, elements: unlabeled.slice(0, 10) };
     });
  2. Count unlabeled links:
     const unlabeledLinks = await window.evaluate(() => {
       const links = document.querySelectorAll('a');
       const unlabeled: string[] = [];
       links.forEach(link => {
         const hasAriaLabel = link.hasAttribute('aria-label');
         const hasText = link.textContent?.trim().length > 0;
         if (!hasAriaLabel && !hasText) {
           unlabeled.push(link.outerHTML.substring(0, 100));
         }
       });
       return { count: unlabeled.length, elements: unlabeled.slice(0, 10) };
     });
  3. Screenshot: qa-screenshots/s19-09-labels.png

ASSERT:
  1. unlabeledButtons.count === 0 (all buttons have accessible labels)
  2. unlabeledLinks.count === 0 (all links have text or aria-label)
  3. If any are found: log them for fixing (with element HTML snippets)
  4. Tolerance: fewer than 3 unlabeled interactive elements is acceptable
```

#### 19.10 — Images have alt text
```
ACTION:
  1. Count images without alt text:
     const imagesWithoutAlt = await window.evaluate(() => {
       const images = document.querySelectorAll('img');
       const missing: string[] = [];
       images.forEach(img => {
         if (!img.hasAttribute('alt')) {
           missing.push(img.src?.substring(0, 80) || 'no-src');
         }
       });
       return { count: missing.length, total: images.length, elements: missing.slice(0, 10) };
     });
  2. Screenshot: qa-screenshots/s19-10-alt-text.png

ASSERT:
  1. All images have alt attributes (empty alt="" is acceptable for decorative images)
  2. imagesWithoutAlt.count === 0
  3. If any missing: log the image sources for fixing
  4. Log total image count vs missing count
```

#### 19.11 — Form inputs have associated labels
```
ACTION:
  1. Check all form inputs for labels:
     const unlabeledInputs = await window.evaluate(() => {
       const inputs = document.querySelectorAll('input, textarea, select');
       const missing: string[] = [];
       inputs.forEach(input => {
         const hasLabel = !!document.querySelector(`label[for="${input.id}"]`);
         const hasAriaLabel = input.hasAttribute('aria-label');
         const hasAriaLabelledBy = input.hasAttribute('aria-labelledby');
         const hasPlaceholder = input.hasAttribute('placeholder');
         const isWrappedInLabel = !!input.closest('label');
         if (!hasLabel && !hasAriaLabel && !hasAriaLabelledBy && !hasPlaceholder && !isWrappedInLabel) {
           missing.push(`${input.tagName}[name=${input.getAttribute('name')}][type=${input.getAttribute('type')}]`);
         }
       });
       return { count: missing.length, elements: missing.slice(0, 10) };
     });

ASSERT:
  1. unlabeledInputs.count === 0
  2. Every input has at least one of: label, aria-label, aria-labelledby, placeholder, or wrapping label
  3. If any missing: log them for fixing
```

#### 19.12 — Status indicators have text alternatives
```
ACTION:
  1. Check presence/status indicators for text alternatives:
     const statusIndicators = await window.evaluate(() => {
       // Look for common status indicator patterns
       const indicators = document.querySelectorAll(
         '[data-status], [class*="status"], [class*="presence"], [role="status"]'
       );
       const results: { hasText: boolean; html: string }[] = [];
       indicators.forEach(el => {
         const hasAriaLabel = el.hasAttribute('aria-label');
         const hasTitle = el.hasAttribute('title');
         const hasText = el.textContent?.trim().length > 0;
         const hasRole = el.getAttribute('role') === 'status';
         results.push({
           hasText: hasAriaLabel || hasTitle || hasText || hasRole,
           html: el.outerHTML.substring(0, 80),
         });
       });
       return results;
     });
  2. Screenshot: qa-screenshots/s19-12-status-indicators.png

ASSERT:
  1. All status indicators have text alternatives (aria-label, title, or text content)
  2. Color-only indicators (green dot = online) also have text labels
  3. If any lack text: log them for fixing
```

### Visual Accessibility

#### 19.13 — Color contrast is sufficient (Mantine dark theme)
```
ACTION:
  1. Sample key color pairs:
     const contrast = await window.evaluate(() => {
       const body = getComputedStyle(document.body);
       const bgColor = body.backgroundColor;
       const textColor = body.color;
       // Get a button's colors
       const btn = document.querySelector('button');
       const btnBg = btn ? getComputedStyle(btn).backgroundColor : 'unknown';
       const btnText = btn ? getComputedStyle(btn).color : 'unknown';
       // Get input colors
       const input = document.querySelector('input, textarea');
       const inputBg = input ? getComputedStyle(input).backgroundColor : 'unknown';
       const inputText = input ? getComputedStyle(input).color : 'unknown';
       return { bgColor, textColor, btnBg, btnText, inputBg, inputText };
     });
  2. Screenshot: qa-screenshots/s19-13-contrast.png

ASSERT:
  1. Text color is light (high luminance) on dark background (WCAG AA 4.5:1 ratio)
  2. Body background is dark (Mantine dark theme)
  3. Body text is light/white
  4. Button text is readable against button background
  5. Input text is readable against input background
  6. Log all color values for manual contrast ratio verification
```

#### 19.14 — Focus indicators visible on all interactive elements
```
ACTION:
  1. Tab to multiple elements and check for visible focus indicators:
     const focusStyles: { tag: string; outline: string; boxShadow: string }[] = [];
     for (let i = 0; i < 5; i++) {
       await window.keyboard.press('Tab');
       const styles = await window.evaluate(() => {
         const el = document.activeElement;
         if (!el) return { tag: 'none', outline: '', boxShadow: '' };
         const cs = getComputedStyle(el);
         return {
           tag: `${el.tagName}[${el.getAttribute('aria-label') || el.textContent?.substring(0, 20)}]`,
           outline: cs.outline,
           boxShadow: cs.boxShadow,
         };
       });
       focusStyles.push(styles);
     }
  2. Screenshot showing focus ring: qa-screenshots/s19-14-focus-indicators.png

ASSERT:
  1. Each focused element has a visible focus indicator:
     - outline is not 'none' or '0px' OR
     - boxShadow is not 'none' (some frameworks use box-shadow for focus rings)
  2. Focus indicator is visible against the background
  3. Log all focus styles for review
  4. If any element lacks a focus indicator: flag as accessibility issue
```

#### 19.15 — No information conveyed by color alone
```
ACTION:
  1. Check status indicators use more than just color:
     const colorOnlyInfo = await window.evaluate(() => {
       const issues: string[] = [];
       // Check online/offline indicators
       const dots = document.querySelectorAll('[class*="status"], [class*="presence"]');
       dots.forEach(dot => {
         const hasIcon = dot.querySelector('svg, img');
         const hasText = dot.textContent?.trim().length > 0;
         const hasAriaLabel = dot.hasAttribute('aria-label');
         const hasTitle = dot.hasAttribute('title');
         // If it's just a colored circle with no text/icon alternative
         if (!hasIcon && !hasText && !hasAriaLabel && !hasTitle) {
           issues.push(dot.outerHTML.substring(0, 80));
         }
       });
       // Check error/success indicators
       const alerts = document.querySelectorAll('[role="alert"], [class*="error"], [class*="success"]');
       alerts.forEach(alert => {
         if (alert.textContent?.trim().length === 0 && !alert.hasAttribute('aria-label')) {
           issues.push(alert.outerHTML.substring(0, 80));
         }
       });
       return issues;
     });
  2. Screenshot: qa-screenshots/s19-15-color-only.png

ASSERT:
  1. colorOnlyInfo.length === 0 (no color-only information)
  2. Status indicators have text/icon alternatives alongside color
  3. Error states use text AND color (not just red border)
  4. If any issues found: log the elements
```

### Final Cleanup
```
Ensure we're logged in as qa_admin on the server view.
Press Escape to close any open modals/popovers from testing.
```
