# Suite 13 — Events System

## SETUP
- App launched, logged in as qa_admin (admin role for create/edit/delete)
- On server view with channels visible
- Events section accessible via admin sidebar or events button in channel header

## TESTS

### Navigation

#### 13.01 — Navigate to Events section
```
ACTION:
  1. Look for events navigation entry:
     - Option A: window.locator('button:has-text("Admin")').click() then
       window.locator('[role="menuitem"]:has-text("Events")').click()
     - Option B: window.locator('button[aria-label*="events" i], button:has-text("Events")').click()
  2. Wait 3 seconds for Events view to load
  3. Screenshot: qa-screenshots/s13-01-events-section.png

ASSERT:
  1. Events view is visible (events list, calendar, or empty state)
  2. "Create Event" button is visible for admin users
  3. No error messages or blank page
  4. Screenshot shows the events section
```

### Create Event

#### 13.02 — Create event -> form fields present
```
PRECONDITION: On Events section

ACTION:
  1. window.locator('button:has-text("Create Event")').click()
  2. Wait 2 seconds for form/modal to appear
  3. Screenshot: qa-screenshots/s13-02-create-event-form.png

ASSERT:
  1. Event creation form/modal is visible
  2. Title/name input: window.locator('input[name="title"], input[name="name"], input[placeholder*="title" i]').isVisible()
  3. Description field: window.locator('textarea[name="description"], [data-testid="event-description"]').isVisible()
  4. Date/time picker visible
  5. Save/Create button visible
  6. Screenshot shows the full event creation form
```

#### 13.03 — Fill and save event -> event created
```
PRECONDITION: Event creation form open (13.02)

ACTION:
  1. window.locator('input[name="title"], input[name="name"], input[placeholder*="title" i]').fill('QA Test Event')
  2. window.locator('textarea[name="description"], [data-testid="event-description"]').fill('Automated test event created by QA suite 13')
  3. Set date/time to a future date (interact with date picker controls):
     - Locate date input: window.locator('input[type="date"], input[name="date"], [data-testid="event-date"]').first()
     - Fill with tomorrow's date or use picker to select a future date
  4. Set time if separate field exists:
     - window.locator('input[type="time"], input[name="time"], [data-testid="event-time"]').fill('18:00')
  5. window.locator('button:has-text("Create"), button:has-text("Save")').click()
  6. Wait 3 seconds
  7. Screenshot: qa-screenshots/s13-03-event-created.png

ASSERT:
  1. Form/modal closes after save
  2. No error messages
  3. Event "QA Test Event" appears in the events list
  4. window.locator('text=QA Test Event').isVisible() === true
  5. Screenshot shows the new event in the list
```

### Event Display

#### 13.04 — Event appears in events list / calendar
```
PRECONDITION: "QA Test Event" created (13.03)

ACTION:
  1. Navigate to Events section if not already there
  2. Scroll through events list or calendar to find "QA Test Event"
  3. Screenshot: qa-screenshots/s13-04-event-in-list.png

ASSERT:
  1. "QA Test Event" is visible in the list/calendar view
  2. Event shows title: window.locator('text=QA Test Event').isVisible() === true
  3. Event shows scheduled date/time
  4. Event shows description (or a truncated preview)
  5. Screenshot shows the event in context
```

#### 13.05 — Event details view (time, description, attendees)
```
PRECONDITION: "QA Test Event" visible in events list

ACTION:
  1. Click on "QA Test Event" to open details: window.locator('text=QA Test Event').click()
  2. Wait 2 seconds for details to load
  3. Screenshot: qa-screenshots/s13-05-event-details.png

ASSERT:
  1. Event detail view/modal is visible
  2. Title shows "QA Test Event"
  3. Description shows "Automated test event created by QA suite 13"
  4. Date and time are displayed in a readable format
  5. Attendees/interested section is visible (may be empty initially)
  6. Screenshot shows full event details
```

### Edit Event

#### 13.06 — Edit event -> changes saved
```
PRECONDITION: Event details view open for "QA Test Event"

ACTION:
  1. Click edit button: window.locator('button:has-text("Edit"), button[aria-label*="edit" i]').click()
  2. Wait 2 seconds for edit form
  3. Screenshot before edit: qa-screenshots/s13-06a-edit-form.png
  4. Locate title input and clear it
  5. window.locator('input[name="title"], input[name="name"], input[placeholder*="title" i]').fill('QA Test Event - EDITED')
  6. window.locator('button:has-text("Save"), button:has-text("Update")').click()
  7. Wait 2 seconds
  8. Screenshot after edit: qa-screenshots/s13-06b-event-edited.png

ASSERT:
  1. Edit form pre-filled with existing event data (title says "Edit Event" in modal header)
  2. After save: form closes
  3. Event title updated: window.locator('text=QA Test Event - EDITED').isVisible() === true
  4. Old title gone: window.locator('text=QA Test Event').not(window.locator('text=QA Test Event - EDITED')).isHidden()
  5. Screenshot shows the updated event
```

