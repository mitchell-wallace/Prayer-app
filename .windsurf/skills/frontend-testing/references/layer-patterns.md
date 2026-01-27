# Layer-Specific Testing Patterns

This guide covers testing patterns specific to each layer of the architecture.

## Core Layer Testing

Core functions are pure with no side effects. Test them directly without any mocking.

### Pure Function Testing

```typescript
// src/core/validation.ts
export function validateTitle(title: string): boolean {
  return title.trim().length >= 3 && title.trim().length <= 100
}

export function validatePriority(priority: string): priority is Priority {
  return ['urgent', 'high', 'medium', 'low'].includes(priority)
}
```

```typescript
// tests/core/validation.test.ts
import { describe, it, expect } from 'vitest'
import { validateTitle, validatePriority } from '@/core/validation'

describe('validateTitle', () => {
  it('should return true for valid title', () => {
    expect(validateTitle('Valid Title')).toBe(true)
  })

  it('should return false for title too short', () => {
    expect(validateTitle('Hi')).toBe(false)
  })

  it('should return false for title too long', () => {
    expect(validateTitle('a'.repeat(101))).toBe(false)
  })

  it('should trim whitespace before validation', () => {
    expect(validateTitle('   Valid   ')).toBe(true)
    expect(validateTitle('   Hi   ')).toBe(false)
  })

  it('should handle empty string', () => {
    expect(validateTitle('')).toBe(false)
  })
})

describe('validatePriority', () => {
  test.each(['urgent', 'high', 'medium', 'low'])(
    'should return true for valid priority: %s',
    (priority) => {
      expect(validatePriority(priority)).toBe(true)
    }
  )

  test.each(['invalid', '', 'URGENT', 'High'])(
    'should return false for invalid priority: %s',
    (priority) => {
      expect(validatePriority(priority)).toBe(false)
    }
  )
})
```

### Time/ID Injection Testing

```typescript
// src/core/recordFactory.ts
export function createRequestRecord(
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
    prayedAt: [],
    notes: [],
    expiresAt: computeExpiry(deps.now, payload.durationPreset),
    durationPreset: payload.durationPreset,
  }
}
```

```typescript
// tests/core/recordFactory.test.ts
describe('createRequestRecord', () => {
  it('should create record with injected timestamp and id', () => {
    const result = createRequestRecord(
      { title: 'Test', priority: 'high', durationPreset: '10d' },
      { now: 1609459200000, id: 'test-id-123' }
    )

    expect(result.id).toBe('test-id-123')
    expect(result.createdAt).toBe(1609459200000)
    expect(result.updatedAt).toBe(1609459200000)
  })

  it('should compute expiry based on duration preset', () => {
    const now = 1609459200000
    const result = createRequestRecord(
      { title: 'Test', priority: 'high', durationPreset: '10d' },
      { now, id: 'test-id' }
    )

    // 10 days = 10 * 24 * 60 * 60 * 1000 ms
    expect(result.expiresAt).toBe(now + 10 * 24 * 60 * 60 * 1000)
  })
})
```

## Repository Layer Testing

Repositories interact with the database. Test with the real database using test utilities.

```typescript
// tests/repositories/requestsRepository.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { clearDbCache, resetDbForTests } from '@/db/database'
import { getAll, getById, save, remove } from '@/repositories/requestsRepository'
import type { PrayerRequest } from '@/core/types'
import { computeExpiry } from '@/formatting/time'

beforeEach(async () => {
  await resetDbForTests()
  clearDbCache()
})

afterEach(() => {
  clearDbCache()
})

describe('requestsRepository', () => {
  const createTestRequest = (id: string): PrayerRequest => {
    const now = Date.now()
    return {
      id,
      title: `Test Request ${id}`,
      priority: 'high',
      durationPreset: '10d',
      createdAt: now,
      expiresAt: computeExpiry(now, '10d'),
      status: 'active',
      prayedAt: [],
      notes: [],
      updatedAt: now,
    }
  }

  describe('save and getAll', () => {
    it('should save and retrieve a request', async () => {
      const request = createTestRequest('test-1')

      await save(request)
      clearDbCache() // Force reload from persistent storage

      const all = await getAll()
      const saved = all.find(r => r.id === 'test-1')

      expect(saved).toBeTruthy()
      expect(saved!.title).toBe('Test Request test-1')
    })

    it('should update existing request', async () => {
      const request = createTestRequest('test-1')
      await save(request)

      const updated = { ...request, title: 'Updated Title' }
      await save(updated)
      clearDbCache()

      const all = await getAll()
      const saved = all.find(r => r.id === 'test-1')

      expect(saved!.title).toBe('Updated Title')
    })
  })

  describe('getById', () => {
    it('should return request by id', async () => {
      const request = createTestRequest('test-1')
      await save(request)
      clearDbCache()

      const result = await getById('test-1')

      expect(result).toBeTruthy()
      expect(result!.id).toBe('test-1')
    })

    it('should return undefined for non-existent id', async () => {
      const result = await getById('non-existent')

      expect(result).toBeUndefined()
    })
  })

  describe('remove', () => {
    it('should remove request by id', async () => {
      const request = createTestRequest('test-1')
      await save(request)

      await remove('test-1')
      clearDbCache()

      const all = await getAll()
      expect(all.find(r => r.id === 'test-1')).toBeUndefined()
    })
  })
})
```

