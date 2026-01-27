# Unit Test Plan: Stores, Services, and Repositories

## Objective

Expand unit test coverage for the data/business layers without over-testing a young codebase. This plan intentionally focuses on core/services/repositories/stores to keep the work chunk small; component/composable tests are deferred to a later milestone. Focus on:
1. **Layer boundary verification** - stores call services, services call repositories
2. **Critical business logic** - validation, state transitions, data transforms
3. **Edge cases** - error handling, boundary conditions

---

## Existing Coverage

| File | Coverage | Notes |
|------|----------|-------|
| `tests/db.test.ts` | `requestsRepository` | seed idempotency, save/getAll persistence |
| `tests/queueService.test.ts` | `queueAlgorithm` + `queueEngine` | cycle building, priority interleaving, config validation |

---

## 0. One-Time Setup

- Install testing utilities used by unit/integration tests (component/composable testing deferred in this plan):
  - `npm install -D @vue/test-utils @testing-library/dom`

---

## 1. Core Layer Tests (`src/core/`)

### 1.1 `requests.ts` - Validation & Transforms

**File:** `tests/core/requests.test.ts`

| Test Case | Function | Description |
|-----------|----------|-------------|
| validates required title | `validateCreatePayload` | Throws on empty/whitespace title |
| normalizes title whitespace | `validateCreatePayload` | Trims leading/trailing spaces |
| rejects invalid priority | `validateCreatePayload` | Throws for non-enum priority |
| rejects invalid duration | `validateCreatePayload` | Throws for non-enum duration |
| validates record fields | `validateRequestRecord` | Throws when id/title empty |
| validates record arrays | `validateRequestRecord` | Throws when prayedAt/notes not arrays |
| validates note entries | `validateRequestRecord` | Throws when note missing id/text/createdAt |
| normalizes/validates note text | `createNoteEntry` | Trims text and rejects empty values |
| creates record with computed expiry | `createRequestRecord` | Sets expiresAt via computeExpiry |
| creates record with active status | `createRequestRecord` | Default status is 'active' |
| adds prayer timestamp | `applyPrayer` | Appends now to prayedAt array |
| updates timestamp | `applyPrayer` | Sets updatedAt |
| recomputes expiry on update | `applyRequestUpdate` | Recomputes expiresAt from createdAt + duration |
| creates note entry | `applyAddNote` | Adds note with id/text/createdAt |
| edits note in place | `applyEditNote` | Updates matching note by id |
| removes note by id | `applyDeleteNote` | Filters out note with matching id |
| sets answered status | `applyAnswered` | Changes status to 'answered' |
| adds answer note | `applyAnswered` | Creates note with isAnswer=true |

### 1.2 `queueAlgorithm.ts` - Config-Aware Core Behavior

**File:** `tests/queueService.test.ts` (extend existing)

| Test Case | Function | Description |
|-----------|----------|-------------|
| rejects invalid config priorities | `createCycleState` | Throws when `priorityOrder` is missing/duplicate/invalid |
| rejects non-positive weights | `createCycleState` | Throws when priority or interleave weights <= 0 |
| respects max run length | `pickNextFromCycle` | Never returns more than `maxRunLength` of the same priority consecutively |
| respects interleave window intent | `pickNextFromCycle` | When scores are close, selection can vary across priorities (not fixed ordering) |
| honors priority order set | `createCycleState` | Bucket ordering respects configured `priorityOrder` (no missing priorities) |

---

## 2. Repository Tests (`src/repositories/`)

### 2.1 `requestsRepository.ts` - Additional Coverage

**File:** `tests/db.test.ts` (extend existing)

| Test Case | Function | Description |
|-----------|----------|-------------|
| removes request by id | `remove` | Verify request no longer in getAll after remove |

### 2.2 `settingsRepository.ts` - localStorage Handling

**File:** `tests/repositories/settingsRepository.test.ts`

| Test Case | Function | Description |
|-----------|----------|-------------|
| returns defaults when localStorage empty | `load` | No stored value returns defaults |
| returns defaults on invalid JSON | `load` | Malformed JSON falls back to defaults |
| validates stored theme | `load` | Invalid theme value falls back to default |
| validates stored priority | `load` | Invalid priority falls back to default |
| validates stored duration | `load` | Invalid duration falls back to default |
| saves settings to localStorage | `save` | JSON.stringify written to key |
| handles save failure gracefully | `save` | QuotaExceeded doesn't throw |

