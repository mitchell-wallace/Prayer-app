<template>
  <section :class="['flex h-full min-h-0 flex-col', request.status === 'answered' ? 'opacity-90' : '']">
    <!-- Scroll container with horizontal padding for shadow overflow -->
    <div class="relative flex-1 min-h-0 overflow-auto pb-8 -mx-3 px-3">
      <div class="absolute right-3 top-0" data-request-menu>
        <button
          class="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:text-text"
          type="button"
          @click="toggleRequestMenu"
          aria-label="Request options"
          aria-haspopup="menu"
          :aria-expanded="requestMenuOpen"
        >
          <IconDotsVertical :size="18" stroke-width="2" />
        </button>
        <div
          v-if="requestMenuOpen"
          class="absolute right-0 top-full mt-1 w-32 rounded-xl bg-card p-1 shadow-modal z-10"
          role="menu"
        >
          <button
            class="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-text transition-colors duration-150 hover:bg-card-muted"
            type="button"
            role="menuitem"
            @click="openEditFromMenu"
          >
            Edit
          </button>
          <button
            class="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-danger transition-colors duration-150 hover:bg-card-muted"
            type="button"
            role="menuitem"
            @click="promptDeleteRequest"
          >
            Delete
          </button>
        </div>
      </div>

      <header class="flex flex-col gap-2 pr-12">
        <h3 class="m-0 text-lg font-semibold leading-tight">{{ request.title }}</h3>
        <div class="flex flex-wrap gap-2 text-xs">
          <span
            :class="[
              'rounded-xl border px-3 py-1 font-semibold capitalize',
              priorityClasses[request.priority] || 'border-border bg-card-muted text-text',
            ]"
          >
            {{ request.priority }}
          </span>
          <span class="rounded-xl border border-border-muted bg-card-muted px-3 py-1 font-semibold text-muted">
            {{ expiryCopy }}
          </span>
          <span class="rounded-xl border border-border-muted bg-card-muted px-3 py-1 font-semibold text-muted">
            Last {{ lastPrayed }}
          </span>
        </div>
      </header>

      <div class="mt-4 grid gap-3 rounded-2xl bg-card-muted p-4 shadow-sm">
        <p class="text-xs font-medium uppercase tracking-wide text-muted">Notes</p>

        <div v-if="noteFormOpen" class="grid gap-2">
          <textarea
            ref="noteInputRef"
            v-model="noteDraft"
            rows="2"
            required
            placeholder="Capture the latest update"
            class="w-full rounded-xl bg-note-bg p-3 text-sm text-text placeholder:text-muted shadow-sm transition-shadow duration-150 focus:outline-none focus:shadow-primary-glow"
            @keydown.enter.exact.prevent="submitNote"
          ></textarea>
          <div class="flex justify-end gap-2">
            <button
              class="rounded-xl bg-card px-4 py-2 text-sm font-semibold text-muted shadow-sm transition-all duration-150 hover:text-text hover:shadow-card"
              type="button"
              @click="cancelNote"
            >
              Cancel
            </button>
            <button
              class="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-hover hover:shadow-card"
              type="button"
              @click="submitNote"
            >
              Add note
            </button>
          </div>
        </div>
        <button
          v-else
          class="inline-flex items-center gap-1 justify-self-start text-sm font-semibold text-primary transition-opacity duration-150 hover:opacity-80"
          type="button"
          @click="openNoteForm"
        >
          <IconPlus :size="16" stroke-width="2.5" />
          Add note
        </button>

        <p v-if="!sortedNotes.length" class="m-0 text-sm text-muted">No notes</p>
        <ol v-else class="grid gap-3 text-sm" role="list">
          <li
            v-for="note in sortedNotes"
            :key="note.id"
            class="rounded-xl bg-note-bg p-3 shadow-sm"
          >
            <div class="flex items-start justify-between gap-2 text-xs text-muted">
              <span>{{ formatTimestamp(note.createdAt) }}</span>
              <div class="relative" data-note-menu>
                <button
                  class="inline-flex h-6 w-6 items-center justify-center rounded-lg text-muted transition-all duration-150 hover:text-text hover:bg-card-muted"
                  type="button"
                  @click="toggleNoteMenu(note.id)"
                  aria-label="Note options"
                  aria-haspopup="menu"
                  :aria-expanded="noteMenuOpen === note.id"
                >
                  <IconDotsVertical :size="16" stroke-width="2" />
                </button>
                <div
                  v-if="noteMenuOpen === note.id"
                  class="absolute right-0 top-full mt-1 w-28 rounded-xl bg-card p-1 shadow-modal z-10"
                  role="menu"
                >
                  <button
                    class="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-text transition-colors duration-150 hover:bg-card-muted"
                    type="button"
                    role="menuitem"
                    @click="startNoteEdit(note)"
                  >
                    Edit
                  </button>
                  <button
                    class="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-note-delete transition-colors duration-150 hover:bg-card-muted"
                    type="button"
                    role="menuitem"
                    @click="promptDeleteNote(note)"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
            <div v-if="editingNote?.id === note.id" class="mt-2 grid gap-2">
              <textarea
                v-model="editingNote.text"
                rows="2"
                class="w-full rounded-xl bg-note-bg p-3 text-sm text-text shadow-sm transition-shadow duration-150 focus:outline-none focus:shadow-primary-glow"
              ></textarea>
              <div v-if="editingNote.isAnswer" class="flex items-center gap-2 text-[11px] uppercase tracking-wide text-note-answer-text">
                <span class="inline-flex h-2 w-2 rounded-full bg-note-answer-dot"></span>
                Answered note
              </div>
              <div class="flex justify-between gap-2">
                <button
                  class="rounded-xl bg-danger-muted px-4 py-2 text-sm font-semibold text-danger transition-opacity duration-150 hover:opacity-80"
                  type="button"
                  @click="promptDeleteNote(note)"
                >
                  Delete
                </button>
                <div class="flex gap-2">
                  <button
                    class="rounded-xl bg-card px-4 py-2 text-sm font-semibold text-muted shadow-sm transition-all duration-150 hover:text-text hover:shadow-card"
                    type="button"
                    @click="editingNote = null"
                  >
                    Cancel
                  </button>
                  <button
                    class="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-hover hover:shadow-card"
                    type="button"
                    @click="saveNoteEdit(note)"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
            <div v-else class="mt-2 flex items-start gap-2 text-sm leading-relaxed">
              <span
                v-if="note.isAnswer"
                class="mt-[3px] inline-flex items-center rounded-lg border border-note-answer-border bg-note-answer-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-note-answer-text"
              >
                Answered
              </span>
              <p class="m-0 whitespace-pre-line">{{ note.isAnswer ? `Answered · ${note.text}` : note.text }}</p>
            </div>
          </li>
        </ol>
      </div>
    </div>

    <div class="flex-none pt-3">
      <div class="grid grid-cols-2 gap-3">
        <button
          class="h-12 rounded-xl bg-answered-bg px-4 text-sm font-bold uppercase tracking-wide text-answered-text shadow-sm transition-all duration-150 hover:bg-answered-hover disabled:opacity-50 disabled:hover:bg-answered-bg"
          type="button"
          :disabled="request.status === 'answered'"
          @click="emit('mark-answered', request)"
        >
          Answered
        </button>
        <button
          class="h-12 rounded-xl bg-primary px-4 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition-all duration-150 hover:bg-primary-hover hover:shadow-card"
          type="button"
          @click="emit('pray', request)"
        >
          Prayed
        </button>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="editing"
          class="fixed inset-0 z-40 grid place-items-center bg-overlay p-4"
          @click.self="closeEditing"
        >
          <div class="w-full max-w-lg rounded-2xl bg-card p-5 shadow-modal">
            <header class="mb-4 flex items-center justify-between">
              <h4 class="m-0 text-base font-semibold">Edit request</h4>
              <button
                class="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-card-muted text-muted shadow-sm transition-all duration-150 hover:text-text hover:shadow-card"
                type="button"
                @click="closeEditing"
              >
                <IconX :size="18" stroke-width="2" />
              </button>
            </header>
            <div class="grid gap-4">
              <label class="grid gap-1.5 text-sm font-semibold">
                <span class="text-muted">Title</span>
                <input
                  v-model="editForm.title"
                  required
                  class="w-full rounded-xl bg-card-muted px-4 py-3 text-text shadow-sm transition-shadow duration-150 focus:outline-none focus:shadow-primary-glow"
                />
              </label>
              <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label class="grid gap-1.5 text-sm font-semibold">
                  <span class="text-muted">Priority</span>
                  <select
                    v-model="editForm.priority"
                    class="w-full rounded-xl bg-card-muted px-4 py-3 text-text shadow-sm transition-shadow duration-150 focus:outline-none focus:shadow-primary-glow"
                  >
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>
                <label class="grid gap-1.5 text-sm font-semibold">
                  <span class="text-muted">Duration</span>
                  <select
                    v-model="editForm.durationPreset"
                    class="w-full rounded-xl bg-card-muted px-4 py-3 text-text shadow-sm transition-shadow duration-150 focus:outline-none focus:shadow-primary-glow"
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
            <div class="mt-5 flex justify-end gap-2">
              <button
                class="rounded-xl bg-card-muted px-4 py-2.5 text-sm font-semibold text-muted shadow-sm transition-all duration-150 hover:text-text hover:shadow-card"
                type="button"
                @click="closeEditing"
              >
                Cancel
              </button>
              <button
                class="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:bg-primary-hover hover:shadow-card"
                type="button"
                @click="saveEdit"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete note confirmation modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="deleteConfirmNote"
          class="fixed inset-0 z-50 grid place-items-center bg-overlay p-4"
          @click.self="cancelDeleteNote"
        >
          <div class="w-full max-w-sm rounded-2xl bg-card p-5 shadow-modal">
            <header class="mb-3">
              <h4 class="m-0 text-base font-semibold">Delete note?</h4>
            </header>
            <p class="text-sm text-muted">
              Are you sure you want to delete this note? This action cannot be undone.
            </p>
            <div class="mt-5 grid grid-cols-2 gap-3">
              <button
                class="w-full rounded-xl bg-card-muted px-4 py-2.5 text-sm font-semibold text-muted shadow-sm transition-all duration-150 hover:text-text hover:shadow-card"
                type="button"
                @click="cancelDeleteNote"
              >
                Cancel
              </button>
              <button
                class="w-full rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:opacity-90 hover:shadow-card"
                type="button"
                @click="confirmDeleteNote"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete request confirmation modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="deleteConfirmRequest"
          class="fixed inset-0 z-50 grid place-items-center bg-overlay p-4"
          @click.self="cancelDeleteRequest"
        >
          <div class="w-full max-w-sm rounded-2xl bg-card p-5 shadow-modal">
            <header class="mb-3">
              <h4 class="m-0 text-base font-semibold">Delete prayer request?</h4>
            </header>
            <p class="text-sm text-muted">
              Are you sure you want to delete this prayer request and all its notes? This action cannot be undone.
            </p>
            <div class="mt-5 grid grid-cols-2 gap-3">
              <button
                class="w-full rounded-xl bg-card-muted px-4 py-2.5 text-sm font-semibold text-muted shadow-sm transition-all duration-150 hover:text-text hover:shadow-card"
                type="button"
                @click="cancelDeleteRequest"
              >
                Cancel
              </button>
              <button
                class="w-full rounded-xl bg-danger px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:opacity-90 hover:shadow-card"
                type="button"
                @click="confirmDeleteRequest"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup>
