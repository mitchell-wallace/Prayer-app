import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { nextTick } from 'vue';
import RequestCard from '@/components/cards/RequestCard.vue';
import { makeNote, makeRequest } from '../fixtures/requests';
import { clickOutside, flushPromises } from './helpers';

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
  let wrapper: VueWrapper | null = null;

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.restoreAllMocks();
  });

  describe('State/Logic Tests', () => {
    test('displays request title and priority', () => {
      const request = makeRequest({ id: 'test-1', title: 'My Prayer', priority: 'urgent' });
      wrapper = mountCard(request);

      expect(wrapper.find('[data-testid="request-title"]').text()).toBe('My Prayer');
      expect(wrapper.text()).toContain('urgent');
    });

    test('shows "never" when prayedAt is empty', () => {
      const request = makeRequest({ id: 'test-1', prayedAt: [] });
      wrapper = mountCard(request);

      expect(wrapper.text()).toContain('Last never');
    });

    test('emits pray event with request', async () => {
      const request = makeRequest({ id: 'test-1' });
      wrapper = mountCard(request);

      await wrapper.find('[data-testid="pray-button"]').trigger('click');

      expect(wrapper.emitted('pray')).toBeTruthy();
      expect(wrapper.emitted('pray')![0]).toEqual([request]);
    });

    test('emits mark-answered with request', async () => {
      const request = makeRequest({ id: 'test-1', status: 'active' });
      wrapper = mountCard(request);

      await wrapper.find('[data-testid="answered-button"]').trigger('click');

      expect(wrapper.emitted('mark-answered')).toBeTruthy();
      expect(wrapper.emitted('mark-answered')![0]).toEqual([request]);
    });

    test('answered button disabled when status is answered', () => {
      const request = makeRequest({ id: 'test-1', status: 'answered' });
      wrapper = mountCard(request);

      const answeredBtn = wrapper.find('[data-testid="answered-button"]');
      expect(answeredBtn.attributes('disabled')).toBeDefined();
    });
  });

  describe('Note Form State', () => {
    test('opens note form on add note click', async () => {
      wrapper = mountCard();

      expect(wrapper.find('[data-testid="note-form"]').exists()).toBe(false);

      await wrapper.find('[data-testid="note-open"]').trigger('click');

      expect(wrapper.find('[data-testid="note-form"]').exists()).toBe(true);
    });

    test('closes note form on cancel', async () => {
      wrapper = mountCard();

      await wrapper.find('[data-testid="note-open"]').trigger('click');
      expect(wrapper.find('[data-testid="note-form"]').exists()).toBe(true);

      const cancelBtn = wrapper.findAll('button').find((b) => b.text() === 'Cancel');
      await cancelBtn?.trigger('click');

      expect(wrapper.find('[data-testid="note-form"]').exists()).toBe(false);
    });

    test('clears draft on submit', async () => {
      wrapper = mountCard();

      await wrapper.find('[data-testid="note-open"]').trigger('click');
      const textarea = wrapper.find('[data-testid="note-input"]');
      await textarea.setValue('Test note content');

      await wrapper.find('[data-testid="note-submit"]').trigger('click');

      // Verify form closes AND textarea value is cleared
      expect(wrapper.find('[data-testid="note-form"]').exists()).toBe(false);

      // Re-open to verify draft was cleared
      await wrapper.find('[data-testid="note-open"]').trigger('click');
      const newTextarea = wrapper.find('[data-testid="note-input"]');
      expect((newTextarea.element as HTMLTextAreaElement).value).toBe('');
    });

    test('emits add-note with trimmed text', async () => {
      const request = makeRequest({ id: 'test-1' });
      wrapper = mountCard(request);

      await wrapper.find('[data-testid="note-open"]').trigger('click');
      const textarea = wrapper.find('[data-testid="note-input"]');
      await textarea.setValue('  Test note  ');

      await wrapper.find('[data-testid="note-submit"]').trigger('click');

      expect(wrapper.emitted('add-note')).toBeTruthy();
      expect(wrapper.emitted('add-note')![0]).toEqual([{ request, text: 'Test note' }]);
    });

    test('submit does nothing for empty/whitespace text', async () => {
      wrapper = mountCard();

      await wrapper.find('[data-testid="note-open"]').trigger('click');
      const textarea = wrapper.find('[data-testid="note-input"]');
      await textarea.setValue('   ');

      await wrapper.find('[data-testid="note-submit"]').trigger('click');

      expect(wrapper.emitted('add-note')).toBeFalsy();
    });

    test('focuses textarea when form opens', async () => {
      // Attach to DOM body for focus tracking to work in jsdom
      wrapper = mount(RequestCard, {
        props: { request: makeRequest({ id: 'test-1' }) },
        global: {
          stubs: {
            Teleport: true,
            IconDotsVertical: true,
            IconPlus: true,
            IconX: true,
          },
        },
        attachTo: document.body,
      });

      await wrapper.find('[data-testid="note-open"]').trigger('click');
      await nextTick();

      const textarea = wrapper.find('[data-testid="note-input"]');
      expect(textarea.exists()).toBe(true);
      expect(document.activeElement).toBe(textarea.element);
    });
  });

  describe('Menu Behavior', () => {
    test('toggles request menu on click', async () => {
      wrapper = mountCard();

      const menuBtn = wrapper.find('[data-request-menu] button');
      await menuBtn.trigger('click');

      expect(wrapper.find('[role="menu"]').exists()).toBe(true);

      await menuBtn.trigger('click');

      expect(wrapper.find('[data-request-menu] [role="menu"]').exists()).toBe(false);
    });

    test('opens edit modal from menu', async () => {
      wrapper = mountCard();

      await wrapper.find('[data-request-menu] button').trigger('click');
      const editBtn = wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Edit');
      await editBtn?.trigger('click');

      expect(wrapper.find('h4').text()).toBe('Edit request');
    });

    test('closes request menu on outside click', async () => {
      wrapper = mountCard();

      await wrapper.find('[data-request-menu] button').trigger('click');
      expect(wrapper.find('[data-request-menu] [role="menu"]').exists()).toBe(true);

      clickOutside();
      await flushPromises();

      expect(wrapper.find('[data-request-menu] [role="menu"]').exists()).toBe(false);
    });

    test('closes note menu on outside click', async () => {
      const note = makeNote({ id: 'note-1', text: 'Test note' });
      const request = makeRequest({ id: 'test-1', notes: [note] });
      wrapper = mountCard(request);

      await wrapper.find('[data-note-menu] button').trigger('click');
      expect(wrapper.find('[data-note-menu] [role="menu"]').exists()).toBe(true);

      clickOutside();
      await flushPromises();

      expect(wrapper.find('[data-note-menu] [role="menu"]').exists()).toBe(false);
    });

    test('toggles note menu for specific note', async () => {
      const note = makeNote({ id: 'note-1', text: 'Test note' });
      const request = makeRequest({ id: 'test-1', notes: [note] });
      wrapper = mountCard(request);

      const noteMenuBtn = wrapper.find('[data-note-menu] button');
      await noteMenuBtn.trigger('click');

      expect(wrapper.find('[data-note-menu] [role="menu"]').exists()).toBe(true);
    });
  });

  describe('Edit/Delete Flows', () => {
    test('opens edit modal with form pre-populated', async () => {
      const request = makeRequest({ id: 'test-1', title: 'Original Title', priority: 'high' });
      wrapper = mountCard(request);

      await wrapper.find('[data-request-menu] button').trigger('click');
      const editBtn = wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Edit');
      await editBtn?.trigger('click');

      const titleInput = wrapper.find('input') as ReturnType<typeof wrapper.find>;
      expect((titleInput.element as HTMLInputElement).value).toBe('Original Title');
    });

    test('emits update-request on save edit', async () => {
      const request = makeRequest({ id: 'test-1', title: 'Original' });
      wrapper = mountCard(request);

      await wrapper.find('[data-request-menu] button').trigger('click');
      const editBtn = wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Edit');
      await editBtn?.trigger('click');

      const titleInput = wrapper.find('input');
      await titleInput.setValue('Updated Title');

      await wrapper.find('[data-testid="edit-request-save"]').trigger('click');

      expect(wrapper.emitted('update-request')).toBeTruthy();
      const emitted = wrapper.emitted('update-request')![0][0] as { title: string };
      expect(emitted.title).toBe('Updated Title');
    });

    test('shows delete confirmation on delete click', async () => {
      wrapper = mountCard();

      await wrapper.find('[data-request-menu] button').trigger('click');
      const deleteBtn = wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Delete');
      await deleteBtn?.trigger('click');

      expect(wrapper.text()).toContain('Delete prayer request?');
    });

    test('emits delete-request on confirm', async () => {
      const request = makeRequest({ id: 'test-1' });
      wrapper = mountCard(request);

      await wrapper.find('[data-request-menu] button').trigger('click');
      const deleteBtn = wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Delete');
      await deleteBtn?.trigger('click');

      await wrapper.find('[data-testid="delete-request-confirm"]').trigger('click');

      expect(wrapper.emitted('delete-request')).toBeTruthy();
      expect(wrapper.emitted('delete-request')![0]).toEqual([request]);
    });

    test('emits delete-note with correct note', async () => {
      const note = makeNote({ id: 'note-1', text: 'Test note' });
      const request = makeRequest({ id: 'test-1', notes: [note] });
      wrapper = mountCard(request);

      await wrapper.find('[data-note-menu] button').trigger('click');
      const deleteBtn = wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Delete');
      await deleteBtn?.trigger('click');

      await wrapper.find('[data-testid="delete-note-confirm"]').trigger('click');

      expect(wrapper.emitted('delete-note')).toBeTruthy();
      expect(wrapper.emitted('delete-note')![0]).toEqual([{ request, note }]);
    });

    test('emits edit-note with updated text', async () => {
      const note = makeNote({ id: 'note-1', text: 'Original note' });
      const request = makeRequest({ id: 'test-1', notes: [note] });
      wrapper = mountCard(request);

      await wrapper.find('[data-note-menu] button').trigger('click');
      const editBtn = wrapper.findAll('[role="menuitem"]').find((b) => b.text() === 'Edit');
      await editBtn?.trigger('click');

      const textareas = wrapper.findAll('textarea');
      const textarea = textareas[textareas.length - 1];
      await textarea?.setValue('Updated note');

      await wrapper.find('[data-testid="note-edit-save"]').trigger('click');

      expect(wrapper.emitted('edit-note')).toBeTruthy();
      const emitted = wrapper.emitted('edit-note')![0][0] as { note: { text: string } };
      expect(emitted.note.text).toBe('Updated note');
    });
  });
});
