/*
 * Journey's weekly discoveries: one small painted scene beside the trail for each week of the 66 days (gentians by
 * Day 7, a cairn by Day 14 … a pennant by the summit). Scenery, not rewards: nothing is earned, counted or saved.
 * Each is revealed by the calendar (the program's day reaching `day`), never by completed habits, and stays revealed.
 *
 * Positions are in trail units of their chapter (core/expeditionTrail.ts), the illustration's bottom centre at
 * (x, y), `width` wide, `aspect` = height / width of its art. They were placed clear of every day's marker, number
 * and touch target and of the trail itself; tune them here.
 */

export type Discovery = {
  id: string;
  /** 1 Foundation, 2 Momentum, 3 Mastery. */
  chapter: 1 | 2 | 3;
  /** The program day that reveals it. */
  day: number;
  x: number;
  y: number;
  width: number;
  aspect: number;
};

export const DISCOVERIES: readonly Discovery[] = [
  { id: 'gentians', chapter: 1, day: 7, x: 168.8, y: 333.5, width: 78, aspect: 0.667 }, // Gentians and edelweiss
  { id: 'cairn', chapter: 1, day: 14, x: 290.8, y: 651.7, width: 56, aspect: 0.828 }, // A stone cairn
  { id: 'signpost', chapter: 1, day: 21, x: 327.0, y: 859.4, width: 48, aspect: 1.224 }, // A trail signpost
  { id: 'streamlet', chapter: 2, day: 28, x: 120.1, y: 340.6, width: 84, aspect: 0.478 }, // A meltwater streamlet
  { id: 'footbridge', chapter: 2, day: 35, x: 149.2, y: 643.4, width: 84, aspect: 0.489 }, // A footbridge over a stream
  { id: 'lantern', chapter: 2, day: 42, x: 308.5, y: 1123.6, width: 45, aspect: 1.161 }, // A lantern on a mossy rock
  { id: 'ice_axe', chapter: 3, day: 49, x: 249.9, y: 247.8, width: 59, aspect: 0.881 }, // An ice axe in the scree
  { id: 'pine', chapter: 3, day: 56, x: 250.3, y: 502.7, width: 78, aspect: 0.683 }, // A wind-bent pine and heather
  { id: 'rope', chapter: 3, day: 63, x: 271.9, y: 895.1, width: 76, aspect: 0.531 }, // A rope and carabiner
  { id: 'pennant', chapter: 3, day: 66, x: 186.0, y: 1065.2, width: 64, aspect: 0.911 }, // A pennant among wildflowers
];

/** Revealed once the program's day has reached it (missed days never hide one again). */
export const discoveryRevealed = (d: Discovery, today: number) => today >= d.day;
