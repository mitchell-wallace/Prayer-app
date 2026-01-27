# Integration Test Plan

## Objective

Add integration tests that verify the full stack works correctly without mocking internal layers. These tests complement the existing unit tests by catching issues at layer boundaries and verifying end-to-end data flows.

**Philosophy:** Test critical user journeys and data integrity paths. Avoid duplicating unit test coverage. A moderate number of high-value integration tests is better than exhaustive coverage for a young codebase.

---

## What to Mock vs. Use Real

| Dependency | Approach | Rationale |
|------------|----------|-----------|
| sql.js | Real (via `resetDbForTests`) | Core persistence - must verify actual SQL operations |
| IndexedDB | Real (fake-indexeddb in jsdom) | Part of persistence layer |
| localStorage | Real (jsdom provides) | Simple, no reason to mock |
| `Date.now()` | Fake timers | Deterministic tests for expiry/timestamps |
| `crypto.randomUUID()` | Real | UUIDs don't affect test assertions |

---

## Test Suites

### 1. Request Lifecycle (`tests/integration/requestLifecycle.test.ts`)

Full round-trip tests for prayer request CRUD operations.

| Test Case | Description |
|-----------|-------------|
| create request persists to database | Create via store → clear cache → reload → verify data matches |
| record prayer updates timestamps | Record prayer → reload → verify `prayedAt` array and `updatedAt` |
| update request persists changes | Change title/priority/duration → reload → verify changes |
| add note persists with request | Add note → reload → verify note in `notes` array |
| edit note persists changes | Edit note text → reload → verify updated text |
| delete note removes from request | Delete note → reload → verify note removed |
| mark answered changes status | Mark answered with note → reload → verify status and answer note |
| delete request removes from database | Delete → reload → verify not in results |

**Setup pattern:**
```typescript
beforeEach(async () => {
  await resetDbForTests();
  clearDbCache();
  vi.useFakeTimers();
});
```

---

### 2. Queue Integration (`tests/integration/queueIntegration.test.ts`)

Verify queue algorithm produces correct results with real data and persistence.

| Test Case | Description |
|-----------|-------------|
| queue populates from persisted requests | Save requests → clear cache → init store → verify queue has items |
| queue respects priority ordering | Create urgent/high/medium/low → verify urgent appears first |
| never-prayed items appear before recently-prayed | Create two same-priority items, pray on one → verify never-prayed first |
| answered requests excluded from queue | Create request → mark answered → verify not in queue |
| expired requests excluded from queue | Create request with past expiry → verify not in queue |
| queue survives store reinit | Navigate to index 3 → reinit store → verify queue rebuilt correctly |
| new request inserted after current | At index 2, create request → verify inserted at index 3 |

---

### 3. Settings Persistence (`tests/integration/settingsPersistence.test.ts`)

Verify settings survive the full round-trip through localStorage.

| Test Case | Description |
|-----------|-------------|
| theme change persists | Set theme → clear module cache → reimport → verify theme |
| default priority persists | Set priority → reimport → verify priority |
| default duration persists | Set duration → reimport → verify duration |
| invalid values don't corrupt storage | Set valid → attempt invalid → reimport → verify valid preserved |
| reset clears to defaults | Modify all → reset → reimport → verify defaults |

**Note:** Settings store uses module-level state, so tests must use `vi.resetModules()` between assertions.

---

### 4. Data Integrity (`tests/integration/dataIntegrity.test.ts`)

Verify data survives edge cases and error conditions.

| Test Case | Description |
|-----------|-------------|
| concurrent saves don't lose data | Rapid sequential saves → reload → verify all changes present |
| large note content preserved | Add note with 10KB text → reload → verify exact content |
| special characters in title preserved | Create with emoji/unicode title → reload → verify exact match |
| empty arrays serialize correctly | Create with no notes/prayedAt → reload → verify empty arrays (not null) |
| timestamps maintain precision | Save with specific timestamp → reload → verify exact value |

---

## Implementation Notes

### Test Utilities

Create `tests/integration/helpers.ts`:

```typescript
import { clearDbCache, resetDbForTests } from '../../src/db/database';

/**
 * Reset all persistent state for integration tests.
 * Call in beforeEach.
 */
export async function resetAllState(): Promise<void> {
  await resetDbForTests();
  clearDbCache();
  localStorage.clear();
}

/**
 * Simulate app restart by clearing caches and reimporting store.
 */
export async function simulateRestart(): Promise<{
  store: ReturnType<typeof import('../../src/stores/requestsStore').useRequestsStore>;
}> {
  clearDbCache();
  vi.resetModules();
  const storeModule = await import('../../src/stores/requestsStore');
  const store = storeModule.useRequestsStore();
  await store.init();
  return { store };
}
```

### Assertions

Integration tests should verify:
1. **Data round-trip** - what goes in comes back out
2. **State consistency** - related data stays in sync
3. **Persistence** - data survives cache clears / module reloads

Avoid asserting on:
- Internal implementation details
- Exact queue ordering (beyond priority rules)
- Timing of reactive updates

---

## Scope Exclusions

- **Component rendering** - covered by future component tests
- **Network requests** - app is offline-first, no network layer
- **Browser APIs** (notifications, etc.) - not yet implemented
- **Migration paths** - test when migrations are added

---

## Test Count Summary

| Suite | Tests |
|-------|-------|
| Request Lifecycle | 8 |
| Queue Integration | 7 |
| Settings Persistence | 5 |
| Data Integrity | 5 |
| **Total** | ~25 |

---

## Priority

1. **Request Lifecycle** - highest value, covers main user journey
2. **Queue Integration** - complex algorithm, high bug risk
3. **Data Integrity** - edge cases that unit tests miss
4. **Settings Persistence** - lower risk, simpler code path
