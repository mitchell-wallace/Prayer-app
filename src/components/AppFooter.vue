<template>
  <footer class="flex-none pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
    <div class="mx-auto grid max-w-3xl gap-3 px-4 sm:px-6">
      <!-- Unified navigation with progress dots -->
      <div v-if="renderQueue.length > 1" class="flex items-center justify-center gap-3">
        <button
          class="nav-button-animate inline-flex h-8 w-8 items-center justify-center rounded-xl bg-base-300 text-base-content/70 shadow-sm hover:text-base-content hover:shadow-lg disabled:opacity-40 disabled:hover:shadow-sm"
          type="button"
          data-testid="prev-button"
          :disabled="!canGoPrevious"
          @click="$emit('prev')"
          aria-label="Previous card"
        >
          <IconChevronLeft :size="18" stroke-width="2.5" />
        </button>

        <div
          ref="dotStripRef"
          class="dot-strip select-none cursor-pointer"
          @click="handleDotStripClick"
        >
          <div
            v-if="previousDots.length"
            :class="['dot-layer dot-layer--outgoing', motionDirection ? `dot-layer--${motionDirection}` : '']"
          >
            <template v-for="dot in previousDots" :key="dot.slot">
              <span class="dot-slot inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center overflow-hidden">
                <span
                  v-if="dot.isBeforeQueueStart"
                  class="dot-animate h-1.5 w-1.5 rounded-full border border-neutral-200/40"
                ></span>
                <span
                  v-else-if="dot.isPlaceholder"
                  class="dot-animate h-2 w-2 rounded-full border border-neutral-200/40"
                ></span>
                <span
                  v-else-if="isOutgoingDot(dot)"
                  :class="[
                    'dot-animate dot-current dot-outgoing h-2.5 w-2.5 rounded-full',
                    dot.isLoopPoint ? 'bg-primary-200/60 dark:bg-primary-300/60' : 'bg-neutral-200/60',
                  ]"
                ></span>
                <span
                  v-else-if="dot.isLoopPoint && dot.index !== null"
                  class="dot-animate inline-flex h-2.5 w-2.5 items-center justify-center text-primary-200/70 dark:text-primary-300/70"
                >
                  <IconRefresh :size="9" stroke-width="2.5" />
                </span>
                <span
                  v-else-if="dot.index !== null"
                  class="dot-animate h-2 w-2 rounded-full bg-neutral-200/40"
                ></span>
                <span
                  v-else
                  :class="[
                    'dot-animate h-1.5 w-1.5 rounded-full',
                    dot.isLoopPoint ? 'bg-primary-200/40' : 'bg-neutral-200/40',
                  ]"
                ></span>
              </span>
            </template>
          </div>

          <div
            :class="[
              'dot-layer dot-layer--current',
              previousDots.length ? `dot-layer--incoming ${motionDirection ? `dot-layer--${motionDirection}` : ''}` : '',
            ]"
          >
            <template v-for="dot in progressDots" :key="dot.slot">
              <span class="dot-slot inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center overflow-hidden">
                <span
                  v-if="dot.isBeforeQueueStart"
                  class="dot-animate h-1.5 w-1.5 rounded-full border border-neutral-200/40"
                ></span>
                <span
                  v-else-if="dot.isPlaceholder"
                  class="dot-animate h-2 w-2 rounded-full border border-neutral-200/40"
                ></span>
                <span
                  v-else-if="isCurrentDot(dot)"
                  :class="[
                    'dot-animate dot-current h-2.5 w-2.5 rounded-full',
                    isIncomingDot(dot) ? 'dot-incoming' : '',
                    dot.isLoopPoint ? 'bg-primary-200/60 dark:bg-primary-300/60' : 'bg-neutral-200/60',
                  ]"
                ></span>
                <span
                  v-else-if="isIncomingPending(dot)"
                  class="dot-animate h-2 w-2 rounded-full bg-neutral-200/40"
                ></span>
                <span
                  v-else-if="dot.isLoopPoint && dot.index !== null"
                  class="dot-animate inline-flex h-2.5 w-2.5 items-center justify-center text-primary-200/70 hover:text-primary-200 dark:text-primary-300/70"
                >
                  <IconRefresh :size="9" stroke-width="2.5" />
                </span>
                <span
                  v-else-if="dot.index !== null"
                  class="dot-animate h-2 w-2 rounded-full bg-neutral-200/40 hover:bg-neutral-200/60"
                ></span>
                <span
                  v-else
                  :class="[
                    'dot-animate h-1.5 w-1.5 rounded-full',
                    dot.isLoopPoint ? 'bg-primary-200/40' : 'bg-neutral-200/40',
                  ]"
                ></span>
              </span>
            </template>
          </div>
        </div>

        <button
          class="nav-button-animate inline-flex h-8 w-8 items-center justify-center rounded-xl bg-base-300 text-base-content/70 shadow-sm hover:text-base-content hover:shadow-lg disabled:opacity-40 disabled:hover:shadow-sm"
          type="button"
          data-testid="next-button"
          :disabled="!canGoNext"
          @click="$emit('next')"
          aria-label="Next card"
        >
          <IconChevronRight :size="18" stroke-width="2.5" />
        </button>
      </div>

      <AddRequestForm @save="$emit('create-request', $event)" />
    </div>
  </footer>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { IconChevronLeft, IconChevronRight, IconRefresh } from '@tabler/icons-vue';
