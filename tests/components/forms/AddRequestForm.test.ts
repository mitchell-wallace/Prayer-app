import { clickOutside, flushPromises } from '@tests/components/helpers';
import { mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { nextTick } from 'vue';
import AddRequestForm from '@/components/forms/AddRequestForm.vue';
import { settings } from '@/stores/settings';

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
  let wrapper: VueWrapper | null = null;

  beforeEach(() => {
    // Reset settings to defaults before each test
    settings.defaultPriority = 'medium';
    settings.defaultDuration = '1m';
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    test('renders collapsed form initially', () => {
      wrapper = mountForm();

      expect(wrapper.find('[data-testid="request-input"]').exists()).toBe(true);
      expect(wrapper.find('[data-testid="request-controls"]').exists()).toBe(false);
    });

    test('submit button disabled when title is empty', () => {
      wrapper = mountForm();

      const submitBtn = wrapper.find('[data-testid="request-submit"]');
      expect(submitBtn.attributes('disabled')).toBeDefined();
    });

    test('syncs defaults from settings when title empty', async () => {
      wrapper = mountForm();

      // Expand form to see controls
      await wrapper.find('[data-testid="request-input"]').trigger('focus');

      // Initial defaults
      expect(wrapper.find('[data-testid="priority-toggle"]').text()).toContain('Medium');
      expect(wrapper.find('[data-testid="duration-toggle"]').text()).toContain('1 month');

      // Change settings
      settings.defaultPriority = 'high';
      settings.defaultDuration = '3m';
      await nextTick();

      // Should sync because title is empty
      expect(wrapper.find('[data-testid="priority-toggle"]').text()).toContain('High');
      expect(wrapper.find('[data-testid="duration-toggle"]').text()).toContain('3 months');
    });

    test('does not sync defaults when form in use', async () => {
      wrapper = mountForm();

      // Start typing
      await wrapper.find('[data-testid="request-input"]').setValue('My prayer');
      await nextTick();

      // Change settings
      settings.defaultPriority = 'urgent';
      settings.defaultDuration = '1y';
      await nextTick();

      // Should NOT sync because form is in use
      expect(wrapper.find('[data-testid="priority-toggle"]').text()).toContain('Medium');
      expect(wrapper.find('[data-testid="duration-toggle"]').text()).toContain('1 month');
    });
  });

  describe('Form Expansion', () => {
    test('expands on input focus', async () => {
      wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').trigger('focus');

      expect(wrapper.find('[data-testid="request-controls"]').exists()).toBe(true);
    });

    test('shows controls when title has content', async () => {
      wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').setValue('Test prayer');

      expect(wrapper.find('[data-testid="request-controls"]').exists()).toBe(true);
    });

    test('collapses on blur when empty', async () => {
      wrapper = mountForm();

      // Expand by focusing
      await wrapper.find('[data-testid="request-input"]').trigger('focus');
      expect(wrapper.find('[data-testid="request-controls"]').exists()).toBe(true);

      // Blur and click outside
      await wrapper.find('[data-testid="request-input"]').trigger('blur');
      clickOutside();
      await flushPromises();

      expect(wrapper.find('[data-testid="request-controls"]').exists()).toBe(false);
    });

    test('collapses on outside click', async () => {
      wrapper = mountForm();

      // Expand by focusing
      await wrapper.find('[data-testid="request-input"]').trigger('focus');
      expect(wrapper.find('[data-testid="request-controls"]').exists()).toBe(true);

      // Click outside
      clickOutside();
      await flushPromises();

      expect(wrapper.find('[data-testid="request-controls"]').exists()).toBe(false);
    });
  });

  describe('Dropdown Behavior', () => {
    test('toggles priority dropdown', async () => {
      wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').trigger('focus');
      await wrapper.find('[data-testid="priority-toggle"]').trigger('click');

      expect(wrapper.find('[role="listbox"]').exists()).toBe(true);
    });

    test('toggles duration dropdown', async () => {
      wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').trigger('focus');
      await wrapper.find('[data-testid="duration-toggle"]').trigger('click');

      expect(wrapper.find('[role="listbox"]').exists()).toBe(true);
    });

    test('selects priority option', async () => {
      wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').trigger('focus');
      await wrapper.find('[data-testid="priority-toggle"]').trigger('click');

      const urgentOption = wrapper.findAll('[role="option"] button').find((b) => b.text() === 'Urgent');
      await urgentOption?.trigger('click');

      expect(wrapper.find('[data-testid="priority-toggle"]').text()).toContain('Urgent');
    });

    test('selects duration option', async () => {
      wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').trigger('focus');
      await wrapper.find('[data-testid="duration-toggle"]').trigger('click');

      const yearOption = wrapper.findAll('[role="option"] button').find((b) => b.text() === '1 year');
      await yearOption?.trigger('click');

      expect(wrapper.find('[data-testid="duration-toggle"]').text()).toContain('1 year');
    });

    test('closes priority dropdown when duration opens', async () => {
      wrapper = mountForm();

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
      wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').setValue('  My prayer request  ');
      await nextTick();
      await wrapper.find('[data-testid="add-request-form"]').trigger('submit');

      expect(wrapper.emitted('save')).toBeTruthy();
      const payload = wrapper.emitted('save')![0][0] as { title: string };
      expect(payload.title).toBe('My prayer request');
    });

    test('clears form after submission', async () => {
      wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').setValue('Test prayer');
      await nextTick();
      await wrapper.find('[data-testid="add-request-form"]').trigger('submit');
      await nextTick();

      const input = wrapper.find('[data-testid="request-input"]').element as HTMLTextAreaElement;
      expect(input.value).toBe('');
    });

    test('does not emit save for empty/whitespace title', async () => {
      wrapper = mountForm();

      await wrapper.find('[data-testid="request-input"]').setValue('   ');
      await wrapper.find('[data-testid="request-submit"]').trigger('click');

      expect(wrapper.emitted('save')).toBeFalsy();
    });

    test('emits save with selected priority and duration', async () => {
      wrapper = mountForm();

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

    test('keeps form expanded after submit for rapid entry', async () => {
      // Attach to DOM body for focus tracking to work in jsdom
      wrapper = mount(AddRequestForm, {
        global: {
          stubs: {
            IconChevronDown: true,
            IconPlus: true,
          },
        },
        attachTo: document.body,
      });

      await wrapper.find('[data-testid="request-input"]').trigger('focus');
      await wrapper.find('[data-testid="request-input"]').setValue('Test prayer');
      await nextTick();
      await wrapper.find('[data-testid="add-request-form"]').trigger('submit');
      await nextTick();

      // Form should stay expanded after submit
      expect(wrapper.find('[data-testid="request-controls"]').exists()).toBe(true);
      // And input should be focused for rapid entry
      const input = wrapper.find('[data-testid="request-input"]');
      expect(document.activeElement).toBe(input.element);
    });
  });
});
