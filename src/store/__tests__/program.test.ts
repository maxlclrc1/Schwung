import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildPlan, toPlan } from '../../core/plan';
import { currentStreak, levelUpOffers, pendingCeremony, reconcile, totalXp } from '../../core/progression';
import type { Answers } from '../../core/types';
import { migrateSaved, STORAGE_VERSION } from '../migrate';
import { currentDay, useApp } from '../useApp';

// The library's own in-memory mock; require() is the documented way to load it in a mock factory.
jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const ANSWERS: Answers = {
  goal: 'calm',
  sleep: '6-7h',
  screen: '6-8h',
  exercise: 'rarely',
  water: '0.5-1L',
  mind: 'rarely',
};
const OTHER: Answers = { goal: 'fitness', sleep: '<5h', screen: '<2h', exercise: 'never', water: '3L+', mind: 'daily' };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const snapshot = () => {
  const { startedAt, answers, plan, logs, seenCeremonies, appliedPhase, notices } = useApp.getState();
  return JSON.parse(JSON.stringify({ startedAt, answers, plan, logs, seenCeremonies, appliedPhase, notices }));
};

beforeEach(() => {
  useApp.getState().restart();
});

describe('starting a program', () => {
  it('needs answers', () => {
    expect(useApp.getState().startProgram()).toBe(false);
    expect(useApp.getState().startedAt).toBeNull();
  });

  it('starts exactly the plan the reveal shows', () => {
    useApp.getState().setAnswers(ANSWERS);
    const shown = buildPlan(ANSWERS); // what reveal.tsx renders
    expect(useApp.getState().startProgram()).toBe(true);
    const { plan, startedAt } = useApp.getState();
    expect(startedAt).not.toBeNull();
    expect(plan).toEqual(toPlan(shown));
    expect(plan.map((h) => [h.habitId, h.level])).toEqual(shown.map((p) => [p.habit.id, p.level]));
  });

  it('a second start can never overwrite a running program (no data loss)', () => {
    const s = useApp.getState();
    s.setAnswers(ANSWERS);
    s.startProgram();
    const day = currentDay();
    useApp.getState().toggleHabit(day, useApp.getState().plan[0].habitId);
    useApp.getState().markCeremonySeen(1);
    const before = snapshot();
    expect(Object.keys(before.logs)).toHaveLength(1);

    // Back through onboarding: the same answers, then different ones.
    expect(useApp.getState().startProgram()).toBe(false);
    useApp.getState().setAnswers(OTHER);
    expect(useApp.getState().startProgram()).toBe(false);

    const after = snapshot();
    expect(after.startedAt).toBe(before.startedAt);
    expect(after.plan).toEqual(before.plan);
    expect(after.logs).toEqual(before.logs);
    expect(after.seenCeremonies).toEqual(before.seenCeremonies);
  });

  it('Settings → Restart still starts over on purpose', () => {
    const s = useApp.getState();
    s.setAnswers(ANSWERS);
    s.startProgram();
    useApp.getState().toggleHabit(currentDay(), useApp.getState().plan[0].habitId);
    useApp.getState().setReminder('07:15', true);
    useApp.getState().setThemePreference('light');

    useApp.getState().restart();
    expect(useApp.getState().startedAt).toBeNull();
    expect(useApp.getState().logs).toEqual({});
    // Device preferences survive a restart, as before.
    expect(useApp.getState().reminderTime).toBe('07:15');
    expect(useApp.getState().themePreference).toBe('light');

    useApp.getState().setAnswers(OTHER);
    expect(useApp.getState().startProgram()).toBe(true);
    expect(useApp.getState().plan).toEqual(toPlan(buildPlan(OTHER)));
    expect(useApp.getState().logs).toEqual({});
  });

  it('leaves a saved program from an earlier version untouched', async () => {
    const saved = {
      state: {
        startedAt: '2026-09-01',
        answers: ANSWERS,
        plan: [{ habitId: 'water', level: 'medium', addedOnDay: 1, levelSince: 21 }],
        logs: { '2026-09-01': { day: 1, date: '2026-09-01', completed: ['water'], planned: ['water'] } },
        reminderTime: '20:00',
        notificationsEnabled: false,
        seenCeremonies: [1, 7, 21],
        appliedPhase: 2,
        notices: [],
        devDayOffset: 0,
      },
      version: 1,
    };
    await wait(400); // let earlier coalesced writes (250 ms) land first
    await AsyncStorage.setItem('schwung-state', JSON.stringify(saved));
    await useApp.persist.rehydrate();
    const before = snapshot();
    expect(useApp.getState().startProgram()).toBe(false);
    expect(snapshot()).toEqual(before);
    expect(before.logs).toEqual(saved.state.logs);
  });
});

