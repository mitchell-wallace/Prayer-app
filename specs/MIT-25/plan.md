# MIT-25 Architecture Remediation Plan

Goal: address the architecture findings in separate, reviewable commits while keeping the app functional at every step.

Commit 1: Extract domain and application services from `src/App.vue`
- Create a `src/domain/` module for request and note types plus validation helpers.
- Introduce a `src/app/requestsService.js` (or similar) to encapsulate CRUD + feed actions.
- Update `src/App.vue` to call service functions instead of owning business rules directly.

Commit 2: Introduce a centralized state store for requests and feed state
- Add a store (Pinia or lightweight custom store) to hold `requests`, `renderQueue`, and `currentIndex`.
- Move queue lifecycle (reset, loadMore, prune, remove) into the store.
- Keep UI components as thin, event-driven presenters.

Commit 3: Normalize storage schema and add schema versioning
- Split notes and prayer events into separate tables.
- Add a `schema_version` table and migrations to evolve data safely.
- Provide a migration path from the JSON blob columns to normalized tables.

Commit 4: Add an explicit settings service with validation
- Wrap `src/settings.js` in a service that exposes getters/setters and validation.
- Centralize localStorage read/write and theme application.
- Update components to use the service rather than direct mutation.

Commit 5: Add request factories and data validation
- Provide factory functions to build requests/notes with invariants enforced.
- Validate incoming records before persisting.
- Update DB writes to go through the factory/validator.

Commit 6: Add Playwright E2E tests for feed lifecycle and request actions
- Add UI-driven tests for navigation, request creation, notes, settings, and stats.
- Use data-testid attributes for stable selectors.
- Wire tests into CI to prevent regressions during refactors.

Notes
- Each commit should keep the app runnable and pass tests.
- Avoid cross-cutting refactors in a single commit; keep scope tight to the finding.
