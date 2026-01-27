---
name: frontend-testing
description: Generate Vitest tests for Vue 3 components, composables, stores, services, repositories, and core logic. Follows the layered architecture pattern.
---

# Vue Frontend Testing Skill

This skill enables Claude to generate high-quality, comprehensive frontend tests following the codebase's layered architecture pattern.

## When to Apply This Skill

Apply this skill when the user:

- Asks to **write tests** for a component, composable, store, service, or utility
- Asks to **review existing tests** for completeness
- Mentions **Vitest**, **Vue Test Utils**, **VTU**, or **test files**
- Requests **test coverage** improvement
- Mentions **testing**, **unit tests**, or **integration tests** for frontend code
- Wants to understand **testing patterns** in the codebase

**Do NOT apply** when:

- User is asking about backend/API tests (Python/pytest)
- User is asking about E2E tests (Playwright/Cypress)
- User is only asking conceptual questions without code context

**Repo scope note (Prayer-app):** MIT-20 is intentionally limited to core/services/repositories/stores to keep the work chunk small. Component/composable testing is deferred to a later milestone unless explicitly requested.

## Quick Reference

### Tech Stack

| Tool | Purpose |
|------|---------|
| Vitest | Test runner |
| @vue/test-utils | Component testing |
| @testing-library/dom | `waitFor` for async conditions |
| jsdom | Test environment |
| fake-indexeddb | IndexedDB mocking |
| TypeScript | Type safety |

### Key Commands

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Run specific file
npm test tests/core/validation.test.ts

# Run specific directory
npm test tests/services/

# Generate coverage report
npm test -- --coverage
```

### File Naming

- Test files: `*.test.ts` in `tests/` directory
- Mirror source structure: `src/services/foo.ts` → `tests/services/foo.test.ts`

## Layered Architecture Testing

The codebase follows a layered architecture. Test each layer appropriately:

### Layer Overview

| Layer | Location | Test Style | Mock Depth |
|-------|----------|-----------|------------|
| **Core** | `src/core/` | Pure unit tests | None - pure functions |
| **Repositories** | `src/repositories/` | Integration | Database layer |
| **Services** | `src/services/` | Unit tests | Repositories + time/id |
| **Stores** | `src/stores/` | Unit tests | Services |
| **Composables** | `src/composables/` | Unit tests | Stores if stateful |
| **Components** | `src/components/` | Shallow unit | Stores, services |

**Note:** In MIT-20 scope, focus on core/services/repositories/stores; use the composable/component guidance only when those tests are explicitly in scope.

### Processing Order (Simple → Complex)

When testing multiple files, process in this order:

```
1. Core functions (pure, no dependencies)
2. Repositories (mock database layer)
3. Services (mock repositories)
4. Stores (mock services)
5. Composables (mock stores if needed)
6. Components (integration tests last)
```

### Import Rules

Each layer should only import from specific other layers:

- `core/` → only `formatting/`
- `repositories/` → `db/`, `core/types`
- `services/` → `core/`, `repositories/`
- `stores/` → `services/`, `core/types`
- `composables/` → `core/types`, Vue
- `components/` → `stores/`, `composables/`, `formatting/`, `core/types`

## Test Structure Template

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, shallowMount } from '@vue/test-utils'
import ComponentName from '@/components/path/ComponentName.vue'

// Mock services - mock only one layer down
vi.mock('@/services/requestsService', () => ({
  initRequests: vi.fn(),
  createRequest: vi.fn(),
}))

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Rendering tests (REQUIRED)
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const wrapper = shallowMount(ComponentName)
      expect(wrapper.exists()).toBe(true)
    })
  })

  // Props tests (REQUIRED)
  describe('Props', () => {
    it('should apply custom class', () => {
      const wrapper = shallowMount(ComponentName, {
        props: { class: 'custom-class' }
      })
      expect(wrapper.classes()).toContain('custom-class')
    })
  })

  // User Interactions
  describe('User Interactions', () => {
    it('should emit event on click', async () => {
      const wrapper = shallowMount(ComponentName)
      await wrapper.find('button').trigger('click')
      expect(wrapper.emitted('click')).toHaveLength(1)
    })
  })

  // Edge Cases (REQUIRED)
  describe('Edge Cases', () => {
    it('should handle empty data', () => {
      const wrapper = shallowMount(ComponentName, {
        props: { items: [] }
      })
      expect(wrapper.text()).toContain('No items')
    })
  })
})
```

