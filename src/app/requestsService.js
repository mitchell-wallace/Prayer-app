import { bootstrapSeed, deleteRequest as dbDeleteRequest, fetchAllRequests, saveRequest } from '../db.js';
import {
  applyAddNote,
  applyAnswered,
  applyDeleteNote,
  applyEditNote,
  applyPrayer,
  applyRequestUpdate,
  createRequestRecord,
  validateRequestRecord,
} from '../domain/requests.js';

export async function initRequests() {
  await bootstrapSeed();
  return fetchAllRequests();
}

export async function createRequest(payload) {
  const record = createRequestRecord(payload);
  validateRequestRecord(record);
  await saveRequest(record);
  return record;
}

export async function recordPrayer(request) {
  const updated = applyPrayer(request);
  validateRequestRecord(updated);
  await saveRequest(updated);
  return updated;
}

export async function updateRequest(request) {
  const updated = applyRequestUpdate(request);
  validateRequestRecord(updated);
  await saveRequest(updated);
  return updated;
}

export async function addNote({ request, text }) {
  const updated = applyAddNote(request, text);
  validateRequestRecord(updated);
  await saveRequest(updated);
  return updated;
}

export async function editNote({ request, note }) {
  const updated = applyEditNote(request, note);
  validateRequestRecord(updated);
  await saveRequest(updated);
  return updated;
}

export async function deleteNote({ request, note }) {
  const updated = applyDeleteNote(request, note.id);
  validateRequestRecord(updated);
  await saveRequest(updated);
  return updated;
}

export async function markAnswered({ request, text }) {
  const updated = applyAnswered(request, text);
  validateRequestRecord(updated);
  await saveRequest(updated);
  return updated;
}

export async function deleteRequest(requestId) {
  await dbDeleteRequest(requestId);
}
