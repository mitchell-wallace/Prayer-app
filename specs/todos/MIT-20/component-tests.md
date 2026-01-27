# Component & Composable Test Plan

## Objective

Add targeted component and composable tests that verify **behavioral correctness** without duplicating E2E coverage. Focus on:
1. **Component logic** – state transitions, computed properties, event emissions
2. **Composable contracts** – returned interface behaves correctly in isolation
3. **Minimal sanity checks** – keep only what is needed for stability

**Philosophy:** Components are "glue" between stores and DOM. Most rendering/flow is covered by E2E. Component tests should catch logic bugs E2E misses (edge cases, disabled states, complex internal state) while keeping redundancy low.

---

## Testing Approach

### What Gets Component Tests

| Criteria | Test? | Rationale |
|----------|-------|-----------|
| Complex internal state (menus, forms, edit modes) | ✅ | E2E can't easily cover all state transitions |
| Computed properties with edge cases | ✅ | Logic bugs hide here |
| Event emissions with conditional payloads | ✅ | Verify correct data flows up |
| Pure presentation (just renders props) | ❌ | E2E covers; no logic to break |
| Direct store wiring (no transformation) | ⚠️ | Covered by real store + mocked services in component tests |

### What Gets Composable Tests

| Criteria | Test? | Rationale |
|----------|-------|-----------|
| Non-trivial logic (swipe thresholds, timing) | ✅ | Pure functions, easy to unit test |
| Simple wrappers (useModal) | ✅ Light | Quick sanity check, not exhaustive |
| Animation orchestration (timers) | ✅ | Timing bugs common; fake timers help |

---

## Test Suites

### 1. Composables (`tests/composables/`)

#### 1.1 `useSwipeGesture.test.ts`

| Test Case | Description |
|-----------|-------------|
| calls onSwipeLeft when dx exceeds threshold | Swipe left triggers callback |
| calls onSwipeRight when dx exceeds threshold | Swipe right triggers callback |
| ignores swipe below threshold | Small movement doesn't trigger |
| ignores vertical swipes | dy > dx doesn't trigger horizontal callback |
| respects custom threshold option | Custom threshold value honored |
| handles missing handlers gracefully | No error if onSwipeLeft/onSwipeRight undefined |

**Setup:**
```typescript
function simulateSwipe(handlers: SwipeHandlers, start: { x: number; y: number }, end: { x: number; y: number }) {
  const { handleTouchStart, handleTouchEnd } = useSwipeGesture(handlers);
  handleTouchStart({ changedTouches: [{ clientX: start.x, clientY: start.y }] } as any);
  handleTouchEnd({ changedTouches: [{ clientX: end.x, clientY: end.y }] } as any);
}
```

#### 1.2 `useModal.test.ts`

Lightweight sanity tests (composable is simple):

| Test Case | Description |
|-----------|-------------|
| initializes with provided state | `useModal(true)` starts open |
| open() sets isOpen to true | State transition |
| close() sets isOpen to false | State transition |
| toggle() flips state | Toggle behavior |

#### 1.3 `useProgressDotsAnimation.test.ts`

| Test Case | Description |
|-----------|-------------|
| sets motionDirection on dot index change | Forward/backward label based on slideDirection |
| clears motion state after timeout | 200ms timer clears previousDots |
| isOutgoingDot identifies correct dot | Matches outgoing slot |
| isIncomingDot only true after ready delay | Requires incomingReady state |
| isCurrentDot excludes outgoing dot | Outgoing dot not marked current |
| cleans up timers on unmount | No dangling timeouts |

**Setup:** Use `vi.useFakeTimers()` to control timing.

---

### 2. Components (`tests/components/`)

#### 2.1 `RequestCard.test.ts`

The most complex component – multiple internal states worth testing.

**State/Logic Tests:**

| Test Case | Description |
|-----------|-------------|
| displays request title and priority | Props render correctly |
| shows "never" when prayedAt is empty | lastPrayed computed edge case |
| emits pray event with request | Button click emits correctly |
| emits mark-answered with request | Button disabled when already answered |
| answered button disabled when status is answered | Disabled state |

**Note Form State:**

| Test Case | Description |
|-----------|-------------|
| opens note form on add note click | State transition |
| closes note form on cancel | State reset |
| clears draft on submit | Cleanup after emit |
| emits add-note with trimmed text | Payload verification |
| submit does nothing for empty/whitespace text | Validation |
| focuses textarea when form opens | UX behavior (nextTick) |

**Menu Behavior:**

| Test Case | Description |
|-----------|-------------|
| toggles request menu on click | Menu state |
| opens edit modal from menu | Menu → modal flow |
| closes menus on outside click | Document listener |
| toggles note menu for specific note | Per-note menu state |

