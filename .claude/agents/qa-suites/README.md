# QA Test Suites — Playwright Step-by-Step Specs

Each file in this folder is a granular spec for one QA suite number from QA_AGENT.md.

## Rules for writing Playwright tests from these specs

1. **Use Playwright locator APIs** — `page.locator()`, `.click()`, `.fill()`, `.hover()`.
   NEVER use `page.evaluate(() => document.body.innerText.includes(...))` as a substitute
   for actually interacting with the UI.

2. **Every step is a real user action** — if the spec says "click the Login button",
   that means `page.locator('button:has-text("Log In")').click()`, NOT
   `page.evaluate(() => document.querySelector('button')?.click())`.

3. **Assertions must verify EFFECTS** — after clicking a theme button, read the CSS
   variable with `getComputedStyle`. After sending a message, find the specific message
   element in the chat list. After toggling a switch, verify its `aria-checked` changed.

4. **Screenshots are required** at every state transition — before/after for visual changes.

5. **Persistence tests** require: change setting → navigate away → navigate back → verify.
   AND: change setting → `window.reload()` → verify.

6. **Invalid input tests** require: fill bad data → submit → verify error message appears
   in the specific error element (NOT just anywhere in body text).

7. **Selectors use this priority order:**
   - `[name="..."]` for form fields
   - `button:has-text("...")` for buttons
   - `[placeholder="..."]` for inputs
   - `[role="..."]` for ARIA elements
   - Text locators `text=...` as last resort
   - NEVER use `[class*="..."]` — classes are minified in production

## File naming

`suite-{NN}.md` — e.g. `suite-01.md`, `suite-02.md`

Each file has the same structure:
- **SETUP** — what state the app must be in before this suite runs
- **TESTS** — numbered steps matching QA_AGENT.md test numbers
- Each test has: ACTION (what to do), ASSERT (what to verify), SCREENSHOT (when to capture)
