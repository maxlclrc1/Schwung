import { describe, expect, it } from '@jest/globals';
import { addDays, dateForDay } from '../dates';
import {
  ACCEPT_ONLY_LEVEL_UPS,
  completionRun,
  levelUpOffers,
  reconcile,
  LEVEL_UP_RUN,
  STEP_DOWN_MISSES,
} from '../progression';
import {
  coversEveryWeekday,
  dueOn,
  isDueOn,
  nextDueDay,
  nextSessionLabel,
  rescheduled,
  scheduleDaysOn,
  scheduleLabel,
  validDays,
  validHistory,
  validSchedule,
  wasDueOn,
  weekdayOfDay,
  weekdayOfKey,
} from '../schedule';
import type { DayLog, PlanHabit, Weekday } from '../types';

const START = '2024-01-01'; // a Monday
const ALL: Weekday[] = [0, 1, 2, 3, 4, 5, 6];
const subsets = (): Weekday[][] => Array.from({ length: 128 }, (_, mask) => ALL.filter((w) => mask & (1 << w)));

const daily = (id: string, extra: Partial<PlanHabit> = {}): PlanHabit => ({
  habitId: id,
  level: 'easy',
  addedOnDay: 1,
  levelSince: 0,
  ...extra,
});
const sched = (id: string, days: Weekday[], extra: Partial<PlanHabit> = {}): PlanHabit =>
  daily(id, { schedule: { days }, ...extra });

/** Logs where `done(day, habitId)` decides completions; planned = what was due that day. */
function logsFor(plan: PlanHabit[], days: number, done: (day: number, id: string) => boolean) {
  const logs: Record<string, DayLog> = {};
  for (let d = 1; d <= days; d++) {
    const planned = dueOn(plan, START, d).map((h) => h.habitId);
    const date = dateForDay(START, d);
    logs[date] = { day: d, date, planned, completed: planned.filter((id) => done(d, id)) };
  }
  return logs;
}

describe('weekdays', () => {
  it('reads weekdays from calendar date keys (no time zone involved)', () => {
    expect(weekdayOfKey('2024-01-01')).toBe(1);
    expect(weekdayOfKey('2024-01-07')).toBe(0);
    expect(weekdayOfKey('2024-02-29')).toBe(4);
    // Across a DST change (Europe and US both change in late March/early November): still one day per day.
    for (let i = 0; i < 400; i++) {
      const key = addDays('2026-03-01', i);
      expect(weekdayOfKey(addDays(key, 1))).toBe((weekdayOfKey(key) + 1) % 7);
    }
    expect(weekdayOfDay(START, 1)).toBe(1);
    expect(weekdayOfDay(START, 8)).toBe(1);
  });
});

describe('every weekday combination', () => {
  it('is valid only with 2 or 3 distinct days', () => {
    for (const days of subsets()) expect(validDays(days)).toBe(days.length === 2 || days.length === 3);
    expect(validDays([1, 1])).toBe(false);
    expect(validDays([1, 7])).toBe(false);
    expect(validDays([1.5, 2])).toBe(false);
    expect(validSchedule({ days: [1, 3], phaseLevelUps: 'yes' })).toBe(false);
    expect(validSchedule({ days: [1, 3, 5], phaseLevelUps: true })).toBe(true);
  });

  it('is due exactly on its weekdays, every week, and the next session is always the next of them', () => {
    for (const days of subsets().filter((d) => d.length >= 1)) {
      const h = sched('x', days);
      for (let week = 0; week < 3; week++) {
        const due = [1, 2, 3, 4, 5, 6, 7].filter((d) => isDueOn(h, START, week * 7 + d));
        expect(due.length).toBe(days.length);
        for (const d of due) expect(days).toContain(weekdayOfDay(START, week * 7 + d));
      }
      for (let d = 1; d <= 14; d++) {
        const next = nextDueDay(h, START, d)!;
        expect(next).toBeGreaterThan(d);
        expect(next - d).toBeLessThanOrEqual(7);
        for (let between = d + 1; between < next; between++) expect(isDueOn(h, START, between)).toBe(false);
        expect(isDueOn(h, START, next)).toBe(true);
      }
    }
  });

  it('daily habits are always due and have no next session', () => {
    const h = daily('d');
    for (let d = 1; d <= 66; d++) expect(isDueOn(h, START, d)).toBe(true);
    expect(nextDueDay(h, START, 1)).toBeNull();
    expect(nextSessionLabel(h, START, 1)).toBeNull();
  });

  it('labels schedules Monday first, and the next session in words', () => {
    expect(scheduleLabel({ days: [5, 1, 3] })).toBe('Mon · Wed · Fri');
    expect(scheduleLabel({ days: [0, 2] })).toBe('Tue · Sun');
    const h = sched('x', [1, 3, 5]);
    expect(nextSessionLabel(h, START, 1)).toBe('today'); // Monday
    expect(nextSessionLabel(h, START, 2)).toBe('tomorrow'); // Tuesday → Wednesday
    expect(nextSessionLabel(h, START, 5)).toBe('today'); // Friday
    expect(nextSessionLabel(h, START, 6)).toBe('Monday'); // Saturday → Monday
  });

  it('a plan covers every weekday only if each day has something due', () => {
    expect(coversEveryWeekday([daily('a'), sched('b', [1, 3])])).toBe(true);
    expect(coversEveryWeekday([sched('a', [1, 3, 5]), sched('b', [2, 4, 6])])).toBe(false);
    expect(coversEveryWeekday([sched('a', [1, 3, 5]), sched('b', [2, 4]), sched('c', [6, 0])])).toBe(true);
  });
});

