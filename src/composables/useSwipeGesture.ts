import { ref } from 'vue';

export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export interface SwipeGestureReturn {
  handleTouchStart: (event: TouchEvent) => void;
  handleTouchEnd: (event: TouchEvent) => void;
}

export function useSwipeGesture(handlers: SwipeHandlers, options?: { threshold?: number }): SwipeGestureReturn {
  const threshold = options?.threshold ?? 40;
  const touchStart = ref<{ x: number; y: number } | null>(null);

  function handleTouchStart(event: TouchEvent): void {
    const touch = event.changedTouches[0];
    touchStart.value = { x: touch.clientX, y: touch.clientY };
  }

  function handleTouchEnd(event: TouchEvent): void {
    if (!touchStart.value) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.value.x;
    const dy = touch.clientY - touchStart.value.y;
    touchStart.value = null;
    if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) {
      handlers.onSwipeLeft?.();
    } else {
      handlers.onSwipeRight?.();
    }
  }

  return { handleTouchStart, handleTouchEnd };
}
