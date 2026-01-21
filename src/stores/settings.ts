import { reactive, watch, watchEffect } from 'vue';
import type { Settings, Theme } from '../core/types';
import { defaultSettings, load, save } from '../repositories/settingsRepository';

export const settings = reactive<Settings>(load());

watch(
  () => ({ ...settings }),
  (newSettings) => {
    save(newSettings);
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
  Object.assign(settings, defaultSettings);
}
