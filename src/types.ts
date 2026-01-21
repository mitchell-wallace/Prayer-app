/** Priority levels for prayer requests */
export type Priority = 'urgent' | 'high' | 'medium' | 'low';

/** Duration presets for prayer request expiration */
export type DurationPreset = '10d' | '1m' | '3m' | '6m' | '1y';

/** Status of a prayer request */
export type RequestStatus = 'active' | 'answered' | 'archived';

/** Theme options for the application */
export type Theme = 'light' | 'dark' | 'system';

/** A note attached to a prayer request */
export interface Note {
  id: string;
  text: string;
  createdAt: number;
  updatedAt?: number;
  isAnswer?: boolean;
}

/** A prayer request */
export interface PrayerRequest {
  id: string;
  title: string;
  priority: Priority;
  durationPreset: DurationPreset;
  createdAt: number;
  expiresAt: number;
  status: RequestStatus;
  prayedAt: number[];
  notes: Note[];
  updatedAt: number;
}

/** Payload for creating a new prayer request */
export interface CreateRequestPayload {
  title: string;
  priority: Priority;
  durationPreset: DurationPreset;
}

/** An item in the render queue with its cycle number */
export interface QueueItem {
  request: PrayerRequest;
  cycle: number;
}

/** Stats displayed in the info modal */
export interface InfoStats {
  active: number;
  answered: number;
  queued: number;
  cycle: number;
  currentRequest: PrayerRequest | null;
}

/** Application settings */
export interface Settings {
  theme: Theme;
  defaultPriority: Priority;
  defaultDuration: DurationPreset;
}

/** Option type for select/dropdown components */
export interface SelectOption<T = string> {
  value: T;
  label: string;
}

/** Progress dot model for the navigation strip */
export interface ProgressDot {
  slot: number;
  index: number | null;
  isBeforeQueueStart: boolean;
  isAfterQueueEnd: boolean;
  isCurrent: boolean;
  isLoopPoint: boolean;
  isPlaceholder: boolean;
}

/** Touch coordinates for swipe detection */
export interface TouchCoords {
  x: number;
  y: number;
}

/** Answered modal state */
export interface AnsweredModalState {
  open: boolean;
  request: PrayerRequest | null;
  text: string;
}
