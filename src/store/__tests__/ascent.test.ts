import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildExport } from '../../core/dataExport';
import { readBackup } from '../../core/dataImport';
import { dateForDay, PROGRAM_DAYS } from '../../core/dates';
import { DEFAULT_REMINDERS } from '../../core/reminders';
import * as P from '../../core/reset/pilot';
import { startNewAscent } from '../ascent';
import { deleteAllLocalData } from '../deleteData';
import { useJourneys } from '../journeys';
import { recoveryKey, useRecovery } from '../recovery';
import { migrateSave, RESET_PILOT_VERSION, useResetPilot } from '../resetPilot';
import { restoreBackup } from '../restore';
import { flushStorage } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KEY = 'schwung-reset-pilot';
const JOURNEYS = 'schwung-journeys';
const multiSet = AsyncStorage.multiSet as jest.Mock<typeof AsyncStorage.multiSet>;
const realMultiSet = multiSet.getMockImplementation()!;

const START = '2026-01-05';
const answers: P.PilotAnswers = { age: '30_49', precautions: [], minutesPerDay: 90 };
function summited(): P.PilotProgram {
  let p = P.createPilot(answers, [{ habitId: 'mind_read', intensity: 'starter' }], START)!;
  for (let d = 1; d <= PROGRAM_DAYS; d++) p = P.complete(p, 'mind_read', d).program;
  return { ...p, ceremonies: { day1: true, summit: true }, collection: { unlocked: ['compass'] } };
}
const nextFrom = (prev: P.PilotProgram) =>
  P.beginAscent(prev, answers, P.ascentDefaults(prev, 67).choices, [], dateForDay(START, 67), 67, 7)!;
const disk = async (k: string) => JSON.parse((await AsyncStorage.getItem(k))!).state;

beforeEach(async () => {
  multiSet.mockImplementation(realMultiSet);
  useRecovery.setState({ pending: false, reason: null, recovered: null, lost: [], raw: null, keptAt: null });
  useJourneys.setState({ journeys: [], held: false });
  useResetPilot.setState({ program: null, devDayOffset: 0 });
  await flushStorage().catch(() => {});
  await AsyncStorage.clear();
});

describe('Begin a New Ascent: archive and new program saved together', () => {
  it('archives the finished Life Reset as it was and starts the new one, on disk and in memory', async () => {
    const prev = summited();
    useResetPilot.setState({ program: prev });
    const next = nextFrom(prev);
    expect(await startNewAscent(next, new Date('2026-03-12T08:00:00Z'))).toEqual({ ok: true });
    expect(useResetPilot.getState().program).toEqual(next);
    expect(useJourneys.getState().journeys).toEqual([
      { v: 1, id: `ascent-1-${START}`, archivedAt: '2026-03-12T08:00:00.000Z', program: prev },
    ]);
    expect((await disk(KEY)).program).toEqual(next);
    expect((await disk(JOURNEYS)).journeys[0].program).toEqual(prev);
    // Lifetime XP: the archive's XP is carried once, never counted again from the archive.
    expect(P.lifetimeXp(next)).toBe(P.pilotXp(prev));
  });

  it('a failed save changes nothing: no archive without the new program, or the reverse', async () => {
    const prev = summited();
    useResetPilot.setState({ program: prev });
    let used = false;
    multiSet.mockImplementation((pairs, cb) => {
      if (!used && pairs.some(([k]) => k === JOURNEYS)) {
        used = true;
        return Promise.reject(new Error('disk full'));
      }
      return realMultiSet(pairs, cb);
    });
    expect(await startNewAscent(nextFrom(prev))).toEqual({ ok: false, reason: 'storage' });
    expect(useResetPilot.getState().program).toEqual(prev);
    expect(useJourneys.getState().journeys).toEqual([]);
    await useResetPilot.persist.rehydrate();
    await useJourneys.persist.rehydrate();
    expect(useResetPilot.getState().program).toEqual(prev);
    expect(useJourneys.getState().journeys).toEqual([]);
  });

  it('interrupted mid-save: the next launch opens on the old state or the new one, never a mix', async () => {
    const prev = summited();
    useResetPilot.setState({ program: prev });
    await flushStorage();
    let release!: () => void;
    let used = false;
    multiSet.mockImplementation(async (pairs, cb) => {
      if (!used && pairs.some(([k]) => k === JOURNEYS)) {
        used = true;
        await new Promise<void>((r) => (release = r));
      }
      return realMultiSet(pairs, cb);
    });
    const pending = startNewAscent(nextFrom(prev));
    await new Promise((r) => setTimeout(r, 20));
    expect((await disk(KEY)).program).toEqual(prev);
    expect(await AsyncStorage.getItem(JOURNEYS)).toBeNull();
    release();
    await pending;
    await useJourneys.persist.rehydrate();
    await useResetPilot.persist.rehydrate();
    expect(useJourneys.getState().journeys).toHaveLength(1);
    expect(P.ascentOf(useResetPilot.getState().program!)).toBe(2);
  });

  it('ending after the summit can keep it in Past journeys with no program running', async () => {
    useResetPilot.setState({ program: summited() });
    expect(await startNewAscent(null)).toEqual({ ok: true });
    expect(useResetPilot.getState().program).toBeNull();
    expect(useJourneys.getState().journeys).toHaveLength(1);
  });

  it('refuses while past journeys couldn’t be read (they’re kept, never overwritten)', async () => {
    await AsyncStorage.setItem(JOURNEYS, '{"state": {"journeys": [{"v": 1, "id"');
    await useJourneys.persist.rehydrate();
    await new Promise((r) => setTimeout(r, 20));
    expect(useJourneys.getState().held).toBe(true);
    expect(await AsyncStorage.getItem(recoveryKey(JOURNEYS, 1))).toBe('{"state": {"journeys": [{"v": 1, "id"');
    useResetPilot.setState({ program: summited() });
    expect(await startNewAscent(nextFrom(summited()))).toEqual({ ok: false, reason: 'held' });
    expect(await AsyncStorage.getItem(JOURNEYS)).toBe('{"state": {"journeys": [{"v": 1, "id"');
  });
});

