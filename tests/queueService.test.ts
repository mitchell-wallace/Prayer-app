import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { DEFAULT_QUEUE_CONFIG, createCycleState, pickNextFromCycle } from '../src/core/queueAlgorithm';
import type { Priority } from '../src/core/types';
import {
  buildProgressDots,
  canGoNext,
  canGoPrevious,
  createQueueState,
  getCurrentItem,
  insertRequest,
  navigateToIndex,
  nextCard,
  previousCard,
  removeRequestFromQueue,
  resetFeed,
} from '../src/services/queueEngine';
import { makeRequest, MS_PER_DAY } from './fixtures/requests';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-19T00:00:00Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

test('builds a cycle without repeats and starts a new cycle when needed', () => {
  const now = Date.now();
  const activeRequests = [
    makeRequest({ id: 'a', priority: 'urgent', createdAt: now - MS_PER_DAY }),
    makeRequest({ id: 'b', priority: 'high', createdAt: now - 2 * MS_PER_DAY }),
    makeRequest({ id: 'c', priority: 'medium', createdAt: now - 3 * MS_PER_DAY }),
  ];

  const queue = createQueueState();
  resetFeed(queue, activeRequests, { now: () => Date.now() });

  const ids = queue.renderQueue.map((item) => item.request.id);
  const firstCycleIds = ids.slice(0, 3);
  expect(new Set(firstCycleIds).size).toBe(3);
  expect(queue.renderQueue[0].cycle).toBe(0);
  expect(queue.renderQueue[3].cycle).toBe(1);
});

test('interleaves urgent and high when scores are within the window', () => {
  const now = Date.now();
  const prayedLongAgo = now - 20 * MS_PER_DAY;
  const activeRequests = [
    makeRequest({ id: 'u1', priority: 'urgent', prayedAt: [prayedLongAgo] }),
    makeRequest({ id: 'h1', priority: 'high', prayedAt: [prayedLongAgo] }),
  ];

  const queue = createQueueState();
  resetFeed(queue, activeRequests, { now: () => Date.now() });

  const firstTwo = queue.renderQueue.slice(0, 2).map((item) => item.request.id);
  expect(firstTwo).toEqual(['u1', 'h1']);
});

test.each<Priority>([
  'urgent',
  'high',
  'medium',
  'low',
])('orders never-prayed requests ahead of recently-prayed ones (%s)', (priority) => {
  const now = Date.now();
  const activeRequests = [
    makeRequest({ id: 'never', priority, prayedAt: [] }),
    makeRequest({ id: 'recent', priority, prayedAt: [now - MS_PER_DAY] }),
  ];

  const queue = createQueueState();
  resetFeed(queue, activeRequests, { now: () => Date.now() });

  const first = queue.renderQueue[0]?.request.id;
  expect(first).toBe('never');
});

test('respects max-run-length of 3 to prevent priority streaks', () => {
  const now = Date.now();
  const prayedLongAgo = now - 30 * MS_PER_DAY;

  const activeRequests = [
    makeRequest({ id: 'u1', priority: 'urgent', prayedAt: [prayedLongAgo] }),
    makeRequest({ id: 'u2', priority: 'urgent', prayedAt: [prayedLongAgo] }),
    makeRequest({ id: 'u3', priority: 'urgent', prayedAt: [prayedLongAgo] }),
    makeRequest({ id: 'u4', priority: 'urgent', prayedAt: [prayedLongAgo] }),
    makeRequest({ id: 'h1', priority: 'high', prayedAt: [prayedLongAgo] }),
    makeRequest({ id: 'h2', priority: 'high', prayedAt: [prayedLongAgo] }),
  ];

  const queue = createQueueState();
  resetFeed(queue, activeRequests, { now: () => Date.now() });

  const priorities = queue.renderQueue.slice(0, 6).map((item) => item.request.priority);

  let maxConsecutive = 0;
  let current = 0;
  for (const p of priorities) {
    if (p === 'urgent') {
      current += 1;
      maxConsecutive = Math.max(maxConsecutive, current);
    } else {
      current = 0;
    }
  }

  expect(maxConsecutive).toBeLessThanOrEqual(3);
});

test('throws when queue config omits a priority', () => {
  const activeRequests = [makeRequest({ id: 'only', priority: 'urgent' })];
  const config = {
    ...DEFAULT_QUEUE_CONFIG,
    priorityOrder: ['urgent', 'high', 'medium'] as Priority[],
  };

  const queue = createQueueState();

  expect(() => resetFeed(queue, activeRequests, { now: () => Date.now(), config })).toThrow(/priorityOrder/i);
});

test('throws when queue config sets a priority weight to zero', () => {
  const activeRequests = [makeRequest({ id: 'only', priority: 'urgent' })];
  const config = {
    ...DEFAULT_QUEUE_CONFIG,
    priorityWeights: { ...DEFAULT_QUEUE_CONFIG.priorityWeights, low: 0 },
  };

  const queue = createQueueState();

  expect(() => resetFeed(queue, activeRequests, { now: () => Date.now(), config })).toThrow(/priorityWeights/i);
});

