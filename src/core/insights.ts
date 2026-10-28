import { bestWeek, cellBase, type DayCell, mondayIndex, type Records, weekPoint, type WeekPoint } from './charts';
import { dateForDay, PROGRAM_DAYS } from './dates';
import { bestStreak, currentStreak, doneCount } from './progression';
import { wasDueOn, weekdayOfDay } from './schedule';
import type { DayLog, PlanHabit } from './types';

/*
 * Insights for an existing V1/V2 program, from its saved days only (Life Reset programs have their own, in
 * reset/pilot.ts, because their weekly habits are counted by the week). Nothing is invented: a day without a record
 * is a day nothing was checked off, today is counted only once something's done, and rest days of scheduled habits
 * are never opportunities. Rules: SCHWUNG_LIFE_RESET_PROGRAM.md ("Insights").
 */

export type Tally = { done: number; eligible: number };
type Logs = Record<string, DayLog>;

const logOf = (logs: Logs, start: string, day: number) => logs[dateForDay(start, day)];
const doneOn = (logs: Logs, start: string, id: string, day: number) =>
  !!logOf(logs, start, day)?.completed.includes(id);

/**
 * One habit's opportunities: each day it was due from the day it joined to yesterday, and today once it's done
 * (an unfinished today is still possible, never a miss).
 */
export function programHabitTally(h: PlanHabit, logs: Logs, start: string, today: number, from = 1, to = today): Tally {
  let done = 0;
  let eligible = 0;
  for (let d = Math.max(from, h.addedOnDay); d <= Math.min(to, today, PROGRAM_DAYS); d++) {
    if (!wasDueOn(h, logs, start, d)) continue;
    const ok = doneOn(logs, start, h.habitId, d);
    if (d < today || ok) eligible++;
    if (ok) done++;
  }
  return { done, eligible };
}

export function programTally(plan: PlanHabit[], logs: Logs, start: string, today: number, from = 1, to = today): Tally {
  return plan.reduce(
    (t, h) => {
      const x = programHabitTally(h, logs, start, today, from, to);
      return { done: t.done + x.done, eligible: t.eligible + x.eligible };
    },
    { done: 0, eligible: 0 },
  );
}

/** Every habit check-off on record (counted the way XP counts them: done and on that day's list). */
export const programTotal = (logs: Logs) => Object.values(logs).reduce((n, l) => n + doneCount(l), 0);

/** This calendar week (Monday to today): each due day of each habit is eligible, today included. */
export function programWeekTally(plan: PlanHabit[], logs: Logs, start: string, today: number): Tally {
  const sinceMonday = (weekdayOfDay(start, today) + 6) % 7;
  let done = 0;
  let eligible = 0;
  for (let d = Math.max(1, today - sinceMonday); d <= today; d++)
    for (const h of plan) {
      if (d < h.addedOnDay || !wasDueOn(h, logs, start, d)) continue;
      eligible++;
      if (doneOn(logs, start, h.habitId, d)) done++;
    }
  return { done, eligible };
}

/** A habit's last days, newest last: done, missed, rest (not due), or today (still open). */
export function programRecent(h: PlanHabit, logs: Logs, start: string, today: number, n = 14) {
  const out: { day: number; state: 'done' | 'missed' | 'rest' | 'today' }[] = [];
  for (let d = Math.max(1, today - n + 1); d <= Math.min(today, PROGRAM_DAYS); d++) {
    const due = d >= h.addedOnDay && wasDueOn(h, logs, start, d);
    out.push({
      day: d,
      state: doneOn(logs, start, h.habitId, d) ? 'done' : d === today ? 'today' : due ? 'missed' : 'rest',
    });
  }
  return out;
}

export const programStreak = currentStreak;

// --- Charts (the same opportunities as above; shapes in charts.ts) ---

/** Each program week (Monday to Sunday) up to this one. */
export function programTrend(plan: PlanHabit[], logs: Logs, start: string, today: number): WeekPoint[] {
  const last = Math.min(today, PROGRAM_DAYS);
  const out: WeekPoint[] = [];
  for (let first = 1, week = 1; first <= last; week++) {
    const lastDay = Math.min(PROGRAM_DAYS, first + 6 - mondayIndex(start, first));
    let recorded = false;
    for (let d = first; d <= Math.min(lastDay, last) && !recorded; d++) recorded = !!logOf(logs, start, d);
    const t = programTally(plan, logs, start, today, first, lastDay);
    out.push(weekPoint({ week, firstDay: first, lastDay }, t, lastDay < today, recorded));
    first = lastDay + 1;
  }
  return out;
}

/** Every program day with what was done and due (a V1/V2 program has no skips; rested sessions aren't due). */
export function programCells(plan: PlanHabit[], logs: Logs, start: string, today: number): DayCell[] {
  const out: DayCell[] = [];
  for (let d = 1; d <= PROGRAM_DAYS; d++) {
    const base = cellBase(start, d);
    if (d > today) {
      out.push({ ...base, state: 'future', done: [], skipped: [], planned: [] });
      continue;
    }
    const log = logOf(logs, start, d);
    const due = plan.filter((h) => d >= h.addedOnDay && wasDueOn(h, logs, start, d)).map((h) => h.habitId);
    const planned = log ? log.planned : due;
    const done = planned.filter((id) => log?.completed.includes(id));
    const state: DayCell['state'] =
      done.length > 0 && done.length === planned.length
        ? 'full'
        : d === today
          ? 'today'
          : done.length
            ? 'partial'
            : planned.length === 0
              ? 'rest'
              : log
                ? 'missed'
                : 'unrecorded';
    out.push({ ...base, state, done, skipped: [], planned });
  }
  return out;
}

const daysDone = (logs: Logs, id: string) => Object.values(logs).filter((l) => l.completed.includes(id)).length;
const STRENGTH = ['move_strength_session', 'move_strength_gentle'];

export function programRecords(
  plan: PlanHabit[],
  logs: Logs,
  start: string,
  today: number,
  trend = programTrend(plan, logs, start, today),
): Records {
  const ids = plan.map((h) => h.habitId);
  const strength = ids.filter((id) => STRENGTH.includes(id));
  return {
    bestWeek: bestWeek(trend),
    total: programTotal(logs),
    readingDays: ids.includes('mind_read') ? daysDone(logs, 'mind_read') : null,
    strengthSessions: strength.length ? strength.reduce((n, id) => n + daysDone(logs, id), 0) : null,
    bestStreak: bestStreak(logs, start, Math.min(today, PROGRAM_DAYS)),
  };
}
