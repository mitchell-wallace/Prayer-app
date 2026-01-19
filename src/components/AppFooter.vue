<template>
  <footer class="flex-none pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
    <div class="mx-auto grid max-w-3xl gap-3 px-4 sm:px-6">
      <!-- Unified navigation with progress dots -->
      <div v-if="renderQueue.length > 1" class="flex items-center justify-center gap-3">
        <button
          class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-base-300 text-base-content/70 shadow-sm transition-all duration-150 hover:text-base-content hover:shadow-lg disabled:opacity-40 disabled:hover:shadow-sm"
          type="button"
          data-testid="prev-button"
          :disabled="renderQueue.length <= 1"
          @click="$emit('prev')"
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
                progressIndicator.leftOverflowIsLoopAdjacent ? 'bg-primary-200/40' : 'bg-neutral-200/40',
              ]"
            ></span>
            <!-- Main dots / loop icons -->
            <template v-for="item in progressIndicator.items" :key="item.index">
              <!-- Loop icon (shown when this position is a loop point and NOT current) -->
              <button
                v-if="item.isLoopPoint && item.index !== currentIndex"
                class="inline-flex h-2.5 w-2.5 items-center justify-center text-primary-200/70 transition-all duration-150 hover:text-primary-200"
                type="button"
                @click="$emit('jump', item.index)"
                aria-label="Jump to cycle start"
              >
                <IconRefresh :size="10" stroke-width="2.5" />
              </button>
              <!-- Current dot: dark blue if loop point, dark gray otherwise -->
              <button
                v-else-if="item.index === currentIndex"
                :class="[
                  'h-2.5 w-2.5 rounded-full transition-all duration-150',
                  item.isLoopPoint ? 'bg-primary-200/60' : 'bg-neutral-200/60',
                ]"
                type="button"
                @click="$emit('jump', item.index)"
                aria-label="Current card"
              ></button>
              <!-- Regular inactive dot -->
              <button
                v-else
                class="h-2 w-2 rounded-full bg-neutral-200/40 transition-all duration-150 hover:bg-neutral-200/60"
                type="button"
                @click="$emit('jump', item.index)"
                aria-label="Jump to card"
              ></button>
            </template>
            <!-- Right overflow indicator (pale blue if it's a loop point) -->
            <span
              v-if="progressIndicator.hasRightOverflow"
              :class="[
                'h-1.5 w-1.5 rounded-full transition-colors duration-150',
                progressIndicator.rightOverflowIsLoopAdjacent ? 'bg-primary-200/40' : 'bg-neutral-200/40',
              ]"
            ></span>
        </div>

        <button
          class="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-base-300 text-base-content/70 shadow-sm transition-all duration-150 hover:text-base-content hover:shadow-lg disabled:opacity-40 disabled:hover:shadow-sm"
          type="button"
          data-testid="next-button"
          :disabled="renderQueue.length <= 1"
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
import { IconChevronLeft, IconChevronRight, IconRefresh } from '@tabler/icons-vue';
import AddRequestForm from './AddRequestForm.vue';
import type { CreateRequestPayload, ProgressIndicator, QueueItem } from '../types';

defineProps<{
  renderQueue: QueueItem[];
  progressIndicator: ProgressIndicator;
  currentIndex: number;
}>();

defineEmits<{
  (event: 'prev'): void;
  (event: 'next'): void;
  (event: 'jump', index: number): void;
  (event: 'create-request', payload: CreateRequestPayload): void;
}>();
</script>