### RSVP / Interested

#### 13.07 — RSVP / interested button
```
PRECONDITION: On event details for "QA Test Event - EDITED"

ACTION:
  1. Click on the event to open details if not already open
  2. Locate RSVP/Interested button: window.locator('button:has-text("Interested"), button:has-text("RSVP"), button:has-text("Going")').first()
  3. Screenshot before RSVP: qa-screenshots/s13-07a-before-rsvp.png
  4. Click the RSVP/Interested button
  5. Wait 2 seconds
  6. Screenshot after RSVP: qa-screenshots/s13-07b-after-rsvp.png

ASSERT:
  1. Button state changes after click (e.g., filled/highlighted, text changes to "Interested" or "Going")
  2. Attendee count increases by 1 (or qa_admin appears in attendees list)
  3. Button is now in "active" state visually
  4. Screenshots show the state change before and after RSVP
```

### Delete Event

#### 13.08 — Delete event
```
PRECONDITION: "QA Test Event - EDITED" exists

ACTION:
  1. Navigate to the event details
  2. Click delete button: window.locator('button:has-text("Delete"), button[aria-label*="delete" i]').click()
  3. Wait for confirmation dialog
  4. Screenshot: qa-screenshots/s13-08a-delete-confirm.png
  5. Confirm deletion: window.locator('button:has-text("Confirm"), button:has-text("Delete")').last().click()
  6. Wait 2 seconds
  7. Screenshot: qa-screenshots/s13-08b-event-deleted.png

ASSERT:
  1. Confirmation dialog appeared before deletion
  2. Event is removed from the events list
  3. window.locator('text=QA Test Event - EDITED').isHidden() === true
  4. Events section shows remaining events (or empty state)
  5. Screenshot confirms event is gone
```

### Edge Cases

#### 13.09 — Create event with no description
```
ACTION:
  1. window.locator('button:has-text("Create Event")').click()
  2. Wait for form
  3. window.locator('input[name="title"], input[name="name"], input[placeholder*="title" i]').fill('No Description Event')
  4. Leave description field empty
  5. Set a future date/time
  6. window.locator('button:has-text("Create"), button:has-text("Save")').click()
  7. Wait 2 seconds
  8. Screenshot: qa-screenshots/s13-09-no-description.png

ASSERT:
  1. Event creates successfully without a description
  2. "No Description Event" appears in events list
  3. Event details show no description (or "No description" placeholder)
  4. No validation error for empty description
  5. Screenshot shows the event without description

CLEANUP:
  1. Delete "No Description Event"
```

#### 13.10 — Create event with very long title
```
ACTION:
  1. window.locator('button:has-text("Create Event")').click()
  2. Wait for form
  3. const longTitle = 'A'.repeat(200) + ' Long Title Event'
  4. window.locator('input[name="title"], input[name="name"], input[placeholder*="title" i]').fill(longTitle)
  5. Set a future date/time
  6. window.locator('button:has-text("Create"), button:has-text("Save")').click()
  7. Wait 2 seconds
  8. Screenshot: qa-screenshots/s13-10-long-title.png

ASSERT:
  1. Either: event creates with truncated title (server enforces max length)
  2. Or: validation error shown for title too long
  3. Or: event creates with full title but UI handles overflow gracefully (text-overflow: ellipsis)
  4. No crash or layout breakage
  5. Screenshot shows how the long title is handled

CLEANUP:
  1. Delete the long title event if created
```

#### 13.11 — Past event display
```
NOTE: This test checks how past events are displayed.
      Creating a past event may require API manipulation or an event that has already passed.

ACTION:
  1. Navigate to Events section
  2. Look for any past events in the list (events with dates before today)
  3. If filter/tab for "Past Events" exists, click it
  4. Screenshot: qa-screenshots/s13-11-past-events.png

ASSERT:
  1. Past events are visually distinguished from upcoming events (dimmed, strikethrough, "Past" label)
  2. Or: past events are in a separate "Past" section/tab
  3. Past events are not editable (edit button hidden or disabled) — or are still editable by admin
  4. Screenshot shows past event styling vs upcoming events
```

### Final Cleanup
```
1. Delete any remaining test events (No Description Event, long title event)
2. Return to server channel view for next suite
```
