/*
 * The Foundation trail on Journey (Days 1–21), in trail units: a 358 × 900 map, scaled to the screen's width.
 * The route and its rhythm are the approved design's own (docs/design-exploration/journey-organic-trail-*.png,
 * 5c42dd8): smooth bends of uneven size like a river seen from above, drawn as a Catmull-Rom curve through these
 * waypoints, with each day placed along it by distance at an uneven stride. Everything here is computed once.
 */

export const TRAIL_W = 358;
export const TRAIL_H = 900;
export const FOUNDATION_DAYS = 21;

type P = readonly [number, number];

const WAYPOINTS: readonly P[] = [
  [36, 12],
  [120, 22],
  [210, 18],
  [282, 44],
  [318, 98],
  [312, 162],
  [268, 196],
  [214, 188],
  [178, 206],
  [146, 248],
  [90, 268],
  [48, 318],
  [56, 380],
  [108, 404],
  [176, 398],
  [236, 418],
  [296, 460],
  [318, 520],
  [290, 566],
  [230, 574],
  [198, 608],
  [200, 656],
  [170, 700],
  [104, 712],
  [64, 754],
  [90, 808],
  [170, 828],
  [250, 840],
  [298, 874],
  [304, 900],
];

/** The stride from one day to the next: longer on the easy reaches, shorter through the tight bends. */
const GAPS = [
  1.15, 0.95, 1.1, 1.25, 0.9, 1.0, 1.2, 0.85, 1.0, 1.3, 1.05, 0.9, 0.8, 0.85, 0.9, 1.0, 1.2, 0.95, 1.1, 1.0,
];

type Bezier = readonly [P, P, P, P];

/** Catmull-Rom (tension 1/6) through the waypoints, as cubic Béziers. */
const SEGMENTS: Bezier[] = WAYPOINTS.slice(0, -1).map((p1, i) => {
  const p0 = WAYPOINTS[i - 1] ?? p1;
  const p2 = WAYPOINTS[i + 1];
  const p3 = WAYPOINTS[i + 2] ?? p2;
  const k = 1 / 6;
  const r = (n: number) => Math.round(n * 10) / 10;
  return [
    p1,
    [r(p1[0] + (p2[0] - p0[0]) * k), r(p1[1] + (p2[1] - p0[1]) * k)],
    [r(p2[0] - (p3[0] - p1[0]) * k), r(p2[1] - (p3[1] - p1[1]) * k)],
    p2,
  ];
});

/** The route as an SVG path, in trail units. */
export const TRAIL_PATH =
  `M${WAYPOINTS[0][0]},${WAYPOINTS[0][1]}` +
  SEGMENTS.map(([, a, b, e]) => ` C${a[0]},${a[1]} ${b[0]},${b[1]} ${e[0]},${e[1]}`).join('');

const bez = ([a, b, c, d]: Bezier, t: number): [number, number] => {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [w[0] * a[0] + w[1] * b[0] + w[2] * c[0] + w[3] * d[0], w[0] * a[1] + w[1] * b[1] + w[2] * c[1] + w[3] * d[1]];
};

// The route sampled finely, with the distance walked at each sample.
const SAMPLES: [number, number][] = [];
const AT: number[] = [];
for (const s of SEGMENTS) {
  for (let i = SAMPLES.length ? 1 : 0; i <= 48; i++) {
    const p = bez(s, i / 48);
    const prev = SAMPLES[SAMPLES.length - 1];
    AT.push(prev ? AT[AT.length - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1]) : 0);
    SAMPLES.push(p);
  }
}
/** The route's length, in trail units. */
export const TRAIL_LENGTH = AT[AT.length - 1];

function pointAt(length: number): [number, number] {
  const l = Math.max(0, Math.min(TRAIL_LENGTH, length));
  let lo = 0;
  let hi = AT.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (AT[mid] <= l) lo = mid;
    else hi = mid;
  }
  const f = AT[hi] === AT[lo] ? 0 : (l - AT[lo]) / (AT[hi] - AT[lo]);
  return [
    SAMPLES[lo][0] + (SAMPLES[hi][0] - SAMPLES[lo][0]) * f,
    SAMPLES[lo][1] + (SAMPLES[hi][1] - SAMPLES[lo][1]) * f,
  ];
}

export type TrailDay = {
  day: number;
  x: number;
  y: number;
  /** How far along the route the day sits, in trail units (the walked line ends at today's). */
  at: number;
  /** Where its number sits, beside the route on the side with more room (none for today, numbered inside). */
  label: { x: number; y: number };
};

const total = GAPS.reduce((a, b) => a + b, 0);
const share = GAPS.reduce((acc, g) => [...acc, acc[acc.length - 1] + (g / total) * 0.93], [0.035]);

const placed: { day: number; x: number; y: number; at: number }[] = share.map((s, i) => {
  const at = s * TRAIL_LENGTH;
  const [x, y] = pointAt(at);
  return { day: i + 1, x, y, at };
});

// Numbers go beside the route, on whichever side keeps them clearest of the path, the markers and each other.
const coarse = SAMPLES.filter((_, i) => i % 4 === 0);
const labels: { x: number; y: number }[] = [];
function labelFor(d: (typeof placed)[number]) {
  const a = pointAt(d.at - 3);
  const b = pointAt(d.at + 3);
  const n = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const tx = (b[0] - a[0]) / n;
  const ty = (b[1] - a[1]) / n;
  let best: { s: number; x: number; y: number } | null = null;
  for (const side of [1, -1])
    for (const dist of [19, 23])
      for (const skew of [0, -6, 6]) {
        const x = d.x - ty * side * dist + tx * skew;
        const y = d.y + tx * side * dist + ty * skew;
        if (x < 12 || x > TRAIL_W - 12) continue;
        const dp = Math.min(...coarse.map((s) => Math.hypot(s[0] - x, s[1] - y)));
        const dl = labels.length ? Math.min(...labels.map((p) => Math.hypot(p.x - x, p.y - y))) : 99;
        const dm = Math.min(...placed.filter((o) => o.day !== d.day).map((o) => Math.hypot(o.x - x, o.y - y)));
        const s = Math.min(dp * 1.4, dl, dm) - dist * 0.15 - Math.abs(skew) * 0.1;
        if (!best || s > best.s) best = { s, x, y };
      }
  const label = best ? { x: best.x, y: best.y } : { x: d.x, y: d.y + 20 };
  labels.push(label);
  return label;
}

/**
 * The 21 days on the route. Labels are placed for every day in order (the approved layout skipped only today's,
 * which is numbered inside its marker; placing all keeps each label fixed whichever day is today).
 */
export const TRAIL_DAYS: readonly TrailDay[] = placed.map((d) => ({ ...d, label: labelFor(d) }));
