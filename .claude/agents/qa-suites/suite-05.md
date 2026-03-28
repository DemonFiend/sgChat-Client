# Suite 5 — Message Actions

## SETUP
- App launched and logged in as qa_admin (Suite 1 handles setup/login)
- On server view, "general" channel selected
- At least one message sent by qa_admin exists in the channel (send one if needed)
- Message input visible: `textarea[placeholder*="Message"]`

## TESTS

### Edit Message

#### 5.01 — Hover own message → Edit button visible in action toolbar
```
ACTION:
  1. Send a message to edit:
     window.locator('textarea[placeholder*="Message"]').fill('Edit target message ' + Date.now())
     window.locator('textarea[placeholder*="Message"]').press('Enter')
     await window.waitForTimeout(2000)
  2. Hover over the sent message:
     const message = window.locator('text=Edit target message').last()
     await message.hover()
  3. await window.waitForTimeout(500)
  4. Screenshot: qa-screenshots/s5-01-edit-hover.png

ASSERT:
  1. Action toolbar appears on hover (floating bar above/near the message)
  2. Edit button visible with tooltip "Edit":
     window.locator('[aria-label="Edit"]').or(window.locator('button >> text=Edit')).isVisible() === true
     OR: a button with tooltip="Edit" is visible in the action toolbar
  3. Toolbar also shows other action buttons (Reply, React, etc.)

SCREENSHOT: qa-screenshots/s5-01-edit-hover.png
```

#### 5.02 — Click Edit → textarea appears with current content
```
PRECONDITION: Hovering over own message, action toolbar visible (from 5.01)

ACTION:
  1. Hover the message again to ensure toolbar visible:
     await window.locator('text=Edit target message').last().hover()
     await window.waitForTimeout(500)
  2. Click the Edit button:
     window.locator('[aria-label="Edit"]').click()
     OR: click the button with Edit tooltip in the toolbar
  3. await window.waitForTimeout(1000)
  4. Screenshot: qa-screenshots/s5-02-edit-mode.png

ASSERT:
  1. An edit textarea appears where the message was, containing the original text:
     window.locator('textarea').filter({ hasText: 'Edit target message' }).isVisible() === true
  2. Edit textarea has the accent border styling: border contains var(--accent) or a distinct color
  3. Helper text visible: "escape to cancel" and "enter to save" (or similar)
  4. Original message text is pre-filled in the textarea

SCREENSHOT: qa-screenshots/s5-02-edit-mode.png
```

#### 5.03 — Change text, press Enter → message updates, "(edited)" appears
```
PRECONDITION: In edit mode (from 5.02)

ACTION:
  1. Clear and type new content in the edit textarea:
     const editBox = window.locator('textarea').filter({ hasText: 'Edit target message' })
     await editBox.fill('Edited message content ' + Date.now())
  2. editBox.press('Enter')
  3. await window.waitForTimeout(2000)
  4. Screenshot: qa-screenshots/s5-03-edited.png

ASSERT:
  1. Edit textarea is gone (back to normal message display)
  2. Message now shows "Edited message content": window.locator('text=Edited message content').isVisible() === true
  3. "(edited)" indicator visible near the message:
     window.locator('text=(edited)').last().isVisible() === true
  4. Original text "Edit target message" no longer visible in that message

SCREENSHOT: qa-screenshots/s5-03-edited.png
```

#### 5.04 — Press Escape during edit → edit cancelled, original text restored
```
ACTION:
  1. Send a message: 'Escape edit test ' + Date.now()
     window.locator('textarea[placeholder*="Message"]').fill('Escape edit test ' + Date.now())
     window.locator('textarea[placeholder*="Message"]').press('Enter')
     await window.waitForTimeout(2000)
  2. Hover and click Edit on it:
     await window.locator('text=Escape edit test').last().hover()
     await window.waitForTimeout(500)
     window.locator('[aria-label="Edit"]').click()
     await window.waitForTimeout(1000)
  3. Modify the text:
     const editBox = window.locator('textarea').filter({ hasText: 'Escape edit test' })
     await editBox.fill('This should NOT be saved')
  4. Press Escape:
     await editBox.press('Escape')
  5. await window.waitForTimeout(1000)
  6. Screenshot: qa-screenshots/s5-04-escape-edit.png

ASSERT:
  1. Edit textarea is gone
  2. Original message text "Escape edit test" is still visible
  3. "This should NOT be saved" does NOT appear in chat
  4. No "(edited)" indicator on this message

SCREENSHOT: qa-screenshots/s5-04-escape-edit.png
```

