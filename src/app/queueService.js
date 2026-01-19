import { computed, ref } from 'vue';

const PAGE_SIZE = 6;
const MAX_RENDER_QUEUE_SIZE = 36;
const KEEP_BEHIND_COUNT = 10;

function buildProgressDots({ renderQueue, currentIndex, poolSize }) {
  const total = renderQueue.length;
  const maxVisible = 5;

  const isLoopPoint = (index) => poolSize > 0 && index % poolSize === 0;

  let start = Math.max(0, currentIndex - 2);
  let end = start + maxVisible;

  if (end > total) {
    end = total;
    start = Math.max(0, end - maxVisible);
  }

  const items = [];
  for (let i = start; i < end; i += 1) {
    items.push({
      index: i,
      isLoopPoint: isLoopPoint(i),
      isCurrent: i === currentIndex,
      isPlaceholder: false,
    });
  }

  while (items.length < maxVisible) {
    items.push({
      index: null,
      isLoopPoint: false,
      isCurrent: false,
      isPlaceholder: true,
    });
  }

  const hasLeftOverflow = start > 0;
  const hasRightOverflow = end < total;

  const leftOverflowIsLoopAdjacent = hasLeftOverflow && isLoopPoint(start - 1);
  const rightOverflowIsLoopAdjacent = hasRightOverflow && isLoopPoint(end);

  const dots = [];
  dots.push({
    slot: 0,
    index: null,
    isBeforeQueueStart: !hasLeftOverflow,
    isAfterQueueEnd: false,
    isCurrent: false,
    isLoopPoint: leftOverflowIsLoopAdjacent,
    isPlaceholder: !hasLeftOverflow,
  });

  items.forEach((item, slotIndex) => {
    dots.push({
      slot: slotIndex + 1,
      index: item.index,
      isBeforeQueueStart: false,
      isAfterQueueEnd: false,
      isCurrent: item.isCurrent,
      isLoopPoint: item.isLoopPoint,
      isPlaceholder: item.isPlaceholder,
    });
  });

  dots.push({
    slot: 6,
    index: null,
    isBeforeQueueStart: false,
    isAfterQueueEnd: !hasRightOverflow,
    isCurrent: false,
    isLoopPoint: rightOverflowIsLoopAdjacent,
    isPlaceholder: false,
  });

  return dots;
}

export function createQueueService(activeRequests) {
  const renderQueue = ref([]);
  const feedIndex = ref(0);
  const cycleCount = ref(0);
  const currentIndex = ref(0);

  const currentItem = computed(() => renderQueue.value[currentIndex.value] || null);

  const progressDots = computed(() =>
    buildProgressDots({
      renderQueue: renderQueue.value,
      currentIndex: currentIndex.value,
      poolSize: activeRequests.value.length,
    })
  );

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
    for (let i = 0; i < PAGE_SIZE; i += 1) {
      const idx = (feedIndex.value + i) % pool.length;
      const cycle = Math.floor((feedIndex.value + i) / pool.length) + cycleCount.value;
      next.push({ request: pool[idx], cycle });
    }
    feedIndex.value += PAGE_SIZE;
    if (feedIndex.value >= pool.length) {
      const completed = Math.floor(feedIndex.value / pool.length);
      cycleCount.value += completed;
      feedIndex.value = feedIndex.value % pool.length;
    }
    renderQueue.value = [...renderQueue.value, ...next];
    pruneRenderQueue();
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

  function insertRequest(record) {
    if (renderQueue.value.length > 0) {
      const insertPosition = currentIndex.value + 1;
      renderQueue.value.splice(insertPosition, 0, { request: record, cycle: cycleCount.value });
    } else {
      renderQueue.value = [{ request: record, cycle: 0 }];
      currentIndex.value = 0;
    }
  }

  return {
    renderQueue,
    feedIndex,
    cycleCount,
    currentIndex,
    currentItem,
    progressDots,
    resetFeed,
    loadMore,
    nextCard,
    previousCard,
    navigateToIndex,
    removeRequestFromQueue,
    insertRequest,
  };
}
