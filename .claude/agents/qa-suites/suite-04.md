# Suite 4 — Message Sending & Display

## SETUP
- App launched and logged in as qa_admin (Suite 1 handles setup/login)
- On server view, "general" channel selected
- Message input visible: `textarea[placeholder*="Message"]`

## TESTS

### Sending Messages

#### 4.01 — Type message and press Enter → message appears in chat
```
ACTION:
  1. Click "general" channel if not already selected:
     window.locator('text=general').first().click()
     await window.waitForTimeout(2000)
  2. Generate unique message: const msg = 'QA test message ' + Date.now()
  3. window.locator('textarea[placeholder*="Message"]').fill(msg)
  4. window.locator('textarea[placeholder*="Message"]').press('Enter')
  5. await window.waitForTimeout(2000)
  6. Screenshot: qa-screenshots/s4-01-message-sent.png

ASSERT:
  1. Message appears in chat area: window.locator('text=' + msg).isVisible() === true
  2. Message input is cleared after sending (textarea value is empty)
  3. Chat scrolled to bottom showing the new message
  4. No error toast or alert visible

SCREENSHOT: qa-screenshots/s4-01-message-sent.png
```

#### 4.02 — Sent message shows author avatar, username, timestamp
```
PRECONDITION: Message from 4.01 is visible

ACTION:
  1. Locate the message just sent:
     const messageRow = window.locator('text=QA test message').last().locator('..')
     OR: scroll to bottom and find the last message group
  2. Screenshot the message area: qa-screenshots/s4-02-message-metadata.png

ASSERT:
  1. Author username visible near the message (e.g. "qa_admin" or "qa-admin")
  2. Avatar element present: an img or div with avatar styling near the message
  3. Timestamp visible: a time element or text matching time format (HH:MM or "Today at HH:MM")
  4. All three (avatar, username, timestamp) are in the same message group

SCREENSHOT: qa-screenshots/s4-02-message-metadata.png
```

#### 4.03 — Accented characters render correctly: cafe, uber, naive
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('Accented: cafe\u0301, u\u0308ber, nai\u0308ve, re\u0301sume\u0301')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. await window.waitForTimeout(2000)
  4. Screenshot: qa-screenshots/s4-03-accented.png

ASSERT:
  1. Message containing accented text is visible in chat
  2. Characters render as proper glyphs (not mojibake/squares)
  3. window.locator('text=caf\u00e9').or(window.locator('text=Accented')).isVisible() === true

SCREENSHOT: qa-screenshots/s4-03-accented.png
```

#### 4.04 — Emoji-only message renders larger
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('\ud83d\ude00\ud83d\udc4d\ud83c\udf89')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. await window.waitForTimeout(2000)
  4. Get font size of the emoji message:
     const emojiSize = await window.locator('text=\ud83d\ude00\ud83d\udc4d\ud83c\udf89').evaluate(el => {
       return parseFloat(getComputedStyle(el).fontSize);
     })
  5. Screenshot: qa-screenshots/s4-04-emoji-only.png

ASSERT:
  1. Emoji message is visible: window.locator('text=\ud83d\ude00\ud83d\udc4d\ud83c\udf89').isVisible()
  2. emojiSize > 20 (larger than normal text, typically 2-3x)
  3. OR: the emoji container has a special class indicating jumbo/large rendering

SCREENSHOT: qa-screenshots/s4-04-emoji-only.png
```

### Markdown Rendering

#### 4.05 — Bold markdown **text** → renders as <strong>
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('This is **bold text** here')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. await window.waitForTimeout(2000)
  4. Screenshot: qa-screenshots/s4-05-bold.png

ASSERT:
  1. Message visible in chat
  2. "bold text" is wrapped in <strong> or <b> tag:
     window.locator('strong:has-text("bold text")').or(window.locator('b:has-text("bold text")')).isVisible() === true
  3. Text outside bold markers renders as normal weight

SCREENSHOT: qa-screenshots/s4-05-bold.png
```

#### 4.06 — Italic markdown *text* → renders as <em>
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('This is *italic text* here')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. await window.waitForTimeout(2000)
  4. Screenshot: qa-screenshots/s4-06-italic.png

ASSERT:
  1. "italic text" wrapped in <em> or <i> tag:
     window.locator('em:has-text("italic text")').or(window.locator('i:has-text("italic text")')).isVisible() === true

SCREENSHOT: qa-screenshots/s4-06-italic.png
```

#### 4.07 — Inline code `text` → renders as <code>
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('This is `inline code` here')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. await window.waitForTimeout(2000)
  4. Screenshot: qa-screenshots/s4-07-code.png

