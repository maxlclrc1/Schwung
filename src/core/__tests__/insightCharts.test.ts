import { describe, expect, it } from '@jest/globals';
import {
  bestWeek,
  cellSummary,
  type CellState,
  heatmapColumns,
  judgedWeeks,
  weekPoint,
  type WeekPoint,
} from '../charts';
import { dateForDay, PROGRAM_DAYS } from '../dates';
import * as C from '../reset/charts';
import * as P from '../reset/pilot';

// 2026-11-02 is a Monday: weeks are Days 1–7, 8–14, 15–21… Day 6 is a Saturday. 2026-11-07 is a Saturday.
const MON = '2026-11-02';
const SAT = '2026-11-07';
const ADULT: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 180,
  strengthStart: 'sometimes',
  phone: '4_6',
  pullMinutes: 120,
  wake: { kind: 'time', time: '07:00' },
  activeDays: '1_2',
  skill: 'Language',
};
const pilot = (c: P.PilotChoice[], start = MON) => {
  const p = P.createPilot(ADULT, c, start);
  if (!p) throw new Error(P.setupProblems(ADULT, c).join('; '));
  return p;
};
const doneOn = (p: P.PilotProgram, id: string, days: number[]) =>
  days.reduce((x, d) => P.complete(x, id, d).program, p);
const READ: P.PilotChoice = { habitId: 'mind_read', intensity: 'standard' };
const FOCUS: P.PilotChoice = { habitId: 'focus_deepwork', intensity: 'standard' };
const STRENGTH: P.PilotChoice = { habitId: 'strength_log', intensity: 'standard' };
const states = (cells: { state: string }[], days: number[]) => days.map((d) => cells[d - 1].state);

describe('the weekly consistency trend (Life Reset)', () => {
  // Read every day, Focus Time 5 workdays a week. Today is Day 9 (Tuesday of Week 2).
  const p = doneOn(doneOn(pilot([READ, FOCUS]), 'mind_read', [1, 2, 4, 5, 6, 7, 8]), 'focus_deepwork', [1, 2, 3]);

  it('counts each week’s opportunities with the overall consistency’s rules, so the two always agree', () => {
    const t = C.weeklyTrend(p, 9);
    // Week 1: Read 6 of 7 days, Focus 3 of its goal of 5. Week 2 so far: Read 1 of 1 (today still open), Focus
    // nothing credited yet, so nothing counted against it.
    expect(t.map((w) => [w.week, w.done, w.eligible, w.state])).toEqual([
      [1, 9, 12, 'closed'],
      [2, 1, 1, 'current'],
    ]);
    expect(t[0].share).toBeCloseTo(0.75);
    const sum = t.reduce((a, w) => ({ done: a.done + w.done, eligible: a.eligible + w.eligible }), {
      done: 0,
      eligible: 0,
    });
    expect(sum).toEqual(P.overallTally(p, 9));
  });

  it('shows a finished week with no record at all as unrecorded, never as 0%', () => {
    const q = doneOn(pilot([READ]), 'mind_read', [1, 2, 3]);
    const t = C.weeklyTrend(q, 16);
    expect(t.map((w) => w.state)).toEqual(['closed', 'unrecorded', 'current']);
    expect(t[1]).toMatchObject({ share: null, done: 0, eligible: 7 });
    expect(judgedWeeks(t)).toBe(1);
  });

  it('says there is nothing to judge before the first week ends', () => {
    const t = C.weeklyTrend(pilot([READ]), 3);
    expect(t.map((w) => w.state)).toEqual(['current']);
    expect(judgedWeeks(t)).toBe(0);
    expect(bestWeek(t)).toBeNull();
  });

  it('keeps short first weeks short, by their real dates', () => {
    const t = C.weeklyTrend(doneOn(pilot([READ], SAT), 'mind_read', [1, 2]), 4);
    expect(t.map((w) => [w.firstDay, w.lastDay, w.days, w.state])).toEqual([
      [1, 2, 2, 'closed'],
      [3, 9, 7, 'current'],
    ]);
    expect(t[0].share).toBe(1);
  });

  it('marks a finished week with nothing due as having no opportunities, and scales a short week’s goal', () => {
    const wk = { week: 1, firstDay: 1, lastDay: 2 };
    expect(weekPoint(wk, { done: 0, eligible: 0 }, true, true)).toMatchObject({ state: 'none', share: null });
    expect(weekPoint(wk, { done: 0, eligible: 0 }, true, false)).toMatchObject({ state: 'none', share: null });
    // Focus Time alone, started on a Saturday: a two-day first week asks for 1 session (5 a week, scaled), and a
    // weekend with no record at all is unrecorded, not 0%.
    const t = C.weeklyTrend(pilot([FOCUS], SAT), 4);
    expect(t[0]).toMatchObject({ state: 'unrecorded', eligible: 1, share: null });
    expect(C.weeklyTrend(doneOn(pilot([FOCUS], SAT), 'focus_deepwork', [2]), 4)[0]).toMatchObject({
      state: 'closed',
      share: 1,
    });
  });
});