## Testing Workflow (CRITICAL)

### Incremental Approach Required

**NEVER generate all test files at once.** For complex components or multi-file directories:

1. **Analyze & Plan**: List all files, order by layer/complexity
2. **Process ONE at a time**: Write test → Run test → Fix if needed → Next
3. **Verify before proceeding**: Do NOT continue to next file until current passes

```
For each file:
  ┌────────────────────────────────────────┐
  │ 1. Write test                          │
  │ 2. Run: npm test <file>.test.ts        │
  │ 3. PASS? → Mark complete, next file    │
  │    FAIL? → Fix first, then continue    │
  └────────────────────────────────────────┘
```

**Batch runs:** Run only the single-file test while iterating. Run a larger batch (directory/all tests) at the end of a writing round, or immediately after changes to shared test setup/utilities that affect multiple tests.

### Layer-Based Testing Strategy

| Layer Being Tested | What to Mock | Example |
|--------------------|--------------|---------|
| Core (`src/core/`) | Nothing | Test pure functions directly |
| Repositories | `src/db/database` | Use `resetDbForTests()` |
| Services | Repositories, `dateTimeService` | `vi.mock('@/repositories/...')` |
| Stores | Services | `vi.mock('@/services/...')` |
| Composables | Stores if stateful | Mock store refs |
| Components | Stores, services | `vi.mock('@/services/...')` |

## Core Principles

### 1. AAA Pattern (Arrange-Act-Assert)

Every test should clearly separate:

- **Arrange**: Setup test data and render component
- **Act**: Perform user actions
- **Assert**: Verify expected outcomes

### 2. Black-Box Testing

- Test observable behavior, not implementation details
- Use `wrapper.find()` and `wrapper.text()` for assertions
- Avoid testing internal state directly

### 3. Single Behavior Per Test

Each test verifies ONE user-observable behavior:

```typescript
// ✅ Good: One behavior
it('should disable button when loading', () => {
  const wrapper = shallowMount(Button, { props: { loading: true } })
  expect(wrapper.find('button').attributes('disabled')).toBeDefined()
})

// ❌ Bad: Multiple behaviors
it('should handle loading state', () => {
  const wrapper = shallowMount(Button, { props: { loading: true } })
  expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  expect(wrapper.text()).toContain('Loading')
  expect(wrapper.classes()).toContain('loading')
})
```

### 4. Semantic Naming

Use `should <behavior> when <condition>`:

```typescript
it('should show error message when validation fails')
it('should call onSubmit when form is valid')
it('should disable input when isReadOnly is true')
```

## Required Test Scenarios

### Always Required (All Test Files)

1. **Basic Functionality**: Primary behavior works correctly
2. **Edge Cases**: null, undefined, empty values, boundary conditions

### By Layer

| Layer | Focus Areas |
|-------|-------------|
| Core | Validation edge cases, type coercion, error throwing |
| Repository | CRUD operations, data persistence, query correctness |
| Service | Orchestration flow, error propagation, side effects |
| Store | Reactive updates, computed properties, service delegation |
| Composable | State transitions, lifecycle behavior |
| Component | Rendering, props, events, user interactions |

## Detailed Guides

For more detailed information, refer to:

- `references/workflow.md` - **Incremental testing workflow** (MUST READ for multi-file testing)
- `references/mocking.md` - Layer-based mocking strategy
- `references/async-testing.md` - Async operations and Vue reactivity
- `references/layer-patterns.md` - Testing patterns per architecture layer
- `references/common-patterns.md` - Vue Test Utils patterns
- `references/checklist.md` - Test generation checklist and validation steps

## Reference Examples in Codebase

- `tests/db.test.ts` - Repository/database integration tests
- `tests/queueService.test.ts` - Service tests with fake timers

## Dependency Injection Pattern

For time and ID dependencies, use injection rather than mocking globals:

```typescript
// Production code
export function createRequestRecord(
  payload: CreateRequestPayload,
  deps = { now: Date.now(), id: crypto.randomUUID() }
) {
  return {
    ...payload,
    id: deps.id,
    createdAt: deps.now,
  }
}

// Test code - inject deterministic values
const result = createRequestRecord(payload, {
  now: 1609459200000,
  id: 'test-id-123'
})
expect(result.id).toBe('test-id-123')
expect(result.createdAt).toBe(1609459200000)
```
