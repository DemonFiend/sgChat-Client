# Suite 36 — Server Settings Extended Tabs

## SETUP
- Launch Electron app via `_electron.launch()`
- Get first window: `electronApp.firstWindow()`
- Log in as qa_admin (admin permissions)
- Navigate to admin view: click the admin/settings gear, or navigate via the admin sidebar
- The admin view is `ServerAdminView.tsx` which has a sidebar with NavLink items

Key components (Electron client, Mantine-based):
- `src/renderer/pages/ServerAdminView.tsx` — Admin sidebar with sections: Roles, Members, Storage, Audit Log, Emojis, Role Reactions, Relay Servers, AFK Settings, Crash Reports
- `src/renderer/components/ui/server-settings/RoleReactionsPanel.tsx` — Role reaction groups: create, toggle, add mappings, delete
- `src/renderer/components/ui/server-settings/AFKSettingsPanel.tsx` — AFK channel Select + timeout Select + Save button
- `src/renderer/components/ui/server-settings/RelayServersPanel.tsx` — Relay list with status badges, create form, suspend/drain/delete actions
- `src/renderer/components/ui/server-settings/CrashReportsPanel.tsx` — Crash reports table + releases section
- `src/renderer/components/ui/server-settings/StorageDashboardPanel.tsx` — Storage categories with collapsible sections, limits, purge

Admin sidebar NavLink labels: "Back to Server", "Roles & Permissions", "Members", "Storage Dashboard", "Audit Log", "Emoji Packs", "Role Reactions", "Relay Servers", "AFK Settings", "Crash Reports"

## TESTS

### 36.01 — Navigate to admin view
```
ACTION:
  1. Open the admin/settings panel. Look for a gear icon or admin button:
     window.locator('button[aria-label*="Settings"], button[aria-label*="Admin"], [data-testid="admin-button"]').click()
     OR window.locator('text=Server Administration').waitFor({ timeout: 3000 })
     — The view may already be at admin if navigated in prior suites
  2. await window.waitForTimeout(1000)
  3. await window.screenshot({ path: 'qa-screenshots/s36-01-admin-view.png' })

ASSERT:
  1. Admin sidebar is visible with section labels:
     window.locator('text=Server Administration').isVisible() === true
  2. "Back to Server" link is visible:
     window.locator('text=Back to Server').isVisible() === true
  3. At least 5 admin section links visible in the sidebar
```

### 36.02 — Navigate to Role Reactions panel
```
ACTION:
  1. Click "Role Reactions" in the admin sidebar:
     window.locator('[class*="NavLink"]').filter({ hasText: 'Role Reactions' }).click()
  2. await window.waitForTimeout(1000)
  3. await window.screenshot({ path: 'qa-screenshots/s36-02-role-reactions.png' })

ASSERT:
  1. Role Reactions heading visible:
     window.locator('text=Role Reactions').first().isVisible() === true
  2. Description text visible:
     window.locator('text=Let members self-assign roles').isVisible() === true
  3. "Create Reaction Group" section visible:
     window.locator('text=Create Reaction Group').isVisible() === true
  4. Name input and Channel select visible in the create form:
     window.locator('input[placeholder*="Color Roles"], label:has-text("Name")').isVisible() === true
```

### 36.03 — Role Reactions: create group form validation
```
PRECONDITION: On Role Reactions panel

ACTION:
  1. Verify the Create button is disabled when fields are empty:
     const createBtn = window.locator('button:has-text("Create")').first()
  2. Fill in group name:
     window.locator('input[placeholder*="Color Roles"]').fill('Test Group')
  3. await window.screenshot({ path: 'qa-screenshots/s36-03-create-group-partial.png' })

ASSERT:
  1. Create button is disabled without channel selection:
     await expect(createBtn).toBeDisabled()
  2. Name input has the value "Test Group"
```

### 36.04 — Role Reactions: create group with channel
```
PRECONDITION: On Role Reactions panel, name filled

ACTION:
  1. Fill group name:
     window.locator('input[placeholder*="Color Roles"]').fill('QA Test Group')
  2. Click the channel Select to open dropdown:
     window.locator('label:has-text("Channel")').locator('..').locator('input, [role="combobox"]').click()
  3. Select the first available text channel:
     window.locator('[role="option"]').first().click()
  4. Click Create:
     window.locator('button:has-text("Create")').first().click()
  5. await window.waitForTimeout(2000)
  6. await window.screenshot({ path: 'qa-screenshots/s36-04-group-created.png' })

ASSERT:
  1. A new group appears in the groups list with name "QA Test Group":
     window.locator('text=QA Test Group').isVisible() === true
  2. The group shows an Active/Inactive badge:
     window.locator('[class*="Badge"]').filter({ hasText: /Active|Inactive/ }).isVisible() === true
  3. The create form inputs are cleared after success
```

