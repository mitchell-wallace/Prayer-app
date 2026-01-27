import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { CreateRequestPayload, Note, PrayerRequest, QueueItem } from '../../src/core/types';
import {
  createQueueState,
  insertRequest,
  loadMore,
  removeRequestFromQueue,
  resetFeed,
} from '../../src/services/queueEngine';
import {
  initRequests,
  addNote as serviceAddNote,
  createRequest as serviceCreateRequest,
  deleteNote as serviceDeleteNote,
  deleteRequest as serviceDeleteRequest,
  editNote as serviceEditNote,
  markAnswered as serviceMarkAnswered,
  recordPrayer as serviceRecordPrayer,
  updateRequest as serviceUpdateRequest,
} from '../../src/services/requestsService';

vi.mock('../../src/services/requestsService', () => ({
  initRequests: vi.fn(),
  createRequest: vi.fn(),
  recordPrayer: vi.fn(),
  updateRequest: vi.fn(),
  addNote: vi.fn(),
  editNote: vi.fn(),
  deleteNote: vi.fn(),
  deleteRequest: vi.fn(),
  markAnswered: vi.fn(),
}));

vi.mock('../../src/services/queueEngine', () => ({
  buildProgressDots: vi.fn(() => []),
  canGoNext: vi.fn(() => false),
  canGoPrevious: vi.fn(() => false),
  createQueueState: vi.fn(),
  getCurrentItem: vi.fn(() => null),
  insertRequest: vi.fn(),
  loadMore: vi.fn(),
  navigateToIndex: vi.fn(),
  nextCard: vi.fn(),
  previousCard: vi.fn(),
  removeRequestFromQueue: vi.fn(),
  resetFeed: vi.fn(),
}));

const baseRequest = (overrides: Partial<PrayerRequest> = {}): PrayerRequest => ({
  id: 'req-1',
  title: 'Request',
  priority: 'high',
  durationPreset: '1m',
  createdAt: 1_700_000_000_000,
  expiresAt: 1_700_000_000_000 + 1_000_000,
  status: 'active',
  prayedAt: [],
  notes: [],
  updatedAt: 1_700_000_000_000,
  ...overrides,
});

type StoreSetup = {
  store: ReturnType<typeof import('../../src/stores/requestsStore').useRequestsStore>;
  queueState: ReturnType<typeof createQueueState>;
};

const setupStore = async (queueOverrides: Partial<ReturnType<typeof createQueueState>> = {}): Promise<StoreSetup> => {
  vi.resetModules();
  const queueState = {
    renderQueue: [] as QueueItem[],
    currentIndex: 0,
    cycleCount: 0,
    cycleState: null,
    ...queueOverrides,
  } as ReturnType<typeof createQueueState>;
  vi.mocked(createQueueState).mockReturnValue(queueState);
  const storeModule = await import('../../src/stores/requestsStore');
  return { store: storeModule.useRequestsStore(), queueState };
};

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

test('init calls service.initRequests and resets feed', async () => {
  const mockInit = vi.mocked(initRequests);
  const record = baseRequest({ expiresAt: Date.now() + 1_000_000 });
  mockInit.mockResolvedValue([record]);

  const { store, queueState } = await setupStore();
  await store.init();

  expect(mockInit).toHaveBeenCalledTimes(1);
  expect(store.loading.value).toBe(false);
  expect(store.requests.value).toEqual([record]);
  expect(resetFeed).toHaveBeenCalledWith(queueState, [record]);
});

test('createRequest calls service and inserts into queue', async () => {
  const payload: CreateRequestPayload = { title: 'New', priority: 'urgent', durationPreset: '10d' };
  const record = baseRequest({ id: 'req-2', title: 'New' });
  vi.mocked(serviceCreateRequest).mockResolvedValue(record);

  const { store, queueState } = await setupStore();
  await store.createRequest(payload);

  expect(serviceCreateRequest).toHaveBeenCalledWith(payload);
  expect(store.requests.value[0]).toEqual(record);
  expect(insertRequest).toHaveBeenCalledWith(queueState, record);
});

test('recordPrayer delegates to service', async () => {
  const record = baseRequest();
  const updated = baseRequest({ prayedAt: [1], updatedAt: 2 });
  vi.mocked(serviceRecordPrayer).mockResolvedValue(updated);

  const { store } = await setupStore();
  store.requests.value = [record];
  const result = await store.recordPrayer(record);

  expect(serviceRecordPrayer).toHaveBeenCalledWith(record);
  expect(result).toEqual(updated);
  expect(store.requests.value[0]).toEqual(updated);
});

