import { weekOf } from './weekly';

/*
 * Less Scrolling's optional weekly Screen Time check (approved 2026-10-27). The person reads their own average from
 * Settings → Screen Time and enters it; Schwung stores it as **self-reported** and never checks it.
 *
 * Weekly measures are their own records, by program week: they never touch day logs, so entering, editing or
 * clearing one can't change any completed day, XP, streak or weekly goal. A missing week is simply absent: no
 * penalty, no reminder logic here. Pure and not used by the app yet.
 */

export type PullCategory = 'social' | 'video' | 'games' | 'other';

export type WeeklyMeasure = {
  v: 1;
  habitId: string;
  /** The program week (from `weekOf`: calendar weeks, Monday to Sunday, Week 1 contains Day 1). */
  week: number;
  /** The reported daily average for the main app or category, in minutes. */
  minutesPerDay: number;
  category?: PullCategory;
  /** Always the person's own reading of their phone; never verified by Schwung. */
  source: 'self-reported';
  /** How many times it was edited after first being entered. */
  edits?: number;
};

/** Saved as `measures[habitId][week]`. Optional: absent everywhere until the person records one. */
export type WeeklyMeasures = Record<string, Record<string, WeeklyMeasure>>;

const valid = (m: number) => Number.isFinite(m) && m >= 0 && m <= 1440;

/**
 * Records (or edits) the week's self-reported average for the week containing `dayInWeek`. Invalid values change
 * nothing. Returns new measures; nothing else is touched.
 */
export function recordWeekly(
  measures: WeeklyMeasures,
  startKey: string,
  dayInWeek: number,
  habitId: string,
  minutesPerDay: number,
  category?: PullCategory,
): WeeklyMeasures {
  if (!valid(minutesPerDay)) return measures;
  const week = weekOf(startKey, dayInWeek).week;
  const prev = measures[habitId]?.[week];
  const entry: WeeklyMeasure = {
    v: 1,
    habitId,
    week,
    minutesPerDay: Math.round(minutesPerDay),
    source: 'self-reported',
    ...((category ?? prev?.category) ? { category: category ?? prev?.category } : {}),
    ...(prev ? { edits: (prev.edits ?? 0) + 1 } : {}),
  };
  return { ...measures, [habitId]: { ...(measures[habitId] ?? {}), [week]: entry } };
}

/** Removes a week's measure (a mistake). */
export function clearWeekly(measures: WeeklyMeasures, habitId: string, week: number): WeeklyMeasures {
  if (!measures[habitId]?.[week]) return measures;
  const weeks = { ...measures[habitId] };
  delete weeks[week];
  return { ...measures, [habitId]: weeks };
}

/** The week's measure, or null when none was recorded (never a penalty). Damaged entries read as missing. */
export function weeklyMeasure(
  measures: WeeklyMeasures | undefined,
  habitId: string,
  week: number,
): WeeklyMeasure | null {
  const m = measures?.[habitId]?.[week] as Partial<WeeklyMeasure> | undefined;
  if (!m || m.v !== 1 || typeof m.minutesPerDay !== 'number' || !valid(m.minutesPerDay)) return null;
  return { ...(m as WeeklyMeasure), source: 'self-reported' };
}

/** Every recorded week, in week order (missing weeks are simply not there). */
export function weeklyHistory(measures: WeeklyMeasures | undefined, habitId: string): WeeklyMeasure[] {
  return Object.keys(measures?.[habitId] ?? {})
    .map((w) => weeklyMeasure(measures, habitId, Number(w)))
    .filter((m): m is WeeklyMeasure => m !== null)
    .sort((a, b) => a.week - b.week);
}
