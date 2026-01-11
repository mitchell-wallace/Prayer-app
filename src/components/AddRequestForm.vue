<template>
  <section ref="formContainerRef">
    <form class="grid gap-2" @submit.prevent="submit">
      <div v-if="showControls" class="flex justify-start gap-2">
        <div class="relative" ref="priorityRef">
          <button
            type="button"
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
      </div>

      <div
        :class="[
          'grid grid-cols-[1fr_auto] items-start gap-2 rounded-2xl bg-card px-4 py-3 shadow-card transition-all duration-200',
          showControls ? 'shadow-primary-glow' : '',
        ]"
      >
        <textarea
          ref="inputRef"
          v-model="form.title"
          :rows="showControls ? 3 : 1"
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
          :disabled="!form.title.trim()"
        >
          <IconPlus :size="22" stroke-width="2.5" />
          <span class="sr-only">Add request</span>
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { IconChevronDown, IconPlus } from '@tabler/icons-vue';
import { settings } from '../settings.js';

const emit = defineEmits(['save']);

const priorityOptions = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const durationOptions = [
  { value: '10d', label: '10 days' },
  { value: '1m', label: '1 month' },
  { value: '3m', label: '3 months' },
  { value: '6m', label: '6 months' },
  { value: '1y', label: '1 year' },
];

const blank = () => ({
  title: '',
  priority: settings.defaultPriority,
  durationPreset: settings.defaultDuration,
});

const form = reactive(blank());

// Sync form defaults when settings change (only if form is clean/empty)
watch(
  () => [settings.defaultPriority, settings.defaultDuration],
  ([newPriority, newDuration]) => {
    // Only update if the title is empty (form not in use)
    if (!form.title.trim()) {
      form.priority = newPriority;
      form.durationPreset = newDuration;
    }
  }
);
const isFocused = ref(false);
const priorityOpen = ref(false);
const durationOpen = ref(false);
const priorityRef = ref(null);
const durationRef = ref(null);
const formContainerRef = ref(null);
const inputRef = ref(null);

const priorityLabel = computed(() => {
  return priorityOptions.find((o) => o.value === form.priority)?.label || 'Priority';
});
const durationLabel = computed(() => {
  return durationOptions.find((o) => o.value === form.durationPreset)?.label || 'Duration';
});
const showControls = computed(() => isFocused.value || priorityOpen.value || durationOpen.value);

function clearTitle() {
  form.title = '';
  // Reset priority/duration to defaults for next request
  form.priority = settings.defaultPriority;
  form.durationPreset = settings.defaultDuration;
}

function resetForm() {
  Object.assign(form, blank());
  isFocused.value = false;
  priorityOpen.value = false;
  durationOpen.value = false;
}

async function submit() {
  if (!form.title.trim()) return;
  emit('save', { ...form, title: form.title.trim() });
  // Clear title but keep form active for adding more requests
  clearTitle();
  await nextTick();
  inputRef.value?.focus();
}

function togglePriority() {
  priorityOpen.value = !priorityOpen.value;
  durationOpen.value = false;
}

function toggleDuration() {
  durationOpen.value = !durationOpen.value;
  priorityOpen.value = false;
}

function selectPriority(value) {
  form.priority = value;
  priorityOpen.value = false;
}

function selectDuration(value) {
  form.durationPreset = value;
  durationOpen.value = false;
}

function handleBlur() {
  setTimeout(() => {
    if (!priorityOpen.value && !durationOpen.value) {
      isFocused.value = false;
    }
  }, 80);
}

function handleClickOutside(event) {
  // If clicking outside the entire form container, close everything
  if (formContainerRef.value && !formContainerRef.value.contains(event.target)) {
    priorityOpen.value = false;
    durationOpen.value = false;
    isFocused.value = false;
    return;
  }
  // Otherwise just close dropdowns if clicking outside them
  const targets = [priorityRef.value, durationRef.value];
  if (targets.some((node) => node?.contains(event.target))) return;
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
