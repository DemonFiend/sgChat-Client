# Suite 6 — File Uploads & Attachments

## SETUP
- App launched and logged in as qa_admin (Suite 1 handles setup/login)
- On server view, "general" channel selected
- Message input visible: `textarea[placeholder*="Message"]`
- Create test fixture files before tests:
  ```
  // Create test files via Node.js in Playwright
  const fs = require('fs');
  const path = require('path');
  const fixtureDir = path.join(__dirname, 'qa-fixtures');
  fs.mkdirSync(fixtureDir, { recursive: true });

  // Small PNG (1x1 red pixel)
  const pngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==', 'base64');
  fs.writeFileSync(path.join(fixtureDir, 'test-image.png'), pngBuffer);

  // Text file
  fs.writeFileSync(path.join(fixtureDir, 'test-document.txt'), 'This is a test document for QA upload testing.');

  // Zero-byte file
  fs.writeFileSync(path.join(fixtureDir, 'empty-file.txt'), '');

  // Long filename
  fs.writeFileSync(path.join(fixtureDir, 'a'.repeat(200) + '.txt'), 'Long filename test content');

  // Large-ish text file (~100KB)
  fs.writeFileSync(path.join(fixtureDir, 'large-file.txt'), 'x'.repeat(100 * 1024));
  ```

## TESTS

### Upload via Button

#### 6.01 — Click upload/paperclip button → file input triggered
```
ACTION:
  1. Locate the upload/paperclip button near the message input:
     const uploadButton = window.locator('[aria-label*="upload"], [aria-label*="Upload"], [aria-label*="attach"], [aria-label*="Attach"]').or(window.locator('button >> svg').filter({ has: window.locator('[class*="paperclip"], [class*="plus"], [class*="attach"]') }))
  2. Verify the hidden file input exists:
     window.locator('input[type="file"]').isAttached() === true
  3. Screenshot before upload: qa-screenshots/s6-01-upload-button.png

ASSERT:
  1. Upload/paperclip button is visible near the message input area
  2. Hidden input[type="file"] exists in the DOM (even if not visible)
  3. Button is clickable and not disabled

SCREENSHOT: qa-screenshots/s6-01-upload-button.png
```

#### 6.02 — Select image file → preview appears before sending
```
ACTION:
  1. Set the file on the hidden input using Playwright's setInputFiles:
     await window.locator('input[type="file"]').setInputFiles('qa-fixtures/test-image.png')
  2. await window.waitForTimeout(2000)
  3. Screenshot: qa-screenshots/s6-02-image-preview.png

ASSERT:
  1. A preview/attachment area appears above or near the message input
  2. Preview shows the image thumbnail or filename "test-image.png"
  3. A remove/cancel button is available on the preview (X or trash icon)
  4. Message input is still accessible for adding text alongside the file

SCREENSHOT: qa-screenshots/s6-02-image-preview.png
```

#### 6.03 — Send image → image renders inline in chat
```
PRECONDITION: Image preview visible (from 6.02)

ACTION:
  1. Press Enter or click send to submit the message with attachment:
     window.locator('textarea[placeholder*="Message"]').press('Enter')
  2. await window.waitForTimeout(5000)  // allow upload time
  3. Screenshot: qa-screenshots/s6-03-image-sent.png

ASSERT:
  1. Image appears inline in the chat message area
  2. Image is rendered as an <img> element (not just a filename link)
  3. Image has reasonable dimensions (not overflowing the chat area)
  4. Upload preview area is cleared
  5. No error toast about upload failure

SCREENSHOT: qa-screenshots/s6-03-image-sent.png
```

#### 6.04 — Send non-image file → file card with name, size, download
```
ACTION:
  1. Attach a text file:
     await window.locator('input[type="file"]').setInputFiles('qa-fixtures/test-document.txt')
  2. await window.waitForTimeout(1000)
  3. Press Enter to send:
     window.locator('textarea[placeholder*="Message"]').press('Enter')
  4. await window.waitForTimeout(3000)
  5. Screenshot: qa-screenshots/s6-04-file-card.png

ASSERT:
  1. File attachment appears in chat as a file card (not raw content)
  2. File card shows filename "test-document.txt"
  3. File card shows file size (e.g. "46 B" or similar)
  4. File card has a download button or the card itself is clickable to download
  5. File is NOT rendered as inline text in the message body

SCREENSHOT: qa-screenshots/s6-04-file-card.png
```

