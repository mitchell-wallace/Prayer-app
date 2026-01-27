import { reactive, watch, watchEffect } from 'vue';
import type { DurationPreset, Priority, Settings, Theme } from '@/core/types';
import { isValidDuration, isValidPriority, isValidTheme, loadSettings, saveSettings } from '@/services/settingsService';

export const settings = reactive<Settings>(loadSettings());

watch(
  () => ({ ...settings }),
  (newSettings) => {
    saveSettings(newSettings);
  },
  { deep: true }
);

function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

export function initThemeWatcher(): void {
  applyTheme(settings.theme);

  watchEffect(() => {
    applyTheme(settings.theme);
  });

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (settings.theme === 'system') {
      applyTheme('system');
    }
  });
}

export function resetSettings(): void {
  settings.theme = 'system';
  settings.defaultPriority = 'medium';
  settings.defaultDuration = '6m';
}

export function setTheme(value: Theme): void {
  if (!isValidTheme(value)) return;
  settings.theme = value;
}

export function setDefaultPriority(value: Priority): void {
  if (!isValidPriority(value)) return;
  settings.defaultPriority = value;
}

export function setDefaultDuration(value: DurationPreset): void {
  if (!isValidDuration(value)) return;
  settings.defaultDuration = value;
}
