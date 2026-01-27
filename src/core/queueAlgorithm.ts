/**
 * Queue scoring and cycle selection logic.
 * Pure algorithmic decisions only; no persistence or UI state.
 */
import type { PrayerRequest, Priority } from '@/core/types';

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const REQUIRED_PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low'];

export type QueueConfig = {
  priorityOrder: Priority[];
  priorityWeights: Record<Priority, number>;
  recoveryDays: Record<Priority, number>;
  recencyMin: number;
  recencyMax: number;
  interleaveWindow: number;
  interleaveWeights: Record<Priority, number>;
  newCardBoost: number;
  maxRunLength: number;
};

type BucketItem = {
  request: PrayerRequest;
  score: number;
  lastPrayedAt: number;
  createdAt: number;
};

export type CycleState = {
  buckets: Record<Priority, BucketItem[]>;
  remaining: number;
  deck: Priority[];
  deckIndex: number;
  priorityOrder: Priority[];
  interleaveWindow: number;
  maxRunLength: number;
  lastPriority: Priority | null;
  currentRunLength: number;
};

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  priorityOrder: [...REQUIRED_PRIORITIES],
  priorityWeights: {
    urgent: 100,
    high: 70,
    medium: 40,
    low: 20,
  },
  recoveryDays: {
    urgent: 3,
    high: 7,
    medium: 10,
    low: 14,
  },
  recencyMin: 0.1,
  recencyMax: 2.0,
  interleaveWindow: 0.4,
  interleaveWeights: {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  },
  newCardBoost: 1.25,
  maxRunLength: 3,
};

function assertPriorityOrder(priorityOrder: Priority[]): void {
  if (!Array.isArray(priorityOrder)) {
    throw new Error('QueueConfig priorityOrder must be an array');
  }
  const invalid = priorityOrder.filter((priority) => !REQUIRED_PRIORITIES.includes(priority));
  if (invalid.length > 0) {
    throw new Error(`QueueConfig priorityOrder has invalid priorities: ${invalid.join(', ')}`);
  }
  const missing = REQUIRED_PRIORITIES.filter((priority) => !priorityOrder.includes(priority));
  if (missing.length > 0) {
    throw new Error(`QueueConfig priorityOrder missing priorities: ${missing.join(', ')}`);
  }
  const unique = new Set(priorityOrder);
  if (unique.size !== priorityOrder.length) {
    throw new Error('QueueConfig priorityOrder contains duplicate priorities');
  }
}

function assertPositiveWeights(weights: Record<Priority, number>, label: string): void {
  for (const priority of REQUIRED_PRIORITIES) {
    const value = weights[priority];
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`QueueConfig ${label}.${priority} must be a positive number`);
    }
  }
}

function assertQueueConfig(config: QueueConfig): void {
  assertPriorityOrder(config.priorityOrder);
  assertPositiveWeights(config.priorityWeights, 'priorityWeights');
  assertPositiveWeights(config.interleaveWeights, 'interleaveWeights');
}

export function buildInterleaveDeck(weights: Record<Priority, number>, priorityOrder: Priority[]): Priority[] {
  const deck: Priority[] = [];
  for (const priority of priorityOrder) {
    const count = Math.max(0, Math.floor(weights[priority] ?? 0));
    for (let i = 0; i < count; i += 1) {
      deck.push(priority);
    }
  }
  return deck.length ? deck : [...priorityOrder];
}

export function computeDaysSince(lastPrayedAt: number | null | undefined, now: number): number {
  if (lastPrayedAt === null || lastPrayedAt === undefined) return 0;
  return Math.max(0, (now - lastPrayedAt) / MS_PER_DAY);
}

export function computeRecencyScale(
  daysSince: number,
  recoveryDays: number,
  { recencyMin, recencyMax }: Pick<QueueConfig, 'recencyMin' | 'recencyMax'>
): number {
  if (!recoveryDays || recoveryDays <= 0) return recencyMax;
  const cap = recoveryDays * 2;
  const ratio = Math.min(daysSince, cap) / cap;
  return recencyMin + ratio * (recencyMax - recencyMin);
}

export function computeScore(request: PrayerRequest, now: number, config: QueueConfig = DEFAULT_QUEUE_CONFIG): number {
  const lastPrayedAt = request.prayedAt?.length ? Math.max(...request.prayedAt) : 0;
  const daysSince = computeDaysSince(lastPrayedAt, now);
  const recency = computeRecencyScale(daysSince, config.recoveryDays[request.priority], config);
  return (config.priorityWeights[request.priority] ?? 0) * recency;
}