ASSERT:
  1. "inline code" wrapped in <code> tag:
     window.locator('code:has-text("inline code")').isVisible() === true
  2. Code element has distinct background color (monospace + background styling)

SCREENSHOT: qa-screenshots/s4-07-code.png
```

#### 4.08 — Strikethrough ~~text~~ → renders as <s> or <del>
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('This is ~~strikethrough~~ here')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. await window.waitForTimeout(2000)
  4. Screenshot: qa-screenshots/s4-08-strike.png

ASSERT:
  1. "strikethrough" wrapped in <s> or <del> tag:
     window.locator('s:has-text("strikethrough")').or(window.locator('del:has-text("strikethrough")')).isVisible() === true
  2. Text has line-through decoration

SCREENSHOT: qa-screenshots/s4-08-strike.png
```

#### 4.09 — Code block with triple backticks → renders as <pre><code>
```
ACTION:
  1. Type a code block (use Shift+Enter for newlines in textarea):
     const textarea = window.locator('textarea[placeholder*="Message"]')
     await textarea.fill('```\nconst x = 42;\nconsole.log(x);\n```')
  2. textarea.press('Enter')
  3. await window.waitForTimeout(2000)
  4. Screenshot: qa-screenshots/s4-09-codeblock.png

ASSERT:
  1. Code block rendered in <pre> element:
     window.locator('pre').filter({ hasText: 'const x = 42' }).isVisible() === true
  2. Code is in a monospace font block with distinct background
  3. Newlines are preserved (multi-line display)

SCREENSHOT: qa-screenshots/s4-09-codeblock.png
```

#### 4.10 — Spoiler ||text|| → has .md-spoiler class, click reveals
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('Secret: ||spoiler content|| revealed')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. await window.waitForTimeout(2000)
  4. Screenshot before reveal: qa-screenshots/s4-10a-spoiler-hidden.png
  5. Click the spoiler element:
     window.locator('.md-spoiler').last().click()
  6. await window.waitForTimeout(500)
  7. Screenshot after reveal: qa-screenshots/s4-10b-spoiler-revealed.png

ASSERT:
  1. Spoiler element exists: window.locator('.md-spoiler').last().isVisible() === true
  2. Before click: spoiler text is obscured (background covers text, or opacity is low)
  3. After click: element has class '.md-spoiler--revealed' or equivalent revealed state
  4. Text "spoiler content" is now readable

SCREENSHOT: qa-screenshots/s4-10a-spoiler-hidden.png, qa-screenshots/s4-10b-spoiler-revealed.png
```

#### 4.11 — Link renders as clickable <a> with safe attributes
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('Visit https://example.com for more')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. await window.waitForTimeout(2000)
  4. Screenshot: qa-screenshots/s4-11-link.png

ASSERT:
  1. Link is an <a> element:
     window.locator('a[href="https://example.com"]').isVisible() === true
  2. Link has target="_blank":
     await window.locator('a[href="https://example.com"]').getAttribute('target') === '_blank'
  3. Link has rel containing "noopener":
     const rel = await window.locator('a[href="https://example.com"]').getAttribute('rel')
     rel.includes('noopener') === true
  4. Link text displays the URL or a formatted version of it

SCREENSHOT: qa-screenshots/s4-11-link.png
```

### Autocomplete / Mentions

#### 4.12 — Type @ → user mention autocomplete appears
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('@')
  2. await window.waitForTimeout(1500)
  3. Screenshot: qa-screenshots/s4-12-mention-autocomplete.png

ASSERT:
  1. An autocomplete/suggestion dropdown appears near the input
  2. The dropdown contains at least one username (e.g. "qa_admin" or similar)
  3. Dropdown items are clickable elements

SCREENSHOT: qa-screenshots/s4-12-mention-autocomplete.png

CLEANUP:
  1. Press Escape to dismiss autocomplete
  2. Clear the input: window.locator('textarea[placeholder*="Message"]').fill('')
```

#### 4.13 — Type # → channel mention autocomplete appears
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('#')
  2. await window.waitForTimeout(1500)
  3. Screenshot: qa-screenshots/s4-13-channel-autocomplete.png

ASSERT:
  1. An autocomplete/suggestion dropdown appears
  2. Dropdown contains channel names (e.g. "general", "announcements")
  3. Dropdown items are clickable

SCREENSHOT: qa-screenshots/s4-13-channel-autocomplete.png

CLEANUP:
  1. Press Escape to dismiss
  2. Clear input: window.locator('textarea[placeholder*="Message"]').fill('')
```

