# Suite 11 — Server Settings

## SETUP
- App launched, logged in as qa_admin (admin role required)
- On server view with channels visible
- Navigate to admin: click "Admin" button in TitleBar dropdown

## TESTS

### General Settings

#### 11.01 — Open Server Settings modal via Admin dropdown
```
ACTION:
  1. window.locator('button:has-text("Admin")').click()
  2. Wait for dropdown menu to appear
  3. window.locator('[role="menuitem"]:has-text("Server Settings")').click()
  4. Wait 2 seconds for modal to load
  5. Screenshot: qa-screenshots/s11-01-server-settings-modal.png

ASSERT:
  1. Modal is visible: window.locator('[role="dialog"]').isVisible() === true
  2. Modal has a "General" tab or section visible
  3. Server name input field is visible
  4. Screenshot shows the Server Settings modal open
```

#### 11.02 — Change server name -> updates sidebar
```
PRECONDITION: Server Settings modal open on General tab

ACTION:
  1. Locate server name input: window.locator('input[name="name"], input[aria-label*="name" i]').first()
  2. Store original name: const origName = await nameInput.inputValue()
  3. nameInput.clear()
  4. nameInput.fill('QA Test Server Renamed')
  5. Click save: window.locator('button:has-text("Save")').click()
  6. Wait 3 seconds
  7. Screenshot: qa-screenshots/s11-02-server-name-changed.png

ASSERT:
  1. No error alert visible
  2. Server name in sidebar updated: window.locator('text=QA Test Server Renamed').isVisible() === true
  3. Screenshot confirms name change in sidebar

CLEANUP:
  1. Reopen Server Settings, change name back to original
  2. Save and confirm
```

#### 11.03 — Change server description -> saves
```
PRECONDITION: Server Settings modal open on General tab

ACTION:
  1. Locate description input: window.locator('textarea[name="description"], textarea[aria-label*="description" i]').first()
  2. descInput.clear()
  3. descInput.fill('QA automated test description - updated at ' + Date.now())
  4. window.locator('button:has-text("Save")').click()
  5. Wait 2 seconds
  6. Screenshot: qa-screenshots/s11-03-description-saved.png

ASSERT:
  1. No error alert visible
  2. Reopen Server Settings -> description field contains the new text
  3. Screenshot shows saved description
```

#### 11.04 — Upload server icon
```
PRECONDITION: Server Settings modal open on General tab

ACTION:
  1. Locate icon upload area: window.locator('[data-testid="server-icon-upload"], button:has-text("Upload Icon"), .mantine-FileButton, .mantine-Avatar').first()
  2. Screenshot before upload: qa-screenshots/s11-04a-icon-before.png
  3. If file input exists, set file via setInputFiles with a small valid PNG
  4. Wait 3 seconds for upload
  5. Screenshot after: qa-screenshots/s11-04b-icon-after.png

ASSERT:
  1. Icon area shows the uploaded image (or a preview)
  2. No error messages visible
  3. MANUAL VERIFICATION NEEDED: Confirm icon updated in server list sidebar

NOTE: File upload may require a real image file; skip if no test fixtures available
```

### Roles

#### 11.05 — Navigate to Roles tab and view existing roles
```
PRECONDITION: Server Settings modal open

ACTION:
  1. Click Roles tab: window.locator('button:has-text("Roles"), [role="tab"]:has-text("Roles")').click()
  2. Wait 2 seconds
  3. Screenshot: qa-screenshots/s11-05-roles-tab.png

ASSERT:
  1. Roles list is visible with at least one role (e.g., "Admin", "@everyone")
  2. Each role shows its name and color indicator
  3. Screenshot shows the roles panel
```

#### 11.06 — Create new role
```
PRECONDITION: On Roles tab in Server Settings

ACTION:
  1. window.locator('button:has-text("Create Role")').click()
  2. Wait for role creation form/inline editor
  3. window.locator('input[name="name"], input[placeholder*="Role name" i]').fill('QA Test Role')
  4. window.locator('button:has-text("Save")').click()
  5. Wait 2 seconds
  6. Screenshot: qa-screenshots/s11-06-role-created.png

ASSERT:
  1. New role "QA Test Role" appears in the roles list
  2. window.locator('text=QA Test Role').isVisible() === true
  3. No error messages
  4. Screenshot shows the new role in the list
```

