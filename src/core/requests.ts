import { computeExpiry } from '../formatting/time';
import type { CreateRequestPayload, Note, PrayerRequest, Priority, RequestStatus } from './types';

export const priorityScore: Record<Priority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const allowedPriorities = new Set<Priority>(['urgent', 'high', 'medium', 'low']);
const allowedDurations = new Set<CreateRequestPayload['durationPreset']>(['10d', '1m', '3m', '6m', '1y']);
const allowedStatuses = new Set<RequestStatus>(['active', 'answered', 'archived']);

function requireString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function requireNumber(value: unknown, label: string): asserts value is number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`);
  }
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateCreatePayload(payload: CreateRequestPayload): CreateRequestPayload {
  const title = normalizeText(payload.title);
  requireString(title, 'title');

  if (!allowedPriorities.has(payload.priority)) {
    throw new Error('priority must be one of: urgent, high, medium, low');
  }
  if (!allowedDurations.has(payload.durationPreset)) {
    throw new Error('durationPreset must be one of: 10d, 1m, 3m, 6m, 1y');
  }

  return {
    title,
    priority: payload.priority,
    durationPreset: payload.durationPreset,
  };
}

export function validateRequestRecord(record: PrayerRequest): void {
  requireString(record.id, 'id');
  requireString(record.title, 'title');

  if (!allowedPriorities.has(record.priority)) {
    throw new Error('priority must be one of: urgent, high, medium, low');
  }
  if (!allowedDurations.has(record.durationPreset)) {
    throw new Error('durationPreset must be one of: 10d, 1m, 3m, 6m, 1y');
  }
  if (!allowedStatuses.has(record.status)) {
    throw new Error('status must be one of: active, answered, archived');
  }

  requireNumber(record.createdAt, 'createdAt');
  requireNumber(record.expiresAt, 'expiresAt');
  requireNumber(record.updatedAt, 'updatedAt');

  const prayedAt = record.prayedAt;
  const notes = record.notes;
  if (!Array.isArray(prayedAt)) {
    throw new Error('prayedAt must be an array');
  }
  if (!Array.isArray(notes)) {
    throw new Error('notes must be an array');
  }
  for (const timestamp of prayedAt) {
    requireNumber(timestamp, 'prayedAt entry');
  }
  for (const note of notes) {
    requireString(note?.id, 'note.id');
    requireString(note?.text, 'note.text');
    requireNumber(note?.createdAt, 'note.createdAt');
  }
}

export function createNoteEntry(
  text: string,
  { isAnswer = false, now, id }: { isAnswer?: boolean; now: number; id: string }
): Note {
  const normalized = normalizeText(text);
  requireString(normalized, 'note text');
  return {
    id,
    text: normalized,
    createdAt: now,
    isAnswer,
  };
}

export function createRequestRecord(
  payload: CreateRequestPayload,
  { now, id }: { now: number; id: string }
): PrayerRequest {
  const normalized = validateCreatePayload(payload);
  return {
    id,
    title: normalized.title,
    priority: normalized.priority,
    durationPreset: normalized.durationPreset,
    createdAt: now,
    expiresAt: computeExpiry(now, normalized.durationPreset),
    status: 'active',
    prayedAt: [],
    notes: [],
    updatedAt: now,
  };
}

export function applyPrayer(request: PrayerRequest, { now }: { now: number }): PrayerRequest {
  return {
    ...request,
    prayedAt: [...(request.prayedAt || []), now],
    updatedAt: now,
  };
}

export function applyRequestUpdate(request: PrayerRequest, { now }: { now: number }): PrayerRequest {
  return {
    ...request,
    expiresAt: computeExpiry(request.createdAt, request.durationPreset),
    updatedAt: now,
  };
}

export function applyAddNote(
  request: PrayerRequest,
  text: string,
  { now, id }: { now: number; id: string }
): PrayerRequest {
  const entry = createNoteEntry(text, { now, id });
  return {
    ...request,
    notes: [...(request.notes || []), entry],
    updatedAt: now,
  };
}

export function applyEditNote(
  request: PrayerRequest,
  note: Note,
  { now }: { now: number }
): PrayerRequest {
  const updatedNotes = (request.notes || []).map((n) => (n.id === note.id ? { ...note } : n));
  return {
    ...request,
    notes: updatedNotes,
    updatedAt: now,
  };
}

export function applyDeleteNote(
  request: PrayerRequest,
  noteId: string,
  { now }: { now: number }
): PrayerRequest {
  const updatedNotes = (request.notes || []).filter((n) => n.id !== noteId);
  return {
    ...request,
    notes: updatedNotes,
    updatedAt: now,
  };
}

export function applyAnswered(
  request: PrayerRequest,
  text: string,
  { now, id }: { now: number; id: string }
): PrayerRequest {
  const entry = createNoteEntry(text, { isAnswer: true, now, id });
  return {
    ...request,
    status: 'answered',
    notes: [...(request.notes || []), entry],
    updatedAt: now,
  };
}