### Drag and Drop

#### 6.05 — Drag and drop file into chat → upload preview
```
ACTION:
  1. Simulate drag and drop using Playwright's drag APIs:
     Create a DataTransfer with the test file:

     // Method: dispatch dragenter/dragover/drop events
     const filePath = 'qa-fixtures/test-image.png'

     // Use setInputFiles as the reliable Playwright approach:
     // If drag-drop has a dedicated drop zone, dispatch events to it
     // Otherwise, use the file input approach as fallback

     const dropZone = window.locator('[class*="drop"], [class*="chat"], main').first()
     await dropZone.dispatchEvent('dragenter', { dataTransfer: new DataTransfer() })
     await window.waitForTimeout(500)

  2. Observe if a drag-drop overlay appears
  3. Screenshot: qa-screenshots/s6-05-drag-drop.png

ASSERT:
  1. A visual drag-drop overlay/indicator appears when dragging over chat area
  2. OR: the drop zone highlights to indicate it accepts files
  3. If drag-drop is not implemented, document as NOT SUPPORTED and use file input instead

NOTE: Playwright's drag-and-drop simulation for file uploads is limited.
      If dispatchEvent doesn't trigger the upload UI, use setInputFiles as the
      reliable fallback and note that drag-drop was tested manually.

SCREENSHOT: qa-screenshots/s6-05-drag-drop.png
```

### Profile Avatar Upload

#### 6.06 — Navigate to Settings → Profile section
```
ACTION:
  1. window.locator('button:has-text("Settings")').click()
  2. await window.waitForTimeout(2000)
  3. Look for Profile section or tab:
     window.locator('text=Profile').first().click()
     OR: window.locator('button:has-text("Profile")').click()
  4. await window.waitForTimeout(1500)
  5. Screenshot: qa-screenshots/s6-06-profile-settings.png

ASSERT:
  1. Profile settings area is visible
  2. Current avatar is displayed (image or default placeholder)
  3. An upload/change avatar button or clickable avatar area exists

SCREENSHOT: qa-screenshots/s6-06-profile-settings.png
```

#### 6.07 — Upload avatar image → preview updates
```
ACTION:
  1. Locate avatar upload input or trigger:
     const avatarInput = window.locator('input[type="file"]').first()
     OR: click the avatar/change button to reveal file input
  2. Set the avatar file:
     await avatarInput.setInputFiles('qa-fixtures/test-image.png')
  3. await window.waitForTimeout(3000)
  4. Screenshot: qa-screenshots/s6-07-avatar-upload.png

ASSERT:
  1. Avatar preview updates to show the uploaded image
  2. A save/confirm button may appear
  3. No error about invalid file type or size
  4. If there's a save button, click it and verify the avatar persists

SCREENSHOT: qa-screenshots/s6-07-avatar-upload.png
```

#### 6.08 — Upload avatar with wrong file type → error or rejection
```
ACTION:
  1. Create a non-image file to test:
     Use the text file: qa-fixtures/test-document.txt
  2. Attempt to set it as avatar:
     await window.locator('input[type="file"]').first().setInputFiles('qa-fixtures/test-document.txt')
  3. await window.waitForTimeout(2000)
  4. Screenshot: qa-screenshots/s6-08-avatar-wrong-type.png

ASSERT:
  1. Either: file input rejects the file (accept attribute filters it)
  2. Or: error message shown about invalid file type
  3. Or: upload attempt fails with user-friendly error
  4. Avatar does NOT change to the text file
  5. Previous avatar is preserved

SCREENSHOT: qa-screenshots/s6-08-avatar-wrong-type.png
```

### Profile Banner Upload