### 36.05 — Role Reactions: expand group to see mappings
```
PRECONDITION: At least one role reaction group exists

ACTION:
  1. Click on the first group header to expand it:
     window.locator('[style*="cursor: pointer"]').filter({ hasText: /mappings/ }).first().click()
  2. await window.waitForTimeout(500)
  3. await window.screenshot({ path: 'qa-screenshots/s36-05-group-expanded.png' })

ASSERT:
  1. Expanded content is visible below the group header (mappings list or "No mappings yet"):
     window.locator('text=No mappings yet').isVisible() === true
     OR window.locator('[class*="Badge"]').filter({ hasText: /Role/ }).isVisible() === true
  2. "Add" button for adding a mapping is visible:
     window.locator('button:has-text("Add")').isVisible() === true
  3. Emoji input and Role select are visible:
     window.locator('input[placeholder*="emoji"], label:has-text("Emoji")').isVisible() === true
     window.locator('label:has-text("Role")').isVisible() === true
```

### 36.06 — Role Reactions: delete group
```
PRECONDITION: "QA Test Group" exists

ACTION:
  1. Locate the delete (trash) ActionIcon on the QA Test Group row:
     window.locator('button[class*="ActionIcon"][color*="red"], button[aria-label*="delete"]')
       .filter({ has: window.locator('svg') })
       .first().click()
  2. await window.waitForTimeout(1000)
  3. await window.screenshot({ path: 'qa-screenshots/s36-06-group-deleted.png' })

ASSERT:
  1. "QA Test Group" is no longer visible:
     await expect(window.locator('text=QA Test Group')).not.toBeVisible({ timeout: 3000 })
  2. No error messages visible
```

### 36.07 — Navigate to AFK Settings panel
```
ACTION:
  1. Click "AFK Settings" in the admin sidebar:
     window.locator('[class*="NavLink"]').filter({ hasText: 'AFK Settings' }).click()
  2. await window.waitForTimeout(1000)
  3. await window.screenshot({ path: 'qa-screenshots/s36-07-afk-settings.png' })

ASSERT:
  1. "AFK Settings" heading visible:
     window.locator('text=AFK Settings').first().isVisible() === true
  2. Description text about idle users visible:
     window.locator('text=AFK voice channel').or(window.locator('text=idle timeout')).isVisible() === true
  3. AFK Channel Select is visible:
     window.locator('label:has-text("AFK Channel")').isVisible() === true
  4. AFK Timeout Select is visible:
     window.locator('label:has-text("AFK Timeout")').isVisible() === true
  5. "Save Changes" button visible:
     window.locator('button:has-text("Save Changes")').isVisible() === true
```

### 36.08 — AFK Settings: change timeout and verify Save button enables
```
PRECONDITION: On AFK Settings panel

ACTION:
  1. Click the AFK Timeout select:
     window.locator('label:has-text("AFK Timeout")').locator('..').locator('input, [role="combobox"]').click()
  2. Select "15 minutes":
     window.locator('[role="option"]:has-text("15 minutes")').click()
  3. await window.waitForTimeout(300)
  4. await window.screenshot({ path: 'qa-screenshots/s36-08-afk-timeout-changed.png' })

ASSERT:
  1. The timeout selector shows "15 minutes"
  2. Save Changes button is enabled (has changes):
     await expect(window.locator('button:has-text("Save Changes")')).toBeEnabled()
```

### 36.09 — Navigate to Relay Servers panel
```
ACTION:
  1. Click "Relay Servers" in the admin sidebar:
     window.locator('[class*="NavLink"]').filter({ hasText: 'Relay Servers' }).click()
  2. await window.waitForTimeout(1000)
  3. await window.screenshot({ path: 'qa-screenshots/s36-09-relay-servers.png' })

ASSERT:
  1. "Relay Servers" heading visible:
     window.locator('text=Relay Servers').first().isVisible() === true
  2. Description text visible:
     window.locator('text=voice infrastructure').or(window.locator('text=relay servers')).isVisible() === true
  3. "Add Relay" button visible:
     window.locator('button:has-text("Add Relay")').isVisible() === true
  4. Either a relay list or "No relay servers configured" message:
     window.locator('text=No relay servers configured').isVisible() === true
     OR window.locator('[class*="Badge"]').filter({ hasText: /trusted|pending|offline/ }).isVisible() === true
```

