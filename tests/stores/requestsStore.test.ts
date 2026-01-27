import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import type { CreateRequestPayload, Note } from '../../src/core/types';
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
import { makeRequest } from '../fixtures/requests';

// Only mock the service layer - use real queueEngine functions
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

const setupStore = async () => {
  vi.resetModules();
  const storeModule = await import('../../src/stores/requestsStore');
  return storeModule.useRequestsStore();
};

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

test('init calls service.initRequests and populates queue', async () => {
  const mockInit = vi.mocked(initRequests);
  const record = makeRequest({ id: 'req-1', expiresAt: Date.now() + 1_000_000 });
  mockInit.mockResolvedValue([record]);

  const store = await setupStore();
  await store.init();

  expect(mockInit).toHaveBeenCalledTimes(1);
  expect(store.loading.value).toBe(false);
  expect(store.requests.value).toEqual([record]);
  // Real queueEngine: verify queue was populated
  expect(store.renderQueue.value.length).toBeGreaterThan(0);
  expect(store.renderQueue.value[0].request.id).toBe('req-1');
});

test('createRequest calls service and inserts into queue', async () => {
  const payload: CreateRequestPayload = { title: 'New', priority: 'urgent', durationPreset: '10d' };
  const record = makeRequest({ id: 'req-2', title: 'New', expiresAt: Date.now() + 1_000_000 });
  vi.mocked(serviceCreateRequest).mockResolvedValue(record);

  const store = await setupStore();
  await store.createRequest(payload);

  expect(serviceCreateRequest).toHaveBeenCalledWith(payload);
  expect(store.requests.value[0]).toEqual(record);
  // Real queueEngine: verify request was inserted into queue
  expect(store.renderQueue.value.some((item) => item.request.id === 'req-2')).toBe(true);
});

test('recordPrayer delegates to service and updates state', async () => {
  const record = makeRequest({ id: 'req-1', expiresAt: Date.now() + 1_000_000 });
  const updated = makeRequest({ id: 'req-1', prayedAt: [1], updatedAt: 2, expiresAt: Date.now() + 1_000_000 });
  vi.mocked(initRequests).mockResolvedValue([record]);
  vi.mocked(serviceRecordPrayer).mockResolvedValue(updated);

  const store = await setupStore();
  await store.init();
  const result = await store.recordPrayer(record);

  expect(serviceRecordPrayer).toHaveBeenCalledWith(record);
  expect(result).toEqual(updated);
  expect(store.requests.value[0]).toEqual(updated);
});

test('updateRequest delegates to service', async () => {
  const record = makeRequest({ id: 'req-1', expiresAt: Date.now() + 1_000_000 });
  const updated = makeRequest({ id: 'req-1', title: 'Updated', expiresAt: Date.now() + 1_000_000 });
  vi.mocked(initRequests).mockResolvedValue([record]);
  vi.mocked(serviceUpdateRequest).mockResolvedValue(updated);

  const store = await setupStore();
  await store.init();
  await store.updateRequest(record);

  expect(serviceUpdateRequest).toHaveBeenCalledWith(record);
  expect(store.requests.value[0]).toEqual(updated);
});

test('addNote delegates to service', async () => {
  const record = makeRequest({ id: 'req-1', expiresAt: Date.now() + 1_000_000 });
  const updated = makeRequest({
    id: 'req-1',
    notes: [{ id: 'note-1', text: 'Note', createdAt: 1 }],
    expiresAt: Date.now() + 1_000_000,
  });
  vi.mocked(initRequests).mockResolvedValue([record]);
  vi.mocked(serviceAddNote).mockResolvedValue(updated);

  const store = await setupStore();
  await store.init();
  await store.addNote({ request: record, text: 'Note' });

  expect(serviceAddNote).toHaveBeenCalledWith({ request: record, text: 'Note' });
  expect(store.requests.value[0]).toEqual(updated);
});

test('editNote delegates to service', async () => {
  const note: Note = { id: 'note-1', text: 'Edited', createdAt: 1 };
  const record = makeRequest({ id: 'req-1', notes: [note], expiresAt: Date.now() + 1_000_000 });
  const updated = makeRequest({ id: 'req-1', notes: [note], title: 'Updated', expiresAt: Date.now() + 1_000_000 });
  vi.mocked(initRequests).mockResolvedValue([record]);
  vi.mocked(serviceEditNote).mockResolvedValue(updated);

  const store = await setupStore();
  await store.init();
  await store.editNote({ request: record, note });

  expect(serviceEditNote).toHaveBeenCalledWith({ request: record, note });
  expect(store.requests.value[0]).toEqual(updated);
});

