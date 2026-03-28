# Suite 14 — Search & Command Palette

## SETUP
- App launched, logged in as qa_admin
- On server view with messages in at least one channel
- Some existing messages to search against (from previous test suites)

## TESTS

### Open Search / Command Palette

#### 14.01 — Open command palette with Ctrl+K
```
ACTION:
  1. Ensure focus is on the main app window
  2. window.keyboard.press('Control+k')
  3. Wait 2 seconds for palette to appear
  4. Screenshot: qa-screenshots/s14-01-command-palette-open.png

ASSERT:
  1. Command palette/search overlay is visible
  2. Search input is focused: window.locator('input[placeholder*="Search" i]').isVisible() === true
  3. Input field is empty and ready for typing
  4. Palette has a backdrop/overlay behind it
  5. Screenshot shows the command palette open with search input
```

#### 14.02 — Open search via button click
```
PRECONDITION: Command palette is closed (press Escape first)

ACTION:
  1. window.keyboard.press('Escape')
  2. Wait 500ms
  3. Locate search button in the UI: window.locator('button[aria-label*="search" i], button:has-text("Search"), [data-testid="search-button"]').first()
  4. searchBtn.click()
  5. Wait 2 seconds
  6. Screenshot: qa-screenshots/s14-02-search-via-button.png

ASSERT:
  1. Command palette opens (same as 14.01)
  2. Search input is focused and ready
  3. Screenshot shows palette opened via button
```

### Search Queries

#### 14.03 — Type query -> results appear
```
PRECONDITION: Command palette is open

ACTION:
  1. Open palette if not open: window.keyboard.press('Control+k')
  2. Wait 1 second
  3. window.locator('input[placeholder*="Search" i]').fill('hello')
  4. Wait 3 seconds for results to populate (debounce + API call)
  5. Screenshot: qa-screenshots/s14-03-search-results.png

ASSERT:
  1. Results container is visible below the search input
  2. Results are populated (not empty loading state after 3 seconds)
  3. At least one section visible (e.g., "Messages", "Channels", "Members")
  4. Results visually list items with text previews
  5. Screenshot shows search results for "hello"
```

#### 14.04 — Results show messages matching query
```
PRECONDITION: Search results visible for a query (14.03)

ACTION:
  1. Open palette: window.keyboard.press('Control+k')
  2. window.locator('input[placeholder*="Search" i]').fill('test')
  3. Wait 3 seconds
  4. Look for message results section
  5. Screenshot: qa-screenshots/s14-04-message-results.png

ASSERT:
  1. Results section for messages is visible (heading like "Messages" or message icons)
  2. Each message result shows:
     - Message text preview containing "test" (highlighted or plain)
     - Author username
     - Channel name or context
  3. Results are clickable (cursor: pointer or interactive element)
  4. Screenshot shows message search results with previews
```

#### 14.05 — Click search result -> navigate to message
```
PRECONDITION: Search results visible with at least one message result

ACTION:
  1. Open palette: window.keyboard.press('Control+k')
  2. window.locator('input[placeholder*="Search" i]').fill('test')
  3. Wait 3 seconds for results
  4. Click the first message result: window.locator('[data-testid="search-result"], [class*="search-result"], [role="option"]').first().click()
  5. Wait 3 seconds for navigation
  6. Screenshot: qa-screenshots/s14-05-navigate-to-message.png

ASSERT:
  1. Command palette closes after clicking a result
  2. App navigates to the channel containing the message
  3. The target message is visible in the chat view (possibly highlighted/scrolled to)
  4. Channel name in header matches the channel of the search result
  5. Screenshot shows the navigated-to message in context
```

### Edge Cases

#### 14.06 — Search with special characters -> no errors
```
ACTION:
  1. window.keyboard.press('Control+k')
  2. Wait 1 second
  3. window.locator('input[placeholder*="Search" i]').fill('<script>alert("xss")</script>')
  4. Wait 3 seconds
  5. Screenshot: qa-screenshots/s14-06a-special-chars-xss.png
  6. Clear and try another special string:
  7. window.locator('input[placeholder*="Search" i]').fill('test & "quotes" <brackets> \'apostrophe\'')
  8. Wait 3 seconds
  9. Screenshot: qa-screenshots/s14-06b-special-chars-mixed.png
  10. Clear and try SQL injection:
  11. window.locator('input[placeholder*="Search" i]').fill("' OR 1=1 --")
  12. Wait 3 seconds
  13. Screenshot: qa-screenshots/s14-06c-special-chars-sql.png

ASSERT:
  1. No JavaScript alert dialogs appeared (XSS prevented)
  2. No app crash or error boundary shown
  3. Special characters rendered as literal text in the search input
  4. Either: empty results (no matches) or results displayed normally
  5. No console errors related to parsing/injection
  6. App remains responsive after each query
  7. Screenshots show graceful handling of all special inputs
```

