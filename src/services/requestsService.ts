import {
  applyAddNote,
  applyAnswered,
  applyDeleteNote,
  applyEditNote,
  applyPrayer,
  applyRequestUpdate,
  createRequestRecord,
  validateRequestRecord,
} from '../core/requests';
import type { CreateRequestPayload, Note, PrayerRequest } from '../core/types';
import { getAll, remove, save as saveToRepository, seed } from '../repositories/requestsRepository';

export async function initRequests(): Promise<PrayerRequest[]> {
  await seed();
  return getAll();
}

export async function createRequest(payload: CreateRequestPayload): Promise<PrayerRequest> {
  const record = createRequestRecord(payload);
  validateRequestRecord(record);
  await saveToRepository(record);
  return record;
}

export async function recordPrayer(request: PrayerRequest): Promise<PrayerRequest> {
  const updated = applyPrayer(request);
  validateRequestRecord(updated);
  await saveToRepository(updated);
  return updated;
}

export async function updateRequest(request: PrayerRequest): Promise<PrayerRequest> {
  const updated = applyRequestUpdate(request);
  validateRequestRecord(updated);
  await saveToRepository(updated);
  return updated;
}

export async function addNote({ request, text }: { request: PrayerRequest; text: string }): Promise<PrayerRequest> {
  const updated = applyAddNote(request, text);
  validateRequestRecord(updated);
  await saveToRepository(updated);
  return updated;
}

export async function editNote({ request, note }: { request: PrayerRequest; note: Note }): Promise<PrayerRequest> {
  const updated = applyEditNote(request, note);
  validateRequestRecord(updated);
  await saveToRepository(updated);
  return updated;
}

export async function deleteNote({ request, note }: { request: PrayerRequest; note: Note }): Promise<PrayerRequest> {
  const updated = applyDeleteNote(request, note.id);
  validateRequestRecord(updated);
  await saveToRepository(updated);
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
  await saveToRepository(updated);
  return updated;
}

export async function deleteRequest(requestId: string): Promise<void> {
  await remove(requestId);
}
