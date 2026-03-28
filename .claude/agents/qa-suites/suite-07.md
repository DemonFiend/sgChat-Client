# Suite 7 — Friends, Blocking & User Search

## SETUP
- App launched, logged in as qa_admin
- Navigate to DM view: `window.locator('button:has-text("Messages")').click()`
- Wait for DM sidebar to load: `window.locator('text=All').waitFor()`
- Ensure on "All" tab by default

## TESTS

### User Search

#### 7.01 — Navigate to DM view and verify search input exists
```
ACTION:
  1. window.locator('button:has-text("Messages")').click()
  2. Wait 2 seconds for DM view to load
  3. Screenshot

ASSERT:
  1. DM sidebar tabs visible: window.locator('button:has-text("All")').isVisible() === true
  2. Search input visible: window.locator('input[name="search-dm-users"]').isVisible() === true
  3. Placeholder text: window.locator('input[name="search-dm-users"]').getAttribute('placeholder') === 'Search users...'
  4. All expected tabs present: "All", "Online", "Friends", "Pending", "Blocked", "Ignored", "History"
```

#### 7.02 — Search for existing user shows results with avatar/username/status
```
ACTION:
  1. window.locator('input[name="search-dm-users"]').fill('qa_user')
  2. Wait 3 seconds for search results to populate
  3. Screenshot the search results

ASSERT:
  1. "Search Results" header appears: window.locator('text=Search Results').isVisible() === true
  2. At least one result visible with the username "qa_user":
     window.locator('text=@qa_user').isVisible() === true
  3. Result has an avatar element (img or SVG fallback) in the result row
  4. Result shows an action button — either "Add" (not friends), "Friends" (already friends), or "Pending" (request sent)
  5. No loading spinner visible after results load

CLEANUP:
  1. window.locator('input[name="search-dm-users"]').clear()
```

#### 7.03 — Search for non-existent user shows "No users found"
```
ACTION:
  1. window.locator('input[name="search-dm-users"]').fill('zzz_nonexistent_user_12345')
  2. Wait 3 seconds for search to complete
  3. Screenshot

ASSERT:
  1. "No users found" message visible: window.locator('text=No users found').isVisible() === true
  2. No user result rows visible
  3. Loading spinner is gone

CLEANUP:
  1. window.locator('input[name="search-dm-users"]').clear()
```

#### 7.04 — Search with special characters does not crash
```
ACTION:
  1. window.locator('input[name="search-dm-users"]').fill('<script>alert(1)</script>')
  2. Wait 3 seconds
  3. Screenshot

ASSERT:
  1. No JavaScript alert dialog appeared
  2. Either "No users found" or empty results — NOT a crash
  3. App is still responsive: window.locator('input[name="search-dm-users"]').isVisible() === true
  4. No error boundary: window.locator('text=Something went wrong').isVisible() === false

CLEANUP:
  1. window.locator('input[name="search-dm-users"]').clear()
```

#### 7.05 — Search with fewer than 2 characters does NOT trigger search
```
ACTION:
  1. window.locator('input[name="search-dm-users"]').fill('a')
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. "Search Results" header is NOT visible: window.locator('text=Search Results').isVisible() === false
  2. Friend list or empty state still visible (not replaced by search results)

CLEANUP:
  1. window.locator('input[name="search-dm-users"]').clear()
```

#### 7.06 — Search for own username excludes self from results
```
ACTION:
  1. window.locator('input[name="search-dm-users"]').fill('qa_admin')
  2. Wait 3 seconds for search results
  3. Screenshot

ASSERT:
  1. "Search Results" header appears
  2. If results appear, none of them should be the current user:
     The result for "qa_admin" should NOT appear (filtered by `u.id !== currentUserId`)
  3. Either "No users found" or results that are NOT the current user

CLEANUP:
  1. window.locator('input[name="search-dm-users"]').clear()
```

### Friend Requests

