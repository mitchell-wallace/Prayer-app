# Common Testing Patterns (Vue Test Utils)

## Component Testing Approaches

### Shallow Unit Tests (Default)

Use `shallowMount` for most component tests. Child components are stubbed automatically.

```typescript
import { shallowMount } from '@vue/test-utils'
import MyComponent from '@/components/MyComponent.vue'

// Child components rendered as stubs
const wrapper = shallowMount(MyComponent, {
  props: { title: 'Test' }
})
```

**When to use**: Testing component logic in isolation, most unit tests.

### Integration Tests

Use `mount` when testing component hierarchy interactions.

```typescript
import { mount } from '@vue/test-utils'
import ParentComponent from '@/components/ParentComponent.vue'

// Child components fully rendered
const wrapper = mount(ParentComponent)
```

**When to use**: Testing parent-child interactions, slot content, nested behavior.

## Query Patterns

### Finding Elements

```typescript
// By CSS selector
wrapper.find('button')
wrapper.find('.my-class')
wrapper.find('[data-testid="submit"]')

// Check existence
expect(wrapper.find('button').exists()).toBe(true)
expect(wrapper.find('.missing').exists()).toBe(false)

// Find all matching elements
const buttons = wrapper.findAll('button')
expect(buttons).toHaveLength(3)
```

### Finding Components

```typescript
import ChildComponent from '@/components/ChildComponent.vue'

// Find child component
const child = wrapper.findComponent(ChildComponent)
expect(child.exists()).toBe(true)

// Find by name (for stubbed components)
const stubbed = wrapper.findComponent({ name: 'ChildComponent' })
```

### Text Content

```typescript
// Get all text content
expect(wrapper.text()).toContain('Hello')

// Check specific element text
expect(wrapper.find('h1').text()).toBe('Title')
```

### Attributes and Classes

```typescript
// Check attributes
expect(wrapper.find('button').attributes('disabled')).toBeDefined()
expect(wrapper.find('input').attributes('type')).toBe('text')

// Check classes
expect(wrapper.classes()).toContain('active')
expect(wrapper.find('div').classes('highlighted')).toBe(true)
```

## Event Handling Patterns

### Trigger Events

```typescript
// Click
await wrapper.find('button').trigger('click')

// Input events
await wrapper.find('input').trigger('input')
await wrapper.find('input').trigger('focus')
await wrapper.find('input').trigger('blur')

// Keyboard events
await wrapper.find('input').trigger('keydown', { key: 'Enter' })
await wrapper.find('input').trigger('keyup.enter')

// Form submission
await wrapper.find('form').trigger('submit.prevent')
```

### Set Input Values

```typescript
// Set input value
await wrapper.find('input').setValue('new value')

// Set checkbox/radio
await wrapper.find('input[type="checkbox"]').setValue(true)

// Set select value
await wrapper.find('select').setValue('option-value')
```

### Check Emitted Events

```typescript
// Trigger action that emits
await wrapper.find('button').trigger('click')

// Check event was emitted
expect(wrapper.emitted('submit')).toBeTruthy()
expect(wrapper.emitted('submit')).toHaveLength(1)

// Check event payload
expect(wrapper.emitted('submit')![0]).toEqual([{ id: '123' }])

// Check event not emitted
expect(wrapper.emitted('cancel')).toBeFalsy()
```

## Component State Testing

### Testing Props

```typescript
describe('Props', () => {
  it('should render with title prop', () => {
    const wrapper = shallowMount(MyComponent, {
      props: { title: 'Test Title' }
    })
    expect(wrapper.text()).toContain('Test Title')
  })

  it('should apply disabled state', () => {
    const wrapper = shallowMount(Button, {
      props: { disabled: true }
    })
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})
```

### Testing Computed Properties

```typescript
it('should compute fullName correctly', () => {
  const wrapper = shallowMount(UserCard, {
    props: { firstName: 'John', lastName: 'Doe' }
  })

  // Access computed via vm
  expect(wrapper.vm.fullName).toBe('John Doe')

  // Or test via rendered output
  expect(wrapper.text()).toContain('John Doe')
})
```

### Testing Reactive State

```typescript
it('should update count on increment', async () => {
  const wrapper = shallowMount(Counter)

  // Initial state
  expect(wrapper.text()).toContain('Count: 0')

  // Trigger state change
  await wrapper.find('button').trigger('click')

  // Updated state reflected in DOM
  expect(wrapper.text()).toContain('Count: 1')
})
```

## Conditional Rendering Testing

```typescript
describe('Conditional Rendering', () => {
  it('should show loading state', () => {
    const wrapper = shallowMount(DataDisplay, {
      props: { isLoading: true }
    })

    expect(wrapper.find('.loading').exists()).toBe(true)
    expect(wrapper.find('.content').exists()).toBe(false)
  })

  it('should show error state', () => {
    const wrapper = shallowMount(DataDisplay, {
      props: { error: 'Failed to load' }
    })

    expect(wrapper.find('.error').exists()).toBe(true)
    expect(wrapper.text()).toContain('Failed to load')
  })

  it('should show data when loaded', () => {
    const wrapper = shallowMount(DataDisplay, {
      props: { data: { name: 'Test' } }
    })

    expect(wrapper.find('.content').exists()).toBe(true)
    expect(wrapper.text()).toContain('Test')
  })

  it('should show empty state', () => {
    const wrapper = shallowMount(DataDisplay, {
      props: { data: [] }
    })

    expect(wrapper.text()).toContain('No items')
  })
})
```