import AddRequestForm from './AddRequestForm.vue';
import type { CreateRequestPayload, ProgressDot, QueueItem } from '../types';

const props = defineProps<{
  renderQueue: QueueItem[];
  progressDots: ProgressDot[];
  canGoPrevious: boolean;
  canGoNext: boolean;
  slideDirection: string;
}>();

const emit = defineEmits<{
  (event: 'prev'): void;
  (event: 'next'): void;
  (event: 'create-request', payload: CreateRequestPayload): void;
}>();

const dotStripRef = ref<HTMLDivElement | null>(null);
const outgoingDot = ref<ProgressDot | null>(null);
const incomingSlot = ref<number | null>(null);
const incomingReady = ref<boolean>(false);
const motionDirection = ref<'forward' | 'backward' | ''>('');
const previousDots = ref<ProgressDot[]>([]);
let outgoingTimer: ReturnType<typeof setTimeout> | null = null;
let incomingTimer: ReturnType<typeof setTimeout> | null = null;
let incomingClearTimer: ReturnType<typeof setTimeout> | null = null;
let shiftTimer: ReturnType<typeof setTimeout> | null = null;

const directionLabel = computed(() =>
  props.slideDirection === 'card-slide-right' ? 'backward' : 'forward'
);

watch(
  () => props.progressDots,
  (next, prev) => {
    const prevCurrent = prev?.find((dot) => dot.isCurrent);
    const nextCurrent = next.find((dot) => dot.isCurrent);
    if (!prevCurrent || !nextCurrent) return;
    if (prevCurrent.index === nextCurrent.index) return;

    outgoingDot.value = prevCurrent;
    incomingSlot.value = nextCurrent.slot;
    incomingReady.value = false;

    if (outgoingTimer) clearTimeout(outgoingTimer);
    if (incomingTimer) clearTimeout(incomingTimer);
    if (incomingClearTimer) clearTimeout(incomingClearTimer);
    if (shiftTimer) clearTimeout(shiftTimer);

    outgoingTimer = setTimeout(() => {
      outgoingDot.value = null;
    }, 60);

    incomingTimer = setTimeout(() => {
      incomingReady.value = true;
    }, 100);

    incomingClearTimer = setTimeout(() => {
      incomingReady.value = false;
      incomingSlot.value = null;
    }, 240);

    const shouldShift =
      prevCurrent.index !== null &&
      nextCurrent.index !== null &&
      Math.max(prevCurrent.index, nextCurrent.index) >= 3;

    if (shouldShift && prev) {
      previousDots.value = prev.map((dot) => ({ ...dot }));
      motionDirection.value = directionLabel.value;
      shiftTimer = setTimeout(() => {
        previousDots.value = [];
        motionDirection.value = '';
      }, 200);
    } else {
      previousDots.value = [];
      motionDirection.value = '';
    }
  },
  { deep: true }
);

onBeforeUnmount(() => {
  if (outgoingTimer) clearTimeout(outgoingTimer);
  if (incomingTimer) clearTimeout(incomingTimer);
  if (incomingClearTimer) clearTimeout(incomingClearTimer);
  if (shiftTimer) clearTimeout(shiftTimer);
});

function isOutgoingDot(dot: ProgressDot): boolean {
  return outgoingDot.value?.slot === dot.slot;
}

function isIncomingDot(dot: ProgressDot): boolean {
  return incomingReady.value && incomingSlot.value === dot.slot;
}

function isIncomingPending(dot: ProgressDot): boolean {
  return incomingSlot.value === dot.slot && !incomingReady.value;
}

function isCurrentDot(dot: ProgressDot): boolean {
  if (isOutgoingDot(dot)) return false;
  if (incomingSlot.value !== null) {
    return isIncomingDot(dot);
  }
  return dot.isCurrent;
}

function handleDotStripClick(event: MouseEvent): void {
  if (!dotStripRef.value || props.progressDots.length === 0) return;
  const rect = dotStripRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const slotWidth = rect.width / props.progressDots.length;
  const clickedSlot = Math.floor(x / slotWidth);
  if (clickedSlot <= currentSlot.value) {
    if (!props.canGoPrevious) return;
    emit('prev');
    return;
  }
  if (!props.canGoNext) return;
  emit('next');
}
</script>