#### 5.05 — Edit to empty → rejected (message not deleted)
```
ACTION:
  1. Send a message: 'Empty edit test ' + Date.now()
     window.locator('textarea[placeholder*="Message"]').fill('Empty edit test ' + Date.now())
     window.locator('textarea[placeholder*="Message"]').press('Enter')
     await window.waitForTimeout(2000)
  2. Hover and click Edit:
     await window.locator('text=Empty edit test').last().hover()
     await window.waitForTimeout(500)
     window.locator('[aria-label="Edit"]').click()
     await window.waitForTimeout(1000)
  3. Clear the textarea completely:
     const editBox = window.locator('textarea').filter({ hasText: 'Empty edit test' })
     await editBox.fill('')
  4. Press Enter:
     await editBox.press('Enter')
  5. await window.waitForTimeout(1500)
  6. Screenshot: qa-screenshots/s5-05-empty-edit.png

ASSERT:
  1. Original message is still present (not deleted by empty edit)
  2. Either: edit is rejected with an error/validation message
  3. Or: edit is cancelled and original text restored
  4. Or: edit textarea remains open (won't submit empty)
  5. Message "Empty edit test" is still visible in chat

SCREENSHOT: qa-screenshots/s5-05-empty-edit.png
```

#### 5.06 — Cannot edit other users' messages (Edit button absent)
```
NOTE: Requires a message from another user in the channel.
      If no other user's message exists, document as SKIPPED.

ACTION:
  1. Locate a message NOT sent by qa_admin (look for different username)
  2. Hover over that message:
     await otherUserMessage.hover()
  3. await window.waitForTimeout(500)
  4. Screenshot: qa-screenshots/s5-06-no-edit-others.png

ASSERT:
  1. Action toolbar appears on hover
  2. Edit button is NOT present in the toolbar for another user's message
  3. Reply, React buttons may still be visible (those are allowed on others' messages)

SCREENSHOT: qa-screenshots/s5-06-no-edit-others.png
```

### Delete Message

#### 5.07 — Hover own message → Delete button visible (tooltip="Delete")
```
ACTION:
  1. Send a message to delete:
     window.locator('textarea[placeholder*="Message"]').fill('Delete target ' + Date.now())
     window.locator('textarea[placeholder*="Message"]').press('Enter')
     await window.waitForTimeout(2000)
  2. Hover over it:
     await window.locator('text=Delete target').last().hover()
  3. await window.waitForTimeout(500)
  4. Screenshot: qa-screenshots/s5-07-delete-hover.png

ASSERT:
  1. Action toolbar visible
  2. Delete button visible:
     window.locator('[aria-label="Delete"]').isVisible() === true
     OR: button with Delete tooltip in toolbar

SCREENSHOT: qa-screenshots/s5-07-delete-hover.png
```

#### 5.08 — Click Delete → confirmation modal appears
```
PRECONDITION: Hovering over own message with action toolbar visible

ACTION:
  1. Hover and click Delete:
     await window.locator('text=Delete target').last().hover()
     await window.waitForTimeout(500)
     window.locator('[aria-label="Delete"]').click()
  2. await window.waitForTimeout(1000)
  3. Screenshot: qa-screenshots/s5-08-delete-modal.png

ASSERT:
  1. Modal dialog appears with title "Delete Message":
     window.locator('text=Delete Message').isVisible() === true
  2. "Cancel" button visible: window.locator('button:has-text("Cancel")').isVisible()
  3. "Delete" button visible (red/danger styled):
     window.locator('button:has-text("Delete")').isVisible()
  4. Modal has a backdrop/overlay

SCREENSHOT: qa-screenshots/s5-08-delete-modal.png
```