describe('the 66-day heatmap (Life Reset)', () => {
  const p = doneOn(doneOn(pilot([READ, FOCUS]), 'mind_read', [1, 2, 4, 5, 6, 7, 8]), 'focus_deepwork', [1, 2, 3]);

  it('has every program day on its real date and weekday', () => {
    const cells = C.dayCells(p, 9);
    expect(cells).toHaveLength(PROGRAM_DAYS);
    expect(cells[0]).toMatchObject({ day: 1, date: MON, weekday: 0 });
    expect(cells[5]).toMatchObject({ day: 6, date: dateForDay(MON, 6), weekday: 5 });
    expect(cells[65].date).toBe(dateForDay(MON, 66));
  });

  it('tells full, partial, today and future days apart', () => {
    const cells = C.dayCells(p, 9);
    // Day 1: both done. Day 3: only Focus (Read missed). Day 6, a Saturday: Read done, but Focus's week is still open
    // (3 of 5), so the day isn't complete. Day 9 is today, Day 10 hasn't come.
    expect(states(cells, [1, 3, 6, 9, 10])).toEqual(['full', 'partial', 'partial', 'today', 'future']);
    expect(cells[2]).toMatchObject({ done: ['focus_deepwork'], planned: ['focus_deepwork', 'mind_read'] });
  });

  it('distinguishes an explicit non-completion from a day with no record', () => {
    // Day 2: done, then undone (the day has a record, nothing on it done). Day 3: never touched.
    const q = P.undo(P.complete(pilot([READ]), 'mind_read', 2).program, 'mind_read', 2).program;
    expect(states(C.dayCells(q, 5), [2, 3])).toEqual(['missed', 'unrecorded']);
  });

  it('shows skipped days and rest days, which are never misses', () => {
    const s = P.setSkipped(
      pilot([READ, { habitId: 'confidence_talk', intensity: 'starter' }]),
      'confidence_talk',
      2,
      true,
    );
    expect(C.dayCells(s.program, 4)[1]).toMatchObject({ state: 'skipped', skipped: ['confidence_talk'] });
    // Focus Time alone is weekly: a day it isn't done is a rest day, weekday or weekend.
    const f = doneOn(pilot([FOCUS]), 'focus_deepwork', [1]);
    expect(states(C.dayCells(f, 8), [1, 2, 6, 7])).toEqual(['full', 'rest', 'rest', 'rest']);
  });

  it('lays the days out in calendar weeks, Monday on top, padded before Day 1 and after Day 66', () => {
    const cols = heatmapColumns(C.dayCells(pilot([READ], SAT), 1));
    expect(cols).toHaveLength(11);
    expect(cols[0].map((c) => c?.day ?? null)).toEqual([null, null, null, null, null, 1, 2]);
    expect(cols[1][0]?.day).toBe(3);
    expect(cols.every((c) => c.length === 7)).toBe(true);
    expect(cols.flat().filter(Boolean)).toHaveLength(PROGRAM_DAYS);
    for (const col of cols) col.forEach((c, i) => c && expect(c.weekday).toBe(i));
  });
});

