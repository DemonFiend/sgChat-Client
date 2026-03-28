# Suite 22 — Messaging Parity

## SETUP
- App launched, logged in as qa_admin
- On server view with at least one text channel visible
- A second test user (qa_user) exists for DM and typing tests
- Test channel has messages with custom emoji, spoilers, and file links

## TESTS

### Custom Emoji in Markdown

#### 22.01 — Custom emoji inside bold text renders correctly
```
PRECONDITION: In a text channel, custom emoji available on server

ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('**bold :custom_emoji: text**')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. Wait 2 seconds
  4. window.screenshot({ path: 'qa-screenshots/s22-01-emoji-bold.png' })

ASSERT:
  1. Last message contains bold text (wrapped in <strong> or bold styling)
  2. Custom emoji renders as <img> element inside the message content
  3. Emoji image is not broken (naturalWidth > 0)
  4. Bold formatting applies to surrounding text, not the emoji img
```

#### 22.02 — Custom emoji inside italic text renders correctly
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('*italic :custom_emoji: text*')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. Wait 2 seconds
  4. window.screenshot({ path: 'qa-screenshots/s22-02-emoji-italic.png' })

ASSERT:
  1. Last message contains italic text (wrapped in <em> or italic styling)
  2. Custom emoji renders as <img> element inside the message
  3. Emoji image loads correctly
```

#### 22.03 — Custom emoji inside spoiler renders correctly
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('||spoiler :custom_emoji: text||')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. Wait 2 seconds
  4. window.screenshot({ path: 'qa-screenshots/s22-03-emoji-spoiler-hidden.png' })

ASSERT:
  1. Last message contains a spoiler element with class .md-spoiler
  2. Spoiler is initially hidden (not revealed)
  3. Click the spoiler: window.locator('.md-spoiler').last().click()
  4. Wait 500ms
  5. window.screenshot({ path: 'qa-screenshots/s22-03-emoji-spoiler-revealed.png' })
  6. Spoiler now has class .md-spoiler--revealed
  7. Custom emoji <img> is visible inside the revealed spoiler
```

### Spoiler Image

#### 22.04 — Image URL in spoiler syntax → blurred with SPOILER overlay
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('||https://via.placeholder.com/150||')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. Wait 3 seconds
  4. window.screenshot({ path: 'qa-screenshots/s22-04-spoiler-image-hidden.png' })

ASSERT:
  1. Image is rendered but blurred (CSS filter: blur or opacity overlay)
  2. "SPOILER" text overlay visible on the image
  3. Image element exists but content is obscured
```

#### 22.05 — Click spoiler image → reveals it
```
PRECONDITION: Spoiler image from 22.04 visible

ACTION:
  1. Click the spoiler image element: window.locator('.md-spoiler').last().click()
  2. Wait 1 second
  3. window.screenshot({ path: 'qa-screenshots/s22-05-spoiler-image-revealed.png' })

ASSERT:
  1. Image is now fully visible (blur removed)
  2. .md-spoiler--revealed class present
  3. "SPOILER" overlay text is gone or hidden
```

#### 22.06 — Click revealed spoiler image again → hides it
```
ACTION:
  1. Click the revealed spoiler image again: window.locator('.md-spoiler--revealed').last().click()
  2. Wait 1 second
  3. window.screenshot({ path: 'qa-screenshots/s22-06-spoiler-image-rehidden.png' })

ASSERT:
  1. Image is blurred again
  2. .md-spoiler--revealed class removed (back to .md-spoiler)
  3. "SPOILER" overlay reappears
```

#### 22.07 — Non-image spoiler text still works alongside image spoilers
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('||this is secret text||')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. Wait 2 seconds
  4. window.screenshot({ path: 'qa-screenshots/s22-07-text-spoiler.png' })

ASSERT:
  1. Spoiler text element with .md-spoiler class exists
  2. Text is hidden (black/dark bar covering text)
  3. Click reveals text: window.locator('.md-spoiler').last().click()
  4. .md-spoiler--revealed class applied after click
  5. Text now readable
```

### File/Attachment Cards

#### 22.08 — File URL → FileCard with icon
```
ACTION:
  1. Send a message with a file URL (e.g. a .pdf or .zip link)
  2. window.locator('textarea[placeholder*="Message"]').fill('https://example.com/document.pdf')
  3. window.locator('textarea[placeholder*="Message"]').press('Enter')
  4. Wait 3 seconds
  5. window.screenshot({ path: 'qa-screenshots/s22-08-file-card.png' })

ASSERT:
  1. FileCard component renders (not just a plain text link)
  2. File icon is visible appropriate to file type
  3. Filename is displayed on the card
```

#### 22.09 — Audio file → audio icon
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('https://example.com/track.mp3')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. Wait 3 seconds
  4. window.screenshot({ path: 'qa-screenshots/s22-09-audio-card.png' })

ASSERT:
  1. FileCard with audio-specific icon renders
  2. Filename "track.mp3" displayed
