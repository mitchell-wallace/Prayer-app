import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { PrayerRequest } from '@/core/types';
import { clearDbCache, resetDbForTests } from '@/db/database';
import { computeExpiry } from '@/formatting/time';
import { getAll, remove, save, seed } from '@/repositories/requestsRepository';

beforeEach(async () => {
  await resetDbForTests();
  clearDbCache();
  vi.useFakeTimers({ shouldAdvanceTime: true, advanceTimeDelta: 1 });
  vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  clearDbCache();
});

test('bootstrapSeed populates initial records only once', async () => {
  await seed();
  const first = await getAll();
  expect(first.length).toBeGreaterThan(0);

  clearDbCache();
  await seed();
  const second = await getAll();
  expect(second.length).toBe(first.length);
});

test('saveRequest writes and reloads data from persistent storage', async () => {
  await seed();
  const now = Date.now();
  const newRequest: PrayerRequest = {
    id: 'test-id',
    title: 'SQL storage works',
    priority: 'high',
    durationPreset: '10d',
    createdAt: now,
    expiresAt: computeExpiry(now, '10d'),
    status: 'active',
    prayedAt: [],
    notes: [],
    updatedAt: now,
  };

  await save(newRequest);
  clearDbCache();

  const records = await getAll();
  const saved = records.find((r) => r.id === 'test-id');
  expect(saved).toBeTruthy();
  if (!saved) {
    throw new Error('Expected saved request to exist.');
  }
  expect(saved.title).toBe('SQL storage works');
  expect(saved.prayedAt).toEqual([]);
  expect(saved.notes).toEqual([]);
});

test('remove deletes request by id', async () => {
  await seed();
  const now = Date.now();
  const request: PrayerRequest = {
    id: 'remove-id',
    title: 'Remove me',
    priority: 'medium',
    durationPreset: '10d',
    createdAt: now,
    expiresAt: computeExpiry(now, '10d'),
    status: 'active',
    prayedAt: [],
    notes: [],
    updatedAt: now,
  };

  await save(request);
  await remove('remove-id');
  clearDbCache();

  const records = await getAll();
  expect(records.some((record) => record.id === 'remove-id')).toBe(false);
});
