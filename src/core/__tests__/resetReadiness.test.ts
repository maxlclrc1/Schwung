import { describe, expect, it } from '@jest/globals';
import { dateForDay } from '../dates';
import { PHASE_START, reconcile } from '../progression';
import {
  acceptOffer,
  checkLevel,
  declineOffer,
  easierLevel,
  harderLevel,
  levelOn,
  makeEasier,
  makeHarder,
  newProgression,
  nextBoundary,
  PHASE_OPENS,
  pendingChange,
  progressionOffer,
  READINESS,
  readiness,
  saidTooHard,
  setFeedback,
  type Constraints,
  type ProgressionState,
} from '../reset/readiness';
import type { Intensity, Phase } from '../reset/habits';
import type { WeeklyContext } from '../reset/weekly';
import type { DayLog, PlanHabit } from '../types';
import type { ProfileV2 } from '../v2/types';
import { sanitize } from '../../store/migrate';

// 2026-11-02 is a Monday: weeks are Days 1–7, 8–14, 15–21, 22–28…
const MON = '2026-11-02';
const ctx: WeeklyContext = { startKey: MON };
const WALK = 'move_walk'; // daily
const STRENGTH = 'strength_log'; // sessions a week

type Logs = Record<string, DayLog>;
/** Records for one habit: done, skipped (on purpose) and missed (a record without it) days; others unrecorded. */
function logsFor(id: string, done: number[], skipped: number[] = [], missed: number[] = []): Logs {
  const out: Logs = {};
  for (const d of [...done, ...skipped, ...missed]) {
    const date = dateForDay(MON, d);
    out[date] = {
      day: d,
      date,
      completed: done.includes(d) ? [id] : [],
      planned: [id],
      ...(skipped.includes(d) ? { track: { [id]: { v: 1, skipped: true } } } : {}),
    };
  }
  return out;
}
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);
const without = (xs: number[], ...drop: number[]) => xs.filter((x) => !drop.includes(x));

const walk = (intensity: Intensity = 'starter', day = 1, phase: Phase = 'foundation') =>
  newProgression(WALK, intensity, day, phase);
const strength = (intensity: Intensity = 'standard', day = 1) => newProgression(STRENGTH, intensity, day);
const outcome = (state: ProgressionState, logs: Logs, today: number, extra: { yesterdayEditable?: boolean } = {}) =>
  readiness({ state, logs, ctx, today, ...extra }).outcome;

const ADULT: ProfileV2 = {
  age: '18_29',
  goal: 'focus',
  sleepHours: '7_8',
  sleepTrouble: 'rarely',
  activeDays: '1_2',
  produce: '3_4',
  sugary: 'rarely',
  phone: '2_4',
  phonePull: 'social',
  routines: [],
  precautions: [],
  wake: { kind: 'time', time: '07:15' },
  inBed: '23:30',
};
const TEEN: ProfileV2 = { ...ADULT, age: '16_17', sugary: undefined };

describe('daily readiness (the last 14 opportunities)', () => {
  // Today is Day 22; the window is Days 8–21.
  const W = range(8, 21);

  it('offers the next phase at 80% (12 of 14), keeps the target at 60–79%, suggests easier under 60%', () => {
    const s = walk('standard');
    expect(outcome(s, logsFor(WALK, without(W, 8, 9), [], [8, 9]), 22)).toBe('ready'); // 12/14 = 85.7%
    expect(outcome(s, logsFor(WALK, without(W, 8, 9, 10), [], [8, 9, 10]), 22)).toBe('maintain'); // 11/14 = 78.6%
    expect(outcome(s, logsFor(WALK, range(8, 16), [], range(17, 21)), 22)).toBe('maintain'); // 9/14 = 64.3%
    expect(outcome(s, logsFor(WALK, range(8, 15), [], range(16, 21)), 22)).toBe('struggling'); // 8/14 = 57.1%
  });

  it('compares exact percentages in whole numbers (80% and 60% are inclusive)', () => {
    // Started on Day 12: the window is Days 12–21, ten opportunities.
    const s = walk('standard', 12);
    const ten = range(12, 21);
    expect(readiness({ state: s, logs: {}, ctx, today: 22 }).window).toBe(10);
    expect(outcome(s, logsFor(WALK, ten.slice(0, 8), [], ten.slice(8)), 22)).toBe('ready'); // exactly 80%
    expect(outcome(s, logsFor(WALK, ten.slice(0, 7), [], ten.slice(7)), 22)).toBe('maintain'); // 70%
    expect(outcome(s, logsFor(WALK, ten.slice(0, 6), [], ten.slice(6)), 22)).toBe('maintain'); // exactly 60%
    expect(outcome(s, logsFor(WALK, ten.slice(0, 5), [], ten.slice(5)), 22)).toBe('struggling'); // 50%
  });

  it('needs 90% and an explicit “too easy” for an early step-up', () => {
    const s = walk('standard');
    const thirteen = logsFor(WALK, without(W, 8), [], [8]); // 13/14 = 92.9%
    expect(outcome(s, thirteen, 22)).toBe('ready');
    expect(outcome(setFeedback(s, 'too-easy', 20), thirteen, 22)).toBe('ready-early');
    expect(outcome(setFeedback(s, 'too-hard', 20), thirteen, 22)).toBe('ready');
    // 12/14 (85.7%) is ready, never early, even with "too easy".
    expect(outcome(setFeedback(s, 'too-easy', 20), logsFor(WALK, without(W, 8, 9), [], [8, 9]), 22)).toBe('ready');
    // Feedback given about an earlier target doesn't count for the current one.
    const later = {
      ...setFeedback(s, 'too-easy', 3),
      eras: [...s.eras, { ...s.eras[0], fromDay: 5, reason: 'easier' as const }],
    };
    expect(outcome(later, thirteen, 22)).toBe('ready');
  });

  it('counts only final days: never today, nor yesterday while it can still be edited', () => {
    const s = walk();
    const logs = logsFor(WALK, range(9, 22), [], [8]); // today (22) done, Day 8 missed
    expect(readiness({ state: s, logs, ctx, today: 22 }).counts).toEqual({
      done: 13,
      skipped: 0,
      missed: 1,
      unknown: 0,
    });
    // Before noon, Day 21 isn't final: the window is Days 7–20.
    const r = readiness({ state: s, logs, ctx, today: 22, yesterdayEditable: true });
    expect([r.window, r.counts]).toEqual([14, { done: 12, skipped: 0, missed: 1, unknown: 1 }]);
  });

  it('counts only days since the current target began (a new target needs new evidence)', () => {
    const s = walk('starter', 18);
    const r = readiness({ state: s, logs: logsFor(WALK, range(1, 21)), ctx, today: 22 });
    expect([r.window, r.counts.done, r.outcome]).toEqual([4, 4, 'insufficient-data']);
  });
});

