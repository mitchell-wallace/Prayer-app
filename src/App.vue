<template>
  <div class="flex h-[100dvh] flex-col overflow-hidden bg-bg text-text">
    <header
      class="z-30 w-full flex-none border-b border-border bg-header-bg backdrop-blur"
    >
      <div class="mx-auto max-w-3xl px-4 sm:px-6">
        <div class="flex h-12 items-center justify-between">
          <span class="text-sm font-semibold tracking-wide uppercase">prayer rhythm</span>
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
        class="flex-1 min-h-0"
        @touchstart.passive="handleTouchStart"
        @touchend.passive="handleTouchEnd"
      >
        <RequestCard
          class="h-full"
          :request="currentItem.request"
          @pray="recordPrayer"
          @mark-answered="openAnsweredModal"
          @update-request="updateRequest"
          @add-note="addNote"
          @edit-note="editNote"
          @delete-note="deleteNote"
        />
      </div>
    </main>

    <footer
      class="flex-none border-t border-border bg-gradient-to-b from-transparent via-footer-bg to-bg pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur"
    >
      <div class="mx-auto grid max-w-3xl gap-3 px-4 sm:px-6">
        <div v-if="indicatorWindow.length > 1" class="flex justify-center gap-2" role="list">
          <button
            v-for="entry in indicatorWindow"
            :key="`${entry.request.id}-${entry.index}`"
            :class="[
              'h-2 w-2 rounded-full border border-border bg-border',
              entry.index === currentIndex ? 'bg-accent' : '',
            ]"
            type="button"
            @click="currentIndex = entry.index"
            aria-label="Jump to card"
          ></button>
        </div>

        <div class="grid grid-cols-2 items-center gap-2 text-xs text-muted">
          <button
            class="justify-self-start rounded-full border border-border bg-card-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-text disabled:opacity-60"
            type="button"
            :disabled="renderQueue.length <= 1"
            @click="previousCard"
          >
            ← Back
          </button>
          <button
            class="justify-self-end rounded-full border border-border bg-card-muted px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-text disabled:opacity-60"
            type="button"
            :disabled="renderQueue.length <= 1"
            @click="nextCard"
          >
            Next →
          </button>
        </div>

        <AddRequestForm @save="createRequest" />
      </div>
    </footer>

    <Teleport to="body">
      <div
        v-if="answeredModal.open"
        class="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4"
        @click.self="closeAnsweredModal"
      >
        <div class="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-card">
          <header class="mb-3 flex items-center justify-between">
            <h4 class="m-0 text-base font-semibold">Answered prayer</h4>
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card-muted text-lg"
              type="button"
              @click="closeAnsweredModal"
            >
              ×
            </button>
          </header>
          <div class="grid gap-3">
            <p class="text-sm text-muted">How did God answer your prayer?</p>
            <textarea
              v-model="answeredModal.text"
              rows="3"
              placeholder="How did God answer your prayer?"
              class="w-full rounded-lg border border-border bg-card-muted p-3 text-sm text-text placeholder:text-muted focus:outline-none"
            ></textarea>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-2">
            <button
              class="w-full rounded-lg border border-border bg-card-muted px-3 py-2 text-sm font-semibold"
              type="button"
              @click="closeAnsweredModal"
            >
              Cancel
            </button>
            <button
              class="w-full rounded-lg bg-gradient-to-r from-accent to-accent-secondary px-3 py-2 text-sm font-semibold text-bg disabled:opacity-60"
              type="button"
              :disabled="!answeredModal.text.trim()"
              @click="saveAnsweredNote"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { Teleport, computed, onMounted, reactive, ref } from 'vue';
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
const indicatorWindow = computed(() => {
  const items = renderQueue.value.map((entry, index) => ({ ...entry, index }));
  if (items.length <= 6) return items;
  const start = Math.max(0, currentIndex.value - 2);
  const end = Math.min(items.length, start + 5);
  return items.slice(start, end);
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
  resetFeed();
}

async function recordPrayer(request) {
  const now = Date.now();
  const updated = { ...request, prayedAt: [...(request.prayedAt || []), now], updatedAt: now };
  await saveRequest(updated);
  replaceRequest(updated);
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
    nextCard();
  } else {
    previousCard();
  }
}
</script>
