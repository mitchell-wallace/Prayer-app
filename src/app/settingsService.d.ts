import type { DurationPreset, Priority, Settings, Theme } from '../types';

export const settings: Settings;
export function initThemeWatcher(): void;
export function resetSettings(): void;
export function setTheme(value: Theme): void;
export function setDefaultPriority(value: Priority): void;
export function setDefaultDuration(value: DurationPreset): void;
