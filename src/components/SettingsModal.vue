<template>
  <div>
    <!-- Cog button trigger -->
    <button
      type="button"
      class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-card-muted text-muted shadow-sm transition-all duration-150 hover:text-text hover:shadow-card"
      aria-label="Open settings"
      @click="open = true"
    >
      <IconSettings :size="18" stroke-width="2" />
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="open"
          class="fixed inset-0 z-50 grid place-items-center bg-overlay p-4"
          @click.self="open = false"
        >
          <div class="w-full max-w-md rounded-2xl bg-card p-5 shadow-modal">
            <header class="mb-4 flex items-center justify-between">
              <h2 class="m-0 text-base font-semibold">Settings</h2>
              <button
                class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-card-muted text-muted shadow-sm transition-all duration-150 hover:text-text hover:shadow-card"
                type="button"
                @click="open = false"
              >
                <IconX :size="18" stroke-width="2" />
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
                      'rounded-xl px-3 py-2.5 text-sm font-semibold shadow-sm transition-all duration-150',
                      settings.theme === option.value
                        ? 'bg-primary text-white shadow-card'
                        : 'bg-card-muted text-muted hover:text-text hover:shadow-card',
                    ]"
                    @click="settings.theme = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <!-- Default Priority -->
              <div class="grid gap-2">
                <label class="text-sm font-medium text-text">Default priority</label>
                <div class="grid grid-cols-4 gap-2">
                  <button
                    v-for="option in priorityOptions"
                    :key="option.value"
                    type="button"
                    :class="[
                      'rounded-xl px-3 py-2.5 text-xs font-semibold shadow-sm transition-all duration-150',
                      settings.defaultPriority === option.value
                        ? 'bg-primary text-white shadow-card'
                        : 'bg-card-muted text-muted hover:text-text hover:shadow-card',
                    ]"
                    @click="settings.defaultPriority = option.value"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <!-- Default Duration -->
              <div class="grid gap-2">
                <label class="text-sm font-medium text-text">Default duration</label>
                <div class="grid grid-cols-5 gap-2">
                  <button
                    v-for="option in durationOptions"
                    :key="option.value"
                    type="button"
                    :class="[
                      'rounded-xl px-2 py-2.5 text-xs font-semibold shadow-sm transition-all duration-150',
                      settings.defaultDuration === option.value
                        ? 'bg-primary text-white shadow-card'
                        : 'bg-card-muted text-muted hover:text-text hover:shadow-card',
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
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, Teleport, Transition } from 'vue';
import { IconSettings, IconX } from '@tabler/icons-vue';
import { settings } from '../settings.js';
import type { DurationPreset, Priority, SelectOption, Theme } from '../types';

const open = ref<boolean>(false);

const themeOptions: SelectOption<Theme>[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

const priorityOptions: SelectOption<Priority>[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const durationOptions: SelectOption<DurationPreset>[] = [
  { value: '10d', label: '10d' },
  { value: '1m', label: '1mo' },
  { value: '3m', label: '3mo' },
  { value: '6m', label: '6mo' },
  { value: '1y', label: '1yr' },
];
</script>
