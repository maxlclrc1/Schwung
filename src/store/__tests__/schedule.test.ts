import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { dateForDay } from '../../core/dates';
import { habitTask, habitTitle } from '../../core/habits';
import { buildPlan, toPlan } from '../../core/plan';
import {
  currentStreak,
  dayQualifies,
  levelUpOffers,
  totalXp,
  XP_FULL_DAY_BONUS,
  XP_PER_HABIT,
} from '../../core/progression';
import { isDueOn, weekdayOfDay } from '../../core/schedule';
import type { Answers, PlanHabit, Weekday } from '../../core/types';
import { FIXTURES } from '../../core/v2/__tests__/fixtures';
import { DEV_CLEARED } from '../../core/v2/gate';
import { previewPlan } from '../../core/v2/program';
import { migrateSaved } from '../migrate';
import { currentDay, useApp } from '../useApp';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KEY = 'schwung-state';
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const s = () => useApp.getState();
const ANSWERS: Answers = {
  goal: 'calm',
  sleep: '6-7h',
  screen: '6-8h',
  exercise: 'rarely',
  water: '0.5-1L',
  mind: 'rarely',
};
const C = FIXTURES['C · 28, energy'];

const at = (day: number) => s().setDevDayOffset(day - 1);
const log = (day: number) => s().logs[dateForDay(s().startedAt!, day)];
const wd = (day: number) => weekdayOfDay(s().startedAt!, day);

/** A V2 program (5 daily habits) plus a synthetic scheduled habit due on the weekdays of days 1, 3 and 5. */
function setup(): string {
  s().setDevV2Preview(true);
  s().setProfile(C);
  expect(s().startProgramV2([])).toBe(true);
  const id = s().addDevScheduledHabit([wd(1), wd(3), wd(5)])!;
  expect(id).toMatch(/^devsched_/);
  return id;
}
const sched = (id: string) => s().plan.find((h) => h.habitId === id)!;

beforeEach(() => {
  s().restart();
  s().setDevV2Preview(false);
  s().setDevDayOffset(0);
});

describe('development-only synthetic habits', () => {
  it('are added only in development builds, never recommended, and not exercises', () => {
    const id = setup();
    const h = sched(id);
    expect(h.schedule!.days).toHaveLength(3);
    expect(h.spec!.title).toBe('Test session (dev)');
    expect(habitTask(h)).toBe('Test session · level 1');
    // Never part of the V2 library, gate, plans or choices.
    expect(DEV_CLEARED.has(id)).toBe(false);
    const r = previewPlan(C);
    if (r.status !== 'ok') throw new Error();
    expect([...r.picks.map((x) => x.id), ...r.options.map((o) => o.id)].some((x) => x.startsWith('devsched'))).toBe(
      false,
    );
    // Invalid day sets are refused.
    expect(s().addDevScheduledHabit([1])).toBeNull();
    expect(s().addDevScheduledHabit([1, 2, 3, 4])).toBeNull();

    const g = globalThis as { __DEV__?: boolean };
    const before = g.__DEV__;
    g.__DEV__ = false;
    try {
      expect(s().addDevScheduledHabit([1, 3])).toBeNull();
    } finally {
      g.__DEV__ = before;
    }
  });

  it('need a running program', () => {
    expect(s().addDevScheduledHabit([1, 3])).toBeNull();
  });
});

