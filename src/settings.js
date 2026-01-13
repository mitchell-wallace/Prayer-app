import { reactive, watch, watchEffect } from 'vue';

const STORAGE_KEY = 'prayer-app-settings';

const defaults = {
  theme: 'system', // 'light', 'dark', 'system'
  defaultPriority: 'medium',
  defaultDuration: '6m',
};

function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...defaults, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage', e);
  }
  return { ...defaults };
}

export const settings = reactive(loadSettings());

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
function applyTheme(theme) {
  const root = document.documentElement;

  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  } else {
    root.setAttribute('data-theme', theme);
  }
}

// Watch for theme changes and apply
export function initThemeWatcher() {
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

export function resetSettings() {
  Object.assign(settings, defaults);
}