### 36.10 — Relay Servers: open create form
```
PRECONDITION: On Relay Servers panel

ACTION:
  1. Click "Add Relay":
     window.locator('button:has-text("Add Relay")').click()
  2. await window.waitForTimeout(300)
  3. await window.screenshot({ path: 'qa-screenshots/s36-10-relay-create-form.png' })

ASSERT:
  1. Create form appears with "New Relay Server" heading:
     window.locator('text=New Relay Server').isVisible() === true
  2. Name input visible:
     window.locator('input[placeholder*="US East"], label:has-text("Name")').isVisible() === true
  3. Region select visible:
     window.locator('label:has-text("Region")').isVisible() === true
  4. Create and Cancel buttons visible:
     window.locator('button:has-text("Create")').isVisible() === true
     window.locator('button:has-text("Cancel")').isVisible() === true
```

### 36.11 — Relay Servers: relay list shows status and health badges
```
PRECONDITION: On Relay Servers panel with at least one relay (or verify empty state)

ACTION:
  1. await window.waitForTimeout(500)
  2. await window.screenshot({ path: 'qa-screenshots/s36-11-relay-list.png' })

ASSERT (if relays exist):
  1. Each relay shows a status badge (trusted/pending/suspended/draining/offline):
     window.locator('[class*="Badge"]').filter({ hasText: /trusted|pending|suspended|draining|offline/ }).first().isVisible() === true
  2. Each relay shows health badge (healthy/degraded/unreachable):
     window.locator('[class*="Badge"]').filter({ hasText: /healthy|degraded|unreachable/ }).first().isVisible() === true
  3. Region text visible (e.g. "Region: us-east"):
     window.locator('text=Region:').first().isVisible() === true
  4. Participants count visible:
     window.locator('text=Participants:').first().isVisible() === true

ASSERT (if empty):
  1. "No relay servers configured" message visible
```

### 36.12 — Navigate to Crash Reports panel
```
ACTION:
  1. Click "Crash Reports" in the admin sidebar:
     window.locator('[class*="NavLink"]').filter({ hasText: 'Crash Reports' }).click()
  2. await window.waitForTimeout(1000)
  3. await window.screenshot({ path: 'qa-screenshots/s36-12-crash-reports.png' })

ASSERT:
  1. "Crash Reports" heading visible:
     window.locator('text=Crash Reports').first().isVisible() === true
  2. Description text visible:
     window.locator('text=crash reports').or(window.locator('text=error logs')).isVisible() === true
  3. Either a table of reports or "No crash reports" empty state:
     window.locator('text=No crash reports').isVisible() === true
     OR window.locator('table, [class*="Table"]').isVisible() === true
```

### 36.13 — Crash Reports: table has correct columns
```
PRECONDITION: On Crash Reports panel

ACTION:
  1. await window.screenshot({ path: 'qa-screenshots/s36-13-crash-table.png' })

ASSERT (if crash reports exist):
  1. Table headers include Timestamp, Error, and Stack Trace:
     window.locator('th:has-text("Timestamp"), [role="columnheader"]:has-text("Timestamp")').isVisible() === true
     window.locator('th:has-text("Error"), [role="columnheader"]:has-text("Error")').isVisible() === true
  2. At least one row of data visible with a timestamp

ASSERT (if no crash reports):
  1. Paper/card with "No crash reports" italic text:
     window.locator('text=No crash reports').isVisible() === true
```

### 36.14 — Crash Reports: Releases section visible
```
PRECONDITION: On Crash Reports panel (which also shows Releases)

ACTION:
  1. Scroll down to the Releases section:
     window.locator('text=Releases').last().scrollIntoViewIfNeeded()
  2. await window.waitForTimeout(300)
  3. await window.screenshot({ path: 'qa-screenshots/s36-14-releases.png' })

ASSERT:
  1. "Releases" heading visible:
     window.locator('text=Releases').last().isVisible() === true
  2. Client version badge visible (shows "Client v..."):
     window.locator('[class*="Badge"]:has-text("Client v")').isVisible() === true
  3. Either release entries or "No release information available":
     window.locator('text=No release information available').isVisible() === true
     OR window.locator('text=/^v\\d+\\./')  .isVisible() === true
```