#### 14.07 — Empty query -> appropriate empty state
```
ACTION:
  1. window.keyboard.press('Control+k')
  2. Wait 1 second
  3. Ensure search input is empty: window.locator('input[placeholder*="Search" i]').fill('')
  4. Wait 1 second
  5. Screenshot: qa-screenshots/s14-07-empty-query.png

ASSERT:
  1. No error message shown
  2. Either: no results section visible (blank slate)
  3. Or: helpful empty state (e.g., "Start typing to search", recent items, tips)
  4. Or: keyboard shortcuts / command hints shown
  5. Search input placeholder text is visible when empty
  6. Screenshot shows the empty query state
```

### Keyboard Shortcuts & Navigation

#### 14.08 — Command palette shows keyboard shortcuts / commands
```
PRECONDITION: Command palette open with empty query

ACTION:
  1. window.keyboard.press('Control+k')
  2. Wait 1 second
  3. Look for keyboard shortcut hints in the palette UI
  4. Screenshot: qa-screenshots/s14-08-shortcuts-shown.png

ASSERT:
  1. Palette shows at least some hints (e.g., "Esc to close", arrow key navigation)
  2. Or: command categories shown (Channels, Members, etc.)
  3. Or: recent items / quick actions shown
  4. The palette is not completely empty
  5. Screenshot shows available shortcuts or commands
```

#### 14.09 — Navigate results with arrow keys
```
PRECONDITION: Command palette open with search results visible

ACTION:
  1. window.keyboard.press('Control+k')
  2. window.locator('input[placeholder*="Search" i]').fill('test')
  3. Wait 3 seconds for results
  4. Screenshot before navigation: qa-screenshots/s14-09a-before-arrow.png
  5. window.keyboard.press('ArrowDown')
  6. Wait 500ms
  7. Screenshot after first down: qa-screenshots/s14-09b-first-down.png
  8. window.keyboard.press('ArrowDown')
  9. Wait 500ms
  10. Screenshot after second down: qa-screenshots/s14-09c-second-down.png
  11. window.keyboard.press('ArrowUp')
  12. Wait 500ms

ASSERT:
  1. First ArrowDown highlights/selects the first result item
  2. Second ArrowDown moves highlight to the second item
  3. ArrowUp moves highlight back up
  4. Highlighted item is visually distinct (background color, outline, or bold)
  5. Screenshots show different items highlighted at each step
```

#### 14.10 — Press Enter on highlighted result -> navigates
```
PRECONDITION: A result is highlighted via arrow keys (14.09)

ACTION:
  1. window.keyboard.press('Control+k')
  2. window.locator('input[placeholder*="Search" i]').fill('general')
  3. Wait 3 seconds
  4. window.keyboard.press('ArrowDown')
  5. Wait 500ms
  6. window.keyboard.press('Enter')
  7. Wait 3 seconds
  8. Screenshot: qa-screenshots/s14-10-enter-navigate.png

ASSERT:
  1. Command palette closes after Enter
  2. App navigates to the selected result (channel, message, or member)
  3. The correct destination is shown (e.g., navigated to #general channel)
  4. Screenshot shows the navigation result
```

#### 14.11 — Press Escape -> closes palette
```
ACTION:
  1. window.keyboard.press('Control+k')
  2. Wait 1 second
  3. Verify palette is open: window.locator('input[placeholder*="Search" i]').isVisible() === true
  4. window.keyboard.press('Escape')
  5. Wait 1 second
  6. Screenshot: qa-screenshots/s14-11-palette-closed.png

ASSERT:
  1. Command palette is no longer visible
  2. window.locator('input[placeholder*="Search" i]').isHidden() === true
  3. Overlay/backdrop is gone
  4. App content beneath is interactive again (not blocked by overlay)
  5. Screenshot shows the palette is closed and app is normal
```

### Search Filters

#### 14.12 — Search channels by name
```
ACTION:
  1. window.keyboard.press('Control+k')
  2. window.locator('input[placeholder*="Search" i]').fill('general')
  3. Wait 3 seconds
  4. Screenshot: qa-screenshots/s14-12-channel-search.png

ASSERT:
  1. Results include a "Channels" section
  2. At least one channel matching "general" is shown
  3. Channel results show channel name with # prefix or channel icon
  4. Screenshot shows channel search results
```

