import { PROGRAM_DAYS } from './dates';
import { dayQualifies, doneCount, logForDay, Logs, PHASE_START } from './progression';

/**
 * The Schwung Ascent: 66 days laid out along a winding trail up a mountain.
 * Pure geometry and state only; drawing lives in components/Ascent.tsx.
 * Coordinates are normalized to the illustration (0..1 across, 0..1 down) so they line up
 * with the landscape art at any size, as long as the art is shown at ASCENT_ASPECT.
 */

/** Width / height of the landscape art and the area the trail is drawn in. */
export const ASCENT_ASPECT = 3 / 2;

export type AscentPhase = { n: 1 | 2 | 3; name: string; from: number; to: number };

export const ASCENT_PHASES: AscentPhase[] = [
  { n: 1, name: 'Foundation', from: 1, to: PHASE_START[2] - 1 },
  { n: 2, name: 'Momentum', from: PHASE_START[2], to: PHASE_START[3] - 1 },
  { n: 3, name: 'Mastery', from: PHASE_START[3], to: PROGRAM_DAYS },
];

/** Landmarks along the way. Visual only: ceremonies are decided elsewhere. */
export const LANDMARKS: Record<number, { name: string; icon: 'footsteps' | 'bonfire' | 'flag' | 'star' }> = {
  7: { name: 'First week', icon: 'footsteps' },
  21: { name: 'Base camp', icon: 'bonfire' },
  44: { name: 'High camp', icon: 'flag' },
  66: { name: 'Summit', icon: 'star' },
};

export type Point = { x: number; y: number };

/**
 * Switchbacks from the valley floor (bottom left) to the summit (upper right).
 * The summit point matches the peak drawn in assets/ascent-*.jpg.
 */
const WAYPOINTS: Point[] = [
  { x: 0.07, y: 0.9 },
  { x: 0.34, y: 0.92 },
  { x: 0.62, y: 0.87 },
  { x: 0.82, y: 0.78 },
  { x: 0.6, y: 0.7 },
  { x: 0.3, y: 0.66 },
  { x: 0.16, y: 0.57 },
  { x: 0.34, y: 0.48 },
  { x: 0.62, y: 0.45 },
  { x: 0.8, y: 0.37 },
  { x: 0.62, y: 0.29 },
  { x: 0.5, y: 0.22 },
  { x: 0.6, y: 0.15 },
  { x: 0.7, y: 0.105 },
];

export const SUMMIT = WAYPOINTS[WAYPOINTS.length - 1];

/** Catmull-Rom through the waypoints, sampled densely. */
function smoothPath(points: Point[], stepsPerSegment = 24): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < stepsPerSegment; s++) {
      const t = s / stepsPerSegment;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

/** Evenly spaced points along a polyline, by real on-screen distance (x is wider than y). */
function resample(path: Point[], count: number, aspect: number): Point[] {
  const len = (a: Point, b: Point) => Math.hypot((b.x - a.x) * aspect, b.y - a.y);
  const cumulative = [0];
  for (let i = 1; i < path.length; i++) cumulative.push(cumulative[i - 1] + len(path[i - 1], path[i]));
  const total = cumulative[cumulative.length - 1];
  const out: Point[] = [];
  let j = 1;
  for (let k = 0; k < count; k++) {
    const target = (total * k) / (count - 1);
    while (j < path.length - 1 && cumulative[j] < target) j++;
    const a = path[j - 1];
    const b = path[j];
    const span = cumulative[j] - cumulative[j - 1] || 1;
    const t = Math.min(1, Math.max(0, (target - cumulative[j - 1]) / span));
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

const DENSE = smoothPath(WAYPOINTS);

/** The 66 day markers, day 1 first, evenly spaced along the trail. */
export const DAY_POINTS: Point[] = resample(DENSE, PROGRAM_DAYS, ASCENT_ASPECT);

/**
 * Trail dots between markers: `perGap` dots between each pair of consecutive days.
 * `between` is the day the dot leads *to*, so a dot is lit once that day is reached.
 */
export function trailDots(perGap = 3): { x: number; y: number; between: number }[] {
  const dots: { x: number; y: number; between: number }[] = [];
  const fine = resample(DENSE, (PROGRAM_DAYS - 1) * (perGap + 1) + 1, ASCENT_ASPECT);
  for (let i = 0; i < fine.length - 1; i++) {
    if (i % (perGap + 1) === 0) continue; // that one is a day marker
    dots.push({ ...fine[i], between: Math.floor(i / (perGap + 1)) + 2 });
  }
  return dots;
}

export type DayStatus = 'done' | 'missed' | 'today' | 'future';

export type AscentDay = {
  day: number;
  phase: 1 | 2 | 3;
  point: Point;
  status: DayStatus;
  /** Habits done and planned on that day, from that day's own log (0/0 if there's no log). */
  done: number;
  planned: number;
  landmark: boolean;
};

export function phaseFor(day: number): AscentPhase {
  return ASCENT_PHASES.find((p) => day >= p.from && day <= p.to) ?? ASCENT_PHASES[2];
}

/**
 * State of every marker. "done" uses the existing successful-day rule (dayQualifies, 80%).
 * Past days that weren't successful are "missed" but stay on the walked trail, so a missed
 * day never hides earlier progress. Beyond day 66 (maintenance), every day is in the past.
 */
export function ascentDays(logs: Logs, startKey: string, today: number): AscentDay[] {
  return DAY_POINTS.map((point, i) => {
    const day = i + 1;
    const log = logForDay(logs, startKey, day);
    let status: DayStatus;
    if (day === today) status = 'today';
    else if (day > today) status = 'future';
    else status = dayQualifies(log) ? 'done' : 'missed';
    return {
      day,
      phase: phaseFor(day).n,
      point,
      status,
      done: log && day <= today ? doneCount(log) : 0,
      planned: log && day <= today ? log.planned.length : 0,
      landmark: day in LANDMARKS,
    };
  });
}

/** The nearest marker to a tap, within `radius` (in the same units as width/height), or null. */
export function nearestDay(
  tap: Point,
  width: number,
  height: number,
  radius: number,
  points: Point[] = DAY_POINTS,
): number | null {
  let best: number | null = null;
  let bestDist = radius;
  points.forEach((p, i) => {
    const d = Math.hypot(p.x * width - tap.x, p.y * height - tap.y);
    if (d <= bestDist) {
      bestDist = d;
      best = i + 1;
    }
  });
  return best;
}

/** Short, non-judgmental summary for a selected day. */
export function describeDay(d: AscentDay): string {
  const base = `Day ${d.day} · ${phaseFor(d.day).name}`;
  if (d.status === 'future') return `${base} · still ahead`;
  if (d.status === 'today') return `${base} · today`;
  if (d.planned === 0) return `${base} · nothing logged`;
  return `${base} · ${d.done} of ${d.planned} done`;
}
