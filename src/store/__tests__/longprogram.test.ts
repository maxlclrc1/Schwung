import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { dateForDay, PROGRAM_DAYS } from '../../core/dates';
import {
  bestStreak,
  currentStreak,
  dayQualifies,
  daysCompleted,
  isFullDay,
  levelUpOffers,
  pendingCeremony,
  totalXp,
  XP_FULL_DAY_BONUS,
  XP_PER_HABIT,
} from '../../core/progression';
import { isDueOn } from '../../core/schedule';
import type { Answers, DayLog } from '../../core/types';
import { FIXTURES } from '../../core/v2/__tests__/fixtures';
import { previewPlan, swapChoices } from '../../core/v2/program';
import { useApp } from '../useApp';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/*
 * Whole 66-day programs driven through the store the way the app drives it: each day the clock moves on, the
 * root layout reconciles (as on open), and Today toggles what is due. Three people:
 * A, consistent; B, inconsistent, with step-downs and returns; C, swaps, removal and schedule changes.
 */

const s = () => useApp.getState();
const ANSWERS: Answers = {
  goal: 'calm',
  sleep: '6-7h',
  screen: '6-8h',
  exercise: 'rarely',
  water: '0.5-1L',
  mind: 'rarely',
};
const C = FIXTURES['C · 28, energy'];

/** The clock reaches `day` and the app opens (before noon, yesterday can still be fixed). */
function open(day: number, morning = false) {
  s().setDevDayOffset(day - 1);
  s().reconcileNow(morning);
}
const start = () => s().startedAt!;
const logOf = (day: number): DayLog | undefined => s().logs[dateForDay(start(), day)];
const due = (day: number) =>
  s().plan.filter((h) => isDueOn(h, start(), day) && !logOf(day)?.rested?.includes(h.habitId));
/** Checks off the first `n` habits due (all of them by default). */
function check(day: number, n = Infinity) {
  due(day)
    .slice(0, n)
    .forEach((h) => s().toggleHabit(day, h.habitId));
}
const levels = () => s().plan.map((h) => h.level);
const stepDowns = () => s().notices.filter((n) => n.kind === 'stepDown');
/** XP from first principles: 10 per planned habit done, 20 more for a full day. */
const expectedXp = () =>
  Object.values(s().logs).reduce((sum, l) => {
    const done = l.completed.filter((id) => l.planned.includes(id)).length;
    return sum + done * XP_PER_HABIT + (l.planned.length > 0 && done === l.planned.length ? XP_FULL_DAY_BONUS : 0);
  }, 0);

function startV1() {
  s().setAnswers(ANSWERS);
  expect(s().startProgram()).toBe(true);
}
function startV2() {
  s().setDevV2Preview(true);
  s().setProfile(C);
  const r = previewPlan(C);
  if (r.status !== 'ok') throw new Error('expected a plan');
  expect(s().startProgramV2(r.options.slice(0, r.choice?.required ?? 0).map((o) => o.id))).toBe(true);
}

beforeEach(() => {
  s().restart();
  s().setDevV2Preview(false);
  s().setDevDayOffset(0);
});

