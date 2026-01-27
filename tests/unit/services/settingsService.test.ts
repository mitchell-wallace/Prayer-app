import { expect, test, vi } from 'vitest';
import type { Settings } from '@/core/types';
import { load, save } from '@/repositories/settingsRepository';
import { isValidDuration, isValidPriority, isValidTheme, loadSettings, saveSettings } from '@/services/settingsService';

vi.mock('@/repositories/settingsRepository', () => ({
  load: vi.fn(),
  save: vi.fn(),
}));

test('isValidTheme accepts valid values', () => {
  expect(isValidTheme('light')).toBe(true);
  expect(isValidTheme('dark')).toBe(true);
  expect(isValidTheme('system')).toBe(true);
});

test('isValidTheme rejects invalid values', () => {
  expect(isValidTheme('neon')).toBe(false);
});

test('isValidPriority accepts valid values', () => {
  expect(isValidPriority('urgent')).toBe(true);
  expect(isValidPriority('high')).toBe(true);
  expect(isValidPriority('medium')).toBe(true);
  expect(isValidPriority('low')).toBe(true);
});

test('isValidPriority rejects invalid values', () => {
  expect(isValidPriority('soon')).toBe(false);
});

test('isValidDuration accepts valid values', () => {
  expect(isValidDuration('10d')).toBe(true);
  expect(isValidDuration('1m')).toBe(true);
  expect(isValidDuration('3m')).toBe(true);
  expect(isValidDuration('6m')).toBe(true);
  expect(isValidDuration('1y')).toBe(true);
});

test('isValidDuration rejects invalid values', () => {
  expect(isValidDuration('2w')).toBe(false);
});

test('loadSettings delegates to repository', () => {
  const mockLoad = vi.mocked(load);
  const settings: Settings = { theme: 'dark', defaultPriority: 'high', defaultDuration: '3m' };
  mockLoad.mockReturnValue(settings);
  expect(loadSettings()).toBe(settings);
  expect(mockLoad).toHaveBeenCalledTimes(1);
});

test('saveSettings delegates to repository', () => {
  const mockSave = vi.mocked(save);
  const settings: Settings = { theme: 'light', defaultPriority: 'medium', defaultDuration: '6m' };
  saveSettings(settings);
  expect(mockSave).toHaveBeenCalledWith(settings);
});