describe('progression with scheduled habits', () => {
  const MWF: Weekday[] = [1, 3, 5];
  const s = sched('s', MWF);
  const plan = [daily('a'), daily('b'), daily('c'), daily('d'), s];

  it('rest days are not planned: a full day on a rest day needs only the due habits', () => {
    const logs = logsFor(plan, 7, () => true);
    expect(logs[dateForDay(START, 1)].planned).toContain('s'); // Monday
    expect(logs[dateForDay(START, 2)].planned).not.toContain('s'); // Tuesday
    expect(logs[dateForDay(START, 2)].planned).toHaveLength(4);
  });

  it('counts consecutive sessions, skipping rest days, for the early level-up', () => {
    // Every Mon/Wed/Fri done: 7 sessions take 15 days (days 1, 3, 5, 8, 10, 12, 15).
    const logs = logsFor(plan, 20, (_, id) => id === 's');
    expect(completionRun(s, logs, START, 14)).toBe(6);
    expect(levelUpOffers(plan, logs, START, 14)).not.toContain('s');
    expect(completionRun(s, logs, START, 15)).toBe(LEVEL_UP_RUN);
    expect(levelUpOffers(plan, logs, START, 15)).toContain('s');
    // A rest day after the 7th session keeps the offer (day 16 is a Tuesday).
    expect(levelUpOffers(plan, logs, START, 16)).toContain('s');
    // After accepting (levelSince = 15) the next offer needs 7 more sessions.
    const accepted = { ...s, level: 'medium' as const, levelSince: 15 };
    expect(completionRun(accepted, logs, START, 20)).toBe(2); // days 17 and 19
  });

  it('a missed session breaks the run; a rest day never does', () => {
    const logs = logsFor(plan, 15, (d, id) => id === 's' && d !== 8);
    expect(completionRun(s, logs, START, 15)).toBe(3); // days 10, 12, 15
  });

  it('steps down only after 3 consecutive missed sessions, never counting rest days', () => {
    const medium = { ...s, level: 'medium' as const };
    const p = [daily('a'), daily('b'), daily('c'), medium];
    // Sessions on days 1, 3, 5 done; 8 and 10 missed (rest days 6, 7, 9 in between).
    const logs = logsFor(p, 12, (d, id) => id === 's' && d <= 5);
    const at = (today: number) =>
      reconcile({ plan: p, appliedPhase: 1, startKey: START, logs, today, yesterdayEditable: false });
    // Day 11 (Thu): last final day is 10 → two missed sessions (8, 10) → no step-down, although 5 calendar days passed.
    expect(at(11).plan.find((h) => h.habitId === 's')!.level).toBe('medium');
    expect(STEP_DOWN_MISSES).toBe(3);
    // Day 13 (Sat): 8, 10, 12 missed → step down.
    const r = at(13);
    expect(r.plan.find((h) => h.habitId === 's')!.level).toBe('easy');
    expect(r.events).toContainEqual(expect.objectContaining({ kind: 'stepDown', habitIds: ['s'] }));
  });

  it('a daily habit with the same history behaves exactly as before', () => {
    const d = daily('s', { level: 'medium' });
    const logs = logsFor([d], 12, (day) => day <= 5);
    const r = reconcile({ plan: [d], appliedPhase: 1, startKey: START, logs, today: 9, yesterdayEditable: false });
    expect(r.plan[0].level).toBe('easy'); // days 6, 7, 8 missed
  });

  it('Day 22 and Day 45 never raise a scheduled habit unless explicitly approved for it', () => {
    const approved = sched('t', MWF, { schedule: { days: MWF, phaseLevelUps: true } });
    const p = [daily('a'), s, approved];
    const r22 = reconcile({ plan: p, appliedPhase: 1, startKey: START, logs: {}, today: 22, yesterdayEditable: false });
    expect(r22.plan.map((h) => h.level)).toEqual(['medium', 'easy', 'medium']);
    const r45 = reconcile({
      plan: r22.plan,
      appliedPhase: 2,
      startKey: START,
      logs: {},
      today: 45,
      yesterdayEditable: false,
    });
    expect(r45.plan.map((h) => h.level)).toEqual(['hard', 'easy', 'hard']);
  });
});

