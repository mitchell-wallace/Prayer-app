# Layer-Based Mocking Guide

This guide covers mocking strategies for the layered architecture: Core → Repositories → Services → Stores → Components.

## Mocking Principle: Mock One Layer Down

Each layer should only mock its immediate dependencies. This ensures tests remain focused and maintainable.

| Layer Being Tested | What to Mock |
|--------------------|--------------|
| Core (`src/core/`) | Nothing - pure functions |
| Repositories (`src/repositories/`) | Database functions (`src/db/`) |
| Services (`src/services/`) | Repositories + time/id utilities |
| Stores (`src/stores/`) | Services only |
| Composables (`src/composables/`) | Stores if stateful |
| Components (`src/components/`) | Stores and services |

## Core Layer - No Mocking

Core functions are pure and have no dependencies. Test them directly.

```typescript
// src/core/validation.ts - Pure function
export function validateTitle(title: string): boolean {
  return title.length >= 3 && title.length <= 100
}

// tests/core/validation.test.ts
import { describe, it, expect } from 'vitest'
import { validateTitle } from '@/core/validation'

describe('validateTitle', () => {
  it('should return true for valid title', () => {
    expect(validateTitle('Valid Title')).toBe(true)
  })

  it('should return false for short title', () => {
    expect(validateTitle('Hi')).toBe(false)
  })

  it('should return false for too long title', () => {
    expect(validateTitle('a'.repeat(101))).toBe(false)
  })
})
```

## Repository Layer - Mock Database

Repositories interact with the database layer. Use the test utilities provided.

```typescript
// tests/repositories/requestsRepository.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { clearDbCache, resetDbForTests } from '@/db/database'
import { getAll, save, remove } from '@/repositories/requestsRepository'
import type { PrayerRequest } from '@/core/types'

beforeEach(async () => {
  await resetDbForTests()
  clearDbCache()
})

afterEach(() => {
  clearDbCache()
})

describe('requestsRepository', () => {
  it('should save and retrieve a request', async () => {
    const request: PrayerRequest = {
      id: 'test-1',
      title: 'Test Request',
      // ... other fields
    }

    await save(request)
    clearDbCache() // Force reload from persistent storage

    const all = await getAll()
    expect(all.find(r => r.id === 'test-1')).toBeTruthy()
  })
})
```

## Service Layer - Mock Repositories

Services orchestrate business logic by calling repositories. Mock the repository layer.

```typescript
// tests/services/requestsService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the repository layer
vi.mock('@/repositories/requestsRepository', () => ({
  getAll: vi.fn(),
  getById: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}))

import * as requestsRepo from '@/repositories/requestsRepository'
import { createRequest, archiveRequest } from '@/services/requestsService'

const mockedRepo = vi.mocked(requestsRepo)

describe('requestsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createRequest', () => {
    it('should create and save a new request', async () => {
      mockedRepo.save.mockResolvedValue(undefined)

      const result = await createRequest({
        title: 'New Prayer',
        priority: 'high',
      })

      expect(mockedRepo.save).toHaveBeenCalledTimes(1)
      expect(result.title).toBe('New Prayer')
    })
  })

  describe('archiveRequest', () => {
    it('should update request status to archived', async () => {
      const existingRequest = {
        id: 'req-1',
        title: 'Test',
        status: 'active',
      }
      mockedRepo.getById.mockResolvedValue(existingRequest)
      mockedRepo.save.mockResolvedValue(undefined)

      await archiveRequest('req-1')

      expect(mockedRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'archived' })
      )
    })
  })
})
```

## Store Layer - Mock Services

Stores manage reactive state and delegate to services. Mock the service layer.

```typescript
// tests/stores/requestsStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock services BEFORE importing the store
vi.mock('@/services/requestsService', () => ({
  initRequests: vi.fn(),
  createRequest: vi.fn(),
  archiveRequest: vi.fn(),
  getActiveRequests: vi.fn(),
}))

import * as requestsService from '@/services/requestsService'
import { useRequestsStore } from '@/stores/requestsStore'

const mockedService = vi.mocked(requestsService)

describe('requestsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('init', () => {
    it('should call initRequests service on init', async () => {
      mockedService.initRequests.mockResolvedValue([
        { id: '1', title: 'Test', status: 'active' }
      ])

      const store = useRequestsStore()
      await store.init()

      expect(mockedService.initRequests).toHaveBeenCalled()
      expect(store.requests.value).toHaveLength(1)
    })
  })

  describe('createRequest', () => {
    it('should delegate to service and update local state', async () => {
      const newRequest = { id: 'new-1', title: 'New' }
      mockedService.createRequest.mockResolvedValue(newRequest)

      const store = useRequestsStore()
      await store.createRequest({ title: 'New', priority: 'high' })

      expect(mockedService.createRequest).toHaveBeenCalled()
    })
  })
})
```