describe('minimum coverage and unrecorded days', () => {
  it('gives no recommendation with fewer than 7 recorded opportunities', () => {
    expect(READINESS.minRecorded).toBe(7);
    const s = walk('standard');
    expect(outcome(s, logsFor(WALK, range(8, 13)), 22)).toBe('insufficient-data'); // 6 recorded, all done
    expect(outcome(s, logsFor(WALK, [], [], range(8, 13)), 22)).toBe('insufficient-data'); // 6 recorded, all missed
    expect(outcome(s, {}, 22)).toBe('insufficient-data');
    // Early in the program there simply isn't enough yet.
    expect(outcome(s, logsFor(WALK, range(1, 6)), 7)).toBe('insufficient-data');
  });

  it('never treats an unrecorded day as done: 7 recorded and done, 7 unknown keeps the target', () => {
    const s = walk('standard');
    const r = readiness({ state: s, logs: logsFor(WALK, range(15, 21)), ctx, today: 22 });
    expect([r.counts, r.outcome]).toEqual([{ done: 7, skipped: 0, missed: 0, unknown: 7 }, 'maintain']);
    // The step-up share is over the whole window, unknown days included: 12 known successes are needed.
    expect(outcome(setFeedback(s, 'too-easy', 21), logsFor(WALK, range(10, 21)), 22)).toBe('ready'); // 12 known
    expect(outcome(setFeedback(s, 'too-easy', 21), logsFor(WALK, range(11, 21)), 22)).toBe('maintain'); // 11 known
  });

  it('never steps down from mostly unknown days', () => {
    const s = walk('standard');
    // 2 done, 4 missed, 8 unknown: only 6 recorded, so nothing is suggested.
    expect(outcome(s, logsFor(WALK, [20, 21], [], [8, 9, 10, 11]), 22)).toBe('insufficient-data');
    expect(
      progressionOffer({ state: s, logs: logsFor(WALK, [20, 21], [], [8, 9, 10, 11]), ctx, today: 22 }),
    ).toBeNull();
    // With enough recorded, the easier suggestion is judged on the recorded days only: 4 of 7 (57%) is struggling,
    // 5 of 8 (62.5%) is not, however many days are unknown.
    expect(outcome(s, logsFor(WALK, [15, 16, 17, 18], [], [19, 20, 21]), 22)).toBe('struggling');
    expect(outcome(s, logsFor(WALK, [14, 15, 16, 17, 18], [], [19, 20, 21]), 22)).toBe('maintain');
  });
});

describe('explicit skips', () => {
  const W = range(8, 21);

  it('count as not done: skipping never raises readiness', () => {
    const s = setFeedback(walk('standard'), 'too-easy', 21);
    const skipped = readiness({ state: s, logs: logsFor(WALK, without(W, 8, 9, 10), [8, 9, 10]), ctx, today: 22 });
    const missed = readiness({ state: s, logs: logsFor(WALK, without(W, 8, 9, 10), [], [8, 9, 10]), ctx, today: 22 });
    expect(skipped.counts).toEqual({ done: 11, skipped: 3, missed: 0, unknown: 0 });
    expect([skipped.outcome, missed.outcome]).toEqual(['maintain', 'maintain']);
    // Leaving a day out by skipping it doesn't shrink the denominator either.
    expect(skipped.window).toBe(14);
  });

  it('are recorded opportunities, so they count toward coverage and toward an easier suggestion', () => {
    const s = walk('standard');
    expect(outcome(s, logsFor(WALK, [], range(15, 21)), 22)).toBe('struggling'); // 7 skipped of 7 recorded
    expect(outcome(s, logsFor(WALK, range(8, 15), range(16, 21)), 22)).toBe('struggling'); // 8 of 14
    expect(outcome(s, logsFor(WALK, range(8, 16), range(17, 21)), 22)).toBe('maintain'); // 9 of 14
  });
});