#### 5.09 — Confirm delete → message removed from chat
```
PRECONDITION: Delete confirmation modal open (from 5.08)

ACTION:
  1. Note the message text for verification
  2. Click the "Delete" confirm button (the red one, not "Cancel"):
     window.locator('button:has-text("Delete")').last().click()
     NOTE: If multiple "Delete" buttons, click the one inside the modal (not the toolbar one)
  3. await window.waitForTimeout(2000)
  4. Screenshot: qa-screenshots/s5-09-deleted.png

ASSERT:
  1. Modal is closed
  2. The "Delete target" message is no longer visible in chat:
     window.locator('text=Delete target').isVisible() === false
  3. Chat area still functional — other messages remain
  4. No error toast

SCREENSHOT: qa-screenshots/s5-09-deleted.png
```

#### 5.10 — Cannot delete others' messages without permission
```
NOTE: Requires a message from another user. qa_admin may have mod/admin delete rights.
      Test with awareness that admin users might have elevated permissions.

ACTION:
  1. Locate a message from another user
  2. Hover over it
  3. await window.waitForTimeout(500)
  4. Screenshot: qa-screenshots/s5-10-others-delete.png

ASSERT:
  1. If qa_admin is a regular user: Delete button should NOT be present for others' messages
  2. If qa_admin has admin/mod role: Delete button MAY be present (admin privilege)
  3. Document which case applies and the observed behavior

SCREENSHOT: qa-screenshots/s5-10-others-delete.png
```

### Reply

#### 5.11 — Hover → Reply button visible in action toolbar
```
ACTION:
  1. Send a message to reply to:
     window.locator('textarea[placeholder*="Message"]').fill('Reply target message ' + Date.now())
     window.locator('textarea[placeholder*="Message"]').press('Enter')
     await window.waitForTimeout(2000)
  2. Hover over it:
     await window.locator('text=Reply target message').last().hover()
  3. await window.waitForTimeout(500)
  4. Screenshot: qa-screenshots/s5-11-reply-hover.png

ASSERT:
  1. Reply button visible in action toolbar:
     window.locator('[aria-label="Reply"]').isVisible() === true

SCREENSHOT: qa-screenshots/s5-11-reply-hover.png
```

#### 5.12 — Click Reply → reply preview appears above message input
```
ACTION:
  1. Hover and click Reply:
     await window.locator('text=Reply target message').last().hover()
     await window.waitForTimeout(500)
     window.locator('[aria-label="Reply"]').click()
  2. await window.waitForTimeout(1000)
  3. Screenshot: qa-screenshots/s5-12-reply-preview.png

ASSERT:
  1. Reply preview/banner appears above the message input area
  2. Preview shows the original message text or author ("Replying to..." or similar)
  3. Message input is focused and ready for typing
  4. A close/cancel button exists on the reply preview

SCREENSHOT: qa-screenshots/s5-12-reply-preview.png
```

#### 5.13 — Send reply → reply reference shown on new message
```
PRECONDITION: Reply preview active (from 5.12)

ACTION:
  1. Type and send a reply:
     window.locator('textarea[placeholder*="Message"]').fill('This is my reply ' + Date.now())
     window.locator('textarea[placeholder*="Message"]').press('Enter')
  2. await window.waitForTimeout(2000)
  3. Screenshot: qa-screenshots/s5-13-reply-sent.png

ASSERT:
  1. Reply message appears in chat: window.locator('text=This is my reply').isVisible()
  2. Reply has a reference/quote showing the original message or author
  3. Reply preview above input is now cleared
  4. The reply reference is visually distinct (indented, has connecting line, or shows quoted text)

SCREENSHOT: qa-screenshots/s5-13-reply-sent.png
```

