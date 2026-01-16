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
import { priorityScore } from '../domain/requests.js';

const requests = ref([]);
const loading = ref(true);

const pageSize = 6;
const MAX_RENDER_QUEUE_SIZE = 36;
const KEEP_BEHIND_COUNT = 10;

const renderQueue = ref([]);
const feedIndex = ref(0);
const cycleCount = ref(0);
const currentIndex = ref(0);

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
const currentItem = computed(() => renderQueue.value[currentIndex.value] || null);

const progressIndicator = computed(() => {
  const total = renderQueue.value.length;
  const poolSize = activeRequests.value.length;
  const maxVisible = 5;

  const isLoopPoint = (index) => poolSize > 0 && index % poolSize === 0;

  let start = Math.max(0, currentIndex.value - 2);
  let end = start + maxVisible;

  if (end > total) {
    end = total;
    start = Math.max(0, end - maxVisible);
  }

  const items = [];
  for (let i = start; i < end; i += 1) {
    items.push({
      ...renderQueue.value[i],
      index: i,
      isLoopPoint: isLoopPoint(i),
    });
  }

  const hasLeftOverflow = start > 0;
  const hasRightOverflow = end < total;

  const leftOverflowIsLoopAdjacent = hasLeftOverflow && isLoopPoint(start - 1);
  const rightOverflowIsLoopAdjacent = hasRightOverflow && isLoopPoint(end);

  return {
    items,
    hasLeftOverflow,
    hasRightOverflow,
    leftOverflowIsLoopAdjacent,
    rightOverflowIsLoopAdjacent,
  };
});

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

function resetFeed() {
  renderQueue.value = [];
  feedIndex.value = 0;
  cycleCount.value = 0;
  currentIndex.value = 0;
  if (activeRequests.value.length) {
    loadMore();
  }
}

function pruneRenderQueue() {
  const overflow = renderQueue.value.length - MAX_RENDER_QUEUE_SIZE;
  if (overflow <= 0) return;

  const removableFromFront = Math.max(0, currentIndex.value - KEEP_BEHIND_COUNT);
  const dropFromFront = Math.min(overflow, removableFromFront);
  if (dropFromFront > 0) {
    renderQueue.value.splice(0, dropFromFront);
    currentIndex.value -= dropFromFront;
  }

  const remainingOverflow = renderQueue.value.length - MAX_RENDER_QUEUE_SIZE;
  if (remainingOverflow > 0) {
    renderQueue.value.splice(renderQueue.value.length - remainingOverflow, remainingOverflow);
  }
}

function loadMore() {
  const pool = activeRequests.value;
  if (!pool.length) return;
  const next = [];
  for (let i = 0; i < pageSize; i += 1) {
    const idx = (feedIndex.value + i) % pool.length;
    const cycle = Math.floor((feedIndex.value + i) / pool.length) + cycleCount.value;
    next.push({ request: pool[idx], cycle });
  }
  feedIndex.value += pageSize;
  if (feedIndex.value >= pool.length) {
    const completed = Math.floor(feedIndex.value / pool.length);
    cycleCount.value += completed;
    feedIndex.value = feedIndex.value % pool.length;
  }
  renderQueue.value = [...renderQueue.value, ...next];
  pruneRenderQueue();
}

function nextCard() {
  if (renderQueue.value.length <= 1) return;
  currentIndex.value = (currentIndex.value + 1) % renderQueue.value.length;
  const remaining = renderQueue.value.length - currentIndex.value;
  if (remaining <= 2) {
    loadMore();
  }
}

function previousCard() {
  if (renderQueue.value.length <= 1) return;
  currentIndex.value = (currentIndex.value - 1 + renderQueue.value.length) % renderQueue.value.length;
}

function navigateToIndex(index) {
  if (index === currentIndex.value) return;
  currentIndex.value = index;
  const remaining = renderQueue.value.length - currentIndex.value;
  if (remaining <= 2) {
    loadMore();
  }
}

function removeRequestFromQueue(requestId, { autoAdvance = false } = {}) {
  const oldQueue = renderQueue.value;
  if (!oldQueue.length) {
    currentIndex.value = 0;
    return;
  }

  const removedIndices = [];
  for (let i = 0; i < oldQueue.length; i += 1) {
    if (oldQueue[i].request.id === requestId) removedIndices.push(i);
  }
  if (!removedIndices.length) return;

  const wasCurrentRemoved = removedIndices.includes(currentIndex.value);
  const removedBeforeCurrent = removedIndices.filter((idx) => idx < currentIndex.value).length;

  const newQueue = oldQueue.filter((item) => item.request.id !== requestId);
  renderQueue.value = newQueue;

  if (!newQueue.length) {
    currentIndex.value = 0;
    return;
  }

  let nextIndex = currentIndex.value - removedBeforeCurrent;

  if (wasCurrentRemoved && nextIndex >= newQueue.length) {
    nextIndex = 0;
  }

  nextIndex = Math.max(0, Math.min(nextIndex, newQueue.length - 1));

  if (autoAdvance && wasCurrentRemoved && newQueue.length > 1) {
    // Keep the same index; no additional increment needed.
  }

  currentIndex.value = nextIndex;
}

async function init() {
  requests.value = await initRequests();
  loading.value = false;
  resetFeed();
}

async function createRequest(payload) {
  const record = await serviceCreateRequest(payload);
  requests.value = [record, ...requests.value];

  if (renderQueue.value.length > 0) {
    const insertPosition = currentIndex.value + 1;
    renderQueue.value.splice(insertPosition, 0, { request: record, cycle: cycleCount.value });
  } else {
    renderQueue.value = [{ request: record, cycle: 0 }];
    currentIndex.value = 0;
  }
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
  removeRequestFromQueue(request.id, { autoAdvance: true });
  if (renderQueue.value.length === 0) {
    resetFeed();
  }
}

async function markAnswered({ request, text }) {
  const updated = await serviceMarkAnswered({ request, text });
  replaceRequest(updated);
  removeRequestFromQueue(updated.id, { autoAdvance: true });
  if (renderQueue.value.length === 0) {
    resetFeed();
  } else {
    const remaining = renderQueue.value.length - currentIndex.value;
    if (remaining <= 2) loadMore();
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
    progressIndicator,
    infoStats,
    init,
    resetFeed,
    loadMore,
    nextCard,
    previousCard,
    navigateToIndex,
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
