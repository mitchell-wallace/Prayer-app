import type { DurationPreset, Priority, Settings, Theme } from '../core/types';

export function loadSettings(): Settings;
export function saveSettings(settings: Settings): void;
export function isValidTheme(value: unknown): value is Theme;
export function isValidPriority(value: unknown): value is Priority;
export function isValidDuration(value: unknown): value is DurationPreset;