## Service Layer Testing

Services orchestrate business logic. Mock the repository layer.

```typescript
// tests/services/requestsService.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/repositories/requestsRepository', () => ({
  getAll: vi.fn(),
  getById: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
}))

import * as repo from '@/repositories/requestsRepository'
import {
  initRequests,
  createRequest,
  archiveRequest,
  recordPrayer,
} from '@/services/requestsService'

const mockedRepo = vi.mocked(repo)

describe('requestsService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initRequests', () => {
    it('should return all requests from repository', async () => {
      const mockRequests = [
        { id: '1', title: 'Request 1', status: 'active' },
        { id: '2', title: 'Request 2', status: 'active' },
      ]
      mockedRepo.getAll.mockResolvedValue(mockRequests)

      const result = await initRequests()

      expect(mockedRepo.getAll).toHaveBeenCalled()
      expect(result).toEqual(mockRequests)
    })
  })

  describe('createRequest', () => {
    it('should create and save new request', async () => {
      mockedRepo.save.mockResolvedValue(undefined)

      const result = await createRequest(
        { title: 'New Prayer', priority: 'high', durationPreset: '10d' },
        { now: 1609459200000, id: 'new-id' }
      )

      expect(mockedRepo.save).toHaveBeenCalledTimes(1)
      expect(result.id).toBe('new-id')
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

    it('should throw if request not found', async () => {
      mockedRepo.getById.mockResolvedValue(undefined)

      await expect(archiveRequest('non-existent')).rejects.toThrow()
    })
  })

  describe('recordPrayer', () => {
    it('should add timestamp to prayedAt array', async () => {
      const existingRequest = {
        id: 'req-1',
        prayedAt: [1000000],
      }
      mockedRepo.getById.mockResolvedValue(existingRequest)
      mockedRepo.save.mockResolvedValue(undefined)

      await recordPrayer('req-1', 2000000)

      expect(mockedRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          prayedAt: [1000000, 2000000],
        })
      )
    })
  })
})
```

## Store Layer Testing

Stores manage reactive state. Mock the service layer.

```typescript
// tests/stores/requestsStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/requestsService', () => ({
  initRequests: vi.fn(),
  createRequest: vi.fn(),
  archiveRequest: vi.fn(),
  recordPrayer: vi.fn(),
}))

import * as service from '@/services/requestsService'
import { useRequestsStore } from '@/stores/requestsStore'

const mockedService = vi.mocked(service)

describe('requestsStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('init', () => {
    it('should populate requests from service', async () => {
      const mockRequests = [
        { id: '1', title: 'Test', status: 'active' },
      ]
      mockedService.initRequests.mockResolvedValue(mockRequests)

      const store = useRequestsStore()
      await store.init()

      expect(mockedService.initRequests).toHaveBeenCalled()
      expect(store.requests.value).toEqual(mockRequests)
    })
  })

  describe('computed: activeRequests', () => {
    it('should filter to only active requests', async () => {
      const mockRequests = [
        { id: '1', status: 'active' },
        { id: '2', status: 'archived' },
        { id: '3', status: 'active' },
      ]
      mockedService.initRequests.mockResolvedValue(mockRequests)

      const store = useRequestsStore()
      await store.init()

      expect(store.activeRequests.value).toHaveLength(2)
      expect(store.activeRequests.value.map(r => r.id)).toEqual(['1', '3'])
    })
  })

  describe('createRequest', () => {
    it('should call service and add to local state', async () => {
      const newRequest = { id: 'new', title: 'New Request' }
      mockedService.createRequest.mockResolvedValue(newRequest)

      const store = useRequestsStore()
      store.requests.value = []

      await store.createRequest({ title: 'New Request', priority: 'high' })

      expect(mockedService.createRequest).toHaveBeenCalled()
      expect(store.requests.value).toContainEqual(newRequest)
    })
  })
})
```

