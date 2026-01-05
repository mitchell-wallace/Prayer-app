<template>
  <div class="min-h-screen bg-[var(--bg)] text-[var(--text)]">
    <header
      class="sticky top-0 z-30 w-full border-b border-[var(--border)] bg-[rgba(13,13,16,0.92)] backdrop-blur"
    >
      <div class="mx-auto flex h-12 max-w-3xl items-center justify-between px-4 sm:px-6">
        <span class="text-sm font-semibold tracking-wide uppercase">prayer rhythm</span>
        <div class="flex items-center gap-3 text-xs text-[var(--muted)]">
          <span class="rounded-full border border-[var(--border)] bg-[var(--card-muted)] px-3 py-1">
            Active {{ activeRequests.length }}
          </span>
          <span class="rounded-full border border-[var(--border)] bg-[var(--card-muted)] px-3 py-1">
            Answered {{ answeredRequests.length }}
          </span>
        </div>
      </div>
    </header>

    <main class="mx-auto flex max-w-3xl flex-col gap-3 px-4 pb-28 pt-3 sm:px-6">
      <div class="flex items-center justify-between text-xs text-[var(--muted)]">
        <span class="truncate">
          Cycle {{ cycleCount + 1 }} · {{ renderQueue.length || 0 }} queued · {{ activeRequests.length }} active
        </span>
        <button
          v-if="renderQueue.length > 1"
          class="rounded-full border border-[var(--border)] bg-[var(--card-muted)] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--text)]"
          type="button"
          @click="nextCard"
        >
          Next
        </button>
      </div>

      <section class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow)]">
        <div class="mb-2 flex items-center justify-between gap-3">
          <p class="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">Queue</p>
        </div>

        <p v-if="!activeRequests.length && !loading" class="mt-2 text-sm text-[var(--muted)]">
          No active requests yet. Add one below.
        </p>

        <div v-if="loading" class="text-sm text-[var(--muted)]">Loading requests…</div>

        <div v-if="currentItem" class="grid">
          <RequestCard
            :request="currentItem.request"
            @pray="recordPrayer"
            @mark-answered="markAnswered"
            @update-request="updateRequest"
            @add-note="addNote"
            @edit-note="editNote"
            @delete-note="deleteNote"
          />
        </div>

        <div v-if="indicatorWindow.length > 1" class="mt-3 flex justify-center gap-2" role="list">
          <button
            v-for="entry in indicatorWindow"
            :key="`${entry.request.id}-${entry.index}`"
            :class="[
              'h-2 w-2 rounded-full border border-[var(--border)] bg-[var(--border)]',
              entry.index === currentIndex ? 'bg-[var(--accent)]' : '',
            ]"
            type="button"
            @click="currentIndex = entry.index"
            aria-label="Jump to card"
          ></button>
        </div>
      </section>
    </main>

    <AddRequestForm @save="createRequest" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import AddRequestForm from './components/AddRequestForm.vue';
import RequestCard from './components/RequestCard.vue';
import { bootstrapSeed, fetchAllRequests, saveRequest } from './db.js';
import { computeExpiry } from './utils/time.js';

const requests = ref([]);
const loading = ref(true);
const pageSize = 6;
const renderQueue = ref([]);
const feedIndex = ref(0);
const cycleCount = ref(0);
const currentIndex = ref(0);

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

watch(activeRequests, () => resetFeed());

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
}

async function markAnswered(request) {
  const updated = { ...request, status: 'answered', updatedAt: Date.now() };
  await saveRequest(updated);
  replaceRequest(updated);
}

async function updateRequest(request) {
  const expiresAt = computeExpiry(request.createdAt, request.durationPreset);
  const updated = { ...request, expiresAt, updatedAt: Date.now() };
  await saveRequest(updated);
  replaceRequest(updated);
}

async function addNote({ request, text }) {
  const entry = { id: crypto.randomUUID(), text, createdAt: Date.now() };
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
</script>
