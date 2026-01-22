import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { DEFAULT_QUEUE_CONFIG } from '../src/core/queueAlgorithm';
import type { PrayerRequest, Priority } from '../src/core/types';
import { createQueueState, resetFeed } from '../src/services/queueEngine';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

type RequestSeed = {
  id: string;
  priority?: Priority;
  createdAt?: number;
  prayedAt?: number[];
};

function makeRequest({ id, priority = 'urgent', createdAt, prayedAt = [] }: RequestSeed): PrayerRequest {
  const baseTime = createdAt ?? Date.now();
  return {
    id,
    title: id,
    priority,
    durationPreset: '10d',
    createdAt: baseTime,
    expiresAt: baseTime + MS_PER_DAY,
    status: 'active',
    prayedAt,
    notes: [],
    updatedAt: baseTime,
  };
}

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
