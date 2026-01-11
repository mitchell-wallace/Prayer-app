<template>
  <div>
    <!-- Info button trigger -->
    <button
      type="button"
      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card-muted text-muted transition hover:text-text hover:border-accent"
      aria-label="View stats"
      @click="open = true"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="10"/>
        <path d="M12 16v-4"/>
        <path d="M12 8h.01"/>
      </svg>
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
        @click.self="open = false"
      >
        <div class="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-card">
          <header class="mb-4 flex items-center justify-between">
            <h2 class="m-0 text-base font-semibold">Stats</h2>
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card-muted text-lg"
              type="button"
              @click="open = false"
            >
              ×
            </button>
          </header>

          <div class="grid gap-3">
            <!-- Current session -->
            <div class="rounded-xl border border-border bg-card-muted p-4">
              <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Current Session</h3>
              <div class="grid grid-cols-2 gap-3">
                <div class="text-center">
                  <p class="text-2xl font-bold text-text">{{ stats.cycle }}</p>
                  <p class="text-xs text-muted">Cycle</p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold text-text">{{ stats.queued }}</p>
                  <p class="text-xs text-muted">Queued</p>
                </div>
              </div>
            </div>

            <!-- Request counts -->
            <div class="rounded-xl border border-border bg-card-muted p-4">
              <h3 class="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Requests</h3>
              <div class="grid grid-cols-2 gap-3">
                <div class="text-center">
                  <p class="text-2xl font-bold text-accent">{{ stats.active }}</p>
                  <p class="text-xs text-muted">Active</p>
                </div>
                <div class="text-center">
                  <p class="text-2xl font-bold text-success">{{ stats.answered }}</p>
                  <p class="text-xs text-muted">Answered</p>
                </div>
              </div>
            </div>

            <!-- Current card info -->
            <div v-if="stats.currentRequest" class="rounded-xl border border-border bg-card-muted p-4">
              <h3 class="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Current Card</h3>
              <p class="text-sm font-medium text-text truncate">{{ stats.currentRequest.title }}</p>
              <div class="mt-2 flex gap-2 text-xs">
                <span class="rounded-full border border-border bg-card px-2 py-0.5 capitalize text-muted">
                  {{ stats.currentRequest.status }}
                </span>
                <span class="rounded-full border border-border bg-card px-2 py-0.5 capitalize text-muted">
                  {{ stats.currentRequest.priority }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, Teleport } from 'vue';

defineProps({
  stats: {
    type: Object,
    required: true,
    default: () => ({
      active: 0,
      answered: 0,
      queued: 0,
      cycle: 1,
      currentRequest: null,
    }),
  },
});

const open = ref(false);
</script>