### 36.15 — Navigate to Storage Dashboard panel
```
ACTION:
  1. Click "Storage Dashboard" in the admin sidebar:
     window.locator('[class*="NavLink"]').filter({ hasText: 'Storage Dashboard' }).click()
  2. await window.waitForTimeout(2000)
  3. await window.screenshot({ path: 'qa-screenshots/s36-15-storage.png' })

ASSERT:
  1. "Storage Management" heading visible:
     window.locator('text=Storage Management').isVisible() === true
  2. "Total Storage Used" label visible:
     window.locator('text=Total Storage Used').isVisible() === true
  3. A byte value displayed (e.g. "X.X MB", "X.X GB", "X B"):
     window.locator('text=/\\d+(\\.\\d+)?\\s*(B|KB|MB|GB|TB)/').first().isVisible() === true
```

### 36.16 — Storage Dashboard: collapsible sections present
```
PRECONDITION: On Storage Dashboard panel

ACTION:
  1. await window.screenshot({ path: 'qa-screenshots/s36-16-storage-sections.png' })

ASSERT:
  1. "Channels" section visible:
     window.locator('text=Channels').first().isVisible() === true
  2. "Direct Messages" section visible:
     window.locator('text=Direct Messages').isVisible() === true
  3. "Stickers" section visible:
     window.locator('text=Stickers').isVisible() === true
  4. "Uploads & Media" section visible:
     window.locator('text=Uploads').isVisible() === true
  5. Each section has a badge showing its size (bytes):
     window.locator('[class*="Badge"]').filter({ hasText: /\d+(\.\d+)?\s*(B|KB|MB|GB)/ }).first().isVisible() === true
```

### 36.17 — Storage Dashboard: expand Channels section
```
PRECONDITION: On Storage Dashboard panel

ACTION:
  1. Click the "Channels" section header to expand/collapse:
     window.locator('[style*="cursor: pointer"]').filter({ hasText: 'Channels' }).first().click()
  2. await window.waitForTimeout(500)
  3. await window.screenshot({ path: 'qa-screenshots/s36-17-channels-expanded.png' })

ASSERT:
  1. Expanded content shows stat boxes for Total Size and Limit:
     window.locator('text=Total Size').first().isVisible() === true
  2. Message Storage and Attachment Storage sub-sections visible:
     window.locator('text=Message Storage').isVisible() === true
     window.locator('text=Attachment Storage').isVisible() === true
  3. "Purge Oldest" button visible:
     window.locator('button:has-text("Purge Oldest")').isVisible() === true
```

### 36.18 — Storage Dashboard: Retention Settings section
```
PRECONDITION: On Storage Dashboard panel

ACTION:
  1. Scroll down to Retention Settings:
     window.locator('text=Retention Settings').scrollIntoViewIfNeeded()
  2. await window.waitForTimeout(300)
  3. await window.screenshot({ path: 'qa-screenshots/s36-18-retention.png' })

ASSERT:
  1. "Retention Settings" heading visible:
     window.locator('text=Retention Settings').isVisible() === true
  2. "Default Channel Size Limit (MB)" NumberInput visible:
     window.locator('label:has-text("Default Channel Size Limit")').isVisible() === true
  3. "Warning Threshold (%)" NumberInput visible:
     window.locator('label:has-text("Warning Threshold")').isVisible() === true
  4. "Save Settings" button visible:
     window.locator('button:has-text("Save Settings")').isVisible() === true
```

### 36.19 — Storage Dashboard: Manual Cleanup section
```
PRECONDITION: On Storage Dashboard panel

ACTION:
  1. Scroll down to Manual Cleanup:
     window.locator('text=Manual Cleanup').scrollIntoViewIfNeeded()
  2. await window.waitForTimeout(300)
  3. await window.screenshot({ path: 'qa-screenshots/s36-19-cleanup.png' })

ASSERT:
  1. "Manual Cleanup" heading visible:
     window.locator('text=Manual Cleanup').isVisible() === true
  2. "Preview (Dry Run)" button visible:
     window.locator('button:has-text("Preview (Dry Run)")').isVisible() === true
  3. "Run Cleanup" button visible:
     window.locator('button:has-text("Run Cleanup")').isVisible() === true
```

### 36.20 — Back to Server navigation from admin view
```
ACTION:
  1. Click "Back to Server" in the admin sidebar:
     window.locator('text=Back to Server').click()
  2. await window.waitForTimeout(1000)
  3. await window.screenshot({ path: 'qa-screenshots/s36-20-back-to-server.png' })

ASSERT:
  1. Admin sidebar is no longer visible:
     await expect(window.locator('text=Server Administration')).not.toBeVisible()
  2. Server view is restored — channel list and chat area visible:
     window.locator('textarea[placeholder*="Message"], textarea').isVisible() === true
  3. Member list or channel sidebar is visible
```
