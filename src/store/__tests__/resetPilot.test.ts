import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateForDay } from '../../core/dates';
import type { PilotAnswers, PilotChoice } from '../../core/reset/pilot';
import { readTrack } from '../../core/reset/tracking';
import type { Answers } from '../../core/types';
import { FIXTURES } from '../../core/v2/__tests__/fixtures';
import { previewPlan } from '../../core/v2/program';
import type { Channel } from '../../lib/flags';
import { pilotToday, resetPilotAvailable, resetPilotKey, sanitizeResetPilot, useResetPilot } from '../resetPilot';
import { useApp } from '../useApp';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// The build channel, switchable per test (a build has one; these tests play every build).
const mockChannel: { value: Channel } = { value: 'development' };
// (The pilot's store reads the channel as it loads, before this file's constants exist: development then.)
const ch = (): Channel => mockChannel?.value ?? 'development';
jest.mock('../../lib/flags', () => {
  const actual = jest.requireActual('../../lib/flags') as object;
  return {
    ...actual,
    channel: () => ch(),
    v2ForNewPrograms: () => ch() !== 'production',
    devTools: () => ch() === 'development',
  };
});

// Node built-ins under Jest (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  readFileSync(file: string, encoding: 'utf8'): string;
  readdirSync(dir: string): string[];
  statSync(p: string): { isDirectory(): boolean };
};
const SRC = `${process.cwd()}/src`;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const r = () => useResetPilot.getState();
const s = () => useApp.getState();
const ADULT: PilotAnswers = { age: '30_49', precautions: [], minutesPerDay: 90, strengthStart: 'sometimes' };
const ALL: PilotChoice[] = [
  { habitId: 'mind_read', intensity: 'standard' },
  { habitId: 'focus_deepwork', intensity: 'standard' },
  { habitId: 'strength_log', intensity: 'standard' },
];
const at = (day: number) => r().setDevDayOffset(day - 1);
const schwungSnapshot = () => {
  const { startedAt, plan, logs, programVersion, profile, notices, seenCeremonies, appliedPhase, answers } = s();
  return JSON.parse(
    JSON.stringify({ startedAt, plan, logs, programVersion, profile, notices, seenCeremonies, appliedPhase, answers }),
  );
};
const todayLog = () => r().program!.logs[dateForDay(r().program!.startedAt, pilotToday())];

function startV2() {
  const p = FIXTURES['C · 28, energy'];
  s().setProfile(p);
  const plan = previewPlan(p);
  if (plan.status !== 'ok') throw new Error('expected a plan');
  expect(s().startProgramV2(plan.options.slice(0, plan.choice?.required ?? 0).map((o) => o.id))).toBe(true);
}

beforeEach(async () => {
  mockChannel.value = 'development';
  r().end();
  s().restart();
  s().setDevDayOffset(0);
  s().setProfile(null);
  s().setAnswers(null as unknown as Answers);
  await wait(400);
});

