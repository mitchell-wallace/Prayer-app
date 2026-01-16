<template>
  <div class="flex h-[100dvh] flex-col overflow-hidden bg-bg text-text">
    <header
      class="z-30 w-full flex-none bg-header-bg backdrop-blur"
    >
      <div class="mx-auto max-w-3xl px-4 sm:px-6">
        <div class="flex h-12 items-center justify-between">
          <span class="text-sm font-semibold tracking-wide uppercase text-muted">Prayer Rhythm</span>
          <div class="flex items-center gap-2">
            <InfoModal :stats="infoStats" />
            <SettingsModal />
          </div>
        </div>
      </div>
    </header>

    <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-x-clip px-4 pt-3 pb-2 sm:px-6">
      <p v-if="!activeRequests.length && !loading" class="mt-2 text-sm text-muted">
        No active requests yet. Add one below.
      </p>

      <div v-if="loading" class="text-sm text-muted">Loading requests…</div>

      <!-- Card container with padding for shadow overflow -->
      <div
        v-if="currentItem"
        class="relative flex-1 min-h-0 -mx-2 px-2 -my-1 py-1"
        @touchstart.passive="handleTouchStart"
        @touchend.passive="handleTouchEnd"
      >
        <!-- Inner wrapper for slide animation positioning -->
        <div class="relative h-full min-h-0">
          <Transition :name="slideDirection">
            <RequestCard
              :key="currentItem.request.id + '-' + currentIndex"
              class="absolute inset-0"
              data-testid="request-card"
              :request="currentItem.request"
              @pray="recordPrayer"
              @mark-answered="openAnsweredModal"
              @update-request="updateRequest"
              @delete-request="deleteRequest"
              @add-note="addNote"
              @edit-note="editNote"
              @delete-note="deleteNote"
            />
          </Transition>
        </div>
      </div>
    </main>

    <footer
      class="flex-none bg-gradient-to-b from-transparent via-footer-bg to-bg pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur"
    >
      <div class="mx-auto grid max-w-3xl gap-3 px-4 sm:px-6">
        <!-- Unified navigation with progress dots -->
        <div v-if="renderQueue.length > 1" class="flex items-center justify-center gap-3">
          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-card-muted text-muted shadow-sm transition-all duration-150 hover:text-text hover:shadow-card disabled:opacity-40 disabled:hover:shadow-sm"
            type="button"
            data-testid="prev-button"
            :disabled="renderQueue.length <= 1"
            @click="previousCard"
            aria-label="Previous card"
          >
            <IconChevronLeft :size="18" stroke-width="2.5" />
          </button>

          <div class="flex items-center gap-1.5" role="list">
            <!-- Left overflow indicator (pale blue if it's a loop point) -->
            <span
              v-if="progressIndicator.hasLeftOverflow"
              :class="[
                'h-1.5 w-1.5 rounded-full transition-colors duration-150',
                progressIndicator.leftOverflowIsLoopAdjacent ? 'bg-primary/40' : 'bg-dot-overflow',
              ]"
            ></span>
            <!-- Main dots / loop icons -->
            <template v-for="item in progressIndicator.items" :key="item.index">
              <!-- Loop icon (shown when this position is a loop point and NOT current) -->
              <button
                v-if="item.isLoopPoint && item.index !== currentIndex"
                class="inline-flex h-5 w-5 items-center justify-center text-primary/70 transition-all duration-150 hover:text-primary"
                type="button"
                @click="navigateToIndex(item.index)"
                aria-label="Jump to cycle start"
              >
                <IconRefresh :size="14" stroke-width="2.5" />
              </button>
              <!-- Current dot: dark blue if loop point, dark gray otherwise -->
              <button
                v-else-if="item.index === currentIndex"
                :class="[
                  'h-2.5 w-2.5 rounded-full transition-all duration-150',
                  item.isLoopPoint ? 'bg-primary/60' : 'bg-dot-active',
                ]"
                type="button"
                @click="navigateToIndex(item.index)"
                aria-label="Current card"
              ></button>
              <!-- Regular inactive dot -->
              <button
                v-else
                class="h-2 w-2 rounded-full bg-dot transition-all duration-150 hover:bg-dot-active"
                type="button"
                @click="navigateToIndex(item.index)"
                aria-label="Jump to card"
              ></button>
            </template>
            <!-- Right overflow indicator (pale blue if it's a loop point) -->
            <span
              v-if="progressIndicator.hasRightOverflow"
              :class="[
                'h-1.5 w-1.5 rounded-full transition-colors duration-150',
                progressIndicator.rightOverflowIsLoopAdjacent ? 'bg-primary/40' : 'bg-dot-overflow',
              ]"
            ></span>
          </div>

          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-card-muted text-muted shadow-sm transition-all duration-150 hover:text-text hover:shadow-card disabled:opacity-40 disabled:hover:shadow-sm"
            type="button"
            data-testid="next-button"
            :disabled="renderQueue.length <= 1"
            @click="nextCard"
            aria-label="Next card"
          >
            <IconChevronRight :size="18" stroke-width="2.5" />
          </button>
        </div>

        <AddRequestForm @save="createRequest" />
      </div>
    </footer>

    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="answeredModal.open"
          class="fixed inset-0 z-40 grid place-items-center bg-overlay p-4"
          @click.self="closeAnsweredModal"
        >
          <div class="w-full max-w-md rounded-2xl bg-card p-5 shadow-modal">
            <header class="mb-4 flex items-center justify-between">
              <h4 class="m-0 text-base font-semibold">Answered prayer</h4>
              <button
                class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-card-muted text-muted shadow-sm transition-all duration-150 hover:text-text hover:shadow-card"
                type="button"
                @click="closeAnsweredModal"
              >
                <IconX :size="18" stroke-width="2" />
              </button>
            </header>
            <div class="grid gap-3">
              <p class="text-sm text-muted">How did God answer your prayer?</p>
              <textarea
                v-model="answeredModal.text"
                rows="3"
                placeholder="Describe how your prayer was answered..."
                class="w-full rounded-xl bg-card-muted p-4 text-sm text-text placeholder:text-muted shadow-sm transition-shadow duration-150 focus:outline-none focus:shadow-primary-glow"
              ></textarea>
            </div>
            <div class="mt-5 grid grid-cols-2 gap-3">
              <button
                class="w-full rounded-xl bg-card-muted px-4 py-2.5 text-sm font-semibold text-muted shadow-sm transition-all duration-150 hover:text-text hover:shadow-card"
                type="button"
                @click="closeAnsweredModal"
              >
                Cancel
              </button>
              <button
                class="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-hover hover:shadow-card disabled:opacity-50"
                type="button"
                :disabled="!answeredModal.text.trim()"
                @click="saveAnsweredNote"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { Teleport, Transition, computed, onMounted, reactive, ref } from 'vue';
