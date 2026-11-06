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

/**
 * What a released swipe does. A done card is undone by swiping left: everything is mirrored. A release while the
 * finger is quickly heading back (a change of mind) cancels, even past the threshold.
 */
export function swipeOutcome(dx: number, vx: number, width: number, done: boolean): 'toggle' | 'cancel' {
  const dir = done ? -1 : 1;
  const d = dx * dir;
  const v = vx * dir;
  if (v <= -FLICK_SPEED) return 'cancel';
  return d >= width * SWIPE_THRESHOLD || (d >= width * FLICK_MIN && v >= FLICK_SPEED) ? 'toggle' : 'cancel';
}

/** Where the card follows the finger 1:1 before resistance begins, as a share of the threshold distance. */
export const RESIST_FROM = 0.8;

/**
 * How far the card moves for a finger `d` pt along the toggle direction (`reach` is the threshold distance). It
 * follows 1:1 up to RESIST_FROM of the threshold, then eases off smoothly (no kink: the slope starts at 1 and falls),
 * approaching 1.4 × reach however far the finger goes. The wrong way it gives a little, then stops (about 20 pt).
 */
export function dragOffset(d: number, reach: number): number {
  if (reach <= 0) return 0;
  if (d < 0) {
    const dim = 20;
    return -dim * (1 - 1 / ((-d * 0.15) / dim + 1));
  }
  const knee = reach * RESIST_FROM;
  if (d <= knee) return d;
  const dim = reach * 0.6;
  return knee + dim * (1 - 1 / ((d - knee) / dim + 1));
}
