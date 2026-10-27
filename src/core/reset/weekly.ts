import { dateForDay, PROGRAM_DAYS } from '../dates';
import { weekdayOfDay } from '../schedule';
import type { DayLog, Weekday } from '../types';
import { RESET_BY_ID, type Intensity, type Phase, type Schedule } from './habits';

/*
 * Flexible weekly scheduling for Life Reset habits (used only by the Life Reset pilot, in testing builds; V1/V2
 * daily and fixed-weekday scheduling in `schedule.ts` is untouched). Rules, with the reasons, are in
 * SCHWUNG_LIFE_RESET_CATALOG_NOTES.md ("Weekly scheduling rules"). In short:
 *
 * - Weeks are calendar weeks, Monday to Sunday, from the program's local date keys (never elapsed time, so DST and
 *   time-zone changes can't move a day). Week 1 is the calendar week containing Day 1; the last week ends on Day 66.
 * - A week's goal is the lowest goal in effect on any of its days (a rise waits for next week; an easier goal helps
 *   at once), scaled down for a partial week (program start or end, or a habit added mid-week).
 * - A day counts at most once. Completions beyond the goal are extras; completions on a day the habit isn't
 *   eligible (a weekend for a workdays habit) don't count toward the goal.
 * - Rest days are never misses. A week is achieved as soon as the goal is met, pending until the week closes, then
 *   not achieved if it fell short. A closed week with nothing recorded at all is unrecorded: neither achieved nor
 *   failed. No missed days are ever invented.
 * - Weekly adherence is its own measure, separate from the daily streak and the 80% day rule.
 */

export const WEEK_STARTS_ON: Weekday = 1; // Monday
export const DEFAULT_WORKDAYS: Weekday[] = [1, 2, 3, 4, 5];

/** From program day `fromDay` on, this schedule applies (until the next era). */
export type ScheduleEra = { fromDay: number; schedule: Schedule };

export type WeeklyContext = {
  startKey: string;
  /** The person's workdays, for workdays habits (Monday–Friday by default). */
  workdays?: Weekday[];
  /** Strength Training at Challenge: the sessions a week the person already does (kept as it is). */
  ownSessions?: number;
  /** Last program day weeks are evaluated for (Day 66 by default). */
  programDays?: number;
};

export type Week = { week: number; firstDay: number; lastDay: number };

/** Days since the start of the week (Monday = 0 … Sunday = 6). */
const sinceWeekStart = (wd: Weekday) => (wd - WEEK_STARTS_ON + 7) % 7;

/** The calendar week a program day falls in: its number (Week 1 contains Day 1) and its days within the program. */
export function weekOf(startKey: string, day: number, programDays = PROGRAM_DAYS): Week {
  const offsetDay1 = sinceWeekStart(weekdayOfDay(startKey, 1));
  const week = Math.floor((day - 1 + offsetDay1) / 7) + 1;
  const first = day - sinceWeekStart(weekdayOfDay(startKey, day));
  return { week, firstDay: Math.max(1, first), lastDay: Math.min(programDays, first + 6) };
}

/** Every week of the program, in order. */
export function programWeeks(startKey: string, programDays = PROGRAM_DAYS): Week[] {
  const out: Week[] = [];
  for (let d = 1; d <= programDays; d = out[out.length - 1].lastDay + 1) out.push(weekOf(startKey, d, programDays));
  return out;
}

/** The schedule in effect on a day, or null before the habit's first era. */
export function scheduleOn(eras: ScheduleEra[], day: number): Schedule | null {
  let current: Schedule | null = null;
  for (const e of eras) if (e.fromDay <= day) current = e.schedule;
  return current;
}

/** Whether a day can count toward the habit at all (only workdays habits have ineligible days). */
export function eligibleOn(schedule: Schedule, startKey: string, day: number, ctx?: Pick<WeeklyContext, 'workdays'>) {
  if (schedule.kind !== 'workdays') return true;
  return (ctx?.workdays ?? DEFAULT_WORKDAYS).includes(weekdayOfDay(startKey, day));
}