test('throws when queue config has duplicate priorities', () => {
  const config = {
    ...DEFAULT_QUEUE_CONFIG,
    priorityOrder: ['urgent', 'high', 'medium', 'low', 'urgent'] as Priority[],
  };

  expect(() => createCycleState([], { config })).toThrow(/duplicate/i);
});

test('throws when queue config uses invalid priority set', () => {
  const config = {
    ...DEFAULT_QUEUE_CONFIG,
    priorityOrder: ['urgent', 'high', 'medium', 'invalid'] as Priority[],
  };

  expect(() => createCycleState([], { config })).toThrow(/priorityOrder/i);
});

test('throws when queue config sets interleave weights to zero', () => {
  const config = {
    ...DEFAULT_QUEUE_CONFIG,
    interleaveWeights: { ...DEFAULT_QUEUE_CONFIG.interleaveWeights, high: 0 },
  };

  expect(() => createCycleState([], { config })).toThrow(/interleaveWeights/i);
});

test('pickNextFromCycle respects max run length', () => {
  const now = Date.now();
  const requests = [
    makeRequest({ id: 'u1', priority: 'urgent', prayedAt: [now - MS_PER_DAY] }),
    makeRequest({ id: 'u2', priority: 'urgent', prayedAt: [now - MS_PER_DAY] }),
    makeRequest({ id: 'u3', priority: 'urgent', prayedAt: [now - MS_PER_DAY] }),
    makeRequest({ id: 'h1', priority: 'high', prayedAt: [now - MS_PER_DAY] }),
    makeRequest({ id: 'h2', priority: 'high', prayedAt: [now - MS_PER_DAY] }),
    makeRequest({ id: 'h3', priority: 'high', prayedAt: [now - MS_PER_DAY] }),
  ];
  const config = {
    ...DEFAULT_QUEUE_CONFIG,
    maxRunLength: 2,
    priorityWeights: { urgent: 1, high: 1, medium: 1, low: 1 },
  };
  const state = createCycleState(requests, { now, config });

  const priorities: Priority[] = [];
  for (let i = 0; i < 6; i += 1) {
    const next = pickNextFromCycle(state);
    if (next) priorities.push(next.priority);
  }

  let maxRun = 0;
  let currentRun = 0;
  let last: Priority | null = null;
  for (const priority of priorities) {
    if (priority === last) {
      currentRun += 1;
    } else {
      currentRun = 1;
      last = priority;
    }
    maxRun = Math.max(maxRun, currentRun);
  }
  expect(maxRun).toBeLessThanOrEqual(2);
});

test('pickNextFromCycle uses interleave window across priorities', () => {
  const now = Date.now();
  const requests = [
    makeRequest({ id: 'urgent', priority: 'urgent', prayedAt: [now - MS_PER_DAY] }),
    makeRequest({ id: 'high', priority: 'high', prayedAt: [now - MS_PER_DAY] }),
  ];
  const config = {
    ...DEFAULT_QUEUE_CONFIG,
    priorityOrder: ['high', 'urgent', 'medium', 'low'] as Priority[],
    priorityWeights: { urgent: 1, high: 1, medium: 1, low: 1 },
    interleaveWeights: { urgent: 1, high: 1, medium: 1, low: 1 },
    interleaveWindow: 0.5,
  };
  const state = createCycleState(requests, { now, config });
  const picked = pickNextFromCycle(state);
  expect(picked?.priority).toBe('high');
});

test('createCycleState respects configured priority order', () => {
  const config = {
    ...DEFAULT_QUEUE_CONFIG,
    priorityOrder: ['low', 'medium', 'high', 'urgent'] as Priority[],
    interleaveWeights: { urgent: 1, high: 1, medium: 1, low: 1 },
  };
  const state = createCycleState([], { config });
  expect(state.priorityOrder).toEqual(config.priorityOrder);
  expect(state.deck).toEqual(config.priorityOrder);
});

test('getCurrentItem returns null for empty queue', () => {
  const queue = createQueueState();
  expect(getCurrentItem(queue)).toBeNull();
});

test('getCurrentItem returns item at currentIndex', () => {
  const queue = createQueueState();
  queue.renderQueue = [{ request: makeRequest({ id: 'a' }), cycle: 0 }];
  expect(getCurrentItem(queue)?.request.id).toBe('a');
});

test('canGoPrevious is false at index 0 and true after moving', () => {
  const queue = createQueueState();
  queue.renderQueue = [
    { request: makeRequest({ id: 'a' }), cycle: 0 },
    { request: makeRequest({ id: 'b' }), cycle: 0 },
  ];
  queue.currentIndex = 0;
  expect(canGoPrevious(queue)).toBe(false);
  queue.currentIndex = 1;
  expect(canGoPrevious(queue)).toBe(true);
});

test('canGoNext returns false with single item and true with multiple items', () => {
  const queue = createQueueState();
  queue.renderQueue = [{ request: makeRequest({ id: 'a' }), cycle: 0 }];
  expect(canGoNext(queue)).toBe(false);
  queue.renderQueue.push({ request: makeRequest({ id: 'b' }), cycle: 0 });
  expect(canGoNext(queue)).toBe(true);
});

