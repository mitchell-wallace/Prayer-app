<template>
  <div>
    <!-- Info button trigger -->
    <button
      type="button"
      data-testid="info-button"
      class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-base-300 text-base-content/70 shadow-sm transition-all duration-150 hover:text-base-content hover:shadow-lg"
      aria-label="View stats"
      @click="open = true"
    >
      <IconInfoCircle :size="18" stroke-width="2" />
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="open"
          data-testid="info-modal"
          class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          @click.self="open = false"
        >
          <div class="w-full max-w-sm rounded-2xl bg-base-300 p-5 shadow-xl dark:bg-base-200">
            <header class="mb-4 flex items-center justify-between">
              <h2 class="m-0 text-base font-semibold">Stats</h2>
              <button
                class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-base-300 text-base-content/70 shadow-sm transition-all duration-150 hover:text-base-content hover:shadow-lg"
                type="button"
                @click="open = false"
              >
                <IconX :size="18" stroke-width="2" />
              </button>
            </header>

            <div class="grid gap-3">
              <!-- Current session -->
              <div class="rounded-xl bg-base-300 p-4 shadow-sm">
                <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-base-content/70">Current session</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="text-center">
                    <p class="text-2xl font-bold text-base-content">{{ stats.cycle }}</p>
                    <p class="text-xs text-base-content/70">Cycle</p>
                  </div>
                  <div class="text-center">
                    <p class="text-2xl font-bold text-base-content">{{ stats.queued }}</p>
                    <p class="text-xs text-base-content/70">Queued</p>
                  </div>
                </div>
              </div>

              <!-- Request counts -->
              <div class="rounded-xl bg-base-300 p-4 shadow-sm">
                <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-base-content/70">Requests</h3>
                <div class="grid grid-cols-2 gap-3">
                  <div class="text-center">
                    <p class="text-2xl font-bold text-primary-200" data-testid="stat-active">
                      {{ stats.active }}
                    </p>
                    <p class="text-xs text-base-content/70">Active</p>
                  </div>
                  <div class="text-center">
                    <p class="text-2xl font-bold text-base-content/70" data-testid="stat-answered">
                      {{ stats.answered }}
                    </p>
                    <p class="text-xs text-base-content/70">Answered</p>
                  </div>
                </div>
              </div>

              <!-- Current card info -->
              <div v-if="stats.currentRequest" class="rounded-xl bg-base-300 p-4 shadow-sm">
                <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-base-content/70">Current card</h3>
                <p class="text-sm font-medium text-base-content truncate">{{ stats.currentRequest.title }}</p>
                <div class="mt-2 flex flex-wrap gap-2 text-xs">
                  <span class="rounded-lg bg-base-100 px-2 py-0.5 capitalize text-base-content/70 shadow-sm dark:bg-base-200">
                    {{ stats.currentRequest.status }}
                  </span>
                  <span class="rounded-lg bg-base-100 px-2 py-0.5 capitalize text-base-content/70 shadow-sm dark:bg-base-200">
                    {{ stats.currentRequest.priority }}
                  </span>
                  <span class="rounded-lg bg-base-100 px-2 py-0.5 text-base-content/70 shadow-sm dark:bg-base-200">
                    {{ stats.currentRequest.notes?.length || 0 }} notes
                  </span>
                </div>
                <p class="mt-2 text-xs text-base-content/70">
                  Added {{ formatDate(stats.currentRequest.createdAt) }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, Teleport, Transition } from 'vue';
import { IconInfoCircle, IconX } from '@tabler/icons-vue';
import type { InfoStats } from '../types';

function formatDate(ts: number): string {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString();
}

defineProps<{
  stats: InfoStats;
}>();

const open = ref<boolean>(false);
</script>
