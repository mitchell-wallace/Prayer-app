import { describe, expect, test, vi } from 'vitest';
import { useSwipeGesture, type SwipeHandlers } from '@/composables/useSwipeGesture';

function createTouchEvent(x: number, y: number): TouchEvent {
  return {
    changedTouches: [{ clientX: x, clientY: y }],
  } as unknown as TouchEvent;
}

function simulateSwipe(
  handlers: SwipeHandlers,
  start: { x: number; y: number },
  end: { x: number; y: number },
  options?: { threshold?: number }
) {
  const { handleTouchStart, handleTouchEnd } = useSwipeGesture(handlers, options);
  handleTouchStart(createTouchEvent(start.x, start.y));
  handleTouchEnd(createTouchEvent(end.x, end.y));
}

describe('useSwipeGesture', () => {
  test('calls onSwipeLeft when dx exceeds threshold', () => {
    const onSwipeLeft = vi.fn();
    simulateSwipe({ onSwipeLeft }, { x: 100, y: 100 }, { x: 50, y: 100 });
    expect(onSwipeLeft).toHaveBeenCalledOnce();
  });

  test('calls onSwipeRight when dx exceeds threshold', () => {
    const onSwipeRight = vi.fn();
    simulateSwipe({ onSwipeRight }, { x: 100, y: 100 }, { x: 150, y: 100 });
    expect(onSwipeRight).toHaveBeenCalledOnce();
  });

  test('ignores swipe below threshold', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    simulateSwipe({ onSwipeLeft, onSwipeRight }, { x: 100, y: 100 }, { x: 80, y: 100 });
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  test('ignores vertical swipes', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    simulateSwipe({ onSwipeLeft, onSwipeRight }, { x: 100, y: 100 }, { x: 50, y: 200 });
    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  test('respects custom threshold option', () => {
    const onSwipeLeft = vi.fn();
    simulateSwipe({ onSwipeLeft }, { x: 100, y: 100 }, { x: 80, y: 100 }, { threshold: 10 });
    expect(onSwipeLeft).toHaveBeenCalledOnce();
  });

  test('handles missing handlers gracefully', () => {
    expect(() => {
      simulateSwipe({}, { x: 100, y: 100 }, { x: 50, y: 100 });
    }).not.toThrow();
  });
});
