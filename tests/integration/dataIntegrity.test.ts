import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { clearDbCache, resetDbForTests } from '@/db/database';
import { createRequest, initRequests } from '@/services/requestsService';

describe('Data Integrity', () => {
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

  test('unicode title preserved through persistence round-trip', async () => {
    const unicodeTitle = '🙏 Prière pour la paix 和平祈祷 שלום';

    const created = await createRequest({
      title: unicodeTitle,
      priority: 'high',
      durationPreset: '3m',
    });

    clearDbCache();

    const requests = await initRequests();
    const found = requests.find((r) => r.id === created.id);

    expect(found).toBeTruthy();
    expect(found?.title).toBe(unicodeTitle);
    expect(found?.createdAt).toBe(created.createdAt);
    expect(found?.updatedAt).toBe(created.updatedAt);
  });
});