#### 11.07 — Set role color -> visible on members
```
PRECONDITION: "QA Test Role" exists, Roles tab open

ACTION:
  1. Click "QA Test Role" in the roles list to select it
  2. Locate color picker or color input
  3. Set color value to #FF5733 (via input or color picker interaction)
  4. window.locator('button:has-text("Save")').click()
  5. Wait 2 seconds
  6. Screenshot: qa-screenshots/s11-07-role-color.png

ASSERT:
  1. Role color indicator shows the new color
  2. Save confirmation (no error)
  3. Screenshot shows the colored role
```

#### 11.08 — Set permissions on role
```
PRECONDITION: "QA Test Role" selected in Roles tab

ACTION:
  1. Locate permissions section (Accordion with permission categories)
  2. Expand a permission category (e.g., "General" or "Text")
  3. Find a permission SegmentedControl and switch it to "Allow"
  4. window.locator('button:has-text("Save")').click()
  5. Wait 2 seconds
  6. Screenshot: qa-screenshots/s11-08-role-permissions.png

ASSERT:
  1. Permission toggle shows "Allow" state
  2. Save succeeds without error
  3. Screenshot shows permission categories and toggle states
```

#### 11.09 — Assign role to member
```
PRECONDITION: "QA Test Role" exists

ACTION:
  1. Navigate to Members tab: window.locator('button:has-text("Members"), [role="tab"]:has-text("Members")').click()
  2. Wait for member list to load
  3. Find qa_user in the member list
  4. Click role assignment button or dropdown for qa_user
  5. Select "QA Test Role" from available roles
  6. Wait 2 seconds
  7. Screenshot: qa-screenshots/s11-09-role-assigned.png

ASSERT:
  1. qa_user now shows "QA Test Role" badge/tag
  2. Role color visible next to username if applicable
  3. Screenshot shows role assignment
```

#### 11.10 — Remove role from member
```
PRECONDITION: qa_user has "QA Test Role" assigned

ACTION:
  1. On Members tab, find qa_user
  2. Click to remove "QA Test Role" from qa_user
  3. Confirm removal if prompted
  4. Wait 2 seconds
  5. Screenshot: qa-screenshots/s11-10-role-removed.png

ASSERT:
  1. "QA Test Role" no longer shows on qa_user
  2. No error messages
  3. Screenshot confirms role removed
```

### Channels

#### 11.11 — Navigate to Channels tab
```
PRECONDITION: Server Settings modal open

ACTION:
  1. window.locator('button:has-text("Channels"), [role="tab"]:has-text("Channels")').click()
  2. Wait 2 seconds
  3. Screenshot: qa-screenshots/s11-11-channels-tab.png

ASSERT:
  1. Channel list visible with existing channels
  2. "Create Channel" button visible
  3. Categories and channels listed with drag handles
  4. Screenshot shows channel management panel
```

#### 11.12 — Create text channel -> appears in sidebar
```
PRECONDITION: On Channels tab in Server Settings

ACTION:
  1. window.locator('button:has-text("Create Channel")').click()
  2. Wait for channel creation form
  3. Select "Text" type if type selector exists
  4. window.locator('input[name="name"], input[placeholder*="channel-name" i]').fill('qa-test-channel')
  5. window.locator('button:has-text("Create"), button:has-text("Save")').click()
  6. Wait 3 seconds
  7. Screenshot: qa-screenshots/s11-12-text-channel-created.png

ASSERT:
  1. Channel "qa-test-channel" appears in channel list
  2. Close Server Settings modal
  3. Channel visible in sidebar: window.locator('text=qa-test-channel').isVisible() === true
  4. Screenshot shows new channel in sidebar
```

#### 11.13 — Create voice channel -> appears in sidebar
```
ACTION:
  1. Reopen Server Settings -> Channels tab
  2. window.locator('button:has-text("Create Channel")').click()
  3. Select "Voice" type in type selector
  4. window.locator('input[name="name"], input[placeholder*="channel-name" i]').fill('qa-voice-test')
  5. window.locator('button:has-text("Create"), button:has-text("Save")').click()
  6. Wait 3 seconds
  7. Screenshot: qa-screenshots/s11-13-voice-channel-created.png

ASSERT:
  1. Channel "qa-voice-test" appears in channel list
  2. Close modal -> channel visible in sidebar with voice icon
  3. Screenshot confirms voice channel in sidebar
```