describe('weekly readiness (closed program weeks)', () => {
  // Standard Foundation is 2 sessions a week. Today is Day 22: Weeks 1–3 (Days 1–21) are closed.
  const sessions = (...weeks: number[][]) => weeks.flat();

  it('is ready after three achieved weeks; rest days are never misses', () => {
    const r = readiness({
      state: strength(),
      logs: logsFor(STRENGTH, sessions([1, 3], [8, 10], [15, 17])),
      ctx,
      today: 22,
    });
    expect([r.basis, r.window, r.counts, r.outcome]).toEqual([
      'weekly',
      3,
      { done: 3, skipped: 0, missed: 0, unknown: 0 },
      'ready',
    ]);
  });

  it('counts a judged unmet quota as not achieved', () => {
    // One session in Week 3 (and a record on a rest day): 2 of 3 weeks achieved = 66.7%.
    const two = logsFor(STRENGTH, [1, 3, 8, 10, 15], [], [18]);
    expect(outcome(strength(), two, 22)).toBe('maintain');
    // 1 of 3 achieved = 33.3%: an easier target is suggested.
    const one = logsFor(STRENGTH, [1, 3, 8, 15], [], [10, 18]);
    expect(outcome(strength(), one, 22)).toBe('struggling');
  });

  it('treats a week with no records at all as unknown, never as success', () => {
    const r = readiness({ state: strength(), logs: logsFor(STRENGTH, [1, 3, 8, 10]), ctx, today: 22 });
    expect([r.counts, r.outcome]).toEqual([{ done: 2, skipped: 0, missed: 0, unknown: 1 }, 'maintain']);
    // Two unknown weeks leave one judged week: no recommendation either way.
    expect(outcome(strength(), logsFor(STRENGTH, [1, 3]), 22)).toBe('insufficient-data');
    expect(outcome(strength(), logsFor(STRENGTH, [], [], [2]), 22)).toBe('insufficient-data');
  });

  it('never counts a week still in progress, so a partly elapsed week is never a failure', () => {
    // Thursday of Week 3: Weeks 1 and 2 are closed; Week 3's empty Monday–Wednesday don't count.
    const r = readiness({
      state: strength(),
      logs: logsFor(STRENGTH, [1, 3, 8, 10], [], [15, 16, 17]),
      ctx,
      today: 18,
    });
    expect([r.window, r.outcome]).toEqual([2, 'ready']);
    // Before noon on Monday the week just ended is still editable, so it isn't judged yet.
    const early = readiness({
      state: strength(),
      logs: logsFor(STRENGTH, [1, 3, 8, 10]),
      ctx,
      today: 15,
      yesterdayEditable: true,
    });
    expect(early.window).toBe(1);
    expect(early.outcome).toBe('insufficient-data');
  });

  it('handles a short first week like any other week (a week too short for a goal is left out)', () => {
    // Starting on a Friday: Week 1 is Fri–Sun (Days 1–3), too short for 2 sessions out of 7 days.
    const fri: WeeklyContext = { startKey: '2026-11-06' };
    const logs: Logs = {};
    for (const d of [4, 6, 11, 13]) {
      const date = dateForDay(fri.startKey, d);
      logs[date] = { day: d, date, completed: [STRENGTH], planned: [STRENGTH] };
    }
    const r = readiness({ state: strength(), logs, ctx: fri, today: 18 });
    expect([r.window, r.counts.done, r.outcome]).toEqual([2, 2, 'ready']);
  });

  it('uses only weeks that began on or after the current target', () => {
    // Stepped up on Day 15 (a Monday): only Week 3 counts so far.
    const s: ProgressionState = {
      ...strength(),
      eras: [...strength().eras, { intensity: 'standard', phase: 'momentum', fromDay: 15, reason: 'step-up' }],
    };
    const r = readiness({ state: s, logs: logsFor(STRENGTH, [1, 3, 8, 10, 15, 17, 19]), ctx, today: 22 });
    expect([r.window, r.outcome]).toEqual([1, 'insufficient-data']);
  });

  it('asks a habit with fewer days a week for the same share and the same number of judged weeks', () => {
    // Starter (2 a week) and Standard Momentum (3 a week) both need 2 judged weeks and 80% of the window.
    expect(READINESS.minJudgedWeeks).toBe(2);
    const missedOne = logsFor(STRENGTH, [1, 3, 8, 15, 17], [], [10]);
    expect(outcome(strength('starter'), missedOne, 22)).toBe('maintain');
    expect(outcome(strength('standard'), missedOne, 22)).toBe('maintain');
  });
});

