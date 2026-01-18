<template>
  <section ref="formContainerRef" data-testid="add-request-section">
    <form class="grid gap-2" data-testid="add-request-form" @submit.prevent="submit">
      <div v-if="showControls" class="flex flex-wrap justify-start gap-2" data-testid="request-controls">
        <div class="relative" ref="priorityRef">
          <button
            type="button"
            data-testid="priority-toggle"
            class="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text shadow-sm transition-all duration-150 hover:shadow-card"
            @click="togglePriority"
            aria-haspopup="listbox"
            :aria-expanded="priorityOpen"
          >
            <span>{{ priorityLabel }}</span>
            <IconChevronDown :size="14" stroke-width="2.5" />
          </button>
          <ul
            v-if="priorityOpen"
            class="absolute bottom-full mb-2 w-36 rounded-xl bg-card p-1 shadow-modal z-10"
            role="listbox"
          >
            <li v-for="option in priorityOptions" :key="option.value" role="option" :aria-selected="form.priority === option.value">
              <button
                type="button"
                :class="[
                  'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-text transition-colors duration-150 hover:bg-card-muted',
                  form.priority === option.value ? 'bg-primary/10 text-primary' : '',
                ]"
                @click="selectPriority(option.value)"
              >
                {{ option.label }}
              </button>
            </li>
          </ul>
        </div>

        <div class="relative" ref="durationRef">
          <button
            type="button"
            data-testid="duration-toggle"
            class="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-text shadow-sm transition-all duration-150 hover:shadow-card"
            @click="toggleDuration"
            aria-haspopup="listbox"
            :aria-expanded="durationOpen"
          >
            <span>{{ durationLabel }}</span>
            <IconChevronDown :size="14" stroke-width="2.5" />
          </button>
          <ul
            v-if="durationOpen"
            class="absolute bottom-full mb-2 w-40 rounded-xl bg-card p-1 shadow-modal z-10"
            role="listbox"
          >
            <li v-for="option in durationOptions" :key="option.value" role="option" :aria-selected="form.durationPreset === option.value">
              <button
                type="button"
                :class="[
                  'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-text transition-colors duration-150 hover:bg-card-muted',
                  form.durationPreset === option.value ? 'bg-primary/10 text-primary' : '',
                ]"
                @click="selectDuration(option.value)"
              >
                {{ option.label }}
              </button>
            </li>
          </ul>
        </div>

        <button
          v-if="!detailsOpen"
          type="button"
          data-testid="details-toggle"
          class="inline-flex items-center gap-1.5 rounded-xl bg-card px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted shadow-sm transition-all duration-150 hover:text-text hover:shadow-card"
          @click="openDetails"
        >
          <IconPlus :size="14" stroke-width="2.5" />
          <span>Details</span>
        </button>
      </div>

      <div
        :class="[
          'grid gap-2 rounded-2xl bg-card px-4 py-3 shadow-card transition-all duration-200',
          showControls ? 'shadow-primary-glow' : '',
        ]"
      >
        <div class="grid grid-cols-[1fr_auto] items-start gap-2">
          <textarea
            ref="inputRef"
            data-testid="request-input"
            v-model="form.title"
            :rows="showControls ? 2 : 1"
            required
            placeholder="Add a prayer request"
            :class="[
              'w-full resize-none bg-transparent text-base text-text placeholder:text-muted focus:outline-none transition-all duration-150',
              showControls ? 'py-1' : 'py-2',
            ]"
            @focus="isFocused = true"
            @blur="handleBlur"
            @keydown.enter.exact.prevent="submit"
          ></textarea>
          <button
            class="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-sm transition-all duration-150 hover:bg-primary-hover hover:shadow-card disabled:opacity-50 disabled:hover:bg-primary disabled:hover:shadow-sm"
            type="submit"
            data-testid="request-submit"
            :disabled="!form.title.trim()"
          >
            <IconPlus :size="22" stroke-width="2.5" />
            <span class="sr-only">Add request</span>
          </button>
        </div>
        <div v-if="detailsOpen" class="grid gap-1">
          <textarea
            ref="detailsInputRef"
            data-testid="request-details-input"
            v-model="form.details"
            rows="2"
            placeholder="Add more context or background (optional)"
            class="w-full resize-none rounded-xl bg-card-muted p-3 text-sm text-text placeholder:text-muted focus:outline-none focus:shadow-primary-glow transition-all duration-150"
            @blur="handleBlur"
          ></textarea>
        </div>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { IconChevronDown, IconPlus } from '@tabler/icons-vue';
