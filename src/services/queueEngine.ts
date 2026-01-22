/**
 * Queue engine for feed state transitions.
 * Pure state manipulation only; no Vue reactivity and no persistence.
 */
import type { PrayerRequest, ProgressDot, QueueItem } from '../core/types';
import {
  type CycleState,
  createCycleState,
  DEFAULT_QUEUE_CONFIG,
  pickNextFromCycle,
  type QueueConfig,
  removeFromCycle,
} from '../core/queueAlgorithm';

const PAGE_SIZE = 6;
const MAX_RENDER_QUEUE_SIZE = 36;
const KEEP_BEHIND_COUNT = 10;

export type QueueState = {
  renderQueue: QueueItem[];
  cycleCount: number;
  currentIndex: number;
  cycleState: CycleState | null;
};

export type QueueEngineOptions = {
  now?: () => number;
  config?: QueueConfig;
};

export function createQueueState(): QueueState {
  return {
    renderQueue: [],
    cycleCount: 0,
    currentIndex: 0,
    cycleState: null,
  };
}

export function getCurrentItem(state: QueueState): QueueItem | null {
  return state.renderQueue[state.currentIndex] ?? null;
}

export function canGoPrevious(state: QueueState): boolean {
  return state.currentIndex > 0;
}

export function canGoNext(state: QueueState): boolean {
  return state.renderQueue.length > 1;
}

export function buildProgressDots(state: QueueState): ProgressDot[] {
  const total = state.renderQueue.length;
  const maxVisible = 5;

  const isLoopPoint = (index: number): boolean => {
    if (index <= 0) return true;
    const current = state.renderQueue[index];
    const previous = state.renderQueue[index - 1];
    if (!current || !previous) return false;
    return current.cycle !== previous.cycle;
  };

  let start = Math.max(0, state.currentIndex - 2);
  let end = start + maxVisible;

  if (end > total) {
    end = total;
    start = Math.max(0, end - maxVisible);
  }

  const items: Array<{
    index: number | null;
    isLoopPoint: boolean;
    isCurrent: boolean;
    isPlaceholder: boolean;
  }> = [];
  for (let i = start; i < end; i += 1) {
    items.push({
      index: i,
      isLoopPoint: isLoopPoint(i),
      isCurrent: i === state.currentIndex,
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

function pruneRenderQueue(state: QueueState): void {
  const overflow = state.renderQueue.length - MAX_RENDER_QUEUE_SIZE;
  if (overflow <= 0) return;

  const removableFromFront = Math.max(0, state.currentIndex - KEEP_BEHIND_COUNT);
  const dropFromFront = Math.min(overflow, removableFromFront);
  if (dropFromFront > 0) {
    state.renderQueue.splice(0, dropFromFront);
    state.currentIndex -= dropFromFront;
  }

  const remainingOverflow = state.renderQueue.length - MAX_RENDER_QUEUE_SIZE;
  if (remainingOverflow > 0) {
    state.renderQueue.splice(state.renderQueue.length - remainingOverflow, remainingOverflow);
  }
}

function ensureCycleReady(
  state: QueueState,
  activeRequests: PrayerRequest[],
  { now = () => Date.now(), config = DEFAULT_QUEUE_CONFIG }: QueueEngineOptions = {}
): boolean {
  if (!state.cycleState || state.cycleState.remaining <= 0) {
    if (!activeRequests.length) {
      state.cycleState = null;
      return false;
    }
    if (state.cycleState && state.cycleState.remaining <= 0) {
      state.cycleCount += 1;
    }
    state.cycleState = createCycleState(activeRequests, { now: now(), config });
  }
  return true;
}

export function loadMore(
  state: QueueState,
  activeRequests: PrayerRequest[],
  options: QueueEngineOptions = {}
): void {
  if (!activeRequests.length) return;
  const next: QueueItem[] = [];
  while (next.length < PAGE_SIZE) {
    if (!ensureCycleReady(state, activeRequests, options)) break;
    const request = pickNextFromCycle(state.cycleState);
    if (!request) break;
    next.push({ request, cycle: state.cycleCount });
  }
  if (next.length) {
    state.renderQueue = [...state.renderQueue, ...next];
    pruneRenderQueue(state);
  }
}

export function resetFeed(
  state: QueueState,
  activeRequests: PrayerRequest[],
  options: QueueEngineOptions = {}
): void {
  state.renderQueue = [];
  state.cycleState = null;
  state.cycleCount = 0;
  state.currentIndex = 0;
  if (activeRequests.length) {
    loadMore(state, activeRequests, options);
  }
}

export function nextCard(
  state: QueueState,
  activeRequests: PrayerRequest[],
  options: QueueEngineOptions = {}
): void {
  if (state.renderQueue.length <= 1) return;
  if (state.currentIndex < state.renderQueue.length - 1) {
    state.currentIndex += 1;
  } else {
    const beforeLength = state.renderQueue.length;
    loadMore(state, activeRequests, options);
    if (state.renderQueue.length > beforeLength) {
      state.currentIndex += 1;
    }
  }
  const remaining = state.renderQueue.length - state.currentIndex;
  if (remaining <= 2) loadMore(state, activeRequests, options);
}

export function previousCard(state: QueueState): void {
  if (state.currentIndex <= 0) return;
  state.currentIndex = Math.max(0, state.currentIndex - 1);
}

export function navigateToIndex(
  state: QueueState,
  index: number,
  activeRequests: PrayerRequest[],
  options: QueueEngineOptions = {}
): void {
  if (index === state.currentIndex) return;
  state.currentIndex = index;
  const remaining = state.renderQueue.length - state.currentIndex;
  if (remaining <= 2) {
    loadMore(state, activeRequests, options);
  }
}

export function removeRequestFromQueue(state: QueueState, requestId: string): void {
  const oldQueue = state.renderQueue;
  if (!oldQueue.length) {
    state.currentIndex = 0;
    return;
  }

  const removedIndices: number[] = [];
  for (let i = 0; i < oldQueue.length; i += 1) {
    if (oldQueue[i].request.id === requestId) removedIndices.push(i);
  }
  if (!removedIndices.length) return;

  const wasCurrentRemoved = removedIndices.includes(state.currentIndex);
  const removedBeforeCurrent = removedIndices.filter((idx) => idx < state.currentIndex).length;

  const newQueue: QueueItem[] = oldQueue.filter((item) => item.request.id !== requestId);
  state.renderQueue = newQueue;

  if (!newQueue.length) {
    state.currentIndex = 0;
    return;
  }

  let nextIndex = state.currentIndex - removedBeforeCurrent;

  if (wasCurrentRemoved && nextIndex >= newQueue.length) {
    nextIndex = 0;
  }

  state.currentIndex = Math.max(0, Math.min(nextIndex, newQueue.length - 1));
  removeFromCycle(state.cycleState, requestId);
}

export function insertRequest(state: QueueState, record: PrayerRequest): void {
  if (state.renderQueue.length > 0) {
    const insertPosition = state.currentIndex + 1;
    const cycle = getCurrentItem(state)?.cycle ?? state.cycleCount;
    state.renderQueue.splice(insertPosition, 0, { request: record, cycle });
  } else {
    state.renderQueue = [{ request: record, cycle: 0 }];
    state.currentIndex = 0;
  }
}
