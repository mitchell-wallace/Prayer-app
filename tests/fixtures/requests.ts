import type { CreateRequestPayload, Note, PrayerRequest, Priority } from '@/core/types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Factory for creating test PrayerRequest objects.
 * Provides sensible defaults that can be overridden.
 */
export function makeRequest(overrides: Partial<PrayerRequest> & { id: string }): PrayerRequest {
  const baseTime = overrides.createdAt ?? Date.now();
  return {
    title: overrides.id,
    priority: 'high' as Priority,
    durationPreset: '10d',
    createdAt: baseTime,
    expiresAt: overrides.expiresAt ?? baseTime + MS_PER_DAY,
    status: 'active',
    prayedAt: [],
    notes: [],
    updatedAt: baseTime,
    ...overrides,
  };
}

/**
 * Factory for creating test Note objects.
 */
export function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    text: 'Test note',
    createdAt: Date.now(),
    ...overrides,
  };
}

/**
 * Factory for creating test CreateRequestPayload objects.
 */
export function makePayload(overrides: Partial<CreateRequestPayload> = {}): CreateRequestPayload {
  return {
    title: 'Prayer request',
    priority: 'high',
    durationPreset: '1m',
    ...overrides,
  };
}

export { MS_PER_DAY };