describe('phase boundaries and offers', () => {
  const allDone = (to: number) => logsFor(WALK, range(1, to));

  it('makes no automatic change on Day 22 or Day 45: the target stays until the person accepts', () => {
    const s = walk('standard');
    expect(levelOn(s, 22)).toEqual({ intensity: 'standard', phase: 'foundation' });
    expect(levelOn(s, 45)).toEqual({ intensity: 'standard', phase: 'foundation' });
    expect(PHASE_OPENS).toEqual({ foundation: 1, momentum: PHASE_START[2], mastery: PHASE_START[3] });
  });

  it('offers the next phase once it’s open and the habit is ready, from tomorrow', () => {
    const s = walk('standard');
    expect(progressionOffer({ state: s, logs: allDone(21), ctx, today: 21 })).toBeNull(); // not open yet
    expect(progressionOffer({ state: s, logs: allDone(21), ctx, today: 22 })).toEqual({
      kind: 'step-up',
      from: { intensity: 'standard', phase: 'foundation' },
      to: { intensity: 'standard', phase: 'momentum' },
      early: false,
      effectiveDay: 23,
    });
  });

  it('keeps the target when readiness isn’t met, and offers later once it is', () => {
    const s = walk('standard');
    const shaky = logsFor(WALK, range(8, 18), [], range(19, 21)); // 11/14
    expect(progressionOffer({ state: s, logs: shaky, ctx, today: 22 })).toBeNull();
    // By Day 34 the window is Days 20–33: 12 of 14 done.
    const better = { ...shaky, ...logsFor(WALK, range(22, 33)) };
    expect(progressionOffer({ state: s, logs: better, ctx, today: 33 })).toBeNull();
    expect(progressionOffer({ state: s, logs: better, ctx, today: 34 })?.to).toEqual({
      intensity: 'standard',
      phase: 'momentum',
    });
  });

  it('offers early, before the phase opens, only with 90% and “too easy”', () => {
    const s = walk('standard');
    expect(progressionOffer({ state: s, logs: allDone(14), ctx, today: 15 })).toBeNull();
    const offer = progressionOffer({ state: setFeedback(s, 'too-easy', 14), logs: allDone(14), ctx, today: 15 });
    expect(offer).toMatchObject({ kind: 'step-up', early: true, effectiveDay: 16 });
    // Momentum → Mastery early, too (Mastery opens on Day 45).
    const m = newProgression(WALK, 'standard', 23, 'momentum');
    expect(
      progressionOffer({ state: setFeedback(m, 'too-easy', 37), logs: allDone(37), ctx, today: 38 })?.to.phase,
    ).toBe('mastery');
    expect(progressionOffer({ state: m, logs: allDone(37), ctx, today: 38 })).toBeNull();
  });

  it('never offers a higher intensity: at Mastery nothing is offered', () => {
    const s = walk('starter', 45, 'mastery');
    expect(outcome(setFeedback(s, 'too-easy', 60), allDone(60), 61)).toBe('ready-early');
    expect(progressionOffer({ state: setFeedback(s, 'too-easy', 60), logs: allDone(60), ctx, today: 61 })).toBeNull();
  });

  it('starts a weekly habit’s step-up at the next week', () => {
    const s = strength();
    const logs = logsFor(STRENGTH, [1, 3, 8, 10, 15, 17]);
    expect(progressionOffer({ state: s, logs, ctx, today: 24 })).toMatchObject({ kind: 'step-up', effectiveDay: 29 });
    expect(nextBoundary(s, ctx, 28)).toBe(29);
    expect(nextBoundary(walk(), ctx, 24)).toBe(25);
  });

  it('suggests one step easier, from tomorrow, when struggling (and nothing below Starter Foundation)', () => {
    const struggling = logsFor(WALK, range(8, 13), [], range(14, 21));
    expect(progressionOffer({ state: walk('standard'), logs: struggling, ctx, today: 22 })).toEqual({
      kind: 'step-down',
      from: { intensity: 'standard', phase: 'foundation' },
      to: { intensity: 'starter', phase: 'foundation' },
      early: false,
      effectiveDay: 23,
    });
    expect(progressionOffer({ state: walk('standard', 1, 'momentum'), logs: struggling, ctx, today: 22 })?.to).toEqual({
      intensity: 'standard',
      phase: 'foundation',
    });
    expect(progressionOffer({ state: walk('starter'), logs: struggling, ctx, today: 22 })).toBeNull();
  });

  it('never offers a step-up the person can’t take', () => {
    const s = newProgression('focus_deepwork', 'standard', 1);
    const logs = logsFor('focus_deepwork', [1, 2, 3, 4, 5, 8, 9, 10, 11, 12, 15, 16, 17, 18, 19]);
    expect(progressionOffer({ state: s, logs, ctx, today: 22 })?.to.phase).toBe('momentum');
    // Momentum is 40 min; 30 min of other habits and 60 available leave room for only 30.
    const tight: Constraints = { availableMinutes: 60, otherMinutes: 30 };
    expect(progressionOffer({ state: s, logs, ctx, today: 22, constraints: tight })).toBeNull();
  });
});