#### 7.07 — Send friend request via search results
```
PRECONDITION: qa_admin and qa_user are NOT already friends. If they are, remove friendship first.

ACTION:
  1. window.locator('input[name="search-dm-users"]').fill('qa_user')
  2. Wait 3 seconds for results
  3. Locate the "Add" button next to qa_user result:
     window.locator('button:has-text("Add")').first().click()
  4. Wait 2 seconds
  5. Screenshot

ASSERT:
  1. "Add" button changes to "Pending" button after click:
     window.locator('button:has-text("Pending")').isVisible() === true
  2. No error alert visible
  3. Request is recorded — switch to Pending tab to verify

CLEANUP:
  1. window.locator('input[name="search-dm-users"]').clear()
```

#### 7.08 — Friend request appears in Pending tab (outgoing)
```
PRECONDITION: Friend request sent in 7.07

ACTION:
  1. window.locator('button:has-text("Pending")').click()
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. "Outgoing" section header visible: window.locator('text=Outgoing').isVisible() === true
  2. qa_user appears in outgoing requests: window.locator('text=@qa_user').isVisible() === true
  3. "Cancel" button visible next to the outgoing request:
     window.locator('button:has-text("Cancel")').isVisible() === true
```

#### 7.09 — Accept friend request (MULTI-USER — requires second Electron instance or manual verification)
```
NOTE: MULTI-USER — requires second Electron instance or manual verification.
To fully test, a second session logged in as qa_user must accept the request.

ACTION (sequential single-user approach):
  1. Log out of qa_admin: Settings → Log Out
  2. Log in as qa_user (qa-user@local.test / QATest123!)
  3. Navigate to DM view → Pending tab
  4. window.locator('button:has-text("Pending")').click()
  5. Wait 2 seconds
  6. Screenshot — verify incoming request from qa_admin
  7. Click accept button (checkmark icon) next to qa_admin's request:
     window.locator('[title="Accept"]').first().click()
  8. Wait 2 seconds
  9. Screenshot

ASSERT:
  1. Incoming request from qa_admin visible before accepting
  2. After accepting, request disappears from Pending
  3. qa_admin now appears in friends list (switch to "All" or "Friends" tab):
     window.locator('button:has-text("All")').click()
     window.locator('text=qa_admin').or(window.locator('text=qa-admin')).isVisible() === true

CLEANUP:
  1. Log out of qa_user
  2. Log back in as qa_admin
```

#### 7.10 — Reject friend request (MULTI-USER — requires second Electron instance or manual verification)
```
NOTE: MULTI-USER — requires second Electron instance or manual verification.

PRECONDITION: Send a new friend request from qa_admin to qa_user (if they are already friends, remove first)

ACTION (sequential single-user approach):
  1. As qa_admin, search for qa_user and send friend request
  2. Log out, log in as qa_user
  3. Navigate to DM view → Pending tab
  4. Click reject button (X icon) next to qa_admin's request:
     window.locator('[title="Reject"]').first().click()
  5. Wait 2 seconds
  6. Screenshot

ASSERT:
  1. Request disappears from Pending tab
  2. qa_admin does NOT appear in Friends list
  3. No error messages

CLEANUP:
  1. Log out of qa_user, log back in as qa_admin
```

#### 7.11 — Cancel outgoing friend request
```
PRECONDITION: qa_admin has a pending outgoing request to qa_user

ACTION:
  1. Navigate to DM view → Pending tab
  2. window.locator('button:has-text("Pending")').click()
  3. Wait 2 seconds
  4. Locate the "Cancel" button next to the outgoing request
  5. window.locator('button:has-text("Cancel")').first().click()
  6. Wait 2 seconds
  7. Screenshot

ASSERT:
  1. Outgoing request disappears
  2. If no other requests, "No pending requests" message appears:
     window.locator('text=No pending requests').isVisible() === true
```

