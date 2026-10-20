import { describe, expect, it } from '@jest/globals';
import { dateForDay } from '../dates';
import {
  bestStreak,
  currentStreak,
  dayQualifies,
  isFullDay,
  levelUpOffers,
  Logs,
  pendingCeremony,
  phaseOf,
  playerLevel,
  reconcile,
  totalXp,
} from '../progression';
import type { PlanHabit } from '../types';

const START = '2026-10-20';
const A = 'mind_read';
const B = 'water';

const habit = (habitId: string, extra: Partial<PlanHabit> = {}): PlanHabit => ({
  habitId,
  level: 'easy',
  addedOnDay: 1,
  levelSince: 0,
  ...extra,
});

/** Build logs from { day: completedIds }, all with the same planned list. */
function logs(days: Record<number, string[]>, planned = [A, B]): Logs {
  const out: Logs = {};
  for (const [d, completed] of Object.entries(days)) {
    const date = dateForDay(START, Number(d));
    out[date] = { day: Number(d), date, completed, planned };
  }
  return out;
}

describe('phases', () => {
  it('splits 66 days into three phases', () => {
    expect([1, 21, 22, 44, 45, 66, 80].map(phaseOf)).toEqual([1, 1, 2, 2, 3, 3, 3]);
  });
});

describe('xp and level', () => {
  it('gives 10 per habit and 20 for a full day', () => {
    expect(totalXp(logs({ 1: [A], 2: [A, B] }))).toBe(10 + 40);
  });

  it('ignores completions of habits no longer planned', () => {
    expect(totalXp(logs({ 1: [A, 'gone'] }, [A]))).toBe(30);
  });

  it('levels up every 200 xp', () => {
    expect([0, 199, 200, 450].map(playerLevel)).toEqual([1, 1, 2, 3]);
  });
});

describe('streak', () => {
  const five = ['a', 'b', 'c', 'd', 'e'];

  it('counts a day at 80% (missing one of five keeps the streak)', () => {
    expect(dayQualifies({ day: 1, date: START, completed: five.slice(0, 4), planned: five })).toBe(true);
    expect(dayQualifies({ day: 1, date: START, completed: five.slice(0, 3), planned: five })).toBe(false);
  });

  it('does not break because today is unfinished', () => {
    const l = logs({ 1: [A, B], 2: [A, B], 3: [] });
    expect(currentStreak(l, START, 3)).toBe(2);
  });

  it('includes today once it qualifies', () => {
    const l = logs({ 1: [A, B], 2: [A, B], 3: [A, B] });
    expect(currentStreak(l, START, 3)).toBe(3);
  });

  it('resets after a missed day (no log = missed)', () => {
    const l = logs({ 1: [A, B], 2: [A, B], 4: [A, B] });
    expect(currentStreak(l, START, 5)).toBe(1);
    expect(bestStreak(l, START, 5)).toBe(2);
  });
});

describe('level-up offers', () => {
  it('offers after 7 consecutive completions', () => {
    const days = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, [A]]));
    expect(levelUpOffers([habit(A)], logs(days), START, 7)).toEqual([A]);
    expect(levelUpOffers([habit(A)], logs(days), START, 8)).toEqual([A]); // today not done yet
  });

  it('does not offer after 6', () => {
    const days = Object.fromEntries([1, 2, 3, 4, 5, 6].map((d) => [d, [A]]));
    expect(levelUpOffers([habit(A)], logs(days), START, 6)).toEqual([]);
  });

  it('starts counting again after a level change or a decline', () => {
    const days = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8].map((d) => [d, [A]]));
    expect(levelUpOffers([habit(A, { levelSince: 7 })], logs(days), START, 8)).toEqual([]);
  });

  it('never offers past hard or for custom habits', () => {
    const days = Object.fromEntries([1, 2, 3, 4, 5, 6, 7].map((d) => [d, [A, 'custom_1']]));
    const plan = [habit(A, { level: 'hard' }), habit('custom_1', { custom: { title: 'Mine' } })];
    expect(levelUpOffers(plan, logs(days), START, 7)).toEqual([]);
  });
});

