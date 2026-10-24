import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateForDay, toDateKey } from '../../core/dates';
import { habitTask, habitTaskAt, habitTitle } from '../../core/habits';
import { buildPlan, toPlan } from '../../core/plan';
import { dayQualifies, levelUpOffers, LEVEL_UP_RUN, totalXp } from '../../core/progression';
import type { Answers, PlanHabit } from '../../core/types';
import { FIXTURES } from '../../core/v2/__tests__/fixtures';
import { DEV_CLEARED } from '../../core/v2/gate';
import { previewPlan, swapChoices } from '../../core/v2/program';
import type { ProfileV2 } from '../../core/v2/types';
import { v2PreviewEnabled } from '../../lib/flags';
import { migrateSaved } from '../migrate';
import { currentDay, useApp } from '../useApp';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KEY = 'schwung-state';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ANSWERS: Answers = {
  goal: 'calm',
  sleep: '6-7h',
  screen: '6-8h',
  exercise: 'rarely',
  water: '0.5-1L',
  mind: 'rarely',
};
const C = FIXTURES['C · 28, energy'];
const G1: ProfileV2 = { ...FIXTURES['G1 · healthy, fitness'], wake: { kind: 'time', time: '07:00' } };

const s = () => useApp.getState();

/** Starts a V2 program the way the plan screen does, choosing the first options that fit. */
function startV2(p: ProfileV2) {
  s().setDevV2Preview(true);
  s().setProfile(p);
  const r = previewPlan(p);
  if (r.status !== 'ok') throw new Error('expected a plan');
  const chosen = r.options.slice(0, r.choice?.required ?? 0).map((o) => o.id);
  return { r, ok: s().startProgramV2(chosen) };
}

/** Days 1..n with every planned habit done (as Today would record them). */
function completeDays(from: number, to: number) {
  for (let d = from; d <= to; d++) {
    s().setDevDayOffset(d - 1);
    for (const h of s().plan) s().toggleHabit(d, h.habitId);
  }
}

/** A cold start: whatever is on disk now is what the next launch loads, after memory is wiped. */
async function coldStart() {
  await wait(400); // coalesced writes land
  const disk = await AsyncStorage.getItem(KEY);
  useApp.setState({ plan: [], logs: {}, profile: null, programVersion: 1, startedAt: null });
  await wait(400);
  await AsyncStorage.setItem(KEY, disk!);
  await useApp.persist.rehydrate();
}

async function loadSaved(saved: unknown) {
  await wait(400); // let earlier coalesced writes land first
  await AsyncStorage.setItem(KEY, JSON.stringify(saved));
  await useApp.persist.rehydrate();
}

beforeEach(() => {
  s().restart();
  s().setDevV2Preview(false);
  s().setDevDayOffset(0);
});

afterEach(() => {
  s().setDevDayOffset(0);
});

describe('feature flag', () => {
  it('is off by default', () => {
    expect(s().devV2Preview).toBe(false);
    expect(v2PreviewEnabled(s().devV2Preview)).toBe(false);
  });

  it('can never be on in a release build', () => {
    const g = globalThis as { __DEV__?: boolean };
    const before = g.__DEV__;
    g.__DEV__ = false;
    try {
      expect(v2PreviewEnabled(true)).toBe(false);
      s().setDevV2Preview(true);
      expect(s().devV2Preview).toBe(false);
    } finally {
      g.__DEV__ = before;
    }
  });

  it('flag off: V1 stays the default and a V2 start is refused', () => {
    s().setProfile(C);
    expect(s().startProgramV2([])).toBe(false);
    expect(s().startedAt).toBeNull();
    s().setAnswers(ANSWERS);
    expect(s().startProgram()).toBe(true);
    expect(s().programVersion).toBe(1);
    expect(s().plan).toEqual(toPlan(buildPlan(ANSWERS)));
    expect(s().plan.every((h) => h.spec === undefined)).toBe(true);
  });

  it('flag on: starts a V2 program with personal targets', () => {
    const { r, ok } = startV2(C);
    expect(ok).toBe(true);
    expect(s().programVersion).toBe(2);
    expect(s().profile).toEqual(C);
    expect(s().plan.map((h) => h.habitId)).toEqual(r.picks.map((x) => x.id));
    for (const h of s().plan) {
      expect(DEV_CLEARED.has(h.habitId)).toBe(true);
      expect(h.level).toBe('easy');
      expect(habitTask(h)).toBe(r.picks.find((x) => x.id === h.habitId)!.targets.easy);
    }
    expect(habitTitle(s().plan[0])).toBe('Make your bed');
  });

  it('turning the flag on never converts a running V1 program', () => {
    s().setAnswers(ANSWERS);
    s().startProgram();
    const before = JSON.parse(JSON.stringify(s().plan));
    s().setDevV2Preview(true);
    s().setProfile(C);
    expect(s().startProgramV2([])).toBe(false);
    expect(s().programVersion).toBe(1);
    expect(s().plan).toEqual(before);
  });

  it('turning the flag off keeps a running V2 program as it is', () => {
    startV2(C);
    const before = JSON.parse(JSON.stringify(s().plan));
    s().setDevV2Preview(false);
    expect(s().programVersion).toBe(2);
    expect(s().plan).toEqual(before);
  });

  it('a second V2 start never overwrites a running program', () => {
    startV2(C);
    s().toggleHabit(1, s().plan[0].habitId);
    const before = JSON.parse(JSON.stringify({ plan: s().plan, logs: s().logs, startedAt: s().startedAt }));
    s().setProfile(FIXTURES['A · 16, focus']);
    expect(s().startProgramV2([])).toBe(false);
    s().setAnswers(ANSWERS);
    expect(s().startProgram()).toBe(false);
    expect({ plan: s().plan, logs: s().logs, startedAt: s().startedAt }).toEqual(before);
  });
});

