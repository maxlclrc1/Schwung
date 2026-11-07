/*
 * How a habit card moves when it's completed or undone (HabitCard). Pure, so the rules are testable; the functions
 * are worklets, so the card's animated styles can call them on the UI thread.
 *
 * - The check in the corner fades in and settles from a touch smaller, in COMPLETE_MS, never overshooting. Undo is
 *   the same curve in reverse.
 * - Confirmation: the card's sage wash lifts a little and settles back (CONFIRM_LIFT), once, on completing. Nothing
 *   moves and nothing changes size.
 * - Reduce Motion: no scale, no lift and no slide, only a short opacity change (REDUCED_MS).
 */

export const COMPLETE_MS = 260;
export const REDUCED_MS = 150;
/** The check's size as it starts to appear (it settles to 1). */
export const CHECK_FROM = 0.85;
/** How much the sage wash lifts on confirming (opacity, added at the peak). */
export const CONFIRM_LIFT = 0.08;
/** The confirmation's rise and fall (ms): together within COMPLETE_MS. */
export const CONFIRM_UP_MS = 90;
export const CONFIRM_DOWN_MS = 170;

/** The done transition's length. */
export const doneDuration = (reduceMotion: boolean) => (reduceMotion ? REDUCED_MS : COMPLETE_MS);

/** The corner check at done progress `p` (0..1): opacity and scale, monotonic, never past 1. */
export function checkLook(p: number, reduceMotion: boolean): { opacity: number; scale: number } {
  'worklet';
  const k = Math.min(1, Math.max(0, p));
  return { opacity: k, scale: reduceMotion ? 1 : CHECK_FROM + (1 - CHECK_FROM) * k };
}

/** The status line's done side: its fade, and (with motion) a short rise into place. */
export function statusLook(p: number, reduceMotion: boolean): { opacity: number; translateY: number } {
  'worklet';
  const k = Math.min(1, Math.max(0, p));
  return { opacity: k, translateY: reduceMotion ? 0 : (1 - k) * 4 };
}

/** The sage wash's extra opacity from the confirmation (`c` 0..1..0); none with Reduce Motion. */
export function confirmLift(c: number, reduceMotion: boolean): number {
  'worklet';
  return reduceMotion ? 0 : CONFIRM_LIFT * Math.min(1, Math.max(0, c));
}
