import {
  settings,
  initThemeWatcher as initThemeWatcherInternal,
  resetSettings as resetSettingsInternal,
} from '../settings.js';

const allowedThemes = new Set(['light', 'dark', 'system']);
const allowedPriorities = new Set(['urgent', 'high', 'medium', 'low']);
const allowedDurations = new Set(['10d', '1m', '3m', '6m', '1y']);

export { settings };

export function initThemeWatcher() {
  initThemeWatcherInternal();
}

export function resetSettings() {
  resetSettingsInternal();
}

export function setTheme(value) {
  if (!allowedThemes.has(value)) return;
  settings.theme = value;
}

export function setDefaultPriority(value) {
  if (!allowedPriorities.has(value)) return;
  settings.defaultPriority = value;
}

export function setDefaultDuration(value) {
  if (!allowedDurations.has(value)) return;
  settings.defaultDuration = value;
}
