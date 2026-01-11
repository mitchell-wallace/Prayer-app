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

    <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-hidden px-4 pt-3 sm:px-6">
      <p v-if="!activeRequests.length && !loading" class="mt-2 text-sm text-muted">
        No active requests yet. Add one below.
      </p>

      <div v-if="loading" class="text-sm text-muted">Loading requests…</div>

      <div
        v-if="currentItem"
        class="relative flex-1 min-h-0 overflow-hidden"
        @touchstart.passive="handleTouchStart"
        @touchend.passive="handleTouchEnd"
      >
        <Transition :name="slideDirection">
          <RequestCard
            :key="currentItem.request.id + '-' + currentIndex"
            class="absolute inset-0 h-full"
            :request="currentItem.request"
            @pray="recordPrayer"
            @mark-answered="openAnsweredModal"
            @update-request="updateRequest"
            @add-note="addNote"
            @edit-note="editNote"
            @delete-note="deleteNote"
          />
        </Transition>
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
            :disabled="renderQueue.length <= 1"
            @click="navigatePrevious"
            aria-label="Previous card"
          >
            <IconChevronLeft :size="18" stroke-width="2.5" />
          </button>

          <div class="flex items-center gap-1.5" role="list">
            <!-- Left overflow indicator -->
            <span
              v-if="progressIndicator.hasLeftOverflow"
              class="h-1.5 w-1.5 rounded-full bg-dot-overflow"
            ></span>
            <!-- Main dots -->
            <button
              v-for="dot in progressIndicator.dots"
              :key="dot.index"
              :class="[
                'rounded-full transition-all duration-150',
                dot.index === currentIndex
                  ? 'h-2.5 w-2.5 bg-dot-active'
                  : 'h-2 w-2 bg-dot hover:bg-dot-active',
              ]"
              type="button"
              @click="navigateToIndex(dot.index)"
              aria-label="Jump to card"
            ></button>
            <!-- Right overflow indicator -->
            <span
              v-if="progressIndicator.hasRightOverflow"
              class="h-1.5 w-1.5 rounded-full bg-dot-overflow"
            ></span>
          </div>

          <button
            class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-card-muted text-muted shadow-sm transition-all duration-150 hover:text-text hover:shadow-card disabled:opacity-40 disabled:hover:shadow-sm"
            type="button"
            :disabled="renderQueue.length <= 1"
            @click="navigateNext"
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
import { IconChevronLeft, IconChevronRight, IconX } from '@tabler/icons-vue';
import AddRequestForm from './components/AddRequestForm.vue';
import InfoModal from './components/InfoModal.vue';
import RequestCard from './components/RequestCard.vue';
import SettingsModal from './components/SettingsModal.vue';
import { bootstrapSeed, fetchAllRequests, saveRequest } from './db.js';
import { initThemeWatcher } from './settings.js';
import { computeExpiry } from './utils/time.js';

// Initialize theme watcher
initThemeWatcher();

const requests = ref([]);
const loading = ref(true);
const pageSize = 6;
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

// Progress indicator with max 5 dots and overflow indicators
const progressIndicator = computed(() => {
  const total = renderQueue.value.length;
  const maxDots = 5;
  
  if (total <= maxDots) {
    return {
      dots: renderQueue.value.map((entry, index) => ({ ...entry, index })),
      hasLeftOverflow: false,
      hasRightOverflow: false,
    };
  }
  
  // Calculate window around current index
  let start = Math.max(0, currentIndex.value - 2);
  let end = start + maxDots;
  
  // Adjust if we're near the end
  if (end > total) {
    end = total;
    start = Math.max(0, end - maxDots);
  }
  
  const dots = renderQueue.value.slice(start, end).map((entry, i) => ({
    ...entry,
    index: start + i,
  }));
  
  return {
    dots,
    hasLeftOverflow: start > 0,
    hasRightOverflow: end < total,
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

// Navigation functions for the redesigned progress indicator
function navigateNext() {
  nextCard();
}

function navigatePrevious() {
  previousCard();
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
  const instancesInQueue = renderQueue.value.filter((item) => item.request.id === requestId).length;
  renderQueue.value = renderQueue.value.filter((item) => item.request.id !== requestId);
  const adjustedIndex = Math.max(0, currentIndex.value - instancesInQueue);
  if (renderQueue.value.length) {
    currentIndex.value = Math.min(adjustedIndex, renderQueue.value.length - 1);
    if (autoAdvance && renderQueue.value.length > 1) {
      currentIndex.value = (currentIndex.value + 1) % renderQueue.value.length;
    }
  } else {
    currentIndex.value = 0;
  }
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