describe('V2 onboarding paths', () => {
  it('under 16: nothing is saved', () => {
    s().setDevV2Preview(true);
    s().setProfile(C);
    s().setProfile({ ...C, age: 'u16' });
    expect(s().profile).toBeNull();
    expect(s().startProgramV2([])).toBe(false);
  });

  it('teen and adult paths both start, each with its own safety rules', () => {
    const teen = FIXTURES['A · 16, focus'];
    expect(startV2(teen).ok).toBe(true);
    const deep = s().plan.find((h) => h.habitId === 'focus_deepwork')!;
    expect(deep.spec!.targets.hard).not.toMatch(/90 min/);
    expect(s().plan.map((h) => h.habitId)).not.toContain('food_unsweetened');
    s().restart();
    expect(startV2(C).ok).toBe(true);
    expect(s().profile!.age).toBe('18_29');
  });

  it('mandatory choice: refuses to start without the required picks', () => {
    s().setDevV2Preview(true);
    s().setProfile(G1);
    expect(s().startProgramV2([])).toBe(false);
    const r = previewPlan(G1);
    if (r.status !== 'ok') throw new Error();
    expect(s().startProgramV2([r.options[0].id])).toBe(false);
    expect(s().startProgramV2([r.options[0].id, r.options[1].id])).toBe(true);
    expect(s().plan).toHaveLength(3);
  });

  it('four habits: keeping four starts a four-habit plan, and a day counts at 4 of 4', () => {
    const e: ProfileV2 = { ...FIXTURES['E · 45, discipline'], wake: { kind: 'time', time: '07:00' } };
    s().setDevV2Preview(true);
    s().setProfile(e);
    expect(s().startProgramV2([])).toBe(true);
    expect(s().plan).toHaveLength(4);
    const ids = s().plan.map((h) => h.habitId);
    ids.slice(0, 3).forEach((id) => s().toggleHabit(1, id));
    const log = () => s().logs[dateForDay(s().startedAt!, 1)];
    expect(dayQualifies(log())).toBe(false); // 3 of 4 is 75%
    s().toggleHabit(1, ids[3]);
    expect(dayQualifies(log())).toBe(true);
  });
});