describe('accepting and declining', () => {
  const allDone = (to: number) => logsFor(WALK, range(1, to));

  it('applies an accepted step-up at its boundary and offers nothing while it waits', () => {
    const s = walk('standard');
    const offer = progressionOffer({ state: s, logs: allDone(21), ctx, today: 22 })!;
    const accepted = acceptOffer(s, offer, 22);
    expect(levelOn(accepted, 22).phase).toBe('foundation');
    expect(levelOn(accepted, 23).phase).toBe('momentum');
    expect(pendingChange(accepted, 22)).toMatchObject({ phase: 'momentum', fromDay: 23, reason: 'step-up' });
    expect(progressionOffer({ state: accepted, logs: allDone(21), ctx, today: 22 })).toBeNull();
    // Once it starts, the new target collects its own evidence from scratch.
    expect(pendingChange(accepted, 23)).toBeNull();
    expect(outcome(accepted, allDone(30), 24)).toBe('insufficient-data');
  });

  it('applies an accepted step-down from tomorrow, never partway through today', () => {
    const s = walk('standard');
    const offer = progressionOffer({ state: s, logs: logsFor(WALK, [], [], range(8, 21)), ctx, today: 22 })!;
    const accepted = acceptOffer(s, offer, 22);
    expect(levelOn(accepted, 22)).toEqual({ intensity: 'standard', phase: 'foundation' });
    expect(levelOn(accepted, 23)).toEqual({ intensity: 'starter', phase: 'foundation' });
    expect(accepted.eras.map((e) => e.reason)).toEqual(['start', 'step-down']);
  });

  it('doesn’t repeat a declined offer for 7 days, then offers it again if still ready', () => {
    const s = walk('standard');
    const offer = progressionOffer({ state: s, logs: allDone(21), ctx, today: 22 })!;
    const declined = declineOffer(s, offer, 22);
    expect(levelOn(declined, 40)).toEqual(levelOn(s, 40)); // nothing changes
    for (let d = 22; d < 29; d++)
      expect(progressionOffer({ state: declined, logs: allDone(d - 1), ctx, today: d })).toBeNull();
    const again = progressionOffer({ state: declined, logs: allDone(28), ctx, today: 29 });
    expect(again).toMatchObject({ kind: 'step-up', effectiveDay: 30 });
    // Declining again starts a new cooldown.
    const twice = declineOffer(declined, again!, 29);
    expect(progressionOffer({ state: twice, logs: allDone(30), ctx, today: 31 })).toBeNull();
    expect(progressionOffer({ state: twice, logs: allDone(35), ctx, today: 36 })).not.toBeNull();
  });

  it('keeps a declined step-up from blocking a different suggestion', () => {
    const s = walk('standard');
    const declined = declineOffer(s, progressionOffer({ state: s, logs: allDone(21), ctx, today: 22 })!, 22);
    const struggling = { ...allDone(14), ...logsFor(WALK, [], [], range(15, 24)) };
    expect(progressionOffer({ state: declined, logs: struggling, ctx, today: 25 })?.kind).toBe('step-down');
  });

  it('clears a decline once a change is made', () => {
    const s = walk('standard');
    const declined = declineOffer(s, progressionOffer({ state: s, logs: allDone(21), ctx, today: 22 })!, 22);
    const r = makeHarder(declined, ctx, 23);
    expect('state' in r && r.state.declined).toBeUndefined();
  });
});

describe('manual easier and harder', () => {
  it('makes it easier from tomorrow, any time, one step at a time', () => {
    const r = makeEasier(walk('standard', 1, 'momentum'), ctx, 5);
    expect(r).toMatchObject({ level: { intensity: 'standard', phase: 'foundation' } });
    if (!('state' in r)) throw new Error('blocked');
    expect(levelOn(r.state, 5)).toEqual({ intensity: 'standard', phase: 'momentum' });
    expect(levelOn(r.state, 6)).toEqual({ intensity: 'standard', phase: 'foundation' });
    expect(r.state.eras[1]).toMatchObject({ fromDay: 6, reason: 'easier' });
    expect(makeEasier(r.state, ctx, 6)).toMatchObject({ level: { intensity: 'starter', phase: 'foundation' } });
    expect(makeEasier(walk('starter'), ctx, 5)).toEqual({ blocked: 'this is already the easiest target' });
  });

  it('makes it harder from the next boundary without waiting for readiness or a phase', () => {
    const r = makeHarder(walk('starter'), ctx, 3);
    expect(r).toMatchObject({ level: { intensity: 'starter', phase: 'momentum' } });
    if (!('state' in r)) throw new Error('blocked');
    expect([levelOn(r.state, 3).phase, levelOn(r.state, 4).phase]).toEqual(['foundation', 'momentum']);
    expect(r.state.eras[1].reason).toBe('harder');
    // A weekly habit changes from next Monday.
    const w = makeHarder(strength(), ctx, 3);
    expect('state' in w && pendingChange(w.state, 3)?.fromDay).toBe(8);
  });

  it('goes to a higher intensity only when the person asks, at Mastery', () => {
    expect(harderLevel({ intensity: 'standard', phase: 'mastery' })).toEqual({
      intensity: 'challenge',
      phase: 'mastery',
    });
    expect(easierLevel({ intensity: 'standard', phase: 'foundation' })).toEqual({
      intensity: 'starter',
      phase: 'foundation',
    });
    expect(makeHarder(walk('challenge', 45, 'mastery'), ctx, 50)).toEqual({
      blocked: 'this is already the hardest target',
    });
  });

  it('builds on a change that is still waiting, replacing it', () => {
    const once = makeHarder(walk('starter'), ctx, 3);
    if (!('state' in once)) throw new Error('blocked');
    const twice = makeHarder(once.state, ctx, 3);
    if (!('state' in twice)) throw new Error('blocked');
    expect(twice.state.eras.map((e) => [e.phase, e.fromDay])).toEqual([
      ['foundation', 1],
      ['mastery', 4],
    ]);
    // Making it easier while a rise waits simply cancels the rise.
    const back = makeEasier(once.state, ctx, 3);
    if (!('state' in back)) throw new Error('blocked');
    expect(back.state.eras.map((e) => [e.phase, e.fromDay])).toEqual([['foundation', 1]]);
    expect(pendingChange(back.state, 3)).toBeNull();
  });
});

