import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPilot } from '../../core/reset/pilot';
import { recoveryKey, useRecovery } from '../recovery';
import {
  migrateSave,
  RESET_PILOT_VERSION,
  restoreFromRecovery,
  startOverFromRecovery,
  useResetPilot,
} from '../resetPilot';
import { flushStorage } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KEY = 'schwung-reset-pilot';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const r = () => useResetPilot.getState();
const program = () =>
  createPilot(
    { age: '30_49', precautions: [], minutesPerDay: 90 },
    [
      { habitId: 'mind_read', intensity: 'starter' },
      { habitId: 'home_tidy', intensity: 'starter' },
    ],
    '2026-11-02',
  )!;
const saveText = (p: unknown, version = RESET_PILOT_VERSION) =>
  JSON.stringify({ state: { program: p, devDayOffset: 0 }, version });

/** A launch: whatever is on disk is read again. */
async function launch(raw: string) {
  // Anything the app still had pending is written first, as it would be before a real relaunch.
  await flushStorage().catch(() => {});
  await AsyncStorage.setItem(KEY, raw);
  await useResetPilot.persist.rehydrate();
  await wait(20);
}

beforeEach(async () => {
  useRecovery.setState({ pending: false, reason: null, recovered: null, lost: [], raw: null, keptAt: null });
  useResetPilot.setState({ program: null });
  await flushStorage().catch(() => {});
  await AsyncStorage.clear();
});

describe('a save that can’t be fully understood is kept, never guessed at or deleted', () => {
  it('an unreadable save: kept in a recovery slot, and normal saves can’t overwrite it', async () => {
    await launch('{"state": {"program": {"v": 1, "start');
    const rec = useRecovery.getState();
    expect(rec).toMatchObject({ pending: true, reason: 'unreadable', keptAt: recoveryKey(KEY, 1) });
    expect(await AsyncStorage.getItem(recoveryKey(KEY, 1))).toBe('{"state": {"program": {"v": 1, "start');
    // Something tries to save meanwhile: held back, the original stays where it was.
    useResetPilot.setState({ program: program() });
    await wait(400);
    expect(await AsyncStorage.getItem(KEY)).toBe('{"state": {"program": {"v": 1, "start');
  });

  it('a save from a newer Schwung: kept as it is, with no reset', async () => {
    const raw = saveText(program(), RESET_PILOT_VERSION + 1);
    await launch(raw);
    expect(useRecovery.getState()).toMatchObject({ pending: true, reason: 'newer' });
    expect(r().program).toBeNull();
    expect(await AsyncStorage.getItem(recoveryKey(KEY, 1))).toBe(raw);
    await wait(400);
    expect(await AsyncStorage.getItem(KEY)).toBe(raw);
  });

  it('a partly damaged save: everything valid recovered, the damaged habit named, the original kept', async () => {
    const p = program();
    const damaged = { ...p, progression: { ...p.progression, home_tidy: { nonsense: true } } };
    const raw = saveText(damaged);
    await launch(raw);
    const rec = useRecovery.getState();
    expect(rec.pending).toBe(true);
    expect(rec.reason).toBe('partial');
    expect(rec.recovered?.habits).toEqual(['mind_read']);
    expect(rec.lost).toEqual(['Tidy Up: its targets and progress']);
    // Not applied until the person chooses.
    expect(r().program).toBeNull();
    expect(await AsyncStorage.getItem(recoveryKey(KEY, 1))).toBe(raw);
    expect(restoreFromRecovery()).toBe(true);
    expect(r().program?.habits).toEqual(['mind_read']);
    await wait(400);
    // Saving resumed; the original is still in its recovery slot.
    expect(JSON.parse((await AsyncStorage.getItem(KEY))!).state.program.habits).toEqual(['mind_read']);
    expect(await AsyncStorage.getItem(recoveryKey(KEY, 1))).toBe(raw);
  });

  it('repeated launches keep one copy; a different save never overwrites an earlier copy', async () => {
    await launch('broken one');
    await launch('broken one');
    expect(await AsyncStorage.getItem(recoveryKey(KEY, 2))).toBeNull();
    await launch('broken two');
    expect(await AsyncStorage.getItem(recoveryKey(KEY, 1))).toBe('broken one');
    expect(await AsyncStorage.getItem(recoveryKey(KEY, 2))).toBe('broken two');
  });

  it('starting over needs the original safely kept first', async () => {
    await launch('broken');
    useRecovery.setState({ keptAt: null });
    expect(startOverFromRecovery()).toBe(false);
    expect(useRecovery.getState().pending).toBe(true);
    useRecovery.setState({ keptAt: recoveryKey(KEY, 1) });
    expect(startOverFromRecovery()).toBe(true);
    expect(useRecovery.getState().pending).toBe(false);
    expect(await AsyncStorage.getItem(recoveryKey(KEY, 1))).toBe('broken');
  });

  it('a valid save loads as before, with nothing set aside', async () => {
    await launch(saveText(program()));
    expect(useRecovery.getState().pending).toBe(false);
    expect(r().program?.habits).toEqual(['mind_read', 'home_tidy']);
    expect(await AsyncStorage.getItem(recoveryKey(KEY, 1))).toBeNull();
  });
});

describe('save versions and writes', () => {
  it('migrates older saves step by step, and refuses a missing step instead of guessing', async () => {
    expect(migrateSave({ a: 1 }, 0)).toEqual({ a: 1 });
    expect(() => migrateSave({}, 0, RESET_PILOT_VERSION + 1)).toThrow(/No migration/);
    // A save from before versioning (version 0) still opens.
    await launch(saveText(program(), 0));
    expect(useRecovery.getState().pending).toBe(false);
    expect(r().program?.habits).toEqual(['mind_read', 'home_tidy']);
  });

  it('a failed write keeps the newest state and retries it', async () => {
    const multiSet = jest.spyOn(AsyncStorage, 'multiSet').mockRejectedValueOnce(new Error('disk full'));
    useResetPilot.setState({ program: program() });
    await expect(flushStorage()).rejects.toThrow('disk full');
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    await flushStorage();
    expect(JSON.parse((await AsyncStorage.getItem(KEY))!).state.program.habits).toEqual(['mind_read', 'home_tidy']);
    multiSet.mockRestore();
  });
});
