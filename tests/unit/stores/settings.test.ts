import { expect, test, vi } from 'vitest';
import type { Settings } from '@/core/types';
import { isValidDuration, isValidPriority, isValidTheme, loadSettings } from '@/services/settingsService';

vi.mock('@/services/settingsService', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn(),
  isValidTheme: vi.fn(),
  isValidPriority: vi.fn(),
  isValidDuration: vi.fn(),
}));

const baseSettings: Settings = {
  theme: 'system',
  defaultPriority: 'medium',
  defaultDuration: '6m',
};

const setupStore = async (settingsOverride: Settings = baseSettings) => {
  vi.resetModules();
  vi.mocked(loadSettings).mockReturnValue({ ...settingsOverride });
  const storeModule = await import('@/stores/settings');
  return storeModule;
};

const mockMatchMedia = (matches: boolean) => {
  let listener: (() => void) | null = null;
  const mediaQuery = {
    matches,
    addEventListener: vi.fn((_event: string, cb: () => void) => {
      listener = cb;
    }),
  };
  window.matchMedia = vi.fn(() => mediaQuery) as unknown as typeof window.matchMedia;
  return {
    mediaQuery,
    triggerChange: () => listener?.(),
  };
};

test('initializes settings from service', async () => {
  const settings = { theme: 'dark', defaultPriority: 'high', defaultDuration: '3m' } as const;
  const storeModule = await setupStore(settings);
  expect(loadSettings).toHaveBeenCalledTimes(1);
  expect(storeModule.settings).toMatchObject(settings);
});

test('setTheme validates via service and ignores invalid values', async () => {
  const storeModule = await setupStore();
  const mockIsValidTheme = vi.mocked(isValidTheme);
  mockIsValidTheme.mockReturnValueOnce(false);
  storeModule.setTheme('dark');
  expect(mockIsValidTheme).toHaveBeenCalledWith('dark');
  expect(storeModule.settings.theme).toBe('system');

  mockIsValidTheme.mockReturnValueOnce(true);
  storeModule.setTheme('dark');
  expect(storeModule.settings.theme).toBe('dark');
});

test('setDefaultPriority validates via service', async () => {
  const storeModule = await setupStore();
  const mockIsValidPriority = vi.mocked(isValidPriority);
  mockIsValidPriority.mockReturnValueOnce(false);
  storeModule.setDefaultPriority('high');
  expect(mockIsValidPriority).toHaveBeenCalledWith('high');
  expect(storeModule.settings.defaultPriority).toBe('medium');
});

test('setDefaultDuration validates via service', async () => {
  const storeModule = await setupStore();
  const mockIsValidDuration = vi.mocked(isValidDuration);
  mockIsValidDuration.mockReturnValueOnce(false);
  storeModule.setDefaultDuration('3m');
  expect(mockIsValidDuration).toHaveBeenCalledWith('3m');
  expect(storeModule.settings.defaultDuration).toBe('6m');
});

test('resetSettings restores defaults', async () => {
  const storeModule = await setupStore({ theme: 'dark', defaultPriority: 'high', defaultDuration: '1y' });
  storeModule.resetSettings();
  expect(storeModule.settings).toMatchObject(baseSettings);
});

test('initThemeWatcher sets root theme', async () => {
  const storeModule = await setupStore({ theme: 'dark', defaultPriority: 'medium', defaultDuration: '6m' });
  mockMatchMedia(false);

  storeModule.initThemeWatcher();

  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
});

test('initThemeWatcher reacts to system theme change', async () => {
  const storeModule = await setupStore({ theme: 'system', defaultPriority: 'medium', defaultDuration: '6m' });
  const { mediaQuery, triggerChange } = mockMatchMedia(false);

  storeModule.initThemeWatcher();
  expect(document.documentElement.getAttribute('data-theme')).toBe('light');

  mediaQuery.matches = true;
  triggerChange();
  expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
});
