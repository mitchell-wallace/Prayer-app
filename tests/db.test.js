import { afterEach, beforeEach, expect, test } from 'vitest';
import { bootstrapSeed, clearDbCache, fetchAllRequests, resetDbForTests, saveRequest } from '../src/db.js';
import { computeExpiry } from '../src/utils/time.js';

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
  const newRequest = {
    id: 'test-id',
    title: 'SQL storage works',
    priority: 'high',
    durationPreset: '1d',
    createdAt: now,
    expiresAt: computeExpiry(now, '1d'),
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
  expect(saved.title).toBe('SQL storage works');
  expect(saved.prayedAt).toEqual([]);
  expect(saved.notes).toEqual([]);
});
