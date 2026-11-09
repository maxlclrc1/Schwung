import { t, type TKey } from '../../i18n';
import type { DayCell } from '../charts';
import { PROGRAM_DAYS } from '../dates';
import { dayCell } from './charts';
import * as P from './pilot';

/*
 * The welcome back: a calm note on Habits for someone returning after time away. Emotional support only: it never
 * changes a day, the streak, XP, targets or the Journey.
 *
 * An absence is a run of at least two days just before today that each had something due and no activity at all
 * (nothing done, nothing deliberately skipped). Days with nothing due (rest days, weekly habits resting) are walked
 * past: they neither count toward an absence nor end one. It's identified by its first day, so each absence is
 * welcomed once.
 */

export const ABSENCE_DAYS = 2;

/** The first day of the absence that ends yesterday, if it's at least ABSENCE_DAYS long; null otherwise. */
export function absenceStart(cells: DayCell[], today: number): number | null {
  return absenceFrom((d) => cells[d - 1]?.state, today, 1);
}

/**
 * The same rule over a program's tracked days, judged one day at a time from yesterday back (only as far as needed):
 * Days 1–66 exactly as the Journey judges them, and, with Keep My Momentum, the days after the summit too, so the
 * welcome back keeps working past Day 66. Nothing is tracked while the program waits for a choice after the summit,
 * so nothing is welcomed then. When the person chose later than Day 67, the days between were a pause, not part of
 * an absence: only days from the choice on are walked.
 */
export function programAbsence(p: P.PilotProgram, today: number): number | null {
  if (P.awaitingChoice(p, today)) return null;
  const since = p.after?.since;
  const from = since !== undefined && since > PROGRAM_DAYS + 1 ? since : 1;
  const last = P.endDay(p);
  return absenceFrom((d) => (d <= last ? dayCell(p, d, today).state : undefined), today, from);
}

/** The walk itself: from yesterday back to `from`, over each day's state (undefined: not tracked, ends the walk). */
function absenceFrom(stateOf: (day: number) => DayCell['state'] | undefined, today: number, from: number) {
  let run = 0;
  let start: number | null = null;
  for (let d = today - 1; d >= from; d--) {
    const s = stateOf(d);
    if (!s || s === 'future') break;
    if (s === 'rest') continue;
    if (s === 'missed' || s === 'unrecorded') {
      run++;
      start = d;
      continue;
    }
    break; // full, partial or skipped: there was activity
  }
  return run >= ABSENCE_DAYS ? start : null;
}

const LINES = 3;

/** The welcome's words, steady for a given absence. */
export const comebackText = (start: number) => ({
  title: t(`progress.comeback.${start % LINES}.title` as TKey),
  body: t(`progress.comeback.${start % LINES}.body` as TKey),
});
