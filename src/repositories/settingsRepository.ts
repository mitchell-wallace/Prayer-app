import type { Settings } from '../core/types';

const STORAGE_KEY = 'prayer-app-settings';

const defaults: Settings = {
  theme: 'system',
  defaultPriority: 'medium',
  defaultDuration: '6m',
};

export function load(): Settings {
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

export function save(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings to localStorage', e);
  }
}

export { defaults as defaultSettings };
