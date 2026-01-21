# Clean Architecture Migration Plan

## Target Structure

```
src/
├── core/                           # Pure business logic (no I/O, no side effects)
│   ├── requests.ts                 # Request validation, transformations
│   ├── queueAlgorithm.ts           # Priority scoring, cycle state
│   └── types.ts                    # Domain types (PrayerRequest, Note, etc.)
│
├── repositories/                   # Data access abstraction
│   ├── requestsRepository.ts       # DB operations for requests
│   └── settingsRepository.ts       # localStorage operations for settings
│
├── services/                       # Orchestration layer
│   ├── requestsService.ts          # CRUD orchestration (core + repository)
│   ├── requestsService.d.ts        # Type declarations
│   ├── queueService.ts             # Queue state management
│   └── settingsService.ts          # Settings operations
│
├── stores/                         # Reactive state for UI
│   ├── requestsStore.ts            # Main app store
│   ├── requestsStore.d.ts          # Type declarations
│   └── settings.ts                 # Reactive settings state
│
├── db/                             # Database infrastructure
│   ├── database.ts                 # SQLite/IndexedDB layer
│   ├── database.d.ts               # Type declarations
│   ├── sqljs.ts                    # sql.js WASM initialization
│   └── sqljs.d.ts                  # sql.js type shim
│
├── composables/                    # Reusable Vue composition functions
│   ├── useSwipeGesture.ts          # Touch swipe detection
│   ├── useProgressDotsAnimation.ts # Dot animation state
│   └── useModal.ts                 # Modal open/close logic
│
├── components/
│   ├── layout/
│   │   ├── AppHeader.vue
│   │   ├── AppFooter.vue
│   │   └── Content.vue
│   ├── cards/
│   │   └── RequestCard.vue
│   ├── forms/
│   │   └── AddRequestForm.vue
│   ├── modals/
│   │   ├── InfoModal.vue
│   │   └── SettingsModal.vue
│   └── navigation/
│       └── ProgressDots.vue
│
├── formatting/                     # Presentation helpers
│   ├── time.ts
│   └── time.d.ts
│
├── styles/
│   ├── main.css
│   └── progress-dots.css
│
├── App.vue
├── main.ts
└── vite-env.d.ts
```

---

## Layer Responsibilities

| Layer | Responsibility | Can Import From |
|-------|----------------|-----------------|
| `core/` | Pure business logic, validation, transformations. **No I/O.** | `formatting/` (for `computeExpiry`) |
| `repositories/` | Data access only. Abstracts persistence. | `db/`, `core/types` |
| `services/` | Orchestrates business operations. Calls core + repositories. | `core/`, `repositories/` |
| `stores/` | Reactive UI state. Calls services. | `services/`, `core/types` |
| `composables/` | Reusable Vue reactivity patterns. | `core/types`, Vue |
| `components/` | Presentation. Uses stores and composables. | `stores/`, `composables/`, `formatting/`, `core/types` |
| `db/` | Low-level database operations. | External libs only |
| `formatting/` | Pure presentation helpers. | `core/types` |

---

## Execution Phases

### Phase 1: Create Directory Structure

Create these new directories:
- `src/core/`
- `src/repositories/`
- `src/services/`
- `src/db/`
- `src/composables/`
- `src/formatting/`
- `src/components/layout/`
- `src/components/cards/`
- `src/components/forms/`
- `src/components/modals/`
- `src/components/navigation/`

---

### Phase 2: Move Core Layer

| Source | Destination | Import Changes |
|--------|-------------|----------------|
| `src/domain/requests.ts` | `src/core/requests.ts` | `../utils/time` -> `../formatting/time` |
| `src/app/queueAlgorithm.ts` | `src/core/queueAlgorithm.ts` | `../types` -> `./types` |
| `src/types.ts` | `src/core/types.ts` | None |

---

### Phase 3: Move Database Infrastructure

| Source | Destination | Import Changes |
|--------|-------------|----------------|
| `src/db.ts` | `src/db/database.ts` | `./sqljs.ts` -> `./sqljs`, `./utils/time` -> `../formatting/time`, `./types` -> `../core/types` |
| `src/db.d.ts` | `src/db/database.d.ts` | `./types` -> `../core/types` |
| `src/sqljs.ts` | `src/db/sqljs.ts` | None |
| `src/types/sqljs.d.ts` | `src/db/sqljs.d.ts` | None |

---

### Phase 4: Create Repository Layer

**New file: `src/repositories/requestsRepository.ts`**

```typescript
// Wraps database operations for requests
// Exports: getAll(), save(), remove(), seed()
// Imports from: db/database, core/types
```

Refactor: Extract these functions from `db/database.ts` into the repository:
- `fetchAllRequests()` -> `getAll()`
- `saveRequest()` -> `save()`
- `deleteRequest()` -> `remove()`
- `bootstrapSeed()` -> `seed()`

