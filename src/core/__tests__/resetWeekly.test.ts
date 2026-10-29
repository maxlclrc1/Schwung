import { describe, expect, it } from '@jest/globals';
import { dateForDay, weekdayOfDay } from '../dates';
import { RESET_BY_ID, type Schedule } from '../reset/habits';
import {
  countsTowardDay,
  dayState,
  erasFor,
  fullWeekGoal,
  programWeeks,
  scheduleOn,
  weekOf,
  weeklyAdherence,
  weekSummaries,
  weekSummary,
  type ScheduleEra,
  type WeeklyContext,
} from '../reset/weekly';
import type { DayLog } from '../types';

// 2026-11-02 is a Monday: Day 1 = Mon, Day 7 = Sun, Day 64 = Mon, Day 66 = Wed.
const MON = '2026-11-02';
const ctx: WeeklyContext = { startKey: MON };
const ID = 'strength_log';

type Logs = Record<string, DayLog>;
/** Logs with the habit done on these program days (and a record, maybe empty, on `recorded` days). */
function logsFor(start: string, doneDays: number[], recorded: number[] = [], id = ID): Logs {
  const out: Logs = {};
  for (const d of [...new Set([...doneDays, ...recorded])]) {
    const date = dateForDay(start, d);
    out[date] = { day: d, date, completed: doneDays.includes(d) ? [id] : [], planned: [] };
  }
  return out;
}
const only = (s: Schedule): ScheduleEra[] => [{ fromDay: 1, schedule: s }];
const S3: Schedule = { kind: 'sessions', perWeek: 3, maxPerDay: 1 };
const weekly = (days: number): Schedule => ({ kind: 'weekly', days });

describe('week boundaries', () => {
  it('uses calendar weeks, Monday to Sunday, numbered from the week containing Day 1', () => {
    expect(weekOf(MON, 1)).toEqual({ week: 1, firstDay: 1, lastDay: 7 });
    expect(weekOf(MON, 8)).toEqual({ week: 2, firstDay: 8, lastDay: 14 });
    // Days 64–66 (Mon–Wed) are a partial final week.
    expect(weekOf(MON, 66)).toEqual({ week: 10, firstDay: 64, lastDay: 66 });
    expect(programWeeks(MON)).toHaveLength(10);
    expect(programWeeks(MON).reduce((n, w) => n + w.lastDay - w.firstDay + 1, 0)).toBe(66);
  });

  it('gives a partial first week when the program starts mid-week', () => {
    const FRI = '2026-11-06';
    expect(weekdayOfDay(FRI, 1)).toBe(5);
    expect(weekOf(FRI, 1)).toEqual({ week: 1, firstDay: 1, lastDay: 3 }); // Fri, Sat, Sun
    expect(weekOf(FRI, 4)).toEqual({ week: 2, firstDay: 4, lastDay: 10 });
    const SUN = '2026-11-08';
    expect(weekOf(SUN, 1)).toEqual({ week: 1, firstDay: 1, lastDay: 1 });
    // Every day belongs to exactly one week, wherever the program starts.
    for (const start of [MON, FRI, SUN, '2026-11-04']) {
      const weeks = programWeeks(start);
      expect(weeks[0].firstDay).toBe(1);
      expect(weeks[weeks.length - 1].lastDay).toBe(66);
      for (let i = 1; i < weeks.length; i++) expect(weeks[i].firstDay).toBe(weeks[i - 1].lastDay + 1);
    }
  });

  it('follows date keys, so daylight-saving and time-zone changes never move a day', () => {
    // Programs spanning the EU (Mar 29, Oct 25) and US (Mar 8, Nov 1) clock changes.
    for (const start of ['2026-03-23', '2026-10-19', '2026-03-02', '2026-10-26']) {
      for (let d = 1; d <= 66; d++) {
        expect(weekdayOfDay(start, d + 1)).toBe((weekdayOfDay(start, d) + 1) % 7);
        expect(dateForDay(start, d + 1) > dateForDay(start, d)).toBe(true);
      }
      // Mondays start weeks, every time.
      for (const w of programWeeks(start).slice(1)) expect(weekdayOfDay(start, w.firstDay)).toBe(1);
    }
  });
});

