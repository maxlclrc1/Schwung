import { ASCENT_ASPECT, type Point, resample, smoothPath } from '../ascent';
import { CAMPS, FN_DAYS } from './journey';

/*
 * Field Notes' own route in the continuous world: a lakeside walk, distinct from the Journey switchbacks. It
 * starts at the tent on the shore, winds up through the pines to the meadow, crosses the rocky meadow and ends on
 * the ridge overlooking the upper lake. Coordinates are fractions of the Field Notes trail area (3:2, the screen's
 * width), which shows the panorama's Field Notes region from row LAKESIDE_BAND_TOP down (1024 rows); placed by
 * eye on design/canvas/panorama-dark-v2.jpg. Each camp sits exactly on its waypoint; the days between two camps
 * are spaced evenly along that stretch.
 */

/** The panorama row at the top of the Field Notes trail area (the Journey painting's is row 800). */
export const LAKESIDE_BAND_TOP = 1300;

const WAYPOINTS: Point[] = [
  { x: 0.42, y: 0.875 }, // Your question (day 1): the shore, beside the tent
  { x: 0.34, y: 0.8 },
  { x: 0.25, y: 0.725 },
  { x: 0.16, y: 0.645 }, // Starting point (day 4): the meadow's edge, above the pines
  { x: 0.09, y: 0.56 },
  { x: 0.17, y: 0.455 }, // First look (day 7): on the rocky meadow
  { x: 0.26, y: 0.37 },
  { x: 0.33, y: 0.245 }, // Discovery (day 11): the shoulder
  { x: 0.4, y: 0.16 },
  { x: 0.5, y: 0.075 }, // Field note (day 14): the ridge over the upper lake
];
/** Which waypoint each camp sits on, in CAMPS order. */
const CAMP_WAYPOINT = [0, 3, 5, 7, 9];
const STEPS = 24;
const PER_GAP = 3;

function build() {
  const dense = smoothPath(WAYPOINTS, STEPS);
  const days: Point[] = [];
  const dots: (Point & { between: number })[] = [];
  for (let k = 0; k < CAMPS.length - 1; k++) {
    const from = CAMPS[k].day;
    const n = CAMPS[k + 1].day - from;
    const leg = dense.slice(CAMP_WAYPOINT[k] * STEPS, CAMP_WAYPOINT[k + 1] * STEPS + 1);
    days.push(...resample(leg, n + 1, ASCENT_ASPECT).slice(0, -1));
    resample(leg, n * (PER_GAP + 1) + 1, ASCENT_ASPECT).forEach((p, i) => {
      if (i % (PER_GAP + 1)) dots.push({ ...p, between: from + Math.floor(i / (PER_GAP + 1)) + 1 });
    });
  }
  days.push(dense[dense.length - 1]);
  return { days, dots };
}

const ROUTE = build();

/** Where each of the 14 days sits (day 1 first). */
export const LAKESIDE_DAYS: Point[] = ROUTE.days;
/** Dots between consecutive days; `between` is the day a dot leads to, so it lights up once that day is reached. */
export const LAKESIDE_DOTS = ROUTE.dots;

export const lakesidePoint = (day: number): Point => LAKESIDE_DAYS[Math.min(Math.max(day, 1), FN_DAYS) - 1];
