import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateForDay } from '../../core/dates';
import { habitTitle } from '../../core/habits';
import { totalXp } from '../../core/progression';
import type { Answers } from '../../core/types';
import { FIXTURES } from '../../core/v2/__tests__/fixtures';
import { addableHabits, extraOptions, extraRoom, PLAN_MAX, previewPlan } from '../../core/v2/program';
import { currentDay, useApp } from '../useApp';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const s = () => useApp.getState();
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const C = FIXTURES['C · 28, energy'];
const at = (day: number) => {
  s().setDevDayOffset(day - 1);
  s().reconcileNow(false);
};

function startV2(p = C, extras: string[] = []) {
  s().setProfile(p);
  const r = previewPlan(p);
  if (r.status !== 'ok') throw new Error('expected a plan');
  return s().startProgramV2(
    r.options.slice(0, r.choice?.required ?? 0).map((o) => o.id),
    extras,
  );
}

beforeEach(() => {
  s().restart();
  s().setDevDayOffset(0);
});

describe('adding a reviewed habit to a running V2 program', () => {
  it('adds it at Foundation from today; past days, XP and the program version stay as they were', () => {
    expect(startV2()).toBe(true);
    for (let d = 1; d <= 9; d++) {
      at(d);
      for (const h of s().plan) s().toggleHabit(d, h.habitId);
    }
    at(10);
    const logs = JSON.parse(JSON.stringify(s().logs));
    const xp = totalXp(s().logs);
    const o = addableHabits(C, s().plan)[0];
    expect(s().addLibraryHabit(o.id)).toBe(true);
    const h = s().plan.find((x) => x.habitId === o.id)!;
    expect(h).toMatchObject({ level: 'easy', addedOnDay: 10, levelSince: 9 });
    expect(habitTitle(h)).toBe(o.title);
    expect(s().logs).toEqual(logs);
    expect(totalXp(s().logs)).toBe(xp);
    expect(s().programVersion).toBe(2);
    // Today's list takes it once something is checked today.
    s().toggleHabit(10, s().plan[0].habitId);
    expect(s().logs[dateForDay(s().startedAt!, 10)].planned).toContain(o.id);
    expect(s().logs[dateForDay(s().startedAt!, 9)].planned).not.toContain(o.id);
  });

  it('refuses duplicates, held or prototype habits, anything over 6, and V1 programs', () => {
    expect(startV2()).toBe(true);
    const first = addableHabits(C, s().plan)[0].id;
    expect(s().addLibraryHabit(first)).toBe(true);
    expect(s().addLibraryHabit(first)).toBe(false);
    expect(s().addLibraryHabit('move_strength_prep')).toBe(false);
    expect(s().addLibraryHabit('move_balance')).toBe(false);
    expect(s().addLibraryHabit('discipline_bed')).toBe(false);
    while (s().plan.length < PLAN_MAX) {
      const next = addableHabits(C, s().plan)[0];
      if (!next) break;
      expect(s().addLibraryHabit(next.id)).toBe(true);
    }
    expect(s().plan.length).toBeLessThanOrEqual(PLAN_MAX);
    if (s().plan.length === PLAN_MAX) {
      expect(addableHabits(C, s().plan)).toEqual([]);
      expect(s().addLibraryHabit('mind_read')).toBe(false);
    }

    s().restart();
    s().setAnswers({
      goal: 'calm',
      sleep: '6-7h',
      screen: '6-8h',
      exercise: 'rarely',
      water: '0.5-1L',
      mind: 'rarely',
    } as Answers);
    expect(s().startProgram()).toBe(true);
    const v1 = JSON.parse(JSON.stringify(s().plan));
    expect(s().addLibraryHabit('mind_read')).toBe(false);
    expect(s().plan).toEqual(v1);
  });

  it('an added habit follows the existing rules: rises at the next phase only if added before it, swaps and removal work', () => {
    expect(startV2()).toBe(true);
    at(30);
    const o = addableHabits(C, s().plan)[0];
    expect(s().addLibraryHabit(o.id)).toBe(true);
    at(45);
    expect(s().plan.find((h) => h.habitId === o.id)!.level).toBe('medium'); // Mastery lifts it one step
    expect(s().removeHabit(o.id)).toBe(true);
    expect(s().plan.some((h) => h.habitId === o.id)).toBe(false);

    s().restart();
    expect(startV2()).toBe(true);
    at(22);
    const late = addableHabits(C, s().plan)[0];
    expect(s().addLibraryHabit(late.id)).toBe(true);
    at(23);
    expect(s().plan.find((h) => h.habitId === late.id)!.level).toBe('easy'); // added on Day 22: not raised that day
  });
});