describe('damaged saves', () => {
  const start = '2026-03-01';
  const good = () => ({
    startedAt: start,
    answers: ANSWERS,
    plan: toPlan(buildPlan(ANSWERS)),
    logs: {
      [start]: { day: 1, date: start, planned: ['a', 'b'], completed: ['a', 'b'] },
      '2026-03-02': { day: 2, date: '2026-03-02', planned: ['a', 'b'], completed: ['a'] },
    },
    seenCeremonies: [1],
    appliedPhase: 1,
    notices: [],
  });
  const load = (patch: Record<string, unknown>) => migrateSaved({ ...good(), ...patch }, STORAGE_VERSION);

  it('a damaged field never blanks the app: the store loads it and every Today calculation runs', async () => {
    const cases: Record<string, unknown>[] = [
      { plan: null },
      { plan: [null, { level: 'easy' }, ...good().plan] },
      { logs: null },
      { logs: { [start]: null } },
      { logs: { [start]: { day: 1, planned: ['a'] } } },
      { seenCeremonies: null },
      { notices: null },
      { notices: [{ id: 'x', kind: 'stepDown' }] },
      { startedAt: 'yesterday' },
      { appliedPhase: 'two' },
      { reminderTime: 7, themePreference: 'blue', notificationsEnabled: 'yes' },
    ];
    for (const patch of cases) {
      await wait(400); // the store's own pending write lands first
      await AsyncStorage.setItem('schwung-state', JSON.stringify({ state: { ...good(), ...patch }, version: 2 }));
      await useApp.persist.rehydrate();
      const st = useApp.getState();
      expect(() => {
        const today = currentDay(st);
        reconcile({
          plan: st.plan,
          appliedPhase: st.appliedPhase,
          startKey: st.startedAt!,
          logs: st.logs,
          today,
          yesterdayEditable: false,
        });
        totalXp(st.logs);
        currentStreak(st.logs, st.startedAt!, today);
        levelUpOffers(st.plan, st.logs, st.startedAt!, today);
        pendingCeremony(st.seenCeremonies, today, false, false);
        st.notices.forEach((n) => (n.kind === 'stepDown' ? n.habitIds.length : n.phase));
      }).not.toThrow();
      expect([patch, typeof st.startedAt, Array.isArray(st.plan), typeof st.reminderTime]).toEqual([
        patch,
        'string',
        true,
        'string',
      ]);
    }
  });

  it('repairs from what is left, without losing a valid day or replaying a level-up', () => {
    // A lost start date comes back from the days' own numbers; the days keep their lists.
    expect(load({ startedAt: 42 }).startedAt).toBe(start);
    expect(load({ startedAt: 42 }).logs).toEqual(good().logs);
    // A lost plan is rebuilt from the latest day's list, at Easy.
    expect(
      (load({ plan: null }).plan as { habitId: string; level: string }[]).map((h) => [h.habitId, h.level]),
    ).toEqual([
      ['a', 'easy'],
      ['b', 'easy'],
    ]);
    // Bad entries: no id is dropped, a duplicate is dropped, an unknown level is Easy (never higher).
    const plan = load({
      plan: [null, { level: 'hard' }, { habitId: 'x', level: 'ultra' }, { habitId: 'x', level: 'hard' }],
    }).plan as { habitId: string; level: string; addedOnDay: number; levelSince: number }[];
    expect(plan).toEqual([{ habitId: 'x', level: 'easy', addedOnDay: 1, levelSince: 0 }]);
    // A day without lists keeps the one it has; its number comes from its date.
    const logs = load({ logs: { '2026-03-05': { planned: ['a'] } } }).logs as Record<string, unknown>;
    expect(logs['2026-03-05']).toEqual({ day: 5, date: '2026-03-05', planned: ['a'], completed: [] });
    // A damaged phase is the one the logged days reached, so Day 22 isn't applied again on day 30.
    const late = { '2026-03-30': { day: 30, date: '2026-03-30', planned: ['a'], completed: ['a'] } };
    expect(load({ appliedPhase: null, logs: late }).appliedPhase).toBe(2);
    // Ceremonies already passed aren't replayed.
    expect(load({ seenCeremonies: 'all', logs: late }).seenCeremonies).toEqual([1, 7, 21]);
    // Valid saves come through unchanged.
    const ok = good();
    expect(load({})).toEqual({ ...ok, programVersion: 1, profile: null });
  });
});
