# MIT-25 Playwright E2E Test Spec

Purpose: protect core behaviors during refactors while the architecture is in flux.

Scope
- Use Playwright for browser-level E2E tests.
- Use data-testid attributes for stable selectors.
- Cover core navigation, request creation, notes, settings, and stats.

Environment
- Reset IndexedDB and localStorage between tests.
- Wait for card transition animations before asserting card changes.
- Run against the Vite dev server or preview build.

Scenarios

1) Next arrow advances
- Given a visible request card
- When the user presses the next arrow
- Then the card content changes

2) Back arrow goes backward
- Given a visible request card
- When the user presses the back arrow
- Then the card content returns to the previous card

3) Prayed advances the feed
- Given a visible request card
- When the user presses "Prayed"
- Then the card advances to the next request

4) Add note flow
- Given a visible request card
- When the user presses "Add note"
- Then the note editor appears
- When they enter text and press "Add note"
- Then the note is listed

5) Add request form behavior
- Given the add request textarea is focused
- Then priority and duration chips appear
- When a request is added
- Then chips disappear, placeholder reappears, and the new request appears after pressing next

6) Settings defaults apply
- Given the settings modal is opened
- When default priority and duration are changed
- Then a new request uses those defaults

7) Info counts reflect added requests
- Given the info modal is opened
- When a request is added
- Then the active count increases

8) Infinite navigation continues
- Given a visible request card
- When the user presses next 10+ times
- Then the card continues to change each time (no dead ends)

Acceptance
- Tests run via `npx playwright test`.
- Tests are stable against transition animations and run on CI.
