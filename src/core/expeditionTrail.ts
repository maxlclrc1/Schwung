/*
 * The expedition trails on Journey, one per chapter of the climb, each a map in trail units (358 wide) scaled to the
 * screen's width. A route is a Catmull-Rom curve (tension 1/6) through hand-placed waypoints: smooth bends of uneven
 * size, like a river seen from above. Each day sits along it by distance at an uneven stride, and its number goes
 * beside the route on the side with the most room. Everything here is computed once, at load.
 *
 * Foundation (Days 1–21) is the approved design's own (docs/design-exploration/journey-organic-trail-*.png,
 * 5c42dd8), starting at Day 1. Momentum (Days 22–44) picks up where Foundation leaves the map, at the top right.
 */

export const TRAIL_W = 358;

type P = readonly [number, number];
type Bezier = readonly [P, P, P, P];

export type TrailDay = {
  day: number;
  x: number;
  y: number;
  /** How far along the route the day sits, in trail units, from the start of the drawn line. */
  at: number;
  /** Where its number sits, beside the route (today's is drawn inside its marker instead). */
  label: { x: number; y: number };
};

export type Trail = {
  first: number;
  last: number;
  /** The map's height in trail units. */
  h: number;
  /** The route as an SVG path, in trail units. */
  path: string;
  /** The drawn route's length, in trail units. */
  length: number;
  days: readonly TrailDay[];
};

const STEPS = 48;

const bez = ([a, b, c, d]: Bezier, t: number): [number, number] => {
  const u = 1 - t;
  const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  return [w[0] * a[0] + w[1] * b[0] + w[2] * c[0] + w[3] * d[0], w[0] * a[1] + w[1] * b[1] + w[2] * c[1] + w[3] * d[1]];
};

/** The part of a Bézier after t (de Casteljau). */
function after([a, b, c, d]: Bezier, t: number): Bezier {
  const mix = (p: P, q: P): P => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
  const ab = mix(a, b);
  const bc = mix(b, c);
  const cd = mix(c, d);
  const abc = mix(ab, bc);
  const bcd = mix(bc, cd);
  return [mix(abc, bcd), bcd, cd, d];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

function makeTrail({
  first,
  h,
  waypoints,
  gaps,
  start,
  span,
  fromFirstDay,
}: {
  first: number;
  h: number;
  waypoints: readonly P[];
  /** The stride from each day to the next: longer on the easy reaches, shorter through the tight bends. */
  gaps: readonly number[];
  /** Where the first day sits, and how much of the route the days span, as shares of its length. */
  start: number;
  span: number;
  /** Draw the line from the first day only (nothing leads in to it). */
  fromFirstDay: boolean;
}): Trail {
  const segments: Bezier[] = waypoints.slice(0, -1).map((p1, i) => {
    const p0 = waypoints[i - 1] ?? p1;
    const p2 = waypoints[i + 1];
    const p3 = waypoints[i + 2] ?? p2;
    const k = 1 / 6;
    return [
      p1,
      [r1(p1[0] + (p2[0] - p0[0]) * k), r1(p1[1] + (p2[1] - p0[1]) * k)],
      [r1(p2[0] - (p3[0] - p1[0]) * k), r1(p2[1] - (p3[1] - p1[1]) * k)],
      p2,
    ];
  });

  // The route sampled finely, with the distance walked at each sample.
  const samples: [number, number][] = [];
  const dist: number[] = [];
  for (const s of segments) {
    for (let i = samples.length ? 1 : 0; i <= STEPS; i++) {
      const p = bez(s, i / STEPS);
      const prev = samples[samples.length - 1];
      dist.push(prev ? dist[dist.length - 1] + Math.hypot(p[0] - prev[0], p[1] - prev[1]) : 0);
      samples.push(p);
    }
  }
  const full = dist[dist.length - 1];
  const index = (l: number) => {
    let lo = 0;
    let hi = dist.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (dist[mid] <= l) lo = mid;
      else hi = mid;
    }
    return { lo, hi, f: dist[hi] === dist[lo] ? 0 : (l - dist[lo]) / (dist[hi] - dist[lo]) };
  };
  const pointAt = (length: number): [number, number] => {
    const { lo, hi, f } = index(Math.max(0, Math.min(full, length)));
    return [
      samples[lo][0] + (samples[hi][0] - samples[lo][0]) * f,
      samples[lo][1] + (samples[hi][1] - samples[lo][1]) * f,
    ];
  };

  const total = gaps.reduce((a, b) => a + b, 0);
  const shares = gaps.reduce((acc, g) => [...acc, acc[acc.length - 1] + (g / total) * span], [start]);
  const placed = shares.map((s, i) => {
    const at = s * full;
    const [x, y] = pointAt(at);
    return { day: first + i, x, y, at };
  });

  // Numbers beside the route, on whichever side keeps them clearest of the path, the markers and each other.
  const coarse = samples.filter((_, i) => i % 4 === 0);
  const labels: { x: number; y: number }[] = [];
  const labelFor = (d: (typeof placed)[number]) => {
    const a = pointAt(d.at - 3);
    const b = pointAt(d.at + 3);
    const n = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const tx = (b[0] - a[0]) / n;
    const ty = (b[1] - a[1]) / n;
    let best: { s: number; x: number; y: number } | null = null;
    for (const side of [1, -1])
      for (const away of [19, 23])
        for (const skew of [0, -6, 6]) {
          const x = d.x - ty * side * away + tx * skew;
          const y = d.y + tx * side * away + ty * skew;
          if (x < 12 || x > TRAIL_W - 12) continue;
          const dp = Math.min(...coarse.map((s) => Math.hypot(s[0] - x, s[1] - y)));
          const dl = labels.length ? Math.min(...labels.map((p) => Math.hypot(p.x - x, p.y - y))) : 99;
          const dm = Math.min(...placed.filter((o) => o.day !== d.day).map((o) => Math.hypot(o.x - x, o.y - y)));
          const s = Math.min(dp * 1.4, dl, dm) - away * 0.15 - Math.abs(skew) * 0.1;
          if (!best || s > best.s) best = { s, x, y };
        }
    const label = best ? { x: best.x, y: best.y } : { x: d.x, y: d.y + 20 };
    labels.push(label);
    return label;
  };
  const withLabels = placed.map((d) => ({ ...d, label: labelFor(d) }));

  // The drawn line: the whole route, or from the first day on (the curve split exactly at that day).
  const from = fromFirstDay ? placed[0].at : 0;
  let path: string;
  if (fromFirstDay) {
    const { hi, f } = index(from);
    const seg = Math.floor((hi - 1) / STEPS);
    const t = (((hi - 1) % STEPS) + f) / STEPS;
    const head = after(segments[seg], t);
    path =
      `M${r1(head[0][0])},${r1(head[0][1])}` +
      [head, ...segments.slice(seg + 1)]
        .map(([, a, b, e]) => ` C${r1(a[0])},${r1(a[1])} ${r1(b[0])},${r1(b[1])} ${e[0]},${e[1]}`)
        .join('');
  } else {
    path =
      `M${waypoints[0][0]},${waypoints[0][1]}` +
      segments.map(([, a, b, e]) => ` C${a[0]},${a[1]} ${b[0]},${b[1]} ${e[0]},${e[1]}`).join('');
  }

  return {
    first,
    last: first + gaps.length,
    h,
    path,
    length: full - from,
    days: withLabels.map((d) => ({ ...d, at: d.at - from })),
  };
}

