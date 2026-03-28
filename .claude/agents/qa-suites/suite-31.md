# Suite 31 — Soundboard & Voice Sounds

## SETUP
- Launch Electron app via `_electron.launch()`
- Log in as qa_admin (qa-admin@local.test / QATest123!)
- Navigate to server view, join a voice channel
- Soundboard panel is inside the voice connection area (bottom of channel sidebar)

## TESTS

### 31.01 — Soundboard panel header visible and collapsed by default
```
ACTION:
  1. Ensure on server view and connected to a voice channel
  2. Locate the soundboard header:
     window.locator('button:has-text("Soundboard")')
  3. Screenshot the voice connection area

ASSERT:
  1. window.locator('button:has-text("Soundboard")').isVisible() === true
  2. The panel is collapsed by default — search input is NOT visible:
     window.locator('input[name="search-sounds"]').isVisible() === false
  3. Screenshot shows "Soundboard" header text
```

### 31.02 — Sound count badge shows in header when sounds exist
```
PRECONDITION: Server has at least one soundboard sound uploaded

ACTION:
  1. Locate the soundboard header button:
     window.locator('button:has-text("Soundboard")')
  2. Screenshot the header area

ASSERT:
  1. The header contains a count badge (rounded-full pill element):
     window.locator('button:has-text("Soundboard")').locator('span.rounded-full').isVisible() === true
  2. Badge text is a number > 0
```

### 31.03 — Clicking header expands the panel
```
ACTION:
  1. window.locator('button:has-text("Soundboard")').click()
  2. await window.waitForTimeout(300)
  3. Screenshot the expanded panel

ASSERT:
  1. Search input is now visible:
     window.locator('input[name="search-sounds"]').isVisible() === true
  2. Either sound cards are visible OR empty state "No sounds yet" text is visible:
     window.locator('text=No sounds yet').isVisible() === true
     OR window.locator('[title="Play locally (only you)"]').first().isVisible() === true
  3. Screenshot shows expanded soundboard content
```

### 31.04 — Clicking header again collapses the panel
```
PRECONDITION: Panel is expanded from 31.03

ACTION:
  1. window.locator('button:has-text("Soundboard")').click()
  2. await window.waitForTimeout(300)
  3. Screenshot

ASSERT:
  1. Search input is no longer visible:
     window.locator('input[name="search-sounds"]').isVisible() === false
  2. Sound grid is not visible
```

### 31.05 — Sound grid renders cards with emoji, name, and uploader
```
PRECONDITION: Panel expanded, server has at least one sound

ACTION:
  1. Expand panel if needed: window.locator('button:has-text("Soundboard")').click()
  2. Locate the sound grid: window.locator('.grid.grid-cols-3')
  3. Locate the first sound card: window.locator('.grid.grid-cols-3 > div').first()
  4. Screenshot the grid area

ASSERT:
  1. Grid is visible: window.locator('.grid.grid-cols-3').isVisible() === true
  2. At least one card is present: (await window.locator('.grid.grid-cols-3 > div').count()) >= 1
  3. First card has a name (text-[10px] truncate element with text content)
  4. First card shows an uploader name or "Unknown"
```

### 31.06 — Search input filters sounds by name
```
PRECONDITION: Panel expanded, multiple sounds exist

ACTION:
  1. Count initial sound cards:
     const before = await window.locator('.grid.grid-cols-3 > div').count()
  2. Type a search query that matches one sound:
     window.locator('input[name="search-sounds"]').fill('test-sound-name')
  3. await window.waitForTimeout(300)
  4. Screenshot

ASSERT:
  1. Sound card count changed — either fewer cards or "No sounds match" text visible
  2. If cards remain, each visible card name contains the search query
  3. Screenshot shows filtered results
```

### 31.07 — Search with no matches shows "No sounds match" message
```
PRECONDITION: Panel expanded, sounds exist

ACTION:
  1. window.locator('input[name="search-sounds"]').fill('zzz_nonexistent_xyx_999')
  2. await window.waitForTimeout(300)
  3. Screenshot

ASSERT:
  1. window.locator('text=No sounds match').isVisible() === true
  2. Sound grid has 0 children: (await window.locator('.grid.grid-cols-3 > div').count()) === 0
```

### 31.08 — Clearing search restores full sound list
```
PRECONDITION: Search has a non-matching query from 31.07

ACTION:
  1. window.locator('input[name="search-sounds"]').fill('')
  2. await window.waitForTimeout(300)
  3. Screenshot

ASSERT:
  1. "No sounds match" text is gone
  2. Sound cards are visible again: (await window.locator('.grid.grid-cols-3 > div').count()) >= 1
```

### 31.09 — Play locally button exists and is clickable
```
PRECONDITION: Panel expanded, at least one sound exists

ACTION:
  1. Locate the "Play locally" button on first card:
     window.locator('[title="Play locally (only you)"]').first()
  2. Click it:
     window.locator('[title="Play locally (only you)"]').first().click()
  3. await window.waitForTimeout(500)
  4. Screenshot

ASSERT:
  1. Button was visible and clickable (no error thrown)
  2. No error text appeared: window.locator('.text-red-400').isVisible() === false
  3. Screenshot captured (sound plays client-side, no visual indicator expected beyond playing state)
```

