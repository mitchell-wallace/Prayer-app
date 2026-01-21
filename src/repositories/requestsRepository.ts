import type { PrayerRequest } from '../core/types';
import { bootstrapSeed, deleteRequest, fetchAllRequests, saveRequest } from '../db/database';

export async function getAll(): Promise<PrayerRequest[]> {
  return fetchAllRequests();
}

export async function save(record: PrayerRequest): Promise<void> {
  await saveRequest(record);
}

export async function remove(id: string): Promise<void> {
  await deleteRequest(id);
}

export async function seed(): Promise<void> {
  await bootstrapSeed();
}
