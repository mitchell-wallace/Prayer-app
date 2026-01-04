<template>
  <section class="panel">
    <div class="panel__header">
      <div>
        <p class="eyebrow">Add request</p>
        <h2>Capture a new prayer need</h2>
      </div>
      <button class="ghost" type="button" @click="resetForm">Reset</button>
    </div>
    <form class="form" @submit.prevent="submit">
      <label class="field">
        <span>Title *</span>
        <input v-model="form.title" required placeholder="Who or what are you praying for?" />
      </label>

      <div class="field-grid">
        <label class="field">
          <span>Priority</span>
          <select v-model="form.priority">
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label class="field">
          <span>Duration</span>
          <select v-model="form.durationPreset">
            <option value="10d">10 days</option>
            <option value="1m">1 month</option>
            <option value="3m">3 months</option>
            <option value="1y">1 year</option>
          </select>
        </label>
      </div>

      <label class="field">
        <div class="field__title">
          <span>Details</span>
          <button class="link" type="button" @click="detailsExpanded = !detailsExpanded">
            {{ detailsExpanded ? 'Hide' : 'Add more context' }}
          </button>
        </div>
        <textarea v-if="detailsExpanded" v-model="form.details" rows="3" placeholder="Optional context"></textarea>
      </label>

      <div class="actions">
        <button class="primary" type="submit">Save to feed</button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { reactive, ref } from 'vue';

const emit = defineEmits(['save']);

const blank = () => ({
  title: '',
  details: '',
  priority: 'high',
  durationPreset: '1m',
});

const form = reactive(blank());
const detailsExpanded = ref(false);

function resetForm() {
  Object.assign(form, blank());
  detailsExpanded.value = false;
}

function submit() {
  emit('save', { ...form });
  resetForm();
}
</script>

<style scoped>
.panel {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow);
}

.panel__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.eyebrow {
  color: var(--muted);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0 0 4px 0;
}

h2 {
  margin: 0;
  font-size: 22px;
}

.form {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.field {
  display: grid;
  gap: 6px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}

.field__title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

input,
select,
textarea {
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--card-muted);
  color: var(--text);
}

textarea {
  resize: vertical;
}

.actions {
  display: flex;
  justify-content: flex-end;
}

.primary {
  background: linear-gradient(135deg, #9d7bff, #7c9dff);
  padding: 12px 18px;
  color: #0d0d10;
}

.ghost {
  background: var(--card-muted);
  color: var(--text);
  padding: 8px 12px;
  border: 1px solid var(--border);
}

.link {
  background: transparent;
  color: var(--accent);
  padding: 0;
}

@media (max-width: 640px) {
  .panel__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