The `db/database.ts` keeps: `initDb()`, schema management, migrations, `clearDbCache()`, `resetDbForTests()`.

**New file: `src/repositories/settingsRepository.ts`**

```typescript
// Wraps localStorage operations for settings
// Exports: load(), save()
```

Extract from current `settings.ts`:
- `loadSettings()` -> `load()`
- The `watch` persistence logic -> `save()`

---

### Phase 5: Move Services

| Source | Destination | Import Changes |
|--------|-------------|----------------|
| `src/app/requestsService.ts` | `src/services/requestsService.ts` | `../db.ts` -> `../repositories/requestsRepository`, `../domain/requests.ts` -> `../core/requests`, `../types` -> `../core/types` |
| `src/app/queueService.ts` | `src/services/queueService.ts` | `../types` -> `../core/types`, `./queueAlgorithm.ts` -> `../core/queueAlgorithm` |
| `src/app/settingsService.ts` | `src/services/settingsService.ts` | `../settings.ts` -> `../stores/settings`, `../types` -> `../core/types` |
| `src/app/settingsService.d.ts` | `src/services/settingsService.d.ts` | `../types` -> `../core/types` |

---

### Phase 6: Move Stores

| Source | Destination | Import Changes |
|--------|-------------|----------------|
| `src/stores/requestsStore.ts` | (stays) | `../app/requestsService.ts` -> `../services/requestsService`, `../app/queueService.ts` -> `../services/queueService`, `../types` -> `../core/types` |
| `src/stores/requestsStore.d.ts` | (stays) | `../types` -> `../core/types` |
| `src/settings.ts` | `src/stores/settings.ts` | Extract persistence to `repositories/settingsRepository`, keep reactive state. Import `../core/types` |
| `src/settings.d.ts` | `src/stores/settings.d.ts` | `./types` -> `../core/types` |

---

### Phase 7: Move Formatting

| Source | Destination | Import Changes |
|--------|-------------|----------------|
| `src/utils/time.ts` | `src/formatting/time.ts` | `../types` -> `../core/types` |
| `src/utils/time.d.ts` | `src/formatting/time.d.ts` | None (has no imports) |

---

### Phase 8: Create Composables

**New file: `src/composables/useSwipeGesture.ts`**

Extract from `App.vue` lines 117-118, 188-206:

```typescript
import { ref } from 'vue';

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export interface SwipeGestureReturn {
  handleTouchStart: (event: TouchEvent) => void;
  handleTouchEnd: (event: TouchEvent) => void;
}

export function useSwipeGesture(
  handlers: SwipeHandlers,
  options?: { threshold?: number }
): SwipeGestureReturn {
  const threshold = options?.threshold ?? 40;
  const touchStart = ref<{ x: number; y: number } | null>(null);

  function handleTouchStart(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    touchStart.value = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent): void {
    if (!touchStart.value) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.value.x;
    const dy = touch.clientY - touchStart.value.y;
    touchStart.value = null;
    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) {
      handlers.onSwipeLeft?.();
    } else {
      handlers.onSwipeRight?.();
    }
  }

  return { handleTouchStart, handleTouchEnd };
}
```

**Move: `src/components/useProgressDotsAnimation.ts` -> `src/composables/useProgressDotsAnimation.ts`**

Import changes: `../types` -> `../core/types`

**New file: `src/composables/useModal.ts`**

```typescript
import { ref } from 'vue';

export function useModal(initialState = false) {
  const isOpen = ref(initialState);

  function open() {
    isOpen.value = true;
  }

  function close() {
    isOpen.value = false;
  }

  function toggle() {
    isOpen.value = !isOpen.value;
  }

  return { isOpen, open, close, toggle };
}
```

---

### Phase 9: Reorganize Components

| Source | Destination |
|--------|-------------|
| `src/components/AppHeader.vue` | `src/components/layout/AppHeader.vue` |
| `src/components/AppFooter.vue` | `src/components/layout/AppFooter.vue` |
| `src/components/Content.vue` | `src/components/layout/Content.vue` |
| `src/components/RequestCard.vue` | `src/components/cards/RequestCard.vue` |
| `src/components/AddRequestForm.vue` | `src/components/forms/AddRequestForm.vue` |
| `src/components/InfoModal.vue` | `src/components/modals/InfoModal.vue` |
| `src/components/SettingsModal.vue` | `src/components/modals/SettingsModal.vue` |
| `src/components/ProgressDots.vue` | `src/components/navigation/ProgressDots.vue` |

---

### Phase 10: Update All Imports

**`src/App.vue`:**
- Components: `./components/X.vue` -> `./components/{subfolder}/X.vue`
- Settings: `./app/settingsService.ts` -> `./services/settingsService`
- Types: `./types` -> `./core/types`
- Remove local swipe logic, import `useSwipeGesture` from `./composables/useSwipeGesture`

