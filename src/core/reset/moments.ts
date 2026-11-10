import { PROGRAM_DAYS } from '../dates';
import { dayCell } from './charts';
import * as P from './pilot';

/*
 * What the milestone moments, the summit and the welcome back can truthfully say (docs/66_DAY_EXPERIENCE_AUDIT.md,
 * Step 2). Four different things, never confused:
 *   - calendar progress: the day it is (Day 7, Day 21, Day 66), reached by everyone;
 *   - recorded activity: a day the person did something with their habits (one done, partly done, or deliberately
 *     skipped: a decision they recorded);
 *   - complete days: every habit the day asked for was done (pilot.ts dayFull);
 *   - the summit: Day 66 reached, open to everyone whatever happened on the way.
 * The moments themselves are unchanged: when they appear depends on the calendar alone. Only their words follow what
 * was recorded, so they never claim effort that didn't happen.
 */

/** A day with recorded activity: some habit done, partly done, kept with its minimum or deliberately skipped. */
export function activeOn(p: P.PilotProgram, day: number): boolean {
  return P.allHabits(p).some((id) => {
    if (P.isDone(p, id, day)) return true;
    const track = P.trackOf(p, id, day);
    return !!track.skipped || !!track.progress || P.minimumOn(p, id, day);
  });
}

/** Days from `from` to `to` (inclusive) with recorded activity. */
export function activeDays(p: P.PilotProgram, from: number, to: number): number {
  let n = 0;
  for (let d = from; d <= to; d++) if (activeOn(p, d)) n++;
  return n;
}

/** More than half the days: "most days". */
const most = (n: number, of: number) => n * 2 > of;

/**
 * A milestone's line, by what was recorded up to it. The moment appears as the day opens, before that day's habits:
 * shown on the milestone day itself, the person is here, so that day completes a run of the days before it; it is
 * only *counted* as a day with activity once something is recorded on it.
 * - Day 7: `line` ("Seven days of showing up…") when Days 1–6 had activity and Day 7 has too, or is today; `lineSome`
 *   (with the count of days with activity) when some did; `lineQuiet` (the calendar alone) when none did.
 * - Day 21: `line` ("The Foundation is laid…") when most of the 21 days had activity (today, the milestone day,
 *   counting as present); else `lineQuiet`.
 * - Day 44: `line` (the summit in view, Mastery beginning): calendar words, true for everyone.
 */
export function milestoneLine(
  p: P.PilotProgram,
  day: number,
  today: number,
): { key: 'line' | 'lineSome' | 'lineQuiet'; count: number } {
  const before = activeDays(p, 1, day - 1);
  const recorded = before + (activeOn(p, day) ? 1 : 0);
  const present = before + (activeOn(p, day) || today === day ? 1 : 0);
  if (day === 7) return { key: present === 7 ? 'line' : recorded > 0 ? 'lineSome' : 'lineQuiet', count: recorded };
  if (day === 21) return { key: most(present, 21) ? 'line' : 'lineQuiet', count: recorded };
  return { key: 'line', count: recorded };
}

/**
 * The summit's words: "You made it. All the way up." and the message about coming back when most of the 66 days had
 * activity; otherwise the quiet pair, which says where the person is (the summit) without inventing the climb. The
 * summit, its ceremony and its numbers are everyone's either way.
 */
export function summitWords(p: P.PilotProgram): {
  headline: 'headline' | 'headlineQuiet';
  message: 'message' | 'messageQuiet';
} {
  const active = most(activeDays(p, 1, PROGRAM_DAYS), PROGRAM_DAYS);
  return active ? { headline: 'headline', message: 'message' } : { headline: 'headlineQuiet', message: 'messageQuiet' };
}

/**
 * Complete days so far, for the welcome back ("Your N complete days are all still here"): every tracked day up to
 * today, so after Day 66 (Keep My Momentum) the days since the summit count too. Within the 66 days it's exactly the
 * Journey's count; the Journey, Story and summit keep their own 66-day numbers.
 */
export function completeDaysSoFar(p: P.PilotProgram, today: number): number {
  let n = 0;
  const last = Math.min(today, P.endDay(p));
  for (let d = 1; d <= last; d++) if (dayCell(p, d, today).state === 'full') n++;
  return n;
}