describe.each([
  ['V1', startV1],
  ['V2', startV2],
])('A · consistent, %s', (_, begin) => {
  it('every day done: levels rise at 22 and 45 only, XP and streaks are exact, the finale is due on day 66', () => {
    begin();
    const n = s().plan.length;
    for (let d = 1; d <= PROGRAM_DAYS; d++) {
      open(d, d % 2 === 0);
      if (d === 21) expect(new Set(levels())).toEqual(new Set(['easy']));
      if (d === 22) expect(new Set(levels())).toEqual(new Set(['medium']));
      if (d === 45) expect(new Set(levels())).toEqual(new Set(['hard']));
      check(d);
      expect(isFullDay(logOf(d))).toBe(true);
      // Undoing and redoing a check-off never earns XP twice.
      if (d === 10) {
        const xp = totalXp(s().logs);
        const id = s().plan[0].habitId;
        s().toggleHabit(d, id);
        expect(totalXp(s().logs)).toBe(xp - XP_PER_HABIT - XP_FULL_DAY_BONUS);
        s().toggleHabit(d, id);
        expect(totalXp(s().logs)).toBe(xp);
      }
    }
    expect(totalXp(s().logs)).toBe(PROGRAM_DAYS * (n * XP_PER_HABIT + XP_FULL_DAY_BONUS));
    expect(totalXp(s().logs)).toBe(expectedXp());
    expect(currentStreak(s().logs, start(), PROGRAM_DAYS)).toBe(PROGRAM_DAYS);
    expect(bestStreak(s().logs, start(), PROGRAM_DAYS)).toBe(PROGRAM_DAYS);
    expect(daysCompleted(s().logs, start(), PROGRAM_DAYS)).toBe(PROGRAM_DAYS);
    expect(stepDowns()).toEqual([]);
    expect(s().notices.map((x) => x.kind === 'phaseUp' && x.phase)).toEqual([2, 3]);
    expect(pendingCeremony([1, 7, 21, 44], PROGRAM_DAYS, true, true)).toBe(PROGRAM_DAYS);
    s().markCeremonySeen(PROGRAM_DAYS);

    // After the program: the same checklist, no new phases, nothing replayed, the finale stats stay at 66.
    const plan = JSON.parse(JSON.stringify(s().plan));
    for (let d = PROGRAM_DAYS + 1; d <= PROGRAM_DAYS + 5; d++) {
      open(d);
      check(d);
    }
    expect(s().plan).toEqual(plan);
    expect(s().notices).toHaveLength(2);
    expect(daysCompleted(s().logs, start(), PROGRAM_DAYS + 5)).toBe(PROGRAM_DAYS);
    expect(currentStreak(s().logs, start(), PROGRAM_DAYS + 5)).toBe(PROGRAM_DAYS + 5);
    expect(pendingCeremony(s().seenCeremonies, PROGRAM_DAYS + 5, true, true)).toBeNull();
  });
});

describe('B · inconsistent (V1)', () => {
  it('80% days count, misses step down once, returns recover, and no level ever moves by accident', () => {
    startV1();
    const n = s().plan.length;
    const need = Math.ceil(n * 0.8);
    // Days 1–9: just enough for the 80% rule; day 10 one short.
    for (let d = 1; d <= 10; d++) {
      open(d);
      check(d, d === 10 ? need - 1 : need);
    }
    expect(dayQualifies(logOf(9))).toBe(true);
    expect(dayQualifies(logOf(10))).toBe(false);
    // An unfinished today never breaks the streak; once day 10 is over, it has.
    expect(currentStreak(s().logs, start(), 10)).toBe(9);
    expect(currentStreak(s().logs, start(), 11)).toBe(0);
    expect(bestStreak(s().logs, start(), 10)).toBe(9);
    // The habits left out on 80% days never had 7 in a row; the rest did, and get an offer (not a level-up).
    expect(levelUpOffers(s().plan, s().logs, start(), 10).length).toBeGreaterThan(0);
    expect(new Set(levels())).toEqual(new Set(['easy']));

    // Away 11–13 at Easy: nothing to step down to.
    open(14);
    expect(stepDowns()).toEqual([]);
    check(14);
    for (let d = 15; d <= 30; d++) {
      open(d);
      check(d);
    }
    expect(new Set(levels())).toEqual(new Set(['medium'])); // phase 2 on day 22

    // Away 31–33, back on 34 (afternoon): one step down for everything, one kind message, applied once.
    open(34);
    open(34);
    expect(stepDowns()).toHaveLength(1);
    expect(stepDowns()[0].habitIds).toHaveLength(n);
    expect(new Set(levels())).toEqual(new Set(['easy']));
    expect(currentStreak(s().logs, start(), 34)).toBe(0);
    check(34);
    expect(currentStreak(s().logs, start(), 34)).toBe(1);

    // A morning open on 37 after missing 35–36 still leaves 36 fixable: no step-down from that alone.
    open(35);
    check(35);
    open(37, true);
    expect(stepDowns()).toHaveLength(1);
    // Fixing yesterday before noon keeps the streak.
    check(36);
    check(37);
    expect(currentStreak(s().logs, start(), 37)).toBe(4);

    for (let d = 38; d <= 44; d++) {
      open(d);
      check(d);
    }
    open(45);
    expect(new Set(levels())).toEqual(new Set(['medium'])); // phase 3 lifts Easy to Medium, not to Hard

    // A long absence (46–60): one level down at most, however long.
    check(45);
    open(61);
    expect(stepDowns()).toHaveLength(2);
    expect(new Set(levels())).toEqual(new Set(['easy']));
    for (let d = 61; d <= PROGRAM_DAYS; d++) {
      open(d);
      check(d);
    }
    expect(totalXp(s().logs)).toBe(expectedXp());
    // 1–9, 14–30, 34–45, 61–66.
    expect(daysCompleted(s().logs, start(), PROGRAM_DAYS)).toBe(9 + 17 + 12 + 6);
    expect(bestStreak(s().logs, start(), PROGRAM_DAYS)).toBe(17);
    // Day 66 counted: the finale is due even though the program had gaps.
    expect(pendingCeremony([1, 7, 21, 44], PROGRAM_DAYS, true, true)).toBe(PROGRAM_DAYS);
  });

  it('a missed day 66 still gets its finale on the next open', () => {
    startV1();
    open(PROGRAM_DAYS + 1);
    expect(pendingCeremony([1, 7, 21, 44], PROGRAM_DAYS + 1, false, false)).toBe(PROGRAM_DAYS);
  });
});