describe('constraints', () => {
  it('respects age: 16–17 can’t move Strength Training to Challenge', () => {
    const s = newProgression(STRENGTH, 'standard', 45, 'mastery');
    expect(makeHarder(s, ctx, 50, { profile: TEEN })).toEqual({
      blocked: 'this intensity isn’t offered to 16–17-year-olds',
    });
    expect(makeHarder(s, ctx, 50, { profile: ADULT })).toMatchObject({ level: { intensity: 'challenge' } });
  });

  it('respects safety exclusions in every direction', () => {
    const heart: ProfileV2 = { ...ADULT, precautions: ['heart'] };
    const s = strength();
    expect(
      checkLevel(
        STRENGTH,
        { intensity: 'standard', phase: 'foundation' },
        { intensity: 'standard', phase: 'momentum' },
        { profile: heart },
      ),
    ).toMatch(/clinician/);
    expect(makeHarder(s, ctx, 3, { profile: heart })).toHaveProperty('blocked');
    // Joint pain rules out Starter (a physiotherapist's routine first), so Standard can't step down to it.
    const joint: ProfileV2 = { ...ADULT, precautions: ['joint'] };
    expect(makeEasier(s, ctx, 3, { profile: joint })).toHaveProperty('blocked');
    const logs = logsFor(STRENGTH, [1, 8], [], [3, 10, 17]);
    expect(progressionOffer({ state: s, logs, ctx, today: 22 })?.kind).toBe('step-down');
    expect(progressionOffer({ state: s, logs, ctx, today: 22, constraints: { profile: joint } })).toBeNull();
  });

  it('respects the time the person has', () => {
    const s = newProgression('focus_deepwork', 'standard', 1);
    expect(makeHarder(s, ctx, 3, { availableMinutes: 60, otherMinutes: 30 })).toEqual({
      blocked: 'it doesn’t fit the time you have',
    });
    expect(makeHarder(s, ctx, 3, { availableMinutes: 70, otherMinutes: 30 })).toMatchObject({
      level: { phase: 'momentum' },
    });
    // Easier always fits better, so time never blocks it.
    expect(makeEasier(s, ctx, 3, { availableMinutes: 20, otherMinutes: 0 })).toMatchObject({
      level: { intensity: 'starter' },
    });
  });

  it('respects how many workdays the person has', () => {
    const s = newProgression('focus_top3', 'starter', 45, 'mastery'); // any 3 workdays
    expect(makeHarder(s, ctx, 50, { workdays: [1, 2, 3, 4] })).toEqual({
      blocked: 'it needs more workdays than you have',
    });
    expect(makeHarder(s, ctx, 50, { workdays: [1, 2, 3, 4, 5] })).toMatchObject({ level: { intensity: 'standard' } });
  });

  it('respects the Less Scrolling floor and the person’s stated need', () => {
    // 60 min a day: Starter Momentum is already at the 30-minute floor, so Mastery can't go lower.
    const s = newProgression('screen_app_limit', 'starter', 22, 'momentum');
    expect(makeHarder(s, ctx, 30, { pullBaseline: 60 })).toEqual({
      blocked: 'your limit is already as low as it goes for you',
    });
    expect(makeHarder(s, ctx, 30, { pullBaseline: 180 })).toMatchObject({ level: { phase: 'mastery' } });
    // At 180 min with a stated need of 140, Starter Mastery is already at 140, so Standard Mastery can't go lower.
    const m = newProgression('screen_app_limit', 'starter', 45, 'mastery');
    expect(makeHarder(m, ctx, 50, { pullBaseline: 180, statedNeed: 140 })).toHaveProperty('blocked');
    // Easier is never blocked by the floor.
    expect(makeEasier(s, ctx, 30, { pullBaseline: 60 })).toMatchObject({ level: { phase: 'foundation' } });
  });
});

describe('Step 4B: effective dates', () => {
  it('starts every change for a daily habit tomorrow, whenever today it is made', () => {
    // A program day is a date key, so 23:59 or 00:01 only matters through which day it is.
    for (const today of [1, 6, 7, 8, 21, 44]) {
      expect(nextBoundary(walk(), ctx, today)).toBe(today + 1);
      const e = makeEasier(walk('standard'), ctx, today);
      expect('state' in e && pendingChange(e.state, today)?.fromDay).toBe(today + 1);
      const h = makeHarder(walk('standard'), ctx, today);
      expect('state' in h && pendingChange(h.state, today)?.fromDay).toBe(today + 1);
    }
  });

  it('keeps today’s target until midnight, even while yesterday can still be edited', () => {
    const struggling = logsFor(WALK, [], [], range(6, 20));
    const offer = progressionOffer({
      state: walk('standard'),
      logs: struggling,
      ctx,
      today: 22,
      yesterdayEditable: true,
    });
    expect(offer).toMatchObject({ kind: 'step-down', effectiveDay: 23 });
    const accepted = acceptOffer(walk('standard'), offer!, 22);
    expect([levelOn(accepted, 22).intensity, levelOn(accepted, 23).intensity]).toEqual(['standard', 'starter']);
  });

  it('starts every change for a weekly habit on the next Monday, never mid-week', () => {
    // Day 7 is a Sunday, Day 8 a Monday.
    expect(nextBoundary(strength(), ctx, 7)).toBe(8);
    expect(nextBoundary(strength(), ctx, 8)).toBe(15);
    expect(nextBoundary(strength(), ctx, 1)).toBe(8);
    const sunday = makeEasier(strength(), ctx, 7);
    expect('state' in sunday && sunday.state.eras.map((e) => [e.intensity, e.fromDay])).toEqual([
      ['standard', 1],
      ['starter', 8],
    ]);
    const monday = makeEasier(strength(), ctx, 8);
    expect('state' in monday && pendingChange(monday.state, 8)?.fromDay).toBe(15);
    // A struggling weekly habit's step-down also waits for next Monday.
    const struggling = logsFor(STRENGTH, [1, 8], [], [3, 10, 17]);
    expect(progressionOffer({ state: strength(), logs: struggling, ctx, today: 24 })).toMatchObject({
      kind: 'step-down',
      effectiveDay: 29,
    });
  });

  it('leaves the week’s goal as it was until the change starts', () => {
    // Made easier on Wednesday of Week 4 (Day 24): Week 4 is still judged at 2 sessions, Week 5 at Starter.
    const r = makeEasier(strength('standard'), ctx, 24);
    if (!('state' in r)) throw new Error('blocked');
    expect([levelOn(r.state, 28).intensity, levelOn(r.state, 29).intensity]).toEqual(['standard', 'starter']);
  });

  it('handles phase transitions: a change made on Day 21 or 44 starts on the day the phase opens', () => {
    const early = progressionOffer({
      state: setFeedback(walk('standard'), 'too-easy', 20),
      logs: logsFor(WALK, range(1, 20)),
      ctx,
      today: 21,
    });
    expect(early).toMatchObject({ early: true, effectiveDay: 22 });
    const h = makeHarder(walk('standard', 22, 'momentum'), ctx, 44);
    expect('state' in h && [levelOn(h.state, 44).phase, levelOn(h.state, 45).phase]).toEqual(['momentum', 'mastery']);
    // Nothing happens on Day 22 or 45 by itself: an offer is only an offer.
    expect(levelOn(walk('standard'), 45)).toEqual({ intensity: 'standard', phase: 'foundation' });
  });
});

