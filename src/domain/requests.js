import { computeExpiry } from '../utils/time.js';

export const priorityScore = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

export function createNoteEntry(text, { isAnswer = false, now = Date.now() } = {}) {
  return {
    id: crypto.randomUUID(),
    text,
    createdAt: now,
    isAnswer,
  };
}

export function createRequestRecord(payload, { now = Date.now() } = {}) {
  return {
    id: crypto.randomUUID(),
    title: payload.title,
    priority: payload.priority,
    durationPreset: payload.durationPreset,
    createdAt: now,
    expiresAt: computeExpiry(now, payload.durationPreset),
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
