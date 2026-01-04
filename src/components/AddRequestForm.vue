<template>
  <div class="composer" :class="{ 'composer--active': isActive }">
    <div class="composer__inner">
      <div class="chip-row" v-if="isActive">
        <div class="chip-popover">
          <p class="chip-label">Priority</p>
          <div class="chip-options">
            <button
              v-for="option in priorities"
              :key="option.value"
              type="button"
              class="chip"
              :class="{ 'chip--active': form.priority === option.value }"
              @click="form.priority = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="chip-popover">
          <p class="chip-label">Duration</p>
          <div class="chip-options">
            <button
              v-for="option in durations"
              :key="option.value"
              type="button"
              class="chip"
              :class="{ 'chip--active': form.durationPreset === option.value }"
              @click="form.durationPreset = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
      </div>

      <form class="composer__bar" @submit.prevent="submit" @click="activate" @focusin="activate">
        <input
          v-model="form.title"
          required
          class="composer__input"
          placeholder="Add a prayer request"
          @focus="activate"
        />
        <button type="submit" class="composer__action" aria-label="Add request">
          <span>＋</span>
        </button>
      </form>

      <transition name="fade">
        <div v-if="isActive" class="details">
          <label class="details__row">
            <span class="muted">Details (optional)</span>
            <textarea
              v-model="form.details"
              rows="2"
              placeholder="Add more context"
              @focus="activate"
            ></textarea>
          </label>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';

const emit = defineEmits(['save']);

const priorities = [
  { value: 'urgent', label: 'Urgent' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const durations = [
  { value: '10d', label: '10 days' },
  { value: '1m', label: '1 month' },
  { value: '3m', label: '3 months' },
  { value: '6m', label: '6 months' },
  { value: '1y', label: '1 year' },
];

const blank = () => ({
  title: '',
  details: '',
  priority: 'medium',
  durationPreset: '6m',
});

const form = reactive(blank());
const isActive = ref(false);

function activate() {
  isActive.value = true;
}

function resetForm() {
  Object.assign(form, blank());
  isActive.value = false;
}

function submit() {
  if (!form.title.trim()) return;
  emit('save', { ...form });
  resetForm();
}
</script>

<style scoped>
.composer {
  position: sticky;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 12px 0 10px;
  background: linear-gradient(180deg, rgba(13, 13, 16, 0) 0%, #0d0d10 28%);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  z-index: 10;
}

.composer__inner {
  max-width: 760px;
  margin: 0 auto;
  display: grid;
  gap: 8px;
  padding: 0 4px env(safe-area-inset-bottom);
}

.composer__bar {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  border: 1px solid var(--border);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.composer__input {
  background: transparent;
  border: none;
  color: var(--text);
  font-size: 16px;
  padding: 8px 10px;
  outline: none;
}

.composer__action {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: linear-gradient(135deg, #7c9dff, #9d7bff);
  color: #0d0d10;
  font-size: 22px;
  display: grid;
  place-items: center;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.35);
}

.chip-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.chip-popover {
  flex: 1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 8px;
  display: grid;
  gap: 6px;
}

.chip-label {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
  letter-spacing: 0.04em;
}

.chip-options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  border-radius: 999px;
  border: 1px solid var(--border);
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.02);
  color: var(--text);
  font-weight: 600;
}

.chip--active {
  background: rgba(124, 157, 255, 0.18);
  border-color: rgba(124, 157, 255, 0.5);
  color: #dbeafe;
}

.details {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.details__row {
  display: grid;
  gap: 6px;
}

textarea {
  width: 100%;
  background: var(--card-muted);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  padding: 10px 12px;
  resize: vertical;
  min-height: 70px;
}

.muted {
  color: var(--muted);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.18s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .chip-row {
    flex-direction: column;
  }
  .composer__inner {
    padding: 0 0 calc(env(safe-area-inset-bottom) + 4px);
  }
}

.composer--active .chip-popover {
  animation: rise 0.16s ease;
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
