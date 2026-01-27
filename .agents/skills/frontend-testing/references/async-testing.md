# Async Testing Guide (Vue)

## Core Async Patterns

### 1. Awaiting DOM Updates

Vue updates the DOM asynchronously. After triggering state changes, await the update.

```typescript
import { shallowMount } from '@vue/test-utils'

it('should update text after click', async () => {
  const wrapper = shallowMount(Counter)

  // Trigger the event (await handles DOM update)
  await wrapper.find('button').trigger('click')

  // DOM is now updated
  expect(wrapper.text()).toContain('Count: 1')
})
```

### 2. Using nextTick

For reactive state changes that need explicit waiting:

```typescript
import { nextTick } from 'vue'

it('should reflect reactive state change', async () => {
  const wrapper = shallowMount(Component)

  // Modify reactive state directly
  wrapper.vm.someReactiveValue = 'new value'

  // Wait for Vue to update DOM
  await nextTick()

  expect(wrapper.text()).toContain('new value')
})
```

### 3. Using flushPromises

For multiple async operations or promise chains:

```typescript
import { flushPromises } from '@vue/test-utils'

it('should load data and update display', async () => {
  const wrapper = shallowMount(DataComponent)

  // Wait for all pending promises to resolve
  await flushPromises()

  expect(wrapper.text()).toContain('Loaded Data')
})
```

### 4. Waiting for Conditions

Use `waitFor` from `@testing-library/dom` for eventual UI states:

```typescript
import { waitFor } from '@testing-library/dom'

it('should eventually show success message', async () => {
  const wrapper = shallowMount(AsyncForm)

  await wrapper.find('form').trigger('submit')

  await waitFor(() => {
    expect(wrapper.text()).toContain('Success')
  })
})
```

## Testing Computed Properties

Computed properties update reactively. Test them through the rendered output or via `vm`.

```typescript
describe('Computed Properties', () => {
  it('should compute fullName from props', () => {
    const wrapper = shallowMount(UserDisplay, {
      props: { firstName: 'John', lastName: 'Doe' }
    })

    // Via vm (direct access)
    expect(wrapper.vm.fullName).toBe('John Doe')

    // Via rendered output (preferred)
    expect(wrapper.text()).toContain('John Doe')
  })

  it('should update computed when props change', async () => {
    const wrapper = shallowMount(UserDisplay, {
      props: { firstName: 'John', lastName: 'Doe' }
    })

    await wrapper.setProps({ firstName: 'Jane' })

    expect(wrapper.vm.fullName).toBe('Jane Doe')
  })
})
```

## Testing Watchers

Watchers respond to reactive changes. Trigger the change and verify the effect.

```typescript
it('should fetch data when id prop changes', async () => {
  const wrapper = shallowMount(DataViewer, {
    props: { id: '1' }
  })

  await flushPromises()
  expect(wrapper.text()).toContain('Data for 1')

  await wrapper.setProps({ id: '2' })
  await flushPromises()

  expect(wrapper.text()).toContain('Data for 2')
})
```

## Fake Timers

### When to Use Fake Timers

- Testing components with `setTimeout`/`setInterval`
- Testing debounce/throttle behavior
- Testing delayed transitions
- Testing polling or retry logic

### Basic Fake Timer Setup

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Debounced Search', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should debounce search input', async () => {
    const wrapper = shallowMount(SearchInput, {
      props: { debounceMs: 300 }
    })

    // Type in the input
    await wrapper.find('input').setValue('query')

    // Search not called immediately
    expect(wrapper.emitted('search')).toBeFalsy()

    // Advance timers
    vi.advanceTimersByTime(300)

    // Now search is emitted
    expect(wrapper.emitted('search')).toBeTruthy()
  })
})
```

### Fake Timers with Vue Updates

```typescript
it('should show countdown timer', async () => {
  vi.useFakeTimers()

  const wrapper = shallowMount(Countdown, {
    props: { seconds: 10 }
  })

  expect(wrapper.text()).toContain('10')

  // Advance 5 seconds
  vi.advanceTimersByTime(5000)
  await nextTick()

  expect(wrapper.text()).toContain('5')

  vi.useRealTimers()
})
```

### Common Fake Timer Utilities

```typescript
// Run all pending timers
vi.runAllTimers()

// Run only pending timers (not new ones created during execution)
vi.runOnlyPendingTimers()

// Advance by specific time
vi.advanceTimersByTime(1000)

// Set specific system time
vi.setSystemTime(new Date('2026-01-19T00:00:00Z'))

