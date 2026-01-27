import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { clearDbCache, resetDbForTests } from '@/db/database';
import { addNote, createRequest, initRequests, markAnswered, recordPrayer } from '@/services/requestsService';

describe('Requests Persistence (service → repo → db)', () => {
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

  test('createRequest persists and survives cache clear', async () => {
    const created = await createRequest({
      title: 'Test persistence',
      priority: 'high',
      durationPreset: '3m',
    });

    clearDbCache();

    const requests = await initRequests();
    const found = requests.find((r) => r.id === created.id);

    expect(found).toBeTruthy();
    expect(found?.title).toBe('Test persistence');
    expect(found?.priority).toBe('high');
    expect(found?.durationPreset).toBe('3m');
    expect(found?.createdAt).toBe(created.createdAt);
    expect(found?.updatedAt).toBe(created.updatedAt);
  });

  test('recordPrayer persists prayedAt and updatedAt', async () => {
    const created = await createRequest({
      title: 'Prayer tracking test',
      priority: 'medium',
      durationPreset: '1m',
    });

    const afterPrayer = await recordPrayer(created);

    clearDbCache();

    const requests = await initRequests();
    const found = requests.find((r) => r.id === created.id);

    expect(found).toBeTruthy();
    expect(found?.prayedAt).toEqual(afterPrayer.prayedAt);
    expect(found?.updatedAt).toBe(afterPrayer.updatedAt);
  });

  test('addNote persists note with correct properties', async () => {
    const created = await createRequest({
      title: 'Note test',
      priority: 'low',
      durationPreset: '6m',
    });

    await addNote({ request: created, text: 'This is a test note' });

    clearDbCache();

    const requests = await initRequests();
    const found = requests.find((r) => r.id === created.id);

    expect(found).toBeTruthy();
    expect(found?.notes).toHaveLength(1);
    expect(found?.notes[0]?.text).toBe('This is a test note');
    expect(found?.notes[0]?.isAnswer).toBe(false);
  });

  test('markAnswered persists status and answer note', async () => {
    const created = await createRequest({
      title: 'Answer test',
      priority: 'urgent',
      durationPreset: '10d',
    });

    await markAnswered({ request: created, text: 'God answered this prayer!' });

    clearDbCache();

    const requests = await initRequests();
    const found = requests.find((r) => r.id === created.id);

    expect(found).toBeTruthy();
    expect(found?.status).toBe('answered');
    expect(found?.notes).toHaveLength(1);
    expect(found?.notes[0]?.text).toBe('God answered this prayer!');
    expect(found?.notes[0]?.isAnswer).toBe(true);
  });
});
