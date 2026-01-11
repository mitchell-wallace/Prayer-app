<template>
  <section>
    <form class="grid gap-3" @submit.prevent="submit">
      <div
        :class="[
          'grid grid-cols-[1fr_auto] items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 shadow-[var(--shadow)] transition',
          showControls ? 'border-[rgba(157,123,255,0.6)] shadow-lg' : '',
        ]"
      >
        <input
          v-model="form.title"
          type="text"
          required
          placeholder="Add a prayer request"
          class="w-full bg-transparent px-1 py-3 text-base text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none"
          @focus="isFocused = true"
          @blur="handleBlur"
        />
        <button
          class="h-11 w-11 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] text-xl font-bold text-[var(--text)] transition hover:border-[var(--accent)] disabled:opacity-50"
          type="submit"
          :disabled="!form.title.trim()"
        >
          <span aria-hidden="true">＋</span>
          <span class="sr-only">Add request</span>
        </button>
      </div>

      <div v-if="showControls" class="flex justify-end gap-2">
        <div class="relative" ref="priorityRef">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text)]"
            @click="togglePriority"
          >
            <span>{{ priorityLabel }}</span>
            <span class="text-xs">▾</span>
          </button>
          <ul
            v-if="priorityOpen"
            class="absolute bottom-full mb-2 w-36 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-2xl"
          >
            <li v-for="option in priorityOptions" :key="option.value">
              <button
                type="button"
                :class="[
                  'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--card-muted)]',
                  form.priority === option.value ? 'border border-[rgba(157,123,255,0.6)] bg-[var(--card-muted)]' : '',
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
            class="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text)]"
            @click="toggleDuration"
          >
            <span>{{ durationLabel }}</span>
            <span class="text-xs">▾</span>
          </button>
          <ul
            v-if="durationOpen"
            class="absolute bottom-full mb-2 w-40 rounded-xl border border-[var(--border)] bg-[var(--card)] p-1 shadow-2xl"
          >
            <li v-for="option in durationOptions" :key="option.value">
              <button
                type="button"
                :class="[
                  'w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--card-muted)]',
                  form.durationPreset === option.value
                    ? 'border border-[rgba(157,123,255,0.6)] bg-[var(--card-muted)]'
                    : '',
                ]"
                @click="selectDuration(option.value)"
              >
                {{ option.label }}
              </button>
            </li>
          </ul>
        </div>
      </div>
    </form>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue';

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
  priority: 'medium',
  durationPreset: '6m',
});

const form = reactive(blank());
const isFocused = ref(false);
const priorityOpen = ref(false);
const durationOpen = ref(false);
const priorityRef = ref(null);
const durationRef = ref(null);

const priorityLabel = computed(() => {
  return priorityOptions.find((o) => o.value === form.priority)?.label || 'Priority';
});
const durationLabel = computed(() => {
  return durationOptions.find((o) => o.value === form.durationPreset)?.label || 'Duration';
});
const showControls = computed(() => isFocused.value || priorityOpen.value || durationOpen.value);

function resetForm() {
  Object.assign(form, blank());
  isFocused.value = false;
  priorityOpen.value = false;
  durationOpen.value = false;
}

function submit() {
  if (!form.title.trim()) return;
  emit('save', { ...form, title: form.title.trim() });
  resetForm();
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