---

## 3. Service Tests (`src/services/`)

### 3.1 `requestsService.ts` - Orchestration

**File:** `tests/services/requestsService.test.ts`

Mock dependencies: `requestsRepository`, `dateTimeService`, `uuidService`

| Test Case | Function | Description |
|-----------|----------|-------------|
| seeds and returns all requests | `initRequests` | Calls seed(), then getAll() |
| creates and persists request | `createRequest` | Creates record, validates, saves |
| records prayer with timestamp | `recordPrayer` | Applies prayer, validates, saves |
| updates request with new expiry | `updateRequest` | Applies update, validates, saves |
| adds note to request | `addNote` | Applies note, validates, saves |
| edits existing note | `editNote` | Applies edit, validates, saves |
| deletes note from request | `deleteNote` | Applies delete, validates, saves |
| marks request answered | `markAnswered` | Applies answered, validates, saves |
| deletes request by id | `deleteRequest` | Calls repository.remove |

### 3.2 `settingsService.ts` - Validation Guards

**File:** `tests/services/settingsService.test.ts`

| Test Case | Function | Description |
|-----------|----------|-------------|
| accepts valid theme values | `isValidTheme` | Returns true for 'light'/'dark'/'system' |
| rejects invalid theme | `isValidTheme` | Returns false for arbitrary strings |
| accepts valid priority values | `isValidPriority` | Returns true for all Priority enum values |
| rejects invalid priority | `isValidPriority` | Returns false for arbitrary strings |
| accepts valid duration values | `isValidDuration` | Returns true for all DurationPreset values |
| rejects invalid duration | `isValidDuration` | Returns false for arbitrary strings |
| delegates load to repository | `loadSettings` | Calls repository.load |
| delegates save to repository | `saveSettings` | Calls repository.save |

### 3.3 `queueEngine.ts` - State Management (extend existing)

**File:** `tests/queueService.test.ts` (extend existing)

| Test Case | Function | Description |
|-----------|----------|-------------|
| getCurrentItem returns null for empty queue | `getCurrentItem` | Empty state returns null |
| getCurrentItem returns item at currentIndex | `getCurrentItem` | Returns correct QueueItem |
| canGoPrevious false at index 0 | `canGoPrevious` | Start of queue |
| canGoPrevious true after navigation | `canGoPrevious` | After moving forward |
| canGoNext false with single item | `canGoNext` | Single-item queue |
| canGoNext true with multiple items | `canGoNext` | Multi-item queue |
| buildProgressDots returns 7 dots | `buildProgressDots` | Always 7 slots (1 + 5 + 1) |
| buildProgressDots marks current correctly | `buildProgressDots` | isCurrent on right slot |
| previousCard decrements index | `previousCard` | Index goes down by 1 |
| previousCard stops at 0 | `previousCard` | Doesn't go negative |
| nextCard increments index | `nextCard` | Index goes up by 1 |
| nextCard loads more near end | `nextCard` | Triggers loadMore at threshold |
| navigateToIndex jumps directly | `navigateToIndex` | Sets currentIndex exactly |
| removeRequestFromQueue filters all instances | `removeRequestFromQueue` | Removes from entire queue |
| removeRequestFromQueue adjusts currentIndex | `removeRequestFromQueue` | Index updated correctly |
| insertRequest places after current | `insertRequest` | Inserted at currentIndex + 1 |
| insertRequest handles empty queue | `insertRequest` | Sets as first item |

### 3.4 `dateTimeService.ts` / `uuidService.ts` - Minimal Wrappers

These are trivial wrappers around `Date.now()` and `crypto.randomUUID()`. Testing them provides minimal value and would test platform APIs. **Skip unit tests** - they exist for dependency injection in higher-level tests.

---

## 4. Store Tests (`src/stores/`)

### 4.1 `requestsStore.ts` - Layer Boundary

**File:** `tests/stores/requestsStore.test.ts`

Mock dependencies: `requestsService`, `queueEngine`

