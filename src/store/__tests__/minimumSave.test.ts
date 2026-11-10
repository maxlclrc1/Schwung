import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildExport } from '../../core/dataExport';
import { readBackup } from '../../core/dataImport';
import { DEFAULT_REMINDERS } from '../../core/reminders';
import * as P from '../../core/reset/pilot';
import { useRecovery } from '../recovery';
import { migrateSave, RESET_PILOT_VERSION, SAVE_MIGRATIONS, useResetPilot } from '../resetPilot';
import { flushStorage } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/*
 * Save schema v3 (Minimum Effort, docs/MINIMUM_EFFORT_SPEC.md §6): a day's habit record may carry `minimum`. Every
 * older save is already valid, so the step is an identity; the bump keeps an older Schwung from misreading a v3 save.
 */

const KEY = 'schwung-reset-pilot';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const FORMAT = { version: RESET_PILOT_VERSION, migrate: migrateSave };

const base = () =>
  P.createPilot(
    { age: '30_49', precautions: [], minutesPerDay: 90 },
    [
      { habitId: 'mind_read', intensity: 'starter' },
      { habitId: 'outdoor_time', intensity: 'starter' },
    ],
    '2026-11-02',
  )!;
/** A save from before minimums: completions, a skip, partial progress and a reflection. */
function older(): P.PilotProgram {
  let p = base();
  for (let d = 1; d <= 9; d++) p = P.complete(p, 'mind_read', d).program;
  for (let d = 1; d <= 5; d++) p = P.complete(p, 'outdoor_time', d).program;
  p = P.setSkipped(p, 'outdoor_time', 6, true).program;
  p = P.setPartial(p, 'outdoor_time', 7, true).program;
  return { ...p, reflections: { 1: { week: 1, day: 8, answer: 'right' } } };
}
/**
 * One with minimums (recorded through the drafts, as only tests and previews can): Days 8 and 9 kept with minimums
 * alone (Read Daily's completion undone; one done habit of two would count those days by itself).
 */
const withMinimums = () =>
  [8, 9].reduce((p, d) => {
    let q = P.undo(p, 'mind_read', d).program;
    for (const id of ['mind_read', 'outdoor_time']) q = P.setMinimum(q, id, d, true, 'drafts').program;
    return q;
  }, older());

const numbers = (p: P.PilotProgram, today: number) => ({
  xp: P.pilotXp(p),
  stats: P.journeyStats(p, today),
  outcomes: Array.from({ length: today }, (_, i) => P.dayOutcome(p, i + 1)),
  tallies: P.allHabits(p).map((id) => P.habitTally(p, id, today)),
});

const exported = (program: P.PilotProgram, saveVersion: number) =>
  JSON.stringify(
    buildExport({
      program,
      saveVersion,
      journeys: [],
      today: 10,
      themePreference: 'dark',
      reminders: DEFAULT_REMINDERS,
      comebacks: true,
      recoveryCopies: [],
      now: new Date('2026-11-12T09:00:00Z'),
    }),
  );

async function launch(raw: string) {
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

describe('save schema v3', () => {
  it('is the current version, with an identity step from v2', () => {
    expect(RESET_PILOT_VERSION).toBe(3);
    const state = { program: older(), devDayOffset: 0 };
    expect(SAVE_MIGRATIONS[2](state)).toBe(state);
    for (const from of [0, 1, 2]) expect(migrateSave(state, from)).toEqual(state);
    expect(() => migrateSave(state, 3, 4)).toThrow();
  });

  it('a v2 save (and v0, v1) loads unchanged, with every number as before', async () => {
    const p = older();
    for (const version of [0, 1, 2]) {
      useResetPilot.setState({ program: null });
      await launch(JSON.stringify({ state: { program: p, devDayOffset: 0 }, version }));
      const loaded = useResetPilot.getState().program!;
      expect(loaded).toEqual(P.sanitizePilotProgram(p));
      expect(numbers(loaded, 10)).toEqual(numbers(p, 10));
      expect(numbers(loaded, 10).stats.kept).toBe(0);
    }
  });

  it('a v3 save keeps its minimums through a launch', async () => {
    const p = withMinimums();
    await launch(JSON.stringify({ state: { program: p, devDayOffset: 0 }, version: 3 }));
    const loaded = useResetPilot.getState().program!;
    expect(P.trackOf(loaded, 'outdoor_time', 8).minimum).toBe(true);
    expect(numbers(loaded, 10)).toEqual(numbers(p, 10));
    expect(numbers(loaded, 10).stats.kept).toBe(2);
  });

  it('a save from a newer Schwung (v4) is kept for recovery, never read', async () => {
    const raw = JSON.stringify({ state: { program: withMinimums(), devDayOffset: 0 }, version: 4 });
    await launch(raw);
    expect(useRecovery.getState()).toMatchObject({ pending: true, reason: 'newer' });
    expect(useResetPilot.getState().program).toBeNull();
  });
});

describe('restore from a backup', () => {
  it('restores v1 and v2 backups unchanged, and a v3 backup with its minimums', () => {
    for (const v of [1, 2]) {
      const r = readBackup(exported(older(), v), FORMAT);
      if (!r.ok) throw new Error(r.problem);
      expect(numbers(r.backup.program!, 10)).toEqual(numbers(older(), 10));
    }
    const r = readBackup(exported(withMinimums(), 3), FORMAT);
    if (!r.ok) throw new Error(r.problem);
    expect(numbers(r.backup.program!, 10)).toEqual(numbers(withMinimums(), 10));
    expect(P.minimumsOn(r.backup.program!, 9)).toEqual(['mind_read', 'outdoor_time']);
  });

  it('refuses a backup from a newer Schwung', () => {
    expect(readBackup(exported(withMinimums(), 4), FORMAT)).toMatchObject({ ok: false, problem: 'newerVersion' });
  });

  it('an older Schwung (v2) refuses a v3 backup rather than misreading it', () => {
    const v2 = { version: 2, migrate: (s: unknown, from: number) => migrateSave(s, from, 2) };
    expect(readBackup(exported(withMinimums(), 3), v2)).toMatchObject({ ok: false, problem: 'newerVersion' });
  });
});