export const FOUNDATION_TRAIL = makeTrail({
  first: 1,
  h: 900,
  waypoints: [
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
  ],
  gaps: [1.15, 0.95, 1.1, 1.25, 0.9, 1.0, 1.2, 0.85, 1.0, 1.3, 1.05, 0.9, 0.8, 0.85, 0.9, 1.0, 1.2, 0.95, 1.1, 1.0],
  start: 0.035,
  span: 0.93,
  fromFirstDay: true,
});

/**
 * Momentum enters at the top right, where Foundation's line leaves its map: a long traverse under a ridge, a curl
 * round a knoll, a crossing of the valley, a tight bend against the steep hillside on the right, a long reach down
 * and a broad last sweep to High camp (Day 44).
 */
export const MOMENTUM_TRAIL = makeTrail({
  first: 22,
  h: 1200,
  waypoints: [
    [304, -8],
    [300, 50],
    [268, 108],
    [206, 138],
    [142, 160],
    [84, 192],
    [46, 244],
    [40, 308],
    [74, 356],
    [132, 378],
    [196, 394],
    [250, 430],
    [294, 490],
    [316, 556],
    [298, 614],
    [250, 640],
    [190, 662],
    [132, 706],
    [92, 766],
    [86, 826],
    [118, 870],
    [176, 888],
    [238, 904],
    [288, 944],
    [302, 1004],
    [274, 1058],
    [214, 1086],
    [168, 1124],
    [152, 1206],
  ],
  gaps: [
    1.15, 1.05, 1.18, 1.0, 0.9, 1.1, 1.0, 1.15, 1.25, 1.0, 0.89, 0.9, 0.95, 1.2, 1.0, 0.9, 1.05, 1.08, 1.06, 1.07, 0.97,
    1.0,
  ],
  start: 0.05,
  span: 0.9,
  fromFirstDay: false,
});