### Empty / Invalid Message Prevention

#### 4.14 — Empty message → should NOT send
```
ACTION:
  1. Ensure textarea is empty: window.locator('textarea[placeholder*="Message"]').fill('')
  2. Count messages currently visible:
     const beforeCount = await window.locator('[class*="message"]').count()
  3. window.locator('textarea[placeholder*="Message"]').press('Enter')
  4. await window.waitForTimeout(1000)
  5. Count messages after:
     const afterCount = await window.locator('[class*="message"]').count()
  6. Screenshot: qa-screenshots/s4-14-empty-msg.png

ASSERT:
  1. afterCount === beforeCount (no new message added)
  2. No blank/empty message bubble appeared in chat
  3. Input remains focused and empty

SCREENSHOT: qa-screenshots/s4-14-empty-msg.png
```

#### 4.15 — Whitespace-only message → should NOT send
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('   \n  \n   ')
  2. Count messages before:
     const beforeCount = await window.locator('[class*="message"]').count()
  3. window.locator('textarea[placeholder*="Message"]').press('Enter')
  4. await window.waitForTimeout(1000)
  5. const afterCount = await window.locator('[class*="message"]').count()
  6. Screenshot: qa-screenshots/s4-15-whitespace-msg.png

ASSERT:
  1. afterCount === beforeCount (no new message)
  2. No blank message appeared
  3. Input is cleared or still contains whitespace (either acceptable)

SCREENSHOT: qa-screenshots/s4-15-whitespace-msg.png
```

### XSS / Injection Prevention

#### 4.16 — HTML script tag → rendered as text, NOT executed
```
NOTE: Server-side HTML stripping is a known issue. This test documents current behavior.

ACTION:
  1. Collect alerts:
     let alertFired = false;
     window.on('dialog', dialog => { alertFired = true; dialog.dismiss(); });
  2. window.locator('textarea[placeholder*="Message"]').fill('<script>alert("xss")</script>')
  3. window.locator('textarea[placeholder*="Message"]').press('Enter')
  4. await window.waitForTimeout(2000)
  5. Screenshot: qa-screenshots/s4-16-xss-script.png

ASSERT:
  1. alertFired === false (script did NOT execute)
  2. The literal text "<script>" is visible in the message OR the message was stripped/sanitized
  3. No JavaScript dialog appeared
  4. App still functional — message input still works

NOTE: If server strips HTML tags, the message may appear empty or without the tags.
      Document actual behavior for server team.

SCREENSHOT: qa-screenshots/s4-16-xss-script.png
```

#### 4.17 — HTML img XSS → rendered as text
```
ACTION:
  1. Collect errors:
     let xssFired = false;
     window.on('dialog', dialog => { xssFired = true; dialog.dismiss(); });
  2. window.locator('textarea[placeholder*="Message"]').fill('<img src=x onerror=alert("xss")>')
  3. window.locator('textarea[placeholder*="Message"]').press('Enter')
  4. await window.waitForTimeout(2000)
  5. Screenshot: qa-screenshots/s4-17-xss-img.png

ASSERT:
  1. xssFired === false
  2. No alert dialog appeared
  3. Text is rendered as literal string, not as an image element that triggers onerror
  4. No <img> element with src=x exists in the message area

SCREENSHOT: qa-screenshots/s4-17-xss-img.png
```

#### 4.18 — SQL injection string → renders as text
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill("'; DROP TABLE messages; --")
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. await window.waitForTimeout(2000)
  4. Screenshot: qa-screenshots/s4-18-sql-injection.png

ASSERT:
  1. The literal text "'; DROP TABLE messages; --" appears in chat
  2. App is still functional — can still send messages
  3. No error toast or server error
  4. Channel still loads messages normally

SCREENSHOT: qa-screenshots/s4-18-sql-injection.png
```

### Message Display

#### 4.19 — Message grouping: consecutive same-author < 5min collapse
```
ACTION:
  1. Send three messages rapidly:
     window.locator('textarea[placeholder*="Message"]').fill('Group test msg 1 - ' + Date.now())
     window.locator('textarea[placeholder*="Message"]').press('Enter')
     await window.waitForTimeout(1000)
     window.locator('textarea[placeholder*="Message"]').fill('Group test msg 2')
     window.locator('textarea[placeholder*="Message"]').press('Enter')
     await window.waitForTimeout(1000)
     window.locator('textarea[placeholder*="Message"]').fill('Group test msg 3')
     window.locator('textarea[placeholder*="Message"]').press('Enter')
     await window.waitForTimeout(2000)
  2. Screenshot: qa-screenshots/s4-19-grouping.png

ASSERT:
  1. All three messages visible in chat
  2. Only the FIRST message in the group shows the full header (avatar, username, timestamp)
  3. Messages 2 and 3 are collapsed — no repeated avatar/username
  4. The grouped messages appear closer together than separate message groups

SCREENSHOT: qa-screenshots/s4-19-grouping.png
```

