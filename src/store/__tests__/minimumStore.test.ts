import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildExport } from '../../core/dataExport';
import { readBackup } from '../../core/dataImport';
import { dateForDay, PROGRAM_DAYS } from '../../core/dates';
import { DEFAULT_REMINDERS } from '../../core/reminders';
import * as P from '../../core/reset/pilot';
import type { Channel } from '../../lib/flags';
import { startNewAscent } from '../ascent';
import { JOURNEYS_VERSION, sanitizeJourneys, useJourneys } from '../journeys';
import { useRecovery } from '../recovery';
import { migrateSave, pilotToday, RESET_PILOT_VERSION, useResetPilot } from '../resetPilot';
import { flushStorage } from '../storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/*
 * Minimum Effort in the store (R2b): the launch switch, journeys store v2 (older Schwungs hold it rather than recount
 * a journey without its kept days), and backups with genuine and forged minimums.
 */

// The build channel, switchable per test (as store/__tests__/resetPilot.test.ts does).
const mockChannel: { value: Channel } = { value: 'development' };
const ch = (): Channel => mockChannel?.value ?? 'development';
jest.mock('../../lib/flags', () => {
  const actual = jest.requireActual('../../lib/flags') as { minimumEffort: (c: Channel, l: boolean) => boolean };
  return {
    ...actual,
    channel: () => ch(),
    devTools: () => ch() === 'development',
    // These tests play a build before launch, whatever the switch says (minimumLaunch.test.ts guards the switch).
    minimumEffort: () => actual.minimumEffort(ch(), false),
  };
});

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const r = () => useResetPilot.getState();
const JOURNEYS = 'schwung-journeys';
const ANSWERS: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 90,
  skill: 'Language',
  wake: { kind: 'time', time: '07:00' },
};
const FORMAT = { version: RESET_PILOT_VERSION, migrate: migrateSave };

beforeEach(async () => {
  mockChannel.value = 'development';
  useRecovery.setState({ pending: false, reason: null, recovered: null, lost: [], raw: null, keptAt: null });
  useJourneys.setState({ journeys: [], held: false });
  r().end();
  await flushStorage().catch(() => {});
  await AsyncStorage.clear();
});

describe('the launch switch', () => {
  const start = () =>
    r().start(ANSWERS, [
      { habitId: 'mind_read', intensity: 'starter' },
      { habitId: 'sleep_wake', intensity: 'starter' },
    ]);

  it('development and internal builds record a minimum today, and remove it', () => {
    for (const c of ['development', 'internal'] as const) {
      mockChannel.value = c;
      r().end();
      expect(start()).toBe(true);
      r().setMinimum('mind_read', true);
      const today = pilotToday();
      expect([P.minimumOn(r().program!, 'mind_read', today), P.pilotXp(r().program!)]).toEqual([true, 5]);
      r().setMinimum('mind_read', false);
      expect([P.minimumOn(r().program!, 'mind_read', today), P.pilotXp(r().program!)]).toEqual([false, 0]);
    }
  });

  it('never where there’s no minimum (Sleep), whatever the build', () => {
    expect(start()).toBe(true);
    const before = r().program;
    r().setMinimum('sleep_wake', true);
    expect(r().program).toBe(before);
  });

  it('a production build (normal users) can’t record one, but still shows and can remove one already saved', () => {
    expect(start()).toBe(true);
    r().setMinimum('mind_read', true); // e.g. recorded in a tester build, then restored
    mockChannel.value = 'production';
    const today = pilotToday();
    r().setMinimum('mind_read', false);
    expect(P.minimumOn(r().program!, 'mind_read', today)).toBe(false);
    const before = r().program;
    r().setMinimum('mind_read', true);
    expect(r().program).toBe(before);
    expect(P.pilotXp(r().program!)).toBe(0);
  });
});

/** A finished Life Reset, kept with minimums on some days (Days 3, 13, …, 63). */
function summited(): P.PilotProgram {
  const ids = ['mind_read', 'outdoor_time'];
  let p = P.createPilot(
    ANSWERS,
    ids.map((habitId) => ({ habitId, intensity: 'starter' as const })),
    '2026-01-05',
  )!;
  for (let d = 1; d <= PROGRAM_DAYS; d++)
    p =
      d % 10 === 3
        ? ids.reduce((q, id) => P.setMinimum(q, id, d, true).program, p) // kept: minimums alone
        : ids.reduce((q, id) => P.complete(q, id, d).program, p);
  return { ...p, ceremonies: { day1: true, summit: true } };
}
const nextFrom = (prev: P.PilotProgram) =>
  P.beginAscent(prev, ANSWERS, P.ascentDefaults(prev, 67).choices, [], dateForDay('2026-01-05', 67), 67, 7)!;

