import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { resolveScheme } from '../../theme';
import { useApp } from '../useApp';

// The library's own in-memory mock; require() is the documented way to load it in a mock factory.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KEY = 'schwung-state';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** A saved state from before the theme preference existed, with real progress in it. */
const legacySaved = {
  state: {
    startedAt: '2026-10-01',
    answers: null,
    plan: [{ habitId: 'water', level: 'medium', addedOnDay: 1, levelSince: 0 }],
    logs: { '2026-10-01': { day: 1, date: '2026-10-01', completed: ['water'], planned: ['water'] } },
    reminderTime: '07:30',
    notificationsEnabled: true,
    seenCeremonies: [1],
    appliedPhase: 1,
    notices: [],
    devDayOffset: 0,
  },
  version: 1,
};

async function loadSaved(saved: unknown) {
  await AsyncStorage.setItem(KEY, JSON.stringify(saved));
  await useApp.persist.rehydrate();
}

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

describe('theme preference in the store', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await loadSaved(legacySaved);
  });

  it('defaults to "system" for data saved before the preference existed, keeping all progress', () => {
    const s = useApp.getState();
    expect(s.themePreference).toBe('system');
    expect(s.startedAt).toBe('2026-10-01');
    expect(s.plan).toEqual(legacySaved.state.plan);
    expect(s.logs).toEqual(legacySaved.state.logs);
    expect(s.reminderTime).toBe('07:30');
    expect(s.seenCeremonies).toEqual([1]);
  });

  it('changing the theme changes nothing else', () => {
    const before = useApp.getState();
    useApp.getState().setThemePreference('light');
    const after = useApp.getState();
    expect(after.themePreference).toBe('light');
    for (const k of [
      'startedAt',
      'answers',
      'plan',
      'logs',
      'reminderTime',
      'seenCeremonies',
      'appliedPhase',
    ] as const) {
      expect(after[k]).toBe(before[k]);
    }
  });

  it('saves the choice and restores it after a restart', async () => {
    useApp.getState().setThemePreference('dark');
    await wait(400); // writes are coalesced for 250 ms
    const raw = JSON.parse((await AsyncStorage.getItem(KEY))!);
    expect(raw.state.themePreference).toBe('dark');
    expect(raw.state.logs).toEqual(legacySaved.state.logs);

    // True cold start: a brand-new copy of the store (defaults in memory) reading the saved file.
    const saved = (await AsyncStorage.getItem(KEY))!;
    let freshStorage!: typeof AsyncStorage;
    let fresh!: typeof useApp;
    jest.isolateModules(() => {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const storageModule = require('@react-native-async-storage/async-storage');
      freshStorage = storageModule.default ?? storageModule;
      fresh = require('../useApp').useApp;
      /* eslint-enable @typescript-eslint/no-require-imports */
    });
    await freshStorage.setItem(KEY, saved);
    await fresh.persist.rehydrate();
    expect(fresh.getState().themePreference).toBe('dark');
    expect(fresh.getState().logs).toEqual(legacySaved.state.logs);
    expect(fresh.getState().plan).toEqual(legacySaved.state.plan);
  });

  it('keeps the choice when the program is restarted', () => {
    useApp.getState().setThemePreference('light');
    useApp.getState().restart();
    expect(useApp.getState().themePreference).toBe('light');
    expect(useApp.getState().startedAt).toBeNull();
  });

  it('includes the choice in the data export', () => {
    useApp.getState().setThemePreference('light');
    const { exportData } = jest.requireActual<typeof import('../useApp')>('../useApp');
    expect(exportData().themePreference).toBe('light');
  });
});