#### 5.14 — Click reply reference → scrolls to original message
```
PRECONDITION: Reply with reference visible (from 5.13)

ACTION:
  1. Locate the reply reference on the reply message:
     The clickable reference/quote area above the reply content
  2. Click the reply reference/quote:
     window.locator('text=This is my reply').last().locator('..').locator('[class*="reply"], [class*="reference"]').click()
  3. await window.waitForTimeout(1000)
  4. Screenshot: qa-screenshots/s5-14-scroll-to-original.png

ASSERT:
  1. Chat scrolls to show the original "Reply target message"
  2. Original message may be highlighted/flashed briefly
  3. The original message is now visible in the viewport

SCREENSHOT: qa-screenshots/s5-14-scroll-to-original.png
```

### Pin Message

#### 5.15 — Pin button visible in action toolbar
```
ACTION:
  1. Send a message to pin:
     window.locator('textarea[placeholder*="Message"]').fill('Pin target message ' + Date.now())
     window.locator('textarea[placeholder*="Message"]').press('Enter')
     await window.waitForTimeout(2000)
  2. Hover over the message:
     await window.locator('text=Pin target message').last().hover()
  3. await window.waitForTimeout(500)
  4. Screenshot: qa-screenshots/s5-15-pin-hover.png

ASSERT:
  1. Pin button visible in toolbar:
     window.locator('[aria-label="Pin"]').or(window.locator('[aria-label="Pin Message"]')).isVisible() === true

SCREENSHOT: qa-screenshots/s5-15-pin-hover.png
```

#### 5.16 — Click Pin → message is pinned
```
ACTION:
  1. Hover and click Pin:
     await window.locator('text=Pin target message').last().hover()
     await window.waitForTimeout(500)
     window.locator('[aria-label="Pin"]').or(window.locator('[aria-label="Pin Message"]')).click()
  2. await window.waitForTimeout(2000)
  3. Screenshot: qa-screenshots/s5-16-pinned.png

ASSERT:
  1. Pin action completes without error
  2. A confirmation toast or indicator shows the message was pinned
  3. OR: a pin icon/indicator now appears on the message
  4. No error toast

SCREENSHOT: qa-screenshots/s5-16-pinned.png
```

#### 5.17 — Pinned panel accessible from channel header
```
ACTION:
  1. Look for a "Pinned Messages" button in the channel header area:
     window.locator('[aria-label="Pinned Messages"]').or(window.locator('[aria-label="Pins"]')).or(window.locator('button >> svg[class*="pin"]')).click()
  2. await window.waitForTimeout(2000)
  3. Screenshot: qa-screenshots/s5-17-pinned-panel.png

ASSERT:
  1. A pinned messages panel/popover opens
  2. The panel contains the "Pin target message" text
  3. Pinned messages are listed with their content

SCREENSHOT: qa-screenshots/s5-17-pinned-panel.png
```

#### 5.18 — Unpin → removed from pinned panel
```
PRECONDITION: Pinned panel open (from 5.17)

ACTION:
  1. Find the unpin button for the pinned message in the panel:
     Click unpin/remove on "Pin target message" entry
  2. await window.waitForTimeout(2000)
  3. Re-open pinned panel if it closed
  4. Screenshot: qa-screenshots/s5-18-unpinned.png

ASSERT:
  1. "Pin target message" no longer appears in pinned panel
  2. Message still exists in chat (unpinning does not delete)
  3. Pin indicator removed from the message in chat

SCREENSHOT: qa-screenshots/s5-18-unpinned.png
```

### Reactions

#### 5.19 — Add Reaction button → emoji picker opens
```
ACTION:
  1. Send a message to react to:
     window.locator('textarea[placeholder*="Message"]').fill('React target ' + Date.now())
     window.locator('textarea[placeholder*="Message"]').press('Enter')
     await window.waitForTimeout(2000)
  2. Hover over the message:
     await window.locator('text=React target').last().hover()
     await window.waitForTimeout(500)
  3. Click React/Add Reaction button in toolbar:
     window.locator('[aria-label="React"]').or(window.locator('[aria-label="Add Reaction"]')).click()
  4. await window.waitForTimeout(1000)
  5. Screenshot: qa-screenshots/s5-19-reaction-picker.png

ASSERT:
  1. Emoji picker opens (a popover/dialog with emoji grid)
  2. Picker contains emoji categories or a search field
  3. Individual emojis are clickable

SCREENSHOT: qa-screenshots/s5-19-reaction-picker.png
```