describe('66-day mechanics on a V2 plan (unchanged)', () => {
  it('day 22 and day 45 level every habit up through its personal window', () => {
    startV2(C);
    const easy = s().plan.map((h) => habitTask(h));
    s().setDevDayOffset(21); // day 22
    s().reconcileNow(false);
    expect(s().appliedPhase).toBe(2);
    s().plan.forEach((h, i) => {
      expect(h.level).toBe('medium');
      expect(habitTask(h)).toBe(h.spec!.targets.medium);
      expect(habitTask(h)).not.toBe(easy[i]);
    });
    s().setDevDayOffset(44); // day 45
    s().reconcileNow(false);
    expect(s().appliedPhase).toBe(3);
    for (const h of s().plan) {
      expect(h.level).toBe('hard');
      expect(habitTask(h)).toBe(h.spec!.targets.hard);
    }
    expect(s().notices.filter((n) => n.kind === 'phaseUp')).toHaveLength(2);
  });

  it('day 22 renders the person’s own bedtime Medium (regression for the review discrepancy)', () => {
    startV2(C); // in bed 00:30, up 07:00
    s().setDevDayOffset(21);
    s().reconcileNow(false);
    const bed = s().plan.find((h) => h.habitId === 'sleep_bedtime')!;
    expect(habitTask(bed)).toBe('In bed by 00:00');
  });

  it('early level-up offers, XP and step-down work exactly as in V1', () => {
    startV2(C);
    completeDays(1, LEVEL_UP_RUN);
    const today = currentDay();
    expect(today).toBe(LEVEL_UP_RUN);
    const offers = levelUpOffers(s().plan, s().logs, s().startedAt!, today);
    expect(offers.length).toBe(s().plan.length);
    const id = offers[0];
    const h = s().plan.find((x) => x.habitId === id)!;
    expect(habitTaskAt(h, 'medium')).toBe(h.spec!.targets.medium);
    s().acceptLevelUp(id);
    expect(s().plan.find((x) => x.habitId === id)!.level).toBe('medium');
    // 5 habits a day, full days: 5 × 10 + 20 bonus.
    expect(totalXp(s().logs)).toBe(LEVEL_UP_RUN * (s().plan.length * 10 + 20));
    // Three missed days step the levelled habit back down, never below Easy.
    s().setDevDayOffset(LEVEL_UP_RUN + 3);
    s().reconcileNow(false);
    expect(s().plan.find((x) => x.habitId === id)!.level).toBe('easy');
  });
});

describe('V2 swaps', () => {
  it('swap in at Easy of the personal window, mid-program, keeping history', () => {
    startV2(C);
    s().setDevDayOffset(29); // day 30, phase 2
    s().toggleHabit(30, 'discipline_bed');
    s().reconcileNow(false);
    const logsBefore = JSON.parse(JSON.stringify(s().logs));
    const target = s().plan[s().plan.length - 1].habitId;
    const option = swapChoices(C, s().plan, target)[0];
    expect(s().swapHabitV2(target, option.id)).toBe(true);
    const h = s().plan.find((x) => x.habitId === option.id)!;
    expect(h.level).toBe('easy');
    expect(h.addedOnDay).toBe(30);
    expect(habitTask(h)).toBe(option.targets.easy);
    expect(s().plan.some((x) => x.habitId === target)).toBe(false);
    expect(s().logs[dateForDay(s().startedAt!, 30)].completed).toEqual(['discipline_bed']);
    expect(Object.keys(s().logs)).toEqual(Object.keys(logsBefore));
  });

  it('refuse habits that are pending review, held, ineligible or already in the plan', () => {
    startV2(C);
    const target = s().plan[1].habitId;
    for (const id of ['move_walk', 'move_balance', 'food_produce', s().plan[2].habitId, 'nope']) {
      expect(s().swapHabitV2(target, id)).toBe(false);
    }
  });

  it('V1 programs keep legacy swaps, and V2 programs never use them', () => {
    s().setAnswers(ANSWERS);
    s().startProgram();
    const old = s().plan[1].habitId;
    s().swapHabit(old, 'focus_top3');
    expect(s().plan[1].habitId).toBe('focus_top3');
    expect(s().swapHabitV2('focus_top3', 'mind_read')).toBe(false);
    s().restart();
    startV2(C);
    const before = JSON.parse(JSON.stringify(s().plan));
    s().swapHabit(s().plan[1].habitId, 'move_workout');
    expect(s().plan).toEqual(before);
  });
});

describe('removing habits', () => {
  it('stops at the three-habit minimum and keeps history', () => {
    startV2(C);
    s().toggleHabit(1, s().plan[4].habitId);
    const logs = JSON.parse(JSON.stringify(s().logs));
    expect(s().removeHabit(s().plan[4].habitId)).toBe(true);
    expect(s().removeHabit(s().plan[3].habitId)).toBe(true);
    expect(s().plan).toHaveLength(3);
    expect(s().removeHabit(s().plan[2].habitId)).toBe(false);
    expect(s().plan).toHaveLength(3);
    // The day's log drops the removed habit from today's plan, nothing else.
    expect(Object.keys(s().logs)).toEqual(Object.keys(logs));
  });
});