// Clear all timers
vi.clearAllTimers()
```

## Service/Repository Async Testing

### Testing Async Service Methods

```typescript
describe('requestsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create and save request', async () => {
    mockedRepo.save.mockResolvedValue(undefined)

    const result = await createRequest({ title: 'Test', priority: 'high' })

    expect(result.title).toBe('Test')
    expect(mockedRepo.save).toHaveBeenCalled()
  })

  it('should handle save failure', async () => {
    mockedRepo.save.mockRejectedValue(new Error('Database error'))

    await expect(
      createRequest({ title: 'Test', priority: 'high' })
    ).rejects.toThrow('Database error')
  })
})
```

### Testing Loading States

```typescript
it('should show loading while fetching', async () => {
  // Mock that never resolves to keep in loading state
  mockedService.fetchData.mockImplementation(
    () => new Promise(() => {})
  )

  const wrapper = shallowMount(DataDisplay)

  expect(wrapper.find('.loading').exists()).toBe(true)
  expect(wrapper.find('.content').exists()).toBe(false)
})

it('should show data after loading', async () => {
  mockedService.fetchData.mockResolvedValue({ items: ['Item 1'] })

  const wrapper = shallowMount(DataDisplay)

  await flushPromises()

  expect(wrapper.find('.loading').exists()).toBe(false)
  expect(wrapper.text()).toContain('Item 1')
})
```

## Composable Async Testing

Testing composables with async behavior:

```typescript
import { ref } from 'vue'

describe('useAsyncData', () => {
  it('should fetch and return data', async () => {
    const { data, loading, error, fetch } = useAsyncData()

    expect(loading.value).toBe(false)
    expect(data.value).toBeNull()

    // Start fetch
    const fetchPromise = fetch('some-id')
    expect(loading.value).toBe(true)

    // Wait for completion
    await fetchPromise

    expect(loading.value).toBe(false)
    expect(data.value).toBeDefined()
    expect(error.value).toBeNull()
  })

  it('should handle fetch error', async () => {
    mockedApi.fetchData.mockRejectedValue(new Error('Network error'))

    const { error, fetch } = useAsyncData()

    await fetch('some-id')

    expect(error.value).toBe('Network error')
  })
})
```

## Common Async Pitfalls

### Don't Forget to Await

```typescript
// ❌ Bad - test may pass even if assertion fails
it('should update after click', () => {
  const wrapper = shallowMount(Counter)
  wrapper.find('button').trigger('click')
  expect(wrapper.text()).toContain('1')
})

// ✅ Good - properly awaited
it('should update after click', async () => {
  const wrapper = shallowMount(Counter)
  await wrapper.find('button').trigger('click')
  expect(wrapper.text()).toContain('1')
})
```

### Don't Mix Fake Timers with Real Promises Incorrectly

```typescript
// ❌ Bad - fake timers don't advance real promises
vi.useFakeTimers()
await someAsyncFunction() // May hang

// ✅ Good - use flushPromises with fake timers
vi.useFakeTimers()
const promise = someAsyncFunction()
vi.runAllTimers()
await flushPromises()
```

### Don't Forget to Restore Real Timers

```typescript
// ❌ Bad - may affect other tests
describe('Timer tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  // Missing afterEach cleanup!
})

// ✅ Good - always restore
describe('Timer tests', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})
```

### Don't Over-Await

```typescript
// ❌ Unnecessary - trigger returns after DOM update
await wrapper.find('button').trigger('click')
await nextTick() // Redundant!

// ✅ Good - trigger handles the update
await wrapper.find('button').trigger('click')
```

## Testing Lifecycle Hooks

### onMounted

```typescript
it('should fetch data on mount', async () => {
  mockedService.fetchData.mockResolvedValue({ data: 'test' })

  const wrapper = shallowMount(DataComponent)

  await flushPromises()

  expect(mockedService.fetchData).toHaveBeenCalled()
  expect(wrapper.text()).toContain('test')
})
```

### onUnmounted (Cleanup)

```typescript
it('should cleanup on unmount', () => {
  const unsubscribe = vi.fn()
  mockedService.subscribe.mockReturnValue(unsubscribe)

  const wrapper = shallowMount(SubscriptionComponent)

  expect(mockedService.subscribe).toHaveBeenCalled()

  wrapper.unmount()

  expect(unsubscribe).toHaveBeenCalled()
})
```

### Watch Effect Cleanup

```typescript
it('should cancel pending request on new request', async () => {
  const abortController = { abort: vi.fn() }
  vi.spyOn(global, 'AbortController').mockReturnValue(abortController)

  const wrapper = shallowMount(DataViewer, {
    props: { id: '1' }
  })

  // Trigger new request before first completes
  await wrapper.setProps({ id: '2' })

  expect(abortController.abort).toHaveBeenCalled()
})
```

## Summary: When to Use Each Pattern

| Scenario | Pattern |
|----------|---------|
| After `trigger()` | Already handled, just `await trigger()` |
| After `setProps()` | Already handled, just `await setProps()` |
| After changing `vm` state directly | `await nextTick()` |
| After async operations (API calls) | `await flushPromises()` |
| Waiting for condition | `await waitFor(() => expect(...))` |
| Testing timeouts/intervals | `vi.useFakeTimers()` + `vi.advanceTimersByTime()` |
| Testing debounce/throttle | `vi.useFakeTimers()` |
