import { computed, ref } from 'vue';
import type { Ref } from 'vue';
import type { PrayerRequest, ProgressDot, QueueItem } from '../types';
import {
  DEFAULT_QUEUE_CONFIG,
  type CycleState,
  type QueueConfig,
  createCycleState,
  pickNextFromCycle,
  removeFromCycle,
} from './queueAlgorithm.ts';

const PAGE_SIZE = 6;
const MAX_RENDER_QUEUE_SIZE = 36;
const KEEP_BEHIND_COUNT = 10;

type BuildProgressDotsArgs = {
  renderQueue: QueueItem[];
  currentIndex: number;
};

type ProgressDotItem = {
  index: number | null;
  isLoopPoint: boolean;
  isCurrent: boolean;
  isPlaceholder: boolean;
};

type CreateQueueOptions = {
  now?: () => number;
  config?: QueueConfig;
};

function buildProgressDots({ renderQueue, currentIndex }: BuildProgressDotsArgs): ProgressDot[] {
  const total = renderQueue.length;
  const maxVisible = 5;

  const isLoopPoint = (index: number): boolean => {
    if (index <= 0) return true;
    const current = renderQueue[index];
    const previous = renderQueue[index - 1];
    if (!current || !previous) return false;
    return current.cycle !== previous.cycle;
  };

  let start = Math.max(0, currentIndex - 2);
  let end = start + maxVisible;

  if (end > total) {
    end = total;
    start = Math.max(0, end - maxVisible);
  }

  const items: ProgressDotItem[] = [];
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

  const dots: ProgressDot[] = [];
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

export function createQueueService(
  activeRequests: Ref<PrayerRequest[]>,
  { now = () => Date.now(), config = DEFAULT_QUEUE_CONFIG }: CreateQueueOptions = {}
) {
  const renderQueue = ref<QueueItem[]>([]);
  const cycleCount = ref<number>(0);
  const currentIndex = ref<number>(0);
  let cycleState: CycleState | null = null;

  const currentItem = computed<QueueItem | null>(() => renderQueue.value[currentIndex.value] || null);

  const canGoPrevious = computed<boolean>(() => currentIndex.value > 0);
  const canGoNext = computed<boolean>(() => renderQueue.value.length > 1);

  const progressDots = computed<ProgressDot[]>(() =>
    buildProgressDots({
      renderQueue: renderQueue.value,
      currentIndex: currentIndex.value,
    })
  );

  function pruneRenderQueue(): void {
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

  function ensureCycleReady(): boolean {
    if (!cycleState || cycleState.remaining <= 0) {
      const pool = activeRequests.value;
      if (!pool.length) {
        cycleState = null;
        return false;
      }
      if (cycleState && cycleState.remaining <= 0) {
        cycleCount.value += 1;
      }
      cycleState = createCycleState(pool, { now: now(), config });
    }
    return true;
  }

  function loadMore(): void {
    const pool = activeRequests.value;
    if (!pool.length) return;
    const next: QueueItem[] = [];
    while (next.length < PAGE_SIZE) {
      if (!ensureCycleReady()) break;
      const request = pickNextFromCycle(cycleState);
      if (!request) break;
      next.push({ request, cycle: cycleCount.value });
    }
    if (next.length) {
      renderQueue.value = [...renderQueue.value, ...next];
      pruneRenderQueue();
    }
  }

  function resetFeed(): void {
    renderQueue.value = [];
    cycleState = null;
    cycleCount.value = 0;
    currentIndex.value = 0;
    if (activeRequests.value.length) {
      loadMore();
    }
  }

  function nextCard(): void {
    if (renderQueue.value.length <= 1) return;
    if (currentIndex.value < renderQueue.value.length - 1) {
      currentIndex.value += 1;
    } else {
      const beforeLength = renderQueue.value.length;
      loadMore();
      if (renderQueue.value.length > beforeLength) {
        currentIndex.value += 1;
      }
    }
    const remaining = renderQueue.value.length - currentIndex.value;
    if (remaining <= 2) loadMore();
  }

  function previousCard(): void {
    if (!canGoPrevious.value) return;
    currentIndex.value = Math.max(0, currentIndex.value - 1);
  }

  function navigateToIndex(index: number): void {
    if (index === currentIndex.value) return;
    currentIndex.value = index;
    const remaining = renderQueue.value.length - currentIndex.value;
    if (remaining <= 2) {
      loadMore();
    }
  }

  function removeRequestFromQueue(requestId: string, { autoAdvance = false }: { autoAdvance?: boolean } = {}): void {
    const oldQueue = renderQueue.value;
    if (!oldQueue.length) {
      currentIndex.value = 0;
      return;
    }

    const removedIndices: number[] = [];
    for (let i = 0; i < oldQueue.length; i += 1) {
      if (oldQueue[i].request.id === requestId) removedIndices.push(i);
    }
    if (!removedIndices.length) return;

    const wasCurrentRemoved = removedIndices.includes(currentIndex.value);
    const removedBeforeCurrent = removedIndices.filter((idx) => idx < currentIndex.value).length;

    const newQueue: QueueItem[] = oldQueue.filter((item) => item.request.id !== requestId);
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
    removeFromCycle(cycleState, requestId);
  }

  function insertRequest(record: PrayerRequest): void {
    if (renderQueue.value.length > 0) {
      const insertPosition = currentIndex.value + 1;
      const cycle = currentItem.value?.cycle ?? cycleCount.value;
      renderQueue.value.splice(insertPosition, 0, { request: record, cycle });
    } else {
      renderQueue.value = [{ request: record, cycle: 0 }];
      currentIndex.value = 0;
    }
  }

  return {
    renderQueue,
    cycleCount,
    currentIndex,
    currentItem,
    canGoPrevious,
    canGoNext,
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
