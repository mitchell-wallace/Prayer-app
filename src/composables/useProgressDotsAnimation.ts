import { computed, getCurrentScope, onScopeDispose, type Ref, ref, watch } from 'vue';
import type { ProgressDot } from '@/core/types';

export type DotMotionDirection = 'forward' | 'backward' | '';

export interface UseProgressDotsAnimationReturn {
  motionDirection: Ref<DotMotionDirection>;
  previousDots: Ref<ProgressDot[]>;
  isOutgoingDot: (dot: ProgressDot) => boolean;
  isIncomingDot: (dot: ProgressDot) => boolean;
  isIncomingPending: (dot: ProgressDot) => boolean;
  isCurrentDot: (dot: ProgressDot) => boolean;
}

export function useProgressDotsAnimation(
  progressDots: Ref<ProgressDot[]>,
  slideDirection: Ref<string>
): UseProgressDotsAnimationReturn {
  const outgoingDot = ref<ProgressDot | null>(null);
  const incomingSlot = ref<number | null>(null);
  const incomingReady = ref<boolean>(false);
  const motionDirection = ref<DotMotionDirection>('');
  const previousDots = ref<ProgressDot[]>([]);
  let outgoingTimer: ReturnType<typeof setTimeout> | null = null;
  let incomingTimer: ReturnType<typeof setTimeout> | null = null;
  let incomingClearTimer: ReturnType<typeof setTimeout> | null = null;
  let shiftTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleTimeout = (handler: () => void, delay: number): ReturnType<typeof setTimeout> =>
    globalThis.setTimeout(handler, delay);
  const cancelTimeout = (handle: ReturnType<typeof setTimeout> | null): void => {
    if (handle !== null) {
      globalThis.clearTimeout(handle);
    }
  };

  const resolvedProgressDots = computed<ProgressDot[]>(() => {
    const current = progressDots.value as ProgressDot[] & { value?: ProgressDot[] };
    if (Array.isArray(current?.value)) {
      return current.value;
    }
    return current;
  });

  const directionLabel = computed<DotMotionDirection>(() =>
    slideDirection.value === 'card-slide-right' ? 'backward' : 'forward'
  );

  watch(
    resolvedProgressDots,
    (next, prev) => {
      const prevCurrent = prev?.find((dot) => dot.isCurrent);
      const nextCurrent = next.find((dot) => dot.isCurrent);
      if (!prevCurrent || !nextCurrent) return;
      if (prevCurrent.index === nextCurrent.index) return;

      outgoingDot.value = prevCurrent;
      incomingSlot.value = nextCurrent.slot;
      incomingReady.value = false;

      cancelTimeout(outgoingTimer);
      cancelTimeout(incomingTimer);
      cancelTimeout(incomingClearTimer);
      cancelTimeout(shiftTimer);

      outgoingTimer = scheduleTimeout(() => {
        outgoingDot.value = null;
      }, 60);

      incomingTimer = scheduleTimeout(() => {
        incomingReady.value = true;
      }, 100);

      incomingClearTimer = scheduleTimeout(() => {
        incomingReady.value = false;
        incomingSlot.value = null;
      }, 240);

      const shouldShift =
        prevCurrent.index !== null && nextCurrent.index !== null && Math.max(prevCurrent.index, nextCurrent.index) >= 3;

      if (shouldShift && prev) {
        previousDots.value = prev.map((dot) => ({ ...dot }));
        motionDirection.value = directionLabel.value;
        shiftTimer = scheduleTimeout(() => {
          previousDots.value = [];
          motionDirection.value = '';
        }, 200);
      } else {
        previousDots.value = [];
        motionDirection.value = '';
      }
    },
    { deep: true, flush: 'sync' }
  );

  const scope = getCurrentScope();
  if (scope) {
    onScopeDispose(() => {
      cancelTimeout(outgoingTimer);
      cancelTimeout(incomingTimer);
      cancelTimeout(incomingClearTimer);
      cancelTimeout(shiftTimer);
    });
  }

  function isOutgoingDot(dot: ProgressDot): boolean {
    return outgoingDot.value?.slot === dot.slot;
  }

  function isIncomingDot(dot: ProgressDot): boolean {
    return incomingReady.value && incomingSlot.value === dot.slot;
  }

  function isIncomingPending(dot: ProgressDot): boolean {
    return incomingSlot.value === dot.slot && !incomingReady.value;
  }

  function isCurrentDot(dot: ProgressDot): boolean {
    if (isOutgoingDot(dot)) return false;
    if (incomingSlot.value !== null) {
      return isIncomingDot(dot);
    }
    return dot.isCurrent;
  }

  return {
    motionDirection,
    previousDots,
    isOutgoingDot,
    isIncomingDot,
    isIncomingPending,
    isCurrentDot,
  };
}