#### 14.13 — Search members by username
```
ACTION:
  1. window.keyboard.press('Control+k')
  2. window.locator('input[placeholder*="Search" i]').fill('qa_admin')
  3. Wait 3 seconds
  4. Screenshot: qa-screenshots/s14-13-member-search.png

ASSERT:
  1. Results include a "Members" section
  2. At least one member matching "qa_admin" is shown
  3. Member results show username and avatar
  4. Screenshot shows member search results
```

#### 14.14 — Filter by channel (if available)
```
NOTE: This test checks if search supports filtering by channel.
      The filter UI may be a dropdown, prefix syntax (e.g., "in:#general"), or separate control.

ACTION:
  1. window.keyboard.press('Control+k')
  2. Try prefix syntax: window.locator('input[placeholder*="Search" i]').fill('in:#general test')
  3. Wait 3 seconds
  4. Screenshot: qa-screenshots/s14-14a-filter-by-channel.png
  5. If no results, try alternate approach:
  6. Clear input, look for filter dropdown or "in:" helper
  7. Screenshot: qa-screenshots/s14-14b-filter-controls.png

ASSERT:
  1. Either: filtered results show only messages from #general
  2. Or: filter UI is available and functional
  3. Or: prefix syntax is not supported (document as finding, not failure)
  4. No errors from filter syntax
  5. Screenshot shows filter attempt results
```

#### 14.15 — Filter by user (if available)
```
ACTION:
  1. window.keyboard.press('Control+k')
  2. Try prefix syntax: window.locator('input[placeholder*="Search" i]').fill('from:qa_admin')
  3. Wait 3 seconds
  4. Screenshot: qa-screenshots/s14-15a-filter-by-user.png
  5. If no results, try alternate: window.locator('input[placeholder*="Search" i]').fill('@qa_admin')
  6. Wait 3 seconds
  7. Screenshot: qa-screenshots/s14-15b-filter-by-user-alt.png

ASSERT:
  1. Either: filtered results show only messages from qa_admin
  2. Or: user filter UI is available
  3. Or: prefix syntax is not supported (document as finding)
  4. No errors from filter syntax
  5. Screenshot shows filter attempt results
```

#### 14.16 — Filter by date (if available)
```
ACTION:
  1. window.keyboard.press('Control+k')
  2. Try prefix syntax: window.locator('input[placeholder*="Search" i]').fill('before:2026-03-28 test')
  3. Wait 3 seconds
  4. Screenshot: qa-screenshots/s14-16a-filter-by-date.png
  5. Try alternate: window.locator('input[placeholder*="Search" i]').fill('after:2026-03-01 test')
  6. Wait 3 seconds
  7. Screenshot: qa-screenshots/s14-16b-filter-by-date-alt.png

ASSERT:
  1. Either: filtered results respect date constraints
  2. Or: date filter UI controls are available
  3. Or: date filtering is not supported (document as finding)
  4. No errors from date syntax
  5. Screenshot shows date filter attempt results
```

### Rapid Input / Stress

#### 14.17 — Rapid typing does not crash (debounce works)
```
ACTION:
  1. window.keyboard.press('Control+k')
  2. Wait 1 second
  3. Type rapidly character by character:
     window.locator('input[placeholder*="Search" i]').pressSequentially('this is a rapid typing test', { delay: 50 })
  4. Wait 3 seconds for debounced search to complete
  5. Screenshot: qa-screenshots/s14-17-rapid-typing.png

ASSERT:
  1. No crash or error boundary
  2. App remains responsive
  3. Final search results show for the complete query (not intermediate states)
  4. No duplicate or overlapping result renders
  5. Screenshot shows clean results after rapid input
```

#### 14.18 — Close and reopen palette retains no stale state
```
ACTION:
  1. window.keyboard.press('Control+k')
  2. window.locator('input[placeholder*="Search" i]').fill('previous query')
  3. Wait 2 seconds
  4. window.keyboard.press('Escape')
  5. Wait 1 second
  6. window.keyboard.press('Control+k')
  7. Wait 1 second
  8. Screenshot: qa-screenshots/s14-18-reopen-clean.png

ASSERT:
  1. Search input is empty on reopen (previous query cleared)
  2. No stale results from previous search visible
  3. Palette is in fresh/initial state
  4. Screenshot shows clean palette on reopen
```

### Final Cleanup
```
1. Close command palette if open (Escape)
2. Ensure on server channel view for next suite
```
