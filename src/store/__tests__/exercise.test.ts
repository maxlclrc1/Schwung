import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateForDay } from '../../core/dates';
import { buildPlan, toPlan } from '../../core/plan';
import { dayQualifies } from '../../core/progression';
import { isDueOn, weekdayOfDay } from '../../core/schedule';
import type { Answers, PlanHabit, Weekday } from '../../core/types';
import { FIXTURES } from '../../core/v2/__tests__/fixtures';
import { startSim, PERSONAS } from '../../core/v2/exercisePreview';
import { getHabit } from '../../core/habits';
import { EXERCISE_IDS } from '../../core/v2/exercise';
import { migrateSaved, sanitize } from '../migrate';
import { useApp } from '../useApp';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// Node built-ins under Jest (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  readdirSync(dir: string): string[];
  readFileSync(file: string, encoding: 'utf8'): string;
  statSync(path: string): { isDirectory(): boolean };
};
const SRC = `${process.cwd()}/src`;
const files = (dir: string): string[] =>
  fs.readdirSync(dir).flatMap((f) => {
    const full = `${dir}/${f}`;
    return fs.statSync(full).isDirectory() ? (f === '__tests__' ? [] : files(full)) : [full];
  });

const KEY = 'schwung-state';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const s = () => useApp.getState();
const at = (day: number) => s().setDevDayOffset(day - 1);
const log = (day: number) => s().logs[dateForDay(s().startedAt!, day)];
const C = FIXTURES['C · 28, energy'];

/**
 * A real V2 program with an exercise habit injected, as a future release would add it. Nothing in the app can
 * do this today: these tests check the safeguards hold if it ever happens.
 */
function withExercise(id: 'move_strength_prep' | 'move_seated', days?: Weekday[]): PlanHabit {
  s().setProfile(C);
  expect(s().startProgramV2([])).toBe(true);
  const sim = startSim(
    id,
    id === 'move_seated'
      ? { ...PERSONAS[5].profile, exerciseCheck: { dizziness: 'no', recentSurgery: 'no', clinicianLimit: 'no' } }
      : PERSONAS[1].profile,
    days,
  )!;
  const h = sim.plan[1];
  useApp.setState({ plan: [...s().plan, h] });
  return h;
}

beforeEach(() => {
  s().restart();
  s().setDevDayOffset(0);
});

describe('level-ups need the self-check for exercise habits only', () => {
  it('refuses an exercise level-up without it, and leaves other habits as before', () => {
    const h = withExercise('move_seated');
    expect(s().acceptLevelUp(h.habitId)).toBe(false);
    expect(s().plan.find((x) => x.habitId === h.habitId)!.level).toBe('easy');
    expect(s().acceptLevelUp(h.habitId, true)).toBe(true);
    expect(s().plan.find((x) => x.habitId === h.habitId)!.level).toBe('medium');
    expect(s().acceptLevelUp('move_walk')).toBe(true);
  });
});

describe('rest today', () => {
  it('is only for exercise habits on their due days; a rested session isn’t planned, done or missed', () => {
    const h = withExercise('move_seated');
    expect(s().restToday('discipline_bed', true)).toBe(false);
    s().toggleHabit(1, h.habitId);
    expect(s().restToday(h.habitId, true)).toBe(true);
    expect(log(1).rested).toEqual([h.habitId]);
    expect(log(1).planned).not.toContain(h.habitId);
    expect(log(1).completed).not.toContain(h.habitId);
    // The day can still count without it: 4 of 5 other habits.
    s()
      .plan.filter((x) => x.habitId !== h.habitId)
      .slice(0, 4)
      .forEach((x) => s().toggleHabit(1, x.habitId));
    expect(dayQualifies(log(1))).toBe(true);
    // Undo.
    expect(s().restToday(h.habitId, false)).toBe(true);
    expect(log(1).rested).toBeUndefined();
    expect(log(1).planned).toContain(h.habitId);
  });

  it('isn’t possible on a scheduled habit’s rest day', () => {
    const h = withExercise('move_strength_prep', [1, 4]);
    const start = s().startedAt!;
    let d = 1;
    while ([1, 4].includes(weekdayOfDay(start, d))) d++;
    at(d);
    expect(s().restToday(h.habitId, true)).toBe(false);
  });
});

