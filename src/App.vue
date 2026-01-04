<template>
  <div class="page">
    <header class="hero">
      <div class="hero__titles">
        <p class="eyebrow">Prayer rhythm</p>
        <h1>Simple, focused prayer feed</h1>
        <p class="sub">One card at a time with quick prayer logging, notes, and gentle cues.</p>
      </div>
      <div class="hero__stats">
        <span class="pill">Active · {{ activeRequests.length }}</span>
        <span class="pill">Answered · {{ answeredRequests.length }}</span>
        <span class="micro" v-if="cycleCount > 0">Cycle {{ cycleCount + 1 }}</span>
      </div>
    </header>

    <main class="layout">
      <section class="feed" ref="feedRef">
        <div class="feed__header">
          <div class="feed__meta">
            <span class="dot" />
            <span class="muted">Cards auto-advance softly · {{ renderQueue.length }} queued</span>
          </div>
          <button class="ghost ghost--small" type="button" @click="loadMore">Refresh order</button>
        </div>

        <p v-if="!activeRequests.length && !loading" class="muted">
          No active requests yet. Add one to start praying.
        </p>

        <div v-if="loading" class="muted">Loading requests…</div>

        <div class="feed__list">
          <RequestCard
            v-for="(item, index) in renderQueue"
            :key="`${item.request.id}-${item.cycle}-${index}`"
            :request="item.request"
            @pray="recordPrayer"
            @mark-answered="markAnswered"
            @update-request="updateRequest"
            @add-note="addNote"
            @edit-note="editNote"
            @delete-note="deleteNote"
          />
        </div>
      </section>

      <AddRequestForm @save="createRequest" />
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import AddRequestForm from './components/AddRequestForm.vue';
import RequestCard from './components/RequestCard.vue';
import { db, bootstrapSeed } from './db.js';
import { computeExpiry } from './utils/time.js';

const requests = ref([]);
const loading = ref(true);
const feedRef = ref(null);
const pageSize = 1;
const renderQueue = ref([]);
const feedIndex = ref(0);
const cycleCount = ref(0);

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

watch(activeRequests, () => resetFeed());

onMounted(async () => {
  await bootstrapSeed();
  requests.value = await db.requests.toArray();
  loading.value = false;
  resetFeed();
  bindScroll();
});

onBeforeUnmount(() => {
  unbindScroll();
});

function bindScroll() {
  const handler = () => {
    const el = feedRef.value;
    if (!el) return;
    const threshold = 220;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - threshold) {
      loadMore();
    }
  };
  feedRef.value?.addEventListener('scroll', handler);
  feedRef.value && (feedRef.value._scrollHandler = handler);
}

function unbindScroll() {
  const el = feedRef.value;
  if (el?._scrollHandler) {
    el.removeEventListener('scroll', el._scrollHandler);
  }
}

function resetFeed() {
  renderQueue.value = [];
  feedIndex.value = 0;
  cycleCount.value = 0;
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
  const limit = pool.length * 2;
  renderQueue.value = [...renderQueue.value, ...next].slice(-limit || undefined);
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
    details: payload.details || '',
    priority: payload.priority,
    durationPreset: payload.durationPreset,
    createdAt: now,
    expiresAt: computeExpiry(now, payload.durationPreset),
    status: 'active',
    prayedAt: [],
    notes: [],
    updatedAt: now,
  };
  await db.requests.add(record);
  requests.value = [record, ...requests.value];
  resetFeed();
}

async function recordPrayer(request) {
  const now = Date.now();
  const updated = { ...request, prayedAt: [...(request.prayedAt || []), now], updatedAt: now };
  await db.requests.put(updated);
  replaceRequest(updated);
}

async function markAnswered(request) {
  const updated = { ...request, status: 'answered', updatedAt: Date.now() };
  await db.requests.put(updated);
  replaceRequest(updated);
}

async function updateRequest(request) {
  const expiresAt = computeExpiry(request.createdAt, request.durationPreset);
  const updated = { ...request, expiresAt, updatedAt: Date.now() };
  await db.requests.put(updated);
  replaceRequest(updated);
}

async function addNote({ request, text }) {
  const entry = { id: crypto.randomUUID(), text, createdAt: Date.now() };
  const updated = { ...request, notes: [...(request.notes || []), entry], updatedAt: Date.now() };
  await db.requests.put(updated);
  replaceRequest(updated);
}

async function editNote({ request, note }) {
  const updatedNotes = (request.notes || []).map((n) => (n.id === note.id ? { ...note } : n));
  const updated = { ...request, notes: updatedNotes, updatedAt: Date.now() };
  await db.requests.put(updated);
  replaceRequest(updated);
}

async function deleteNote({ request, note }) {
  const updatedNotes = (request.notes || []).filter((n) => n.id !== note.id);
  const updated = { ...request, notes: updatedNotes, updatedAt: Date.now() };
  await db.requests.put(updated);
  replaceRequest(updated);
}
</script>

<style scoped>
.page {
  max-width: 960px;
  margin: 0 auto;
  padding: 18px;
  display: grid;
  gap: 14px;
  min-height: 100vh;
}

.hero {
  background: linear-gradient(135deg, rgba(157, 123, 255, 0.08), rgba(124, 157, 255, 0.1));
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 18px 16px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  box-shadow: var(--shadow);
  align-items: center;
}

.hero h1 {
  margin: 6px 0 4px;
  font-size: 26px;
}

.sub {
  margin: 0 0 12px 0;
  color: var(--muted);
}

.hero__titles {
  flex: 1;
}

.hero__stats {
  display: grid;
  gap: 6px;
  justify-items: flex-end;
}

.micro {
  color: var(--muted);
  font-size: 12px;
}

.layout {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding-bottom: 90px;
}

.feed {
  background: var(--card);
  border-radius: 16px;
  border: 1px solid var(--border);
  padding: 14px;
  box-shadow: var(--shadow);
  display: grid;
  gap: 12px;
}

.feed__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.feed__list {
  display: grid;
  gap: 12px;
}

.ghost {
  background: var(--card-muted);
  color: var(--text);
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.ghost--small {
  padding: 8px 10px;
  font-size: 14px;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--card-muted);
  border: 1px solid var(--border);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: linear-gradient(135deg, #7c9dff, #9d7bff);
  box-shadow: 0 0 0 6px rgba(124, 157, 255, 0.08);
}

.feed__meta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.eyebrow {
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0;
}

.muted {
  color: var(--muted);
}

@media (max-width: 768px) {
  .page {
    padding: 14px;
  }
  .hero {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
