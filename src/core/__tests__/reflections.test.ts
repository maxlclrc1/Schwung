import { describe, expect, it } from '@jest/globals';
import { dueReflection, lastFinishedWeek, REFLECTION_WEEKS, sanitizeReflections } from '../reset/reflections';

describe('weekly reflections', () => {
  it('invites only after a program week ends, and only for the latest one', () => {
    expect(dueReflection(undefined, 7)).toBeNull();
    expect(dueReflection(undefined, 8)).toBe(1);
    // Back after three weeks away: one invitation, for the last finished week, never a stack.
    expect(dueReflection(undefined, 29)).toBe(4);
    expect(lastFinishedWeek(200)).toBe(REFLECTION_WEEKS);
  });

  it('never invites twice for a week, answered or put off', () => {
    expect(dueReflection({ 1: { week: 1, day: 8 } }, 9)).toBeNull();
    expect(dueReflection({ 1: { week: 1, day: 8, answer: 'right' } }, 14)).toBeNull();
    expect(dueReflection({ 1: { week: 1, day: 8 } }, 15)).toBe(2);
  });

  it('keeps only well-formed reflections from a save', () => {
    expect(
      sanitizeReflections({
        1: { week: 1, day: 8, answer: 'easier', changed: ['mind_read', 3] },
        2: { week: 2, day: 15, answer: 'nonsense' },
        3: { week: 4, day: 22 },
        12: { week: 12, day: 85 },
      }),
    ).toEqual({ 1: { week: 1, day: 8, answer: 'easier', changed: ['mind_read'] }, 2: { week: 2, day: 15 } });
    expect(sanitizeReflections('x')).toBeUndefined();
  });
});