### 31.10 — Playing indicator activates on the sound card
```
PRECONDITION: Panel expanded, at least one sound exists

ACTION:
  1. Click play locally on first card:
     window.locator('[title="Play locally (only you)"]').first().click()
  2. Immediately screenshot (within the sound's duration_seconds):
     await window.waitForTimeout(100)
  3. Screenshot the grid

ASSERT:
  1. The first card gains the playing styling — look for accent-primary border:
     window.locator('.grid.grid-cols-3 > div').first().locator('.border-accent-primary').isVisible() === true
  2. After waiting longer than the sound duration, the indicator clears
```

### 31.11 — Play for everyone button exists and is clickable
```
PRECONDITION: Panel expanded, connected to voice, at least one sound exists

ACTION:
  1. Locate the "Play for everyone" button on first card:
     window.locator('[title="Play for everyone in voice"]').first()
  2. Click it:
     window.locator('[title="Play for everyone in voice"]').first().click()
  3. await window.waitForTimeout(500)
  4. Screenshot

ASSERT:
  1. Button was visible and clickable (no error thrown)
  2. No error text appeared: window.locator('.text-red-400').isVisible() === false
```

### 31.12 — Upload button visible when under per-user limit
```
PRECONDITION: Panel expanded, current user has fewer sounds than max_sounds_per_user

ACTION:
  1. Locate the "+ Add" button:
     window.locator('button:has-text("+ Add")')
  2. Screenshot

ASSERT:
  1. window.locator('button:has-text("+ Add")').isVisible() === true
  2. Upload count text is visible (format "X/Y sounds uploaded"):
     window.locator('text=/\\d+\\/\\d+ sounds uploaded/').isVisible() === true
```

### 31.13 — Uploaded sound count text shows correct format
```
PRECONDITION: Panel expanded, sounds exist

ACTION:
  1. Locate the counter text:
     window.locator('text=/\\d+\\/\\d+ sounds uploaded/')
  2. Screenshot

ASSERT:
  1. Counter text is visible and matches pattern "N/M sounds uploaded"
  2. First number (user sounds) <= second number (max per user)
```

### 31.14 — Delete button appears on hover for own sounds
```
PRECONDITION: Panel expanded, current user (qa_admin) has at least one uploaded sound

ACTION:
  1. Identify a sound card uploaded by qa_admin (uploader text shows "qa_admin")
  2. Hover over that card:
     window.locator('.grid.grid-cols-3 > div').filter({ hasText: 'qa_admin' }).first().hover()
  3. await window.waitForTimeout(300)
  4. Screenshot

ASSERT:
  1. A red delete button appears (bg-red-600 circle with "x"):
     window.locator('.grid.grid-cols-3 > div').filter({ hasText: 'qa_admin' }).first()
       .locator('button[title="Delete sound"]').isVisible() === true
```

### 31.15 — Custom voice sounds section visible in User Settings
```
ACTION:
  1. Open user settings (click avatar/gear in bottom-left, then navigate to Voice tab)
  2. Scroll to "Custom Join/Leave Sounds" section
  3. Screenshot

ASSERT:
  1. window.locator('text=Custom Join/Leave Sounds').isVisible() === true
  2. "Join Sound" row visible: window.locator('text=Join Sound').isVisible() === true
  3. "Leave Sound" row visible: window.locator('text=Leave Sound').isVisible() === true
  4. Each row has an Upload or Replace button
```

### 31.16 — Voice sounds rows show upload/preview/remove controls
```
PRECONDITION: In User Settings, Voice tab, Custom Join/Leave Sounds section visible

ACTION:
  1. Locate the Join Sound row:
     window.locator('text=Join Sound').locator('..')
  2. Locate the Leave Sound row:
     window.locator('text=Leave Sound').locator('..')
  3. Screenshot

ASSERT:
  1. Join Sound row has an upload/replace button:
     window.locator('.bg-bg-secondary').filter({ hasText: 'Join Sound' }).locator('button:has-text("Upload")').or(
       window.locator('.bg-bg-secondary').filter({ hasText: 'Join Sound' }).locator('button:has-text("Replace")')
     ).isVisible() === true
  2. Leave Sound row has an upload/replace button:
     window.locator('.bg-bg-secondary').filter({ hasText: 'Leave Sound' }).locator('button:has-text("Upload")').or(
       window.locator('.bg-bg-secondary').filter({ hasText: 'Leave Sound' }).locator('button:has-text("Replace")')
     ).isVisible() === true
  3. If a sound is set, "Preview" link and "Remove" button are visible
  4. If no sound is set, "No custom sound set (default will play)" text is visible
  5. Format note is visible: window.locator('text=Accepted formats: MP3, WAV, OGG').isVisible() === true
```
