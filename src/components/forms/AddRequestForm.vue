<template>
  <section ref="formContainerRef" data-testid="add-request-section">
    <form class="grid gap-2" data-testid="add-request-form" @submit.prevent="submit">
      <div v-if="showControls" class="flex justify-start gap-2" data-testid="request-controls">
        <div class="relative" ref="priorityRef">
          <button
            type="button"
            data-testid="priority-toggle"
            class="inline-flex items-center gap-1.5 rounded-xl bg-base-300 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-base-content shadow-sm transition-all duration-150 hover:shadow-lg dark:bg-base-200"
            @click="togglePriority"
            @pointerdown.prevent
            aria-haspopup="listbox"
            :aria-expanded="priorityOpen"
          >
            <span>{{ priorityLabel }}</span>
            <IconChevronDown :size="14" stroke-width="2.5" />
          </button>
          <ul
            v-if="priorityOpen"
            class="absolute bottom-full mb-2 w-36 rounded-xl bg-base-300 p-1 shadow-xl z-10 dark:bg-base-200"
            role="listbox"
          >
            <li v-for="option in priorityOptions" :key="option.value" role="option" :aria-selected="form.priority === option.value">
              <button
                type="button"
                :class="[
                  'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-base-content transition-colors duration-150 hover:bg-base-300',
                  form.priority === option.value ? 'bg-primary-200/10 text-primary-200' : '',
                ]"
                @click="selectPriority(option.value)"
                @pointerdown.prevent
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
            class="inline-flex items-center gap-1.5 rounded-xl bg-base-300 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-base-content shadow-sm transition-all duration-150 hover:shadow-lg dark:bg-base-200"
            @click="toggleDuration"
            @pointerdown.prevent
            aria-haspopup="listbox"
            :aria-expanded="durationOpen"
          >
            <span>{{ durationLabel }}</span>
            <IconChevronDown :size="14" stroke-width="2.5" />
          </button>
          <ul
            v-if="durationOpen"
            class="absolute bottom-full mb-2 w-40 rounded-xl bg-base-300 p-1 shadow-xl z-10 dark:bg-base-200"
            role="listbox"
          >
            <li v-for="option in durationOptions" :key="option.value" role="option" :aria-selected="form.durationPreset === option.value">
              <button
                type="button"
                :class="[
                  'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-base-content transition-colors duration-150 hover:bg-base-300',
                  form.durationPreset === option.value ? 'bg-primary-200/10 text-primary-200' : '',
                ]"
                @click="selectDuration(option.value)"
                @pointerdown.prevent
              >
                {{ option.label }}
              </button>
            </li>
          </ul>
        </div>
      </div>

      <div
        :class="[
          'grid grid-cols-[1fr_auto] items-start gap-2 rounded-2xl bg-base-300 px-4 py-3 shadow-lg transition-all duration-200 dark:bg-base-200',
          showControls ? 'shadow-primary-glow' : '',
        ]"
      >
        <textarea
          ref="inputRef"
          data-testid="request-input"
          v-model="form.title"
          :rows="showControls ? 3 : 1"
          required
          placeholder="Add a prayer request"
          :class="[
            'w-full resize-none bg-transparent text-base text-base-content placeholder:text-base-content/70 focus:outline-none transition-all duration-150',
            showControls ? 'py-1' : 'py-2',
          ]"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown.enter.exact.prevent="submit"
        ></textarea>
        <button
          class="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-200 text-white shadow-sm transition-all duration-150 hover:bg-primary-100 hover:shadow-lg disabled:opacity-50 disabled:hover:bg-primary-200 disabled:hover:shadow-sm"
          type="submit"
          data-testid="request-submit"
          :disabled="!form.title.trim()"
        >
          <IconPlus :size="22" stroke-width="2.5" />
          <span class="sr-only">Add request</span>
        </button>
      </div>
    </form>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { IconChevronDown, IconPlus } from '@tabler/icons-vue';
import { settings } from '../../stores/settings';
import type { CreateRequestPayload, DurationPreset, Priority, SelectOption } from '../../core/types';

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
  priority: Priority;
  durationPreset: DurationPreset;
}

const blank = (): FormState => ({
  title: '',
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
const isExpanded = ref<boolean>(false);
const isInputFocused = ref<boolean>(false);
const restoreFocus = ref<boolean>(false);
const priorityOpen = ref<boolean>(false);
const durationOpen = ref<boolean>(false);
const priorityRef = ref<HTMLDivElement | null>(null);
const durationRef = ref<HTMLDivElement | null>(null);
const formContainerRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);

const priorityLabel = computed<string>(() => {
  return priorityOptions.find((o) => o.value === form.priority)?.label || 'Priority';
});
const durationLabel = computed<string>(() => {
  return durationOptions.find((o) => o.value === form.durationPreset)?.label || 'Duration';
});
const showControls = computed<boolean>(
  () => isExpanded.value || priorityOpen.value || durationOpen.value || !!form.title.trim()
);

function clearTitle(): void {
  form.title = '';
  // Reset priority/duration to defaults for next request
  form.priority = settings.defaultPriority as Priority;
  form.durationPreset = settings.defaultDuration as DurationPreset;
}

async function submit(): Promise<void> {
  if (!form.title.trim()) return;
  emit('save', { ...form, title: form.title.trim() });
  clearTitle();
  priorityOpen.value = false;
  durationOpen.value = false;
  isExpanded.value = false;
  restoreFocus.value = false;
  if (isInputFocused.value) {
    inputRef.value?.blur();
  }
  isInputFocused.value = false;
  await nextTick();
}

function handleFocus(): void {
  isInputFocused.value = true;
  isExpanded.value = true;
}

function handleBlur(): void {
  isInputFocused.value = false;
}

function togglePriority(): void {
  priorityOpen.value = !priorityOpen.value;
  durationOpen.value = false;
  isExpanded.value = true;
  restoreFocus.value = isInputFocused.value;
}

function toggleDuration(): void {
  durationOpen.value = !durationOpen.value;
  priorityOpen.value = false;
  isExpanded.value = true;
  restoreFocus.value = isInputFocused.value;
}

function selectPriority(value: Priority): void {
  form.priority = value;
  priorityOpen.value = false;
  if (restoreFocus.value) {
    inputRef.value?.focus();
  }
  restoreFocus.value = false;
}

function selectDuration(value: DurationPreset): void {
  form.durationPreset = value;
  durationOpen.value = false;
  if (restoreFocus.value) {
    inputRef.value?.focus();
  }
  restoreFocus.value = false;
}

function handleClickOutside(event: MouseEvent): void {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
  // If clicking outside the entire form container, close everything
  const clickedInsideForm =
    !!formContainerRef.value &&
    (path.includes(formContainerRef.value) || formContainerRef.value.contains(event.target as Node));
  if (!clickedInsideForm) {
    priorityOpen.value = false;
    durationOpen.value = false;
    isExpanded.value = false;
    isInputFocused.value = false;
    restoreFocus.value = false;
    return;
  }
  // Otherwise just close dropdowns if clicking outside them
  const targets = [priorityRef.value, durationRef.value];
  if (targets.some((node) => node && (path.includes(node) || node.contains(event.target as Node)))) return;
  priorityOpen.value = false;
  durationOpen.value = false;
  restoreFocus.value = false;
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