describe('the habit breakdown and personal records (Life Reset)', () => {
  it('judges daily habits by the day and weekly ones by their goal', () => {
    const p = doneOn(doneOn(pilot([READ, FOCUS]), 'mind_read', [1, 2, 3]), 'focus_deepwork', [1, 2, 3, 4, 5, 8]);
    const bars = C.habitBars(p, 16);
    expect(bars.find((b) => b.id === 'focus_deepwork')).toMatchObject({
      kind: 'weekly',
      weeksMet: 1,
      weeksJudged: 2,
      tally: { done: 6, eligible: 10 },
    });
    expect(bars.find((b) => b.id === 'mind_read')).toMatchObject({ kind: 'daily', tally: { done: 3, eligible: 15 } });
  });

  it('counts only what was done: actions, reading days, strength sessions, the best streak and week', () => {
    const p = doneOn(doneOn(pilot([READ, STRENGTH]), 'mind_read', [1, 2, 3, 4, 5, 6, 7, 9]), 'strength_log', [2, 4]);
    const r = C.records(p, 10);
    expect(r).toEqual({
      bestWeek: { week: 1, share: 9 / 9, done: 9, eligible: 9 },
      total: 10,
      readingDays: 8,
      strengthSessions: 2,
      bestStreak: P.journeyStats(p, 10).best,
    });
    // Nothing about minutes or hours, and no reading or strength record without those habits.
    expect(Object.keys(r).some((k) => /minute|hour/i.test(k))).toBe(false);
    expect(C.records(pilot([FOCUS]), 3)).toMatchObject({ readingDays: null, strengthSessions: null, total: 0 });
  });

  it('is honest when there is nothing yet', () => {
    const p = pilot([READ]);
    expect(C.records(p, 1)).toEqual({
      bestWeek: null,
      total: 0,
      readingDays: 0,
      strengthSessions: null,
      bestStreak: 0,
    });
    expect(C.weeklyTrend(p, 1)).toEqual([expect.objectContaining({ state: 'current', share: null, eligible: 0 })]);
    expect(C.dayCells(p, 1)[0].state).toBe('today');
  });
});

describe('the best week', () => {
  const w = (week: number, done: number, eligible: number, state: WeekPoint['state'] = 'closed'): WeekPoint => ({
    week,
    firstDay: 1,
    lastDay: 7,
    days: 7,
    done,
    eligible,
    share: eligible ? done / eligible : null,
    state,
  });
  it('takes the highest finished week; ties go to the one with more done, then the earlier', () => {
    expect(bestWeek([w(1, 2, 2), w(2, 10, 10), w(3, 10, 10)])?.week).toBe(2);
    expect(bestWeek([w(1, 9, 10), w(2, 5, 5, 'current')])?.week).toBe(1);
    expect(bestWeek([w(1, 0, 7, 'unrecorded')])).toBeNull();
    expect(bestWeek([{ ...w(1, 2, 2), days: 2 }, w(2, 6, 10)])?.week).toBe(2);
    expect(bestWeek([{ ...w(1, 2, 2), days: 2 }])).toBeNull();
  });
});

describe('an inspected day', () => {
  const name = (id: string) => ({ a: 'Read', b: 'Walk', c: 'Sleep' })[id] ?? id;
  const cell = (state: CellState, done: string[], planned: string[], skipped: string[] = []) => ({
    day: 3,
    date: '2026-11-04',
    weekday: 2,
    state,
    done,
    planned,
    skipped,
  });
  it('says what was recorded, in words, without inventing anything', () => {
    expect(cellSummary(cell('full', ['a', 'b'], ['a', 'b']), name)).toBe('All 2 done: Read, Walk.');
    expect(cellSummary(cell('partial', ['a'], ['a', 'b'], ['c']), name)).toBe('1 of 2 done: Read. Skipped: Sleep.');
    expect(cellSummary(cell('missed', [], ['a', 'b']), name)).toBe('Recorded, but none of the day’s 2 habits done.');
    expect(cellSummary(cell('unrecorded', [], ['a']), name)).toBe('No record: nothing was checked off that day.');
    expect(cellSummary(cell('rest', [], []), name)).toBe('A rest day: nothing was due.');
    expect(cellSummary(cell('today', [], ['a']), name)).toBe('Today, still open.');
  });
});