import { IconChevronLeft, IconChevronRight, IconRefresh, IconX } from '@tabler/icons-vue';
import AddRequestForm from './components/AddRequestForm.vue';
import InfoModal from './components/InfoModal.vue';
import RequestCard from './components/RequestCard.vue';
import SettingsModal from './components/SettingsModal.vue';
import { bootstrapSeed, deleteRequest as dbDeleteRequest, fetchAllRequests, saveRequest } from './db.js';
import { initThemeWatcher } from './settings.js';
import { computeExpiry } from './utils/time.js';

// Initialize theme watcher
initThemeWatcher();

const requests = ref([]);
const loading = ref(true);

const pageSize = 6;
const MAX_RENDER_QUEUE_SIZE = 36;
const KEEP_BEHIND_COUNT = 10;

const renderQueue = ref([]);
const feedIndex = ref(0);
const cycleCount = ref(0);
const currentIndex = ref(0);
const touchStart = ref(null);
const slideDirection = ref('card-slide-left');
const answeredModal = reactive({ open: false, request: null, text: '' });

const priorityScore = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
};

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

/**
 * Progress indicator with loop point visualization.
 * 
 * Loop points mark where the queue cycles back to the first card.
 * They appear at indices that are multiples of the pool size (activeRequests.length).
 * 
 * Display rules:
 * - Max 5 large items (dots or loop icons) visible at once
 * - Loop points show as a refresh icon (unless it's the current position)
 * - Current position always shows as an active dot (even if it's a loop point)
 * - Overflow indicators (small dots) turn pale blue if they're adjacent to a loop point
 */