import { Teleport, Transition, computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { IconDotsVertical, IconPlus, IconX } from '@tabler/icons-vue';
import { daysLeft, timeAgo } from '../utils/time.js';

const props = defineProps({
  request: { type: Object, required: true },
});

const emit = defineEmits(['pray', 'mark-answered', 'update-request', 'delete-request', 'add-note', 'edit-note', 'delete-note']);

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
const noteInputRef = ref(null);
const noteMenuOpen = ref(null); // note id of open menu
const deleteConfirmNote = ref(null); // note to confirm deletion
const requestMenuOpen = ref(false);
const deleteConfirmRequest = ref(false);

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


const sortedNotes = computed(() => [...(props.request.notes || [])].sort((a, b) => b.createdAt - a.createdAt));

function toggleRequestMenu() {
  requestMenuOpen.value = !requestMenuOpen.value;
}

function openEditFromMenu() {
  requestMenuOpen.value = false;
  editing.value = true;
  Object.assign(editForm, props.request);
}

function closeEditing() {
  editing.value = false;
}

function promptDeleteRequest() {
  requestMenuOpen.value = false;
  deleteConfirmRequest.value = true;
}

function confirmDeleteRequest() {
  emit('delete-request', props.request);
  deleteConfirmRequest.value = false;
}

function cancelDeleteRequest() {
  deleteConfirmRequest.value = false;
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

async function openNoteForm() {
  noteFormOpen.value = true;
  await nextTick();
  noteInputRef.value?.focus();
}

function startNoteEdit(note) {
  if (editingNote.value?.id === note.id) {
    editingNote.value = null;
    return;
  }
  editingNote.value = { ...note };
  noteMenuOpen.value = null;
}

function saveNoteEdit(note) {
  if (!editingNote.value) return;
  emit('edit-note', { request: props.request, note: { ...editingNote.value } });
  editingNote.value = null;
}

function toggleNoteMenu(noteId) {
  noteMenuOpen.value = noteMenuOpen.value === noteId ? null : noteId;
}

function promptDeleteNote(note) {
  deleteConfirmNote.value = note;
  noteMenuOpen.value = null;
}

function confirmDeleteNote() {
  if (!deleteConfirmNote.value) return;
  emit('delete-note', { request: props.request, note: deleteConfirmNote.value });
  deleteConfirmNote.value = null;
  editingNote.value = null;
}

function cancelDeleteNote() {
  deleteConfirmNote.value = null;
}

function formatTimestamp(ts) {
  const d = new Date(ts);
  return `${d.toLocaleDateString()} · ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
}

// Close menus on outside click
function handleClickOutside(event) {
  // Close request menu if clicking outside
  if (requestMenuOpen.value) {
    const menuContainer = event.target.closest('[data-request-menu]');
    if (!menuContainer) {
      requestMenuOpen.value = false;
    }
  }
  // Close note menu if clicking outside
  if (noteMenuOpen.value) {
    const menuContainer = event.target.closest('[data-note-menu]');
    if (!menuContainer) {
      noteMenuOpen.value = null;
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