describe('Past journeys in exports, backups and deletion', () => {
  it('export → restore brings back the program and every past journey, all or nothing', async () => {
    const prev = summited();
    useResetPilot.setState({ program: prev });
    const next = nextFrom(prev);
    await startNewAscent(next);
    const file = JSON.stringify(
      buildExport({
        program: next,
        saveVersion: RESET_PILOT_VERSION,
        journeys: useJourneys.getState().journeys,
        today: 1,
        themePreference: 'system',
        reminders: DEFAULT_REMINDERS,
        comebacks: true,
        recoveryCopies: [],
        now: new Date(),
      }),
    );
    const read = readBackup(file, { version: RESET_PILOT_VERSION, migrate: migrateSave });
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.backup.journeys.map((j) => j.program)).toEqual([prev]);
    // A damaged past journey refuses the whole file.
    const broken = JSON.parse(file);
    broken.pastJourneys[0].savedProgram.startedAt = 'soon';
    expect(readBackup(JSON.stringify(broken), { version: RESET_PILOT_VERSION, migrate: migrateSave })).toEqual({
      ok: false,
      problem: 'damaged',
    });
    // Restored on a fresh phone.
    useResetPilot.setState({ program: null });
    useJourneys.setState({ journeys: [] });
    await flushStorage();
    await AsyncStorage.clear();
    expect(await restoreBackup(read.backup)).toEqual({ ok: true });
    expect(useJourneys.getState().journeys.map((j) => j.program)).toEqual([prev]);
    expect((await disk(JOURNEYS)).journeys).toHaveLength(1);
  });

  it('Delete my data removes past journeys too', async () => {
    useResetPilot.setState({ program: summited() });
    await startNewAscent(null);
    await flushStorage();
    const r = await deleteAllLocalData({ cancelReminders: async () => {}, removeTempFiles: () => {} });
    expect(r.ok).toBe(true);
    expect(useJourneys.getState().journeys).toEqual([]);
    expect(await AsyncStorage.getItem(JOURNEYS)).toBeNull();
  });

  it('a version 1 save opens unchanged under version 2', async () => {
    const p = summited();
    await AsyncStorage.setItem(KEY, JSON.stringify({ state: { program: p, devDayOffset: 0 }, version: 1 }));
    await useResetPilot.persist.rehydrate();
    expect(useResetPilot.getState().program).toEqual(p);
    expect(useRecovery.getState().pending).toBe(false);
  });
});
