const MS_PER_DAY = 1000 * 60 * 60 * 24;

export const DEFAULT_QUEUE_CONFIG = {
  priorityOrder: ['urgent', 'high', 'medium', 'low'],
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
  interleaveWindow: 0.3,
  interleaveWeights: {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  },
};

export function buildInterleaveDeck(weights, priorityOrder) {
  const deck = [];
  for (const priority of priorityOrder) {
    const count = Math.max(0, Math.floor(weights[priority] || 0));
    for (let i = 0; i < count; i += 1) {
      deck.push(priority);
    }
  }
  return deck.length ? deck : [...priorityOrder];
}

export function computeDaysSince(lastPrayedAt, now) {
  if (lastPrayedAt === null || lastPrayedAt === undefined) return 0;
  return Math.max(0, (now - lastPrayedAt) / MS_PER_DAY);
}

export function computeRecencyScale(daysSince, recoveryDays, { recencyMin, recencyMax }) {
  if (!recoveryDays || recoveryDays <= 0) return recencyMax;
  const cap = recoveryDays * 2;
  const ratio = Math.min(daysSince, cap) / cap;
  return recencyMin + ratio * (recencyMax - recencyMin);
}

export function computeScore(request, now, config = DEFAULT_QUEUE_CONFIG) {
  const lastPrayedAt = request.prayedAt?.length ? Math.max(...request.prayedAt) : null;
  const daysSince = computeDaysSince(lastPrayedAt, now);
  const recency = computeRecencyScale(daysSince, config.recoveryDays[request.priority], config);
  return (config.priorityWeights[request.priority] || 0) * recency;
}

function buildBucketItem(request, now, config) {
  return {
    request,
    score: computeScore(request, now, config),
    lastPrayedAt: request.prayedAt?.length ? Math.max(...request.prayedAt) : 0,
    createdAt: request.createdAt ?? 0,
  };
}

function sortBucket(bucket) {
  bucket.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (a.lastPrayedAt !== b.lastPrayedAt) return b.lastPrayedAt - a.lastPrayedAt;
    return b.createdAt - a.createdAt;
  });
}

function bucketTopScore(bucket) {
  return bucket.length ? bucket[bucket.length - 1].score : null;
}

function pickPriorityFromDeck(state, eligible) {
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

function selectNextPriority(state) {
  const scored = [];
  for (const priority of state.priorityOrder) {
    const score = bucketTopScore(state.buckets[priority]);
    if (score !== null) scored.push({ priority, score });
  }
  if (!scored.length) return null;

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

export function createCycleState(requests, { now = Date.now(), config = DEFAULT_QUEUE_CONFIG } = {}) {
  const priorityOrder = config.priorityOrder || DEFAULT_QUEUE_CONFIG.priorityOrder;
  const buckets = {};
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
  };
}

export function pickNextFromCycle(state) {
  if (!state || state.remaining <= 0) return null;
  const priority = selectNextPriority(state);
  if (!priority) return null;
  const item = state.buckets[priority].pop();
  if (!item) return null;
  state.remaining -= 1;
  return item.request;
}

export function removeFromCycle(state, requestId) {
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