test('updateRequest delegates to service', async () => {
  const record = baseRequest();
  const updated = baseRequest({ title: 'Updated' });
  vi.mocked(serviceUpdateRequest).mockResolvedValue(updated);

  const { store } = await setupStore();
  store.requests.value = [record];
  await store.updateRequest(record);

  expect(serviceUpdateRequest).toHaveBeenCalledWith(record);
  expect(store.requests.value[0]).toEqual(updated);
});

test('addNote delegates to service', async () => {
  const record = baseRequest();
  const updated = baseRequest({ notes: [{ id: 'note-1', text: 'Note', createdAt: 1 }] });
  vi.mocked(serviceAddNote).mockResolvedValue(updated);

  const { store } = await setupStore();
  store.requests.value = [record];
  await store.addNote({ request: record, text: 'Note' });

  expect(serviceAddNote).toHaveBeenCalledWith({ request: record, text: 'Note' });
  expect(store.requests.value[0]).toEqual(updated);
});

test('editNote delegates to service', async () => {
  const note: Note = { id: 'note-1', text: 'Edited', createdAt: 1 };
  const record = baseRequest({ notes: [note] });
  const updated = baseRequest({ notes: [note], title: 'Updated' });
  vi.mocked(serviceEditNote).mockResolvedValue(updated);

  const { store } = await setupStore();
  store.requests.value = [record];
  await store.editNote({ request: record, note });

  expect(serviceEditNote).toHaveBeenCalledWith({ request: record, note });
  expect(store.requests.value[0]).toEqual(updated);
});

test('deleteNote delegates to service', async () => {
  const note: Note = { id: 'note-1', text: 'Old', createdAt: 1 };
  const record = baseRequest({ notes: [note] });
  const updated = baseRequest({ notes: [] });
  vi.mocked(serviceDeleteNote).mockResolvedValue(updated);

  const { store } = await setupStore();
  store.requests.value = [record];
  await store.deleteNote({ request: record, note });

  expect(serviceDeleteNote).toHaveBeenCalledWith({ request: record, note });
  expect(store.requests.value[0]).toEqual(updated);
});

test('deleteRequest updates queue state and resets when empty', async () => {
  const record = baseRequest();
  vi.mocked(serviceDeleteRequest).mockResolvedValue();

  const { store, queueState } = await setupStore({ renderQueue: [] });
  store.requests.value = [record, baseRequest({ id: 'req-2' })];
  await store.deleteRequest(record);

  expect(serviceDeleteRequest).toHaveBeenCalledWith(record.id);
  expect(removeRequestFromQueue).toHaveBeenCalledWith(queueState, record.id);
  expect(store.requests.value.map((item) => item.id)).toEqual(['req-2']);
  expect(resetFeed).toHaveBeenCalledWith(queueState, store.activeRequests.value);
});

test('markAnswered updates queue state and loads more near end', async () => {
  const record = baseRequest();
  const updated = baseRequest({ id: record.id, status: 'answered' });
  vi.mocked(serviceMarkAnswered).mockResolvedValue(updated);

  const { store, queueState } = await setupStore({
    renderQueue: [
      { request: record, cycle: 0 },
      { request: record, cycle: 0 },
      { request: record, cycle: 0 },
    ],
    currentIndex: 1,
  });
  store.requests.value = [record];
  await store.markAnswered({ request: record, text: 'Answered' });

  expect(serviceMarkAnswered).toHaveBeenCalledWith({ request: record, text: 'Answered' });
  expect(removeRequestFromQueue).toHaveBeenCalledWith(queueState, record.id);
  expect(loadMore).toHaveBeenCalledWith(queueState, store.activeRequests.value);
  expect(resetFeed).not.toHaveBeenCalled();
});

test('activeRequests filters by status and expiry', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  const now = Date.now();
  const active = baseRequest({ id: 'active', expiresAt: now + 10_000 });
  const expired = baseRequest({ id: 'expired', expiresAt: now - 10_000 });
  const answered = baseRequest({ id: 'answered', status: 'answered', expiresAt: now + 10_000 });

  const { store } = await setupStore();
  store.requests.value = [active, expired, answered];

  expect(store.activeRequests.value.map((item) => item.id)).toEqual(['active']);
});

test('answeredRequests filters by status', async () => {
  const active = baseRequest({ id: 'active' });
  const answered = baseRequest({ id: 'answered', status: 'answered' });

  const { store } = await setupStore();
  store.requests.value = [active, answered];

  expect(store.answeredRequests.value.map((item) => item.id)).toEqual(['answered']);
});
