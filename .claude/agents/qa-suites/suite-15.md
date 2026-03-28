# Suite 15 — Admin Features

## SETUP
- App launched, logged in as qa_admin (who has admin role)
- On server view with channels visible
- For multi-user tests (15.03): need a second Electron instance logged in as qa_user,
  OR use sequential approach (log out, log in as qa_user, verify, log back in as qa_admin)

## TESTS

### Admin Panel Access

#### 15.01 — Navigate to admin panel via server header
```
ACTION:
  1. Look for an admin button or gear icon in the server header area:
     window.locator('button[aria-label="Admin"]')
       .or(window.locator('button:has-text("Admin")'))
       .or(window.locator('button[aria-label="Server Settings"]'))
  2. Click the admin button
  3. Wait up to 5 seconds for admin panel to load
  4. Screenshot: qa-screenshots/s15-01-admin-panel.png

ASSERT:
  1. Admin panel/view is visible — at least one of:
     - window.locator('text=Server Settings').isVisible() === true
     - window.locator('text=Admin').isVisible() === true
     - window.locator('text=Overview').isVisible() === true
  2. A sidebar or tab navigation for admin sections is visible
  3. No error boundary or crash
```

#### 15.02 — Admin-only features visible to qa_admin
```
PRECONDITION: In admin panel (from 15.01)

ACTION:
  1. Screenshot the admin sidebar/navigation area
  2. Look for admin-specific sections:
     - window.locator('text=Members').isVisible()
     - window.locator('text=Roles').isVisible()
     - window.locator('text=Channels').isVisible()
     - window.locator('text=Audit Log').or(window.locator('text=Audit')).isVisible()
     - window.locator('text=Bans').or(window.locator('text=Moderation')).isVisible()
  3. Screenshot: qa-screenshots/s15-02-admin-sections.png

ASSERT:
  1. At least 3 admin sections/tabs are visible
  2. Each section is clickable (not disabled)
  3. The admin panel has real content, not empty placeholders
  4. Log which sections were found
```

#### 15.03 — Admin features NOT visible to qa_user (multi-user)
```
PRECONDITION: This is a multi-user test. Use sequential approach if needed.

ACTION:
  1. Log out of qa_admin:
     - Navigate to settings (user settings button or avatar menu)
     - Click Log Out
  2. Log in as qa_user:
     - window.locator('input[name="email"]').fill('qa-user@local.test')
     - window.locator('input[name="password"]').fill('QATest123!')
     - window.locator('button:has-text("Log In")').click()
     - Wait up to 15 seconds for main app to load
  3. Navigate to server view
  4. Look for admin button in server header:
     window.locator('button[aria-label="Admin"]')
       .or(window.locator('button:has-text("Admin")'))
       .or(window.locator('button[aria-label="Server Settings"]'))
  5. Screenshot: qa-screenshots/s15-03-no-admin-user.png

ASSERT:
  1. Admin button is NOT visible to qa_user
     OR admin button exists but clicking it shows "Access Denied" or similar error
  2. No admin panel sections are accessible
  3. Screenshot proves non-admin user lacks the admin entry point

CLEANUP:
  1. Log out of qa_user
  2. Log back in as qa_admin (qa-admin@local.test / QATest123!)
```

#### 15.04 — Non-admin URL manipulation blocked
```
PRECONDITION: Logged in as qa_user (from 15.03, before cleanup)

ACTION:
  1. Attempt direct URL navigation to admin route via evaluate:
     await window.evaluate(() => {
       window.history.pushState(null, '', '/admin');
     });
  2. Wait 3 seconds
  3. Screenshot: qa-screenshots/s15-04-url-blocked.png

ASSERT:
  1. Either: redirected away from admin route (back to channels or DM view)
  2. Or: admin route shows "Access Denied" / "Unauthorized" / empty state
  3. No admin content is rendered for non-admin user
  4. No crash or error boundary

CLEANUP:
  1. Log out qa_user, log back in as qa_admin if not done
```

### Admin Panel Functionality

#### 15.05 — Admin dashboard shows server stats
```
PRECONDITION: Logged in as qa_admin, in admin panel

ACTION:
  1. Navigate to admin panel (click admin button)
  2. Look for a dashboard or overview section:
     window.locator('text=Overview').or(window.locator('text=Dashboard')).click()
  3. Wait 3 seconds for stats to load
  4. Screenshot: qa-screenshots/s15-05-admin-stats.png

ASSERT:
  1. At least one stat/counter is visible (member count, channel count, message count)
  2. Stats show real numbers (not "0" for everything, not "undefined")
  3. Server name is displayed somewhere in the admin panel
  4. If no dashboard exists, log it as a missing feature
```

#### 15.06 — Admin Members panel lists members
```
PRECONDITION: In admin panel

ACTION:
  1. Click Members section:
     window.locator('text=Members').click()
  2. Wait 3 seconds for member list to load
  3. Screenshot: qa-screenshots/s15-06-admin-members.png

ASSERT:
  1. Member list is visible with at least one member
  2. qa_admin appears in the member list
  3. Each member entry shows at least: username and role/badge
  4. Member actions are available (e.g., kick, ban, role assignment buttons)
```

#### 15.07 — Admin Roles panel shows roles
```
PRECONDITION: In admin panel

ACTION:
  1. Click Roles section:
     window.locator('text=Roles').click()
  2. Wait 3 seconds for roles to load
  3. Screenshot: qa-screenshots/s15-07-admin-roles.png

ASSERT:
  1. At least one role is listed (e.g., "Admin", "Member", "@everyone")
  2. Role entries show role name and possibly color
  3. Role editing or creation controls are visible (edit button, create button)
  4. If no roles panel exists, log it as missing feature
```

#### 15.08 — Admin Channels panel shows channels
```
PRECONDITION: In admin panel

ACTION:
  1. Click Channels section:
     window.locator('text=Channels').click()
  2. Wait 3 seconds
  3. Screenshot: qa-screenshots/s15-08-admin-channels.png

ASSERT:
  1. Channel list shows at least one channel (e.g., "general")
  2. Channel management actions visible (create, edit, delete)
  3. Channel entries show channel name and type (text/voice)
```

#### 15.09 — Admin Audit Log shows recent actions
```
PRECONDITION: In admin panel

ACTION:
  1. Click Audit Log section:
     window.locator('text=Audit Log').or(window.locator('text=Audit')).click()
  2. Wait 5 seconds for audit entries to load
  3. Screenshot: qa-screenshots/s15-09-admin-audit.png

ASSERT:
  1. Audit log section is visible
  2. If entries exist: each shows timestamp, actor, and action description
  3. If empty: an empty state message is shown (not a blank void)
  4. Scroll works if many entries exist
  5. Log how many audit entries are visible
```

#### 15.10 — Admin action on self is handled
```
PRECONDITION: In admin panel, Members section

ACTION:
  1. Navigate to Members section
  2. Find qa_admin's own entry in the member list:
     window.locator('text=qa_admin').or(window.locator('text=qa-admin'))
  3. Try to perform an admin action on self (e.g., click kick or ban)
  4. Wait 3 seconds
  5. Screenshot: qa-screenshots/s15-10-admin-self-action.png

ASSERT:
  1. Either: self-actions are disabled/hidden (cannot kick yourself)
  2. Or: a warning/confirmation dialog appears preventing self-harm
  3. qa_admin is NOT removed from the server
  4. No crash or error boundary
```

### Final Cleanup
```
Ensure we're logged in as qa_admin and back on the main server view.
Close admin panel if still open.
```