#### 6.09 — Banner upload area visible in profile settings
```
ACTION:
  1. Ensure on profile settings page
  2. Look for banner upload area:
     Scroll if needed to find banner section
  3. Screenshot: qa-screenshots/s6-09-banner-area.png

ASSERT:
  1. Banner area exists (may be a large rectangular zone above avatar)
  2. Upload/change banner button or clickable area exists
  3. Current banner is displayed (or a default placeholder)

NOTE: If banner upload is not implemented yet, document as NOT AVAILABLE.

SCREENSHOT: qa-screenshots/s6-09-banner-area.png
```

#### 6.10 — Upload banner image → preview updates
```
ACTION:
  1. Locate banner file input:
     Look for a second input[type="file"] or a banner-specific upload trigger
  2. Set the banner file:
     await bannerInput.setInputFiles('qa-fixtures/test-image.png')
  3. await window.waitForTimeout(3000)
  4. Screenshot: qa-screenshots/s6-10-banner-upload.png

ASSERT:
  1. Banner preview updates to show the uploaded image
  2. Banner scales/crops appropriately to the banner dimensions
  3. No error about invalid file type or size

NOTE: If banner upload is not implemented, document as NOT AVAILABLE and SKIP.

SCREENSHOT: qa-screenshots/s6-10-banner-upload.png
```

### Server Icon & Banner (Admin)

#### 6.11 — Navigate to Admin → Server settings
```
PRECONDITION: qa_admin has admin permissions

ACTION:
  1. window.locator('button:has-text("Admin")').click()
  2. await window.waitForTimeout(2000)
  3. Look for server settings/appearance section:
     window.locator('text=Server Settings').or(window.locator('text=Appearance')).or(window.locator('text=Overview')).first().click()
  4. await window.waitForTimeout(1500)
  5. Screenshot: qa-screenshots/s6-11-admin-server-settings.png

ASSERT:
  1. Admin panel visible with server configuration options
  2. Server icon section visible with current icon or placeholder
  3. Server name field or server branding area accessible

SCREENSHOT: qa-screenshots/s6-11-admin-server-settings.png
```

#### 6.12 — Upload server icon → preview updates
```
ACTION:
  1. Locate server icon upload input:
     const iconInput = window.locator('input[type="file"]').first()
     OR: click the server icon change button
  2. Set the icon file:
     await iconInput.setInputFiles('qa-fixtures/test-image.png')
  3. await window.waitForTimeout(3000)
  4. Screenshot: qa-screenshots/s6-12-server-icon-upload.png

ASSERT:
  1. Server icon preview updates to show uploaded image
  2. Save/apply button may appear for confirming the change
  3. No error about file type or size
  4. If save button exists, click it and verify change persists

SCREENSHOT: qa-screenshots/s6-12-server-icon-upload.png
```

#### 6.13 — Upload server banner → preview updates
```
ACTION:
  1. Locate server banner upload section (may be below icon section)
  2. Find banner file input and set file:
     await bannerInput.setInputFiles('qa-fixtures/test-image.png')
  3. await window.waitForTimeout(3000)
  4. Screenshot: qa-screenshots/s6-13-server-banner-upload.png

ASSERT:
  1. Server banner preview updates
  2. Banner dimensions are appropriate (wide, not square)
  3. Save/apply available if needed

NOTE: If server banner upload is not implemented, document as NOT AVAILABLE and SKIP.

SCREENSHOT: qa-screenshots/s6-13-server-banner-upload.png
```

### Edge Cases

#### 6.14 — Zero-byte file upload → handled gracefully
```
ACTION:
  1. Navigate back to chat:
     window.locator('button:has-text("Server")').click()
     await window.waitForTimeout(2000)
  2. Attach the zero-byte file:
     await window.locator('input[type="file"]').setInputFiles('qa-fixtures/empty-file.txt')
  3. await window.waitForTimeout(1500)
  4. If preview appears, attempt to send:
     window.locator('textarea[placeholder*="Message"]').press('Enter')
     await window.waitForTimeout(3000)
  5. Screenshot: qa-screenshots/s6-14-zero-byte.png

ASSERT:
  1. App does NOT crash
  2. Either: file is rejected with a user-friendly error ("File is empty" or similar)
  3. Or: file upload preview shows the file with 0 B size
  4. Or: file is accepted and sent (zero-byte files may be valid)
  5. No unhandled exceptions or error boundaries

SCREENSHOT: qa-screenshots/s6-14-zero-byte.png
```