#### 11.14 — Rename channel
```
PRECONDITION: "qa-test-channel" exists

ACTION:
  1. Open Server Settings -> Channels tab
  2. Click "qa-test-channel" to select it
  3. Locate name input and clear it
  4. Fill with 'qa-renamed-channel'
  5. window.locator('button:has-text("Save")').click()
  6. Wait 2 seconds
  7. Screenshot: qa-screenshots/s11-14-channel-renamed.png

ASSERT:
  1. Channel name updated in the list
  2. Close modal -> sidebar shows "qa-renamed-channel"
  3. Screenshot confirms rename
```

#### 11.15 — Delete channel with confirmation
```
PRECONDITION: "qa-renamed-channel" exists

ACTION:
  1. Open Server Settings -> Channels tab
  2. Select "qa-renamed-channel"
  3. Click delete button: window.locator('button:has-text("Delete")').click()
  4. Wait for confirmation dialog
  5. Screenshot before confirm: qa-screenshots/s11-15a-delete-confirm.png
  6. Confirm deletion: window.locator('button:has-text("Confirm"), button:has-text("Delete")').last().click()
  7. Wait 2 seconds
  8. Screenshot after: qa-screenshots/s11-15b-channel-deleted.png

ASSERT:
  1. Confirmation dialog appeared before deletion
  2. "qa-renamed-channel" no longer in channel list
  3. Close modal -> channel gone from sidebar
  4. Screenshot confirms deletion
```

#### 11.16 — Create category
```
ACTION:
  1. Open Server Settings -> Channels tab
  2. window.locator('button:has-text("Create Category")').click()
  3. window.locator('input[name="name"], input[placeholder*="category" i]').fill('QA Test Category')
  4. window.locator('button:has-text("Create"), button:has-text("Save")').click()
  5. Wait 2 seconds
  6. Screenshot: qa-screenshots/s11-16-category-created.png

ASSERT:
  1. "QA Test Category" appears as a category header in channel list
  2. Close modal -> category visible in sidebar
  3. Screenshot shows new category

CLEANUP:
  1. Delete "QA Test Category" and "qa-voice-test" to clean up
```

### Members

#### 11.17 — View member list with roles
```
PRECONDITION: Server Settings modal open

ACTION:
  1. window.locator('button:has-text("Members"), [role="tab"]:has-text("Members")').click()
  2. Wait 3 seconds for member list to populate
  3. Screenshot: qa-screenshots/s11-17-member-list.png

ASSERT:
  1. Member list shows at least qa_admin and qa_user
  2. Each member shows username and avatar
  3. Roles are visible as badges/tags next to member names
  4. Screenshot shows member list with role indicators
```

#### 11.18 — Kick member
```
PRECONDITION: On Members tab, qa_user visible

ACTION:
  1. Find qa_user in the list
  2. Click context menu or action button on qa_user
  3. Click "Kick": window.locator('button:has-text("Kick"), [role="menuitem"]:has-text("Kick")').click()
  4. Wait for confirmation dialog
  5. Screenshot: qa-screenshots/s11-18a-kick-confirm.png
  6. Confirm kick (or cancel to avoid removing the test user)

ASSERT:
  1. Kick confirmation dialog appeared with member name
  2. Dialog asks for reason (optional)
  3. Screenshot shows kick confirmation

NOTE: Cancel the kick to preserve qa_user for future tests.
      To fully test: kick, then re-invite qa_user afterward.
```

#### 11.19 — Ban member
```
PRECONDITION: On Members tab, qa_user visible

ACTION:
  1. Find qa_user in the list
  2. Click context menu or action button on qa_user
  3. Click "Ban": window.locator('button:has-text("Ban"), [role="menuitem"]:has-text("Ban")').click()
  4. Wait for confirmation dialog
  5. Screenshot: qa-screenshots/s11-19a-ban-confirm.png
  6. Cancel the ban to preserve the test user

ASSERT:
  1. Ban confirmation dialog appeared
  2. Dialog shows options (e.g., delete message history checkbox)
  3. Screenshot shows ban confirmation dialog

NOTE: Cancel the ban to preserve qa_user for remaining tests.
```

### Invites

#### 11.20 — Create invite link
```
PRECONDITION: Server Settings modal open

ACTION:
  1. Navigate to Invites tab: window.locator('button:has-text("Invites"), [role="tab"]:has-text("Invites")').click()
  2. Wait 2 seconds
  3. window.locator('button:has-text("Create Invite")').click()
  4. Wait 2 seconds
  5. Screenshot: qa-screenshots/s11-20-invite-created.png

ASSERT:
  1. Invite link/code is displayed
  2. Copy button exists for the invite link
  3. Invite shows creator (qa_admin) and creation time
  4. Screenshot shows the invite link
```

