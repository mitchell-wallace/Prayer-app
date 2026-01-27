import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { nextTick } from 'vue';
import AddRequestForm from '@/components/forms/AddRequestForm.vue';

function mountForm() {
  return mount(AddRequestForm, {
    global: {
      stubs: {
        IconChevronDown: true,
        IconPlus: true,
      },
    },
  });
}

describe('AddRequestForm', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    test('renders collapsed form initially', () => {
      const wrapper = mountForm();

      expect(wrapper.find('[data-testid="request-input"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="request-controls"]').exists()).toBe(false);
    });

    test('submit button disabled when title is empty', () => {
      const wrapper = mountForm();

      const submitBtn = wrapper.find('[data-testid="request-submit"]');
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });
  });

  describe('Form Expansion', () => {
    test('expands on input focus', async () => {
      const wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').trigger('focus');

      expect(wrapper.find('[data-testid="request-controls"]').exists()).toBe(true);
    });

    test('shows controls when title has content', async () => {
      const wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').setValue('Test prayer');

      expect(wrapper.find('[data-testid="request-controls"]').exists()).toBe(true);
    });
  });

  describe('Dropdown Behavior', () => {
    test('toggles priority dropdown', async () => {
      const wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').trigger('focus');
      await wrapper.find('[data-testid="priority-toggle"]').trigger('click');

      expect(wrapper.find('[role="listbox"]').exists()).toBe(true);
    });

    test('toggles duration dropdown', async () => {
      const wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').trigger('focus');
      await wrapper.find('[data-testid="duration-toggle"]').trigger('click');

      expect(wrapper.find('[role="listbox"]').exists()).toBe(true);
    });

    test('selects priority option', async () => {
      const wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').trigger('focus');
      await wrapper.find('[data-testid="priority-toggle"]').trigger('click');

      const urgentOption = wrapper.findAll('[role="option"] button').find((b) => b.text() === 'Urgent');
      await urgentOption?.trigger('click');

      expect(wrapper.find('[data-testid="priority-toggle"]').text()).toContain('Urgent');
    });

    test('selects duration option', async () => {
      const wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').trigger('focus');
      await wrapper.find('[data-testid="duration-toggle"]').trigger('click');

      const yearOption = wrapper.findAll('[role="option"] button').find((b) => b.text() === '1 year');
      await yearOption?.trigger('click');

      expect(wrapper.find('[data-testid="duration-toggle"]').text()).toContain('1 year');
    });

    test('closes priority dropdown when duration opens', async () => {
      const wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').trigger('focus');
      await wrapper.find('[data-testid="priority-toggle"]').trigger('click');
      expect(wrapper.findAll('[role="listbox"]').length).toBe(1);

      await wrapper.find('[data-testid="duration-toggle"]').trigger('click');

      const listboxes = wrapper.findAll('[role="listbox"]');
      expect(listboxes.length).toBe(1);
    });
  });

  describe('Form Submission', () => {
    test('emits save with trimmed payload on submit', async () => {
      const wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').setValue('  My prayer request  ');
      await nextTick();
      await wrapper.find('[data-testid="add-request-form"]').trigger('submit');

      expect(wrapper.emitted('save')).toBeTruthy();
      const payload = wrapper.emitted('save')![0][0] as { title: string };
      expect(payload.title).toBe('My prayer request');
    });

    test('clears form after submission', async () => {
      const wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').setValue('Test prayer');
      await nextTick();
      await wrapper.find('[data-testid="add-request-form"]').trigger('submit');
      await nextTick();

      const input = wrapper.find('[data-testid="request-input"]').element as HTMLTextAreaElement;
      expect(input.value).toBe('');
    });

    test('does not emit save for empty/whitespace title', async () => {
      const wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').setValue('   ');
      await wrapper.find('[data-testid="request-submit"]').trigger('click');

      expect(wrapper.emitted('save')).toBeFalsy();
    });

    test('emits save with selected priority and duration', async () => {
      const wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').trigger('focus');
      await wrapper.find('[data-testid="request-input"]').setValue('Test prayer');
      await nextTick();

      await wrapper.find('[data-testid="priority-toggle"]').trigger('click');
      const highOption = wrapper.findAll('[role="option"] button').find((b) => b.text() === 'High');
      await highOption?.trigger('click');

      await wrapper.find('[data-testid="duration-toggle"]').trigger('click');
      const monthOption = wrapper.findAll('[role="option"] button').find((b) => b.text() === '3 months');
      await monthOption?.trigger('click');

      await wrapper.find('[data-testid="add-request-form"]').trigger('submit');

      expect(wrapper.emitted('save')).toBeTruthy();
      const payload = wrapper.emitted('save')![0][0] as { title: string; priority: string; durationPreset: string };
      expect(payload.title).toBe('Test prayer');
      expect(payload.priority).toBe('high');
      expect(payload.durationPreset).toBe('3m');
    });
  });
});