describe('Step 4B: weekly habits progress after two observed weeks', () => {
  it('offers a step-up after two achieved weeks (all three needn’t exist)', () => {
    // Started on Day 8: Weeks 2 and 3 are the only finished weeks.
    const s = strength('standard', 8);
    const logs = logsFor(STRENGTH, [8, 10, 15, 17]);
    expect(readiness({ state: s, logs, ctx, today: 22 })).toMatchObject({ window: 2, outcome: 'ready' });
    expect(progressionOffer({ state: s, logs, ctx, today: 22 })).toMatchObject({ kind: 'step-up', effectiveDay: 29 });
  });

  it('never counts unrecorded weeks as successes', () => {
    // 2 achieved of 3 with one unrecorded: 67%, kept; 2 of 2 judged is not the same as 2 of 3.
    const s = strength();
    expect(outcome(s, logsFor(STRENGTH, [8, 10, 15, 17]), 22)).toBe('maintain');
    expect(progressionOffer({ state: s, logs: logsFor(STRENGTH, [8, 10, 15, 17]), ctx, today: 22 })).toBeNull();
  });
});

describe('Step 4B: skipped and unrecorded days never inflate readiness', () => {
  it('gives the same or a lower outcome when a done day becomes skipped or unrecorded', () => {
    const rank = { 'insufficient-data': 0, struggling: 1, maintain: 2, ready: 3, 'ready-early': 4 } as const;
    const s = setFeedback(walk('standard'), 'too-easy', 21);
    const W = range(8, 21);
    for (let n = 0; n <= 14; n++) {
      const done = W.slice(0, 14 - n);
      const rest = W.slice(14 - n);
      const base = rank[outcome(s, logsFor(WALK, W), 22)];
      for (const logs of [logsFor(WALK, done, rest), logsFor(WALK, done, [], rest), logsFor(WALK, done)]) {
        const r = outcome(s, logs, 22);
        expect(rank[r] <= base).toBe(true);
        // Any non-done days take away readiness exactly as missed days would.
        if (r === 'ready' || r === 'ready-early') expect(done.length * 100 >= 80 * 14).toBe(true);
      }
    }
  });
});

describe('Step 4B: declined offers and the 7-day cooldown', () => {
  it('holds back a declined step-down for 7 days too, while manual controls stay available', () => {
    const s = walk('standard');
    const struggling = (to: number) => logsFor(WALK, [], [], range(1, to));
    const offer = progressionOffer({ state: s, logs: struggling(21), ctx, today: 22 })!;
    expect(offer.kind).toBe('step-down');
    const declined = declineOffer(s, offer, 22);
    for (let d = 22; d < 29; d++)
      expect(progressionOffer({ state: declined, logs: struggling(d - 1), ctx, today: d })).toBeNull();
    expect(progressionOffer({ state: declined, logs: struggling(28), ctx, today: 29 })).toMatchObject({
      kind: 'step-down',
      effectiveDay: 30,
    });
    // The person can still change it themselves at any time.
    expect(makeEasier(declined, ctx, 23)).toMatchObject({ level: { intensity: 'starter' } });
    expect(makeHarder(declined, ctx, 23)).toMatchObject({ level: { phase: 'momentum' } });
  });
});

