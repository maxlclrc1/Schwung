import { describe, expect, it } from '@jest/globals';
import {
  dayQualifies,
  doneCount,
  isFullDay,
  levelProgress,
  playerLevel,
  totalXp,
  XP_FULL_DAY_BONUS,
  XP_PER_HABIT,
  xpForLog,
} from '../progression';
import type { DayLog } from '../types';

const log = (completed: string[], planned: string[], day = 1): DayLog => ({
  day,
  date: `2026-11-0${day}`,
  completed,
  planned,
});

describe('day rules: the 80% rule, full days and XP', () => {
  it('counts only what was on the day’s list', () => {
    expect(doneCount(log(['a', 'x'], ['a', 'b']))).toBe(1);
  });

  it('counts a day at 80% or more (4 of 5 included), never an empty list', () => {
    expect(dayQualifies(log(['a', 'b', 'c', 'd'], ['a', 'b', 'c', 'd', 'e']))).toBe(true);
    expect(dayQualifies(log(['a', 'b', 'c'], ['a', 'b', 'c', 'd', 'e']))).toBe(false);
    expect(dayQualifies(log([], []))).toBe(false);
    expect(dayQualifies(undefined)).toBe(false);
  });

  it('calls a day full only when everything on its list is done', () => {
    expect(isFullDay(log(['a', 'b'], ['a', 'b']))).toBe(true);
    expect(isFullDay(log(['a'], ['a', 'b']))).toBe(false);
    expect(isFullDay(log([], []))).toBe(false);
  });

  it('gives 10 XP a done habit and 20 more for a full day', () => {
    expect(xpForLog(log(['a'], ['a', 'b']))).toBe(XP_PER_HABIT);
    expect(xpForLog(log(['a', 'b'], ['a', 'b']))).toBe(2 * XP_PER_HABIT + XP_FULL_DAY_BONUS);
    const logs = { a: log(['a', 'b'], ['a', 'b'], 1), b: log(['a'], ['a', 'b'], 2) };
    expect(totalXp(logs)).toBe(3 * XP_PER_HABIT + XP_FULL_DAY_BONUS);
  });

  it('levels up every 200 XP', () => {
    expect([playerLevel(0), playerLevel(199), playerLevel(200), playerLevel(450)]).toEqual([1, 1, 2, 3]);
    expect(levelProgress(250)).toBeCloseTo(0.25);
  });
});
