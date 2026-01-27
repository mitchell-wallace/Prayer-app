import { describe, expect, test } from 'vitest';
import { useModal } from '@/composables/useModal';

describe('useModal', () => {
  test('initializes with provided state', () => {
    const { isOpen } = useModal(true);
    expect(isOpen.value).toBe(true);

    const { isOpen: isOpen2 } = useModal(false);
    expect(isOpen2.value).toBe(false);
  });

  test('open() sets isOpen to true', () => {
    const { isOpen, open } = useModal(false);
    expect(isOpen.value).toBe(false);
    open();
    expect(isOpen.value).toBe(true);
  });

  test('close() sets isOpen to false', () => {
    const { isOpen, close } = useModal(true);
    expect(isOpen.value).toBe(true);
    close();
    expect(isOpen.value).toBe(false);
  });

  test('toggle() flips state', () => {
    const { isOpen, toggle } = useModal(false);
    expect(isOpen.value).toBe(false);
    toggle();
    expect(isOpen.value).toBe(true);
    toggle();
    expect(isOpen.value).toBe(false);
  });
});
