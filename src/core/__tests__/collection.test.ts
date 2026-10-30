import { describe, expect, it } from '@jest/globals';
import { COLLECTIBLES, growth, newlyReached, sanitizeCollection, startTitle } from '../reset/collection';
import * as P from '../reset/pilot';

describe('growth and the collection', () => {
  it('climbs titles by XP, with the way to the next object', () => {
    expect(growth(0)).toMatchObject({ title: startTitle(), rank: 0, next: { id: 'compass' } });
    expect(growth(30).progress).toBeCloseTo(0.5);
    expect(growth(60)).toMatchObject({ title: 'Explorer', rank: 1, next: { id: 'edelweiss' } });
    expect(growth(5000)).toMatchObject({ title: 'Summit Keeper', rank: COLLECTIBLES.length, next: null, progress: 1 });
  });

  it('has thresholds that rise, within what 66 days can earn', () => {
    const xps = COLLECTIBLES.map((c) => c.xp);
    expect([...xps].sort((a, b) => a - b)).toEqual(xps);
    expect(new Set(COLLECTIBLES.map((c) => c.id)).size).toBe(COLLECTIBLES.length);
    // Three habits, every day for 66 days: 30 + 20 XP a day.
    expect(xps[xps.length - 1]).toBeLessThan(66 * 50);
  });

  it('unlocks what XP has reached, and keeps it after XP falls', () => {
    expect(newlyReached(200, []).map((c) => c.id)).toEqual(['compass', 'edelweiss']);
    expect(newlyReached(200, ['compass']).map((c) => c.id)).toEqual(['edelweiss']);
    // An undo lowered XP: nothing new, and nothing taken back (the saved list is the record).
    expect(newlyReached(50, ['compass', 'edelweiss'])).toEqual([]);
  });

  it('keeps the collection through a save, known objects only', () => {
    expect(sanitizeCollection({ unlocked: ['compass', 'x', 'compass', 3] })).toEqual({ unlocked: ['compass'] });
    const p = P.createPilot(
      { age: '30_49', precautions: [], minutesPerDay: 60 },
      [{ habitId: 'mind_read', intensity: 'starter' }],
      '2026-11-02',
    )!;
    const saved = JSON.parse(JSON.stringify({ ...p, collection: { unlocked: ['compass'] } }));
    expect(P.sanitizePilotProgram(saved)?.collection).toEqual({ unlocked: ['compass'] });
  });
});