function buildBucketItem(request: PrayerRequest, now: number, config: QueueConfig): BucketItem {
  return {
    request,
    score: computeScore(request, now, config),
    lastPrayedAt: request.prayedAt?.length ? Math.max(...request.prayedAt) : 0,
    createdAt: request.createdAt ?? 0,
  };
}

function sortBucket(bucket: BucketItem[]): void {
  bucket.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.lastPrayedAt !== b.lastPrayedAt) return a.lastPrayedAt - b.lastPrayedAt;
    return b.createdAt - a.createdAt;
  });
}

function bucketTopScore(bucket: BucketItem[]): number | null {
  return bucket.length ? bucket[bucket.length - 1].score : null;
}

function pickPriorityFromDeck(state: CycleState, eligible: Set<Priority>): Priority | null {
  const deck = state.deck;
  if (!deck.length) return null;
  for (let i = 0; i < deck.length; i += 1) {
    const idx = (state.deckIndex + i) % deck.length;
    const priority = deck[idx];
    if (eligible.has(priority)) {
      state.deckIndex = (idx + 1) % deck.length;
      return priority;
    }
  }
  return null;
}

function selectNextPriority(state: CycleState): Priority | null {
  const scored: Array<{ priority: Priority; score: number }> = [];
  for (const priority of state.priorityOrder) {
    // Skip if this priority has reached max consecutive picks
    if (state.lastPriority === priority && state.currentRunLength >= state.maxRunLength) {
      continue;
    }
    const score = bucketTopScore(state.buckets[priority]);
    if (score !== null) scored.push({ priority, score });
  }
  if (!scored.length) {
    // All priorities exhausted or blocked - reset and try any available
    for (const priority of state.priorityOrder) {
      const score = bucketTopScore(state.buckets[priority]);
      if (score !== null) scored.push({ priority, score });
    }
    if (!scored.length) return null;
  }

  let maxScore = scored[0].score;
  for (const item of scored) {
    if (item.score > maxScore) maxScore = item.score;
  }

  const threshold = maxScore * (1 - state.interleaveWindow);
  const eligible = new Set(scored.filter((item) => item.score >= threshold).map((item) => item.priority));
  const picked = pickPriorityFromDeck(state, eligible);
  if (picked) return picked;

  let bestPriority = scored[0].priority;
  let bestScore = scored[0].score;
  for (const item of scored) {
    if (item.score > bestScore) {
      bestScore = item.score;
      bestPriority = item.priority;
    }
  }
  return bestPriority;
}

export function createCycleState(
  requests: PrayerRequest[],
  { now = Date.now(), config = DEFAULT_QUEUE_CONFIG }: { now?: number; config?: QueueConfig } = {}
): CycleState {
  assertQueueConfig(config);
  const priorityOrder = config.priorityOrder || DEFAULT_QUEUE_CONFIG.priorityOrder;
  const buckets: Record<Priority, BucketItem[]> = {
    urgent: [],
    high: [],
    medium: [],
    low: [],
  };
  let remaining = 0;

  for (const priority of priorityOrder) {
    buckets[priority] = [];
  }

  for (const request of requests) {
    if (!buckets[request.priority]) continue;
    buckets[request.priority].push(buildBucketItem(request, now, config));
    remaining += 1;
  }

  for (const priority of priorityOrder) {
    sortBucket(buckets[priority]);
  }

  return {
    buckets,
    remaining,
    deck: buildInterleaveDeck(config.interleaveWeights, priorityOrder),
    deckIndex: 0,
    priorityOrder,
    interleaveWindow: config.interleaveWindow,
    maxRunLength: config.maxRunLength,
    lastPriority: null,
    currentRunLength: 0,
  };
}

export function pickNextFromCycle(state: CycleState | null): PrayerRequest | null {
  if (!state || state.remaining <= 0) return null;
  const priority = selectNextPriority(state);
  if (!priority) return null;
  const item = state.buckets[priority].pop();
  if (!item) return null;
  state.remaining -= 1;

  // Track run length for max-run-length constraint
  if (state.lastPriority === priority) {
    state.currentRunLength += 1;
  } else {
    state.lastPriority = priority;
    state.currentRunLength = 1;
  }

  return item.request;
}

export function removeFromCycle(state: CycleState | null, requestId: string): void {
  if (!state) return;
  for (const priority of state.priorityOrder) {
    const bucket = state.buckets[priority];
    const idx = bucket.findIndex((item) => item.request.id === requestId);
    if (idx !== -1) {
      bucket.splice(idx, 1);
      state.remaining = Math.max(0, state.remaining - 1);
      return;
    }
  }
}
