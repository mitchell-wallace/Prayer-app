import type { Database } from 'sql.js';
import type { PrayerRequest } from '../core/types';

export function initDb(): Promise<Database>;
export function fetchAllRequests(): Promise<PrayerRequest[]>;
export function saveRequest(record: PrayerRequest): Promise<void>;
export function deleteRequest(id: string): Promise<void>;
export function bootstrapSeed(): Promise<void>;
export function clearDbCache(): void;
export function resetDbForTests(): Promise<void>;