**`src/main.ts`:**
- Likely no changes (only imports `App.vue`)

**`src/components/layout/AppHeader.vue`:**
- Imports `InfoModal` and `SettingsModal`: update paths to `../modals/X.vue`

**`src/components/layout/AppFooter.vue`:**
- Imports `ProgressDots`: update path to `../navigation/ProgressDots.vue`
- Imports `AddRequestForm`: update path to `../forms/AddRequestForm.vue`

**`src/components/navigation/ProgressDots.vue`:**
- Imports composable: `./useProgressDotsAnimation` -> `../../composables/useProgressDotsAnimation`
- Types: update path

**`src/components/modals/InfoModal.vue`:**
- Types: `../types` -> `../../core/types`
- Consider using `useModal` composable (optional refactor)

**`src/components/modals/SettingsModal.vue`:**
- Service: `../app/settingsService.ts` -> `../../services/settingsService`
- Types: `../types` -> `../../core/types`
- Consider using `useModal` composable (optional refactor)

**`src/components/cards/RequestCard.vue`:**
- Types: `../types` -> `../../core/types`
- Formatting: if uses time functions, `../utils/time` -> `../../formatting/time`

**`src/components/forms/AddRequestForm.vue`:**
- Types: `../types` -> `../../core/types`
- Settings: if imports settings, update path

---

### Phase 11: Update Tests

| Test File | Import Changes |
|-----------|----------------|
| `tests/db.test.ts` | `../src/db` -> `../src/db/database`, possibly also `../src/repositories/requestsRepository` |
| `tests/queueService.test.ts` | `../src/app/queueService` -> `../src/services/queueService`, `../src/app/queueAlgorithm` -> `../src/core/queueAlgorithm` |

---

### Phase 12: Delete Empty Directories

After all moves complete:
- `src/app/` (empty)
- `src/domain/` (empty)
- `src/utils/` (empty)
- `src/types/` (empty)

---

### Phase 13: Update AGENTS.md

Add architecture documentation:

```markdown
## Architecture

This codebase follows a layered architecture with clear separation of concerns:

### Layer Overview

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Core** | `src/core/` | Pure business logic, validation, type definitions. No I/O or side effects. |
| **Repositories** | `src/repositories/` | Data access abstraction. All persistence goes through here. |
| **Services** | `src/services/` | Business operation orchestration. Coordinates core logic + repositories. |
| **Stores** | `src/stores/` | Reactive UI state. Calls services, exposes refs/computed to components. |
| **Composables** | `src/composables/` | Reusable Vue composition functions for UI behavior. |
| **Components** | `src/components/` | Vue presentation components, organized by function. |
| **Database** | `src/db/` | Low-level database infrastructure (sql.js, IndexedDB). |
| **Formatting** | `src/formatting/` | Pure presentation helpers (date formatting, etc.). |

### Import Rules

- `core/` -> only imports from `formatting/` (for computeExpiry)
- `repositories/` -> imports from `db/`, `core/types`
- `services/` -> imports from `core/`, `repositories/`
- `stores/` -> imports from `services/`, `core/types`
- `composables/` -> imports from `core/types`, Vue
- `components/` -> imports from `stores/`, `composables/`, `formatting/`, `core/types`

### Component Organization

Components are grouped by function:
- `layout/` - structural components (header, footer, content wrapper)
- `cards/` - card-style display components
- `forms/` - input forms
- `modals/` - modal dialogs
- `navigation/` - navigation controls

### Naming Conventions

- Avoid generic names like `utils/` or `helpers/` - use descriptive names (`formatting/`, `validation/`)
- Composables are prefixed with `use` (e.g., `useSwipeGesture.ts`)
- Repository methods: `getAll()`, `getById()`, `save()`, `remove()`
- Service methods: domain-specific verbs (`createRequest()`, `recordPrayer()`)
```

---

## File Operations Summary

| Action | Count | Files |
|--------|-------|-------|
| **Create directory** | 11 | `core/`, `repositories/`, `services/`, `db/`, `composables/`, `formatting/`, `components/layout/`, `components/cards/`, `components/forms/`, `components/modals/`, `components/navigation/` |
| **Move file** | 21 | See phases 2-9 |
| **Create new file** | 4 | `repositories/requestsRepository.ts`, `repositories/settingsRepository.ts`, `composables/useSwipeGesture.ts`, `composables/useModal.ts` |
| **Update imports** | ~18 | All files with cross-references |
| **Delete directory** | 4 | `app/`, `domain/`, `utils/`, `types/` |
| **Update** | 1 | `AGENTS.md` |

---

## Verification Checklist

After migration:
1. `npm run build` - compiles without errors
2. `npm run typecheck` - no type errors
3. `npm run test` - all tests pass
4. `npm run dev` - app runs correctly
5. Manual test: swipe gestures work, modals open/close, CRUD operations work