describe('Step 4B: “too hard” feedback', () => {
  const allDone = (to: number) => logsFor(WALK, range(1, to));

  it('suppresses step-up offers, early ones included', () => {
    const s = walk('standard');
    expect(progressionOffer({ state: s, logs: allDone(21), ctx, today: 22 })?.kind).toBe('step-up');
    expect(progressionOffer({ state: setFeedback(s, 'too-hard', 20), logs: allDone(21), ctx, today: 22 })).toBeNull();
    // Early: "too hard" replaces an earlier "too easy" (only the latest answer counts).
    const easy = setFeedback(s, 'too-easy', 10);
    expect(progressionOffer({ state: easy, logs: allDone(14), ctx, today: 15 })?.early).toBe(true);
    expect(
      progressionOffer({ state: setFeedback(easy, 'too-hard', 12), logs: allDone(14), ctx, today: 15 }),
    ).toBeNull();
  });

  it('never lowers the target by itself, and leaves the readiness outcome as the data says', () => {
    const s = setFeedback(walk('standard'), 'too-hard', 20);
    expect(outcome(s, allDone(21), 22)).toBe('ready');
    // A habit that's keeping its target isn't stepped down because of the answer.
    expect(
      progressionOffer({ state: s, logs: logsFor(WALK, range(8, 18), [], range(19, 21)), ctx, today: 22 }),
    ).toBeNull();
    expect(levelOn(s, 40)).toEqual(levelOn(walk('standard'), 40));
    // A step-down is still suggested when the data shows struggling, as before.
    expect(progressionOffer({ state: s, logs: logsFor(WALK, [], [], range(8, 21)), ctx, today: 22 })?.kind).toBe(
      'step-down',
    );
    // Manual changes stay available.
    expect(makeHarder(s, ctx, 22)).toMatchObject({ level: { phase: 'momentum' } });
    expect(makeEasier(s, ctx, 22)).toMatchObject({ level: { intensity: 'starter' } });
  });

  it('counts only when recent and given about the current target', () => {
    const s = walk('standard');
    // Said on Day 8: still held back on Day 21 (13 days), offered again on Day 22 (14 days).
    const said = setFeedback(s, 'too-hard', 8);
    expect(saidTooHard(said, 21)).toBe(true);
    expect(saidTooHard(said, 22)).toBe(false);
    expect(progressionOffer({ state: said, logs: allDone(21), ctx, today: 22 })?.kind).toBe('step-up');
    // About a previous target: doesn't count for the current one.
    const changed: ProgressionState = {
      ...setFeedback(s, 'too-hard', 4),
      eras: [...s.eras, { intensity: 'starter', phase: 'foundation', fromDay: 5, reason: 'easier' }],
    };
    expect(saidTooHard(changed, 10)).toBe(false);
    expect(saidTooHard(setFeedback(s, 'too-easy', 20), 21)).toBe(false);
  });
});

describe('Step 4B: intensity and phase stay distinct; increases are never mandatory', () => {
  it('keeps the selected intensity through phase step-ups, and only offers', () => {
    let s = walk('starter');
    const up = progressionOffer({ state: s, logs: logsFor(WALK, range(1, 21)), ctx, today: 22 })!;
    s = acceptOffer(s, up, 22);
    expect(levelOn(s, 23)).toEqual({ intensity: 'starter', phase: 'momentum' });
    const up2 = progressionOffer({ state: s, logs: logsFor(WALK, range(1, 44)), ctx, today: 45 })!;
    expect(up2.to).toEqual({ intensity: 'starter', phase: 'mastery' });
    // Ignoring every offer leaves the target exactly where it is, to the end of the program.
    expect(levelOn(s, 66)).toEqual({ intensity: 'starter', phase: 'momentum' });
  });
});

describe('compatibility and isolation', () => {
  it('saves as plain, versioned data that survives a reload', () => {
    const s = acceptOffer(
      setFeedback(walk('standard'), 'too-easy', 20),
      progressionOffer({ state: walk('standard'), logs: logsFor(WALK, range(1, 21)), ctx, today: 22 })!,
      22,
    );
    const back = JSON.parse(JSON.stringify(s)) as ProgressionState;
    expect(back).toEqual(s);
    expect(back.v).toBe(1);
    expect(levelOn(back, 23)).toEqual({ intensity: 'standard', phase: 'momentum' });
  });

  it('reads old saved logs (no tracking details) after the existing loader', () => {
    const logs = logsFor(WALK, range(1, 21));
    const saved = { startedAt: MON, plan: [{ habitId: WALK, level: 'easy', addedOnDay: 1, levelSince: 0 }], logs };
    const back = sanitize(JSON.parse(JSON.stringify(saved))).logs as Logs;
    expect(outcome(walk(), back, 22)).toBe('ready');
  });

  it('leaves V1/V2 progression as it is: levels still rise automatically on Day 22', () => {
    const plan: PlanHabit[] = [{ habitId: 'mind_read', level: 'easy', addedOnDay: 1, levelSince: 0 }];
    const r = reconcile({ plan, appliedPhase: 1, startKey: MON, logs: {}, today: 22, yesterdayEditable: false });
    expect(r.plan[0].level).toBe('medium');
    expect(r.events).toContainEqual({ kind: 'phaseUp', phase: 2, day: 22 });
  });

  it('never changes the logs it reads', () => {
    const logs = logsFor(WALK, range(1, 21), [], []);
    const copy = JSON.stringify(logs);
    const s = walk('standard');
    const offer = progressionOffer({ state: s, logs, ctx, today: 22 })!;
    acceptOffer(s, offer, 22);
    declineOffer(s, offer, 22);
    makeHarder(s, ctx, 22);
    makeEasier(s, ctx, 22);
    expect(JSON.stringify(logs)).toBe(copy);
  });
});
