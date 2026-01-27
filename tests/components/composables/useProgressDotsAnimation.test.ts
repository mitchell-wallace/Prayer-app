import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { defineComponent, nextTick, ref } from 'vue';
import { useProgressDotsAnimation } from '@/composables/useProgressDotsAnimation';
import type { ProgressDot } from '@/core/types';

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

  test('sets motion state immediately when shift is needed', async () => {
    const progressDots = ref<ProgressDot[]>([
      makeDot({ slot: 0, index: 3, isCurrent: true }),
      makeDot({ slot: 1, index: 4 }),
    ]);
    const slideDirection = ref('card-slide-left');

    const { motionDirection, previousDots } = useProgressDotsAnimation(progressDots, slideDirection);

    progressDots.value = [makeDot({ slot: 0, index: 4 }), makeDot({ slot: 1, index: 5, isCurrent: true })];

    await nextTick();

    expect(motionDirection.value).toBe('forward');
    expect(previousDots.value.length).toBeGreaterThan(0);
  });

  test('clears motion state after timeout', async () => {
    const progressDots = ref<ProgressDot[]>([
      makeDot({ slot: 0, index: 3, isCurrent: true }),
      makeDot({ slot: 1, index: 4 }),
    ]);
    const slideDirection = ref('card-slide-left');

    const { previousDots, motionDirection } = useProgressDotsAnimation(progressDots, slideDirection);

    progressDots.value = [makeDot({ slot: 0, index: 4 }), makeDot({ slot: 1, index: 5, isCurrent: true })];

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

    progressDots.value = [makeDot({ slot: 0, index: 1 }), makeDot({ slot: 1, index: 2, isCurrent: true })];

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

    progressDots.value = [makeDot({ slot: 0, index: 1 }), makeDot({ slot: 1, index: 2, isCurrent: true })];

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

    progressDots.value = [makeDot({ slot: 0, index: 1 }), makeDot({ slot: 1, index: 2, isCurrent: true })];

    await nextTick();

    expect(isCurrentDot(makeDot({ slot: 0, isCurrent: true }))).toBe(false);
  });

  test('cleans up timers on unmount', async () => {
    const TestComponent = defineComponent({
      setup(_, { expose }) {
        const progressDots = ref<ProgressDot[]>([
          makeDot({ slot: 0, index: 3, isCurrent: true }),
          makeDot({ slot: 1, index: 4 }),
        ]);
        const slideDirection = ref('card-slide-left');
        const api = useProgressDotsAnimation(progressDots, slideDirection);
        expose({ progressDots, slideDirection, ...api });
        return () => null;
      },
    });

    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const wrapper = mount(TestComponent);
    const vm = wrapper.vm as unknown as {
      progressDots: { value: ProgressDot[] };
    };

    const initialCallCount = setTimeoutSpy.mock.results.length;

    vm.progressDots.value = [makeDot({ slot: 0, index: 4 }), makeDot({ slot: 1, index: 5, isCurrent: true })];
    await nextTick();

    wrapper.unmount();

    const scheduledIds = setTimeoutSpy.mock.results
      .slice(initialCallCount)
      .map((result) => result.value)
      .filter(Boolean);
    expect(scheduledIds.length).toBeGreaterThan(0);
    for (const id of scheduledIds) {
      expect(clearTimeoutSpy).toHaveBeenCalledWith(id);
    }

    setTimeoutSpy.mockRestore();
    clearTimeoutSpy.mockRestore();
  });
});