describe('schedules, swaps and removal', () => {
  it('strength days must not be next to each other', () => {
    const h = withExercise('move_strength_prep', [1, 4]);
    expect(s().setSchedule(h.habitId, [2, 3])).toBe(false);
    expect(s().setSchedule(h.habitId, [0, 6])).toBe(false);
    expect(s().setSchedule(h.habitId, [2, 5])).toBe(true);
  });

  it('a V2 swap never brings in a prototype, and an exercise habit can be removed like any other', () => {
    const h = withExercise('move_strength_prep', [1, 4]);
    expect(s().swapHabitV2('move_walk', 'move_strength_gentle')).toBe(false);
    expect(s().swapHabitV2('move_walk', 'move_balance')).toBe(false);
    expect(s().removeHabit(h.habitId)).toBe(true);
    expect(s().plan.some((x) => x.habitId === h.habitId)).toBe(false);
  });
});

describe('saved data', () => {
  it('rest records survive a restart; damaged ones are dropped without touching the day', async () => {
    const h = withExercise('move_seated');
    s().restToday(h.habitId, true);
    await wait(400);
    const disk = await AsyncStorage.getItem(KEY);
    const before = JSON.parse(JSON.stringify(s().logs));
    useApp.setState({ logs: {} });
    await wait(400);
    await AsyncStorage.setItem(KEY, disk!);
    await useApp.persist.rehydrate();
    expect(s().logs).toEqual(before);

    const date = '2026-01-01';
    const day = { day: 1, date, planned: ['a'], completed: ['a'] };
    const out = migrateSaved({ logs: { [date]: { ...day, rested: 'yes' }, x: { ...day, rested: ['b'] } } }, 2)
      .logs as Record<string, unknown>;
    expect(out[date]).toEqual(day);
    expect(out.x).toEqual({ ...day, rested: ['b'] });
  });

  it('V1 programs are untouched', () => {
    const answers: Answers = {
      goal: 'fitness',
      sleep: '6-7h',
      screen: '2-4h',
      exercise: 'never',
      water: '1-2L',
      mind: 'never',
    };
    s().setAnswers(answers);
    s().startProgram();
    expect(s().plan).toEqual(toPlan(buildPlan(answers)));
    expect(s().plan.some((h) => h.habitId.startsWith('move_strength') || h.habitId === 'move_balance')).toBe(false);
  });
});

describe('development-only access', () => {
  it('the Exercise Preview screen and the Developer tools need the development channel', () => {
    const src = fs.readFileSync(`${SRC}/app/dev/exercise.tsx`, 'utf8');
    expect(src).toMatch(/if \(!__DEV__ \|\| !devTools\(\)\) return <Redirect href="\/" \/>;/);
    expect(fs.readFileSync(`${SRC}/app/settings.tsx`, 'utf8')).toMatch(
      /\{__DEV__ && devTools\(\) \? <DevTools \/> : null\}/,
    );
  });

  it('only the development screen reaches the preview gate or the mock program', () => {
    for (const f of [...files(`${SRC}/app`), ...files(`${SRC}/store`), ...files(`${SRC}/components`)]) {
      const src = fs.readFileSync(f, 'utf8');
      const usesPreview = /EXERCISE_PREVIEW_GATE|exercisePreview'/.test(src);
      expect([f, usesPreview]).toEqual([f, f.endsWith('app/dev/exercise.tsx')]);
    }
  });

  it('V1 has no exercise habit to plan or swap to', () => {
    for (const id of EXERCISE_IDS) expect(getHabit(id)).toBeUndefined();
    s().setAnswers({ goal: 'fitness', sleep: '6-7h', screen: '2-4h', exercise: 'never', water: '1-2L', mind: 'never' });
    s().startProgram();
    const before = s().plan;
    s().swapHabit(before[0].habitId, 'move_strength_prep');
    expect(s().plan).toEqual(before);
  });

  it('a release build drops development-only habits from a save, keeping every past day', () => {
    const h = withExercise('move_seated');
    expect(s().addDevScheduledHabit([1, 3])).not.toBeNull();
    s()
      .plan.filter((x) => isDueOn(x, s().startedAt!, 1))
      .forEach((x) => s().toggleHabit(1, x.habitId));
    const saved = JSON.parse(JSON.stringify({ plan: s().plan, logs: s().logs, programVersion: 2, profile: C }));
    const release = sanitize(saved, true);
    const ids = (release.plan as PlanHabit[]).map((x) => x.habitId);
    expect(ids).not.toContain(h.habitId);
    expect(ids.some((id) => id.startsWith('devsched_'))).toBe(false);
    expect(ids).toEqual(
      saved.plan
        .map((x: PlanHabit) => x.habitId)
        .filter((id: string) => id !== h.habitId && !id.startsWith('devsched_')),
    );
    expect(release.logs).toEqual(saved.logs);
    // Development builds keep them.
    expect((sanitize(saved, false).plan as PlanHabit[]).length).toBe(saved.plan.length);
  });
});