describe('C · swaps, removal and schedule changes (V2)', () => {
  it('past days keep what was planned then; streak, XP and levels follow the plan in effect', () => {
    startV2();
    const frozen = s().plan.map((h) => h.spec?.title);
    expect(frozen.every(Boolean)).toBe(true);

    for (let d = 1; d <= PROGRAM_DAYS; d++) {
      open(d);
      if (d === 5) expect(s().addDevScheduledHabit([1, 3])).not.toBeNull();
      if (d === 10) {
        const target = s().plan[s().plan.length - 2].habitId;
        expect(s().swapHabitV2(target, swapChoices(C, s().plan, target)[0].id)).toBe(true);
      }
      if (d === 20) expect(s().setSchedule(s().plan.find((h) => h.schedule)!.habitId, [2, 4])).toBe(true);
      if (d === 30) expect(s().removeHabit(s().plan[1].habitId)).toBe(true);
      check(d);
    }

    // Every day was complete by the plan of that day, including the days after each change.
    for (let d = 1; d <= PROGRAM_DAYS; d++) expect([d, isFullDay(logOf(d))]).toEqual([d, true]);
    expect(daysCompleted(s().logs, start(), PROGRAM_DAYS)).toBe(PROGRAM_DAYS);
    expect(totalXp(s().logs)).toBe(expectedXp());
    expect(stepDowns()).toEqual([]);

    // The scheduled habit was due on Mon/Wed until day 19 and Tue/Thu from day 20, never in between.
    const sched = s().plan.find((h) => h.schedule)!;
    for (let d = 5; d <= PROGRAM_DAYS; d++) {
      const w = new Date(`${dateForDay(start(), d)}T12:00:00Z`).getUTCDay();
      const expected = (d < 20 ? [1, 3] : [2, 4]).includes(w);
      expect([d, logOf(d)!.planned.includes(sched.habitId)]).toEqual([d, expected]);
    }
    // It stays at Easy (no phase level-ups for scheduled habits) unless an offer was accepted.
    expect(sched.level).toBe('easy');

    // The swapped-in habit started at day 10; the habit removed on day 30 keeps its earlier days and XP.
    const swapped = s().plan.find((h) => h.addedOnDay === 10)!;
    expect(logOf(9)!.planned).not.toContain(swapped.habitId);
    expect(logOf(10)!.planned).toContain(swapped.habitId);
    const removed = logOf(29)!.planned.find((id) => !s().plan.some((h) => h.habitId === id))!;
    expect(removed).toBeDefined();
    expect(logOf(29)!.completed).toContain(removed);
    expect(logOf(30)!.planned).not.toContain(removed);

    // Original habits kept their frozen names all program.
    expect(
      s()
        .plan.filter((h) => h.addedOnDay === 1)
        .every((h) => frozen.includes(h.spec?.title)),
    ).toBe(true);
  });
});
