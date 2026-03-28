# Suite 25 — Server Admin Parity

## SETUP
- App launched, logged in as qa_admin (must have admin privileges)
- On server view
- Navigate to Server Settings for admin-level tests
- At least one other member (qa_user) exists on the server

## TESTS

### Server Icon Upload

#### 25.01 — Upload area visible in Server Settings
```
ACTION:
  1. Open Server Settings (click server name → Server Settings, or gear icon)
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s25-01-server-settings.png' })

ASSERT:
  1. Server icon upload area is visible
  2. Upload button or clickable avatar area present
  3. Current server icon (or placeholder) displayed
```

#### 25.02 — Upload image → updates sidebar icon
```
ACTION:
  1. Click the server icon upload area
  2. Upload a valid image file (via file input or drag-and-drop)
  3. Wait 5 seconds for upload and processing
  4. window.screenshot({ path: 'qa-screenshots/s25-02-icon-uploaded.png' })

ASSERT:
  1. Server icon in settings preview updates to new image
  2. Server icon in the server list sidebar also updates
  3. No error toast or alert
```

#### 25.03 — Invalid file type → error message
```
ACTION:
  1. Attempt to upload a non-image file (e.g. .txt or .pdf) via the icon upload area
  2. Wait 3 seconds
  3. window.screenshot({ path: 'qa-screenshots/s25-03-invalid-upload.png' })

ASSERT:
  1. Error message appears indicating invalid file type
  2. Server icon does NOT change
  3. App does not crash
```

### MOTD & Timezone

#### 25.04 — Rich MOTD editor with preview toggle
```
ACTION:
  1. In Server Settings, find the MOTD (Message of the Day) section
  2. window.screenshot({ path: 'qa-screenshots/s25-04-motd-editor.png' })

ASSERT:
  1. MOTD text editor/textarea is visible
  2. Preview toggle or tab is available (switch between edit and preview)
  3. Click preview toggle:
  4. Preview renders formatted markdown content
  5. Toggle back to edit mode and content is preserved
```

#### 25.05 — Timezone Select (searchable dropdown)
```
ACTION:
  1. Find the timezone selection control in Server Settings
  2. Click the timezone Select component
  3. Wait 1 second
  4. window.screenshot({ path: 'qa-screenshots/s25-05-timezone-dropdown.png' })

ASSERT:
  1. Dropdown opens with timezone options
  2. Search/filter input is available (can type to filter)
  3. Type a timezone name (e.g. 'Eastern' or 'UTC')
  4. Filtered results appear matching the search
  5. Select a timezone and verify dropdown closes with selection shown
```

#### 25.06 — Time format SegmentedControl
```
ACTION:
  1. Find the time format control in Server Settings
  2. window.screenshot({ path: 'qa-screenshots/s25-06-time-format.png' })

ASSERT:
  1. SegmentedControl visible with time format options (e.g. 12h / 24h)
  2. One option is currently selected (active state)
  3. Click the other option
  4. Selection changes to the clicked option
  5. Visual indicator (highlight/fill) moves to new selection
```

### Roles

#### 25.07 — Role accordion with 5 permission categories
```
ACTION:
  1. Navigate to Roles section in Server Settings (or Admin sidebar → "Roles & Permissions")
  2. Select a role to edit (or create a new one)
  3. Wait 2 seconds
  4. window.screenshot({ path: 'qa-screenshots/s25-07-role-permissions.png' })

ASSERT:
  1. Permission accordion/sections visible with 5 categories:
     - General
     - Membership
     - Text
     - Voice
     - Advanced
  2. Each category is expandable/collapsible
  3. Clicking a category header expands it to show individual permissions
```

#### 25.08 — Permission tri-state SegmentedControl (Default/Allow/Deny)
```
PRECONDITION: Role permissions expanded from 25.07

ACTION:
  1. Expand one permission category (e.g. Text)
  2. Find a permission row with its SegmentedControl
  3. window.screenshot({ path: 'qa-screenshots/s25-08-tri-state.png' })

ASSERT:
  1. Each permission has a SegmentedControl with three states: Default, Allow, Deny
  2. One state is currently active per permission
  3. Click "Allow" on a permission → it becomes selected
  4. Click "Deny" → it becomes selected
  5. Click "Default" → it becomes selected
  6. Visual state clearly indicates which is active
```

