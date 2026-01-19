<template>
  <header class="z-30 w-full flex-none bg-base-200/92 backdrop-blur dark:bg-base-100/92">
    <div class="mx-auto max-w-3xl px-4 sm:px-6">
      <div class="flex h-12 items-center justify-between">
        <span class="text-sm font-semibold tracking-wide uppercase text-base-content-muted">
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
import InfoModal from './InfoModal.vue';
import SettingsModal from './SettingsModal.vue';
import type { InfoStats } from '../types';

defineProps<{ infoStats: InfoStats }>();
</script>
