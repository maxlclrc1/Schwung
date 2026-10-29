import type { DayCell } from '../charts';

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
  let run = 0;
  let start: number | null = null;
  for (let d = today - 1; d >= 1; d--) {
    const s = cells[d - 1]?.state;
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

const LINES = [
  { title: 'Your path is still here.', body: 'Welcome back. Pick up where you are: one small step today is plenty.' },
  { title: 'Every step forward counts.', body: 'Good to see you. The trail continues from right here.' },
  {
    title: 'Welcome back. Pick up where you are.',
    body: 'The mountain isn’t going anywhere, and neither is what you’ve built.',
  },
];

/** The welcome's words, steady for a given absence. */
export const comebackText = (start: number) => LINES[start % LINES.length];
