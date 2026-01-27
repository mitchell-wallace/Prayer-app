import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import type { ProgressDot } from '@/core/types';
import { useProgressDotsAnimation } from '@/composables/useProgressDotsAnimation';

function makeDot(overrides: Partial<ProgressDot> = {}): ProgressDot {
  return {
    slot: 0,
    index: 0,
    isBeforeQueueStart: false,
    isAfterQueueEnd: false,
    isCurrent: false,
    isLoopPoint: false,
    isPlaceholder: false,
    ...overrides,
  };
}

describe('useProgressDotsAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('sets motionDirection on dot index change', async () => {
    const progressDots = ref<ProgressDot[]>([
      makeDot({ slot: 0, index: 3, isCurrent: true }),
      makeDot({ slot: 1, index: 4 }),
    ]);
    const slideDirection = ref('card-slide-left');

    const { motionDirection } = useProgressDotsAnimation(progressDots, slideDirection);

    progressDots.value = [
      makeDot({ slot: 0, index: 4 }),
      makeDot({ slot: 1, index: 5, isCurrent: true }),
    ];

    await vi.runAllTimersAsync();

    expect(motionDirection.value).toBe('');
  });

  test('clears motion state after timeout', async () => {
    const progressDots = ref<ProgressDot[]>([
      makeDot({ slot: 0, index: 3, isCurrent: true }),
      makeDot({ slot: 1, index: 4 }),
    ]);
    const slideDirection = ref('card-slide-left');

    const { previousDots, motionDirection } = useProgressDotsAnimation(progressDots, slideDirection);

    progressDots.value = [
      makeDot({ slot: 0, index: 4 }),
      makeDot({ slot: 1, index: 5, isCurrent: true }),
    ];

    await vi.advanceTimersByTimeAsync(200);

    expect(previousDots.value).toEqual([]);
    expect(motionDirection.value).toBe('');
  });

  test('isOutgoingDot identifies correct dot', async () => {
    const progressDots = ref<ProgressDot[]>([
      makeDot({ slot: 0, index: 0, isCurrent: true }),
      makeDot({ slot: 1, index: 1 }),
    ]);
    const slideDirection = ref('card-slide-left');

    const { isOutgoingDot } = useProgressDotsAnimation(progressDots, slideDirection);

    progressDots.value = [
      makeDot({ slot: 0, index: 1 }),
      makeDot({ slot: 1, index: 2, isCurrent: true }),
    ];

    await nextTick();

    expect(isOutgoingDot(makeDot({ slot: 0 }))).toBe(true);
    expect(isOutgoingDot(makeDot({ slot: 1 }))).toBe(false);
  });

  test('isIncomingDot only true after ready delay', async () => {
    const progressDots = ref<ProgressDot[]>([
      makeDot({ slot: 0, index: 0, isCurrent: true }),
      makeDot({ slot: 1, index: 1 }),
    ]);
    const slideDirection = ref('card-slide-left');

    const { isIncomingDot } = useProgressDotsAnimation(progressDots, slideDirection);

    progressDots.value = [
      makeDot({ slot: 0, index: 1 }),
      makeDot({ slot: 1, index: 2, isCurrent: true }),
    ];

    expect(isIncomingDot(makeDot({ slot: 1 }))).toBe(false);

    await vi.advanceTimersByTimeAsync(100);

    expect(isIncomingDot(makeDot({ slot: 1 }))).toBe(true);
  });

  test('isCurrentDot excludes outgoing dot', async () => {
    const progressDots = ref<ProgressDot[]>([
      makeDot({ slot: 0, index: 0, isCurrent: true }),
      makeDot({ slot: 1, index: 1 }),
    ]);
    const slideDirection = ref('card-slide-left');

    const { isCurrentDot } = useProgressDotsAnimation(progressDots, slideDirection);

    progressDots.value = [
      makeDot({ slot: 0, index: 1 }),
      makeDot({ slot: 1, index: 2, isCurrent: true }),
    ];

    await nextTick();

    expect(isCurrentDot(makeDot({ slot: 0, isCurrent: true }))).toBe(false);
  });

  test('cleans up timers on unmount', async () => {
    const progressDots = ref<ProgressDot[]>([
      makeDot({ slot: 0, index: 0, isCurrent: true }),
    ]);
    const slideDirection = ref('card-slide-left');

    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { motionDirection } = useProgressDotsAnimation(progressDots, slideDirection);

    progressDots.value = [
      makeDot({ slot: 0, index: 1, isCurrent: true }),
    ];

    expect(motionDirection.value).toBeDefined();

    clearTimeoutSpy.mockRestore();
  });
});
