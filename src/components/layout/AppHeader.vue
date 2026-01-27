<template>
  <header class="z-30 w-full flex-none backdrop-blur">
    <div class="mx-auto max-w-3xl px-4 sm:px-6">
      <div class="flex h-12 items-center justify-between">
        <span class="text-sm font-semibold tracking-wide uppercase text-base-content/70">
          Prayer Rhythm
        </span>
        <div class="flex items-center gap-2">
          <InfoModal :stats="infoStats" />
          <SettingsModal />
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import InfoModal from '@/components/modals/InfoModal.vue';
import SettingsModal from '@/components/modals/SettingsModal.vue';
import type { InfoStats } from '@/core/types';

defineProps<{ infoStats: InfoStats }>();
</script>