#### 5.20 — Select emoji → reaction appears on message with count
```
PRECONDITION: Emoji picker open (from 5.19)

ACTION:
  1. Click an emoji in the picker (e.g. thumbs up or first available emoji):
     window.locator('[class*="emoji"]').first().click()
     OR: click a specific emoji button in the picker grid
  2. await window.waitForTimeout(2000)
  3. Screenshot: qa-screenshots/s5-20-reaction-added.png

ASSERT:
  1. Emoji picker closes
  2. Reaction appears below the "React target" message
  3. Reaction shows the emoji and a count of 1
  4. Reaction has a visual indicator that the current user reacted (highlighted/active state)

SCREENSHOT: qa-screenshots/s5-20-reaction-added.png
```

#### 5.21 — Click own reaction → removes it
```
PRECONDITION: Reaction from 5.20 exists on the message

ACTION:
  1. Click the reaction badge/button on the message (the emoji+count element):
     Locate the reaction element below "React target" message and click it
  2. await window.waitForTimeout(2000)
  3. Screenshot: qa-screenshots/s5-21-reaction-removed.png

ASSERT:
  1. Reaction is removed from the message (count goes to 0 and element disappears)
  2. OR: if other users had also reacted, count decreases by 1
  3. No error toast

SCREENSHOT: qa-screenshots/s5-21-reaction-removed.png
```

#### 5.22 — Multiple reactions on same message
```
ACTION:
  1. Hover the message and add first reaction:
     await window.locator('text=React target').last().hover()
     await window.waitForTimeout(500)
     window.locator('[aria-label="React"]').or(window.locator('[aria-label="Add Reaction"]')).click()
     await window.waitForTimeout(1000)
     Click first emoji in picker
     await window.waitForTimeout(1500)
  2. Hover again and add second reaction:
     await window.locator('text=React target').last().hover()
     await window.waitForTimeout(500)
     window.locator('[aria-label="React"]').or(window.locator('[aria-label="Add Reaction"]')).click()
     await window.waitForTimeout(1000)
     Click a DIFFERENT emoji in picker
     await window.waitForTimeout(1500)
  3. Screenshot: qa-screenshots/s5-22-multi-reactions.png

ASSERT:
  1. Two different reaction emojis appear below the message
  2. Each reaction shows count of 1
  3. Both are visually indicated as own reactions (highlighted)

SCREENSHOT: qa-screenshots/s5-22-multi-reactions.png
```

### Threads

#### 5.23 — Create Thread button visible in action toolbar
```
ACTION:
  1. Send a message:
     window.locator('textarea[placeholder*="Message"]').fill('Thread target ' + Date.now())
     window.locator('textarea[placeholder*="Message"]').press('Enter')
     await window.waitForTimeout(2000)
  2. Hover over it:
     await window.locator('text=Thread target').last().hover()
     await window.waitForTimeout(500)
  3. Screenshot: qa-screenshots/s5-23-thread-hover.png

ASSERT:
  1. "Create Thread" button visible in action toolbar:
     window.locator('[aria-label="Create Thread"]').or(window.locator('[aria-label="Thread"]')).isVisible() === true

SCREENSHOT: qa-screenshots/s5-23-thread-hover.png
```

#### 5.24 — Click Create Thread → thread panel opens
```
ACTION:
  1. Hover and click Create Thread:
     await window.locator('text=Thread target').last().hover()
     await window.waitForTimeout(500)
     window.locator('[aria-label="Create Thread"]').or(window.locator('[aria-label="Thread"]')).click()
  2. await window.waitForTimeout(2000)
  3. Screenshot: qa-screenshots/s5-24-thread-panel.png

ASSERT:
  1. Thread panel/sidebar opens on the right side
  2. Panel shows the original message "Thread target" as the thread starter
  3. Thread has its own message input area
  4. Thread has a header with thread name or "Thread" title

SCREENSHOT: qa-screenshots/s5-24-thread-panel.png
```