describe('the Strength Training examples (3 sessions a week)', () => {
  const sum = (done: number[], today: number) => weekSummary(ID, only(S3), logsFor(MON, done), ctx, 1, today);

  it('Monday, Wednesday, Friday → achieved', () => {
    expect(sum([1, 3, 5], 8)).toMatchObject({ goal: 3, credited: 3, status: 'achieved', closed: true });
  });

  it('Monday and Wednesday, Sunday not over yet → pending (and still possible)', () => {
    expect(sum([1, 3], 7)).toMatchObject({
      credited: 2,
      status: 'pending',
      closed: false,
      remaining: 1,
      stillPossible: true,
    });
  });

  it('only Monday when the week closes → not achieved, with no invented missed days', () => {
    const w = sum([1], 8);
    expect(w).toMatchObject({ credited: 1, status: 'not-achieved', closed: true });
    // Rest days stay rest days: none of the other days became a miss.
    for (let d = 2; d <= 7; d++)
      expect(['open', 'goal-met']).toContain(dayState(ID, only(S3), logsFor(MON, [1]), ctx, d));
  });

  it('Tuesday, Thursday, Saturday → equally achieved', () => {
    expect(sum([2, 4, 6], 8).status).toBe('achieved');
  });

  it('three sessions by Thursday → achieved early; the rest of the week asks for nothing', () => {
    const logs = logsFor(MON, [1, 2, 4]);
    expect(weekSummary(ID, only(S3), logs, ctx, 1, 4)).toMatchObject({ status: 'achieved', closed: false });
    for (const d of [5, 6, 7]) expect(dayState(ID, only(S3), logs, ctx, d)).toBe('goal-met');
  });

  it('counts at most one session a day, and extras beyond the goal separately', () => {
    // Five sessions in a 3-session week: achieved, 2 extra.
    expect(sum([1, 2, 3, 4, 5], 8)).toMatchObject({ credited: 3, extra: 2, status: 'achieved' });
  });
});

describe('quotas', () => {
  it('handles flexible 3-, 4-, 5- and 6-day weeks', () => {
    for (const n of [3, 4, 5, 6]) {
      const s = only(weekly(n));
      const days = [1, 2, 3, 4, 5, 6].slice(0, n);
      expect(weekSummary(ID, s, logsFor(MON, days), ctx, 1, 8).status).toBe('achieved');
      expect(weekSummary(ID, s, logsFor(MON, days.slice(1)), ctx, 1, 8).status).toBe('not-achieved');
      // Any days at all: the last n days of the week work as well as the first.
      expect(weekSummary(ID, s, logsFor(MON, [7, 6, 5, 4, 3, 2].slice(0, n)), ctx, 1, 8).status).toBe('achieved');
    }
  });

  it('treats a week with zero completions against a goal as not achieved, once it closes', () => {
    const logs = logsFor(MON, [], [1, 2, 3, 4, 5, 6, 7]); // the app was used; the habit wasn't done
    expect(weekSummary(ID, only(weekly(3)), logs, ctx, 1, 8).status).toBe('not-achieved');
    expect(weekSummary(ID, only(weekly(3)), logs, ctx, 1, 5).status).toBe('pending');
  });

  it('keeps a week with nothing recorded at all out of the judgement (unknown is never a failure)', () => {
    const w = weekSummary(ID, only(weekly(3)), {}, ctx, 1, 8);
    expect(w.status).toBe('unrecorded');
    expect(weeklyAdherence([w])).toBeNull();
  });

  it('knows when a week can no longer be achieved, without closing it early', () => {
    // 5 a week, nothing by Saturday: 1 day left, 5 needed.
    const w = weekSummary(ID, only(weekly(5)), logsFor(MON, [], [1, 2, 3, 4, 5]), ctx, 1, 6);
    expect(w).toMatchObject({ status: 'pending', stillPossible: false, remaining: 2 });
  });

  it('keeps a week open until yesterday can no longer be edited (noon)', () => {
    const logs = logsFor(MON, [1, 3]);
    expect(weekSummary(ID, only(S3), logs, ctx, 1, 8, true)).toMatchObject({ closed: false, status: 'pending' });
    expect(weekSummary(ID, only(S3), logs, ctx, 1, 8, false)).toMatchObject({ closed: true, status: 'not-achieved' });
  });

  it('measures daily habits too: every day is due, and a full week means all of them', () => {
    const s = only({ kind: 'daily' });
    expect(dayState('mind_read', s, {}, ctx, 3)).toBe('due');
    const all = logsFor(MON, [1, 2, 3, 4, 5, 6, 7], [], 'mind_read');
    expect(weekSummary('mind_read', s, all, ctx, 1, 8)).toMatchObject({ goal: 7, status: 'achieved' });
  });
});

