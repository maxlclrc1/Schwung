/*
 * Swiping between the tabs (testing builds; src/components/PagerTabs.tsx): where a released page swipe lands, and how
 * far a page moves for a drag. Both run on the UI thread, in the pager's gesture (worklets). Distances are in pt, velocities in pt per ms; dx < 0 is a swipe to the left, which
 * goes to the next tab.
 */

/** The slide between tabs, for a swipe or a tap; the world pans with the same timing. */
export const PAGE_MS = 340;

/** How far across the screen a page has to be dragged to go to the next one. */
export const PAGE_THRESHOLD = 0.3;
/** A quick flick goes from a shorter drag: at least this share of the width, moving at least PAGE_FLICK_SPEED. */
export const PAGE_FLICK_MIN = 0.1;
export const PAGE_FLICK_SPEED = 0.5;
/** Past the first or last tab a page only gives a little. */
export const EDGE_RESISTANCE = 0.2;

/** The tab a released swipe lands on: the next or previous one, or the same one (it springs back). */
export function pageTarget(dx: number, vx: number, width: number, index: number, count: number): number {
  'worklet';
  const dir = dx < 0 ? 1 : -1;
  const next = index + dir;
  if (dx === 0 || next < 0 || next >= count) return index;
  // A flick back the other way cancels, however far the drag went.
  if (vx * dx < 0 && Math.abs(vx) >= PAGE_FLICK_SPEED) return index;
  const far = Math.abs(dx) >= width * PAGE_THRESHOLD;
  const flick = Math.abs(dx) >= width * PAGE_FLICK_MIN && Math.abs(vx) >= PAGE_FLICK_SPEED;
  return far || flick ? next : index;
}

/** How far the page moves for a drag: with the finger, or only a little past the first or last tab. */
export function pageOffset(dx: number, index: number, count: number): number {
  'worklet';
  const pastEdge = (index === 0 && dx > 0) || (index === count - 1 && dx < 0);
  return pastEdge ? dx * EDGE_RESISTANCE : dx;
}
