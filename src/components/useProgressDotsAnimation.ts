import { computed, onBeforeUnmount, ref, watch, type Ref } from 'vue';
import type { ProgressDot } from '../types';

export type DotMotionDirection = 'forward' | 'backward' | '';

export function useProgressDotsAnimation(progressDots: Ref<ProgressDot[]>, slideDirection: Ref<string>) {
  const outgoingDot = ref<ProgressDot | null>(null);
  const incomingSlot = ref<number | null>(null);
  const incomingReady = ref<boolean>(false);
  const motionDirection = ref<DotMotionDirection>('');
  const previousDots = ref<ProgressDot[]>([]);
  let outgoingTimer: ReturnType<typeof setTimeout> | null = null;
  let incomingTimer: ReturnType<typeof setTimeout> | null = null;
  let incomingClearTimer: ReturnType<typeof setTimeout> | null = null;
  let shiftTimer: ReturnType<typeof setTimeout> | null = null;

  const directionLabel = computed<DotMotionDirection>(() =>
    slideDirection.value === 'card-slide-right' ? 'backward' : 'forward'
  );

  watch(
    progressDots,
    (next, prev) => {
      const prevCurrent = prev?.find((dot) => dot.isCurrent);
      const nextCurrent = next.find((dot) => dot.isCurrent);
      if (!prevCurrent || !nextCurrent) return;
      if (prevCurrent.index === nextCurrent.index) return;

      outgoingDot.value = prevCurrent;
      incomingSlot.value = nextCurrent.slot;
      incomingReady.value = false;

      if (outgoingTimer) clearTimeout(outgoingTimer);
      if (incomingTimer) clearTimeout(incomingTimer);
      if (incomingClearTimer) clearTimeout(incomingClearTimer);
      if (shiftTimer) clearTimeout(shiftTimer);

      outgoingTimer = setTimeout(() => {
        outgoingDot.value = null;
      }, 60);

      incomingTimer = setTimeout(() => {
        incomingReady.value = true;
      }, 100);

      incomingClearTimer = setTimeout(() => {
        incomingReady.value = false;
        incomingSlot.value = null;
      }, 240);

      const shouldShift =
        prevCurrent.index !== null && nextCurrent.index !== null && Math.max(prevCurrent.index, nextCurrent.index) >= 3;

      if (shouldShift && prev) {
        previousDots.value = prev.map((dot) => ({ ...dot }));
        motionDirection.value = directionLabel.value;
        shiftTimer = setTimeout(() => {
          previousDots.value = [];
          motionDirection.value = '';
        }, 200);
      } else {
        previousDots.value = [];
        motionDirection.value = '';
      }
    },
    { deep: true }
  );

  onBeforeUnmount(() => {
    if (outgoingTimer) clearTimeout(outgoingTimer);
    if (incomingTimer) clearTimeout(incomingTimer);
    if (incomingClearTimer) clearTimeout(incomingClearTimer);
    if (shiftTimer) clearTimeout(shiftTimer);
  });

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