describe('reconcile', () => {
  const base = { startKey: START, appliedPhase: 1, yesterdayEditable: false };

  it('does nothing in a normal week', () => {
    const r = reconcile({ ...base, plan: [habit(A)], logs: logs({ 1: [A], 2: [A] }), today: 3 });
    expect(r.events).toEqual([]);
    expect(r.plan[0].level).toBe('easy');
  });

  it('levels every library habit up at phase 2 and 3, but not custom ones', () => {
    const plan = [habit(A), habit('custom_1', { custom: { title: 'Mine' } })];
    const all = Object.fromEntries(Array.from({ length: 45 }, (_, i) => [i + 1, [A]]));
    const p2 = reconcile({ ...base, plan, logs: logs(all), today: 22 });
    expect(p2.plan[0].level).toBe('medium');
    expect(p2.plan[1].level).toBe('easy');
    expect(p2.appliedPhase).toBe(2);
    expect(p2.events).toEqual([{ kind: 'phaseUp', phase: 2, day: 22 }]);

    const again = reconcile({ ...base, plan: p2.plan, appliedPhase: 2, logs: logs(all), today: 23 });
    expect(again.plan[0].level).toBe('medium'); // idempotent

    const p3 = reconcile({ ...base, plan: p2.plan, appliedPhase: 2, logs: logs(all), today: 45 });
    expect(p3.plan[0].level).toBe('hard');
  });

  it('caps at hard', () => {
    const r = reconcile({ ...base, plan: [habit(A, { level: 'hard' })], logs: logs({ 21: [A] }), today: 22 });
    expect(r.plan[0].level).toBe('hard');
  });

  it('does not level up habits added during the new phase', () => {
    const r = reconcile({
      ...base,
      plan: [habit(A, { addedOnDay: 22, levelSince: 21, level: 'medium' })],
      logs: {},
      today: 22,
    });
    expect(r.plan[0].level).toBe('medium');
  });

  it('steps a habit down after 3 consecutive misses, once', () => {
    const plan = [habit(A, { level: 'medium', levelSince: 1 })];
    const l = logs({ 2: [A], 3: [], 4: [], 5: [] });
    const r = reconcile({ ...base, plan, logs: l, today: 6 });
    expect(r.plan[0].level).toBe('easy');
    expect(r.events).toEqual([{ kind: 'stepDown', habitIds: [A], day: 6 }]);

    const again = reconcile({ ...base, plan: r.plan, logs: l, today: 6 });
    expect(again.events).toEqual([]);
  });

  it('skipping 3 days then opening: correct gentle adjustment, at most one step', () => {
    const plan = [habit(A, { level: 'hard', levelSince: 10 }), habit(B, { level: 'easy', levelSince: 10 })];
    // Did everything through day 11, then didn't open the app on days 12, 13, 14.
    const l = logs({ 11: [A, B] });
    const r = reconcile({ ...base, plan, appliedPhase: 1, logs: l, today: 15 });
    expect(r.plan.map((h) => h.level)).toEqual(['medium', 'easy']); // easy can't go lower
  });

  it('reports all step-downs from one absence as a single event', () => {
    const plan = [habit(A, { level: 'medium', levelSince: 1 }), habit(B, { level: 'hard', levelSince: 1 })];
    const r = reconcile({ ...base, plan, logs: logs({}), today: 6 });
    expect(r.events).toEqual([{ kind: 'stepDown', habitIds: [A, B], day: 6 }]);
  });

  it('a long absence still drops only one level', () => {
    const plan = [habit(A, { level: 'hard', levelSince: 1 })];
    const r = reconcile({ ...base, plan, logs: logs({}), today: 20 });
    expect(r.plan[0].level).toBe('medium');
  });

  it('waits for yesterday to close (noon) before counting it as missed', () => {
    const plan = [habit(A, { level: 'medium', levelSince: 1 })];
    const l = logs({ 2: [], 3: [] });
    expect(reconcile({ ...base, plan, logs: l, today: 5, yesterdayEditable: true }).plan[0].level).toBe('medium');
    expect(reconcile({ ...base, plan, logs: l, today: 5, yesterdayEditable: false }).plan[0].level).toBe('easy');
  });

  it('does not count days before a habit was added as misses', () => {
    const plan = [habit(A, { level: 'medium', addedOnDay: 9, levelSince: 8 })];
    const r = reconcile({ ...base, plan, logs: logs({ 9: [A] }), today: 11 });
    expect(r.plan[0].level).toBe('medium');
  });

  it('catches up two phases at once after a very long gap', () => {
    const r = reconcile({ ...base, plan: [habit(A)], logs: {}, today: 50 });
    expect(r.appliedPhase).toBe(3);
    expect(r.events.filter((e) => e.kind === 'phaseUp')).toHaveLength(2);
    // Leveled to hard by phases, then gently stepped down once for the absence.
    expect(r.plan[0].level).toBe('medium');
  });
});

