import type { DurationPreset, Priority, Settings, Theme } from '../core/types';
import { load, save } from '../repositories/settingsRepository';

const allowedThemes = new Set<Theme>(['light', 'dark', 'system']);
const allowedPriorities = new Set<Priority>(['urgent', 'high', 'medium', 'low']);
const allowedDurations = new Set<DurationPreset>(['10d', '1m', '3m', '6m', '1y']);

export function loadSettings(): Settings {
  return load();
}

export function saveSettings(settings: Settings): void {
  save(settings);
}

export function isValidTheme(value: unknown): value is Theme {
  return typeof value === 'string' && allowedThemes.has(value as Theme);
}

export function isValidPriority(value: unknown): value is Priority {
  return typeof value === 'string' && allowedPriorities.has(value as Priority);
}

export function isValidDuration(value: unknown): value is DurationPreset {
  return typeof value === 'string' && allowedDurations.has(value as DurationPreset);
}
