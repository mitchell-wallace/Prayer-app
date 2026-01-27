# Test Generation Checklist

Use this checklist when generating or reviewing tests for Vue frontend code.

## Pre-Generation

- [ ] Read the source code completely
- [ ] Identify the layer (core, repository, service, store, composable, component)
- [ ] Determine what to mock based on layer rules
- [ ] Check for existing tests in `tests/` directory
- [ ] **Identify ALL files in the directory** that need testing (not just index)

## Layer Identification

| Location | Layer | Mock Strategy |
|----------|-------|---------------|
| `src/core/` | Core | No mocking - pure functions |
| `src/repositories/` | Repository | Use `resetDbForTests()` |
| `src/services/` | Service | Mock repositories |
| `src/stores/` | Store | Mock services |
| `src/composables/` | Composable | Mock stores if stateful |
| `src/components/` | Component | Mock services/stores |

## Incremental Workflow (CRITICAL for Multi-File)

- [ ] **NEVER generate all tests at once** - process one file at a time
- [ ] Order files by layer: core → repo → service → store → composable → component
- [ ] Create a todo list to track progress before starting
- [ ] For EACH file: write → run test → verify pass → then next
- [ ] **DO NOT proceed** to next file until current one passes

## Required Test Sections

### All Test Files MUST Have

- [ ] **Basic Functionality** - Primary behavior works correctly
- [ ] **Edge Cases** - null, undefined, empty values, boundaries

### Layer-Specific Requirements

| Layer | Required Tests |
|-------|----------------|
| Core | Input validation, type coercion, error throwing |
| Repository | CRUD operations, data persistence, query correctness |
| Service | Orchestration flow, error propagation, correct delegation |
| Store | Reactive updates, computed properties, service delegation |
| Composable | State transitions, return value structure |
| Component | Rendering, props, events, user interactions |

## Code Quality Checklist

### File Structure

- [ ] File uses `.test.ts` extension
- [ ] Located in `tests/` directory mirroring `src/` structure
- [ ] Imports from `vitest` for test utilities
- [ ] Uses `@vue/test-utils` for component tests

### Test Structure

- [ ] Uses `describe` blocks to group related tests
- [ ] Test names follow `should <behavior> when <condition>` pattern
- [ ] AAA pattern (Arrange-Act-Assert) is clear
- [ ] `beforeEach` clears mocks with `vi.clearAllMocks()`

### Mocking

- [ ] Mocks only one layer down (see mocking guide)
- [ ] Uses `vi.mock()` at file top (before imports)
- [ ] Uses `vi.mocked()` for type-safe mock access
- [ ] Clears mocks in `beforeEach` (not `afterEach`)
- [ ] Uses fake timers for time-dependent tests

### Component Testing

- [ ] Uses `shallowMount` by default for unit tests
- [ ] Uses `mount` only for integration tests
- [ ] Tests props with different values
- [ ] Tests emitted events
- [ ] Awaits `trigger()` for async DOM updates

### TypeScript

- [ ] No `any` types without justification
- [ ] Mock data uses actual types from source
- [ ] Factory functions have proper return types

## Coverage Goals (Per File)

For the current file being tested:

- [ ] 100% function coverage
- [ ] 100% statement coverage
- [ ] >95% branch coverage
- [ ] >95% line coverage

## Post-Generation (Per File)

**Run these checks after EACH test file, not just at the end:**

- [ ] Run `npm test <file>.test.ts` - **MUST PASS before next file**
- [ ] Fix any failures immediately
- [ ] Mark file as complete in todo list
- [ ] Only then proceed to next file

### After All Files Complete

- [ ] Run full test suite: `npm test`
- [ ] Check coverage: `npm test -- --coverage`
- [ ] Run TypeScript check: `npm run type-check`

## Common Issues to Watch

### Wrong Mock Depth

```typescript
// ❌ Store test mocking repository (skips a layer)
vi.mock('@/repositories/requestsRepository')

// ✅ Store test mocking service (correct depth)
vi.mock('@/services/requestsService')
```

### Missing Await on Triggers

```typescript
// ❌ Missing await
wrapper.find('button').trigger('click')
expect(wrapper.emitted('click')).toBeTruthy()

// ✅ Awaited
await wrapper.find('button').trigger('click')
expect(wrapper.emitted('click')).toBeTruthy()
```

### Checking Non-Existent Elements

```typescript
// ❌ Throws if element doesn't exist
expect(wrapper.find('.error').text()).toBe('')

// ✅ Check existence first
expect(wrapper.find('.error').exists()).toBe(false)
```

### State Leakage

```typescript
// ❌ Shared state not reset
let mockState = { count: 0 }

// ✅ Reset in beforeEach
beforeEach(() => {
  vi.clearAllMocks()
  // Reset any shared state
})
```

### Missing Edge Cases

Always test these scenarios:

- `null` / `undefined` inputs
- Empty strings / arrays / objects
- Boundary values (0, -1, MAX_INT)
- Error states
- Loading states

## Quick Commands

```bash
# Run specific test
npm test tests/services/requestsService.test.ts

# Run with coverage
npm test -- --coverage

# Watch mode
npm test -- --watch

# Run tests matching pattern
npm test -- -t "should create"

# Run tests in directory
npm test tests/services/
```

## Vue Test Utils Quick Reference

```typescript
// Mount options
const wrapper = shallowMount(Component, {
  props: { title: 'Test' },
  slots: { default: '<p>Content</p>' },
  global: {
    stubs: { ChildComponent: true },
    mocks: { $route: { params: { id: '1' } } },
  },
})

// Common assertions
expect(wrapper.exists()).toBe(true)
expect(wrapper.text()).toContain('Hello')
expect(wrapper.find('button').exists()).toBe(true)
expect(wrapper.classes()).toContain('active')
expect(wrapper.emitted('click')).toHaveLength(1)
expect(wrapper.vm.computedValue).toBe('expected')

// Interactions
await wrapper.find('input').setValue('new value')
await wrapper.find('button').trigger('click')
await wrapper.setProps({ title: 'Updated' })
```
