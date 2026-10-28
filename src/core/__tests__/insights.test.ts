import { describe, expect, it } from '@jest/globals';
import { ascentDays } from '../ascent';
import { dateForDay } from '../dates';
import { programHabitTally, programRecent, programTally, programTotal, programWeekTally } from '../insights';
import { totalXp, XP_PER_HABIT } from '../progression';
import type { DayLog, PlanHabit } from '../types';

// 2026-11-02 is a Monday. Today is Day 9 (Tuesday of the second week).
const MON = '2026-11-02';
const A: PlanHabit = { habitId: 'mind_read', level: 'easy', addedOnDay: 1, levelSince: 0 };
const B: PlanHabit = { habitId: 'water', level: 'easy', addedOnDay: 4, levelSince: 3 };
// A scheduled habit, due Mondays, Wednesdays and Fridays.
const S: PlanHabit = {
  habitId: 'devsched_x',
  level: 'easy',
  addedOnDay: 1,
  levelSince: 0,
  schedule: { days: [1, 3, 5] },
};

function logs(days: Record<number, string[]>, planned: (day: number) => string[]): Record<string, DayLog> {
  const out: Record<string, DayLog> = {};
  for (const [d, completed] of Object.entries(days)) {
    const day = Number(d);
    const date = dateForDay(MON, day);
    out[date] = { day, date, completed, planned: planned(day) };
  }
  return out;
}

describe('Insights for an existing program, from its saved days', () => {
  const planned = (d: number) => [A.habitId, ...(d >= 4 ? [B.habitId] : [])];
  const l = logs(
    { 1: ['mind_read'], 2: ['mind_read'], 4: ['mind_read', 'water'], 5: ['water'], 8: ['mind_read'] },
    planned,
  );

  it('counts each habit’s due days since it joined, and today only once done', () => {
    // Read: Days 1–8, done on 1, 2, 4, 8.
    expect(programHabitTally(A, l, MON, 9)).toEqual({ done: 4, eligible: 8 });
    // Water joined on Day 4: Days 4–8, done on 4 and 5.
    expect(programHabitTally(B, l, MON, 9)).toEqual({ done: 2, eligible: 5 });
    expect(programTally([A, B], l, MON, 9)).toEqual({ done: 6, eligible: 13 });
  });

  it('never counts a scheduled habit’s rest days', () => {
    const sl = logs({ 1: ['devsched_x'], 3: [] }, () => ['devsched_x']);
    // Due Days 1 (Mon), 3 (Wed), 5 (Fri), 8 (Mon): 4 opportunities by Day 9, 1 done.
    expect(programHabitTally(S, sl, MON, 9)).toEqual({ done: 1, eligible: 4 });
    expect(programRecent(S, sl, MON, 9).map((d) => d.state)).toEqual([
      'done',
      'rest',
      'missed',
      'rest',
      'missed',
      'rest',
      'rest',
      'missed',
      'today',
    ]);
  });

  it('totals check-offs the way XP counts them, and this week from Monday', () => {
    expect(programTotal(l)).toBe(6);
    expect(totalXp(l)).toBeGreaterThanOrEqual(6 * XP_PER_HABIT);
    // This week (Days 8–9): Read and Water each due on both days (today included): 1 of 4 done.
    expect(programWeekTally([A, B], l, MON, 9)).toEqual({ done: 1, eligible: 4 });
  });
});

describe('the Journey for a Life Reset program', () => {
  it('shows a day with nothing due as a rest day, never a missed one', () => {
    const l = logs({ 1: ['focus_deepwork'] }, () => ['focus_deepwork']);
    const days = ascentDays(l, MON, 4, (d) => d === 2);
    expect(days.slice(0, 4).map((d) => d.status)).toEqual(['done', 'rest', 'missed', 'today']);
    // Existing programs pass no rest rule: unchanged.
    expect(
      ascentDays(l, MON, 4)
        .slice(0, 3)
        .map((d) => d.status),
    ).toEqual(['done', 'missed', 'missed']);
  });
});