const progressIndicator = computed(() => {
  const total = renderQueue.value.length;
  const poolSize = activeRequests.value.length; // Number of unique cards per cycle
  const maxVisible = 5;
  
  // Helper: Check if an index is a loop point (start of a new cycle)
  // Loop points are at indices: 0, poolSize, 2*poolSize, etc.
  // Only valid if we have cards in the pool
  const isLoopPoint = (index) => poolSize > 0 && index % poolSize === 0;
  
  // Calculate the visible window centered around current index
  let start = Math.max(0, currentIndex.value - 2);
  let end = start + maxVisible;
  
  // Adjust window if we're near the end of the queue
  if (end > total) {
    end = total;
    start = Math.max(0, end - maxVisible);
  }
  
  // Build the items array with loop point information
  const items = [];
  for (let i = start; i < end; i++) {
    items.push({
      ...renderQueue.value[i],
      index: i,
      isLoopPoint: isLoopPoint(i),
    });
  }
  
  // Determine overflow states and whether they're adjacent to loop points
  const hasLeftOverflow = start > 0;
  const hasRightOverflow = end < total;
  
  // Check if the position just outside the visible window is a loop point
  // If so, we show a pale blue indicator instead of the regular gray one
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

onMounted(async () => {
  await bootstrapSeed();
  requests.value = await fetchAllRequests();
  loading.value = false;
  resetFeed();
});

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

  // Prefer dropping items from the front, but keep a small "behind" buffer
  // so previous navigation still feels natural.
  const removableFromFront = Math.max(0, currentIndex.value - KEEP_BEHIND_COUNT);
  const dropFromFront = Math.min(overflow, removableFromFront);
  if (dropFromFront > 0) {
    renderQueue.value.splice(0, dropFromFront);
    currentIndex.value -= dropFromFront;
  }

  const remainingOverflow = renderQueue.value.length - MAX_RENDER_QUEUE_SIZE;
  if (remainingOverflow > 0) {
    // If we still overflow (e.g. currentIndex is near the start), trim the tail.
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
  slideDirection.value = 'card-slide-left';
  currentIndex.value = (currentIndex.value + 1) % renderQueue.value.length;
  const remaining = renderQueue.value.length - currentIndex.value;
  if (remaining <= 2) {
    loadMore();
  }
}

function previousCard() {
  if (renderQueue.value.length <= 1) return;
  slideDirection.value = 'card-slide-right';
  currentIndex.value = (currentIndex.value - 1 + renderQueue.value.length) % renderQueue.value.length;
}

function navigateToIndex(index) {
  if (index === currentIndex.value) return;
  slideDirection.value = index > currentIndex.value ? 'card-slide-left' : 'card-slide-right';
  currentIndex.value = index;
  const remaining = renderQueue.value.length - currentIndex.value;
  if (remaining <= 2) {
    loadMore();
  }
}

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

async function createRequest(payload) {
  const now = Date.now();
  const record = {
    id: crypto.randomUUID(),
    title: payload.title,
    priority: payload.priority,
    durationPreset: payload.durationPreset,
    createdAt: now,
    expiresAt: computeExpiry(now, payload.durationPreset),
    status: 'active',
    prayedAt: [],
    notes: [],
    updatedAt: now,
  };
  await saveRequest(record);
  requests.value = [record, ...requests.value];
  
  // Insert the new card immediately after the current position (don't reset queue)
  if (renderQueue.value.length > 0) {
    const insertPosition = currentIndex.value + 1;
    renderQueue.value.splice(insertPosition, 0, { request: record, cycle: cycleCount.value });
  } else {
    // If queue is empty, initialize it
    renderQueue.value = [{ request: record, cycle: 0 }];
    currentIndex.value = 0;
  }
}

async function recordPrayer(request) {
  const now = Date.now();
  const updated = { ...request, prayedAt: [...(request.prayedAt || []), now], updatedAt: now };
  await saveRequest(updated);
  replaceRequest(updated);
  slideDirection.value = 'card-slide-left';
  nextCard();
}

function openAnsweredModal(request) {
  answeredModal.open = true;
  answeredModal.request = request;
  answeredModal.text = '';
}

function closeAnsweredModal() {
  answeredModal.open = false;
  answeredModal.request = null;
  answeredModal.text = '';
}

async function updateRequest(request) {
  const expiresAt = computeExpiry(request.createdAt, request.durationPreset);
  const updated = { ...request, expiresAt, updatedAt: Date.now() };
  await saveRequest(updated);
  replaceRequest(updated);
}

async function addNote({ request, text }) {
  const entry = { id: crypto.randomUUID(), text, createdAt: Date.now(), isAnswer: false };
  const updated = { ...request, notes: [...(request.notes || []), entry], updatedAt: Date.now() };
  await saveRequest(updated);
  replaceRequest(updated);
}

async function editNote({ request, note }) {
  const updatedNotes = (request.notes || []).map((n) => (n.id === note.id ? { ...note } : n));
  const updated = { ...request, notes: updatedNotes, updatedAt: Date.now() };
  await saveRequest(updated);
  replaceRequest(updated);
}

async function deleteNote({ request, note }) {
  const updatedNotes = (request.notes || []).filter((n) => n.id !== note.id);
  const updated = { ...request, notes: updatedNotes, updatedAt: Date.now() };
  await saveRequest(updated);
  replaceRequest(updated);
}

async function deleteRequest(request) {
  await dbDeleteRequest(request.id);
  requests.value = requests.value.filter((r) => r.id !== request.id);
  removeRequestFromQueue(request.id, { autoAdvance: true });
  if (renderQueue.value.length === 0) {
    resetFeed();
  }
}

async function saveAnsweredNote() {
  if (!answeredModal.request || !answeredModal.text.trim()) return;
  const entry = {
    id: crypto.randomUUID(),
    text: answeredModal.text.trim(),
    createdAt: Date.now(),
    isAnswer: true,
  };
  const updated = {
    ...answeredModal.request,
    status: 'answered',
    notes: [...(answeredModal.request.notes || []), entry],
    updatedAt: Date.now(),
  };
  await saveRequest(updated);
  replaceRequest(updated);
  removeRequestFromQueue(updated.id, { autoAdvance: true });
  closeAnsweredModal();
  if (renderQueue.value.length === 0) {
    resetFeed();
  } else {
    const remaining = renderQueue.value.length - currentIndex.value;
    if (remaining <= 2) loadMore();
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

  // Keep the same logical current item. If the current item was removed,
  // the next item naturally shifts into the same index.
  let nextIndex = currentIndex.value - removedBeforeCurrent;

  // If we removed the last item and it was current, wrap to the start.
  if (wasCurrentRemoved && nextIndex >= newQueue.length) {
    nextIndex = 0;
  }

  nextIndex = Math.max(0, Math.min(nextIndex, newQueue.length - 1));

  // Only auto-advance when the current item was removed. Advancing after removing
  // a different item can feel like a jump.
  if (autoAdvance && wasCurrentRemoved && newQueue.length > 1) {
    // After removal, nextIndex already points at the next card in sequence.
    // (The previous implementation incremented and could skip a card.)
  }

  currentIndex.value = nextIndex;
}

function handleTouchStart(event) {
  const touch = event.changedTouches[0];
  touchStart.value = { x: touch.clientX, y: touch.clientY };
}

function handleTouchEnd(event) {
  if (!touchStart.value) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.value.x;
  const dy = touch.clientY - touchStart.value.y;
  touchStart.value = null;
  if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
  if (dx < 0) {
    slideDirection.value = 'card-slide-left';
    nextCard();
  } else {
    slideDirection.value = 'card-slide-right';
    previousCard();
  }
}
</script>