#### 7.12 — Duplicate friend request does not crash
```
ACTION:
  1. window.locator('button:has-text("All")').click()
  2. window.locator('input[name="search-dm-users"]').fill('qa_user')
  3. Wait 3 seconds
  4. If "Add" button is visible, click it to send first request
  5. Wait 1 second
  6. If still possible, attempt to add again (the button should now say "Pending")
  7. Screenshot

ASSERT:
  1. Second attempt does not crash the app
  2. Button shows "Pending" — cannot double-send
  3. No unhandled error in console

CLEANUP:
  1. window.locator('input[name="search-dm-users"]').clear()
```

### Blocking

#### 7.13 — Block user via search results
```
PRECONDITION: qa_admin and qa_user are friends or have no relationship

ACTION:
  1. window.locator('button:has-text("All")').click()
  2. window.locator('input[name="search-dm-users"]').fill('qa_user')
  3. Wait 3 seconds
  4. Click the block button (ban icon) next to qa_user in search results:
     window.locator('[title="Block user"]').first().click()
  5. Wait 2 seconds
  6. Screenshot

ASSERT:
  1. qa_user's search result now shows "Blocked" button instead of "Add":
     window.locator('button:has-text("Blocked")').isVisible() === true
  2. If qa_user was a friend, they should no longer appear in the friends list

CLEANUP:
  1. window.locator('input[name="search-dm-users"]').clear()
```

#### 7.14 — Blocked user appears in Blocked tab
```
PRECONDITION: qa_user is blocked (from 7.13)

ACTION:
  1. window.locator('button:has-text("Blocked")').click()
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. "Blocked" header with count visible: window.locator('text=/Blocked — \\d+/').isVisible() === true
  2. qa_user appears in blocked list: window.locator('text=@qa_user').isVisible() === true
  3. "Unblock" button visible next to qa_user:
     window.locator('button:has-text("Unblock")').isVisible() === true
```

#### 7.15 — Cannot message blocked user (verify in DM chat panel)
```
PRECONDITION: qa_user is blocked

ACTION:
  1. If qa_user appears in the friend list (All tab), click to open DM
  2. If not, check if the chat panel shows a blocked state
  3. Screenshot the chat area

ASSERT:
  1. Chat panel indicates the user is blocked — either:
     a. Message input is disabled or shows blocked indicator
     b. A notice says the user is blocked
     c. The blocked user's friend entry is removed from sidebar
  2. Cannot send messages to blocked user
```

#### 7.16 — Unblock user restores ability to interact
```
PRECONDITION: qa_user is blocked

ACTION:
  1. window.locator('button:has-text("Blocked")').click()
  2. Wait 2 seconds
  3. window.locator('button:has-text("Unblock")').first().click()
  4. Wait 2 seconds
  5. Screenshot

ASSERT:
  1. qa_user disappears from blocked list
  2. Blocked count decreases
  3. If no other blocked users: "No blocked users" message visible:
     window.locator('text=No blocked users').isVisible() === true
  4. Switch to "All" tab and search for qa_user — they should show "Add" button again
     (not blocked, not friends since blocking removed friendship)
```

### Ignoring

#### 7.17 — Ignored tab shows empty state when no users ignored
```
ACTION:
  1. window.locator('button:has-text("Ignored")').click()
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. "Ignored" header with count visible: window.locator('text=/Ignored — \\d+/').isVisible() === true
  2. If count is 0: "No ignored users" message visible:
     window.locator('text=No ignored users').isVisible() === true
```

#### 7.18 — Unignore user from Ignored tab
```
PRECONDITION: At least one user is ignored. If none, this test requires server-side setup or a prior ignore action.

ACTION:
  1. window.locator('button:has-text("Ignored")').click()
  2. Wait 2 seconds
  3. If an ignored user exists, click "Unignore" next to them:
     window.locator('button:has-text("Unignore")').first().click()
  4. Wait 2 seconds
  5. Screenshot

ASSERT:
  1. User disappears from ignored list
  2. Ignored count decreases
  3. No error messages
```

### Friend Removal

