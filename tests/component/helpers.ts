import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

/**
 * Mount component with common test config.
 * Stubs Teleport to prevent portal issues in jsdom.
 */
export function mountComponent<T extends abstract new (...args: never) => unknown>(
  component: T,
  options: Parameters<typeof mount<T>>[1] = {}
) {
  return mount(component, {
    global: {
      stubs: {
        Teleport: true,
      },
      ...options.global,
    },
    ...options,
  });
}

/**
 * Simulate document click outside a component.
 */
export function clickOutside(): void {
  document.body.click();
}

/**
 * Wait for Vue reactivity + DOM updates.
 */
export async function flushPromises(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => setTimeout(resolve, 0));
}