## Component Layer - Mock Services/Stores

Components should mock the services or stores they depend on.

```typescript
// tests/components/RequestCard.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'

// Mock services used by the component
vi.mock('@/services/requestsService', () => ({
  archiveRequest: vi.fn(),
  recordPrayer: vi.fn(),
}))

import RequestCard from '@/components/cards/RequestCard.vue'
import * as requestsService from '@/services/requestsService'

const mockedService = vi.mocked(requestsService)

describe('RequestCard', () => {
  const mockRequest = {
    id: 'req-1',
    title: 'Test Prayer',
    priority: 'high',
    status: 'active',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render request title', () => {
    const wrapper = shallowMount(RequestCard, {
      props: { request: mockRequest }
    })

    expect(wrapper.text()).toContain('Test Prayer')
  })

  it('should call archiveRequest when archive button clicked', async () => {
    mockedService.archiveRequest.mockResolvedValue(undefined)

    const wrapper = shallowMount(RequestCard, {
      props: { request: mockRequest }
    })

    await wrapper.find('[data-testid="archive-btn"]').trigger('click')

    expect(mockedService.archiveRequest).toHaveBeenCalledWith('req-1')
  })
})
```

## Time and ID Injection Pattern

Instead of mocking `Date.now()` or `crypto.randomUUID()` globally, use dependency injection.

### Production Code Pattern

```typescript
// src/services/requestsService.ts
export function createRequest(
  payload: CreateRequestPayload,
  deps = { now: Date.now(), id: crypto.randomUUID() }
): PrayerRequest {
  return {
    id: deps.id,
    title: payload.title,
    priority: payload.priority,
    createdAt: deps.now,
    updatedAt: deps.now,
    status: 'active',
    // ...
  }
}
```

### Test Code Pattern

```typescript
// tests/services/requestsService.test.ts
describe('createRequest', () => {
  it('should create request with provided timestamp and id', () => {
    const result = createRequest(
      { title: 'Test', priority: 'high' },
      { now: 1609459200000, id: 'test-id-123' }
    )

    expect(result.id).toBe('test-id-123')
    expect(result.createdAt).toBe(1609459200000)
    expect(result.updatedAt).toBe(1609459200000)
  })
})
```

## Fake Timers for Time-Dependent Tests

For tests that depend on elapsed time, use Vitest's fake timers.

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Queue Service', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-19T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should order requests by time since last prayer', () => {
    const now = Date.now()

    // Advance time by 1 day
    vi.advanceTimersByTime(24 * 60 * 60 * 1000)

    const newNow = Date.now()
    expect(newNow - now).toBe(24 * 60 * 60 * 1000)
  })
})
```

## Mock Best Practices

### DO

1. **Mock one layer down** - Only mock immediate dependencies
2. **Clear mocks in beforeEach** - Ensures test isolation
3. **Use `vi.mocked()` for type safety** - Gets proper TypeScript types
4. **Inject time/id dependencies** - Prefer DI over global mocking

### DON'T

1. **Don't skip layers** - A store test shouldn't mock the database directly
2. **Don't mock within the same layer** - Test integration within a layer
3. **Don't mock pure functions** - Test them directly
4. **Don't use `any` types** - Maintain type safety in mocks

## Mock Decision Tree

```
What layer am I testing?
│
├─ Core (pure functions)
│  └─ NO MOCKING - test directly
│
├─ Repository
│  └─ Mock: db/database layer
│     Use: resetDbForTests(), clearDbCache()
│
├─ Service
│  └─ Mock: repositories
│     Use: vi.mock('@/repositories/...')
│
├─ Store
│  └─ Mock: services
│     Use: vi.mock('@/services/...')
│
├─ Composable
│  └─ Mock: stores (if stateful)
│     Or test the composable directly if it's pure
│
└─ Component
   └─ Mock: services and/or stores
      Use: vi.mock('@/services/...') or vi.mock('@/stores/...')
```

## Factory Functions for Test Data

Create reusable factory functions for consistent test data.

```typescript
// tests/factories/requestFactory.ts
import type { PrayerRequest, Priority } from '@/core/types'

export function createMockRequest(
  overrides: Partial<PrayerRequest> = {}
): PrayerRequest {
  const now = Date.now()
  return {
    id: 'mock-id-' + Math.random().toString(36).slice(2),
    title: 'Mock Prayer Request',
    priority: 'medium' as Priority,
    durationPreset: '10d',
    createdAt: now,
    expiresAt: now + 10 * 24 * 60 * 60 * 1000,
    status: 'active',
    prayedAt: [],
    notes: [],
    updatedAt: now,
    ...overrides,
  }
}

// Usage in tests
const highPriorityRequest = createMockRequest({
  priority: 'high',
  title: 'Urgent Prayer',
})
```