#### 25.09 — Dangerous permissions highlighted red
```
ACTION:
  1. Expand the Advanced permission category
  2. Look for dangerous permissions (e.g. Administrator, Manage Server)
  3. window.screenshot({ path: 'qa-screenshots/s25-09-dangerous-perms.png' })

ASSERT:
  1. Dangerous permission rows have red highlighting or warning styling
  2. They are visually distinct from normal permissions
  3. May include a warning icon or tooltip about the danger
```

#### 25.10 — Drag reorder roles
```
ACTION:
  1. Navigate to the role list view
  2. Identify drag handles on role items
  3. Drag one role to a new position (use Playwright drag-and-drop API)
  4. Wait 2 seconds
  5. window.screenshot({ path: 'qa-screenshots/s25-10-role-reorder.png' })

ASSERT:
  1. Role order changed after drag
  2. New order persists (does not snap back)
  3. Visual feedback during drag (ghost element or highlight)
```

#### 25.11 — Role search/filter
```
ACTION:
  1. Look for a search input in the roles section
  2. Type a role name to filter
  3. Wait 1 second
  4. window.screenshot({ path: 'qa-screenshots/s25-11-role-search.png' })

ASSERT:
  1. Role list filters to show only matching roles
  2. Non-matching roles are hidden
  3. Clear search restores full list
```

#### 25.12 — Create, assign, and enforce a role
```
ACTION:
  1. Click "Create Role" or "+" button to add a new role
  2. Enter role name: "QA Test Role"
  3. Set a permission to Allow (e.g. Send Messages → Allow)
  4. Save the role
  5. Wait 3 seconds
  6. window.screenshot({ path: 'qa-screenshots/s25-12-role-created.png' })
  7. Assign the role to qa_user (via member management or role assignment UI)
  8. Wait 2 seconds
  9. window.screenshot({ path: 'qa-screenshots/s25-12-role-assigned.png' })

ASSERT:
  1. New role "QA Test Role" appears in the role list
  2. Role has the permissions that were set
  3. qa_user shows the assigned role in member list
  4. No error toasts during creation or assignment

CLEANUP:
  1. Remove the role from qa_user
  2. Delete "QA Test Role" if possible
```

### Channel Drag-and-Drop

#### 25.13 — Drag handles visible on channels
```
ACTION:
  1. Navigate to channel management in Server Settings
  2. window.screenshot({ path: 'qa-screenshots/s25-13-channel-drag-handles.png' })

ASSERT:
  1. Each channel entry has a drag handle (grip icon or drag indicator)
  2. Handles are visible on hover or always visible in edit mode
```

#### 25.14 — Drag channel to new position
```
ACTION:
  1. Drag a channel from one position to another using the drag handle
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s25-14-channel-moved.png' })

ASSERT:
  1. Channel is now in the new position
  2. Order change persists (saved to server)
  3. Visual feedback during drag operation
```

#### 25.15 — Drag category moves children channels
```
ACTION:
  1. Drag a category header to a new position
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s25-15-category-moved.png' })

ASSERT:
  1. Category moved to new position
  2. All channels within the category moved with it
  3. Channel grouping under the category is preserved

CLEANUP:
  1. Restore original channel/category order if possible
```

### Impersonation

#### 25.16 — Impersonate panel visible in admin
```
ACTION:
  1. Navigate to Admin area (look for "Impersonate User" in admin sidebar NavLinks)
  2. window.locator('text=Impersonate User').click()
  3. Wait 2 seconds
  4. window.screenshot({ path: 'qa-screenshots/s25-16-impersonate-panel.png' })

ASSERT:
  1. Impersonation panel/page is visible
  2. Member search input is available
```

#### 25.17 — Search member → Impersonate button appears
```
ACTION:
  1. Type 'qa_user' or 'qa' in the member search input
  2. Wait 2 seconds
  3. window.screenshot({ path: 'qa-screenshots/s25-17-impersonate-search.png' })

ASSERT:
  1. Search results show qa_user
  2. "Impersonate" button visible next to or on the search result
```