#### 4.20 — Typing indicator appears (requires second user)
```
NOTE: This test requires a second connected user to trigger typing.
      If only one test user is available, document as SKIPPED.

ACTION:
  1. If a second user session is available:
     - Second user starts typing in the same channel
  2. Observe the area below the message list / above the input
  3. await window.waitForTimeout(3000)
  4. Screenshot: qa-screenshots/s4-20-typing.png

ASSERT:
  1. Typing indicator area exists below messages or above input
  2. If second user is typing: indicator shows "[username] is typing..."
  3. If no second user: document as SKIPPED — cannot verify without concurrent session

SCREENSHOT: qa-screenshots/s4-20-typing.png
```

#### 4.21 — Unread indicator on channel after receiving message in another channel
```
NOTE: Requires message activity in a non-active channel.
      May need second user or server-side message injection.

ACTION:
  1. Note the current channel (e.g. "general")
  2. If possible, trigger a message in another channel (e.g. "announcements")
  3. Check sidebar for unread indicators:
     Look for bold text, dot indicator, or badge on non-active channels
  4. Screenshot: qa-screenshots/s4-21-unread.png

ASSERT:
  1. If unread activity occurred: channel name appears bold or has a dot/badge indicator
  2. Active channel does NOT show unread indicator (it's the focused channel)
  3. Document actual unread indicator styling for reference

SCREENSHOT: qa-screenshots/s4-21-unread.png
```

### Edge Cases

#### 4.22 — Very long message (2000+ chars) → renders without breaking layout
```
ACTION:
  1. Generate a long message:
     const longMsg = 'A'.repeat(2000) + ' end-marker-' + Date.now()
  2. window.locator('textarea[placeholder*="Message"]').fill(longMsg)
  3. window.locator('textarea[placeholder*="Message"]').press('Enter')
  4. await window.waitForTimeout(3000)
  5. Screenshot: qa-screenshots/s4-22-long-message.png
  6. Check for horizontal overflow:
     const hasOverflow = await window.evaluate(() =>
       document.documentElement.scrollWidth > document.documentElement.clientWidth
     )

ASSERT:
  1. Message sent successfully (appears in chat or truncated with indicator)
  2. hasOverflow === false (no horizontal scrollbar on page)
  3. Message text wraps properly within the chat area
  4. Layout is not broken — sidebar and input still visible
  5. If server has a character limit, an error message is shown instead (document limit)

SCREENSHOT: qa-screenshots/s4-22-long-message.png
```

#### 4.23 — Rapid message sending (5 messages fast) → all appear in order
```
ACTION:
  1. Send 5 messages as fast as possible:
     for (let i = 1; i <= 5; i++) {
       await window.locator('textarea[placeholder*="Message"]').fill('Rapid ' + i + ' at ' + Date.now());
       await window.locator('textarea[placeholder*="Message"]').press('Enter');
       await window.waitForTimeout(300);
     }
  2. await window.waitForTimeout(3000)
  3. Screenshot: qa-screenshots/s4-23-rapid-send.png

ASSERT:
  1. All 5 messages appear in chat
  2. Messages are in correct order (Rapid 1 before Rapid 2, etc.)
  3. No duplicate messages
  4. No error toasts from rate limiting (or if rate limited, document the behavior)
  5. Message input still functional after rapid sending

SCREENSHOT: qa-screenshots/s4-23-rapid-send.png
```

#### 4.24 — Scroll behavior: new message auto-scrolls when at bottom
```
ACTION:
  1. Scroll chat to bottom first (send a message to ensure we're at bottom)
  2. Send a new message:
     window.locator('textarea[placeholder*="Message"]').fill('Scroll test bottom ' + Date.now())
     window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. await window.waitForTimeout(2000)
  4. Check if new message is visible (auto-scrolled):
     const isVisible = await window.locator('text=Scroll test bottom').last().isVisible()
  5. Screenshot: qa-screenshots/s4-24-autoscroll.png

ASSERT:
  1. isVisible === true (new message auto-scrolled into view)
  2. Message is at or near the bottom of the chat viewport

SCREENSHOT: qa-screenshots/s4-24-autoscroll.png
```
