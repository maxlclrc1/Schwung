import { describe, expect, it } from '@jest/globals';
import {
  ASCENT_PHASES,
  ascentDays,
  DAY_POINTS,
  describeDay,
  LANDMARKS,
  nearestDay,
  phaseFor,
  SUMMIT,
  trailDots,
} from '../ascent';
import { dateForDay } from '../dates';
import type { Logs } from '../progression';

const START = '2026-10-01';
const PLAN = ['a', 'b', 'c', 'd', 'e'];

/** Logs where each listed day has `done` of the 5 planned habits completed. */
function logsFor(days: Record<number, number>, extra: Record<number, string[]> = {}): Logs {
  const out: Logs = {};
  for (const [d, done] of Object.entries(days)) {
    const day = Number(d);
    const date = dateForDay(START, day);
    out[date] = { day, date, planned: PLAN, completed: [...PLAN.slice(0, done), ...(extra[day] ?? [])] };
  }
  return out;
}

function deepFreeze<T>(o: T): T {
  if (o && typeof o === 'object') {
    Object.values(o).forEach(deepFreeze);
    Object.freeze(o);
  }
  return o;
}

describe('trail geometry', () => {
  it('has exactly 66 day markers, all inside the art', () => {
    expect(DAY_POINTS).toHaveLength(66);
    for (const p of DAY_POINTS) {
      expect(p.x).toBeGreaterThan(0);
      expect(p.x).toBeLessThan(1);
      expect(p.y).toBeGreaterThan(0);
      expect(p.y).toBeLessThan(1);
    }
  });

  it('starts in the valley and ends exactly at the summit', () => {
    expect(DAY_POINTS[0].y).toBeGreaterThan(0.85);
    expect(DAY_POINTS[65]).toEqual(SUMMIT);
  });

  it('keeps markers evenly spaced in order along the trail', () => {
    const W = 343;
    const H = W / 1.5;
    const gaps = DAY_POINTS.slice(1).map((p, i) =>
      Math.hypot((p.x - DAY_POINTS[i].x) * W, (p.y - DAY_POINTS[i].y) * H),
    );
    // Small-iPhone width: every step is visible but none jumps far ahead.
    expect(Math.min(...gaps)).toBeGreaterThan(8);
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(1.6);
  });

  it('keeps switchbacks apart so markers stay readable', () => {
    const W = 343;
    const H = W / 1.5;
    let closest = Infinity;
    for (let i = 0; i < 66; i++)
      for (let j = i + 3; j < 66; j++)
        closest = Math.min(
          closest,
          Math.hypot((DAY_POINTS[i].x - DAY_POINTS[j].x) * W, (DAY_POINTS[i].y - DAY_POINTS[j].y) * H),
        );
    expect(closest).toBeGreaterThan(14);
  });

  it('climbs: each phase sits higher on the mountain than the one before', () => {
    const avgY = (from: number, to: number) =>
      DAY_POINTS.slice(from - 1, to).reduce((s, p) => s + p.y, 0) / (to - from + 1);
    expect(avgY(1, 21)).toBeGreaterThan(avgY(22, 44));
    expect(avgY(22, 44)).toBeGreaterThan(avgY(45, 66));
  });

  it('places trail dots only between consecutive days, in order', () => {
    const dots = trailDots(3);
    expect(dots).toHaveLength(65 * 3);
    for (let i = 1; i < dots.length; i++) expect(dots[i].between).toBeGreaterThanOrEqual(dots[i - 1].between);
    expect(dots[0].between).toBe(2);
    expect(dots[dots.length - 1].between).toBe(66);
  });
});

