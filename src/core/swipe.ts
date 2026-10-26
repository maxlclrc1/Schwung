/*
 * The habit card's swipe, as rules (src/components/HabitCard.tsx). A touch on a card is either the page's scroll or
 * the card's swipe, decided by its first clear direction; a released swipe completes (or undoes) the habit when it
 * went far enough, or was a quick flick.
 */

/** How far across the card (as a share of its width) a drag has to go to count. */
export const SWIPE_THRESHOLD = 0.4;
/** A quick flick counts from a shorter drag: at least this share of the width, moving at least FLICK_SPEED. */
export const FLICK_MIN = 0.18;
export const FLICK_SPEED = 0.6; // pt per ms
/** Movement (pt) before a touch is read as a scroll or a swipe. */
export const SLOP_X = 12;
export const SLOP_Y = 10;

/**
 * Which way a touch is going: a scroll once it has moved SLOP_Y vertically (unless it's twice as far sideways), a
 * swipe once it has moved SLOP_X sideways and at least twice as far as vertically. Anything between is undecided:
 * diagonal drags wait, and almost always become scrolls. The caller keeps the first decision for the whole touch.
 */
export function touchIntent(dx: number, dy: number): 'swipe' | 'scroll' | 'undecided' {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ay >= SLOP_Y && ay * 2 > ax) return 'scroll';
  if (ax >= SLOP_X && ax >= ay * 2) return 'swipe';
  return 'undecided';
}

/** What a released swipe does. A done card is undone by swiping left: everything is mirrored. */
export function swipeOutcome(dx: number, vx: number, width: number, done: boolean): 'toggle' | 'cancel' {
  const dir = done ? -1 : 1;
  const d = dx * dir;
  const v = vx * dir;
  return d >= width * SWIPE_THRESHOLD || (d >= width * FLICK_MIN && v >= FLICK_SPEED) ? 'toggle' : 'cancel';
}
