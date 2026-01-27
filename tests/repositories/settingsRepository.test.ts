import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { defaultSettings, load, save } from '../../src/repositories/settingsRepository';

const storageKey = 'prayer-app-settings';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

test('load returns defaults when localStorage empty', () => {
  const settings = load();
  expect(settings).toEqual(defaultSettings);
});

test('load returns defaults on invalid JSON', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  localStorage.setItem(storageKey, 'not-json');
  const settings = load();
  expect(settings).toEqual(defaultSettings);
  expect(warnSpy).toHaveBeenCalled();
});

test('load validates stored theme', () => {
  localStorage.setItem(storageKey, JSON.stringify({ theme: 'neon' }));
  const settings = load();
  expect(settings.theme).toBe(defaultSettings.theme);
});

test('load validates stored priority', () => {
  localStorage.setItem(storageKey, JSON.stringify({ defaultPriority: 'soon' }));
  const settings = load();
  expect(settings.defaultPriority).toBe(defaultSettings.defaultPriority);
});

test('load validates stored duration', () => {
  localStorage.setItem(storageKey, JSON.stringify({ defaultDuration: '2w' }));
  const settings = load();
  expect(settings.defaultDuration).toBe(defaultSettings.defaultDuration);
});

test('save writes JSON settings to localStorage', () => {
  const settings = {
    theme: 'dark',
    defaultPriority: 'high',
    defaultDuration: '3m',
  } as const;
  save(settings);
  expect(localStorage.getItem(storageKey)).toBe(JSON.stringify(settings));
});

test('save handles localStorage failures gracefully', () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota exceeded');
  });
  expect(() => save(defaultSettings)).not.toThrow();
  expect(warnSpy).toHaveBeenCalled();
});