describe('adding a habit that needs a time answer', () => {
  // B's plan never asks for a wake-up time; Steady wake-up needs one.
  const B = { ...FIXTURES['B · 19, confidence'], wake: undefined, inBed: undefined };

  it('without the answer nothing is added or saved; with it, only the habit and the missing answer are', async () => {
    expect(startV2(B)).toBe(true);
    at(12);
    for (const h of s().plan) s().toggleHabit(12, h.habitId);
    const o = addableHabits(s().profile!, s().plan).find((x) => x.id === 'sleep_wake');
    expect(o?.needsTime).toBe('wake');
    if (!o) return;
    const before = JSON.parse(JSON.stringify({ plan: s().plan, logs: s().logs, profile: s().profile }));
    // Back, Cancel or an unsuitable answer: the add isn't made, so nothing changes.
    expect(s().addLibraryHabit(o.id)).toBe(false);
    expect(s().addLibraryHabit(o.id, { wake: { kind: 'shift' } })).toBe(false);
    expect(JSON.parse(JSON.stringify({ plan: s().plan, logs: s().logs, profile: s().profile }))).toEqual(before);
    expect(s().addLibraryHabit(o.id, { wake: { kind: 'time', time: '06:30' } })).toBe(true);
    const added = s().plan.find((h) => h.habitId === o.id)!;
    expect(added).toMatchObject({ level: 'easy', addedOnDay: 12 });
    expect(added.spec!.targets.easy).toMatch(/06:30/);
    expect(s().plan.slice(0, before.plan.length)).toEqual(before.plan); // existing habits and targets untouched
    expect(s().logs[dateForDay(s().startedAt!, 11)]).toEqual(before.logs[dateForDay(s().startedAt!, 11)]);
    expect(s().profile!.wake).toBeDefined();
    expect({ ...s().profile, wake: undefined }).toEqual({ ...before.profile, wake: undefined });
    expect(s().programVersion).toBe(2);
    // A saved answer is never replaced by a later one.
    const wake = s().profile!.wake;
    const next = addableHabits(s().profile!, s().plan).find((x) => x.needsTime === null);
    if (next) s().addLibraryHabit(next.id, { wake: { kind: 'varies' } });
    expect(s().profile!.wake).toEqual(wake);
    await wait(10);
  });
});

describe('optional extras at the start', () => {
  it('start with the extras picked, after the recommended plan, which itself is unchanged', () => {
    const r = previewPlan(C);
    if (r.status !== 'ok') throw new Error();
    const chosen = r.options.slice(0, r.choice?.required ?? 0).map((o) => o.id);
    expect(startV2()).toBe(true);
    const base = JSON.parse(JSON.stringify(s().plan));
    s().restart();
    if (extraRoom(r, chosen) === 0) return;
    const extra = extraOptions(C, r, chosen).find((o) => o.needsTime === null)!;
    expect(startV2(C, [extra.id])).toBe(true);
    expect(s().plan.slice(0, base.length)).toEqual(base);
    expect(s().plan[base.length]).toMatchObject({ habitId: extra.id, level: 'easy', addedOnDay: 1 });
  });

  it('a start with an extra that isn’t on offer is refused, and nothing starts', () => {
    expect(startV2(C, ['move_strength_prep'])).toBe(false);
    expect(s().startedAt).toBeNull();
  });
});

describe('existing programs keep their wording', () => {
  it('a saved V2 program with the old names and journal wording loads exactly as saved', async () => {
    const start = dateForDay(new Date().toISOString().slice(0, 10), 1);
    const old = {
      habitId: 'focus_deepwork',
      level: 'medium',
      addedOnDay: 1,
      levelSince: 21,
      spec: {
        title: 'Deep work',
        icon: 'flash',
        why: 'One protected block of focus.',
        targets: {
          easy: '15 min of focused work, phone in another room',
          medium: '25 min of focused work, phone in another room',
          hard: '45 min of focused work, phone in another room',
        },
        notes: [],
      },
    };
    const journal = {
      ...old,
      habitId: 'mind_journal',
      spec: {
        ...old.spec,
        title: 'Journal',
        targets: {
          easy: 'Write 1 sentence: what went well, what’s on your mind',
          medium: 'Write 2 sentences: what went well, what’s on your mind',
          hard: 'Write 3 sentences: what went well, what’s on your mind',
        },
      },
    };
    await wait(400);
    await AsyncStorage.setItem(
      'schwung-state',
      JSON.stringify({
        state: { startedAt: start, plan: [old, journal], logs: {}, programVersion: 2, profile: C },
        version: 2,
      }),
    );
    await useApp.persist.rehydrate();
    expect(s().plan).toEqual([old, journal]);
    expect(habitTitle(s().plan[0])).toBe('Deep work');
    expect(currentDay()).toBeGreaterThanOrEqual(1);
  });
});
