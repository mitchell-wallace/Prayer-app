<template>
  <div>
    <!-- Cog button trigger -->
    <button
      type="button"
      class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card-muted text-muted transition hover:text-text hover:border-accent"
      aria-label="Open settings"
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
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <div
        v-if="open"
        class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
        @click.self="open = false"
      >
        <div class="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-card">
          <header class="mb-4 flex items-center justify-between">
            <h2 class="m-0 text-base font-semibold">Settings</h2>
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card-muted text-lg"
              type="button"
              @click="open = false"
            >
              ×
            </button>
          </header>

          <div class="grid gap-5">
            <!-- Theme setting -->
            <div class="grid gap-2">
              <label class="text-sm font-medium text-text">Theme</label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="option in themeOptions"
                  :key="option.value"
                  type="button"
                  :class="[
                    'rounded-lg border px-3 py-2 text-sm font-semibold transition',
                    settings.theme === option.value
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border bg-card-muted text-muted hover:text-text',
                  ]"
                  @click="settings.theme = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>

            <!-- Default Priority -->
            <div class="grid gap-2">
              <label class="text-sm font-medium text-text">Default Priority</label>
              <div class="grid grid-cols-4 gap-2">
                <button
                  v-for="option in priorityOptions"
                  :key="option.value"
                  type="button"
                  :class="[
                    'rounded-lg border px-3 py-2 text-xs font-semibold transition',
                    settings.defaultPriority === option.value
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border bg-card-muted text-muted hover:text-text',
                  ]"
                  @click="settings.defaultPriority = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>

            <!-- Default Duration -->
            <div class="grid gap-2">
              <label class="text-sm font-medium text-text">Default Duration</label>
              <div class="grid grid-cols-5 gap-2">
                <button
                  v-for="option in durationOptions"
                  :key="option.value"
                  type="button"
                  :class="[
                    'rounded-lg border px-2 py-2 text-xs font-semibold transition',
                    settings.defaultDuration === option.value
                      ? 'border-accent bg-accent/10 text-text'
                      : 'border-border bg-card-muted text-muted hover:text-text',
                  ]"
                  @click="settings.defaultDuration = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
          </div>

          <p class="mt-5 text-center text-xs text-muted">
            Settings are saved automatically
          </p>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, Teleport } from 'vue';
import { settings } from '../settings.js';

const open = ref(false);

const themeOptions = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const priorityOptions = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const durationOptions = [
  { value: '10d', label: '10d' },
  { value: '1m', label: '1mo' },
  { value: '3m', label: '3mo' },
  { value: '6m', label: '6mo' },
  { value: '1y', label: '1yr' },
];
</script>