```

#### 22.10 — Archive file → archive icon
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('https://example.com/archive.zip')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. Wait 3 seconds
  4. window.screenshot({ path: 'qa-screenshots/s22-10-archive-card.png' })

ASSERT:
  1. FileCard with archive-specific icon renders
  2. Filename "archive.zip" displayed
```

#### 22.11 — Code file → code icon
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('https://example.com/script.py')
  2. window.locator('textarea[placeholder*="Message"]').press('Enter')
  3. Wait 3 seconds
  4. window.screenshot({ path: 'qa-screenshots/s22-11-code-card.png' })

ASSERT:
  1. FileCard with code-specific icon renders
  2. Filename "script.py" displayed
```

#### 22.12 — FileCard shows "Click to download" or download action
```
PRECONDITION: FileCard visible from previous tests

ACTION:
  1. Hover over the FileCard element
  2. window.screenshot({ path: 'qa-screenshots/s22-12-file-download.png' })

ASSERT:
  1. "Click to download" text visible OR download icon/button present
  2. FileCard is clickable (has href or click handler)
  3. Parsed filename displayed (not raw URL)
```

### ReactionPicker

#### 22.13 — ReactionPicker opens as two-panel 420x420
```
PRECONDITION: At least one message visible in chat

ACTION:
  1. Hover over a message to reveal the hover toolbar
  2. Click the emoji/reaction button on the hover toolbar
  3. Wait 1 second
  4. window.screenshot({ path: 'qa-screenshots/s22-13-reaction-picker.png' })

ASSERT:
  1. ReactionPicker panel is visible
  2. Picker has two panels: sidebar categories and emoji grid
  3. Picker dimensions approximately 420x420 (check via bounding box)
```

#### 22.14 — Sidebar categories in ReactionPicker
```
PRECONDITION: ReactionPicker open from 22.13

ACTION:
  1. window.screenshot({ path: 'qa-screenshots/s22-14-picker-categories.png' })

ASSERT:
  1. Category sidebar visible on left side of picker
  2. Multiple category icons/labels visible (e.g. Smileys, People, Animals, Food, etc.)
  3. Clicking a category changes the emoji grid content
  4. Click a different category and verify grid updates
```

#### 22.15 — Search auto-focuses in ReactionPicker
```
PRECONDITION: ReactionPicker open

ACTION:
  1. Close and reopen the ReactionPicker (click emoji button on hover toolbar)
  2. Wait 500ms
  3. window.screenshot({ path: 'qa-screenshots/s22-15-picker-search-focus.png' })

ASSERT:
  1. Search input inside picker has focus (is the active element)
  2. Can immediately type without clicking the search input
```

#### 22.16 — Search filters emoji list
```
PRECONDITION: ReactionPicker open with search focused

ACTION:
  1. Type 'heart' into the search input
  2. Wait 1 second
  3. window.screenshot({ path: 'qa-screenshots/s22-16-picker-search-filter.png' })

ASSERT:
  1. Emoji grid shows filtered results containing heart emojis
  2. Non-heart emojis are hidden
  3. At least one heart emoji visible in results
```

#### 22.17 — Click emoji adds reaction to message
```
PRECONDITION: ReactionPicker open, search cleared

ACTION:
  1. Click on any emoji in the picker grid
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s22-17-reaction-added.png' })

ASSERT:
  1. ReactionPicker closes after selection
  2. Reaction appears below the message
  3. Reaction shows the selected emoji with a count (1)
  4. Reaction element is clickable (for toggling)
```

#### 22.18 — Unicode fallback for unsupported emoji
```
ACTION:
  1. Hover over a message, open ReactionPicker
  2. Search for a common unicode emoji (e.g. 'thumbs up')
  3. Click it
  4. Wait 2 seconds
  5. window.screenshot({ path: 'qa-screenshots/s22-18-unicode-reaction.png' })

ASSERT:
  1. Reaction renders as unicode character (not broken image)
  2. Reaction is visible and styled correctly
  3. Count displays correctly
```

### DM Chat Polish

#### 22.19 — Typing indicator shows bouncing dots
```
PRECONDITION: In a DM conversation with qa_user. qa_user is typing (trigger from second session or mock).

ACTION:
  1. Navigate to DM with qa_user
  2. Wait for typing indicator to appear (qa_user must start typing)
  3. window.screenshot({ path: 'qa-screenshots/s22-19-typing-indicator.png' })

ASSERT:
  1. Typing indicator visible below the message input area
  2. Shows bouncing/animated dots (animation CSS present)
  3. Shows username of who is typing (e.g. "qa_user is typing...")
```

#### 22.20 — Typing indicator stops after ~3 seconds of inactivity
```
PRECONDITION: Typing indicator visible from 22.19

ACTION:
  1. qa_user stops typing
  2. Wait 4 seconds
  3. window.screenshot({ path: 'qa-screenshots/s22-20-typing-stopped.png' })

