import { describe, expect, it } from '@jest/globals';
import { FOUNDATION_TRAIL, MASTERY_TRAIL, MOMENTUM_TRAIL, TRAIL_W, type Trail } from '../expeditionTrail';

const cheb = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));

describe.each([
  ['Foundation', FOUNDATION_TRAIL, 1, 21],
  ['Momentum', MOMENTUM_TRAIL, 22, 44],
  ['Mastery', MASTERY_TRAIL, 45, 66],
] as [string, Trail, number, number][])('%s trail', (_, trail, first, last) => {
  it('places its days in order along the route, inside the map', () => {
    expect(trail.first).toBe(first);
    expect(trail.last).toBe(last);
    expect(trail.days.map((d) => d.day)).toEqual(Array.from({ length: last - first + 1 }, (_, i) => first + i));
    for (let i = 1; i < trail.days.length; i++) expect(trail.days[i].at).toBeGreaterThan(trail.days[i - 1].at);
    expect(trail.days[trail.days.length - 1].at).toBeLessThanOrEqual(trail.length + 1e-6);
    for (const d of trail.days) {
      expect(d.x).toBeGreaterThan(0);
      expect(d.x).toBeLessThan(TRAIL_W);
      expect(d.y).toBeGreaterThan(0);
      expect(d.y).toBeLessThan(trail.h);
      expect(d.label.x).toBeGreaterThanOrEqual(12);
      expect(d.label.x).toBeLessThanOrEqual(TRAIL_W - 12);
    }
  });

  it('gives every day a 44 pt target clear of its neighbours on a 375 pt iPhone', () => {
    const scale = (375 - 32) / TRAIL_W;
    for (const a of trail.days)
      for (const b of trail.days) if (a.day < b.day) expect(cheb(a, b) * scale).toBeGreaterThanOrEqual(44);
  });

  it('keeps each number clear of the markers', () => {
    for (const d of trail.days)
      for (const o of trail.days) expect(Math.hypot(d.label.x - o.x, d.label.y - o.y)).toBeGreaterThan(14);
  });
});

describe('the chapters', () => {
  it('starts Foundation’s line at Day 1, with nothing leading in', () => {
    const [x, y] = FOUNDATION_TRAIL.path.slice(1).split(' ')[0].split(',').map(Number);
    expect(Math.hypot(x - FOUNDATION_TRAIL.days[0].x, y - FOUNDATION_TRAIL.days[0].y)).toBeLessThan(0.5);
    expect(FOUNDATION_TRAIL.days[0].at).toBe(0);
  });

  it('enters Momentum where Foundation leaves its map, with room for 44 pt targets even at 320 pt', () => {
    expect(MOMENTUM_TRAIL.path.startsWith('M304,')).toBe(true);
    expect(FOUNDATION_TRAIL.path.endsWith(' 304,900')).toBe(true);
    const scale = (320 - 32) / TRAIL_W;
    for (const a of MOMENTUM_TRAIL.days)
      for (const b of MOMENTUM_TRAIL.days) if (a.day < b.day) expect(cheb(a, b) * scale).toBeGreaterThanOrEqual(44);
  });

  it('enters Mastery where Momentum leaves its map, and ends the line at Day 66', () => {
    expect(MOMENTUM_TRAIL.path.endsWith(' 152,1206')).toBe(true);
    expect(MASTERY_TRAIL.path.startsWith('M152,')).toBe(true);
    const end = MASTERY_TRAIL.days[MASTERY_TRAIL.days.length - 1];
    expect(end.day).toBe(66);
    expect(MASTERY_TRAIL.length - end.at).toBeLessThan(0.5);
  });

  it('keeps every chapter’s 44 pt targets apart even at 320 pt, apart from Foundation’s tightest bends', () => {
    const scale = (320 - 32) / TRAIL_W;
    for (const trail of [MOMENTUM_TRAIL, MASTERY_TRAIL])
      for (const a of trail.days)
        for (const b of trail.days) if (a.day < b.day) expect(cheb(a, b) * scale).toBeGreaterThanOrEqual(44);
  });
});
