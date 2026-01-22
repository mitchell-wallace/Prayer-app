import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ref } from 'vue';
import type { PrayerRequest, Priority } from '../src/core/types';
import { createQueueService } from '../src/services/queueService';

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
  const activeRequests = ref([
    makeRequest({ id: 'a', priority: 'urgent', createdAt: now - MS_PER_DAY }),
    makeRequest({ id: 'b', priority: 'high', createdAt: now - 2 * MS_PER_DAY }),
    makeRequest({ id: 'c', priority: 'medium', createdAt: now - 3 * MS_PER_DAY }),
  ]);

  const queue = createQueueService(activeRequests, { now: () => Date.now() });
  queue.resetFeed();

  const ids = queue.renderQueue.value.map((item) => item.request.id);
  const firstCycleIds = ids.slice(0, 3);
  expect(new Set(firstCycleIds).size).toBe(3);
  expect(queue.renderQueue.value[0].cycle).toBe(0);
  expect(queue.renderQueue.value[3].cycle).toBe(1);
});

test('interleaves urgent and high when scores are within the window', () => {
  const now = Date.now();
  const prayedLongAgo = now - 20 * MS_PER_DAY;
  const activeRequests = ref([
    makeRequest({ id: 'u1', priority: 'urgent', prayedAt: [prayedLongAgo] }),
    makeRequest({ id: 'h1', priority: 'high', prayedAt: [prayedLongAgo] }),
  ]);

  const queue = createQueueService(activeRequests, { now: () => Date.now() });
  queue.resetFeed();

  const firstTwo = queue.renderQueue.value.slice(0, 2).map((item) => item.request.id);
  expect(firstTwo).toEqual(['u1', 'h1']);
});

test('orders higher-recency urgent requests ahead of very recent ones', () => {
  const now = Date.now();
  const activeRequests = ref([
    makeRequest({ id: 'recent', priority: 'urgent', prayedAt: [] }),
    makeRequest({ id: 'old', priority: 'urgent', prayedAt: [now - 10 * MS_PER_DAY] }),
  ]);

  const queue = createQueueService(activeRequests, { now: () => Date.now() });
  queue.resetFeed();

  const first = queue.renderQueue.value[0]?.request.id;
  expect(first).toBe('old');
});

test('treats never-prayed requests as oldest and thus highest priority', () => {
  const now = Date.now();
  const activeRequests = ref([
    makeRequest({ id: 'never', priority: 'medium', prayedAt: [] }),
    makeRequest({ id: 'yesterday', priority: 'medium', prayedAt: [now - MS_PER_DAY] }),
  ]);

  const queue = createQueueService(activeRequests, { now: () => Date.now() });
  queue.resetFeed();

  const first = queue.renderQueue.value[0]?.request.id;
  // Never-prayed has lastPrayedAt=0, making it "oldest" in tie-breaks
  expect(first).toBe('never');
});

test('respects max-run-length of 3 to prevent priority streaks', () => {
  const now = Date.now();
  const prayedLongAgo = now - 30 * MS_PER_DAY;

  const activeRequests = ref([
    makeRequest({ id: 'u1', priority: 'urgent', prayedAt: [prayedLongAgo] }),
    makeRequest({ id: 'u2', priority: 'urgent', prayedAt: [prayedLongAgo] }),
    makeRequest({ id: 'u3', priority: 'urgent', prayedAt: [prayedLongAgo] }),
    makeRequest({ id: 'u4', priority: 'urgent', prayedAt: [prayedLongAgo] }),
    makeRequest({ id: 'h1', priority: 'high', prayedAt: [prayedLongAgo] }),
    makeRequest({ id: 'h2', priority: 'high', prayedAt: [prayedLongAgo] }),
  ]);

  const queue = createQueueService(activeRequests, { now: () => Date.now() });
  queue.resetFeed();

  const priorities = queue.renderQueue.value.slice(0, 6).map((item) => item.request.priority);

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