/** Eligible days in a full week for a schedule. */
const eligiblePerWeek = (s: Schedule, ctx: WeeklyContext) =>
  s.kind === 'workdays' ? (ctx.workdays ?? DEFAULT_WORKDAYS).length : 7;

/** The goal for a full week: completed days (or sessions) needed. */
export function fullWeekGoal(s: Schedule, ctx: Pick<WeeklyContext, 'workdays' | 'ownSessions'> = {}): number {
  switch (s.kind) {
    case 'daily':
      return 7;
    case 'weekly':
      return s.days;
    case 'workdays':
      return Math.min(s.days, (ctx.workdays ?? DEFAULT_WORKDAYS).length);
    case 'sessions':
      // The person's own number is kept as it is: never raised, at most one credited session a day.
      return s.perWeek === 'own' ? Math.min(7, Math.max(1, ctx.ownSessions ?? 2)) : s.perWeek;
  }
}

/**
 * How a habit's schedule changes over a program, from the catalog: each change of intensity or level (phase) from
 * the day it happens. Levels follow the person's progression, not the calendar, so the changes are inputs.
 */
export function erasFor(habitId: string, changes: { fromDay: number; intensity: Intensity; phase: Phase }[]) {
  const h = RESET_BY_ID[habitId];
  return changes.map((c) => ({ fromDay: c.fromDay, schedule: h.targets[c.intensity][c.phase].schedule }));
}

export type WeekStatus = 'achieved' | 'pending' | 'not-achieved' | 'no-goal' | 'unrecorded';

export type WeekSummary = Week & {
  /** Completed days (or sessions) needed this week; 0 when the week is too short to have a goal. */
  goal: number;
  /** Eligible days completed, at most one a day, up to the goal. */
  credited: number;
  /** Completed eligible days beyond the goal. */
  extra: number;
  /** Completions on days the habit isn't eligible (they never count toward the goal). */
  outside: number;
  /** Eligible days still ahead this week (today included, if not yet done). */
  remaining: number;
  stillPossible: boolean;
  closed: boolean;
  status: WeekStatus;
};

const done = (logs: Record<string, DayLog>, startKey: string, id: string, day: number) =>
  logs[dateForDay(startKey, day)]?.completed.includes(id) ?? false;

/**
 * One habit's week. `today` is the current program day; before noon yesterday is still editable, so a week ending
 * yesterday stays open until then (as everywhere else in Schwung).
 */
export function weekSummary(
  habitId: string,
  eras: ScheduleEra[],
  logs: Record<string, DayLog>,
  ctx: WeeklyContext,
  dayInWeek: number,
  today: number,
  yesterdayEditable = false,
): WeekSummary {
  const w = weekOf(ctx.startKey, dayInWeek, ctx.programDays);
  const active: { day: number; s: Schedule }[] = [];
  for (let d = w.firstDay; d <= w.lastDay; d++) {
    const s = scheduleOn(eras, d);
    if (s) active.push({ day: d, s });
  }
  const lastFinal = yesterdayEditable ? today - 2 : today - 1;
  const closed = w.lastDay <= lastFinal;
  if (active.length === 0)
    return {
      ...w,
      goal: 0,
      credited: 0,
      extra: 0,
      outside: 0,
      remaining: 0,
      stillPossible: false,
      closed,
      status: 'no-goal',
    };

  // The lowest goal in effect this week (a rise waits for next week), scaled to the eligible days the week has.
  const lowest = active.reduce((a, b) => (fullWeekGoal(b.s, ctx) < fullWeekGoal(a.s, ctx) ? b : a));
  const eligible = active.filter((x) => eligibleOn(x.s, ctx.startKey, x.day, ctx));
  const full = eligiblePerWeek(lowest.s, ctx);
  const raw = fullWeekGoal(lowest.s, ctx);
  const goal = Math.min(eligible.length, eligible.length >= full ? raw : Math.floor((raw * eligible.length) / full));

  const completedEligible = eligible.filter((x) => x.day <= today && done(logs, ctx.startKey, habitId, x.day));
  const outside = active.filter(
    (x) => x.day <= today && !eligibleOn(x.s, ctx.startKey, x.day, ctx) && done(logs, ctx.startKey, habitId, x.day),
  ).length;
  const credited = Math.min(goal, completedEligible.length);
  const extra = completedEligible.length - credited;
  const remaining = eligible.filter((x) => x.day >= today && !done(logs, ctx.startKey, habitId, x.day)).length;
  const stillPossible = credited + (closed ? 0 : remaining) >= goal;
  const recorded = active.some((x) => x.day <= today && logs[dateForDay(ctx.startKey, x.day)] !== undefined);

  const status: WeekStatus =
    goal === 0
      ? 'no-goal'
      : credited >= goal
        ? 'achieved'
        : !closed
          ? 'pending'
          : recorded
            ? 'not-achieved'
            : 'unrecorded';
  return { ...w, goal, credited, extra, outside, remaining: closed ? 0 : remaining, stillPossible, closed, status };
}