#### 5.25 — Send message in thread
```
PRECONDITION: Thread panel open (from 5.24)

ACTION:
  1. Locate the thread's message input (separate from main channel input):
     const threadInput = window.locator('textarea').last()
     OR: locate textarea within the thread panel
  2. threadInput.fill('Thread reply ' + Date.now())
  3. threadInput.press('Enter')
  4. await window.waitForTimeout(2000)
  5. Screenshot: qa-screenshots/s5-25-thread-reply.png

ASSERT:
  1. Thread reply appears in the thread panel
  2. Reply is NOT in the main channel message list (stays in thread)
  3. Thread input is cleared after sending

SCREENSHOT: qa-screenshots/s5-25-thread-reply.png
```

#### 5.26 — Thread badge/indicator on parent message
```
ACTION:
  1. Close the thread panel if open (click close/X button on thread panel)
  2. await window.waitForTimeout(1000)
  3. Look at the "Thread target" message in the main chat
  4. Screenshot: qa-screenshots/s5-26-thread-badge.png

ASSERT:
  1. Parent message "Thread target" has a thread indicator/badge
  2. Badge shows reply count (at least 1)
  3. Badge is clickable to reopen the thread

SCREENSHOT: qa-screenshots/s5-26-thread-badge.png
```

#### 5.27 — Click thread badge → reopens thread panel
```
ACTION:
  1. Click the thread badge/indicator on "Thread target" message
  2. await window.waitForTimeout(2000)
  3. Screenshot: qa-screenshots/s5-27-reopen-thread.png

ASSERT:
  1. Thread panel reopens
  2. Previous thread reply "Thread reply" is visible
  3. Thread input is available for more replies

SCREENSHOT: qa-screenshots/s5-27-reopen-thread.png
```

### Context Menu

#### 5.28 — Right-click message → context menu appears
```
ACTION:
  1. Send a test message:
     window.locator('textarea[placeholder*="Message"]').fill('Context menu test ' + Date.now())
     window.locator('textarea[placeholder*="Message"]').press('Enter')
     await window.waitForTimeout(2000)
  2. Right-click the message:
     await window.locator('text=Context menu test').last().click({ button: 'right' })
  3. await window.waitForTimeout(500)
  4. Screenshot: qa-screenshots/s5-28-context-menu.png

ASSERT:
  1. Context menu appears as a portal div with position: fixed and high z-index
  2. Menu contains expected items for own message:
     - window.locator('text=Copy Text').isVisible() === true
     - window.locator('text=Copy Message Link').isVisible() === true
     - window.locator('text=Reply').isVisible() === true
     - window.locator('text=Pin Message').isVisible() === true
     - window.locator('text=Edit Message').isVisible() === true
     - window.locator('text=Delete Message').isVisible() === true
  3. Menu positioned near the click location (not at 0,0)

SCREENSHOT: qa-screenshots/s5-28-context-menu.png
```

#### 5.29 — Context menu actions match permissions for own vs other messages
```
ACTION:
  1. Dismiss the previous context menu: window.locator('body').click()
     await window.waitForTimeout(500)
  2. If another user's message exists, right-click it:
     await otherUserMessage.click({ button: 'right' })
     await window.waitForTimeout(500)
  3. Screenshot: qa-screenshots/s5-29-context-permissions.png

ASSERT:
  1. Context menu for OTHER user's message:
     - "Copy Text" present (available for all messages)
     - "Reply" present (can reply to anyone)
     - "Edit Message" NOT present (cannot edit others' messages)
     - "Delete Message" may be present if qa_admin has mod/admin rights
  2. Document which items are available and which are restricted

NOTE: If no other user's message is available, document as SKIPPED
      and verify own-message context menu has all expected items.

SCREENSHOT: qa-screenshots/s5-29-context-permissions.png

CLEANUP:
  1. Dismiss context menu: window.locator('body').click()
```
