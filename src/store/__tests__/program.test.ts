import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildPlan, toPlan } from '../../core/plan';
import type { Answers } from '../../core/types';
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