#### 7.19 — Remove friend (MULTI-USER — requires second Electron instance or manual verification)
```
PRECONDITION: qa_admin and qa_user are friends

ACTION:
  1. Navigate to Friends tab: window.locator('button:has-text("Friends")').click()
  2. Wait 2 seconds
  3. Verify qa_user in friends list: window.locator('text=qa_user').isVisible() === true
  4. Screenshot: before removal
  5. Remove friend via the API or UI mechanism (right-click context menu or popover)
     — If UI provides a remove button, click it
     — Otherwise note: "friend removal UI not found — requires popover/context menu implementation"
  6. Wait 2 seconds
  7. Screenshot: after removal

ASSERT:
  1. qa_user no longer appears in Friends list
  2. Friends count decreases
  3. If no other friends: "No friends yet" message visible
```

#### 7.20 — Friend removal persists after page reload
```
PRECONDITION: Friend was removed in 7.19

ACTION:
  1. window.evaluate(() => location.reload())
  2. Wait for app to reload (up to 10 seconds)
  3. Navigate to DM view: window.locator('button:has-text("Messages")').click()
  4. window.locator('button:has-text("Friends")').click()
  5. Wait 2 seconds
  6. Screenshot

ASSERT:
  1. qa_user still NOT in friends list — removal was persistent
  2. App loaded successfully after reload
```

#### 7.21 — Can re-friend after removal
```
PRECONDITION: qa_admin and qa_user are NOT friends (removed in 7.19)

ACTION:
  1. window.locator('button:has-text("All")').click()
  2. window.locator('input[name="search-dm-users"]').fill('qa_user')
  3. Wait 3 seconds
  4. window.locator('button:has-text("Add")').first().click()
  5. Wait 2 seconds
  6. Screenshot

ASSERT:
  1. Friend request sent successfully — button changes to "Pending"
  2. No error about "already friends" or "cannot re-add"
  3. Request appears in Pending tab

CLEANUP:
  1. window.locator('input[name="search-dm-users"]').clear()
```

### Tab Navigation

#### 7.22 — All sidebar tabs render correctly
```
ACTION:
  1. Click each tab in sequence and screenshot:
     a. window.locator('button:has-text("All")').click() → Wait 1s → Screenshot
     b. window.locator('button:has-text("Online")').click() → Wait 1s → Screenshot
     c. window.locator('button:has-text("Friends")').click() → Wait 1s → Screenshot
     d. window.locator('button:has-text("Pending")').click() → Wait 1s → Screenshot
     e. window.locator('button:has-text("Blocked")').click() → Wait 1s → Screenshot
     f. window.locator('button:has-text("Ignored")').click() → Wait 1s → Screenshot
     g. window.locator('button:has-text("History")').click() → Wait 1s → Screenshot

ASSERT (for each tab):
  1. Tab button has active/selected styling (brand color background)
  2. Content area changes to reflect the selected tab
  3. No crash or blank content
  4. Each tab shows either a list of items or an appropriate empty state message

SPECIFIC EMPTY STATES:
  - Online: "No friends online"
  - Friends: "No friends yet" (if no friends)
  - Pending: "No pending requests" (if no requests)
  - Blocked: "No blocked users" (if no blocked users)
  - Ignored: "No ignored users" (if no ignored users)
  - History: "No admin actions recorded" (if no audit history)
```

#### 7.23 — Online tab filters to online friends only
```
ACTION:
  1. window.locator('button:has-text("Online")').click()
  2. Wait 2 seconds
  3. Screenshot

ASSERT:
  1. Header shows "Online" count: window.locator('text=/Online — \\d+/').isVisible() === true
  2. If online friends exist, they are listed with online/idle/dnd status indicators
  3. No offline friends visible in this tab
  4. If no online friends: "No friends online" message shown
```

### Final Cleanup
```
Ensure:
  1. Logged in as qa_admin
  2. qa_user is unblocked
  3. Navigate back to server view: window.locator('button:has-text("Server")').click()
```