describe('ceremonies', () => {
  it('plays day 1 immediately', () => {
    expect(pendingCeremony([], 1, false)).toBe(1);
  });

  it('plays a milestone when that day is fully done', () => {
    expect(pendingCeremony([1], 7, false)).toBeNull();
    expect(pendingCeremony([1], 7, true)).toBe(7);
  });

  it('plays a missed milestone on a later open, only the latest one', () => {
    expect(pendingCeremony([1], 30, false)).toBe(21);
    expect(pendingCeremony([1, 7, 21, 44], 70, false)).toBe(66);
    expect(pendingCeremony([1, 7, 21, 44, 66], 70, false)).toBeNull();
  });
});

describe('day 66 finale threshold', () => {
  const DAY = 66;
  const SEEN_BEFORE = [1, 7, 21, 44];

  /** A day-66 log with `done` of `total` planned habits completed, plus optional stale ids. */
  function finaleLog(total: number, done: number, stale: string[] = []) {
    const planned = Array.from({ length: total }, (_, i) => `h${i}`);
    return { day: DAY, date: dateForDay(START, DAY), planned, completed: [...planned.slice(0, done), ...stale] };
  }

  /** What Today passes in: the real completion helpers applied to day 66's own log. */
  function finale(total: number, done: number, stale: string[] = [], seen = SEEN_BEFORE) {
    const log = finaleLog(total, done, stale);
    return pendingCeremony(seen, DAY, isFullDay(log), dayQualifies(log));
  }

  it('plays at 100%', () => {
    expect(finale(5, 5)).toBe(66);
  });

  it('plays at exactly 80% (4 of 5)', () => {
    expect(finale(5, 4)).toBe(66);
  });

  it('does not play below 80% (3 of 5)', () => {
    expect(finale(5, 3)).toBeNull();
  });

  it('applies the same 80% rule to the minimum 3-habit plan (2 of 3 is 67%)', () => {
    expect(finale(3, 3)).toBe(66);
    expect(finale(3, 2)).toBeNull();
  });

  it('applies the same rule to every plan size the app supports', () => {
    // Minimum needed = ceil(0.8 × planned). Plans can exceed 6 with custom habits.
    const minimum: Record<number, number> = { 3: 3, 4: 4, 5: 4, 6: 5, 7: 6, 8: 7, 10: 8 };
    for (const [total, need] of Object.entries(minimum).map(([t, n]) => [Number(t), n])) {
      expect(finale(total, need)).toBe(66);
      expect(finale(total, need - 1)).toBeNull();
    }
  });

  it('ignores completed ids that are not in day 66’s planned habits', () => {
    // 3 real + 2 stale = 5 ids, but only 3 of 5 planned are done (60%).
    expect(finale(5, 3, ['removed_habit', 'custom_old'])).toBeNull();
  });

  it('plays only once', () => {
    expect(finale(5, 5, [], [...SEEN_BEFORE, 66])).toBeNull();
    expect(finale(5, 4, [], [1, 7, 21, 44, 66])).toBeNull();
  });

  it('still plays on a later open if day 66 was missed, and not before day 66', () => {
    expect(pendingCeremony(SEEN_BEFORE, 67, false, false)).toBe(66);
    const log = finaleLog(5, 5);
    expect(pendingCeremony(SEEN_BEFORE, 65, isFullDay(log), dayQualifies(log))).toBeNull();
  });

  it('keeps the latest-unseen ordering: at 80% on day 66 with 44 unseen, the finale wins', () => {
    const log = finaleLog(5, 4);
    expect(pendingCeremony([1, 7, 21], DAY, isFullDay(log), dayQualifies(log))).toBe(66);
  });

  it('does not change the other milestones: day 7, 21 and 44 still need a full day', () => {
    for (const m of [7, 21, 44]) {
      const seen = [1, 7, 21, 44].filter((x) => x < m);
      expect(pendingCeremony(seen, m, false, true)).toBeNull();
      expect(pendingCeremony(seen, m, true, true)).toBe(m);
    }
  });

  it('without the extra argument behaves exactly as before (finale needs a full day)', () => {
    expect(pendingCeremony(SEEN_BEFORE, DAY, false)).toBeNull();
    expect(pendingCeremony(SEEN_BEFORE, DAY, true)).toBe(66);
  });
});
