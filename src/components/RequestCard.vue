<template>
  <article
    :class="[
      'relative grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-[var(--shadow)]',
      request.status === 'answered' ? 'opacity-90 border-white/10' : '',
    ]"
  >
    <button
      class="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-muted)] text-sm text-[var(--text)]"
      type="button"
      @click="toggleEditing"
      aria-label="Edit request"
    >
      ✎
    </button>

    <header class="flex flex-col gap-2 pr-12">
      <p class="text-[11px] uppercase tracking-[0.14em] text-[var(--muted)]">{{ statusLabel }}</p>
      <h3 class="m-0 text-lg font-semibold leading-tight">{{ request.title }}</h3>
      <div class="flex flex-wrap gap-2 text-xs">
        <span
          :class="[
            'rounded-full border px-3 py-1 font-semibold capitalize',
            priorityClasses[request.priority] || 'border-[var(--border)] bg-[var(--card-muted)] text-[var(--text)]',
          ]"
        >
          {{ request.priority }}
        </span>
        <span class="rounded-full border border-[var(--border)] bg-[var(--card-muted)] px-3 py-1 font-semibold text-[var(--muted)]">
          {{ expiryCopy }}
        </span>
        <span class="rounded-full border border-[var(--border)] bg-[var(--card-muted)] px-3 py-1 font-semibold text-[var(--muted)]">
          Last {{ lastPrayed }}
        </span>
      </div>
    </header>

    <div class="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--card-muted)] p-3">
      <div class="flex items-center justify-between text-xs text-[var(--muted)]">
        <span>Notes</span>
        <span>{{ notesLabel }}</span>
      </div>
      <div class="grid gap-3 overflow-hidden">
        <p v-if="!sortedNotes.length" class="m-0 text-sm text-[var(--muted)]">no notes</p>
        <ol v-else class="grid max-h-48 gap-3 overflow-auto pr-1 text-sm" role="list">
          <li
            v-for="note in sortedNotes"
            :key="note.id"
            class="rounded-xl border border-[var(--border)] bg-[#0f0e16] p-3"
          >
            <div class="flex items-start justify-between gap-2 text-xs text-[var(--muted)]">
              <span>{{ formatTimestamp(note.createdAt) }}</span>
              <div class="flex gap-2">
                <button class="text-[var(--accent)]" type="button" @click="startNoteEdit(note)">
                  {{ editingNote?.id === note.id ? 'Cancel' : 'Edit' }}
                </button>
                <button class="text-rose-300" type="button" @click="emit('delete-note', { request, note })">
                  Delete
                </button>
              </div>
            </div>
            <div v-if="editingNote?.id === note.id" class="mt-2 grid gap-2">
              <textarea
                v-model="editingNote.text"
                rows="2"
                class="w-full rounded-lg border border-[var(--border)] bg-[#0f0e16] p-2 text-sm text-[var(--text)] focus:outline-none"
              ></textarea>
              <div class="flex justify-end gap-2">
                <button
                  class="rounded-lg border border-[var(--border)] bg-[var(--card-muted)] px-3 py-2 text-sm font-semibold"
                  type="button"
                  @click="editingNote = null"
                >
                  Dismiss
                </button>
                <button
                  class="rounded-lg bg-gradient-to-r from-[#9d7bff] to-[#7c9dff] px-3 py-2 text-sm font-semibold text-[#0d0d10]"
                  type="button"
                  @click="saveNoteEdit(note)"
                >
                  Save
                </button>
              </div>
            </div>
            <p v-else class="mt-2 text-sm leading-relaxed">{{ note.text }}</p>
          </li>
        </ol>
      </div>
      <div v-if="noteFormOpen" class="grid gap-2">
        <textarea
          v-model="noteDraft"
          rows="2"
          required
          placeholder="Capture the latest update"
          class="w-full rounded-lg border border-[var(--border)] bg-[#0f0e16] p-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none"
        ></textarea>
        <div class="flex justify-end gap-2">
          <button
            class="rounded-lg border border-[var(--border)] bg-[var(--card-muted)] px-3 py-2 text-sm font-semibold"
            type="button"
            @click="cancelNote"
          >
            Cancel
          </button>
          <button
            class="rounded-lg bg-gradient-to-r from-[#9d7bff] to-[#7c9dff] px-3 py-2 text-sm font-semibold text-[#0d0d10]"
            type="button"
            @click="submitNote"
          >
            Add Note
          </button>
        </div>
      </div>
      <button
        v-else
        class="justify-self-start text-sm font-semibold text-[var(--accent)]"
        type="button"
        @click="noteFormOpen = true"
      >
        + add note
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <button
        class="rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-sm font-bold uppercase tracking-wide text-emerald-100 disabled:opacity-60"
        type="button"
        :disabled="request.status === 'answered'"
        @click="emit('mark-answered', request)"
      >
        Answered
      </button>
      <button
        class="rounded-xl border border-[var(--border)] bg-[var(--card-muted)] px-4 py-3 text-sm font-bold uppercase tracking-wide text-[var(--text)]"
        type="button"
        @click="emit('pray', request)"
      >
        Prayed
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="editing"
        class="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4"
        @click.self="toggleEditing"
      >
        <div class="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
          <header class="mb-3 flex items-center justify-between">
            <h4 class="m-0 text-base font-semibold">Edit request</h4>
            <button
              class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card-muted)] text-lg"
              type="button"
              @click="toggleEditing"
            >
              ×
            </button>
          </header>
          <div class="grid gap-3">
            <label class="grid gap-1 text-sm font-semibold">
              <span class="text-[var(--muted)]">Title</span>
              <input
                v-model="editForm.title"
                required
                class="w-full rounded-lg border border-[var(--border)] bg-[var(--card-muted)] px-3 py-2 text-[var(--text)] focus:outline-none"
              />
            </label>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label class="grid gap-1 text-sm font-semibold">
                <span class="text-[var(--muted)]">Priority</span>
                <select
                  v-model="editForm.priority"
                  class="w-full rounded-lg border border-[var(--border)] bg-[var(--card-muted)] px-3 py-2 text-[var(--text)] focus:outline-none"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label class="grid gap-1 text-sm font-semibold">
                <span class="text-[var(--muted)]">Duration</span>
                <select
                  v-model="editForm.durationPreset"
                  class="w-full rounded-lg border border-[var(--border)] bg-[var(--card-muted)] px-3 py-2 text-[var(--text)] focus:outline-none"
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
              class="rounded-lg border border-[var(--border)] bg-[var(--card-muted)] px-3 py-2 text-sm font-semibold"
              type="button"
              @click="toggleEditing"
            >
              Cancel
            </button>
            <button
              class="rounded-lg bg-gradient-to-r from-[#9d7bff] to-[#7c9dff] px-3 py-2 text-sm font-semibold text-[#0d0d10]"
              type="button"
              @click="saveEdit"
            >
              Save changes
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </article>
</template>

<script setup>
import { Teleport, computed, reactive, ref, watch } from 'vue';
import { daysLeft, formatDate, timeAgo } from '../utils/time.js';

const props = defineProps({
  request: { type: Object, required: true },
});

const emit = defineEmits(['pray', 'mark-answered', 'update-request', 'add-note', 'edit-note', 'delete-note']);

const priorityClasses = {
  urgent: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
  high: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  medium: 'border-sky-400/40 bg-sky-500/10 text-sky-100',
  low: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100',
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
