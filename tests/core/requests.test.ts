import { expect, test } from 'vitest';
import {
  applyAddNote,
  applyAnswered,
  applyDeleteNote,
  applyEditNote,
  applyPrayer,
  applyRequestUpdate,
  createNoteEntry,
  createRequestRecord,
  validateCreatePayload,
  validateRequestRecord,
} from '../../src/core/requests';
import type { CreateRequestPayload, Note, PrayerRequest } from '../../src/core/types';
import { computeExpiry } from '../../src/formatting/time';

const basePayload: CreateRequestPayload = {
  title: 'Prayer request',
  priority: 'high',
  durationPreset: '1m',
};

const baseRecord = (overrides: Partial<PrayerRequest> = {}): PrayerRequest => ({
  id: 'req-1',
  title: 'Prayer request',
  priority: 'high',
  durationPreset: '1m',
  createdAt: 1_700_000_000_000,
  expiresAt: 1_700_000_000_000 + 1_000,
  status: 'active',
  prayedAt: [],
  notes: [],
  updatedAt: 1_700_000_000_000,
  ...overrides,
});

test('validateCreatePayload throws on blank title', () => {
  const payload = { ...basePayload, title: '   ' };
  expect(() => validateCreatePayload(payload)).toThrow(/title/i);
});

test('validateCreatePayload trims title whitespace', () => {
  const payload = { ...basePayload, title: '  New request  ' };
  const result = validateCreatePayload(payload);
  expect(result.title).toBe('New request');
});

test('validateCreatePayload rejects invalid priority', () => {
  const payload = { ...basePayload, priority: 'next' } as unknown as CreateRequestPayload;
  expect(() => validateCreatePayload(payload)).toThrow(/priority/i);
});

test('validateCreatePayload rejects invalid duration', () => {
  const payload = { ...basePayload, durationPreset: '2w' } as unknown as CreateRequestPayload;
  expect(() => validateCreatePayload(payload)).toThrow(/duration/i);
});

test('validateRequestRecord throws on blank id/title', () => {
  expect(() => validateRequestRecord(baseRecord({ id: ' ' }))).toThrow(/id/i);
  expect(() => validateRequestRecord(baseRecord({ title: '' }))).toThrow(/title/i);
});

test('validateRequestRecord throws when prayedAt is not an array', () => {
  const record = baseRecord({ prayedAt: 'today' as unknown as number[] });
  expect(() => validateRequestRecord(record)).toThrow(/prayedAt/i);
});

test('validateRequestRecord throws when notes is not an array', () => {
  const record = baseRecord({ notes: 'note' as unknown as Note[] });
  expect(() => validateRequestRecord(record)).toThrow(/notes/i);
});

test('validateRequestRecord throws when note entries are incomplete', () => {
  const badNotes = [
    { id: '', text: 'hi', createdAt: 1 },
    { id: 'note', text: '', createdAt: 1 },
    { id: 'note', text: 'hi', createdAt: NaN },
  ];
  for (const note of badNotes) {
    const record = baseRecord({ notes: [note as Note] });
    expect(() => validateRequestRecord(record)).toThrow(/note/i);
  }
});

test('createNoteEntry trims text and rejects empty values', () => {
  const entry = createNoteEntry('  New note ', { now: 123, id: 'note-1' });
  expect(entry.text).toBe('New note');
  expect(() => createNoteEntry('   ', { now: 123, id: 'note-2' })).toThrow(/note text/i);
});

test('createRequestRecord sets expiry via computeExpiry', () => {
  const now = 1_700_000_010_000;
  const record = createRequestRecord(basePayload, { now, id: 'req-2' });
  expect(record.expiresAt).toBe(computeExpiry(now, basePayload.durationPreset));
});

test('createRequestRecord defaults status to active', () => {
  const record = createRequestRecord(basePayload, { now: 1_700_000_010_000, id: 'req-3' });
  expect(record.status).toBe('active');
});

test('applyPrayer appends timestamp and updates updatedAt', () => {
  const record = baseRecord({ prayedAt: [10] });
  const result = applyPrayer(record, { now: 22 });
  expect(result.prayedAt).toEqual([10, 22]);
  expect(result.updatedAt).toBe(22);
});

test('applyRequestUpdate recomputes expiry from createdAt and duration', () => {
  const record = baseRecord({ expiresAt: 5, durationPreset: '10d' });
  const result = applyRequestUpdate(record, { now: 22 });
  expect(result.expiresAt).toBe(computeExpiry(record.createdAt, '10d'));
  expect(result.updatedAt).toBe(22);
});

test('applyAddNote adds a normalized note entry', () => {
  const record = baseRecord();
  const result = applyAddNote(record, '  Added note ', { now: 55, id: 'note-1' });
  expect(result.notes).toHaveLength(1);
  expect(result.notes[0]).toMatchObject({ id: 'note-1', text: 'Added note', createdAt: 55 });
});

test('applyEditNote updates a note in place', () => {
  const record = baseRecord({ notes: [{ id: 'note-1', text: 'Old', createdAt: 10 }] });
  const result = applyEditNote(record, { id: 'note-1', text: 'New', createdAt: 10 }, { now: 99 });
  expect(result.notes[0].text).toBe('New');
  expect(result.updatedAt).toBe(99);
});

test('applyDeleteNote removes a note by id', () => {
  const record = baseRecord({
    notes: [
      { id: 'note-1', text: 'First', createdAt: 10 },
      { id: 'note-2', text: 'Second', createdAt: 11 },
    ],
  });
  const result = applyDeleteNote(record, 'note-1', { now: 100 });
  expect(result.notes).toEqual([{ id: 'note-2', text: 'Second', createdAt: 11 }]);
  expect(result.updatedAt).toBe(100);
});

test('applyAnswered sets answered status and creates answer note', () => {
  const record = baseRecord();
  const result = applyAnswered(record, '  Answered ', { now: 200, id: 'note-1' });
  expect(result.status).toBe('answered');
  expect(result.notes[0]).toMatchObject({ id: 'note-1', text: 'Answered', createdAt: 200, isAnswer: true });
});
