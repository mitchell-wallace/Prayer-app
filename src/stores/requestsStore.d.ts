import type { ComputedRef, Ref } from 'vue';
import type { InfoStats, Note, PrayerRequest, ProgressDot, QueueItem } from '../types';

export interface RequestsStore {
  requests: Ref<PrayerRequest[]>;
  loading: Ref<boolean>;
  activeRequests: ComputedRef<PrayerRequest[]>;
  answeredRequests: ComputedRef<PrayerRequest[]>;
  renderQueue: Ref<QueueItem[]>;
  currentIndex: Ref<number>;
  currentItem: ComputedRef<QueueItem | null>;
  canGoPrevious: ComputedRef<boolean>;
  canGoNext: ComputedRef<boolean>;
  progressDots: ComputedRef<ProgressDot[]>;
  infoStats: ComputedRef<InfoStats>;
  init: () => Promise<void>;
  resetFeed: () => void;
  loadMore: () => void;
  nextCard: () => void;
  previousCard: () => void;
  navigateToIndex: (index: number) => void;
  createRequest: (payload: {
    title: string;
    priority: PrayerRequest['priority'];
    durationPreset: PrayerRequest['durationPreset'];
  }) => Promise<void>;
  recordPrayer: (request: PrayerRequest) => Promise<PrayerRequest>;
  updateRequest: (request: PrayerRequest) => Promise<void>;
  addNote: (payload: { request: PrayerRequest; text: string }) => Promise<void>;
  editNote: (payload: { request: PrayerRequest; note: Note }) => Promise<void>;
  deleteNote: (payload: { request: PrayerRequest; note: Note }) => Promise<void>;
  deleteRequest: (request: PrayerRequest) => Promise<void>;
  markAnswered: (payload: { request: PrayerRequest; text: string }) => Promise<PrayerRequest>;
}

export function useRequestsStore(): RequestsStore;