## List Rendering Testing

```typescript
describe('List Rendering', () => {
  const items = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
    { id: '3', name: 'Item 3' },
  ]

  it('should render all items', () => {
    const wrapper = shallowMount(ItemList, {
      props: { items }
    })

    const listItems = wrapper.findAll('li')
    expect(listItems).toHaveLength(3)

    items.forEach(item => {
      expect(wrapper.text()).toContain(item.name)
    })
  })

  it('should handle item click', async () => {
    const wrapper = shallowMount(ItemList, {
      props: { items }
    })

    await wrapper.findAll('li')[1].trigger('click')

    expect(wrapper.emitted('select')).toBeTruthy()
    expect(wrapper.emitted('select')![0]).toEqual([items[1]])
  })

  it('should handle empty list', () => {
    const wrapper = shallowMount(ItemList, {
      props: { items: [] }
    })

    expect(wrapper.text()).toContain('No items')
  })
})
```

## Slot Testing

```typescript
describe('Slots', () => {
  it('should render default slot', () => {
    const wrapper = shallowMount(Card, {
      slots: {
        default: '<p>Card content</p>'
      }
    })

    expect(wrapper.text()).toContain('Card content')
  })

  it('should render named slots', () => {
    const wrapper = shallowMount(Modal, {
      slots: {
        header: '<h2>Modal Title</h2>',
        default: '<p>Modal body</p>',
        footer: '<button>Close</button>'
      }
    })

    expect(wrapper.find('h2').text()).toBe('Modal Title')
    expect(wrapper.text()).toContain('Modal body')
  })

  it('should render scoped slots', () => {
    const wrapper = shallowMount(DataList, {
      props: { items: [{ id: 1, name: 'Test' }] },
      slots: {
        item: `<template #item="{ item }">
          <span>{{ item.name }}</span>
        </template>`
      }
    })

    expect(wrapper.text()).toContain('Test')
  })
})
```

## Form Testing

```typescript
describe('Form', () => {
  it('should submit valid form', async () => {
    const wrapper = shallowMount(LoginForm)

    await wrapper.find('input[name="email"]').setValue('test@example.com')
    await wrapper.find('input[name="password"]').setValue('password123')
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')![0]).toEqual([{
      email: 'test@example.com',
      password: 'password123',
    }])
  })

  it('should show validation errors', async () => {
    const wrapper = shallowMount(LoginForm)

    // Submit empty form
    await wrapper.find('form').trigger('submit.prevent')

    expect(wrapper.text()).toContain('Email is required')
  })

  it('should disable submit while processing', async () => {
    const wrapper = shallowMount(LoginForm, {
      props: { isSubmitting: true }
    })

    expect(wrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined()
  })
})
```

## Data-Driven Tests with test.each

```typescript
describe('StatusBadge', () => {
  test.each([
    ['success', 'badge-success'],
    ['warning', 'badge-warning'],
    ['error', 'badge-error'],
    ['info', 'badge-info'],
  ])('should apply correct class for %s status', (status, expectedClass) => {
    const wrapper = shallowMount(StatusBadge, {
      props: { status }
    })

    expect(wrapper.classes()).toContain(expectedClass)
  })

  test.each([
    { input: null, expected: 'Unknown' },
    { input: undefined, expected: 'Unknown' },
    { input: '', expected: 'Unknown' },
  ])('should show fallback for invalid input: $input', ({ input, expected }) => {
    const wrapper = shallowMount(StatusBadge, {
      props: { status: input }
    })

    expect(wrapper.text()).toContain(expected)
  })
})
```

## Debugging Tips

```typescript
// Print wrapper HTML
console.log(wrapper.html())

// Print specific element
console.log(wrapper.find('button').html())

// Check component data
console.log(wrapper.vm.$data)

// Check component props
console.log(wrapper.props())

// List all emitted events
console.log(wrapper.emitted())
```

## Common Mistakes to Avoid

### Don't Test Implementation Details

```typescript
// ❌ Bad - testing internal state
expect(wrapper.vm.isOpen).toBe(true)

// ✅ Good - testing observable behavior
expect(wrapper.find('.modal').exists()).toBe(true)
```

### Don't Forget to Await

```typescript
// ❌ Bad - not awaiting async operations
wrapper.find('button').trigger('click')
expect(wrapper.text()).toContain('Updated')

// ✅ Good - await trigger and DOM update
await wrapper.find('button').trigger('click')
expect(wrapper.text()).toContain('Updated')
```

### Don't Check Non-Existent Elements Directly

```typescript
// ❌ Bad - throws if element doesn't exist
expect(wrapper.find('.error').text()).toBe('')

// ✅ Good - check existence first
expect(wrapper.find('.error').exists()).toBe(false)
```

### Don't Use Hardcoded Classes for Business Logic

```typescript
// ❌ Bad - brittle, breaks if styling changes
expect(wrapper.find('.bg-red-500').exists()).toBe(true)

// ✅ Good - test semantic meaning
expect(wrapper.find('[data-status="error"]').exists()).toBe(true)
// Or test the actual behavior
expect(wrapper.text()).toContain('Error occurred')
```