#### 11.21 — Set invite expiry
```
PRECONDITION: On Invites tab, create invite form or settings visible

ACTION:
  1. Click "Create Invite" or open invite options
  2. Look for expiry/duration selector
  3. Select a non-default expiry option (e.g., "1 hour", "1 day")
  4. Create the invite
  5. Wait 2 seconds
  6. Screenshot: qa-screenshots/s11-21-invite-expiry.png

ASSERT:
  1. Invite shows expiry time/duration
  2. Expiry is not "Never" (matches selected option)
  3. Screenshot shows invite with expiry
```

#### 11.22 — Revoke invite
```
PRECONDITION: At least one invite exists in the list

ACTION:
  1. Find an existing invite in the list
  2. Click revoke/delete button: window.locator('button:has-text("Revoke"), button:has-text("Delete")').first().click()
  3. Confirm if prompted
  4. Wait 2 seconds
  5. Screenshot: qa-screenshots/s11-22-invite-revoked.png

ASSERT:
  1. Invite is removed from the list (or marked as revoked)
  2. No error messages
  3. Screenshot confirms revocation
```

### Emoji

#### 11.23 — Upload custom emoji -> visible in picker
```
PRECONDITION: Server Settings modal open

ACTION:
  1. Navigate to Emoji tab: window.locator('button:has-text("Emoji"), [role="tab"]:has-text("Emoji")').click()
  2. Wait 2 seconds
  3. Locate upload area or "Upload Emoji" button
  4. Upload a small valid PNG image via file input
  5. Set emoji name to 'qa_test_emoji'
  6. window.locator('button:has-text("Upload"), button:has-text("Save")').click()
  7. Wait 3 seconds
  8. Screenshot: qa-screenshots/s11-23-emoji-uploaded.png

ASSERT:
  1. "qa_test_emoji" appears in the custom emoji list
  2. Emoji shows the uploaded image thumbnail
  3. Screenshot shows the uploaded emoji

NOTE: Requires a test image file. Skip if no fixtures available.
```

#### 11.24 — Delete custom emoji
```
PRECONDITION: "qa_test_emoji" exists

ACTION:
  1. On Emoji tab, find "qa_test_emoji"
  2. Click delete button next to the emoji
  3. Confirm deletion if prompted
  4. Wait 2 seconds
  5. Screenshot: qa-screenshots/s11-24-emoji-deleted.png

ASSERT:
  1. "qa_test_emoji" removed from the list
  2. No error messages
  3. Screenshot confirms deletion
```

### Audit Log

#### 11.25 — View audit log entries
```
PRECONDITION: Admin logged in

ACTION:
  1. Close Server Settings modal if open
  2. window.locator('button:has-text("Admin")').click()
  3. window.locator('[role="menuitem"]:has-text("Audit Log")').click()
  4. Wait 3 seconds for entries to load
  5. Screenshot: qa-screenshots/s11-25-audit-log.png

ASSERT:
  1. Audit log view is visible
  2. At least one entry exists (from previous test actions)
  3. Each entry shows: who (actor), what (action), when (timestamp)
  4. Entries are in reverse chronological order (newest first)
  5. Screenshot shows audit log with entries
```

#### 11.26 — Filter audit log by type
```
PRECONDITION: On Audit Log view

ACTION:
  1. Look for filter dropdown or tabs
  2. Select a specific action type filter (e.g., "Channel", "Role", "Member")
  3. Wait 2 seconds for filtered results
  4. Screenshot: qa-screenshots/s11-26-audit-log-filtered.png

ASSERT:
  1. Entries are filtered to show only the selected type
  2. Filtered count is less than or equal to total count
  3. All visible entries match the filter category
  4. Screenshot shows filtered audit log
```

#### 11.27 — Audit log entries show who/what/when
```
PRECONDITION: On Audit Log view, entries visible

ACTION:
  1. Examine the first (most recent) audit log entry
  2. Screenshot the entry detail: qa-screenshots/s11-27-audit-entry-detail.png

ASSERT:
  1. Entry shows actor username (who performed the action)
  2. Entry shows action description (what was done, e.g., "Created channel #qa-test-channel")
  3. Entry shows timestamp (when it happened)
  4. Timestamp is in a readable format (not raw epoch)
  5. Screenshot shows a clear audit log entry with all three fields
```

### Final Cleanup
```
1. Delete "QA Test Role" if it still exists
2. Ensure qa_user still has access (re-invite if kicked)
3. Close all modals
4. Return to server channel view for next suite
```
