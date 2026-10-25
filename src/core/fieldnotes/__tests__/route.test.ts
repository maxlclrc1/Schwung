import { describe, expect, it } from '@jest/globals';
import { CAMPS, FN_DAYS } from '../journey';
import { LAKESIDE_DAYS, LAKESIDE_DOTS, lakesidePoint } from '../route';

describe('the lakeside route', () => {
  it('has a place for each of the 14 days, inside the scene, from the shore up to the overlook', () => {
    expect(LAKESIDE_DAYS).toHaveLength(FN_DAYS);
    for (const p of LAKESIDE_DAYS) {
      expect(p.x).toBeGreaterThan(0.05);
      expect(p.x).toBeLessThan(0.95);
      expect(p.y).toBeGreaterThan(0.05);
      expect(p.y).toBeLessThan(0.92);
    }
    // Day 1 by the tent on the shore (low), day 14 on the ridge (high).
    expect(LAKESIDE_DAYS[0]).toEqual({ x: 0.42, y: 0.875 });
    expect(LAKESIDE_DAYS[13]).toEqual({ x: 0.5, y: 0.075 });
  });

  it('puts every camp exactly on its waypoint, keeping the five camps and their days', () => {
    const at = CAMPS.map((c) => lakesidePoint(c.day));
    expect(at).toEqual([
      { x: 0.42, y: 0.875 },
      { x: 0.16, y: 0.645 },
      { x: 0.17, y: 0.455 },
      { x: 0.33, y: 0.245 },
      { x: 0.5, y: 0.075 },
    ]);
    expect(lakesidePoint(0)).toEqual(lakesidePoint(1));
    expect(lakesidePoint(20)).toEqual(lakesidePoint(14));
  });

  it('has 3 dots between each pair of days, each lit by the day it leads to', () => {
    expect(LAKESIDE_DOTS).toHaveLength((FN_DAYS - 1) * 3);
    for (let day = 2; day <= FN_DAYS; day++) expect(LAKESIDE_DOTS.filter((d) => d.between === day)).toHaveLength(3);
  });
});
