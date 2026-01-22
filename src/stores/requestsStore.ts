import { computed, reactive, ref, toRefs } from 'vue';
import type { CreateRequestPayload, InfoStats, Note, PrayerRequest } from '../core/types';
import {
  buildProgressDots,
  canGoNext as canGoNextFromState,
  canGoPrevious as canGoPreviousFromState,
  createQueueState,
  getCurrentItem,
  insertRequest,
  loadMore,
  navigateToIndex,
  nextCard,
  previousCard,
  removeRequestFromQueue,
  resetFeed,
  type QueueState,
} from '../services/queueEngine';
import {
  initRequests,
  addNote as serviceAddNote,
  createRequest as serviceCreateRequest,
  deleteNote as serviceDeleteNote,
  deleteRequest as serviceDeleteRequest,
  editNote as serviceEditNote,
  markAnswered as serviceMarkAnswered,
  recordPrayer as serviceRecordPrayer,
  updateRequest as serviceUpdateRequest,
} from '../services/requestsService';

const requests = ref<PrayerRequest[]>([]);
const loading = ref<boolean>(true);

const activeRequests = computed<PrayerRequest[]>(() => {
  const now = Date.now();
  return requests.value.filter((r) => r.status === 'active' && r.expiresAt > now);
});

const answeredRequests = computed<PrayerRequest[]>(() => requests.value.filter((r) => r.status === 'answered'));

const queueState = reactive<QueueState>(createQueueState());
const { renderQueue, currentIndex, cycleCount } = toRefs(queueState);
const currentItem = computed(() => getCurrentItem(queueState));
const progressDots = computed(() => buildProgressDots(queueState));
const canGoPrevious = computed(() => canGoPreviousFromState(queueState));
const canGoNext = computed(() => canGoNextFromState(queueState));

const infoStats = computed<InfoStats>(() => ({
  active: activeRequests.value.length,
  answered: answeredRequests.value.length,
  queued: renderQueue.value.length,
  cycle: (currentItem.value?.cycle ?? cycleCount.value) + 1,
  currentRequest: currentItem.value?.request || null,
}));

function replaceRequest(updated: PrayerRequest): void {
  const idx = requests.value.findIndex((r) => r.id === updated.id);
  if (idx !== -1) {
    requests.value.splice(idx, 1, updated);
  }
  renderQueue.value = renderQueue.value.map((item) =>
    item.request.id === updated.id ? { ...item, request: updated } : item
  );
}

async function init(): Promise<void> {
  requests.value = await initRequests();
  loading.value = false;
  resetFeed(queueState, activeRequests.value);
}

async function createRequest(payload: CreateRequestPayload): Promise<void> {
  const record = await serviceCreateRequest(payload);
  requests.value = [record, ...requests.value];
  insertRequest(queueState, record);
}

async function recordPrayer(request: PrayerRequest): Promise<PrayerRequest> {
  const updated = await serviceRecordPrayer(request);
  replaceRequest(updated);
  return updated;
}

async function updateRequest(request: PrayerRequest): Promise<void> {
  const updated = await serviceUpdateRequest(request);
  replaceRequest(updated);
}

async function addNote({ request, text }: { request: PrayerRequest; text: string }): Promise<void> {
  const updated = await serviceAddNote({ request, text });
  replaceRequest(updated);
}

async function editNote({ request, note }: { request: PrayerRequest; note: Note }): Promise<void> {
  const updated = await serviceEditNote({ request, note });
  replaceRequest(updated);
}

async function deleteNote({ request, note }: { request: PrayerRequest; note: Note }): Promise<void> {
  const updated = await serviceDeleteNote({ request, note });
  replaceRequest(updated);
}

async function deleteRequest(request: PrayerRequest): Promise<void> {
  await serviceDeleteRequest(request.id);
  requests.value = requests.value.filter((r) => r.id !== request.id);
  removeRequestFromQueue(queueState, request.id);
  if (renderQueue.value.length === 0) {
    resetFeed(queueState, activeRequests.value);
  }
}

async function markAnswered({ request, text }: { request: PrayerRequest; text: string }): Promise<PrayerRequest> {
  const updated = await serviceMarkAnswered({ request, text });
  replaceRequest(updated);
  removeRequestFromQueue(queueState, updated.id);
  if (renderQueue.value.length === 0) {
    resetFeed(queueState, activeRequests.value);
  } else {
    const remaining = renderQueue.value.length - currentIndex.value;
    if (remaining <= 2) loadMore(queueState, activeRequests.value);
  }
  return updated;
}

export function useRequestsStore() {
  return {
    requests,
    loading,
    activeRequests,
    answeredRequests,
    renderQueue,
    currentIndex,
    currentItem,
    canGoPrevious,
    canGoNext,
    progressDots,
    infoStats,
    init,
    resetFeed: () => resetFeed(queueState, activeRequests.value),
    loadMore: () => loadMore(queueState, activeRequests.value),
    nextCard: () => nextCard(queueState, activeRequests.value),
    previousCard: () => previousCard(queueState),
    navigateToIndex: (index: number) => navigateToIndex(queueState, index, activeRequests.value),
    createRequest,
    recordPrayer,
    updateRequest,
    addNote,
    editNote,
    deleteNote,
    deleteRequest,
    markAnswered,
  };
}
