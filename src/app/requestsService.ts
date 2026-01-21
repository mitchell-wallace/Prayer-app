import { bootstrapSeed, deleteRequest as dbDeleteRequest, fetchAllRequests, saveRequest } from '../db.ts';
import {
  applyAddNote,
  applyAnswered,
  applyDeleteNote,
  applyEditNote,
  applyPrayer,
  applyRequestUpdate,
  createRequestRecord,
  validateRequestRecord,
} from '../domain/requests.ts';
import type { CreateRequestPayload, Note, PrayerRequest } from '../types';

export async function initRequests(): Promise<PrayerRequest[]> {
  await bootstrapSeed();
  return fetchAllRequests();
}

export async function createRequest(payload: CreateRequestPayload): Promise<PrayerRequest> {
  const record = createRequestRecord(payload);
  validateRequestRecord(record);
  await saveRequest(record);
  return record;
}

export async function recordPrayer(request: PrayerRequest): Promise<PrayerRequest> {
  const updated = applyPrayer(request);
  validateRequestRecord(updated);
  await saveRequest(updated);
  return updated;
}

export async function updateRequest(request: PrayerRequest): Promise<PrayerRequest> {
  const updated = applyRequestUpdate(request);
  validateRequestRecord(updated);
  await saveRequest(updated);
  return updated;
}

export async function addNote({ request, text }: { request: PrayerRequest; text: string }): Promise<PrayerRequest> {
  const updated = applyAddNote(request, text);
  validateRequestRecord(updated);
  await saveRequest(updated);
  return updated;
}

export async function editNote({ request, note }: { request: PrayerRequest; note: Note }): Promise<PrayerRequest> {
  const updated = applyEditNote(request, note);
  validateRequestRecord(updated);
  await saveRequest(updated);
  return updated;
}

export async function deleteNote({ request, note }: { request: PrayerRequest; note: Note }): Promise<PrayerRequest> {
  const updated = applyDeleteNote(request, note.id);
  validateRequestRecord(updated);
  await saveRequest(updated);
  return updated;
}

export async function markAnswered({
  request,
  text,
}: {
  request: PrayerRequest;
  text: string;
}): Promise<PrayerRequest> {
  const updated = applyAnswered(request, text);
  validateRequestRecord(updated);
  await saveRequest(updated);
  return updated;
}

export async function deleteRequest(requestId: string): Promise<void> {
  await dbDeleteRequest(requestId);
}
