import { computeExpiry } from '../utils/time';

export const priorityScore = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

const allowedPriorities = new Set(['urgent', 'high', 'medium', 'low']);
const allowedDurations = new Set(['10d', '1m', '3m', '6m', '1y']);
const allowedStatuses = new Set(['active', 'answered', 'archived']);

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function requireNumber(value, label) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`${label} must be a number`);
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateCreatePayload(payload) {
  const title = normalizeText(payload?.title);
  requireString(title, 'title');

  if (!allowedPriorities.has(payload?.priority)) {
    throw new Error('priority must be one of: urgent, high, medium, low');
  }
  if (!allowedDurations.has(payload?.durationPreset)) {
    throw new Error('durationPreset must be one of: 10d, 1m, 3m, 6m, 1y');
  }

  return {
    title,
    priority: payload.priority,
    durationPreset: payload.durationPreset,
  };
}

export function validateRequestRecord(record) {
  requireString(record?.id, 'id');
  requireString(record?.title, 'title');

  if (!allowedPriorities.has(record?.priority)) {
    throw new Error('priority must be one of: urgent, high, medium, low');
  }
  if (!allowedDurations.has(record?.durationPreset)) {
    throw new Error('durationPreset must be one of: 10d, 1m, 3m, 6m, 1y');
  }
  if (!allowedStatuses.has(record?.status)) {
    throw new Error('status must be one of: active, answered, archived');
  }

  requireNumber(record?.createdAt, 'createdAt');
  requireNumber(record?.expiresAt, 'expiresAt');
  requireNumber(record?.updatedAt, 'updatedAt');

  const prayedAt = record?.prayedAt ?? [];
  const notes = record?.notes ?? [];
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

export function createNoteEntry(text, { isAnswer = false, now = Date.now() } = {}) {
  const normalized = normalizeText(text);
  requireString(normalized, 'note text');
  return {
    id: crypto.randomUUID(),
    text: normalized,
    createdAt: now,
    isAnswer,
  };
}

export function createRequestRecord(payload, { now = Date.now() } = {}) {
  const normalized = validateCreatePayload(payload);
  return {
    id: crypto.randomUUID(),
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

export function applyPrayer(request, { now = Date.now() } = {}) {
  return {
    ...request,
    prayedAt: [...(request.prayedAt || []), now],
    updatedAt: now,
  };
}

export function applyRequestUpdate(request, { now = Date.now() } = {}) {
  return {
    ...request,
    expiresAt: computeExpiry(request.createdAt, request.durationPreset),
    updatedAt: now,
  };
}

export function applyAddNote(request, text, { now = Date.now() } = {}) {
  const entry = createNoteEntry(text, { now });
  return {
    ...request,
    notes: [...(request.notes || []), entry],
    updatedAt: now,
  };
}

export function applyEditNote(request, note, { now = Date.now() } = {}) {
  const updatedNotes = (request.notes || []).map((n) => (n.id === note.id ? { ...note } : n));
  return {
    ...request,
    notes: updatedNotes,
    updatedAt: now,
  };
}

export function applyDeleteNote(request, noteId, { now = Date.now() } = {}) {
  const updatedNotes = (request.notes || []).filter((n) => n.id !== noteId);
  return {
    ...request,
    notes: updatedNotes,
    updatedAt: now,
  };
}

export function applyAnswered(request, text, { now = Date.now() } = {}) {
  const entry = createNoteEntry(text, { isAnswer: true, now });
  return {
    ...request,
    status: 'answered',
    notes: [...(request.notes || []), entry],
    updatedAt: now,
  };
}
