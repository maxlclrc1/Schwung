import { describe, expect, it } from '@jest/globals';
import { comebackCopy, comebackFor, ComebackInput, RESUMED_COPY } from '../comeback';
import { dateForDay } from '../dates';
import { currentStreak, daysCompleted, Logs, reconcile, totalXp } from '../progression';
import type { PlanHabit } from '../types';

const START = '2026-10-01';
const A = 'discipline_bed';
const B = 'water';
const C = 'mind_read';
const PLAN: PlanHabit[] = [A, B, C].map((habitId) => ({ habitId, level: 'easy', addedOnDay: 1, levelSince: 0 }));

/** Build logs from { day: completedIds }, all planned with the full plan. */
function logs(days: Record<number, string[]>): Logs {
  const out: Logs = {};
  for (const [d, completed] of Object.entries(days)) {
    const date = dateForDay(START, Number(d));
    out[date] = { day: Number(d), date, completed, planned: [A, B, C] };
  }
  return out;
}

const input = (l: Logs, today: number, yesterdayEditable = false): ComebackInput => ({
  plan: PLAN,
  logs: l,
  startKey: START,
  today,
  yesterdayEditable,
});

describe('comeback', () => {
  it('stays away for a user who has not missed a day', () => {
    expect(comebackFor(input(logs({}), 1))).toBeNull(); // day 1, nothing to come back from
    expect(comebackFor(input(logs({ 1: [A], 2: [A, B], 3: [B] }), 4))).toBeNull();
    // A partial yesterday is still showing up, not a missed day.
    expect(comebackFor(input(logs({ 1: [A, B, C], 2: [C] }), 3))).toBeNull();
  });

  it('welcomes back a user who missed one day', () => {
    const r = comebackFor(input(logs({ 1: [A], 2: [A, B, C] }), 4));
    expect(r).toEqual({ away: 1, lastActiveDay: 2, resumed: false, suggestion: A });
    expect(comebackCopy(r!).head).toBe('Welcome back.');
  });

  it('waits until noon before treating a blank yesterday as missed', () => {
    const l = logs({ 1: [A], 2: [A] });
    expect(comebackFor(input(l, 4, true))).toBeNull(); // yesterday can still be filled in
    expect(comebackFor(input(l, 4, false))).not.toBeNull();
    // Before noon, earlier final blank days still count.
    expect(comebackFor(input(l, 5, true))).toMatchObject({ away: 2, lastActiveDay: 2 });
  });

  it('handles several missed days, including days opened with nothing checked', () => {
    const l = logs({ 1: [A, B], 2: [A], 3: [], 4: [] });
    expect(comebackFor(input(l, 6))).toMatchObject({ away: 3, lastActiveDay: 2, resumed: false });
    expect(comebackFor(input(l, 20))).toMatchObject({ away: 17, lastActiveDay: 2 });
    // Nothing checked since starting.
    expect(comebackFor(input(logs({}), 5))).toMatchObject({ away: 4, lastActiveDay: 0 });
    // Completions of habits no longer planned that day don't count as activity.
    const stale = { ...logs({ 1: [A] }), ...logs({ 2: [] }) };
    stale[dateForDay(START, 2)].completed = ['removed_habit'];
    expect(comebackFor(input(stale, 4))).toMatchObject({ away: 2, lastActiveDay: 1 });
  });

  it('copy scales with the length of the pause without guilt or catch-up', () => {
    const one = comebackCopy({ away: 1, lastActiveDay: 3 });
    const few = comebackCopy({ away: 3, lastActiveDay: 3 });
    const long = comebackCopy({ away: 12, lastActiveDay: 3 });
    const fresh = comebackCopy({ away: 4, lastActiveDay: 0 });
    expect(new Set([one.body, few.body, long.body]).size).toBe(3);
    expect(long.head).not.toBe(one.head);
    expect(few.body).toContain('still here');
    expect(fresh.body).not.toContain('still here'); // no progress to point to yet
    for (const t of [one, few, long, fresh, RESUMED_COPY]) {
      const text = `${t.head} ${t.body}`.toLowerCase();
      for (const word of ['missed', 'fail', 'broke', 'lost', 'streak', 'behind', 'should', '!'])
        expect(text).not.toContain(word);
    }
  });

  it('steps aside once the user checks anything today', () => {
    const before = logs({ 1: [A, B], 2: [A] });
    expect(comebackFor(input(before, 6))!.resumed).toBe(false);
    const after = { ...before, ...logs({ 6: [B] }) };
    // One check is enough; today doesn't need to reach 80%.
    expect(comebackFor(input(after, 6))).toMatchObject({ resumed: true, away: 3 });
    // Unchecking it brings the welcome back.
    expect(comebackFor(input({ ...before, ...logs({ 6: [] }) }, 6))!.resumed).toBe(false);
    // Tomorrow, today counts as active, so there's nothing to come back from.
    expect(comebackFor(input(after, 7))).toBeNull();
  });

  it('respects existing history and progress without changing anything', () => {
    const history = logs({
      1: [A, B, C],
      2: [B, C],
      3: [B, C],
      4: [A, B, C],
      5: [B],
      6: [B, C],
      7: [A, B, C],
      8: [B],
    });
    const snapshot = JSON.parse(JSON.stringify(history));
    const xp = totalXp(history);
    const days = daysCompleted(history, START, 14);
    const r = comebackFor(input(history, 14));

    expect(r).toEqual({ away: 5, lastActiveDay: 8, resumed: false, suggestion: B }); // their most familiar habit
    expect(history).toEqual(snapshot); // no logs erased, created or completed
    expect(totalXp(history)).toBe(xp);
    expect(daysCompleted(history, START, 14)).toBe(days);
    expect(currentStreak(history, START, 14)).toBe(0); // the streak rule is unchanged, just not shown here
    expect(comebackCopy(r!).body).toContain('still here');
  });

  it('suggests the first plan habit on ties, and only habits still in the plan', () => {
    expect(comebackFor(input(logs({ 1: [C, B] }), 3))!.suggestion).toBe(B);
    expect(comebackFor(input(logs({ 1: [] }), 3))!.suggestion).toBe(A);
    const l = logs({ 1: ['custom_gone'], 2: ['custom_gone', C] });
    expect(comebackFor(input(l, 4))!.suggestion).toBe(C);
  });

  it('leaves reconcile (step-downs, phases) untouched', () => {
    const l = logs({ 1: [A, B, C] });
    const plan = PLAN.map((h) => ({ ...h, level: 'medium' as const }));
    const r = reconcile({ plan, appliedPhase: 1, startKey: START, logs: l, today: 6, yesterdayEditable: false });
    expect(r.events).toEqual([{ kind: 'stepDown', habitIds: [A, B, C], day: 6 }]);
    expect(comebackFor({ ...input(l, 6), plan: r.plan })).toMatchObject({ away: 4, lastActiveDay: 1 });
  });
});