describe('persistence', () => {
  it('a V2 program survives an app restart exactly', async () => {
    startV2(C);
    completeDays(1, 3);
    s().addCustomHabit('Stretch', '5 minutes');
    const saved = JSON.parse(
      JSON.stringify({
        startedAt: s().startedAt,
        plan: s().plan,
        logs: s().logs,
        profile: s().profile,
        programVersion: s().programVersion,
      }),
    );
    await coldStart();
    expect({
      startedAt: s().startedAt,
      plan: s().plan,
      logs: s().logs,
      profile: s().profile,
      programVersion: s().programVersion,
    }).toEqual(saved);
    expect(JSON.parse((await AsyncStorage.getItem(KEY))!).version).toBe(2);
  });

  it('an unfinished V2 onboarding draft is kept for "Pick up where you left off"', async () => {
    s().setDevV2Preview(true);
    s().setProfile(C);
    await coldStart();
    expect(s().profile).toEqual(C);
    expect(s().startedAt).toBeNull();
  });

  it('Restart clears a V2 program back to V1 defaults but keeps device preferences and the dev switch', () => {
    startV2(C);
    s().setThemePreference('dark');
    s().restart();
    expect(s().programVersion).toBe(1);
    expect(s().profile).toBeNull();
    expect(s().plan).toEqual([]);
    expect(s().themePreference).toBe('dark');
    expect(s().devV2Preview).toBe(true);
  });
});

describe('legacy saves', () => {
  const legacy = {
    state: {
      startedAt: '2026-09-01',
      answers: ANSWERS,
      plan: [
        { habitId: 'water', level: 'medium', addedOnDay: 1, levelSince: 21 },
        { habitId: 'custom_a', custom: { title: 'Stretch' }, level: 'easy', addedOnDay: 3, levelSince: 2 },
      ],
      logs: { '2026-09-01': { day: 1, date: '2026-09-01', completed: ['water'], planned: ['water'] } },
      reminderTime: '07:30',
      notificationsEnabled: true,
      seenCeremonies: [1, 7, 21],
      appliedPhase: 2,
      notices: [],
      devDayOffset: 0,
    },
    version: 1,
  };

  it('load as V1 programs with every bit of progress intact', async () => {
    await loadSaved(legacy);
    expect(s().programVersion).toBe(1);
    expect(s().profile).toBeNull();
    expect(s().plan).toEqual(legacy.state.plan);
    expect(s().logs).toEqual(legacy.state.logs);
    expect(s().seenCeremonies).toEqual(legacy.state.seenCeremonies);
    expect(s().appliedPhase).toBe(2);
    expect(habitTask(s().plan[0])).toBe('Drink 6 glasses of water (1.5L)');
    expect(totalXp(s().logs)).toBe(30);
  });

  it('are never converted, even with the preview switched on', async () => {
    await loadSaved({ ...legacy, state: { ...legacy.state, devV2Preview: true } });
    expect(s().programVersion).toBe(1);
    s().setProfile(C);
    expect(s().startProgramV2([])).toBe(false);
    expect(s().plan).toEqual(legacy.state.plan);
  });

  it('fall back safely when a save is damaged', () => {
    expect(migrateSaved(null, 1)).toEqual({});
    expect(migrateSaved('garbage', 1)).toEqual({});
    const odd = migrateSaved({ ...legacy.state, programVersion: 7, profile: { age: 3 } }, 2);
    expect(odd.programVersion).toBe(1);
    expect(odd.profile).toBeNull();
    // A V2 save whose habit lost its targets gets them rebuilt from the profile.
    const bare: PlanHabit = { habitId: 'sleep_wake', level: 'easy', addedOnDay: 1, levelSince: 0 };
    const fixed = migrateSaved({ programVersion: 2, profile: C, plan: [bare] }, 2);
    expect((fixed.plan as PlanHabit[])[0].spec?.targets.easy).toBe('Up within 60 min of 07:00');
  });

  it('a V2 save without its profile still shows Today, with no swaps offered', async () => {
    startV2(C);
    const plan = JSON.parse(JSON.stringify(s().plan));
    await loadSaved({ state: { ...legacy.state, programVersion: 2, profile: null, plan }, version: 2 });
    expect(s().programVersion).toBe(2);
    expect(s().plan.map((h) => habitTask(h))).toEqual(plan.map((h: PlanHabit) => h.spec!.targets.easy));
    expect(s().swapHabitV2(plan[1].habitId, 'mind_read')).toBe(false);
  });
});

it('starts today', () => {
  startV2(C);
  expect(s().startedAt).toBe(toDateKey(new Date()));
});
