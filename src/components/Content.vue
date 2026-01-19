<template>
  <main class="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 overflow-x-clip px-4 pt-3 pb-2 sm:px-6">
    <p v-if="!activeRequests.length && !loading" class="mt-2 text-sm text-base-content-muted">
      No active requests yet. Add one below.
    </p>

    <div v-if="loading" class="text-sm text-base-content-muted">Loading requests…</div>

    <!-- Card container with padding for shadow overflow -->
    <div
      v-if="currentItem"
      class="relative flex-1 min-h-0 -mx-2 px-2 -my-1 py-1"
      @touchstart.passive="$emit('touch-start', $event)"
      @touchend.passive="$emit('touch-end', $event)"
    >
      <!-- Inner wrapper for slide animation positioning -->
      <div class="relative h-full min-h-0">
        <Transition :name="slideDirection">
          <RequestCard
            :key="currentItem.request.id + '-' + currentIndex"
            class="absolute inset-0"
            data-testid="request-card"
            :request="currentItem.request"
            @pray="$emit('pray', $event)"
            @mark-answered="$emit('mark-answered', $event)"
            @update-request="$emit('update-request', $event)"
            @delete-request="$emit('delete-request', $event)"
            @add-note="$emit('add-note', $event)"
            @edit-note="$emit('edit-note', $event)"
            @delete-note="$emit('delete-note', $event)"
          />
        </Transition>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { Transition } from 'vue';
import RequestCard from './RequestCard.vue';
import type { Note, PrayerRequest, QueueItem } from '../types';

defineProps<{
  activeRequests: PrayerRequest[];
  loading: boolean;
  currentItem: QueueItem | null;
  currentIndex: number;
  slideDirection: string;
}>();

defineEmits<{
  (event: 'touch-start', payload: TouchEvent): void;
  (event: 'touch-end', payload: TouchEvent): void;
  (event: 'pray', payload: PrayerRequest): void;
  (event: 'mark-answered', payload: PrayerRequest): void;
  (event: 'update-request', payload: PrayerRequest): void;
  (event: 'delete-request', payload: PrayerRequest): void;
  (event: 'add-note', payload: { request: PrayerRequest; text: string }): void;
  (event: 'edit-note', payload: { request: PrayerRequest; note: Note }): void;
  (event: 'delete-note', payload: { request: PrayerRequest; note: Note }): void;
}>();
</script>
