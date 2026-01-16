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
            @click="goPreviousCard"
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
                @click="jumpToIndex(item.index)"
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
                @click="jumpToIndex(item.index)"
                aria-label="Current card"
              ></button>
              <!-- Regular inactive dot -->
              <button
                v-else
                class="h-2 w-2 rounded-full bg-dot transition-all duration-150 hover:bg-dot-active"
                type="button"
                @click="jumpToIndex(item.index)"
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
            @click="goNextCard"
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
import { Teleport, Transition, onMounted, reactive, ref } from 'vue';
import { IconChevronLeft, IconChevronRight, IconRefresh, IconX } from '@tabler/icons-vue';
import AddRequestForm from './components/AddRequestForm.vue';
import InfoModal from './components/InfoModal.vue';
import RequestCard from './components/RequestCard.vue';
import SettingsModal from './components/SettingsModal.vue';
import { useRequestsStore } from './stores/requestsStore.js';
import { initThemeWatcher } from './settings.js';

// Initialize theme watcher
initThemeWatcher();

const store = useRequestsStore();
const {
  loading,
  activeRequests,
  renderQueue,
  currentIndex,
  currentItem,
  progressIndicator,
  infoStats,
  init,
  navigateToIndex,
} = store;

const touchStart = ref(null);
const slideDirection = ref('card-slide-left');
const answeredModal = reactive({ open: false, request: null, text: '' });

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
onMounted(async () => {
  await init();
});

async function createRequest(payload) {
  await store.createRequest(payload);
}

async function recordPrayer(request) {
  await store.recordPrayer(request);
  slideDirection.value = 'card-slide-left';
  goNextCard();
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
  await store.updateRequest(request);
}

async function addNote({ request, text }) {
  await store.addNote({ request, text });
}

async function editNote({ request, note }) {
  await store.editNote({ request, note });
}

async function deleteNote({ request, note }) {
  await store.deleteNote({ request, note });
}

async function deleteRequest(request) {
  await store.deleteRequest(request);
}

async function saveAnsweredNote() {
  if (!answeredModal.request || !answeredModal.text.trim()) return;
  await store.markAnswered({
    request: answeredModal.request,
    text: answeredModal.text.trim(),
  });
  closeAnsweredModal();
}

function goNextCard() {
  if (renderQueue.value.length <= 1) return;
  slideDirection.value = 'card-slide-left';
  store.nextCard();
}

function goPreviousCard() {
  if (renderQueue.value.length <= 1) return;
  slideDirection.value = 'card-slide-right';
  store.previousCard();
}

function jumpToIndex(index) {
  if (index === currentIndex.value) return;
  slideDirection.value = index > currentIndex.value ? 'card-slide-left' : 'card-slide-right';
  navigateToIndex(index);
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
    goNextCard();
  } else {
    goPreviousCard();
  }
}
</script>
