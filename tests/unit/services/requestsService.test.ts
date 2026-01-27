import { makeRequest } from '@tests/fixtures/requests';
import { beforeEach, expect, test, vi } from 'vitest';
import type { CreateRequestPayload, Note } from '@/core/types';
import { computeExpiry } from '@/formatting/time';
import { getAll, remove, save, seed } from '@/repositories/requestsRepository';
import { now } from '@/services/dateTimeService';
import {
  addNote,
  createRequest,
  deleteNote,
  deleteRequest,
  editNote,
  initRequests,
  markAnswered,
  recordPrayer,
  updateRequest,
} from '@/services/requestsService';
import { createId } from '@/services/uuidService';

vi.mock('@/repositories/requestsRepository', () => ({
  getAll: vi.fn(),
  remove: vi.fn(),
  save: vi.fn(),
  seed: vi.fn(),
}));

vi.mock('@/services/dateTimeService', () => ({ now: vi.fn() }));
vi.mock('@/services/uuidService', () => ({ createId: vi.fn() }));

const baseRequest = (overrides: Partial<Parameters<typeof makeRequest>[0]> = {}) =>
  makeRequest({
    id: 'req-1',
    title: 'Request',
    durationPreset: '1m',
    createdAt: 1_700_000_000_000,
    expiresAt: 1_700_000_000_000 + 1_000,
    updatedAt: 1_700_000_000_000,
    ...overrides,
  });

beforeEach(() => {
  vi.resetAllMocks();
});

test('initRequests seeds and returns all requests', async () => {
  const mockSeed = vi.mocked(seed);
  const mockGetAll = vi.mocked(getAll);
  const records = [baseRequest()];
  mockSeed.mockResolvedValue();
  mockGetAll.mockResolvedValue(records);

  const result = await initRequests();

  expect(mockSeed).toHaveBeenCalledTimes(1);
  expect(mockGetAll).toHaveBeenCalledTimes(1);
  expect(result).toBe(records);
});

test('createRequest creates and persists request', async () => {
  const mockSave = vi.mocked(save);
  const mockNow = vi.mocked(now);
  const mockCreateId = vi.mocked(createId);
  mockNow.mockReturnValue(1_700_000_010_000);
  mockCreateId.mockReturnValue('req-2');
  mockSave.mockResolvedValue();

  const payload: CreateRequestPayload = { title: 'New', priority: 'urgent', durationPreset: '10d' };
  const record = await createRequest(payload);

  expect(mockSave).toHaveBeenCalledWith(record);
  expect(record.id).toBe('req-2');
  expect(record.createdAt).toBe(1_700_000_010_000);
  expect(record.expiresAt).toBe(computeExpiry(1_700_000_010_000, '10d'));
});

test('recordPrayer applies prayer timestamp and saves', async () => {
  const mockSave = vi.mocked(save);
  const mockNow = vi.mocked(now);
  mockNow.mockReturnValue(1_700_000_020_000);
  mockSave.mockResolvedValue();

  const record = baseRequest({ prayedAt: [1_700_000_000_000] });
  const updated = await recordPrayer(record);

  expect(updated.prayedAt).toEqual([1_700_000_000_000, 1_700_000_020_000]);
  expect(updated.updatedAt).toBe(1_700_000_020_000);
  expect(mockSave).toHaveBeenCalledWith(updated);
});

test('updateRequest recomputes expiry and saves', async () => {
  const mockSave = vi.mocked(save);
  const mockNow = vi.mocked(now);
  mockNow.mockReturnValue(1_700_000_030_000);
  mockSave.mockResolvedValue();

  const record = baseRequest({ createdAt: 1_700_000_000_000, durationPreset: '6m', expiresAt: 0 });
  const updated = await updateRequest(record);

  expect(updated.expiresAt).toBe(computeExpiry(1_700_000_000_000, '6m'));
  expect(updated.updatedAt).toBe(1_700_000_030_000);
  expect(mockSave).toHaveBeenCalledWith(updated);
});

test('addNote adds note entry and saves', async () => {
  const mockSave = vi.mocked(save);
  const mockNow = vi.mocked(now);
  const mockCreateId = vi.mocked(createId);
  mockNow.mockReturnValue(1_700_000_040_000);
  mockCreateId.mockReturnValue('note-1');
  mockSave.mockResolvedValue();

  const updated = await addNote({ request: baseRequest(), text: '  New note ' });

  expect(updated.notes[0]).toMatchObject({ id: 'note-1', text: 'New note', createdAt: 1_700_000_040_000 });
  expect(mockSave).toHaveBeenCalledWith(updated);
});

test('editNote updates existing note and saves', async () => {
  const mockSave = vi.mocked(save);
  const mockNow = vi.mocked(now);
  mockNow.mockReturnValue(1_700_000_050_000);
  mockSave.mockResolvedValue();

  const note: Note = { id: 'note-1', text: 'Updated', createdAt: 1 };
  const record = baseRequest({ notes: [{ id: 'note-1', text: 'Old', createdAt: 1 }] });
  const updated = await editNote({ request: record, note });

  expect(updated.notes[0].text).toBe('Updated');
  expect(updated.updatedAt).toBe(1_700_000_050_000);
  expect(mockSave).toHaveBeenCalledWith(updated);
});

test('deleteNote removes note and saves', async () => {
  const mockSave = vi.mocked(save);
  const mockNow = vi.mocked(now);
  mockNow.mockReturnValue(1_700_000_060_000);
  mockSave.mockResolvedValue();

  const note: Note = { id: 'note-1', text: 'Old', createdAt: 1 };
  const record = baseRequest({
    notes: [note, { id: 'note-2', text: 'Keep', createdAt: 2 }],
  });
  const updated = await deleteNote({ request: record, note });

  expect(updated.notes).toEqual([{ id: 'note-2', text: 'Keep', createdAt: 2 }]);
  expect(mockSave).toHaveBeenCalledWith(updated);
});

test('markAnswered sets status and saves', async () => {
  const mockSave = vi.mocked(save);
  const mockNow = vi.mocked(now);
  const mockCreateId = vi.mocked(createId);
  mockNow.mockReturnValue(1_700_000_070_000);
  mockCreateId.mockReturnValue('note-2');
  mockSave.mockResolvedValue();

  const updated = await markAnswered({ request: baseRequest(), text: '  Answer ' });

  expect(updated.status).toBe('answered');
  expect(updated.notes[0]).toMatchObject({ id: 'note-2', text: 'Answer', isAnswer: true });
  expect(mockSave).toHaveBeenCalledWith(updated);
});

test('deleteRequest delegates to repository remove', async () => {
  const mockRemove = vi.mocked(remove);
  mockRemove.mockResolvedValue();
  await deleteRequest('req-5');
  expect(mockRemove).toHaveBeenCalledWith('req-5');
});
