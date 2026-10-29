import { describe, expect, it } from '@jest/globals';
import * as P from '../reset/pilot';
import { storyAvailable, storyFacts } from '../reset/story';

const ADULT: P.PilotAnswers = { age: '30_49', precautions: [], minutesPerDay: 60 };
const start = () => P.createPilot(ADULT, [{ habitId: 'mind_read', intensity: 'starter' }], '2026-11-02')!;
const doneOn = (p: P.PilotProgram, days: number[]) => days.reduce((x, d) => P.complete(x, 'mind_read', d).program, p);

describe('the 66-day story', () => {
  it('tells only what the saved days hold, never rounding up', () => {
    const p = doneOn(start(), [1, 2, 3, 10]);
    const f = storyFacts(p, 67);
    expect(f.daysCompleted).toBe(4);
    expect(f.complete).toEqual([1, 2, 3, 10]);
    expect(f.totalDone).toBe(4);
    expect(f.longestStreak).toBe(3);
    expect(f.habits).toBe(1);
    expect(f.from).toBe('2026-11-02');
  });

  it('has a highlight only when the record supports one, and never names a habit', () => {
    expect(storyFacts(start(), 67).highlight).toBeNull();
    const steady = doneOn(
      start(),
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
    const h = storyFacts(steady, 67).highlight;
    expect(h).not.toBeNull();
    expect(h).not.toMatch(/Reading|read/i);
  });

  it('opens once the 66 days are done', () => {
    expect(storyAvailable(start(), 66)).toBe(false);
    expect(storyAvailable({ ...start(), ceremonies: { summit: true } }, 66)).toBe(true);
    expect(storyAvailable(start(), 67)).toBe(true);
  });
});