describe('a separate, temporary pilot program', () => {
  it('has its own save key, beside Schwung’s and Field Notes’', () => {
    expect(resetPilotKey('development', true)).toBe('schwung-reset-pilot');
    expect(resetPilotKey('internal', true)).toBe('schwung-reset-pilot-internal');
    expect(resetPilotKey('internal', false)).toBe('schwung-reset-pilot');
    for (const other of [
      'schwung-state',
      'schwung-state-internal',
      'schwung-fieldnotes',
      'schwung-fieldnotes-internal',
    ])
      expect([resetPilotKey('development', true), resetPilotKey('internal', true)]).not.toContain(other);
  });

  it('starts, runs and ends without ever touching a running Schwung program or its save', async () => {
    startV2();
    s().toggleHabit(1, s().plan[0].habitId);
    await wait(400);
    const before = schwungSnapshot();
    const disk = await AsyncStorage.getItem('schwung-state');

    expect(r().start(ADULT, ALL)).toBe(true);
    expect(r().active).toBe(true);
    r().complete('mind_read');
    r().complete('focus_deepwork');
    r().setSession({ type: 'upper', minutes: 30 });
    at(8);
    r().complete('mind_read');
    r().harder('mind_read');
    await wait(400);
    expect(await AsyncStorage.getItem('schwung-reset-pilot')).toContain('"mind_read"');
    expect(schwungSnapshot()).toEqual(before);
    expect(await AsyncStorage.getItem('schwung-state')).toBe(disk);

    // Back to the program: the pilot is kept, the program is as it was.
    r().setActive(false);
    expect(r().program).not.toBeNull();
    expect(schwungSnapshot()).toEqual(before);
    // Ending deletes only the pilot.
    r().end();
    await wait(400);
    expect(r().program).toBeNull();
    expect(schwungSnapshot()).toEqual(before);
    expect(await AsyncStorage.getItem('schwung-state')).toBe(disk);
  });

  it('never starts over a running pilot, and never converts an existing program', () => {
    startV2();
    expect(r().start(ADULT, ALL)).toBe(true);
    const first = r().program;
    expect(r().start(ADULT, ALL.slice(0, 1))).toBe(false);
    expect(r().program).toBe(first);
    expect(s().programVersion).toBe(2);
    expect(s().plan.some((h) => h.habitId === 'strength_log')).toBe(false);
  });

  it('refuses a setup the eligibility or time rules don’t allow', () => {
    expect(r().start({ ...ADULT, precautions: ['heart'] }, ALL)).toBe(false);
    expect(r().start({ ...ADULT, age: '16_17' }, [{ habitId: 'strength_log', intensity: 'challenge' }])).toBe(false);
    expect(r().start({ ...ADULT, minutesPerDay: 60 }, ALL)).toBe(false);
    expect(r().start({ ...ADULT, age: 'u16' }, ALL.slice(0, 1))).toBe(false);
    expect(r().program).toBeNull();
  });

  it('can only be shown while it exists', () => {
    r().setActive(true);
    expect(r().active).toBe(false);
    r().start(ADULT, ALL);
    r().setActive(false);
    r().setActive(true);
    expect(r().active).toBe(true);
  });
});

describe('persistence and recovery', () => {
  async function relaunch() {
    await wait(400);
    const disk = await AsyncStorage.getItem('schwung-reset-pilot');
    useResetPilot.setState({ program: null, active: false });
    await wait(400);
    if (disk) await AsyncStorage.setItem('schwung-reset-pilot', disk);
    await useResetPilot.persist.rehydrate();
  }

  it('keeps progress, counters, details, pending changes and the Screen Time check across a restart', async () => {
    r().start({ ...ADULT, phone: '4_6', pullMinutes: 120 }, [
      ...ALL,
      { habitId: 'focus_top3', intensity: 'standard' },
      { habitId: 'screen_app_limit', intensity: 'starter' },
    ]);
    r().complete('mind_read');
    r().count('focus_top3', 1);
    r().setSession({ minutes: 25 });
    r().easier('strength_log');
    r().setScreenTime(95);
    const before = JSON.parse(JSON.stringify(r().program));
    await relaunch();
    expect(r().program).toEqual(before);
    expect(r().active).toBe(true);
    expect(readTrack(todayLog(), 'focus_top3').count).toBe(1);
    expect(r().program!.progression.strength_log.eras).toHaveLength(2);
    expect(r().program!.measures?.screen_app_limit).toBeDefined();
  });

  it('corrects yesterday only while it can still be edited (until noon), never older days', () => {
    r().start(ADULT, ALL);
    at(3);
    const noon = new Date();
    const clock = jest.spyOn(Date, 'now');
    // Morning: yesterday can be corrected; afternoon: it can't.
    jest.useFakeTimers({ now: new Date(noon.getFullYear(), noon.getMonth(), noon.getDate(), 9, 0) });
    r().toggle('mind_read', 2);
    expect(r().program!.logs[dateForDay(r().program!.startedAt, 2)]?.completed).toEqual(['mind_read']);
    r().toggle('mind_read', 1);
    expect(r().program!.logs[dateForDay(r().program!.startedAt, 1)]).toBeUndefined();
    jest.setSystemTime(new Date(noon.getFullYear(), noon.getMonth(), noon.getDate(), 15, 0));
    r().toggle('mind_read', 2);
    expect(r().program!.logs[dateForDay(r().program!.startedAt, 2)]?.completed).toEqual(['mind_read']);
    jest.useRealTimers();
    clock.mockRestore();
  });

  it('drops a damaged save rather than trusting it', () => {
    expect(sanitizeResetPilot({ active: true, program: { v: 1, startedAt: 'x' } })).toEqual({
      active: false,
      program: null,
    });
    expect(sanitizeResetPilot('nope')).toEqual({});
    expect(sanitizeResetPilot({ active: true, program: null, devDayOffset: 3 })).toEqual({
      active: false,
      program: null,
      devDayOffset: 3,
    });
  });
});

