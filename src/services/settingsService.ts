import type { DurationPreset, Priority, Theme } from '../core/types';
import {
  initThemeWatcher as initThemeWatcherInternal,
  resetSettings as resetSettingsInternal,
  settings,
} from '../stores/settings';

const allowedThemes = new Set<Theme>(['light', 'dark', 'system']);
const allowedPriorities = new Set<Priority>(['urgent', 'high', 'medium', 'low']);
const allowedDurations = new Set<DurationPreset>(['10d', '1m', '3m', '6m', '1y']);

export { settings };

export function initThemeWatcher(): void {
  initThemeWatcherInternal();
}

export function resetSettings(): void {
  resetSettingsInternal();
}

export function setTheme(value: Theme): void {
  if (!allowedThemes.has(value)) return;
  settings.theme = value;
}

export function setDefaultPriority(value: Priority): void {
  if (!allowedPriorities.has(value)) return;
  settings.defaultPriority = value;
}

export function setDefaultDuration(value: DurationPreset): void {
  if (!allowedDurations.has(value)) return;
  settings.defaultDuration = value;
}
