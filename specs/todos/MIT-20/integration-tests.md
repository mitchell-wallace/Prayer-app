# Integration Test Plan (Lean)

## Objective

Add a small set of high-value integration tests that validate service-layer flows through repositories and the database, without touching stores/components. These tests complement unit tests and Playwright E2E by catching wiring/persistence issues across the service → repository → db boundary.

**Philosophy:** prefer a small number of stable, high-signal tests. Avoid re-testing unit-covered logic (queue ordering, validation rules) or duplicating E2E flows.

---

## Definition of Integration Tests (for this project)

- **Start at:** `src/services/`
- **Go through:** `src/repositories/` + `src/db/`
- **Exclude:** stores/components (UI state belongs in component tests and E2E)

---

## What to Mock vs. Use Real

| Dependency | Approach | Rationale |
|------------|----------|-----------|
| sql.js | Real (via `resetDbForTests`) | Must validate persistence is working |
| IndexedDB | Real (fake-indexeddb in jsdom) | Part of db layer |
| localStorage | Real (jsdom provides) | Simple, reliable |
| `Date.now()` | Fake timers | Deterministic timestamps |
| `crypto.randomUUID()` | Real | UUIDs don't affect assertions |

---

## Test Suites (Highest Value Only)

### 1. Database Persistence (existing tests, relocated)
`tests/integration/db.test.ts` (moved from `tests/db.test.ts`)

| Test Case | Description |
|-----------|-------------|
| bootstrap seed only once | `seed()` twice yields stable count |
| save + reload | Save request, clear cache, verify persisted |
| remove | Remove by id, clear cache, verify gone |

### 2. Requests Persistence (service → repo → db)
`tests/integration/requestsPersistence.test.ts`

| Test Case | Description |
|-----------|-------------|
| create request persists | `createRequest` → clear cache → `initRequests` returns it |
| record prayer persists | `recordPrayer` → reload → `prayedAt`/`updatedAt` preserved |
| add note persists | `addNote` → reload → note present |
| mark answered persists | `markAnswered` → reload → status + answer note preserved |

### 3. Data Integrity (single edge case)
`tests/integration/dataIntegrity.test.ts`

| Test Case | Description |
|-----------|-------------|
| unicode title preserved | Create with emoji/unicode title → reload → exact match |

---

## Assertions

Integration tests should verify:
1. **Persistence round-trip** (what goes in comes back out)
2. **State consistency** across service + repository + db boundaries

Avoid asserting on:
- Queue ordering (covered by unit tests)
- Store reactive behavior (covered by component/E2E tests)
- Validation rules (covered by unit tests)

---

## Setup Pattern

```typescript
beforeEach(async () => {
  await resetDbForTests();
  clearDbCache();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  clearDbCache();
});
```

---

## Scope Exclusions

- **Queue ordering/algorithm** (unit tests in `tests/services/queueService.test.ts` + `tests/core/queueAlgorithm`)
- **Store behavior** (covered by component tests)
- **Component rendering** (covered by component/E2E tests)
- **Full UI flows** (covered by Playwright)

---

## Test Count Summary

| Suite | Tests |
|-------|-------|
| Database Persistence | 3 |
| Requests Persistence | 4 |
| Data Integrity | 1 |
| **Total** | **8** |

---

## Priority

1. **Database Persistence** (already implemented, just relocated)
2. **Requests Persistence**
3. **Data Integrity** (single edge case)