describe('due days, rest days and the 80% rule', () => {
  it('plans only the habits due that day; a rest day is not a miss', () => {
    const id = setup();
    s().toggleHabit(1, 'discipline_bed');
    expect(log(1).planned).toContain(id);
    expect(log(1).planned).toHaveLength(6);
    at(2);
    s().toggleHabit(2, 'discipline_bed');
    expect(log(2).planned).not.toContain(id);
    expect(log(2).planned).toHaveLength(5);
  });

  it('80% uses only the due habits: 5 of 6 on a session day, 4 of 5 on a rest day', () => {
    const id = setup();
    const daily = s()
      .plan.filter((h) => !h.schedule)
      .map((h) => h.habitId);
    // Day 1 (session day): 5 of 6 done counts; 4 of 6 doesn't.
    daily.slice(0, 4).forEach((x) => s().toggleHabit(1, x));
    expect(dayQualifies(log(1))).toBe(false);
    s().toggleHabit(1, id);
    expect(dayQualifies(log(1))).toBe(true);
    // Day 2 (rest day): 4 of 5 daily habits counts, with no session at all.
    at(2);
    daily.slice(0, 4).forEach((x) => s().toggleHabit(2, x));
    expect(dayQualifies(log(2))).toBe(true);
  });

  it('XP and streak use the same due lists (rest days keep the streak)', () => {
    const id = setup();
    for (let d = 1; d <= 7; d++) {
      at(d);
      for (const h of s().plan) if (isDueOn(h, s().startedAt!, d)) s().toggleHabit(d, h.habitId);
    }
    const sessions = [1, 2, 3, 4, 5, 6, 7].filter((d) => isDueOn(sched(id), s().startedAt!, d)).length;
    expect(sessions).toBe(3);
    // 7 full days: 5 daily habits each, 3 sessions, 7 full-day bonuses.
    expect(totalXp(s().logs)).toBe((7 * 5 + sessions) * XP_PER_HABIT + 7 * XP_FULL_DAY_BONUS);
    expect(currentStreak(s().logs, s().startedAt!, 7)).toBe(7);
  });

  it('seven sessions in a row bring the existing level-up offer; rest days in between are fine', () => {
    const id = setup();
    let sessions = 0;
    let d = 0;
    while (sessions < 7) {
      d++;
      at(d);
      if (isDueOn(sched(id), s().startedAt!, d)) {
        s().toggleHabit(d, id);
        sessions++;
      }
    }
    expect(d).toBeGreaterThanOrEqual(15);
    expect(levelUpOffers(s().plan, s().logs, s().startedAt!, d)).toContain(id);
    s().acceptLevelUp(id);
    expect(sched(id).level).toBe('medium');
    expect(habitTask(sched(id))).toBe('Test session · level 2');
  });

  it('three missed sessions step down gently; Day 22 never raises it automatically', () => {
    const id = setup();
    s().setLevel(id, 'medium');
    // Miss every session from now on; check the level each day.
    let stepped = 0;
    for (let d = 2; d <= 12; d++) {
      at(d);
      s().reconcileNow(false);
      if (sched(id).level === 'easy' && !stepped) stepped = d;
    }
    // The setLevel day is levelSince; the next three sessions must all be missed first.
    const due = [] as number[];
    for (let d = 2; d <= 12; d++) if (isDueOn(sched(id), s().startedAt!, d)) due.push(d);
    expect(stepped).toBe(due[2] + 1);
    at(22);
    s().reconcileNow(false);
    expect(s().appliedPhase).toBe(2);
    expect(sched(id).level).toBe('easy');
    expect(
      s()
        .plan.filter((h) => !h.schedule)
        .every((h) => h.level !== 'easy' || h.addedOnDay >= 22),
    ).toBe(true);
  });
});

describe('yesterday edits, schedule changes, swaps and removals', () => {
  it('a missed session edited the next morning counts, with yesterday’s due list', () => {
    const id = setup();
    at(2); // day 1 had no log
    s().toggleHabit(1, id);
    expect(log(1).planned).toContain(id);
    expect(log(1).completed).toEqual([id]);
    // Editing yesterday never borrows today's list.
    s().toggleHabit(1, 'discipline_bed');
    expect(log(1).planned).toHaveLength(6);
  });

  it('changing the days keeps a session already done today, and past logs untouched', () => {
    const id = setup();
    s().toggleHabit(1, id);
    const day1Before = JSON.parse(JSON.stringify(log(1)));
    // Move away from today's weekday.
    const others = ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).filter((w) => w !== wd(1));
    expect(s().setSchedule(id, [others[0], others[1]])).toBe(true);
    expect(log(1).planned).toContain(id);
    expect(log(1).completed).toContain(id);
    expect(log(1)).toEqual(day1Before);
    // Invalid schedules are refused.
    expect(s().setSchedule(id, [1] as Weekday[])).toBe(false);
    expect(s().setSchedule(id, [1, 2, 3, 4] as Weekday[])).toBe(false);
    expect(s().setSchedule('discipline_bed', [1, 3] as Weekday[])).toBe(false); // daily habits have no schedule
  });

  it('swapping or removing a scheduled habit keeps history and every day covered', () => {
    const id = setup();
    s().toggleHabit(1, id);
    const history = JSON.parse(JSON.stringify(s().logs));
    // V2 swaps only offer reviewed library habits; a synthetic habit has none, so nothing changes.
    expect(s().swapHabitV2(id, 'mind_read')).toBe(false);
    expect(s().removeHabit(id)).toBe(true);
    expect(s().plan.some((h) => h.habitId === id)).toBe(false);
    // Today's log drops it from today's lists; earlier days keep theirs.
    at(3);
    s().toggleHabit(3, 'discipline_bed');
    expect(log(3).planned).not.toContain(id);
    expect(history[dateForDay(s().startedAt!, 1)].completed).toContain(id);
  });

  it('never removes the last habit due on some weekday', () => {
    s().setDevV2Preview(true);
    s().setProfile(FIXTURES['G2 · organized, discipline']);
    expect(s().startProgramV2([])).toBe(true);
    // Make every habit scheduled except one daily habit, then try to remove that one.
    const ids = s().plan.map((h) => h.habitId);
    const extra = s().addDevScheduledHabit([1, 3])!;
    useApp.setState({
      plan: s().plan.map((h) =>
        h.habitId === ids[1]
          ? { ...h, schedule: { days: [2, 4] as Weekday[] } }
          : h.habitId === ids[2]
            ? { ...h, schedule: { days: [5, 6] as Weekday[] } }
            : h,
      ),
    });
    // discipline_bed is now the only habit due on Sundays.
    expect(s().removeHabit('discipline_bed')).toBe(false);
    expect(s().removeHabit(extra)).toBe(true);
  });
});