#### 25.18 — Click Impersonate → amber banner appears
```
ACTION:
  1. Click the "Impersonate" button for qa_user
  2. Wait 3 seconds
  3. window.screenshot({ path: 'qa-screenshots/s25-18-impersonation-active.png' })

ASSERT:
  1. Amber/yellow colored banner appears at the top of the app
  2. Banner contains text "Impersonating" (and the username)
  3. "Stop" button visible on the banner
```

#### 25.19 — UI reflects impersonated user's view
```
PRECONDITION: Impersonating qa_user from 25.18

ACTION:
  1. Check the user info area (bottom-left or profile area)
  2. window.screenshot({ path: 'qa-screenshots/s25-19-impersonated-view.png' })

ASSERT:
  1. Username shown in user info area reflects qa_user (not qa_admin)
  2. Permissions may be restricted to qa_user's level
  3. Amber banner still visible at top
```

#### 25.20 — Stop button ends impersonation
```
PRECONDITION: Currently impersonating from 25.18

ACTION:
  1. Click the "Stop" button on the amber impersonation banner
  2. Wait 3 seconds
  3. window.screenshot({ path: 'qa-screenshots/s25-20-impersonation-stopped.png' })

ASSERT:
  1. Amber banner is gone
  2. User info area shows qa_admin again (original admin user)
  3. Full admin privileges restored
  4. No error toasts
```

### Events

#### 25.21 — Create event
```
ACTION:
  1. Navigate to events section (server events or calendar area)
  2. Click "Create Event" or "+" button
  3. Fill in event details:
     - Title: "QA Test Event"
     - Description: "Automated test event"
     - Set a date/time
  4. Click Save/Create
  5. Wait 3 seconds
  6. window.screenshot({ path: 'qa-screenshots/s25-21-event-created.png' })

ASSERT:
  1. Event "QA Test Event" appears in the events list
  2. Event shows the correct title and date
  3. No error toast
```

#### 25.22 — Event details modal with Edit button
```
ACTION:
  1. Click on "QA Test Event" to open its details
  2. Wait 1 second
  3. window.screenshot({ path: 'qa-screenshots/s25-22-event-details.png' })

ASSERT:
  1. Event details modal/panel opens
  2. Shows event title, description, date/time
  3. "Edit" button visible (for admin)
```

#### 25.23 — Edit pre-fills modal with existing data
```
ACTION:
  1. Click "Edit" button on the event details
  2. Wait 1 second
  3. window.screenshot({ path: 'qa-screenshots/s25-23-event-edit.png' })

ASSERT:
  1. Edit form/modal opens
  2. Title field pre-filled with "QA Test Event"
  3. Description pre-filled with "Automated test event"
  4. Date/time pre-filled with the original values
```

#### 25.24 — Modify event and save
```
PRECONDITION: Edit modal open from 25.23

ACTION:
  1. Change title to "QA Test Event (Updated)"
  2. Change description to "Updated by QA suite"
  3. Click Save
  4. Wait 3 seconds
  5. window.screenshot({ path: 'qa-screenshots/s25-24-event-updated.png' })

ASSERT:
  1. Event list shows updated title "QA Test Event (Updated)"
  2. Opening details shows updated description
  3. No error toast
```

#### 25.25 — Delete event with confirmation
```
ACTION:
  1. Open "QA Test Event (Updated)" details
  2. Click "Delete" button
  3. Wait 1 second — confirmation dialog should appear
  4. window.screenshot({ path: 'qa-screenshots/s25-25-delete-confirm.png' })
  5. Confirm deletion (click "Delete" or "Confirm" in dialog)
  6. Wait 3 seconds
  7. window.screenshot({ path: 'qa-screenshots/s25-25-event-deleted.png' })

ASSERT:
  1. Confirmation dialog appeared before deletion
  2. After confirming, event is removed from the list
  3. "QA Test Event (Updated)" no longer appears
  4. No error toast
```

### Final Cleanup
```
Ensure impersonation is stopped.
Ensure we're logged in as qa_admin on server view.
Delete any test roles or events created during this suite.
Restore channel order if changed.
```