import { settings } from '../app/settingsService.js';
import type { CreateRequestPayload, DurationPreset, Priority, SelectOption } from '../types';

const emit = defineEmits<{
  save: [payload: CreateRequestPayload];
}>();

const priorityOptions: SelectOption<Priority>[] = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const durationOptions: SelectOption<DurationPreset>[] = [
  { value: '10d', label: '10 days' },
  { value: '1m', label: '1 month' },
  { value: '3m', label: '3 months' },
  { value: '6m', label: '6 months' },
  { value: '1y', label: '1 year' },
];

interface FormState {
  title: string;
  details: string;
  priority: Priority;
  durationPreset: DurationPreset;
}

const blank = (): FormState => ({
  title: '',
  details: '',
  priority: settings.defaultPriority as Priority,
  durationPreset: settings.defaultDuration as DurationPreset,
});

const form = reactive<FormState>(blank());

// Sync form defaults when settings change (only if form is clean/empty)
watch(
  () => [settings.defaultPriority, settings.defaultDuration],
  ([newPriority, newDuration]) => {
    // Only update if the title is empty (form not in use)
    if (!form.title.trim()) {
      form.priority = newPriority as Priority;
      form.durationPreset = newDuration as DurationPreset;
    }
  }
);
const isFocused = ref<boolean>(false);
const priorityOpen = ref<boolean>(false);
const durationOpen = ref<boolean>(false);
const detailsOpen = ref<boolean>(false);
const priorityRef = ref<HTMLDivElement | null>(null);
const durationRef = ref<HTMLDivElement | null>(null);
const formContainerRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);
const detailsInputRef = ref<HTMLTextAreaElement | null>(null);

const priorityLabel = computed<string>(() => {
  return priorityOptions.find((o) => o.value === form.priority)?.label || 'Priority';
});
const durationLabel = computed<string>(() => {
  return durationOptions.find((o) => o.value === form.durationPreset)?.label || 'Duration';
});
const showControls = computed<boolean>(() => isFocused.value || priorityOpen.value || durationOpen.value || detailsOpen.value);

function clearForm(): void {
  form.title = '';
  form.details = '';
  // Reset priority/duration to defaults for next request
  form.priority = settings.defaultPriority as Priority;
  form.durationPreset = settings.defaultDuration as DurationPreset;
  detailsOpen.value = false;
}

async function submit(): Promise<void> {
  if (!form.title.trim()) return;
  const payload: CreateRequestPayload = {
    title: form.title.trim(),
    priority: form.priority,
    durationPreset: form.durationPreset,
  };
  if (form.details.trim()) {
    payload.details = form.details.trim();
  }
  emit('save', payload);
  // Clear form but keep it active for adding more requests
  clearForm();
  await nextTick();
  inputRef.value?.focus();
}

function togglePriority(): void {
  priorityOpen.value = !priorityOpen.value;
  durationOpen.value = false;
}

function toggleDuration(): void {
  durationOpen.value = !durationOpen.value;
  priorityOpen.value = false;
}

function selectPriority(value: Priority): void {
  form.priority = value;
  priorityOpen.value = false;
}

function selectDuration(value: DurationPreset): void {
  form.durationPreset = value;
  durationOpen.value = false;
}

async function openDetails(): Promise<void> {
  detailsOpen.value = true;
  await nextTick();
  detailsInputRef.value?.focus();
}

function handleBlur(): void {
  setTimeout(() => {
    if (!priorityOpen.value && !durationOpen.value && !detailsOpen.value) {
      isFocused.value = false;
    }
  }, 80);
}

function handleClickOutside(event: MouseEvent): void {
  // If clicking outside the entire form container, close everything
  if (formContainerRef.value && !formContainerRef.value.contains(event.target as Node)) {
    priorityOpen.value = false;
    durationOpen.value = false;
    isFocused.value = false;
    return;
  }
  // Otherwise just close dropdowns if clicking outside them
  const targets = [priorityRef.value, durationRef.value];
  if (targets.some((node) => node?.contains(event.target as Node))) return;
  priorityOpen.value = false;
  durationOpen.value = false;
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