describe('persistence and compatibility', () => {
  it('a scheduled habit survives an app restart exactly', async () => {
    const id = setup();
    s().toggleHabit(1, id);
    await wait(400);
    const disk = await AsyncStorage.getItem(KEY);
    const before = JSON.parse(JSON.stringify({ plan: s().plan, logs: s().logs }));
    useApp.setState({ plan: [], logs: {} });
    await wait(400);
    await AsyncStorage.setItem(KEY, disk!);
    await useApp.persist.rehydrate();
    expect({ plan: s().plan, logs: s().logs }).toEqual(before);
    expect(sched(id).schedule!.days).toHaveLength(3);
  });

  it('existing V1 and V2 daily plans plan every habit every day, as before', () => {
    s().setAnswers(ANSWERS);
    s().startProgram();
    const v1 = s().plan.map((h) => h.habitId);
    expect(s().plan).toEqual(toPlan(buildPlan(ANSWERS)));
    for (let d = 1; d <= 8; d++) {
      at(d);
      s().toggleHabit(d, v1[0]);
      expect(log(d).planned).toEqual(v1);
    }
    s().restart();
    s().setDevV2Preview(true);
    s().setProfile(C);
    s().startProgramV2([]);
    const v2 = s().plan.map((h) => h.habitId);
    for (let d = 1; d <= 8; d++) {
      at(d);
      s().toggleHabit(d, v2[0]);
      expect(log(d).planned).toEqual(v2);
    }
  });

  it('a damaged schedule falls back to a daily habit, keeping everything else', () => {
    const base: PlanHabit = { habitId: 'devsched_x', level: 'medium', addedOnDay: 3, levelSince: 2 };
    const out = migrateSaved(
      {
        plan: [
          { ...base, schedule: { days: [1] } },
          { ...base, habitId: 'b', schedule: { days: [1, 3] } },
          { ...base, habitId: 'c', schedule: 'Mondays' },
        ],
      },
      2,
    ).plan as PlanHabit[];
    expect(out[0]).toEqual(base);
    expect(out[1].schedule).toEqual({ days: [1, 3] });
    expect(out[2].schedule).toBeUndefined();
    expect(out[2].level).toBe('medium');
  });

  it('a damaged phase flag keeps the valid days and never turns on automatic level-ups', () => {
    const base: PlanHabit = { habitId: 'devsched_y', level: 'easy', addedOnDay: 1, levelSince: 0 };
    const out = migrateSaved({ plan: [{ ...base, schedule: { days: [2, 4], phaseLevelUps: 'yes' } }] }, 2)
      .plan as PlanHabit[];
    expect(out[0].schedule).toEqual({ days: [2, 4] });
  });

  it('editing a schedule mid-program keeps the run, the level and every past log', () => {
    const id = setup();
    s().setLevel(id, 'medium');
    let d = 1;
    for (; d <= 12; d++) {
      at(d);
      if (isDueOn(sched(id), s().startedAt!, d)) s().toggleHabit(d, id);
    }
    const history = JSON.parse(JSON.stringify(s().logs));
    const others = ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).filter((w) => !sched(id).schedule!.days.includes(w));
    expect(s().setSchedule(id, [others[0], others[1]])).toBe(true);
    at(13);
    s().reconcileNow(false);
    expect(sched(id).level).toBe('medium');
    expect(s().notices.some((n) => n.kind === 'stepDown')).toBe(false);
    for (const [date, entry] of Object.entries(history)) expect(s().logs[date]).toEqual(entry);
  });

  it('the conversation habit is called Meaningful conversation for new plans and swaps', () => {
    s().setDevV2Preview(true);
    s().setProfile(FIXTURES['B · 19, confidence']);
    s().startProgramV2([]);
    at(1);
    const swapped = s().swapHabitV2('confidence_compliment', 'confidence_talk');
    expect(swapped).toBe(true);
    const h = s().plan.find((x) => x.habitId === 'confidence_talk')!;
    expect(habitTitle(h)).toBe('Meaningful conversation');
    expect(habitTask(h)).toBe('Have one genuine conversation today, beyond basic logistics');
    expect(currentDay()).toBe(1);
  });
});