## Composable Layer Testing

Test composables directly, mocking stores if they have stateful dependencies.

```typescript
// tests/composables/useModal.test.ts
import { describe, it, expect } from 'vitest'
import { useModal } from '@/composables/useModal'

describe('useModal', () => {
  it('should start closed by default', () => {
    const { isOpen } = useModal()

    expect(isOpen.value).toBe(false)
  })

  it('should start open when initialValue is true', () => {
    const { isOpen } = useModal(true)

    expect(isOpen.value).toBe(true)
  })

  it('should open modal', () => {
    const { isOpen, open } = useModal()

    open()

    expect(isOpen.value).toBe(true)
  })

  it('should close modal', () => {
    const { isOpen, close } = useModal(true)

    close()

    expect(isOpen.value).toBe(false)
  })

  it('should toggle modal state', () => {
    const { isOpen, toggle } = useModal()

    toggle()
    expect(isOpen.value).toBe(true)

    toggle()
    expect(isOpen.value).toBe(false)
  })
})
```

### Composable with Store Dependency

```typescript
// tests/composables/useRequestActions.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/requestsService', () => ({
  archiveRequest: vi.fn(),
  recordPrayer: vi.fn(),
}))

import * as service from '@/services/requestsService'
import { useRequestActions } from '@/composables/useRequestActions'

const mockedService = vi.mocked(service)

describe('useRequestActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call archiveRequest service', async () => {
    mockedService.archiveRequest.mockResolvedValue(undefined)

    const { archive } = useRequestActions()
    await archive('req-1')

    expect(mockedService.archiveRequest).toHaveBeenCalledWith('req-1')
  })
})
```

## Component Layer Testing

Use `shallowMount` for unit tests, mock services/stores.

```typescript
// tests/components/RequestCard.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { shallowMount } from '@vue/test-utils'

vi.mock('@/services/requestsService', () => ({
  archiveRequest: vi.fn(),
  recordPrayer: vi.fn(),
}))

import RequestCard from '@/components/cards/RequestCard.vue'
import * as service from '@/services/requestsService'

const mockedService = vi.mocked(service)

describe('RequestCard', () => {
  const mockRequest = {
    id: 'req-1',
    title: 'Test Prayer',
    priority: 'high',
    status: 'active',
    prayedAt: [],
    createdAt: Date.now(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render request title', () => {
      const wrapper = shallowMount(RequestCard, {
        props: { request: mockRequest }
      })

      expect(wrapper.text()).toContain('Test Prayer')
    })

    it('should show priority indicator', () => {
      const wrapper = shallowMount(RequestCard, {
        props: { request: mockRequest }
      })

      expect(wrapper.find('[data-priority="high"]').exists()).toBe(true)
    })
  })

  describe('User Interactions', () => {
    it('should call recordPrayer when pray button clicked', async () => {
      mockedService.recordPrayer.mockResolvedValue(undefined)

      const wrapper = shallowMount(RequestCard, {
        props: { request: mockRequest }
      })

      await wrapper.find('[data-testid="pray-btn"]').trigger('click')

      expect(mockedService.recordPrayer).toHaveBeenCalledWith('req-1', expect.any(Number))
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

  describe('Edge Cases', () => {
    it('should handle request with no prayers', () => {
      const wrapper = shallowMount(RequestCard, {
        props: { request: { ...mockRequest, prayedAt: [] } }
      })

      expect(wrapper.text()).toContain('Never prayed')
    })
  })
})
```

## Summary Table

| Layer | Test File Location | What to Mock | Key Patterns |
|-------|-------------------|--------------|--------------|
| Core | `tests/core/` | Nothing | Pure function tests, edge cases, DI |
| Repository | `tests/repositories/` | Database (use test utils) | CRUD operations, persistence |
| Service | `tests/services/` | Repositories | Orchestration, error handling |
| Store | `tests/stores/` | Services | Reactive state, computed props |
| Composable | `tests/composables/` | Stores (if needed) | State transitions, lifecycle |
| Component | `tests/components/` | Services/Stores | Rendering, props, events |
