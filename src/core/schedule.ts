import { dateForDay } from './dates';
import type { DayLog, PlanHabit, Schedule, ScheduleEra, Weekday } from './types';

/*
 * Scheduled habits: a habit due on chosen weekdays instead of every day (development-only foundation, see
 * SCHWUNG_V2_SCHEDULED_HABITS.md). A habit without a schedule is due every day, so every existing V1 and V2
 * plan behaves exactly as before. Weekdays come from the program's local calendar date keys, never from
 * elapsed time, so DST and timezone changes can't move a session.
 */

/** Sunday = 0 … Saturday = 6, as in `Date.getDay()`. */
export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5, 6, 0]; // display order, Monday first
export const WEEKDAY_SHORT: Record<Weekday, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};
export const WEEKDAY_LONG: Record<Weekday, string> = {
  0: 'Sunday',
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
};

/** Sessions per week a schedule may have (initially 2 or 3). */
export const SESSIONS_PER_WEEK = { min: 2, max: 3 } as const;

export function weekdayOfKey(key: string): Weekday {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() as Weekday;
}

export function weekdayOfDay(startKey: string, day: number): Weekday {
  return weekdayOfKey(dateForDay(startKey, day));
}

export function isScheduled(h: PlanHabit): boolean {
  return h.schedule !== undefined;
}

/** The weekdays a schedule had on a program day: the era covering it, or the current days after the last one. */
export function scheduleDaysOn(s: Schedule, day: number): Weekday[] {
  return s.history?.find((era) => day <= era.until)?.days ?? s.days;
}

/** Whether a habit is due on a program day, under the schedule in effect that day. Daily habits are always due. */
export function isDueOn(h: PlanHabit, startKey: string, day: number): boolean {
  return !h.schedule || scheduleDaysOn(h.schedule, day).includes(weekdayOfDay(startKey, day));
}

/**
 * The schedule after changing its days on program day `today`: the change applies from today on, and the days
 * that applied until yesterday become an era. A second change on the same day keeps the era already recorded.
 */
export function rescheduled(s: Schedule, days: Weekday[], today: number, addedOnDay: number): Schedule {
  const history = s.history ?? [];
  const last = history[history.length - 1];
  const until = today - 1;
  const recorded = (last && last.until >= until) || until < addedOnDay;
  return {
    ...s,
    days: [...days],
    ...(recorded ? {} : { history: [...history, { days: [...s.days], until }] }),
  };
}

/**
 * Whether a habit was due on a day, by that day's own record: a scheduled habit's past days are judged by what
 * was actually planned then (its log). Days without a log use the schedule that was in effect that day (its
 * history), so editing the days never rewrites past sessions. Daily habits are always due (unchanged).
 */
export function wasDueOn(h: PlanHabit, logs: Record<string, DayLog>, startKey: string, day: number): boolean {
  if (!h.schedule) return true;
  const log = logs[dateForDay(startKey, day)];
  return log ? log.planned.includes(h.habitId) : isDueOn(h, startKey, day);
}

/** The habits due on a program day, in plan order. */
export function dueOn(plan: PlanHabit[], startKey: string, day: number): PlanHabit[] {
  return plan.filter((h) => isDueOn(h, startKey, day));
}

/** The next program day (after `fromDay`) this habit is due, or null if it's daily. */
export function nextDueDay(h: PlanHabit, startKey: string, fromDay: number): number | null {
  if (!h.schedule) return null;
  for (let d = fromDay + 1; d <= fromDay + 7; d++) if (isDueOn(h, startKey, d)) return d;
  return null;
}

/** A valid schedule: 2–3 distinct weekdays. */
export function validDays(days: unknown): days is Weekday[] {
  return (
    Array.isArray(days) &&
    days.length >= SESSIONS_PER_WEEK.min &&
    days.length <= SESSIONS_PER_WEEK.max &&
    new Set(days).size === days.length &&
    days.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  );
}

/** Eras in order, each with valid days and a strictly increasing `until` day. */
export function validHistory(h: unknown): h is ScheduleEra[] {
  if (!Array.isArray(h)) return false;
  let prev = -Infinity;
  for (const era of h) {
    if (!era || typeof era !== 'object') return false;
    const { days, until } = era as Partial<ScheduleEra>;
    if (!validDays(days) || typeof until !== 'number' || !Number.isInteger(until) || until < 0 || until <= prev)
      return false;
    prev = until;
  }
  return true;
}

export function validSchedule(s: unknown): s is Schedule {
  if (!s || typeof s !== 'object') return false;
  const x = s as Partial<Schedule>;
  return (
    validDays(x.days) &&
    (x.phaseLevelUps === undefined || typeof x.phaseLevelUps === 'boolean') &&
    (x.history === undefined || validHistory(x.history))
  );
}

/**
 * Every weekday has at least one habit due. Plans are kept this way so no day ever has an empty checklist:
 * an empty day would score 0% under the 80% rule and break the streak (see the product decision in the doc).
 */
export function coversEveryWeekday(plan: PlanHabit[]): boolean {
  return ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).every((w) =>
    plan.some((h) => !h.schedule || h.schedule.days.includes(w)),
  );
}

/** "Mon · Wed · Fri", Monday first. */
export function scheduleLabel(s: Schedule): string {
  return WEEKDAYS.filter((w) => s.days.includes(w))
    .map((w) => WEEKDAY_SHORT[w])
    .join(' · ');
}

/** "today", "tomorrow" or the weekday name of the next session. */
export function nextSessionLabel(h: PlanHabit, startKey: string, today: number): string | null {
  if (!h.schedule) return null;
  if (isDueOn(h, startKey, today)) return 'today';
  const next = nextDueDay(h, startKey, today);
  if (next === null) return null;
  return next === today + 1 ? 'tomorrow' : WEEKDAY_LONG[weekdayOfDay(startKey, next)];
}
