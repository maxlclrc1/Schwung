import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Backup } from '../../core/dataImport';
import { DEFAULT_REMINDERS } from '../../core/reminders';
import * as P from '../../core/reset/pilot';
import { PREFERENCES_KEY, usePreferences } from '../preferences';
import { recoveryKey, useRecovery } from '../recovery';
import { useResetPilot } from '../resetPilot';
import { restoreBackup } from '../restore';
import { flushStorage } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KEY = 'schwung-reset-pilot';
const multiSet = AsyncStorage.multiSet as jest.Mock<typeof AsyncStorage.multiSet>;
const realMultiSet = multiSet.getMockImplementation()!;
/** Makes the restore's own write (the program and the preferences together) behave differently, once. */
function onRestoreWrite(f: typeof AsyncStorage.multiSet) {
  let used = false;
  multiSet.mockImplementation((pairs, cb) => {
    if (used || !(pairs.some(([k]) => k === PREFERENCES_KEY) && pairs.some(([k]) => k === KEY)))
      return realMultiSet(pairs, cb);
    used = true;
    return f(pairs, cb);
  });
}

const pilot = (habit: 'mind_read' | 'home_tidy', startKey: string) =>
  P.complete(
    P.createPilot(
      { age: '30_49', precautions: [], minutesPerDay: 90 },
      [{ habitId: habit, intensity: 'starter' }],
      startKey,
    )!,
    habit,
    1,
  ).program;

const backup = (): Backup => ({
  program: { ...pilot('home_tidy', '2026-10-01'), collection: { unlocked: ['compass'] }, ceremonies: { day1: true } },
  journeys: [],
  exportedAt: '2026-11-01T10:00:00.000Z',
  preferences: { themePreference: 'dark', reminders: { ...DEFAULT_REMINDERS, enabled: true }, comebacks: false },
});

/** What the next launch would read. */
async function relaunch() {
  await useResetPilot.persist.rehydrate();
  await usePreferences.persist.rehydrate();
}

beforeEach(async () => {
  multiSet.mockImplementation(realMultiSet);
  useRecovery.setState({ pending: false, reason: null, recovered: null, lost: [], raw: null, keptAt: null });
  useResetPilot.setState({ program: null });
  usePreferences.setState({ themePreference: 'system', reminders: DEFAULT_REMINDERS, comebacks: true });
  await flushStorage().catch(() => {});
  await AsyncStorage.clear();
});

describe('Restore from backup: committing it', () => {
  it('restores onto a phone without a Life Reset, and the next launch opens it', async () => {
    const b = backup();
    expect(await restoreBackup(b)).toEqual({ ok: true });
    expect(useResetPilot.getState().program).toEqual(b.program);
    expect(usePreferences.getState()).toMatchObject({ themePreference: 'dark', comebacks: false });
    await flushStorage();
    expect(JSON.parse((await AsyncStorage.getItem(KEY))!).state.program).toEqual(b.program);
    await relaunch();
    expect(useResetPilot.getState().program).toEqual(b.program);
    expect(usePreferences.getState().reminders.enabled).toBe(true);
  });

  it('replacing a Life Reset first keeps it in a recovery slot, never mixing the two', async () => {
    const current = pilot('mind_read', '2026-10-20');
    useResetPilot.setState({ program: current });
    const b = backup();
    expect(await restoreBackup(b)).toEqual({ ok: true });
    const kept = JSON.parse((await AsyncStorage.getItem(recoveryKey(KEY, 1)))!);
    expect(kept.state.program).toEqual(current);
    expect(useResetPilot.getState().program).toEqual(b.program);
    expect(useResetPilot.getState().program?.habits).toEqual(['home_tidy']);
  });

  it('a storage failure changes nothing: the current Life Reset stays, in memory and on disk', async () => {
    const current = pilot('mind_read', '2026-10-20');
    useResetPilot.setState({ program: current });
    await flushStorage();
    onRestoreWrite(() => Promise.reject(new Error('disk full')));
    expect(await restoreBackup(backup())).toEqual({ ok: false, reason: 'storage' });
    expect(useResetPilot.getState().program).toEqual(current);
    await relaunch();
    expect(useResetPilot.getState().program).toEqual(current);
    // The backup's preferences never reached the disk; the current ones did.
    expect(JSON.parse((await AsyncStorage.getItem(PREFERENCES_KEY))!).state.themePreference).toBe('system');
  });

  it('an interrupted restore (the app closed mid-way) opens on one Life Reset, never a mix', async () => {
    const current = pilot('mind_read', '2026-10-20');
    useResetPilot.setState({ program: current });
    // Closed before the switch: the disk has either everything old or everything new.
    let release!: () => void;
    onRestoreWrite(async (pairs, cb) => {
      await new Promise<void>((r) => (release = r));
      return realMultiSet(pairs, cb);
    });
    const pending = restoreBackup(backup());
    await new Promise((r) => setTimeout(r, 20));
    // Not written yet: what's on disk is the current Life Reset.
    expect(JSON.parse((await AsyncStorage.getItem(KEY))!).state.program).toEqual(current);
    release();
    await pending;
    await relaunch();
    expect(useResetPilot.getState().program).toEqual(backup().program);
  });

  it('refuses while a damaged save is waiting for the person’s decision', async () => {
    useRecovery.setState({ pending: true, keptAt: recoveryKey(KEY, 1) });
    expect(await restoreBackup(backup())).toEqual({ ok: false, reason: 'recoveryPending' });
    expect(useResetPilot.getState().program).toBeNull();
  });

  it('refuses to replace when the current Life Reset can’t be kept safe first', async () => {
    const current = pilot('mind_read', '2026-10-20');
    useResetPilot.setState({ program: current });
    for (let slot = 1; slot <= 9; slot++) await AsyncStorage.setItem(recoveryKey(KEY, slot), `other ${slot}`);
    expect(await restoreBackup(backup())).toEqual({ ok: false, reason: 'safetyCopy' });
    expect(useResetPilot.getState().program).toEqual(current);
  });
});
