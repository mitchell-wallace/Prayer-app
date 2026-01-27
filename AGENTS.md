# Agent Notes

- When adding new static assets, ensure they are included in the PWA delivery (place them in `public/`, reference them as needed, and consider precaching if part of the app shell) so they ship with the service worker.
- For design system guidance (colors, typography, spacing, components), see `specs/standards/branding/DESIGN.md`.
- Use TypeScript everywhere in `src/` and `tests/` (no `.js` files), avoid `any`, and ensure Vue SFC scripts use `lang="ts"`.
- Testing strategy: unit tests cover core/repositories/services/stores; integration tests start at services and run through repositories/db; component tests start at stores and run up to UI; e2e tests cover full app flows.

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