describe('workdays', () => {
  const s = only({ kind: 'workdays', days: 3 });

  it('counts any 3 workdays; weekends never count toward the goal or become misses', () => {
    expect(weekSummary('focus_top3', s, logsFor(MON, [1, 3, 5], [], 'focus_top3'), ctx, 1, 8).status).toBe('achieved');
    const weekend = weekSummary('focus_top3', s, logsFor(MON, [1, 6, 7], [], 'focus_top3'), ctx, 1, 8);
    expect(weekend).toMatchObject({ credited: 1, outside: 2, status: 'not-achieved' });
    expect(dayState('focus_top3', s, {}, ctx, 6)).toBe('not-eligible');
  });

  it('follows the person’s own workdays', () => {
    const own: WeeklyContext = { ...ctx, workdays: [0, 1, 2, 3] }; // Sun–Wed
    expect(weekSummary('focus_top3', s, logsFor(MON, [7, 1, 2], [], 'focus_top3'), own, 1, 8).status).toBe('achieved');
    expect(fullWeekGoal({ kind: 'workdays', days: 5 }, { workdays: [1, 2, 3] })).toBe(3);
  });
});

describe('partial weeks', () => {
  it('scales the goal down for a partial first week, and a 1-day week has no goal', () => {
    const FRI = '2026-11-06'; // week 1 is Fri–Sun
    const fri = { startKey: FRI };
    expect(weekSummary(ID, only(weekly(5)), {}, fri, 1, 1).goal).toBe(2); // floor(5 × 3/7)
    expect(weekSummary(ID, only(S3), {}, fri, 1, 1).goal).toBe(1);
    const sun = { startKey: '2026-11-08' };
    expect(weekSummary(ID, only(S3), {}, sun, 1, 1)).toMatchObject({ goal: 0, status: 'no-goal' });
  });

  it('scales the final week (Days 64–66) too', () => {
    expect(weekSummary(ID, only(weekly(5)), {}, ctx, 66, 66).goal).toBe(2);
    expect(weekSummary(ID, only({ kind: 'daily' }), {}, ctx, 66, 66).goal).toBe(3);
  });

  it('scales a week where the habit was added mid-week', () => {
    const eras: ScheduleEra[] = [{ fromDay: 4, schedule: weekly(4) }]; // added Thursday
    expect(weekSummary(ID, eras, {}, ctx, 1, 4).goal).toBe(2); // floor(4 × 4/7)
    expect(dayState(ID, eras, {}, ctx, 2)).toBe('inactive');
  });
});