ASSERT:
  1. Typing indicator is no longer visible
  2. No bouncing dots
  3. Chat area looks normal
```

#### 22.21 — Blocking a user shows banner and hides input
```
PRECONDITION: In DM with qa_user (or a test user that can be blocked)

ACTION:
  1. Block the user (via user profile popover → Block, or context menu)
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s22-21-blocked-dm.png' })

ASSERT:
  1. Block banner visible in the DM chat area
  2. Message input textarea is hidden or disabled
  3. Cannot type or send messages
  4. Banner indicates the user is blocked
```

#### 22.22 — Unblocking restores input
```
PRECONDITION: User blocked from 22.21

ACTION:
  1. Unblock the user (via banner button or profile → Unblock)
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s22-22-unblocked-dm.png' })

ASSERT:
  1. Block banner removed
  2. Message input textarea is visible and enabled again
  3. Can type in the input: window.locator('textarea[placeholder*="Message"]').fill('test')
  4. Input accepts text

CLEANUP:
  1. Clear the test text from input
```

#### 22.23 — System events render centered
```
PRECONDITION: In a channel or DM that has system events (e.g. user joined, channel created)

ACTION:
  1. Navigate to a channel with system events
  2. Scroll to find a system event message
  3. window.screenshot({ path: 'qa-screenshots/s22-23-system-event.png' })

ASSERT:
  1. System event message is centered in the chat area (not left-aligned like user messages)
  2. System event has distinct styling (smaller text, muted color, no avatar)
  3. Event text describes the action (e.g. "joined the channel", "created the channel")
```

### Slash Command Autocomplete Parity

#### 22.24 — Type `/` in message input → slash command autocomplete appears
```
PARITY CHECK: Server web UI has SlashCommandAutocomplete. Client must match.

ACTION:
  1. Navigate to a text channel
  2. window.locator('textarea[placeholder*="Message"]').click()
  3. window.locator('textarea[placeholder*="Message"]').fill('/')
  4. Wait 1 second
  5. window.screenshot({ path: 'qa-screenshots/s22-24-slash-autocomplete.png' })

ASSERT:
  1. Autocomplete popup appears above or below the input
  2. At least one slash command visible (e.g. /shrug, /tableflip, /tts, or server-defined)
  3. Each command shows: name and description
  4. Popup styled consistently (same border, background as other autocompletes)

CLEANUP:
  1. Press Escape to close autocomplete
  2. Clear the input
```

#### 22.25 — Select slash command from autocomplete → replaces text
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('/')
  2. Wait for autocomplete popup
  3. Click the first command in the list (or press Enter/Tab)
  4. Wait 1 second
  5. window.screenshot({ path: 'qa-screenshots/s22-25-slash-selected.png' })

ASSERT:
  1. Input text updated with the selected command (e.g. "/shrug" or command output)
  2. Autocomplete popup closed after selection
  3. Cursor at end of inserted text

CLEANUP:
  1. Clear the input (Ctrl+A, Backspace)
```

#### 22.26 — Slash command with no match → empty state or filtered list
```
ACTION:
  1. window.locator('textarea[placeholder*="Message"]').fill('/zzzznonexistent')
  2. Wait 1 second
  3. window.screenshot({ path: 'qa-screenshots/s22-26-slash-no-match.png' })

ASSERT:
  1. Either: autocomplete shows "No commands found" / empty state
  2. Or: autocomplete popup does not appear (filtered to zero results)
  3. No error or crash

CLEANUP:
  1. Clear input
```

### Sticker Picker Parity

#### 22.27 — Sticker picker accessible from message input toolbar
```
PARITY CHECK: Server web UI has StickerPicker. Client must have matching UI.

ACTION:
  1. Look for sticker button near message input (icon: sticker/square-face)
  2. Click the sticker button
  3. Wait 2 seconds
  4. window.screenshot({ path: 'qa-screenshots/s22-27-sticker-picker.png' })

ASSERT:
  1. Sticker picker panel opens
  2. Panel shows sticker categories or packs (if any exist on server)
  3. If no stickers: empty state with message like "No stickers available"
  4. Picker has search functionality or category navigation
  5. Close button or click-outside dismisses picker

CLEANUP:
  1. Close the sticker picker
```

#### 22.28 — Select sticker → sends as message
```
PRECONDITION: Sticker picker open, at least one sticker available

ACTION:
  1. Click a sticker in the picker
  2. Wait 3 seconds for message to send
  3. window.screenshot({ path: 'qa-screenshots/s22-28-sticker-sent.png' })

ASSERT:
  1. Sticker picker closes after selection
  2. Message sent containing the sticker (image URL or sticker content)
  3. Sticker renders in chat as an image, not raw text
  4. No error toast
```

### Final Cleanup
```
Ensure we're logged in as qa_admin on server view.
Unblock any blocked users.
Navigate back to a text channel.
```