test('deleteNote delegates to service', async () => {
  const note: Note = { id: 'note-1', text: 'Old', createdAt: 1 };
  const record = makeRequest({ id: 'req-1', notes: [note], expiresAt: Date.now() + 1_000_000 });
  const updated = makeRequest({ id: 'req-1', notes: [], expiresAt: Date.now() + 1_000_000 });
  vi.mocked(initRequests).mockResolvedValue([record]);
  vi.mocked(serviceDeleteNote).mockResolvedValue(updated);

  const store = await setupStore();
  await store.init();
  await store.deleteNote({ request: record, note });

  expect(serviceDeleteNote).toHaveBeenCalledWith({ request: record, note });
  expect(store.requests.value[0]).toEqual(updated);
});

test('deleteRequest removes from queue and resets when empty', async () => {
  const record = makeRequest({ id: 'req-1', expiresAt: Date.now() + 1_000_000 });
  vi.mocked(initRequests).mockResolvedValue([record]);
  vi.mocked(serviceDeleteRequest).mockResolvedValue();

  const store = await setupStore();
  await store.init();

  // Verify queue has the item before deletion
  expect(store.renderQueue.value.some((item) => item.request.id === 'req-1')).toBe(true);

  await store.deleteRequest(record);

  expect(serviceDeleteRequest).toHaveBeenCalledWith(record.id);
  expect(store.requests.value.map((item) => item.id)).toEqual([]);
  // Real queueEngine: verify request was removed from queue
  expect(store.renderQueue.value.some((item) => item.request.id === 'req-1')).toBe(false);
});

test('markAnswered removes from queue and loads more when near end', async () => {
  // Create multiple requests so queue has items
  const request1 = makeRequest({ id: 'req-1', expiresAt: Date.now() + 1_000_000 });
  const request2 = makeRequest({ id: 'req-2', expiresAt: Date.now() + 1_000_000 });
  const request3 = makeRequest({ id: 'req-3', expiresAt: Date.now() + 1_000_000 });
  const updated = makeRequest({ id: 'req-1', status: 'answered', expiresAt: Date.now() + 1_000_000 });
  vi.mocked(initRequests).mockResolvedValue([request1, request2, request3]);
  vi.mocked(serviceMarkAnswered).mockResolvedValue(updated);

  const store = await setupStore();
  await store.init();

  const initialQueueLength = store.renderQueue.value.length;
  // Capture reference before store mutates the array
  await store.markAnswered({ request: request1, text: 'Answered' });

  expect(serviceMarkAnswered).toHaveBeenCalledWith({ request: request1, text: 'Answered' });
  // Real queueEngine: verify answered request was removed from queue
  expect(store.renderQueue.value.every((item) => item.request.id !== 'req-1')).toBe(true);
  // Queue should have been modified (item removed, possibly more loaded)
  expect(store.renderQueue.value.length).toBeLessThanOrEqual(initialQueueLength);
});

test('activeRequests filters by status and expiry', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  const now = Date.now();
  const active = makeRequest({ id: 'active', expiresAt: now + 10_000 });
  const expired = makeRequest({ id: 'expired', expiresAt: now - 10_000 });
  const answered = makeRequest({ id: 'answered', status: 'answered', expiresAt: now + 10_000 });
  vi.mocked(initRequests).mockResolvedValue([active, expired, answered]);

  const store = await setupStore();
  await store.init();

  expect(store.activeRequests.value.map((item) => item.id)).toEqual(['active']);
});

test('answeredRequests filters by status', async () => {
  const active = makeRequest({ id: 'active', expiresAt: Date.now() + 1_000_000 });
  const answered = makeRequest({ id: 'answered', status: 'answered', expiresAt: Date.now() + 1_000_000 });
  vi.mocked(initRequests).mockResolvedValue([active, answered]);

  const store = await setupStore();
  await store.init();

  expect(store.answeredRequests.value.map((item) => item.id)).toEqual(['answered']);
});