describe('phases and landmarks', () => {
  it('splits 66 days into Foundation, Momentum and Mastery with no gaps', () => {
    expect(ASCENT_PHASES.map((p) => [p.name, p.from, p.to])).toEqual([
      ['Foundation', 1, 21],
      ['Momentum', 22, 44],
      ['Mastery', 45, 66],
    ]);
    expect([1, 21, 22, 44, 45, 66].map((d) => phaseFor(d).name)).toEqual([
      'Foundation',
      'Foundation',
      'Momentum',
      'Momentum',
      'Mastery',
      'Mastery',
    ]);
  });

  it('marks landmarks at days 7, 21, 44 and 66 only', () => {
    expect(Object.keys(LANDMARKS).map(Number)).toEqual([7, 21, 44, 66]);
    const days = ascentDays({}, START, 1);
    expect(days.filter((d) => d.landmark).map((d) => d.day)).toEqual([7, 21, 44, 66]);
  });
});

describe('marker states', () => {
  it('day 1: today is day 1 and everything else is ahead', () => {
    const days = ascentDays({}, START, 1);
    expect(days.map((d) => d.day)).toEqual(Array.from({ length: 66 }, (_, i) => i + 1));
    expect(days[0].status).toBe('today');
    expect(days.slice(1).every((d) => d.status === 'future')).toBe(true);
  });

  it('day 66: earlier days are done or missed, 66 is today', () => {
    const all = Object.fromEntries(Array.from({ length: 65 }, (_, i) => [i + 1, 5]));
    const days = ascentDays(logsFor(all), START, 66);
    expect(days.slice(0, 65).every((d) => d.status === 'done')).toBe(true);
    expect(days[65].status).toBe('today');
  });

  it('after day 66 (maintenance), every day is in the past and nothing is "today"', () => {
    const days = ascentDays(logsFor({ 66: 5 }), START, 70);
    expect(days.some((d) => d.status === 'today' || d.status === 'future')).toBe(false);
    expect(days[65].status).toBe('done');
  });

  it('uses the 80% successful-day rule for "done"', () => {
    const days = ascentDays(logsFor({ 1: 5, 2: 4, 3: 3, 4: 0 }), START, 6);
    expect(days.slice(0, 5).map((d) => d.status)).toEqual(['done', 'done', 'missed', 'missed', 'missed']);
  });

  it('missed days never erase earlier progress', () => {
    const days = ascentDays(logsFor({ 1: 5, 2: 5, 3: 5 }), START, 10); // days 4-9 missed
    expect(days.slice(0, 3).every((d) => d.status === 'done')).toBe(true);
    expect(days.slice(3, 9).every((d) => d.status === 'missed')).toBe(true);
    expect(days[9].status).toBe('today');
  });

  it('ignores stale completed ids that were not planned that day', () => {
    const days = ascentDays(logsFor({ 1: 3 }, { 1: ['old1', 'old2'] }), START, 2);
    expect(days[0].status).toBe('missed');
    expect(days[0].done).toBe(3);
    expect(days[0].planned).toBe(5);
  });

  it('reports nothing done for future days even if a log exists', () => {
    const days = ascentDays(logsFor({ 5: 5 }), START, 3);
    expect(days[4]).toMatchObject({ status: 'future', done: 0, planned: 0 });
  });
});

describe('selecting a day', () => {
  it('finds the marker under a tap, or nothing if the tap is far from the trail', () => {
    const W = 343;
    const H = W / 1.5;
    const p = DAY_POINTS[29];
    expect(nearestDay({ x: p.x * W + 3, y: p.y * H - 2 }, W, H, 14)).toBe(30);
    expect(nearestDay({ x: 2, y: 2 }, W, H, 14)).toBeNull();
  });

  it('describes a day without changing any data', () => {
    const logs = deepFreeze(logsFor({ 1: 4, 2: 0 }));
    const snapshot = JSON.stringify(logs);
    const days = ascentDays(logs, START, 4);
    expect(describeDay(days[0])).toBe('Day 1 · Foundation · 4 of 5 done');
    expect(describeDay(days[1])).toBe('Day 2 · Foundation · 0 of 5 done');
    expect(describeDay(days[2])).toBe('Day 3 · Foundation · nothing logged');
    expect(describeDay(days[3])).toBe('Day 4 · Foundation · today');
    expect(describeDay(days[30])).toBe('Day 31 · Momentum · still ahead');
    expect(JSON.stringify(logs)).toBe(snapshot);
  });
});
