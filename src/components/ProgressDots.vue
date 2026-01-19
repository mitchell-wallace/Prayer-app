<template>
  <div ref="dotStripRef" class="dot-strip select-none cursor-pointer" @click="handleDotStripClick">
    <div
      v-if="previousDots.length"
      :class="['dot-layer dot-layer--outgoing', motionDirection ? `dot-layer--${motionDirection}` : '']"
    >
      <template v-for="dot in previousDots" :key="dot.slot">
        <span class="dot-slot inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center overflow-hidden">
          <span
            v-if="dot.isBeforeQueueStart"
            class="dot-animate h-1.5 w-1.5 rounded-full border border-neutral-200/40"
          ></span>
          <span
            v-else-if="dot.isPlaceholder"
            class="dot-animate h-2 w-2 rounded-full border border-neutral-200/40"
          ></span>
          <span
            v-else-if="isOutgoingDot(dot)"
            :class="[
              'dot-animate dot-current dot-outgoing h-2.5 w-2.5 rounded-full',
              dot.isLoopPoint ? 'bg-primary-200/60 dark:bg-primary-300/60' : 'bg-neutral-200/60',
            ]"
          ></span>
          <span
            v-else-if="dot.isLoopPoint && dot.index !== null"
            class="dot-animate inline-flex h-2.5 w-2.5 items-center justify-center text-primary-200/70 dark:text-primary-300/70"
          >
            <IconRefresh :size="9" stroke-width="2.5" />
          </span>
          <span v-else-if="dot.index !== null" class="dot-animate h-2 w-2 rounded-full bg-neutral-200/40"></span>
          <span
            v-else
            :class="[
              'dot-animate h-1.5 w-1.5 rounded-full',
              dot.isLoopPoint ? 'bg-primary-200/40' : 'bg-neutral-200/40',
            ]"
          ></span>
        </span>
      </template>
    </div>

    <div
      :class="[
        'dot-layer dot-layer--current',
        previousDots.length ? `dot-layer--incoming ${motionDirection ? `dot-layer--${motionDirection}` : ''}` : '',
      ]"
    >
      <template v-for="dot in progressDots" :key="dot.slot">
        <span class="dot-slot inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center overflow-hidden">
          <span
            v-if="dot.isBeforeQueueStart"
            class="dot-animate h-1.5 w-1.5 rounded-full border border-neutral-200/40"
          ></span>
          <span
            v-else-if="dot.isPlaceholder"
            class="dot-animate h-2 w-2 rounded-full border border-neutral-200/40"
          ></span>
          <span
            v-else-if="isCurrentDot(dot)"
            :class="[
              'dot-animate dot-current h-2.5 w-2.5 rounded-full',
              isIncomingDot(dot) ? 'dot-incoming' : '',
              dot.isLoopPoint ? 'bg-primary-200/60 dark:bg-primary-300/60' : 'bg-neutral-200/60',
            ]"
          ></span>
          <span
            v-else-if="isIncomingPending(dot)"
            class="dot-animate h-2 w-2 rounded-full bg-neutral-200/40"
          ></span>
          <span
            v-else-if="dot.isLoopPoint && dot.index !== null"
            class="dot-animate inline-flex h-2.5 w-2.5 items-center justify-center text-primary-200/70 hover:text-primary-200 dark:text-primary-300/70"
          >
            <IconRefresh :size="9" stroke-width="2.5" />
          </span>
          <span
            v-else-if="dot.index !== null"
            class="dot-animate h-2 w-2 rounded-full bg-neutral-200/40 hover:bg-neutral-200/60"
          ></span>
          <span
            v-else
            :class="[
              'dot-animate h-1.5 w-1.5 rounded-full',
              dot.isLoopPoint ? 'bg-primary-200/40' : 'bg-neutral-200/40',
            ]"
          ></span>
        </span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { IconRefresh } from '@tabler/icons-vue';
import type { ProgressDot } from '../types';
import { useProgressDotsAnimation } from './useProgressDotsAnimation';

const props = defineProps<{
  progressDots: ProgressDot[];
  canGoPrevious: boolean;
  canGoNext: boolean;
  slideDirection: string;
}>();

const emit = defineEmits<{
  (event: 'prev'): void;
  (event: 'next'): void;
}>();

const dotStripRef = ref<HTMLDivElement | null>(null);

const { motionDirection, previousDots, isOutgoingDot, isIncomingDot, isIncomingPending, isCurrentDot } =
  useProgressDotsAnimation(toRef(props, 'progressDots'), toRef(props, 'slideDirection'));

const currentSlot = computed(() => {
  const active = props.progressDots.find((dot) => dot.isCurrent);
  return active ? active.slot : Math.floor(props.progressDots.length / 2);
});

function handleDotStripClick(event: MouseEvent): void {
  if (!dotStripRef.value || props.progressDots.length === 0) return;
  const rect = dotStripRef.value.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const slotWidth = rect.width / props.progressDots.length;
  const clickedSlot = Math.floor(x / slotWidth);
  if (clickedSlot <= currentSlot.value) {
    if (!props.canGoPrevious) return;
    emit('prev');
    return;
  }
  if (!props.canGoNext) return;
  emit('next');
}
</script>
