<template>
  <div class="flex h-[100dvh] flex-col overflow-hidden bg-base-200 text-base-content dark:bg-base-100">
    <AppHeader :info-stats="infoStats" />

    <Content
      :active-requests="activeRequests"
      :loading="loading"
      :current-item="currentItem"
      :current-index="currentIndex"
      :slide-direction="slideDirection"
      @touch-start="handleTouchStart"
      @touch-end="handleTouchEnd"
      @pray="recordPrayer"
      @mark-answered="openAnsweredModal"
      @update-request="updateRequest"
      @delete-request="deleteRequest"
      @add-note="addNote"
      @edit-note="editNote"
      @delete-note="deleteNote"
    />

    <AppFooter
      :render-queue="renderQueue"
      :progress-dots="progressDots"
      :can-go-previous="canGoPrevious"
      :can-go-next="canGoNext"
      :slide-direction="slideDirection"
      @prev="goPreviousCard"
      @next="goNextCard"
      @create-request="createRequest"
    />

    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="answeredModal.open"
          class="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4"
          @click.self="closeAnsweredModal"
        >
          <div class="w-full max-w-md rounded-2xl bg-base-300 p-5 shadow-xl dark:bg-base-200">
            <header class="mb-4 flex items-center justify-between">
              <h4 class="m-0 text-base font-semibold">Answered prayer</h4>
              <button
                class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-base-content/70 transition-all duration-150 hover:text-base-content hover:bg-base-100"
                type="button"
                @click="closeAnsweredModal"
              >
                <IconX :size="18" stroke-width="2" />
              </button>
            </header>
            <div class="grid gap-3">
              <p class="text-sm text-base-content/70">How did God answer your prayer?</p>
              <textarea
                v-model="answeredModal.text"
                rows="3"
                placeholder="Describe how your prayer was answered..."
                class="w-full rounded-xl bg-base-300 p-4 text-sm text-base-content placeholder:text-base-content/70 shadow-sm transition-shadow duration-150 focus:outline-none focus:shadow-primary-glow"
              ></textarea>
            </div>
            <div class="mt-5 grid grid-cols-2 gap-3">
              <button
                class="w-full rounded-xl bg-base-300 px-4 py-2.5 text-sm font-semibold text-base-content/70 shadow-sm transition-all duration-150 hover:text-base-content hover:shadow-md"
                type="button"
                @click="closeAnsweredModal"
              >
                Cancel
              </button>
              <button
                class="w-full rounded-xl bg-primary-200 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-100 hover:shadow-md disabled:opacity-50"
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

<script setup lang="ts">
import { Teleport, Transition, onMounted, reactive, ref } from 'vue';
import { IconX } from '@tabler/icons-vue';
import AppFooter from './components/layout/AppFooter.vue';
import AppHeader from './components/layout/AppHeader.vue';
import Content from './components/layout/Content.vue';
import { useRequestsStore } from './stores/requestsStore';
import { initThemeWatcher } from './stores/settings';
import { useSwipeGesture } from './composables/useSwipeGesture';
import type {
  AnsweredModalState,
  CreateRequestPayload,
  Note,
  PrayerRequest,
} from './core/types';

// Initialize theme watcher
initThemeWatcher();

const store = useRequestsStore();
const {
  loading,
  activeRequests,
  renderQueue,
  currentIndex,
  currentItem,
  canGoPrevious,
  canGoNext,
  progressDots,
  infoStats,
  init,
} = store;

const slideDirection = ref<string>('card-slide-left');
const answeredModal = reactive<AnsweredModalState>({ open: false, request: null, text: '' });

const { handleTouchStart, handleTouchEnd } = useSwipeGesture({
  onSwipeLeft: () => {
    goNextCard();
  },
  onSwipeRight: () => {
    goPreviousCard();
  },
});

onMounted(async () => {
  await init();
});

async function createRequest(payload: CreateRequestPayload): Promise<void> {
  await store.createRequest(payload);
}

async function recordPrayer(request: PrayerRequest): Promise<void> {
  await store.recordPrayer(request);
  slideDirection.value = 'card-slide-left';
  goNextCard();
}

function openAnsweredModal(request: PrayerRequest): void {
  answeredModal.open = true;
  answeredModal.request = request;
  answeredModal.text = '';
}

function closeAnsweredModal(): void {
  answeredModal.open = false;
  answeredModal.request = null;
  answeredModal.text = '';
}

async function updateRequest(request: PrayerRequest): Promise<void> {
  await store.updateRequest(request);
}

async function addNote({ request, text }: { request: PrayerRequest; text: string }): Promise<void> {
  await store.addNote({ request, text });
}

async function editNote({ request, note }: { request: PrayerRequest; note: Note }): Promise<void> {
  await store.editNote({ request, note });
}

async function deleteNote({ request, note }: { request: PrayerRequest; note: Note }): Promise<void> {
  await store.deleteNote({ request, note });
}

async function deleteRequest(request: PrayerRequest): Promise<void> {
  await store.deleteRequest(request);
}

async function saveAnsweredNote(): Promise<void> {
  if (!answeredModal.request || !answeredModal.text.trim()) return;
  await store.markAnswered({
    request: answeredModal.request,
    text: answeredModal.text.trim(),
  });
  closeAnsweredModal();
}

function goNextCard(): void {
  if (!canGoNext.value) return;
  slideDirection.value = 'card-slide-left';
  store.nextCard();
}

function goPreviousCard(): void {
  if (!canGoPrevious.value) return;
  slideDirection.value = 'card-slide-right';
  store.previousCard();
}
</script>