describe('audit regressions (owner decisions of the scheduled-fitness review)', () => {
  it('editing the weekdays never rewrites past sessions: the run is kept and nothing steps down', () => {
    const before = sched('s', [1, 3, 5], { level: 'medium' });
    const logs = logsFor([before], 12, () => true); // sessions on days 1, 3, 5, 8, 10, 12 all done
    const after = { ...before, schedule: { days: [2, 4] as Weekday[] } }; // edited on day 13
    expect(completionRun(before, logs, START, 13)).toBe(6);
    expect(completionRun(after, logs, START, 13)).toBe(6);
    const r = reconcile({ plan: [after], appliedPhase: 1, startKey: START, logs, today: 13, yesterdayEditable: false });
    expect(r.plan[0].level).toBe('medium');
    expect(r.events).toEqual([]);
    // Past days follow their own records; days without a log follow the current schedule.
    expect(wasDueOn(after, logs, START, 1)).toBe(true); // a Monday session under the old days
    expect(wasDueOn(after, logs, START, 2)).toBe(false); // a Tuesday rest day then
    expect(wasDueOn(after, logs, START, 16)).toBe(true); // no log yet: Tuesday under the new days
    expect(wasDueOn(daily('d'), {}, START, 3)).toBe(true);
  });

  it('a missed session under the old days still counts as missed after an edit', () => {
    const before = sched('s', [1, 3, 5], { level: 'medium' });
    const logs = logsFor([before], 12, (d) => d <= 5); // 8, 10, 12 missed
    const after = { ...before, schedule: { days: [2, 4] as Weekday[] } };
    const r = reconcile({ plan: [after], appliedPhase: 1, startKey: START, logs, today: 13, yesterdayEditable: false });
    expect(r.plan[0].level).toBe('easy');
  });

  it('strength and balance never rise at Day 22 or 45, daily or scheduled, even if a phase flag is set', () => {
    expect([...ACCEPT_ONLY_LEVEL_UPS].sort()).toEqual(['move_balance', 'move_strength_prep', 'move_strength_session']);
    const p = [
      daily('a'),
      daily('move_balance'),
      sched('move_strength_session', [1, 4], { schedule: { days: [1, 4], phaseLevelUps: true } }),
      daily('move_strength_prep'),
    ];
    const r22 = reconcile({ plan: p, appliedPhase: 1, startKey: START, logs: {}, today: 22, yesterdayEditable: false });
    const r45 = reconcile({
      plan: r22.plan,
      appliedPhase: 2,
      startKey: START,
      logs: {},
      today: 45,
      yesterdayEditable: false,
    });
    expect(r22.plan.map((h) => h.level)).toEqual(['medium', 'easy', 'easy', 'easy']);
    expect(r45.plan.map((h) => h.level)).toEqual(['hard', 'easy', 'easy', 'easy']);
    // They still level up by accepting the 7-in-a-row offer.
    const logs = logsFor([p[1]], 7, () => true);
    expect(levelUpOffers([p[1]], logs, START, 7)).toEqual(['move_balance']);
  });
});

