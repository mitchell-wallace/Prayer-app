import { afterEach, beforeEach, expect, test } from 'vitest';
import { bootstrapSeed, clearDbCache, fetchAllRequests, resetDbForTests, saveRequest } from '../src/db.ts';
import { computeExpiry } from '../src/utils/time.ts';
import type { PrayerRequest } from '../src/types';

beforeEach(async () => {
  await resetDbForTests();
  clearDbCache();
});

afterEach(() => {
  clearDbCache();
});

test('bootstrapSeed populates initial records only once', async () => {
  await bootstrapSeed();
  const first = await fetchAllRequests();
  expect(first.length).toBeGreaterThan(0);

  await bootstrapSeed();
  const second = await fetchAllRequests();
  expect(second.length).toBe(first.length);
});

test('saveRequest writes and reloads data from persistent storage', async () => {
  await bootstrapSeed();
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

  await saveRequest(newRequest);
  clearDbCache();

  const records = await fetchAllRequests();
  const saved = records.find((r) => r.id === 'test-id');
  expect(saved).toBeTruthy();
  if (!saved) {
    throw new Error('Expected saved request to exist.');
  }
  expect(saved.title).toBe('SQL storage works');
  expect(saved.prayedAt).toEqual([]);
  expect(saved.notes).toEqual([]);
});
