<template>
  <article class="card" :class="statusClass">
    <header class="card__header">
      <div>
        <p class="eyebrow">{{ statusLabel }}</p>
        <h3>{{ request.title }}</h3>
        <div class="meta">
          <span :class="['pill', `pill--${request.priority}`]">{{ request.priority }}</span>
          <span class="pill pill--muted">{{ expiryCopy }}</span>
          <span class="pill pill--muted">Last prayed: {{ lastPrayed }}</span>
        </div>
      </div>
      <div class="stack">
        <button class="icon" type="button" @click="expanded = !expanded">
          {{ expanded ? 'Collapse' : 'Details' }}
        </button>
      </div>
    </header>

    <section class="actions">
      <button class="primary" type="button" @click="emit('pray', request)">Prayed</button>
      <button class="ghost" type="button" @click="toggleEditing">{{ editing ? 'Cancel' : 'Edit request' }}</button>
      <button class="ghost" type="button" @click="expanded = true">Add note</button>
      <button
        class="danger"
        type="button"
        :disabled="request.status === 'answered'"
        @click="emit('mark-answered', request)"
      >
        Mark answered
      </button>
    </section>

    <transition name="fade">
      <div v-if="editing" class="edit">
        <label class="field">
          <span>Title</span>
          <input v-model="editForm.title" required />
        </label>
        <label class="field">
          <span>Details</span>
          <textarea v-model="editForm.details" rows="3"></textarea>
        </label>
        <div class="field-grid">
          <label class="field">
            <span>Priority</span>
            <select v-model="editForm.priority">
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </label>
          <label class="field">
            <span>Duration</span>
            <select v-model="editForm.durationPreset">
              <option value="10d">10 days</option>
              <option value="1m">1 month</option>
              <option value="3m">3 months</option>
              <option value="1y">1 year</option>
            </select>
          </label>
        </div>
        <div class="actions">
          <button class="ghost" type="button" @click="toggleEditing">Cancel</button>
          <button class="primary" type="button" @click="saveEdit">Save changes</button>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="expanded" class="details">
        <p v-if="request.details" class="details__text">{{ request.details }}</p>
        <p class="muted">
          Added {{ createdCopy }} · Expires {{ expiryDate }} · {{ notesLabel }}
        </p>

        <div class="notes">
          <div class="notes__header">
            <h4>Notes</h4>
            <span class="muted">Newest first</span>
          </div>

          <form class="note-input" @submit.prevent="submitNote">
            <textarea
              v-model="noteDraft"
              rows="2"
              required
              placeholder="What changed?"
            ></textarea>
            <div class="actions">
              <button class="primary" type="submit">Add note</button>
            </div>
          </form>

          <ol v-if="request.notes?.length" class="notes__list">
            <li v-for="note in sortedNotes" :key="note.id" class="note">
              <div class="note__header">
                <span class="muted">{{ formatTimestamp(note.createdAt) }}</span>
                <div class="note__actions">
                  <button class="link" type="button" @click="startNoteEdit(note)">
                    {{ editingNote?.id === note.id ? 'Cancel' : 'Edit' }}
                  </button>
                  <button class="link danger-link" type="button" @click="emit('delete-note', { request, note })">
                    Delete
                  </button>
                </div>
              </div>
              <div v-if="editingNote?.id === note.id" class="note-edit">
                <textarea v-model="editingNote.text" rows="2"></textarea>
                <div class="actions">
                  <button class="ghost" type="button" @click="editingNote = null">Cancel</button>
                  <button class="primary" type="button" @click="saveNoteEdit(note)">Save</button>
                </div>
              </div>
              <p v-else class="note__text">{{ note.text }}</p>
            </li>
          </ol>
          <p v-else class="muted">No notes yet. Capture the latest update.</p>
        </div>
      </div>
    </transition>
  </article>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { daysLeft, formatDate, timeAgo } from '../utils/time.js';

const props = defineProps({
  request: { type: Object, required: true },
});

const emit = defineEmits(['pray', 'mark-answered', 'update-request', 'add-note', 'edit-note', 'delete-note']);

const expanded = ref(false);
const editing = ref(false);
const noteDraft = ref('');
const editingNote = ref(null);

const editForm = reactive({ ...props.request });

watch(
  () => props.request,
  (next) => {
    Object.assign(editForm, next);
  }
);

