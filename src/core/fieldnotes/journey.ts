import { dateForDay, dayNumber } from '../dates';
import type { FnDay, FnRun } from './types';

/*
 * The 14 days. Days 1–3 note a starting point (no experiment yet); days 4–14 run the experiment; day 7 is a first
 * look, day 11 the discovery and decision, day 14 the last note. Days come from calendar dates, so a missed day
 * just has no record: nothing resets and nothing counts as zero.
 */
export const FN_DAYS = 14;
export const BASELINE = { from: 1, to: 3 } as const;
export const EXPERIMENT = { from: 4, to: FN_DAYS } as const;
export const FIRST_LOOK = 7;
export const DISCOVERY = 11;

export type Stage = 'baseline' | 'experiment' | 'decide' | 'done';

export function dayOf(startKey: string, todayKey: string): number {
  return Math.max(1, dayNumber(startKey, todayKey));
}

export function stageOf(day: number): Stage {
  if (day <= BASELINE.to) return 'baseline';
  if (day < DISCOVERY) return 'experiment';
  if (day <= FN_DAYS) return 'decide';
  return 'done';
}

/** The record for a day of the run (undefined when nothing was recorded). */
export function dayRecord(run: Pick<FnRun, 'startedAt' | 'days'>, day: number): FnDay | undefined {
  return run.days[dateForDay(run.startedAt, day)];
}

export type CampKey = 'question' | 'start' | 'firstLook' | 'discovery' | 'note';

export type Camp = {
  key: CampKey;
  name: string;
  /** The day it's reached. */
  day: number;
  icon: 'help' | 'footsteps' | 'eye' | 'bulb' | 'bookmark';
};

/** Five camps: each is a real moment in the experiment, not a count of check-offs. */
export const CAMPS: Camp[] = [
  { key: 'question', name: 'Your question', day: 1, icon: 'help' },
  { key: 'start', name: 'Starting point', day: 4, icon: 'footsteps' },
  { key: 'firstLook', name: 'First look', day: FIRST_LOOK, icon: 'eye' },
  { key: 'discovery', name: 'Discovery', day: DISCOVERY, icon: 'bulb' },
  { key: 'note', name: 'Field note', day: FN_DAYS, icon: 'bookmark' },
];

/** Whether a camp has been reached: by its day, and for the field note also by a decision. */
export function campReached(camp: Camp, day: number, run: Pick<FnRun, 'decision'>): boolean {
  if (camp.key === 'note') return day > FN_DAYS || (day === FN_DAYS && !!run.decision);
  return day >= camp.day;
}

/** Where a Field Notes day sits on the Ascent trail (0..1 of its length). */
export const trailFraction = (day: number) => (Math.min(Math.max(day, 1), FN_DAYS) - 1) / (FN_DAYS - 1);

/** Days before today that have no record at all since the last recorded day (for a gentle welcome back). */
export function daysAway(run: Pick<FnRun, 'startedAt' | 'days'>, today: number): number {
  let away = 0;
  for (let d = today - 1; d >= 1; d--) {
    const r = dayRecord(run, d);
    if (r && (r.tried !== undefined || r.rating !== undefined)) break;
    away++;
  }
  return away;
}

/** The action for today: after an "easier" decision on days 11–14, the easier version. */
export function todaysAction(run: Pick<FnRun, 'experiment' | 'decision' | 'next'>): string {
  return run.decision === 'easier' && run.next ? run.next.action : run.experiment.action;
}
