<template>
  <footer class="flex-none pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
    <div class="mx-auto grid max-w-3xl gap-3 px-4 sm:px-6">
      <!-- Unified navigation with progress dots -->
      <div v-if="renderQueue.length > 1" class="flex items-center justify-center gap-3">
        <button
          class="nav-button-animate inline-flex h-8 w-8 items-center justify-center rounded-xl bg-base-300 text-base-content/70 shadow-sm hover:text-base-content hover:shadow-md disabled:opacity-40 disabled:hover:shadow-sm"
          type="button"
          data-testid="prev-button"
          :disabled="!canGoPrevious"
          @click="$emit('prev')"
          aria-label="Previous card"
        >
          <IconChevronLeft :size="18" stroke-width="2.5" />
        </button>

        <ProgressDots
          :progress-dots="progressDots"
          :can-go-previous="canGoPrevious"
          :can-go-next="canGoNext"
          :slide-direction="slideDirection"
          @prev="$emit('prev')"
          @next="$emit('next')"
        />

        <button
          class="nav-button-animate inline-flex h-8 w-8 items-center justify-center rounded-xl bg-base-300 text-base-content/70 shadow-sm hover:text-base-content hover:shadow-md disabled:opacity-40 disabled:hover:shadow-sm"
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
import { IconChevronLeft, IconChevronRight } from '@tabler/icons-vue';
import AddRequestForm from '@/components/forms/AddRequestForm.vue';
import ProgressDots from '@/components/navigation/ProgressDots.vue';
import type { CreateRequestPayload, ProgressDot, QueueItem } from '@/core/types';

defineProps<{
  renderQueue: QueueItem[];
  progressDots: ProgressDot[];
  canGoPrevious: boolean;
  canGoNext: boolean;
  slideDirection: string;
}>();

defineEmits<{
  (event: 'prev'): void;
  (event: 'next'): void;
  (event: 'create-request', payload: CreateRequestPayload): void;
}>();
</script>
