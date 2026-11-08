import type { AgeBand } from '../../core/reset/profile';
import { t } from '../../i18n';
import { isolateNumbers } from '../../i18n/direction';

/* The age question's drawing and labels (AgeBands.tsx), kept apart from the view so they can be checked on their own. */

/* The drawing, in units of a 340-wide box: drawn to the real width (round waypoints at any size), its height scaled
 * to the screen. Uneven in-between points and contours keep it from looking plotted. */
export const W = 340;
export const H = 92;
export const STOPS: [number, number][] = [
  [30, 57],
  [99, 43],
  [169, 58],
  [240, 45],
  [309, 55],
];
export const TRAIL: [number, number][] = [[-16, 63], [4, 61], ...STOPS, [336, 58], [358, 61]];
/** Contour lines in the Journey map's manner: uneven spacing, some breaking off, none parallel to the trail. */
export const CONTOURS: [number, number][][] = [
  [
    [-10, 20],
    [34, 16],
    [78, 10],
    [120, 13],
    [158, 21],
    [200, 17],
    [246, 9],
    [290, 12],
    [350, 18],
  ],
  [
    [-10, 31],
    [40, 27],
    [86, 24],
    [128, 28],
    [170, 34],
    [214, 29],
    [262, 24],
    [310, 27],
    [350, 31],
  ],
  [
    [60, 38],
    [92, 33],
    [126, 37],
    [150, 44],
  ],
  [
    [-10, 76],
    [38, 78],
    [80, 72],
    [126, 74],
    [176, 80],
    [222, 76],
    [268, 70],
    [310, 73],
    [350, 78],
  ],
  [
    [-10, 88],
    [52, 90],
    [108, 85],
    [170, 89],
    [232, 86],
    [292, 84],
    [350, 89],
  ],
  [
    [196, 64],
    [226, 66],
    [262, 62],
    [282, 66],
  ],
];

/** A smooth line through the points (Catmull-Rom as cubic Béziers), scaled by kx and ky. */
export function smoothPath(points: [number, number][], kx = 1, ky = 1) {
  const p = points.map(([x, y]) => [x * kx, y * ky] as const);
  let d = `M${p[0][0].toFixed(1)},${p[0][1].toFixed(1)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i];
    const b = p[i];
    const c = p[i + 1];
    const e = p[i + 2] ?? c;
    const n = (v: number) => v.toFixed(1);
    d += ` C${n(b[0] + (c[0] - a[0]) / 6)},${n(b[1] + (c[1] - a[1]) / 6)} ${n(c[0] - (e[0] - b[0]) / 6)},${n(c[1] - (e[1] - b[1]) / 6)} ${n(c[0])},${n(c[1])}`;
  }
  return d;
}
/** The waypoints' heights: the trail wanders, but the first and last sit level, so it never reads as a climb. */
export const WAYPOINT_HEIGHTS = STOPS.map(([, y]) => y);

/** The label set-up shows for a band ("65 or older" here; New Ascent's compact control keeps "65+"). */
export const ageBandLabel = (b: AgeBand) =>
  isolateNumbers(b === '65p' ? t('setup.ageBands.older') : t(`setup.age.${b}`));
