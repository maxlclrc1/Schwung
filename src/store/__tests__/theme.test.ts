import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveScheme } from '../../theme';
import { usePreferences } from '../preferences';
import { useResetPilot } from '../resetPilot';

// The library's own in-memory mock; require() is the documented way to load it in a mock factory.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KEY = 'schwung-preferences';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('resolveScheme', () => {
  it('uses an explicit choice regardless of the phone', () => {
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });

  it('follows the phone on "system", treating unknown values as dark', () => {
    expect(resolveScheme('system', 'light')).toBe('light');
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', null)).toBe('dark');
    expect(resolveScheme('system', 'unspecified')).toBe('dark');
  });
});

describe('the theme preference', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    usePreferences.getState().setThemePreference('system');
    await wait(300);
  });

  it('defaults to following the phone, and ignores anything unexpected in the save', async () => {
    await AsyncStorage.setItem(KEY, JSON.stringify({ state: { themePreference: 'purple' }, version: 1 }));
    await usePreferences.persist.rehydrate();
    expect(usePreferences.getState().themePreference).toBe('system');
  });

  it('is saved on its own, apart from the program', async () => {
    usePreferences.getState().setThemePreference('dark');
    await wait(400); // writes are coalesced for 250 ms
    expect(JSON.parse((await AsyncStorage.getItem(KEY))!).state).toEqual({
      themePreference: 'dark',
      // Reminders are saved alongside, off until turned on.
      reminders: { enabled: false, hour: 9, minute: 0, showHabits: false },
      // The welcome back is on until turned off.
      comebacks: true,
      // The language follows the phone until one is chosen.
      language: 'system',
    });
    expect(useResetPilot.getState().program).toBeNull();
  });

  it('is restored after a restart', async () => {
    usePreferences.getState().setThemePreference('light');
    await wait(400);
    const saved = (await AsyncStorage.getItem(KEY))!;
    // True cold start: a brand-new copy of the store (defaults in memory) reading the saved file.
    let freshStorage!: typeof AsyncStorage;
    let fresh!: typeof usePreferences;
    jest.isolateModules(() => {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const storageModule = require('@react-native-async-storage/async-storage');
      freshStorage = storageModule.default ?? storageModule;
      fresh = require('../preferences').usePreferences;
      /* eslint-enable @typescript-eslint/no-require-imports */
    });
    await freshStorage.setItem(KEY, saved);
    await fresh.persist.rehydrate();
    expect(fresh.getState().themePreference).toBe('light');
  });

  it('stays when the Life Reset ends', () => {
    usePreferences.getState().setThemePreference('light');
    useResetPilot.getState().end();
    expect(usePreferences.getState().themePreference).toBe('light');
  });
});
