import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { nextTick } from 'vue';
import RequestCard from '@/components/cards/RequestCard.vue';
import { makeNote, makeRequest } from '../fixtures/requests';

function mountCard(request = makeRequest({ id: 'test-1' })) {
  return mount(RequestCard, {
    props: { request },
    global: {
      stubs: {
        Teleport: true,
        IconDotsVertical: true,
        IconPlus: true,
        IconX: true,
      },
    },
  });
}

describe('RequestCard', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('State/Logic Tests', () => {
    test('displays request title and priority', () => {
      const request = makeRequest({ id: 'test-1', title: 'My Prayer', priority: 'urgent' });
      const wrapper = mountCard(request);

      expect(wrapper.find('[data-testid="request-title"]').text()).toBe('My Prayer');
      expect(wrapper.text()).toContain('urgent');
    });

    test('shows "never" when prayedAt is empty', () => {
      const request = makeRequest({ id: 'test-1', prayedAt: [] });
      const wrapper = mountCard(request);

      expect(wrapper.text()).toContain('Last never');
    });

    test('emits pray event with request', async () => {
      const request = makeRequest({ id: 'test-1' });
      const wrapper = mountCard(request);

      await wrapper.find('[data-testid="pray-button"]').trigger('click');

      expect(wrapper.emitted('pray')).toBeTruthy();
      expect(wrapper.emitted('pray')![0]).toEqual([request]);
    });

    test('emits mark-answered with request', async () => {
      const request = makeRequest({ id: 'test-1', status: 'active' });
      const wrapper = mountCard(request);

      const answeredBtn = wrapper.findAll('button').find((b) => b.text() === 'Answered');
      await answeredBtn?.trigger('click');

      expect(wrapper.emitted('mark-answered')).toBeTruthy();
      expect(wrapper.emitted('mark-answered')![0]).toEqual([request]);
    });

    test('answered button disabled when status is answered', () => {
      const request = makeRequest({ id: 'test-1', status: 'answered' });
      const wrapper = mountCard(request);

      const answeredBtn = wrapper.findAll('button').find((b) => b.text() === 'Answered');
      expect(answeredBtn?.attributes('disabled')).toBeDefined();
    });
  });

  describe('Note Form State', () => {
    test('opens note form on add note click', async () => {
      const wrapper = mountCard();

      expect(wrapper.find('[data-testid="note-form"]').exists()).toBe(false);

      await wrapper.find('[data-testid="note-open"]').trigger('click');

      expect(wrapper.find('[data-testid="note-form"]').exists()).toBe(true);
    });

    test('closes note form on cancel', async () => {
      const wrapper = mountCard();

      await wrapper.find('[data-testid="note-open"]').trigger('click');
      expect(wrapper.find('[data-testid="note-form"]').exists()).toBe(true);

      const cancelBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancel');
      await cancelBtn?.trigger('click');

      expect(wrapper.find('[data-testid="note-form"]').exists()).toBe(false);
    });

    test('clears draft on submit', async () => {
      const wrapper = mountCard();

      await wrapper.find('[data-testid="note-open"]').trigger('click');
      const textarea = wrapper.find('[data-testid="note-input"]');
      await textarea.setValue('Test note content');

      await wrapper.find('[data-testid="note-submit"]').trigger('click');

      expect(wrapper.find('[data-testid="note-form"]').exists()).toBe(false);
    });

    test('emits add-note with trimmed text', async () => {
      const request = makeRequest({ id: 'test-1' });
      const wrapper = mountCard(request);

      await wrapper.find('[data-testid="note-open"]').trigger('click');
      const textarea = wrapper.find('[data-testid="note-input"]');
      await textarea.setValue('  Test note  ');

      await wrapper.find('[data-testid="note-submit"]').trigger('click');

      expect(wrapper.emitted('add-note')).toBeTruthy();
      expect(wrapper.emitted('add-note')![0]).toEqual([{ request, text: 'Test note' }]);
    });

    test('submit does nothing for empty/whitespace text', async () => {
      const wrapper = mountCard();

      await wrapper.find('[data-testid="note-open"]').trigger('click');
      const textarea = wrapper.find('[data-testid="note-input"]');
      await textarea.setValue('   ');

      await wrapper.find('[data-testid="note-submit"]').trigger('click');

      expect(wrapper.emitted('add-note')).toBeFalsy();
    });

    test('textarea exists and is focusable when form opens', async () => {
      const wrapper = mountCard();

      await wrapper.find('[data-testid="note-open"]').trigger('click');
      await nextTick();

      const textarea = wrapper.find('[data-testid="note-input"]');
      expect(textarea.exists()).toBe(true);
      expect(textarea.attributes('placeholder')).toBe('Capture the latest update');
    });
  });

  describe('Menu Behavior', () => {
    test('toggles request menu on click', async () => {
      const wrapper = mountCard();

      const menuBtn = wrapper.find('[data-request-menu] button');
      await menuBtn.trigger('click');

      expect(wrapper.find('[role="menu"]').exists()).toBe(true);

      await menuBtn.trigger('click');

      expect(wrapper.find('[data-request-menu] [role="menu"]').exists()).toBe(false);
    });

    test('opens edit modal from menu', async () => {
      const wrapper = mountCard();

      await wrapper.find('[data-request-menu] button').trigger('click');
      const editBtn = wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Edit');
      await editBtn?.trigger('click');

      expect(wrapper.find('h4').text()).toBe('Edit request');
    });

    test('toggles note menu for specific note', async () => {
      const note = makeNote({ id: 'note-1', text: 'Test note' });
      const request = makeRequest({ id: 'test-1', notes: [note] });
      const wrapper = mountCard(request);

      const noteMenuBtn = wrapper.find('[data-note-menu] button');
      await noteMenuBtn.trigger('click');

      expect(wrapper.find('[data-note-menu] [role="menu"]').exists()).toBe(true);
    });
  });

  describe('Edit/Delete Flows', () => {
    test('opens edit modal with form pre-populated', async () => {
      const request = makeRequest({ id: 'test-1', title: 'Original Title', priority: 'high' });
      const wrapper = mountCard(request);

      await wrapper.find('[data-request-menu] button').trigger('click');
      const editBtn = wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Edit');
      await editBtn?.trigger('click');

      const titleInput = wrapper.find('input') as ReturnType<typeof wrapper.find>;
      expect((titleInput.element as HTMLInputElement).value).toBe('Original Title');
    });

    test('emits update-request on save edit', async () => {
      const request = makeRequest({ id: 'test-1', title: 'Original' });
      const wrapper = mountCard(request);

      await wrapper.find('[data-request-menu] button').trigger('click');
      const editBtn = wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Edit');
      await editBtn?.trigger('click');

      const titleInput = wrapper.find('input');
      await titleInput.setValue('Updated Title');

      const saveBtn = wrapper.findAll('button').find((b) => b.text() === 'Save changes');
      await saveBtn?.trigger('click');

      expect(wrapper.emitted('update-request')).toBeTruthy();
      const emitted = wrapper.emitted('update-request')![0][0] as { title: string };
      expect(emitted.title).toBe('Updated Title');
    });

    test('shows delete confirmation on delete click', async () => {
      const wrapper = mountCard();

      await wrapper.find('[data-request-menu] button').trigger('click');
      const deleteBtn = wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Delete');
      await deleteBtn?.trigger('click');

      expect(wrapper.text()).toContain('Delete prayer request?');
    });

    test('emits delete-request on confirm', async () => {
      const request = makeRequest({ id: 'test-1' });
      const wrapper = mountCard(request);

      await wrapper.find('[data-request-menu] button').trigger('click');
      const deleteBtn = wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Delete');
      await deleteBtn?.trigger('click');

      const deleteButtons = wrapper.findAll('button').filter((b) => b.text() === 'Delete');
      const confirmBtn = deleteButtons[deleteButtons.length - 1];
      await confirmBtn?.trigger('click');

      expect(wrapper.emitted('delete-request')).toBeTruthy();
      expect(wrapper.emitted('delete-request')![0]).toEqual([request]);
    });

    test('emits delete-note with correct note', async () => {
      const note = makeNote({ id: 'note-1', text: 'Test note' });
      const request = makeRequest({ id: 'test-1', notes: [note] });
      const wrapper = mountCard(request);

      await wrapper.find('[data-note-menu] button').trigger('click');
      const deleteBtn = wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Delete');
      await deleteBtn?.trigger('click');

      const deleteButtons2 = wrapper.findAll('button').filter((b) => b.text() === 'Delete');
      const confirmBtn2 = deleteButtons2[deleteButtons2.length - 1];
      await confirmBtn2?.trigger('click');

      expect(wrapper.emitted('delete-note')).toBeTruthy();
      expect(wrapper.emitted('delete-note')![0]).toEqual([{ request, note }]);
    });

    test('emits edit-note with updated text', async () => {
      const note = makeNote({ id: 'note-1', text: 'Original note' });
      const request = makeRequest({ id: 'test-1', notes: [note] });
      const wrapper = mountCard(request);

      await wrapper.find('[data-note-menu] button').trigger('click');
      const editBtn = wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Edit');
      await editBtn?.trigger('click');

      const textareas = wrapper.findAll('textarea');
      const textarea = textareas[textareas.length - 1];
      await textarea?.setValue('Updated note');

      const saveBtn = wrapper.findAll('button').find((b) => b.text() === 'Save');
      await saveBtn?.trigger('click');

      expect(wrapper.emitted('edit-note')).toBeTruthy();
      const emitted = wrapper.emitted('edit-note')![0][0] as { note: { text: string } };
      expect(emitted.note.text).toBe('Updated note');
    });
  });
});
