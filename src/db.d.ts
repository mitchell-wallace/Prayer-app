import type { PrayerRequest } from './types';

export function initDb(): Promise<unknown>;
export function fetchAllRequests(): Promise<PrayerRequest[]>;
export function saveRequest(record: PrayerRequest): Promise<void>;
export function deleteRequest(id: string): Promise<void>;
export function bootstrapSeed(): Promise<void>;
export function clearDbCache(): void;
export function resetDbForTests(): Promise<void>;