describe('changes of phase and intensity', () => {
  it('builds a habit’s schedule eras from the catalog', () => {
    const eras = erasFor('focus_deepwork', [
      { fromDay: 1, intensity: 'starter', phase: 'foundation' },
      { fromDay: 10, intensity: 'standard', phase: 'foundation' },
    ]);
    expect(scheduleOn(eras, 5)).toEqual({ kind: 'weekly', days: 4 });
    expect(scheduleOn(eras, 10)).toEqual({ kind: 'weekly', days: 5 });
    expect(scheduleOn(eras, 0)).toBeNull();
  });

  it('starts a higher goal the following week (Starter → Standard on a Wednesday)', () => {
    const eras = erasFor('focus_deepwork', [
      { fromDay: 1, intensity: 'starter', phase: 'foundation' },
      { fromDay: 10, intensity: 'standard', phase: 'foundation' }, // Wed of week 2
    ]);
    expect(weekSummary('focus_deepwork', eras, {}, ctx, 8, 8).goal).toBe(4);
    expect(weekSummary('focus_deepwork', eras, {}, ctx, 15, 15).goal).toBe(5);
  });

  it('applies an easier goal at once', () => {
    const eras = erasFor('focus_deepwork', [
      { fromDay: 1, intensity: 'standard', phase: 'foundation' },
      { fromDay: 10, intensity: 'starter', phase: 'foundation' },
    ]);
    expect(weekSummary('focus_deepwork', eras, {}, ctx, 8, 10).goal).toBe(4);
  });

  it('handles a phase change mid-week, including a change from weekly to daily (Stay Connected, Starter)', () => {
    const eras = erasFor('social_reach_out', [
      { fromDay: 1, intensity: 'starter', phase: 'momentum' }, // 5 days a week
      { fromDay: 45, intensity: 'starter', phase: 'mastery' }, // daily, from a Wednesday
    ]);
    expect(weekSummary('social_reach_out', eras, {}, ctx, 45, 45).goal).toBe(5); // that week keeps 5
    expect(weekSummary('social_reach_out', eras, {}, ctx, 50, 50).goal).toBe(7);
    expect(dayState('social_reach_out', eras, {}, ctx, 44)).toBe('open');
    expect(dayState('social_reach_out', eras, {}, ctx, 45)).toBe('due');
  });

  it('follows the catalog’s own Social Confidence days per level', () => {
    const h = RESET_BY_ID.confidence_talk;
    expect(fullWeekGoal(h.targets.starter.foundation.schedule)).toBe(3);
    expect(fullWeekGoal(h.targets.challenge.momentum.schedule)).toBe(6);
    expect(fullWeekGoal(h.targets.challenge.mastery.schedule)).toBe(7);
  });
});

describe('Strength Training for people who already train', () => {
  const own = (ownSessions: number) => ({ ...ctx, ownSessions });
  const challenge = erasFor(ID, [{ fromDay: 1, intensity: 'challenge', phase: 'foundation' }]);

  it('keeps their own number of sessions, including above four, and never raises it', () => {
    expect(fullWeekGoal(challenge[0].schedule, { ownSessions: 5 })).toBe(5);
    expect(fullWeekGoal(challenge[0].schedule, { ownSessions: 6 })).toBe(6);
    const later = erasFor(ID, [
      { fromDay: 1, intensity: 'challenge', phase: 'foundation' },
      { fromDay: 22, intensity: 'challenge', phase: 'momentum' },
      { fromDay: 45, intensity: 'challenge', phase: 'mastery' },
    ]);
    for (const d of [1, 22, 45, 60]) expect(weekSummary(ID, later, {}, own(5), d, d).goal).toBe(5);
  });

  it('lets them rest: 5 sessions over a week with rest days is achieved', () => {
    expect(weekSummary(ID, challenge, logsFor(MON, [1, 2, 4, 5, 6]), own(5), 1, 8).status).toBe('achieved');
  });
});

describe('separate from the daily streak and the 80% rule', () => {
  it('puts a weekly habit in a day’s count only on days it’s done', () => {
    expect(countsTowardDay({ kind: 'daily' }, false)).toBe(true);
    expect(countsTowardDay(S3, false)).toBe(false);
    expect(countsTowardDay(S3, true)).toBe(true);
  });

  it('computes weekly adherence from achieved and not-achieved weeks only', () => {
    const logs = { ...logsFor(MON, [1, 3, 5]), ...logsFor(MON, [8], [9, 10]) };
    const weeks = weekSummaries(ID, only(S3), logs, ctx, 17); // weeks 1–3; week 3 still open
    expect(weeks.map((w) => w.status)).toEqual(['achieved', 'not-achieved', 'pending']);
    expect(weeklyAdherence(weeks)).toBe(0.5);
  });
});
