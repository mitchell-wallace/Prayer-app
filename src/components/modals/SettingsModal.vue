<template>
  <div>
    <!-- Cog button trigger -->
    <button
      type="button"
      data-testid="settings-button"
      class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-base-300 text-base-content/70 transition-all duration-150 hover:text-base-content hover:bg-base-100"
      aria-label="Open settings"
      @click="open"
    >
      <IconSettings :size="18" stroke-width="2" />
    </button>

    <!-- Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="isOpen"
          data-testid="settings-modal"
          class="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          @click.self="close"
        >
          <div class="w-full max-w-md rounded-2xl bg-base-300 p-5 shadow-xl dark:bg-base-200">
            <header class="mb-4 flex items-center justify-between">
              <h2 class="m-0 text-base font-semibold">Settings</h2>
              <button
                class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-base-content/70 transition-all duration-150 hover:text-base-content hover:bg-base-100"
                type="button"
                @click="close"
              >
                <IconX :size="18" stroke-width="2" />
              </button>
            </header>

            <div class="grid gap-5">
              <!-- Theme setting -->
              <div class="grid gap-2">
                <label class="text-sm font-medium text-base-content">Theme</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="option in themeOptions"
                    :key="option.value"
                    type="button"
                    :data-testid="`settings-theme-${option.value}`"
                    :class="[
                      'rounded-xl px-3 py-2.5 text-sm font-semibold shadow-sm transition-all duration-150',
                      settings.theme === option.value
                        ? 'bg-primary-200 text-white shadow-md'
                        : 'bg-base-300 text-base-content/70 hover:text-base-content hover:shadow-md',
                    ]"
                    @click="setTheme(option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <!-- Default Priority -->
              <div class="grid gap-2">
                <label class="text-sm font-medium text-base-content">Default priority</label>
                <div class="grid grid-cols-4 gap-2">
                  <button
                    v-for="option in priorityOptions"
                    :key="option.value"
                    type="button"
                    :data-testid="`settings-priority-${option.value}`"
                    :class="[
                      'rounded-xl px-3 py-2.5 text-xs font-semibold shadow-sm transition-all duration-150',
                      settings.defaultPriority === option.value
                        ? 'bg-primary-200 text-white shadow-md'
                        : 'bg-base-300 text-base-content/70 hover:text-base-content hover:shadow-md',
                    ]"
                    @click="setDefaultPriority(option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>

              <!-- Default Duration -->
              <div class="grid gap-2">
                <label class="text-sm font-medium text-base-content">Default duration</label>
                <div class="grid grid-cols-5 gap-2">
                  <button
                    v-for="option in durationOptions"
                    :key="option.value"
                    type="button"
                    :data-testid="`settings-duration-${option.value}`"
                    :class="[
                      'rounded-xl px-2 py-2.5 text-xs font-semibold shadow-sm transition-all duration-150',
                      settings.defaultDuration === option.value
                        ? 'bg-primary-200 text-white shadow-md'
                        : 'bg-base-300 text-base-content/70 hover:text-base-content hover:shadow-md',
                    ]"
                    @click="setDefaultDuration(option.value)"
                  >
                    {{ option.label }}
                  </button>
                </div>
              </div>
            </div>

            <p class="mt-5 text-center text-xs text-base-content/70">
              Settings are saved automatically
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { IconSettings, IconX } from '@tabler/icons-vue';
import { Teleport, Transition } from 'vue';
import { useModal } from '@/composables/useModal';
import type { DurationPreset, Priority, SelectOption, Theme } from '@/core/types';
import { setDefaultDuration, setDefaultPriority, setTheme, settings } from '@/stores/settings';

const { isOpen, open, close } = useModal();

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
