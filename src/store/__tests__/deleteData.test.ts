import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPilot } from '../../core/reset/pilot';
import { deleteAllLocalData } from '../deleteData';
import { usePreferences } from '../preferences';
import { useResetPilot } from '../resetPilot';
import { flushStorage } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const program = () =>
  createPilot(
    { age: '30_49', precautions: ['heart'], minutesPerDay: 60 },
    [{ habitId: 'mind_read', intensity: 'starter' }],
    '2026-11-02',
  )!;
const SCHWUNG = [
  'schwung-reset-pilot',
  'schwung-reset-pilot-recovery',
  'schwung-reset-pilot-recovery-2',
  'schwung-preferences',
  'schwung-state',
  'schwung-state-internal',
  'schwung-fieldnotes',
];
const deps = () => ({
  cancelReminders: jest.fn(async () => {}),
  removeTempFiles: jest.fn(() => {}),
});

beforeEach(async () => {
  await flushStorage().catch(() => {});
  await AsyncStorage.clear();
  for (const k of SCHWUNG) await AsyncStorage.setItem(k, `data for ${k}`);
  await AsyncStorage.setItem('another-app-key', 'not ours');
  useResetPilot.setState({ program: program() });
  usePreferences.setState({ themePreference: 'dark', comebacks: false });
  usePreferences.getState().setReminders({ enabled: true, hour: 7 });
  await flushStorage();
});

describe('Delete my data', () => {
  it('removes every personal record: the program, recovery copies, preferences and old saves', async () => {
    const d = deps();
    const result = await deleteAllLocalData(d);
    expect(result).toEqual({ ok: true, failed: [] });
    expect(d.cancelReminders).toHaveBeenCalled();
    expect(d.removeTempFiles).toHaveBeenCalled();
    expect(useResetPilot.getState().program).toBeNull();
    expect(usePreferences.getState().reminders.enabled).toBe(false);
    // Only the theme is kept (it isn't personal).
    expect(usePreferences.getState().themePreference).toBe('dark');
    await flushStorage();
    for (const k of [
      'schwung-reset-pilot-recovery',
      'schwung-reset-pilot-recovery-2',
      'schwung-state',
      'schwung-state-internal',
      'schwung-fieldnotes',
    ])
      expect(await AsyncStorage.getItem(k)).toBeNull();
    const pilot = JSON.parse((await AsyncStorage.getItem('schwung-reset-pilot')) ?? '{"state":{"program":null}}');
    expect(pilot.state.program).toBeNull();
    const prefs = JSON.parse((await AsyncStorage.getItem('schwung-preferences'))!);
    expect(prefs.state).toMatchObject({ themePreference: 'dark', reminders: { enabled: false } });
    // Nothing that isn't Schwung's is touched.
    expect(await AsyncStorage.getItem('another-app-key')).toBe('not ours');
  });

  it('a pending save can’t bring deleted data back', async () => {
    useResetPilot.setState({ program: program() });
    await deleteAllLocalData(deps());
    await flushStorage();
    const pilot = JSON.parse((await AsyncStorage.getItem('schwung-reset-pilot')) ?? '{"state":{"program":null}}');
    expect(pilot.state.program).toBeNull();
  });

  it('when stored data can’t be removed: nothing else changes, and it says so', async () => {
    // (The storage mock's own function, failing once: restoring a spy would remove its implementation.)
    (AsyncStorage.multiRemove as jest.Mock<typeof AsyncStorage.multiRemove>).mockRejectedValueOnce(new Error('locked'));
    const d = deps();
    const result = await deleteAllLocalData(d);
    expect(result.ok).toBe(false);
    expect(result.failed).toEqual(['data']);
    expect(useResetPilot.getState().program).not.toBeNull();
    expect(await AsyncStorage.getItem('schwung-reset-pilot-recovery')).toBe('data for schwung-reset-pilot-recovery');
    expect(d.cancelReminders).not.toHaveBeenCalled();
  });

  it('reports what couldn’t be removed instead of claiming everything was', async () => {
    const result = await deleteAllLocalData({
      cancelReminders: async () => {
        throw new Error('no');
      },
      removeTempFiles: () => {
        throw new Error('busy');
      },
    });
    expect(result).toEqual({ ok: false, failed: ['reminders', 'temp'] });
    expect(useResetPilot.getState().program).toBeNull();
  });

  it('ending the Life Reset (not deleting) never touches recovery copies', async () => {
    useResetPilot.getState().end();
    await flushStorage();
    expect(await AsyncStorage.getItem('schwung-reset-pilot-recovery')).toBe('data for schwung-reset-pilot-recovery');
    expect(await AsyncStorage.getItem('schwung-reset-pilot-recovery-2')).toBe(
      'data for schwung-reset-pilot-recovery-2',
    );
  });
});