| Test Case | Function | Verification |
|-----------|----------|--------------|
| init calls service.initRequests | `init` | Layer boundary: calls service, not repository |
| createRequest calls service.createRequest | `createRequest` | Delegates to service |
| recordPrayer calls service.recordPrayer | `recordPrayer` | Delegates to service |
| updateRequest calls service.updateRequest | `updateRequest` | Delegates to service |
| addNote calls service.addNote | `addNote` | Delegates to service |
| editNote calls service.editNote | `editNote` | Delegates to service |
| deleteNote calls service.deleteNote | `deleteNote` | Delegates to service |
| deleteRequest calls service.deleteRequest | `deleteRequest` | Delegates to service |
| markAnswered calls service.markAnswered | `markAnswered` | Delegates to service |
| activeRequests filters by status+expiry | computed | Pure logic test |
| answeredRequests filters by status | computed | Pure logic test |
| deleteRequest updates queue state | `deleteRequest` | Removes from queue + resets feed if empty |
| markAnswered updates queue state | `markAnswered` | Removes from queue + triggers loadMore when near end |
| createRequest inserts into queue | `createRequest` | Inserted right after current item |

### 4.2 `settings.ts` - Layer Boundary

**File:** `tests/stores/settings.test.ts`

Mock dependencies: `settingsService`

| Test Case | Function | Verification |
|-----------|----------|--------------|
| initializes from service.loadSettings | module load | Layer boundary |
| setTheme validates via service | `setTheme` | Calls isValidTheme |
| setTheme ignores invalid value | `setTheme` | Doesn't update if invalid |
| setDefaultPriority validates via service | `setDefaultPriority` | Calls isValidPriority |
| setDefaultDuration validates via service | `setDefaultDuration` | Calls isValidDuration |
| resetSettings sets known defaults | `resetSettings` | Values match expected defaults |
| initThemeWatcher sets root theme | `initThemeWatcher` | Updates `data-theme` on document root |
| initThemeWatcher reacts to system theme change | `initThemeWatcher` | Applies system theme on `matchMedia` change |

---

## 5. Test Utilities

### 5.1 Shared Fixtures

**File:** `tests/fixtures/requests.ts`

```typescript
// Factory for creating test PrayerRequest objects
export function makeRequest(overrides?: Partial<PrayerRequest>): PrayerRequest

// Factory for creating test Note objects
export function makeNote(overrides?: Partial<Note>): Note
```

### 5.2 Mock Setup

**File:** `tests/mocks/services.ts`

```typescript
// Mock implementations for service layer
export const mockRequestsService = {
  initRequests: vi.fn(),
  createRequest: vi.fn(),
  // ...
}
```

---

## 6. Implementation Priority

### Phase 1: Core Logic (High Value)
1. `tests/core/requests.test.ts` - validation is critical path
2. Extend `tests/queueService.test.ts` - queue algorithm config + engine behavior

### Phase 2: Repositories
3. Extend `tests/db.test.ts` with remove() test
4. `tests/repositories/settingsRepository.test.ts` - localStorage edge cases

### Phase 3: Services
5. `tests/services/settingsService.test.ts` - type guards
6. `tests/services/requestsService.test.ts` - orchestration with mocks

### Phase 4: Stores (Layer Boundaries)
7. `tests/stores/requestsStore.test.ts` - verify service calls
8. `tests/stores/settings.test.ts` - verify service calls

---

## 7. Scope Exclusions

- **Components** - UI testing handled separately in a later milestone to keep this plan tightly scoped
- **Composables** - behavioral hooks tested later (or via E2E), not in this unit/integration tranche
- **Formatting** - `time.ts` considered stable utility
- **Database infrastructure** - `db/database.ts`, `db/sqljs.ts` covered by integration

---

## Test Count Summary

| Layer | Files | Test Cases |
|-------|-------|------------|
| Core | 1 | ~16 |
| Repositories | 2 | ~8 |
| Services | 3 | ~25 |
| Stores | 2 | ~18 |
| **Total** | 8 | ~67 |

---

## 8. Architectural Guardrails (Layer Enforcement)

To support strict clean architecture boundaries beyond unit tests:

**Lint Rule / Static Check**
- Add a lint rule (or a small custom script) that enforces import constraints:
  - `stores/` may not import from `repositories/` or `db/`
  - `services/` may not import from `stores/` or `components/`
  - `repositories/` may only import from `db/` + `core/types`
  - `core/` may only import from `formatting/`
- Run this check in CI alongside tests to prevent boundary drift.