test('buildProgressDots always returns seven dots', () => {
  const queue = createQueueState();
  queue.renderQueue = [
    { request: makeRequest({ id: 'a' }), cycle: 0 },
    { request: makeRequest({ id: 'b' }), cycle: 0 },
  ];
  const dots = buildProgressDots(queue);
  expect(dots).toHaveLength(7);
});

test('buildProgressDots marks the current item correctly', () => {
  const queue = createQueueState();
  queue.renderQueue = [
    { request: makeRequest({ id: 'a' }), cycle: 0 },
    { request: makeRequest({ id: 'b' }), cycle: 0 },
    { request: makeRequest({ id: 'c' }), cycle: 0 },
  ];
  queue.currentIndex = 1;
  const dots = buildProgressDots(queue);
  expect(dots.some((dot) => dot.index === 1 && dot.isCurrent)).toBe(true);
});

test('previousCard decrements index and stops at 0', () => {
  const queue = createQueueState();
  queue.renderQueue = [
    { request: makeRequest({ id: 'a' }), cycle: 0 },
    { request: makeRequest({ id: 'b' }), cycle: 0 },
  ];
  queue.currentIndex = 1;
  previousCard(queue);
  expect(queue.currentIndex).toBe(0);
  previousCard(queue);
  expect(queue.currentIndex).toBe(0);
});

test('nextCard increments index', () => {
  const queue = createQueueState();
  queue.renderQueue = [
    { request: makeRequest({ id: 'a' }), cycle: 0 },
    { request: makeRequest({ id: 'b' }), cycle: 0 },
  ];
  nextCard(queue, []);
  expect(queue.currentIndex).toBe(1);
});

test('nextCard loads more when near end', () => {
  const now = Date.now();
  const requests = [
    makeRequest({ id: 'a', createdAt: now - MS_PER_DAY }),
    makeRequest({ id: 'b', createdAt: now - 2 * MS_PER_DAY }),
    makeRequest({ id: 'c', createdAt: now - 3 * MS_PER_DAY }),
    makeRequest({ id: 'd', createdAt: now - 4 * MS_PER_DAY }),
    makeRequest({ id: 'e', createdAt: now - 5 * MS_PER_DAY }),
    makeRequest({ id: 'f', createdAt: now - 6 * MS_PER_DAY }),
    makeRequest({ id: 'g', createdAt: now - 7 * MS_PER_DAY }),
    makeRequest({ id: 'h', createdAt: now - 8 * MS_PER_DAY }),
  ];
  const queue = createQueueState();
  resetFeed(queue, requests, { now: () => Date.now() });
  queue.currentIndex = 4;
  const beforeLength = queue.renderQueue.length;
  nextCard(queue, requests, { now: () => Date.now() });
  expect(queue.currentIndex).toBe(5);
  expect(queue.renderQueue.length).toBeGreaterThan(beforeLength);
});

test('navigateToIndex jumps directly', () => {
  const now = Date.now();
  const requests = [
    makeRequest({ id: 'a', createdAt: now - MS_PER_DAY }),
    makeRequest({ id: 'b', createdAt: now - 2 * MS_PER_DAY }),
    makeRequest({ id: 'c', createdAt: now - 3 * MS_PER_DAY }),
    makeRequest({ id: 'd', createdAt: now - 4 * MS_PER_DAY }),
    makeRequest({ id: 'e', createdAt: now - 5 * MS_PER_DAY }),
    makeRequest({ id: 'f', createdAt: now - 6 * MS_PER_DAY }),
  ];
  const queue = createQueueState();
  resetFeed(queue, requests, { now: () => Date.now() });
  navigateToIndex(queue, 2, requests, { now: () => Date.now() });
  expect(queue.currentIndex).toBe(2);
});

test('removeRequestFromQueue filters all instances and adjusts index', () => {
  const queue = createQueueState();
  queue.renderQueue = [
    { request: makeRequest({ id: 'a' }), cycle: 0 },
    { request: makeRequest({ id: 'b' }), cycle: 0 },
    { request: makeRequest({ id: 'a' }), cycle: 1 },
  ];
  queue.currentIndex = 2;
  removeRequestFromQueue(queue, 'a');
  expect(queue.renderQueue).toHaveLength(1);
  expect(queue.renderQueue[0].request.id).toBe('b');
  expect(queue.currentIndex).toBe(0);
});

test('insertRequest places new request after current item', () => {
  const queue = createQueueState();
  queue.renderQueue = [
    { request: makeRequest({ id: 'a' }), cycle: 0 },
    { request: makeRequest({ id: 'b' }), cycle: 0 },
  ];
  queue.currentIndex = 0;
  insertRequest(queue, makeRequest({ id: 'c' }));
  expect(queue.renderQueue[1].request.id).toBe('c');
  expect(queue.currentIndex).toBe(0);
});

test('insertRequest handles empty queue', () => {
  const queue = createQueueState();
  insertRequest(queue, makeRequest({ id: 'first' }));
  expect(queue.renderQueue).toHaveLength(1);
  expect(queue.renderQueue[0].request.id).toBe('first');
  expect(queue.currentIndex).toBe(0);
});