#### 6.15 — Long filename → truncated or handled without layout break
```
ACTION:
  1. Attach the long filename file:
     await window.locator('input[type="file"]').setInputFiles('qa-fixtures/' + 'a'.repeat(200) + '.txt')
  2. await window.waitForTimeout(1500)
  3. If preview appears, send it:
     window.locator('textarea[placeholder*="Message"]').press('Enter')
     await window.waitForTimeout(3000)
  4. Screenshot: qa-screenshots/s6-15-long-filename.png
  5. Check for horizontal overflow:
     const hasOverflow = await window.evaluate(() =>
       document.documentElement.scrollWidth > document.documentElement.clientWidth
     )

ASSERT:
  1. hasOverflow === false (no horizontal scrollbar)
  2. Filename is either truncated with ellipsis or wraps within the file card
  3. File card does not overflow the chat area
  4. Layout remains intact — sidebar, input, member list all still visible
  5. No crash or error boundary

SCREENSHOT: qa-screenshots/s6-15-long-filename.png
```

#### 6.16 — Large file upload → progress indicator or size limit error
```
ACTION:
  1. Attach the large file (~100KB):
     await window.locator('input[type="file"]').setInputFiles('qa-fixtures/large-file.txt')
  2. await window.waitForTimeout(1000)
  3. Send it:
     window.locator('textarea[placeholder*="Message"]').press('Enter')
  4. await window.waitForTimeout(5000)  // allow upload time
  5. Screenshot: qa-screenshots/s6-16-large-file.png

ASSERT:
  1. Either: upload succeeds and file card appears in chat with correct size (~100 KB)
  2. Or: progress indicator shown during upload (progress bar or spinner)
  3. Or: error about file size limit with clear message about max size allowed
  4. App remains functional after upload (no freeze)
  5. If there is a server file size limit, document the limit

SCREENSHOT: qa-screenshots/s6-16-large-file.png
```

#### 6.17 — Cancel file attachment before sending
```
ACTION:
  1. Attach a file:
     await window.locator('input[type="file"]').setInputFiles('qa-fixtures/test-image.png')
  2. await window.waitForTimeout(1500)
  3. Look for remove/cancel button on the attachment preview:
     const removeBtn = window.locator('[aria-label*="remove"], [aria-label*="Remove"], [aria-label*="cancel"], [aria-label*="Cancel"]').or(window.locator('button >> text=X').first())
  4. Click remove:
     await removeBtn.click()
  5. await window.waitForTimeout(1000)
  6. Screenshot: qa-screenshots/s6-17-cancel-attachment.png

ASSERT:
  1. Attachment preview is removed/cleared
  2. Message input area returns to normal state
  3. Pressing Enter now does NOT send the file (attachment was cancelled)
  4. No orphaned upload occurred

SCREENSHOT: qa-screenshots/s6-17-cancel-attachment.png
```

#### 6.18 — Upload image + text message together
```
ACTION:
  1. Attach an image:
     await window.locator('input[type="file"]').setInputFiles('qa-fixtures/test-image.png')
  2. await window.waitForTimeout(1000)
  3. Type a message alongside the attachment:
     window.locator('textarea[placeholder*="Message"]').fill('Image with caption ' + Date.now())
  4. Press Enter to send both:
     window.locator('textarea[placeholder*="Message"]').press('Enter')
  5. await window.waitForTimeout(5000)
  6. Screenshot: qa-screenshots/s6-18-image-with-text.png

ASSERT:
  1. Message appears in chat with BOTH the text and the image
  2. Text "Image with caption" is visible
  3. Image is rendered inline
  4. Both text and image are part of the same message (not two separate messages)
  5. Message input and attachment preview are cleared

SCREENSHOT: qa-screenshots/s6-18-image-with-text.png
```

### Final Cleanup
```
1. Navigate back to server view: window.locator('button:has-text("Server")').click()
2. Ensure app is in a clean state for subsequent suites
3. Delete fixture files if desired (optional — they're small)
```
