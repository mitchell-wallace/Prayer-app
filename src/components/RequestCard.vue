<template>
  <section :class="['relative flex h-full min-h-0 flex-col', request.status === 'answered' ? 'opacity-90' : '']">
    <div class="relative flex-1 min-h-0 overflow-auto pb-8">
      <button
        class="absolute right-0 top-0 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card-muted text-sm text-text"
        type="button"
        @click="toggleEditing"
        aria-label="Edit request"
      >
        ✎
      </button>

      <header class="flex flex-col gap-2 pr-12">
        <p class="text-[11px] uppercase tracking-[0.14em] text-muted">{{ statusLabel }}</p>
        <h3 class="m-0 text-lg font-semibold leading-tight">{{ request.title }}</h3>
        <div class="flex flex-wrap gap-2 text-xs">
          <span
            :class="[
              'rounded-full border px-3 py-1 font-semibold capitalize',
              priorityClasses[request.priority] || 'border-border bg-card-muted text-text',
            ]"
          >
            {{ request.priority }}
          </span>
          <span class="rounded-full border border-border bg-card-muted px-3 py-1 font-semibold text-muted">
            {{ expiryCopy }}
          </span>
          <span class="rounded-full border border-border bg-card-muted px-3 py-1 font-semibold text-muted">
            Last {{ lastPrayed }}
          </span>
        </div>
      </header>

      <div class="mt-4 grid gap-3 rounded-xl border border-border bg-card-muted p-3">
        <div class="flex items-center justify-between text-xs text-muted">
          <span>Notes</span>
          <span>{{ notesLabel }}</span>
        </div>

        <div v-if="noteFormOpen" class="grid gap-2">
          <textarea
            v-model="noteDraft"
            rows="2"
            required
            placeholder="Capture the latest update"
            class="w-full rounded-lg border border-border bg-note-bg p-2 text-sm text-text placeholder:text-muted focus:outline-none"
          ></textarea>
          <div class="flex justify-end gap-2">
            <button
              class="rounded-lg border border-border bg-card-muted px-3 py-2 text-sm font-semibold"
              type="button"
              @click="cancelNote"
            >
              Cancel
            </button>
            <button
              class="rounded-lg bg-gradient-to-r from-accent to-accent-secondary px-3 py-2 text-sm font-semibold text-bg"
              type="button"
              @click="submitNote"
            >
              Add Note
            </button>
          </div>
        </div>
        <button
          v-else
          class="justify-self-start text-sm font-semibold text-accent"
          type="button"
          @click="noteFormOpen = true"
        >
          + add note
        </button>

        <p v-if="!sortedNotes.length" class="m-0 text-sm text-muted">no notes</p>
        <ol v-else class="grid gap-3 text-sm" role="list">
          <li
            v-for="note in sortedNotes"
            :key="note.id"
            class="rounded-xl border border-border bg-note-bg p-3"
          >
            <div class="flex items-start justify-between gap-2 text-xs text-muted">
              <span>{{ formatTimestamp(note.createdAt) }}</span>
              <div class="flex gap-2">
                <button class="text-accent" type="button" @click="startNoteEdit(note)">
                  {{ editingNote?.id === note.id ? 'Cancel' : 'Edit' }}
                </button>
                <button class="text-note-delete" type="button" @click="emit('delete-note', { request, note })">Delete</button>
              </div>
            </div>
            <div v-if="editingNote?.id === note.id" class="mt-2 grid gap-2">
              <textarea
                v-model="editingNote.text"
                rows="2"
                class="w-full rounded-lg border border-border bg-note-bg p-2 text-sm text-text focus:outline-none"
              ></textarea>
              <div v-if="editingNote.isAnswer" class="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-note-answer-text">
                <span class="inline-flex h-2 w-2 rounded-full bg-note-answer-dot"></span>
                Answered note
              </div>
              <div class="flex justify-end gap-2">
                <button
                  class="rounded-lg border border-border bg-card-muted px-3 py-2 text-sm font-semibold"
                  type="button"
                  @click="editingNote = null"
                >
                  Dismiss
                </button>
                <button
                  class="rounded-lg bg-gradient-to-r from-accent to-accent-secondary px-3 py-2 text-sm font-semibold text-bg"
                  type="button"
                  @click="saveNoteEdit(note)"
                >
                  Save
                </button>
              </div>
            </div>
            <div v-else class="mt-2 flex items-start gap-2 text-sm leading-relaxed">
              <span
                v-if="note.isAnswer"
                class="mt-[3px] inline-flex items-center rounded-full border border-note-answer-border bg-note-answer-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-note-answer-text"
              >
                Answered
              </span>
              <p class="m-0 whitespace-pre-line">{{ note.isAnswer ? `ANSWERED · ${note.text}` : note.text }}</p>
            </div>
          </li>
        </ol>
      </div>
    </div>

    <div class="flex-none pt-3">
      <div class="grid grid-cols-2 gap-3">
        <button
          class="h-12 rounded-xl border border-answered-border bg-answered-bg px-4 text-sm font-bold uppercase tracking-wide text-answered-text disabled:opacity-60"
          type="button"
          :disabled="request.status === 'answered'"
          @click="emit('mark-answered', request)"
        >
          Answered
        </button>
        <button
          class="h-12 rounded-xl border border-border bg-card-muted px-4 text-sm font-bold uppercase tracking-wide text-text"
          type="button"
          @click="emit('pray', request)"
        >
          Prayed
        </button>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="editing"
        class="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4"
        @click.self="toggleEditing"
      >
        <div class="w-full max-w-lg rounded-2xl border border-border bg-card p-5 shadow-card">
          <header class="mb-3 flex items-center justify-between">
            <h4 class="m-0 text-base font-semibold">Edit request</h4>
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card-muted text-lg"
              type="button"
              @click="toggleEditing"
            >
              ×
            </button>
          </header>
          <div class="grid gap-3">
            <label class="grid gap-1 text-sm font-semibold">
              <span class="text-muted">Title</span>
              <input
                v-model="editForm.title"
                required
                class="w-full rounded-lg border border-border bg-card-muted px-3 py-2 text-text focus:outline-none"
              />
            </label>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="grid gap-1 text-sm font-semibold">
                <span class="text-muted">Priority</span>
                <select
                  v-model="editForm.priority"
                  class="w-full rounded-lg border border-border bg-card-muted px-3 py-2 text-text focus:outline-none"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label class="grid gap-1 text-sm font-semibold">
                <span class="text-muted">Duration</span>
                <select
                  v-model="editForm.durationPreset"
                  class="w-full rounded-lg border border-border bg-card-muted px-3 py-2 text-text focus:outline-none"
                >
                  <option value="10d">10 days</option>
                  <option value="1m">1 month</option>
                  <option value="3m">3 months</option>
                  <option value="6m">6 months</option>
                  <option value="1y">1 year</option>
                </select>
              </label>
            </div>
          </div>
          <div class="mt-4 flex justify-end gap-2">
            <button
              class="rounded-lg border border-border bg-card-muted px-3 py-2 text-sm font-semibold"
              type="button"
              @click="toggleEditing"
            >
              Cancel
            </button>
            <button
              class="rounded-lg bg-gradient-to-r from-accent to-accent-secondary px-3 py-2 text-sm font-semibold text-bg"
              type="button"
              @click="saveEdit"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { Teleport, computed, reactive, ref, watch } from 'vue';
import { daysLeft, formatDate, timeAgo } from '../utils/time.js';

const props = defineProps({
  request: { type: Object, required: true },
});

const emit = defineEmits(['pray', 'mark-answered', 'update-request', 'add-note', 'edit-note', 'delete-note']);

const priorityClasses = {
  urgent: 'border-priority-urgent-border bg-priority-urgent-bg text-priority-urgent-text',
  high: 'border-priority-high-border bg-priority-high-bg text-priority-high-text',
  medium: 'border-priority-medium-border bg-priority-medium-bg text-priority-medium-text',
  low: 'border-priority-low-border bg-priority-low-bg text-priority-low-text',
};

const editing = ref(false);
const noteFormOpen = ref(false);
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
  return stamp ? timeAgo(stamp) : 'never';
});
const expiryCopy = computed(() => daysLeft(props.request.expiresAt));
const createdCopy = computed(() => formatDate(props.request.createdAt));
const notesLabel = computed(() => `${props.request.notes?.length || 0} notes · added ${createdCopy.value}`);

const statusLabel = computed(() => (props.request.status === 'answered' ? 'Answered' : 'Active'));

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
  noteFormOpen.value = false;
}

function cancelNote() {
  noteDraft.value = '';
  noteFormOpen.value = false;
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
