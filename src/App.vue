<template>
  <div class="page">
    <header class="hero">
      <div>
        <p class="eyebrow">Prayer list</p>
        <h1>Keep every request close</h1>
        <p class="sub">Mobile-first feed with quick “Prayed”, notes, and smart cycling.</p>
        <div class="stats">
          <span class="pill">Active: {{ activeRequests.length }}</span>
          <span class="pill">Answered: {{ answeredRequests.length }}</span>
        </div>
      </div>
      <div class="tip" v-if="cycleCount > 0">
        <strong>You’ve covered everything once.</strong>
        <p class="muted">Requests now cycle again so nothing gets stale.</p>
      </div>
    </header>

    <main class="layout">
      <AddRequestForm @save="createRequest" />

      <section class="feed" ref="feedRef">
        <div class="feed__header">
          <div>
            <p class="eyebrow">Feed</p>
            <h2>Prioritized cards</h2>
          </div>
          <span class="muted">{{ renderQueue.length }} showing · cycles: {{ cycleCount }}</span>
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

        <div class="divider" />
        <div class="footer">
          <button class="ghost" type="button" @click="loadMore">Load more</button>
          <span class="muted">Cards auto-cycle as you scroll.</span>
        </div>
      </section>
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
const pageSize = 6;
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
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  display: grid;
  gap: 18px;
}

.hero {
  background: linear-gradient(135deg, rgba(157, 123, 255, 0.12), rgba(124, 157, 255, 0.12));
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 18px;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  box-shadow: var(--shadow);
}

.hero h1 {
  margin: 4px 0 8px;
  font-size: 28px;
}

.sub {
  margin: 0 0 12px 0;
  color: var(--muted);
}

.stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tip {
  background: rgba(74, 222, 128, 0.12);
  border: 1px solid rgba(74, 222, 128, 0.35);
  border-radius: 14px;
  padding: 12px;
  align-self: flex-start;
}

.layout {
  display: grid;
  gap: 16px;
}

.feed {
  background: var(--card);
  border-radius: 16px;
  border: 1px solid var(--border);
  padding: 16px;
  box-shadow: var(--shadow);
  max-height: 70vh;
  overflow-y: auto;
  display: grid;
  gap: 12px;
}

.feed__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.feed__list {
  display: grid;
  gap: 12px;
}

.divider {
  height: 1px;
  background: var(--border);
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ghost {
  background: var(--card-muted);
  color: var(--text);
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
}

.pill {
  display: inline-flex;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--card-muted);
  border: 1px solid var(--border);
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
  }
  .feed {
    max-height: unset;
  }
  .footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
