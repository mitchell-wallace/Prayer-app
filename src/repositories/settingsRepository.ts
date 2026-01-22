import type { DurationPreset, Priority, Settings, Theme } from '../core/types';

const STORAGE_KEY = 'prayer-app-settings';

const VALID_THEMES = new Set<string>(['light', 'dark', 'system']);
const VALID_PRIORITIES = new Set<string>(['urgent', 'high', 'medium', 'low']);
const VALID_DURATIONS = new Set<string>(['10d', '1m', '3m', '6m', '1y']);

const defaults: Settings = {
  theme: 'system',
  defaultPriority: 'medium',
  defaultDuration: '6m',
};

function validateTheme(value: unknown): Theme {
  if (typeof value === 'string' && VALID_THEMES.has(value)) {
    return value as Theme;
  }
  return defaults.theme;
}

function validatePriority(value: unknown): Priority {
  if (typeof value === 'string' && VALID_PRIORITIES.has(value)) {
    return value as Priority;
  }
  return defaults.defaultPriority;
}

function validateDuration(value: unknown): DurationPreset {
  if (typeof value === 'string' && VALID_DURATIONS.has(value)) {
    return value as DurationPreset;
  }
  return defaults.defaultDuration;
}

export function load(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed: unknown = JSON.parse(stored);
      if (typeof parsed === 'object' && parsed !== null) {
        const obj = parsed as Record<string, unknown>;
        return {
          theme: validateTheme(obj.theme),
          defaultPriority: validatePriority(obj.defaultPriority),
          defaultDuration: validateDuration(obj.defaultDuration),
        };
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