describe('builds', () => {
  it('internal builds have the pilot without developer tools (no time travel)', () => {
    mockChannel.value = 'internal';
    expect(resetPilotAvailable()).toBe(true);
    expect(r().start(ADULT, ALL)).toBe(true);
    r().setDevDayOffset(10);
    expect(r().devDayOffset).toBe(0);
    expect(pilotToday()).toBe(1);
  });

  it('production: no pilot — nothing can start, show or change one', () => {
    mockChannel.value = 'production';
    expect(resetPilotAvailable()).toBe(false);
    expect(r().start(ADULT, ALL)).toBe(false);
    r().setActive(true);
    expect([r().program, r().active]).toEqual([null, false]);
    // Even a pilot left in storage by a testing build is inert.
    mockChannel.value = 'development';
    r().start(ADULT, ALL);
    mockChannel.value = 'production';
    expect(r().complete('mind_read')).toBeNull();
    expect(todayLog()).toBeUndefined();
    r().setActive(true);
    expect(r().active).toBe(false);
  });

  it('reaches the app only through the gate, which a production bundle folds away', () => {
    const gate = fs.readFileSync(`${SRC}/store/pilotGate.ts`, 'utf8');
    expect(gate).toContain("__DEV__ || process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL === 'internal'");
    // Nothing outside the pilot imports its store or screens directly (only lazily, through the gate).
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const f of fs.readdirSync(dir)) {
        const p = `${dir}/${f}`;
        if (fs.statSync(p).isDirectory()) {
          if (f !== '__tests__') walk(p);
        } else if (/\.tsx?$/.test(f)) files.push(p.slice(SRC.length + 1));
      }
    };
    walk(SRC);
    const direct = files.filter(
      (f) =>
        !f.startsWith('components/pilot/') &&
        f !== 'store/pilotGate.ts' &&
        /from '[^']*(store\/resetPilot|components\/pilot\/|\.\/resetPilot)'/.test(
          fs.readFileSync(`${SRC}/${f}`, 'utf8'),
        ),
    );
    expect(direct).toEqual([]);
    // Every pilot route checks the gate before rendering.
    for (const route of ['app/pilot/setup.tsx', 'app/pilot/[id].tsx']) {
      const src = fs.readFileSync(`${SRC}/${route}`, 'utf8');
      expect([
        route,
        src.includes('if (!pilot || !pilot.store.resetPilotAvailable()) return <Redirect href="/" />;'),
      ]).toEqual([route, true]);
    }
    expect(fs.readFileSync(`${SRC}/app/(tabs)/today.tsx`, 'utf8')).toContain(
      'if (pilot && active) return <pilot.Today />;',
    );
    // Insights and Journey show the Life Reset only through the gate, too.
    expect(fs.readFileSync(`${SRC}/app/(tabs)/insights.tsx`, 'utf8')).toContain(
      '{pilot && lifeReset ? <pilot.Insights /> : <ProgramInsights />}',
    );
    expect(fs.readFileSync(`${SRC}/components/journeySource.ts`, 'utf8')).toContain(
      "if (reset && pilot) return { kind: 'reset', started: true, ...pilot.journey(reset.program, reset.today) };",
    );
  });

  it('keeps the card interactions: the same HabitCard, the page holding its scroll while a card is swiped', () => {
    const src = fs.readFileSync(`${SRC}/components/pilot/PilotToday.tsx`, 'utf8');
    expect(src).toContain('<HabitCard');
    expect(src).toContain('onSwipe={onSwipe}');
    expect(src).toContain('scrollEnabled={!swiping}');
    expect(src).toContain('directionalLockEnabled');
    // The card's own gesture code is shared, unchanged: a sideways drag on a card is the card's, never the pager's.
    expect(fs.readFileSync(`${SRC}/components/HabitCard.tsx`, 'utf8')).toContain('claimTouch();');
  });
});