/** Every program week of one habit, from its first era. */
export function weekSummaries(
  habitId: string,
  eras: ScheduleEra[],
  logs: Record<string, DayLog>,
  ctx: WeeklyContext,
  today: number,
  yesterdayEditable = false,
): WeekSummary[] {
  const start = eras[0]?.fromDay ?? Infinity;
  return programWeeks(ctx.startKey, ctx.programDays)
    .filter((w) => w.lastDay >= start && w.firstDay <= today)
    .map((w) => weekSummary(habitId, eras, logs, ctx, w.firstDay, today, yesterdayEditable));
}

/**
 * Weekly adherence: the share of evaluated weeks that were achieved. Pending, no-goal and unrecorded weeks are left
 * out. Null when no week has been evaluated yet. Separate from the daily streak.
 */
export function weeklyAdherence(weeks: WeekSummary[]): number | null {
  const judged = weeks.filter((w) => w.status === 'achieved' || w.status === 'not-achieved');
  return judged.length ? judged.filter((w) => w.status === 'achieved').length / judged.length : null;
}

export type DayState =
  /** A daily habit: due today, as daily habits always are. */
  | 'due'
  /** Done today. */
  | 'done'
  /** A weekly habit with its goal still open this week: an invitation, never a miss. */
  | 'open'
  /** This week's goal is met: nothing outstanding today. */
  | 'goal-met'
  /** Not a day this habit counts on (a weekend for a workdays habit). */
  | 'not-eligible'
  /** Before the habit started, or outside the program. */
  | 'inactive';

/** What a habit asks of a day. A weekly habit never makes a day "missed". */
export function dayState(
  habitId: string,
  eras: ScheduleEra[],
  logs: Record<string, DayLog>,
  ctx: WeeklyContext,
  day: number,
): DayState {
  const s = scheduleOn(eras, day);
  if (!s || day < 1 || day > (ctx.programDays ?? PROGRAM_DAYS)) return 'inactive';
  if (done(logs, ctx.startKey, habitId, day)) return 'done';
  if (s.kind === 'daily') return 'due';
  if (!eligibleOn(s, ctx.startKey, day, ctx)) return 'not-eligible';
  const w = weekSummary(habitId, eras, logs, ctx, day, day);
  return w.goal > 0 && w.credited >= w.goal ? 'goal-met' : 'open';
}

/**
 * Whether a habit belongs in a day's 80% count: daily habits always do; a weekly habit only on a day it's done
 * (then it helps the day), so a rest day can never pull a day under 80%.
 */
export function countsTowardDay(schedule: Schedule, doneThatDay: boolean): boolean {
  return schedule.kind === 'daily' || doneThatDay;
}
