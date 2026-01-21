import { reactive, watch, watchEffect } from 'vue';
import type { Settings, Theme } from './types';

const STORAGE_KEY = 'prayer-app-settings';

const defaults: Settings = {
  theme: 'system', // 'light', 'dark', 'system'
  defaultPriority: 'medium',
  defaultDuration: '6m',
};

function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (typeof parsed === 'object' && parsed) {
        return { ...defaults, ...(parsed as Partial<Settings>) };
      }
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage', e);
  }
  return { ...defaults };
}

export const settings = reactive<Settings>(loadSettings());

// Persist settings on change
watch(
  () => ({ ...settings }),
  (newSettings) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    } catch (e) {
      console.warn('Failed to save settings to localStorage', e);
    }
  },
  { deep: true }
);

// Apply theme to document
function applyTheme(theme: Theme): void {
  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

// Watch for theme changes and apply
export function initThemeWatcher(): void {
  // Initial application
  applyTheme(settings.theme);

  // Watch for settings changes
  watchEffect(() => {
    applyTheme(settings.theme);
  });

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    if (settings.theme === 'system') {
      applyTheme('system');
    }
  });
}

export function resetSettings(): void {
  Object.assign(settings, defaults);
}
