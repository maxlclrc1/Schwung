import { pendingChange } from './readiness';
import * as P from './pilot';

/*
 * Ways forward after a "harder than expected" week (docs/RECOVERY_SYSTEM_PROPOSAL.md, phase R1A). Pure.
 *
 * The weekly reflection offers only what this person can actually do today, and nothing happens without their
 * explicit confirmation:
 * - make a habit easier: a catalog habit whose next easier target is real and allowed (the existing "Make it easier":
 *   nextRealEasier, safety, age and time checks, from tomorrow or next Monday), and that has no change waiting;
 * - focus on fewer habits: stop one of them, through the existing removal (its past stays; at least one stays);
 * - keep the plan: always there, and choosing it changes nothing.
 *
 * Nothing here looks at missing days, readiness or the streak: the person's own answer is the only trigger.
 */

export type WaysForward = {
  /** Habits (in card order) with a real, allowed easier target today. */
  easier: string[];
  /** Habits (in card order) that could be stopped today: empty with only one left. */
  fewer: string[];
};

const NONE: WaysForward = { easier: [], fewer: [] };

export function waysForward(p: P.PilotProgram, today: number): WaysForward {
  // A program waiting for the person's choice after the summit, or paused for age, isn't changed from here.
  if (P.awaitingChoice(p, today) || P.ageRestricted(p)) return NONE;
  const easier = p.habits.filter(
    (id) => !p.custom?.[id] && !pendingChange(p.progression[id], today) && !('blocked' in P.easier(p, id, today)),
  );
  const fewer = p.habits.filter((id) => P.removeProblem(p, id) === null);
  return { easier, fewer };
}
