# Testing Workflow Guide

This guide defines the workflow for generating tests, especially for complex components or directories with multiple files.

## Scope Clarification

| Scope | Rule |
|-------|------|
| **Single file** | Complete intended scenarios in one generation |
| **Multi-file directory** | Process one file at a time, verify each before proceeding |

## Critical Rule: Incremental Approach for Multi-File Testing

When testing a **directory with multiple files**, **NEVER generate all test files at once.** Use an incremental, verify-as-you-go approach.

### Why Incremental?

| Batch Approach | Incremental Approach |
|----------------|----------------------|
| Generate 5+ tests at once | Generate 1 test at a time |
| Run tests only at the end | Run test immediately after each file |
| Multiple failures compound | Single point of failure, easy to debug |
| Hard to identify root cause | Clear cause-effect relationship |
| Mock issues affect many files | Mock issues caught early |
| Messy git history | Clean, atomic commits possible |

## Single File Workflow

When testing a **single component, composable, or service**:

```
1. Read source code completely
2. Identify the layer (core, repository, service, store, composable, component)
3. Determine what to mock based on layer
4. Write the test file
5. Run test: npm test <file>.test.ts
6. Fix any failures
7. If a shared setup/util changes, run a broader batch after the round
```

## Directory/Multi-File Workflow (MUST FOLLOW)

When testing a **directory or multiple files**, follow this strict workflow:

### Step 1: Analyze and Plan

1. **List all files** that need tests in the directory
2. **Categorize by layer**:
   - Core functions (pure, no dependencies)
   - Repositories (database interaction)
   - Services (business orchestration)
   - Stores (reactive state)
   - Composables (Vue composition functions)
   - Components (Vue SFC)
3. **Order by dependency**: Test dependencies before dependents
4. **Create a todo list** to track progress

### Step 2: Determine Processing Order

Process files in this recommended order (layers, then complexity within each layer):

```
1. Core functions (pure, no dependencies)
2. Repositories (mock database layer)
3. Services (mock repositories)
4. Stores (mock services)
5. Composables (mock stores if needed)
6. Components - simple (few props, no state)
7. Components - medium (state, events)
8. Components - complex (API, routing)
9. Integration tests (last)
```

**Rationale**:

- Lower layers help establish mock patterns
- Services used by stores should be tested first
- Components depend on stores/services working

### Step 3: Process Each File Incrementally

**For EACH file in the ordered list:**

```
┌─────────────────────────────────────────────┐
│  1. Write test file                         │
│  2. Run: npm test <file>.test.ts            │
│  3. If FAIL → Fix immediately, re-run       │
│  4. If PASS → Mark complete in todo list    │
│  5. ONLY THEN proceed to next file          │
└─────────────────────────────────────────────┘
```

**DO NOT proceed to the next file until the current one passes.**

**Batch runs:** While iterating, run only the single-file test. Run directory/all tests at the end of a writing round, or immediately after updating shared test setup/utilities that affect multiple files.

### Step 4: Final Verification

After all individual tests pass:

```bash
# Run all tests in the directory together
npm test tests/services/

# (Optional) Check coverage if requested
# npm test -- --coverage
```

## Layer-Based Complexity Guidelines

### Core Layer (Simplest)

- Pure functions with no side effects
- Test directly without mocks
- Focus on edge cases and boundary conditions

### Repository Layer

- Test with real database (use `resetDbForTests()`)
- Focus on CRUD operations
- Verify data persistence

### Service Layer

- Mock repositories
- Test orchestration logic
- Verify correct delegation

### Store Layer

- Mock services
- Test reactive state updates
- Verify computed properties

### Composable Layer

- Test in isolation when possible
- Mock stores if stateful dependencies
- Test state transitions

### Component Layer (Most Complex)

- Use `shallowMount` for unit tests
- Mock services/stores
- Focus on rendering, props, events

## Todo List Format

When testing multiple files, use a todo list like this:

```
Testing: src/services/

Ordered by layer and complexity:

☐ core/validation.ts          [core, pure]
☐ repositories/requestsRepo.ts [repository]
☐ services/requestsService.ts  [service]
☐ stores/requestsStore.ts      [store]
☐ composables/useModal.ts      [composable]
☐ components/RequestCard.vue   [component, simple]
☐ components/RequestForm.vue   [component, medium]
☐ components/RequestList.vue   [component, complex]

Progress: 0/8 complete
```

Update status as you complete each:

- ☐ → ⏳ (in progress)
- ⏳ → ✅ (complete and verified)
- ⏳ → ❌ (blocked, needs attention)

## When to Stop and Verify

**Always run tests after:**

- Completing a test file
- Making changes to fix a failure
- Modifying shared mocks
- Updating test utilities or helpers

**Signs you should pause:**

- More than 2 consecutive test failures
- Mock-related errors appearing
- Unclear why a test is failing

## Common Pitfalls to Avoid

### Don't Generate Everything First

```
# BAD: Writing all files then testing
Write service.test.ts
Write store.test.ts
Write component.test.ts
Run npm test  ← Multiple failures, hard to debug
```

### Do Verify Each Step

```
# GOOD: Incremental with verification
Write service.test.ts
Run npm test service.test.ts ✅
Write store.test.ts
Run npm test store.test.ts ✅
...continue...
```

### Don't Skip Verification for "Simple" Files

Even simple files can have:

- Import errors
- Missing mock setup
- Incorrect assumptions about types

**Always verify, regardless of perceived simplicity.**

### Don't Continue When Tests Fail

Failing tests compound:

- A mock issue in service tests affects store tests
- Fixing services later requires revisiting all dependent tests
- Time wasted on debugging cascading failures

**Fix failures immediately before proceeding.**

## Integration with Claude's Todo Feature

When using Claude for multi-file testing:

1. **Ask Claude to create a todo list** before starting
2. **Request one file at a time** or ensure Claude processes incrementally
3. **Verify each test passes** before asking for the next
4. **Mark todos complete** as you progress

Example prompt:

```
Test all files in `src/services/`.
First, analyze the directory and create a todo list ordered by layer.
Then, process ONE file at a time, waiting for my confirmation that tests pass
before proceeding to the next.
```

## Summary Checklist

Before starting multi-file testing:

- [ ] Listed all files needing tests
- [ ] Ordered by layer (core → repo → service → store → composable → component)
- [ ] Created todo list for tracking
- [ ] Understand dependencies between files

During testing:

- [ ] Processing ONE file at a time
- [ ] Running tests after EACH file
- [ ] Fixing failures BEFORE proceeding
- [ ] Updating todo list progress

After completion:

- [ ] All individual tests pass
- [ ] Full directory test run passes
- [ ] Todo list shows all complete