const lastPrayed = computed(() => {
  const stamp = props.request.prayedAt?.length ? Math.max(...props.request.prayedAt) : null;
  return stamp ? timeAgo(stamp) : 'Never';
});
const expiryCopy = computed(() => daysLeft(props.request.expiresAt));
const createdCopy = computed(() => formatDate(props.request.createdAt));
const expiryDate = computed(() => formatDate(props.request.expiresAt));
const notesLabel = computed(() => `${props.request.notes?.length || 0} notes`);

const statusLabel = computed(() => (props.request.status === 'answered' ? 'Answered' : 'Active'));
const statusClass = computed(() => (props.request.status === 'answered' ? 'card--answered' : ''));

const sortedNotes = computed(() => [...(props.request.notes || [])].sort((a, b) => b.createdAt - a.createdAt));

function toggleEditing() {
  editing.value = !editing.value;
  if (editing.value) {
    Object.assign(editForm, props.request);
  }
}

function saveEdit() {
  emit('update-request', { ...editForm });
  editing.value = false;
}

function submitNote() {
  if (!noteDraft.value.trim()) return;
  emit('add-note', { request: props.request, text: noteDraft.value.trim() });
  noteDraft.value = '';
  expanded.value = true;
}

function startNoteEdit(note) {
  if (editingNote.value?.id === note.id) {
    editingNote.value = null;
    return;
  }
  editingNote.value = { ...note };
}

function saveNoteEdit(note) {
  if (!editingNote.value) return;
  emit('edit-note', { request: props.request, note: { ...editingNote.value } });
  editingNote.value = null;
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}
</script>

<style scoped>
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  display: grid;
  gap: 12px;
  box-shadow: var(--shadow);
}

.card--answered {
  opacity: 0.7;
  border-color: rgba(255, 255, 255, 0.12);
}

.card__header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.stack {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

h3 {
  margin: 0 0 6px 0;
}

.meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: var(--card-muted);
  color: var(--text);
  font-size: 12px;
  border: 1px solid var(--border);
  text-transform: capitalize;
}

.pill--urgent {
  background: rgba(239, 68, 68, 0.14);
  border-color: rgba(239, 68, 68, 0.3);
  color: #fca5a5;
}

.pill--high {
  background: rgba(255, 183, 77, 0.16);
  border-color: rgba(255, 183, 77, 0.4);
  color: #ffd699;
}

.pill--medium {
  background: rgba(125, 211, 252, 0.14);
  border-color: rgba(125, 211, 252, 0.4);
  color: #bae6fd;
}

.pill--low {
  background: rgba(74, 222, 128, 0.14);
  border-color: rgba(74, 222, 128, 0.35);
  color: #bbf7d0;
}

.pill--muted {
  color: var(--muted);
}

.icon {
  background: var(--card-muted);
  color: var(--text);
  border: 1px solid var(--border);
  padding: 8px 12px;
}

.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.primary {
  background: linear-gradient(135deg, #9d7bff, #7c9dff);
  padding: 10px 14px;
  color: #0d0d10;
}

.ghost {
  background: var(--card-muted);
  color: var(--text);
  padding: 10px 14px;
  border: 1px solid var(--border);
}

.danger {
  background: rgba(239, 68, 68, 0.14);
  color: #fca5a5;
  padding: 10px 14px;
  border: 1px solid rgba(239, 68, 68, 0.4);
}

.details {
  background: var(--card-muted);
  border-radius: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  display: grid;
  gap: 8px;
}

.details__text {
  margin: 0;
  line-height: 1.5;
}

.muted {
  color: var(--muted);
  margin: 0;
}

.notes {
  display: grid;
  gap: 12px;
}

.notes__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.note-input textarea,
.note-edit textarea,
.edit textarea,
.edit input,
.edit select {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #111019;
  color: var(--text);
}

.note-input textarea {
  background: #0f0e16;
}

.notes__list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 10px;
}

.note {
  padding: 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #0f0e16;
}

.note__text {
  margin: 6px 0 0 0;
  line-height: 1.5;
}

.note__actions {
  display: flex;
  gap: 8px;
}

.link {
  background: transparent;
  color: var(--accent);
  padding: 0;
}

.danger-link {
  color: #f87171;
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

.edit {
  background: var(--card-muted);
  padding: 12px;
  border-radius: 12px;
  border: 1px solid var(--border);
  display: grid;
  gap: 10px;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .card__header {
    flex-direction: column;
  }
  .actions {
    flex-direction: column;
  }
  .stack {
    align-self: flex-end;
  }
}
</style>