**Edit/Delete Flows:**

| Test Case | Description |
|-----------|-------------|
| opens edit modal with form pre-populated | editForm reactive copy |
| emits update-request on save edit | Payload includes changes |
| shows delete confirmation on delete click | Confirmation modal state |
| emits delete-request on confirm | Deletion flow |
| emits delete-note with correct note | Note deletion |
| emits edit-note with updated text | Note edit |

**Priority:** High – this component has ~15 internal state variables.

#### 2.2 `AddRequestForm.test.ts`

Form expansion logic and dropdown behavior.

| Test Case | Description |
|-----------|-------------|
| shows controls when focused | showControls computed |
| shows controls when title has content | showControls computed |
| hides controls when blurred and empty | Collapse behavior |
| syncs defaults from settings when title empty | Watcher behavior |
| does not sync defaults when form in use | Watcher guard |
| emits save with trimmed payload | Form submission |
| clears title after submit | Cleanup |
| keeps form expanded after submit | Rapid entry UX |

**Priority:** Medium – reasonable complexity, mostly E2E-covered.

#### 2.3 Layout Components (Skip)

`AppHeader`, `AppFooter`, `Content` – pure structural components with no logic. Covered by E2E visual verification.

---

## Test Utilities

### `tests/components/helpers.ts`

```typescript
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

/**
 * Mount component with common test config.
 * Stubs Teleport to prevent portal issues in jsdom.
 */
export function mountComponent<T>(component: T, options = {}) {
  return mount(component, {
    global: {
      stubs: {
        Teleport: true,  // Prevent portal mounting issues
      },
    },
    ...options,
  });
}

/**
 * Simulate document click outside a component.
 */
export function clickOutside(wrapper: ReturnType<typeof mount>): void {
  document.body.click();
}

/**
 * Wait for Vue reactivity + DOM updates.
 */
export async function flushPromises(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
```

### `tests/fixtures/requests.ts` (extend existing)

Add note fixtures:
```typescript
export function makeNote(overrides?: Partial<Note>): Note {
  return {
    id: crypto.randomUUID(),
    text: 'Test note',
    createdAt: Date.now(),
    isAnswer: false,
    ...overrides,
  };
}
```

---

## Implementation Priority

### Phase 1: Composables (Quick Wins)
1. `tests/composables/useSwipeGesture.test.ts` – pure logic, high value
2. `tests/composables/useProgressDotsAnimation.test.ts` – timing-sensitive
3. `tests/composables/useModal.test.ts` – trivial but complete

### Phase 2: Core Components
4. `tests/components/RequestCard.test.ts` – highest complexity, most value
5. `tests/components/AddRequestForm.test.ts` – form logic

---

## Scope Exclusions

- **Snapshot testing** – brittle, low value for this codebase size
- **CSS/visual regression** – E2E screenshots if needed later
- **Store integration in components** – covered by component tests using real stores + mocked services
- **Icon rendering** – external library, not our concern
- **Transition animations** – timing-dependent, E2E covers UX
- **Dropdown behavior** – handled in E2E to avoid duplication

---

## Test Count Summary

| Category | Files | Test Cases |
|----------|-------|------------|
| Composables | 3 | ~18 |
| RequestCard | 1 | ~16 |
| AddRequestForm | 1 | ~8 |
| **Total** | 5 | ~42 |

---

## Technical Notes

### Store Strategy

Use real stores with mocked services so component tests validate store-level logic without hitting repositories/db.

### Teleport Handling

Components using `<Teleport>` (modals in RequestCard) need stubs to prevent jsdom issues:

```typescript
mount(RequestCard, {
  global: { stubs: { Teleport: true } },
  props: { request: makeRequest() },
});
```

### Icon Stubs

If icon imports cause issues, stub them:
```typescript
global: {
  stubs: {
    IconPlus: true,
    IconDotsVertical: true,
    IconX: true,
    IconChevronDown: true,
  },
}
```

### Document Event Listeners

Both RequestCard and AddRequestForm attach document click listeners. Tests must:
1. Trigger real document clicks for outside-click tests
2. Ensure `wrapper.unmount()` in afterEach to clean up listeners

---

## Alignment with Existing Test Strategy

| Layer | Coverage Strategy |
|-------|-------------------|
| Core/Services/Repos | Unit tests (test-cases.md) |
| Services → Repos → DB | Integration tests (integration-tests.md) |
| **Stores/Components/Composables** | **This plan** |
| Full user journeys | E2E tests (app.spec.ts) |

This creates a **testing pyramid**: many fast unit tests, fewer integration tests, minimal E2E tests for critical paths.