describe('past journeys: store version 2', () => {
  it('is version 2, written as 2, and an archived journey keeps its kept days through a reload', async () => {
    expect(JOURNEYS_VERSION).toBe(2);
    const prev = summited();
    expect(P.journeyStats(prev, PROGRAM_DAYS).kept).toBe(7);
    useResetPilot.setState({ program: prev });
    expect(await startNewAscent(nextFrom(prev))).toEqual({ ok: true });
    const disk = JSON.parse((await AsyncStorage.getItem(JOURNEYS))!);
    expect(disk.version).toBe(2);
    // Read back from disk as a launch does.
    const kept = sanitizeJourneys(disk.state.journeys)![0].program;
    expect(P.journeyStats(kept, PROGRAM_DAYS)).toEqual(P.journeyStats(prev, PROGRAM_DAYS));
  });

  it('a version 1 store (before minimums) loads unchanged', async () => {
    const prev = summited();
    const v1 = { v: 1, id: 'ascent-1-2026-01-05', archivedAt: '2026-03-12T08:00:00.000Z', program: prev };
    await AsyncStorage.setItem(JOURNEYS, JSON.stringify({ state: { journeys: [v1] }, version: 1 }));
    await useJourneys.persist.rehydrate();
    await wait(20);
    expect(useJourneys.getState().held).toBe(false);
    expect(useJourneys.getState().journeys).toEqual([{ ...v1, program: P.sanitizePilotProgram(prev) }]);
  });

  it('a store from a newer Schwung is held for recovery, never read (as a v1 Schwung now holds a v2 one)', async () => {
    const raw = JSON.stringify({ state: { journeys: [] }, version: JOURNEYS_VERSION + 1 });
    await AsyncStorage.setItem(JOURNEYS, raw);
    await useJourneys.persist.rehydrate();
    await wait(20);
    expect(useJourneys.getState().held).toBe(true);
    expect(await AsyncStorage.getItem(JOURNEYS)).toBe(raw);
  });
});

describe('backups', () => {
  const exported = (program: P.PilotProgram, journeys: P.ArchivedJourney[] = []) =>
    JSON.stringify(
      buildExport({
        program,
        saveVersion: RESET_PILOT_VERSION,
        journeys,
        today: 10,
        themePreference: 'dark',
        reminders: DEFAULT_REMINDERS,
        comebacks: true,
        recoveryCopies: [],
        now: new Date('2026-11-12T09:00:00Z'),
      }),
    );

  it('a backup with minimums, and a past journey with them, restores every number', () => {
    const prev = summited();
    const next = P.setMinimum(nextFrom(prev), 'mind_read', 1, true).program;
    const j = { v: 1 as const, id: 'ascent-1-2026-01-05', archivedAt: '2026-03-12T08:00:00.000Z', program: prev };
    const b = readBackup(exported(next, [j]), FORMAT);
    if (!b.ok) throw new Error(b.problem);
    expect(P.pilotXp(b.backup.program!)).toBe(P.pilotXp(next));
    expect(P.minimumsOn(b.backup.program!, 1)).toEqual(['mind_read']);
    expect(P.journeyStats(b.backup.journeys[0].program, PROGRAM_DAYS)).toEqual(P.journeyStats(prev, PROGRAM_DAYS));
  });

  it('an edited backup: a forged minimum is kept in the record but never counted', () => {
    const p = P.createPilot(
      { ...ANSWERS, wake: { kind: 'time', time: '07:00' } },
      [
        { habitId: 'sleep_wake', intensity: 'starter' },
        { habitId: 'eat_well', intensity: 'starter' },
      ],
      '2026-11-02',
    )!;
    const key = dateForDay(p.startedAt, 1);
    const forged: P.PilotProgram = {
      ...p,
      logs: {
        [key]: {
          day: 1,
          date: key,
          completed: [],
          planned: P.plannedOn(p, 1, []),
          track: { sleep_wake: { v: 1, minimum: true }, eat_well: { v: 1, minimum: true } },
        },
      },
    };
    const b = readBackup(exported(forged), FORMAT);
    if (!b.ok) throw new Error(b.problem);
    const restored = b.backup.program!;
    expect(P.trackOf(restored, 'sleep_wake', 1).minimum).toBe(true);
    expect([P.minimumsOn(restored, 1), P.dayOutcome(restored, 1), P.pilotXp(restored)]).toEqual([[], 'missed', 0]);
  });
});
