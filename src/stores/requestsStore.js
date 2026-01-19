import { computed, ref } from 'vue';
import {
  addNote as serviceAddNote,
  createRequest as serviceCreateRequest,
  deleteNote as serviceDeleteNote,
  deleteRequest as serviceDeleteRequest,
  editNote as serviceEditNote,
  initRequests,
  markAnswered as serviceMarkAnswered,
  recordPrayer as serviceRecordPrayer,
  updateRequest as serviceUpdateRequest,
} from '../app/requestsService.js';
import { createQueueService } from '../app/queueService.js';
import { priorityScore } from '../domain/requests.js';

const requests = ref([]);
const loading = ref(true);

const activeRequests = computed(() =>
  requests.value
    .filter((r) => r.status === 'active')
    .sort((a, b) => {
      const priorityDelta = (priorityScore[b.priority] || 0) - (priorityScore[a.priority] || 0);
      if (priorityDelta !== 0) return priorityDelta;
      const lastA = getLastPrayed(a) ?? 0;
      const lastB = getLastPrayed(b) ?? 0;
      return lastA - lastB;
    })
);

const answeredRequests = computed(() => requests.value.filter((r) => r.status === 'answered'));

const queue = createQueueService(activeRequests);
const { renderQueue, currentIndex, currentItem, progressDots, cycleCount, canGoPrevious, canGoNext } = queue;

const infoStats = computed(() => ({
  active: activeRequests.value.length,
  answered: answeredRequests.value.length,
  queued: renderQueue.value.length,
  cycle: cycleCount.value + 1,
  currentRequest: currentItem.value?.request || null,
}));

function getLastPrayed(request) {
  return request.prayedAt?.length ? Math.max(...request.prayedAt) : null;
}

function replaceRequest(updated) {
  const idx = requests.value.findIndex((r) => r.id === updated.id);
  if (idx !== -1) {
    requests.value.splice(idx, 1, updated);
  }
  renderQueue.value = renderQueue.value.map((item) =>
    item.request.id === updated.id ? { ...item, request: updated } : item
  );
}

async function init() {
  requests.value = await initRequests();
  loading.value = false;
  queue.resetFeed();
}

async function createRequest(payload) {
  const record = await serviceCreateRequest(payload);
  requests.value = [record, ...requests.value];
  queue.insertRequest(record);
}

async function recordPrayer(request) {
  const updated = await serviceRecordPrayer(request);
  replaceRequest(updated);
  return updated;
}

async function updateRequest(request) {
  const updated = await serviceUpdateRequest(request);
  replaceRequest(updated);
}

async function addNote({ request, text }) {
  const updated = await serviceAddNote({ request, text });
  replaceRequest(updated);
}

async function editNote({ request, note }) {
  const updated = await serviceEditNote({ request, note });
  replaceRequest(updated);
}

async function deleteNote({ request, note }) {
  const updated = await serviceDeleteNote({ request, note });
  replaceRequest(updated);
}

async function deleteRequest(request) {
  await serviceDeleteRequest(request.id);
  requests.value = requests.value.filter((r) => r.id !== request.id);
  queue.removeRequestFromQueue(request.id, { autoAdvance: true });
  if (renderQueue.value.length === 0) {
    queue.resetFeed();
  }
}

async function markAnswered({ request, text }) {
  const updated = await serviceMarkAnswered({ request, text });
  replaceRequest(updated);
  queue.removeRequestFromQueue(updated.id, { autoAdvance: true });
  if (renderQueue.value.length === 0) {
    queue.resetFeed();
  } else {
    const remaining = renderQueue.value.length - currentIndex.value;
    if (remaining <= 2) queue.loadMore();
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
    resetFeed: queue.resetFeed,
    loadMore: queue.loadMore,
    nextCard: queue.nextCard,
    previousCard: queue.previousCard,
    navigateToIndex: queue.navigateToIndex,
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
