import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { dateForDay } from '../../core/dates';
import { dayQualifies, isFullDay, totalXp, xpForLog, XP_FULL_DAY_BONUS, XP_PER_HABIT } from '../../core/progression';
import { dueOn, weekdayOfDay } from '../../core/schedule';
import { FIXTURES } from '../../core/v2/__tests__/fixtures';
import { useApp } from '../useApp';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/*
 * "Day complete · +20 XP bonus" (Habits tab) is shown only while today is complete: the Today screen derives it
 * from today's log on every render (isFullDay and every due habit done). These follow the log and the XP through
 * completing and undoing habits, in deterministic steps.
 */

const s = () => useApp.getState();
const at = (day: number) => s().setDevDayOffset(day - 1);
const log = (day: number) => s().logs[dateForDay(s().startedAt!, day)];
const due = (day: number) => dueOn(s().plan, s().startedAt!, day).map((h) => h.habitId);
/** What the Habits tab reads for today: complete (the bonus line) and XP. */
const today = (day: number) => {
  const l = log(day);
  return { full: isFullDay(l) && due(day).every((id) => l?.completed.includes(id)), xp: totalXp(s().logs) };
};

/** A V2 program of `size` habits: five from the plan, with a custom habit added or plan habits removed. */
function program(size: 3 | 5 | 6) {
  s().setProfile(FIXTURES['C · 28, energy']);
  expect(s().startProgramV2([])).toBe(true);
  expect(s().plan).toHaveLength(5);
  if (size === 6) s().addCustomHabit('Stretch for five minutes');
  if (size === 3) for (const h of s().plan.slice(3)) expect(s().removeHabit(h.habitId)).toBe(true);
  expect(s().plan).toHaveLength(size);
}

beforeEach(() => {
  s().restart();
  s().setDevDayOffset(0);
});

describe.each([3, 5, 6] as const)('Day complete with %i habits', (size) => {
  it('appears when the last habit is done and goes, with its bonus, when any one is undone', () => {
    program(size);
    const ids = due(1);
    expect(ids).toHaveLength(size);

    ids.slice(0, -1).forEach((id) => s().toggleHabit(1, id));
    expect(today(1)).toEqual({ full: false, xp: (size - 1) * XP_PER_HABIT });

    s().toggleHabit(1, ids[size - 1]);
    expect(today(1)).toEqual({ full: true, xp: size * XP_PER_HABIT + XP_FULL_DAY_BONUS });

    // Undo one: the bonus and that habit's XP go at once.
    s().toggleHabit(1, ids[0]);
    expect(today(1)).toEqual({ full: false, xp: (size - 1) * XP_PER_HABIT });

    // Redo it: complete again, the bonus once (never twice).
    s().toggleHabit(1, ids[0]);
    expect(today(1)).toEqual({ full: true, xp: size * XP_PER_HABIT + XP_FULL_DAY_BONUS });

    // Undo every habit: nothing left, no XP, and today's record is kept (empty), as before.
    ids.forEach((id) => s().toggleHabit(1, id));
    expect(today(1)).toEqual({ full: false, xp: 0 });
    expect(log(1)?.completed).toEqual([]);
    expect(log(1)?.planned).toEqual(ids);
  });

  it('crosses the daily-success (80%) line in both directions with the right XP', () => {
    program(size);
    const ids = due(1);
    const needed = Math.ceil(size * 0.8 - 1e-9);
    ids.slice(0, needed - 1).forEach((id) => s().toggleHabit(1, id));
    expect(dayQualifies(log(1))).toBe(false);
    s().toggleHabit(1, ids[needed - 1]);
    expect(dayQualifies(log(1))).toBe(true);
    expect(today(1).xp).toBe(needed * XP_PER_HABIT + (needed === size ? XP_FULL_DAY_BONUS : 0));
    s().toggleHabit(1, ids[needed - 1]);
    expect(dayQualifies(log(1))).toBe(false);
    expect(today(1)).toEqual({ full: false, xp: (needed - 1) * XP_PER_HABIT });
  });
});

describe('Day complete with a scheduled habit', () => {
  it('needs the scheduled habit on its day, not on a rest day, and reverses cleanly', () => {
    program(5);
    const w = (d: number) => weekdayOfDay(s().startedAt!, d);
    const sched = s().addDevScheduledHabit([w(1), w(3), w(5)])!;
    expect(sched).toBeTruthy();

    // Day 1: due, so six habits make the day complete.
    const day1 = due(1);
    expect(day1).toContain(sched);
    day1.filter((id) => id !== sched).forEach((id) => s().toggleHabit(1, id));
    expect(today(1).full).toBe(false);
    s().toggleHabit(1, sched);
    expect(today(1)).toEqual({ full: true, xp: 6 * XP_PER_HABIT + XP_FULL_DAY_BONUS });
    s().toggleHabit(1, sched);
    expect(today(1)).toEqual({ full: false, xp: 5 * XP_PER_HABIT });
    s().toggleHabit(1, sched);

    // Day 2: a rest day for it, so the five daily habits complete the day; the earlier day's XP stays.
    at(2);
    const day2 = due(2);
    expect(day2).not.toContain(sched);
    day2.forEach((id) => s().toggleHabit(2, id));
    const both = 6 * XP_PER_HABIT + XP_FULL_DAY_BONUS + 5 * XP_PER_HABIT + XP_FULL_DAY_BONUS;
    expect(today(2)).toEqual({ full: true, xp: both });
    day2.forEach((id) => s().toggleHabit(2, id));
    expect(today(2)).toEqual({ full: false, xp: 6 * XP_PER_HABIT + XP_FULL_DAY_BONUS });
    // Day 1's history is untouched by today's undo.
    expect(isFullDay(log(1))).toBe(true);
    expect(xpForLog(log(1)!)).toBe(6 * XP_PER_HABIT + XP_FULL_DAY_BONUS);
  });
});
