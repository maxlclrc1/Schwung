import { describe, expect, it } from '@jest/globals';
import { FOUNDATION_DAYS, TRAIL_DAYS, TRAIL_H, TRAIL_LENGTH, TRAIL_PATH, TRAIL_W } from '../foundationTrail';

describe('Foundation trail geometry', () => {
  it('places Days 1–21 in order along the route, inside the map', () => {
    expect(TRAIL_DAYS.map((d) => d.day)).toEqual(Array.from({ length: FOUNDATION_DAYS }, (_, i) => i + 1));
    for (let i = 1; i < TRAIL_DAYS.length; i++) expect(TRAIL_DAYS[i].at).toBeGreaterThan(TRAIL_DAYS[i - 1].at);
    expect(TRAIL_DAYS[TRAIL_DAYS.length - 1].at).toBeLessThan(TRAIL_LENGTH);
    for (const d of TRAIL_DAYS) {
      expect(d.x).toBeGreaterThan(0);
      expect(d.x).toBeLessThan(TRAIL_W);
      expect(d.y).toBeGreaterThan(0);
      expect(d.y).toBeLessThan(TRAIL_H);
      expect(d.label.x).toBeGreaterThanOrEqual(12);
      expect(d.label.x).toBeLessThanOrEqual(TRAIL_W - 12);
    }
    expect(TRAIL_PATH.startsWith('M36,12 C')).toBe(true);
  });

  it('gives every day a 44 pt target that never overlaps a neighbour on a 375 pt iPhone', () => {
    const scale = (375 - 32) / TRAIL_W;
    for (const a of TRAIL_DAYS)
      for (const b of TRAIL_DAYS)
        if (a.day < b.day)
          expect(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)) * scale).toBeGreaterThanOrEqual(44);
  });

  it('keeps each number clear of its own and other markers', () => {
    for (const d of TRAIL_DAYS)
      for (const o of TRAIL_DAYS) expect(Math.hypot(d.label.x - o.x, d.label.y - o.y)).toBeGreaterThan(14);
  });
});