describe('schedule history: changes apply prospectively', () => {
  const MWF: Weekday[] = [1, 3, 5];
  const TT: Weekday[] = [2, 4];
  /** Logs only for the given (day → completed?) entries; every other day was never opened. */
  function sparseLogs(h: PlanHabit, entries: Record<number, boolean>) {
    const logs: Record<string, DayLog> = {};
    for (const [d, done] of Object.entries(entries)) {
      const day = Number(d);
      const date = dateForDay(START, day);
      logs[date] = {
        day,
        date,
        planned: isDueOn(h, START, day) ? [h.habitId] : [],
        completed: done ? [h.habitId] : [],
      };
    }
    return logs;
  }
  const step = (p: PlanHabit[], logs: Record<string, DayLog>, today: number) =>
    reconcile({ plan: p, appliedPhase: 1, startKey: START, logs, today, yesterdayEditable: false });

  it('records the old days as an era ending yesterday; the new days apply from today', () => {
    const s0 = { days: MWF };
    const s1 = rescheduled(s0, TT, 13, 1);
    expect(s1).toEqual({ days: TT, history: [{ days: MWF, until: 12 }] });
    expect(scheduleDaysOn(s1, 12)).toEqual(MWF);
    expect(scheduleDaysOn(s1, 13)).toEqual(TT);
    // A second change the same day keeps the era already recorded.
    expect(rescheduled(s1, [6, 0], 13, 1)).toEqual({ days: [6, 0], history: [{ days: MWF, until: 12 }] });
    // A habit added today has no past to keep.
    expect(rescheduled(s0, TT, 13, 13)).toEqual({ days: TT });
    expect(validSchedule(s1)).toBe(true);
  });

  it('after completed sessions, unlogged rest days in between stay rest days (run and level kept)', () => {
    const before = sched('s', MWF, { level: 'medium' });
    // Sessions 1, 3, 5, 8, 10, 12 done; the rest days (2, 4, 6, 7, 9, 11) were never opened.
    const logs = sparseLogs(before, { 1: true, 3: true, 5: true, 8: true, 10: true, 12: true });
    const after = { ...before, schedule: rescheduled(before.schedule!, TT, 13, 1) };
    expect(completionRun(after, logs, START, 13)).toBe(6);
    const r = step([after], logs, 14);
    expect(r.plan[0].level).toBe('medium');
    expect(r.events).toEqual([]);
    // Without the history, the unlogged Thursday (day 11) would read as a missed session: the run would be 1.
    const noHistory = { ...before, schedule: { days: TT } };
    expect(completionRun(noHistory, logs, START, 13)).toBe(1);
  });

  it('missed sessions that were never logged keep counting as missed after a change', () => {
    const before = sched('s', MWF, { level: 'medium' });
    // 1, 3, 5 done; then the app wasn't opened for the sessions on days 8, 10 and 12.
    const logs = sparseLogs(before, { 1: true, 3: true, 5: true });
    const after = { ...before, schedule: rescheduled(before.schedule!, TT, 13, 1) };
    const r = step([after], logs, 13);
    expect(r.plan[0].level).toBe('easy');
    expect(r.events).toContainEqual(expect.objectContaining({ kind: 'stepDown', habitIds: ['s'] }));
  });

  it('skipped rest days never turn into misses, whichever schedule follows', () => {
    const before = sched('s', MWF, { level: 'medium' });
    const logs = sparseLogs(before, { 8: true, 10: true, 12: true });
    const after = { ...before, schedule: rescheduled(before.schedule!, [0, 2, 4], 13, 1) };
    for (const d of [2, 4, 6, 7, 9, 11]) expect(wasDueOn(after, logs, START, d)).toBe(false);
    for (const d of [8, 10, 12]) expect(wasDueOn(after, logs, START, d)).toBe(true);
    expect(step([after], logs, 13).plan[0].level).toBe('medium');
  });

  it('several changes in one program each keep their own days', () => {
    let h = sched('s', MWF, { level: 'medium' });
    h = { ...h, schedule: rescheduled(h.schedule!, TT, 8, 1) }; // Mon/Wed/Fri for days 1–7
    h = { ...h, schedule: rescheduled(h.schedule!, [6, 0], 15, 1) }; // Tue/Thu for days 8–14
    h = { ...h, schedule: rescheduled(h.schedule!, MWF, 22, 1) }; // Sat/Sun for days 15–21, Mon/Wed/Fri after
    expect(h.schedule!.history).toEqual([
      { days: MWF, until: 7 },
      { days: TT, until: 14 },
      { days: [6, 0], until: 21 },
    ]);
    const due = Array.from({ length: 28 }, (_, i) => i + 1).filter((d) => isDueOn(h, START, d));
    expect(due).toEqual([1, 3, 5, 9, 11, 20, 21, 22, 24, 26]);
    // Every one of those sessions done (with logs only on session days): 10 in a row, nothing missed.
    const logs = sparseLogs(h, Object.fromEntries(due.map((d) => [d, true])));
    expect(completionRun(h, logs, START, 27)).toBe(10);
    // Day 22 passed (phase 2), but nothing stepped down.
    expect(step([h], logs, 27).events.filter((e) => e.kind === 'stepDown')).toEqual([]);
    expect(levelUpOffers([h], logs, START, 27)).toEqual(['s']);
  });

  it('validates history: ordered, valid days, whole non-negative days', () => {
    expect(validHistory([])).toBe(true);
    expect(
      validHistory([
        { days: MWF, until: 3 },
        { days: TT, until: 9 },
      ]),
    ).toBe(true);
    expect(
      validHistory([
        { days: MWF, until: 9 },
        { days: TT, until: 3 },
      ]),
    ).toBe(false);
    expect(validHistory([{ days: [1], until: 3 }])).toBe(false);
    expect(validHistory([{ days: MWF, until: 2.5 }])).toBe(false);
    expect(validHistory('yes')).toBe(false);
    expect(validSchedule({ days: TT, history: [{ days: MWF, until: -1 }] })).toBe(false);
  });
});
