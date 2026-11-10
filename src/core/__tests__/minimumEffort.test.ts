import { describe, expect, it } from '@jest/globals';
import { dateForDay } from '../dates';
import { doneCount, XP_FULL_DAY_BONUS, XP_PER_HABIT } from '../progression';
import { dayCell, dayCells, weeklyTrend } from '../reset/charts';
import { programAbsence } from '../reset/comeback';
import { INTENSITIES, PHASES, RESET_HABITS } from '../reset/habits';
import { MINIMUMS, minimumAvailable } from '../reset/minimum';
import { activeOn } from '../reset/moments';
import * as P from '../reset/pilot';
import { readiness } from '../reset/readiness';
import { dayStatus, partialCount, PARTIAL_XP, readTrack, type HabitTrack } from '../reset/tracking';

/*
 * Minimum Effort, engine phase R2a (docs/MINIMUM_EFFORT_SPEC.md, approved at ea0c86c). A minimum is a one-day
 * fallback: 5 XP, it counts toward consistency (the streak, a kept day under the existing 80% rule, full and minimum
 * actions together), never toward a full completion, a full day's bonus or step-up readiness. The six minimums were
 * approved with the content package (d7652fc); the app offers them only where flags.minimumEffort() allows (the
 * store's tests cover that). Tests pass 'drafts' as before, which allows exactly the approved ones now.
 */

const START = '2026-01-05'; // a Monday
const ANSWERS: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 90,
  wake: { kind: 'time', time: '07:00' },
  activeDays: '1_2',
  skill: 'Language',
};
const FOUR = ['mind_read', 'mind_meditation', 'move_walk', 'outdoor_time'];
const program = (ids: string[] = FOUR, intensity: 'starter' | 'standard' = 'starter') =>
  P.createPilot(
    ANSWERS,
    ids.map((habitId) => ({ habitId, intensity })),
    START,
  )!;

const done = (p: P.PilotProgram, ids: string[], day: number) =>
  ids.reduce((q, id) => P.complete(q, id, day).program, p);
const min = (p: P.PilotProgram, ids: string[], day: number, on = true) =>
  ids.reduce((q, id) => P.setMinimum(q, id, day, on, 'drafts').program, p);
/** A day's record edited directly, as an edited or damaged backup could hold it. */
function forge(p: P.PilotProgram, id: string, day: number, track: Partial<HabitTrack>): P.PilotProgram {
  const key = dateForDay(p.startedAt, day);
  const log = p.logs[key] ?? { day, date: key, completed: [], planned: P.plannedOn(p, day, []) };
  return { ...p, logs: { ...p.logs, [key]: { ...log, track: { ...log.track, [id]: { v: 1, ...track } } } } };
}
/** A fresh copy through a save and a load, so nothing cached is reused. */
const reload = (p: P.PilotProgram) => P.sanitizePilotProgram(JSON.parse(JSON.stringify(p)))!;

describe('the review gate: the six approved minimums, and nothing else', () => {
  it('the app’s review allows exactly what the drafts did: the six approved minimums, no draft left', () => {
    for (const h of RESET_HABITS)
      for (const intensity of INTENSITIES)
        for (const phase of PHASES)
          expect(minimumAvailable(h.id, { intensity, phase })).toBe(
            minimumAvailable(h.id, { intensity, phase }, 'drafts'),
          );
    expect(
      Object.entries(MINIMUMS)
        .filter(([, m]) => m.status === 'approved')
        .map(([id]) => id)
        .sort(),
    ).toEqual(['eat_well', 'mind_meditation', 'mind_read', 'move_walk', 'outdoor_time', 'social_reach_out']);
    expect(Object.values(MINIMUMS).some((m) => m.status === 'draft')).toBe(false);
    const p = program();
    for (const id of FOUR) {
      expect(P.minimumFor(p, id, 1)).toBe(true);
      expect(P.minimumOn(P.setMinimum(p, id, 1, true).program, id, 1)).toBe(true);
    }
  });

  it('drafts: only where the day’s target asks strictly more; Sleep disabled; Less Scrolling, Strength and the weekly habits have none', () => {
    const available: string[] = [];
    for (const h of RESET_HABITS)
      for (const intensity of INTENSITIES)
        for (const phase of PHASES)
          if (minimumAvailable(h.id, { intensity, phase }, 'drafts')) available.push(`${h.id}:${intensity}:${phase}`);
    const all = (id: string) => INTENSITIES.flatMap((i) => PHASES.map((ph) => `${id}:${i}:${ph}`));
    expect(available.sort()).toEqual(
      [
        ...all('mind_read'),
        ...all('mind_meditation'),
        ...all('move_walk'),
        ...all('outdoor_time'),
        ...all('eat_well').filter((x) => !x.includes(':starter:')),
        // Daily levels asking for two people or a call (not "1 person a day", not the weekly Starter levels).
        'social_reach_out:standard:momentum',
        'social_reach_out:standard:mastery',
        'social_reach_out:challenge:foundation',
        'social_reach_out:challenge:momentum',
        'social_reach_out:challenge:mastery',
      ].sort(),
    );
    expect(MINIMUMS.sleep_wake.status).toBe('disabled');
    for (const id of ['screen_app_limit', 'strength_log', 'focus_top3', 'skill_practice'])
      expect(MINIMUMS[id]).toBeUndefined();
  });
});

describe('recording a minimum: only where it’s allowed', () => {
  it('not for the person’s own habits, not on a weekly habit, not once done, not outside the program', () => {
    let p = program(['mind_read', 'skill_practice']);
    const own = P.addCustomHabit(p, { name: 'Stretch', perWeek: 7 }, 1, 0)!;
    p = own.program;
    expect(P.minimumFor(p, own.id, 1, 'drafts')).toBe(false);
    expect(P.minimumFor(p, 'skill_practice', 1, 'drafts')).toBe(false);
    expect(P.minimumFor(p, 'mind_read', 1, 'drafts')).toBe(true);
    expect(P.minimumFor(done(p, ['mind_read'], 1), 'mind_read', 1, 'drafts')).toBe(false);
    expect(P.minimumFor(p, 'mind_read', 0, 'drafts')).toBe(false);
    const removed = P.removeHabit(p, 'mind_read', 3)!;
    expect(P.minimumFor(removed, 'mind_read', 4, 'drafts')).toBe(false);
  });

  it('not while waiting for the choice after the summit, nor in a program paused for age', () => {
    const p = program();
    expect(P.minimumFor(p, 'mind_read', 67, 'drafts')).toBe(false);
    expect(P.minimumFor({ ...p, answers: { ...ANSWERS, age: '16_17' } }, 'mind_read', 1, 'drafts')).toBe(false);
    // With Keep My Momentum, tracking runs on.
    expect(P.minimumFor(P.keepMomentum(p, 67), 'mind_read', 70, 'drafts')).toBe(true);
  });

  it('Eat Well only above Starter; Stay Connected never at one person a day', () => {
    expect(P.minimumFor(program(['eat_well']), 'eat_well', 1, 'drafts')).toBe(false);
    expect(P.minimumFor(program(['eat_well'], 'standard'), 'eat_well', 1, 'drafts')).toBe(true);
    expect(P.minimumFor(program(['social_reach_out'], 'standard'), 'social_reach_out', 1, 'drafts')).toBe(false);
  });
});

describe('XP: 5 for a minimum, 10 for a full completion, never both', () => {
  it('records, upgrades, undoes and removes, with the XP exact at every step', () => {
    let p = min(program(), ['mind_read'], 1);
    expect(P.pilotXp(p)).toBe(PARTIAL_XP);
    // Twice changes nothing.
    expect(P.setMinimum(p, 'mind_read', 1, true, 'drafts').program).toBe(p);
    // Partial progress as well: still 5 for that habit.
    p = P.setPartial(p, 'mind_read', 1, true).program;
    expect(P.trackOf(p, 'mind_read', 1)).toMatchObject({ minimum: true, progress: {} });
    expect(P.pilotXp(p)).toBe(5);
    // The full completion: 10, never 15; the minimum stays underneath.
    const up = P.complete(p, 'mind_read', 1);
    expect(up.event).toEqual({ kind: 'completed', first: true });
    expect(P.pilotXp(up.program)).toBe(XP_PER_HABIT);
    expect(P.trackOf(up.program, 'mind_read', 1).minimum).toBe(true);
    expect(P.minimumOn(up.program, 'mind_read', 1)).toBe(false);
    // Undoing that completion goes back to the minimum.
    p = P.undo(up.program, 'mind_read', 1).program;
    expect(P.minimumOn(p, 'mind_read', 1)).toBe(true);
    expect(P.pilotXp(p)).toBe(5);
    // Removing the minimum leaves the partial progress (5), then nothing.
    p = min(p, ['mind_read'], 1, false);
    expect(P.trackOf(p, 'mind_read', 1).minimum).toBeUndefined();
    expect(P.pilotXp(p)).toBe(5);
    p = P.setPartial(p, 'mind_read', 1, false).program;
    expect(P.pilotXp(p)).toBe(0);
    // Removing one that isn't there changes nothing.
    expect(P.setMinimum(p, 'mind_read', 1, false).program).toBe(p);
  });

  it('a recorded minimum is never a completion and never brings the full day’s bonus', () => {
    const p = min(done(program(), FOUR.slice(0, 3), 2), ['outdoor_time'], 2);
    expect(P.isDone(p, 'outdoor_time', 2)).toBe(false);
    expect(P.dayFull(p, 2)).toBe(false);
    expect(P.pilotXp(p)).toBe(3 * XP_PER_HABIT + PARTIAL_XP);
    expect(P.totalCompleted(p)).toBe(3);
    const full = done(p, ['outdoor_time'], 2);
    expect(P.pilotXp(full)).toBe(4 * XP_PER_HABIT + XP_FULL_DAY_BONUS);
  });
});

describe('a day’s outcome: the existing 80% rule over full and minimum actions together', () => {
  it('four habits', () => {
    let p = program();
    p = min(done(p, FOUR.slice(0, 3), 1), ['outdoor_time'], 1); // 3 + 1
    p = min(done(p, FOUR.slice(0, 2), 2), FOUR.slice(2), 2); // 2 + 2
    p = min(done(p, FOUR.slice(0, 2), 3), ['move_walk'], 3); // 2 + 1 of 4
    p = min(p, FOUR, 4); // 4 minimums
    p = done(p, FOUR, 5); // full
    expect([1, 2, 3, 4, 5].map((d) => P.dayResult(p, d))).toEqual(['missed', 'missed', 'missed', 'missed', 'counted']);
    expect([1, 2, 3, 4, 5].map((d) => P.dayOutcome(p, d))).toEqual(['kept', 'kept', 'missed', 'kept', 'counted']);
    // Completed days count full completions only; the streak counts kept days too.
    expect(P.journeyStats(p, 6)).toEqual({ done: 1, kept: 3, streak: 2, best: 2 });
    expect(P.pilotStreak(p, 5)).toBe(2);
    expect(P.recentDays80(p, 6)).toEqual({ counted: 1, kept: 3, judged: 5, from: 1 });
  });

  it('five habits: one miss is still allowed, and a minimum can fill it', () => {
    const five = [...FOUR, 'eat_well'];
    let p = program(five);
    p = done(p, five.slice(0, 4), 1); // 4 of 5: counted already
    p = min(done(p, five.slice(0, 3), 2), ['outdoor_time'], 2); // 3 done + 1 minimum: 4 of 5
    p = done(p, five.slice(0, 3), 3); // 3 of 5
    expect([1, 2, 3].map((d) => P.dayOutcome(p, d))).toEqual(['counted', 'kept', 'missed']);
  });

  it('rest days stay neutral, an unrecorded day breaks the streak, and an unfinished today never does', () => {
    let p = program(['mind_read', 'skill_practice']);
    p = min(p, ['mind_read'], 1);
    p = min(p, ['mind_read'], 2);
    p = P.removeHabit(p, 'mind_read', 3)!; // Days 3–5: only a weekly habit, so rest days
    p = P.addHabit(p, {}, { habitId: 'mind_read', intensity: 'starter' }, 6)!;
    p = min(p, ['mind_read'], 6);
    expect([1, 2, 3, 4, 5, 6].map((d) => P.dayOutcome(p, d))).toEqual(['kept', 'kept', 'rest', 'rest', 'rest', 'kept']);
    expect(P.pilotStreak(p, 6)).toBe(3);
    expect(P.pilotStreak(p, 7)).toBe(3); // today, unfinished
    expect(P.dayOutcome(p, 7)).toBe('missed'); // unrecorded (unknown): never kept
    expect(P.pilotStreak(p, 8)).toBe(0);
  });

  it('skips: a skip replaces a minimum, a minimum clears a skip, and a skipped habit is never kept', () => {
    let p = min(program(['mind_read']), ['mind_read'], 1);
    p = P.setSkipped(p, 'mind_read', 1, true).program;
    expect(readTrack(p.logs[START], 'mind_read')).toMatchObject({ skipped: true });
    expect(P.trackOf(p, 'mind_read', 1).minimum).toBeUndefined();
    expect(P.dayOutcome(p, 1)).toBe('missed');
    p = min(p, ['mind_read'], 1);
    expect(P.trackOf(p, 'mind_read', 1).skipped).toBeUndefined();
    expect(P.dayOutcome(p, 1)).toBe('kept');
    // A record holding both (an edited backup): the skip wins, nothing is counted twice.
    const both = forge(program(['mind_read']), 'mind_read', 1, { skipped: true, minimum: true });
    expect(P.minimumOn(both, 'mind_read', 1)).toBe(false);
    expect([P.dayOutcome(both, 1), P.pilotXp(both)]).toEqual(['missed', 0]);
  });

  it('a habit stopped today after its minimum leaves from tomorrow, so today stays kept', () => {
    const p = min(program(['mind_read', 'move_walk']), ['mind_read', 'move_walk'], 4);
    const q = P.removeHabit(p, 'mind_read', 4)!;
    expect(q.progression.mind_read.gaps).toEqual([{ from: 5 }]);
    expect([P.dayOutcome(q, 4), P.pilotXp(q)]).toEqual(['kept', 10]);
  });
});

describe('weekly habits', () => {
  it('never take a minimum; one forged on a weekly day is ignored everywhere', () => {
    const p = done(program(['mind_read', 'skill_practice']), ['mind_read'], 1);
    expect(P.setMinimum(p, 'skill_practice', 1, true, 'drafts').program).toBe(p);
    const forged = forge(p, 'skill_practice', 1, { minimum: true });
    expect(P.minimumOn(forged, 'skill_practice', 1)).toBe(false);
    expect(P.pilotXp(forged)).toBe(P.pilotXp(p));
    expect(P.dayOutcome(forged, 1)).toBe(P.dayOutcome(p, 1));
    expect(P.habitTally(forged, 'skill_practice', 9)).toEqual(P.habitTally(p, 'skill_practice', 9));
    expect(P.weekProgress(forged, 'skill_practice', 3)).toEqual(P.weekProgress(p, 'skill_practice', 3));
  });

  it('a weekly habit done that day helps it, as always, alongside a daily minimum', () => {
    const p = min(done(program(['mind_read', 'skill_practice']), ['skill_practice'], 1), ['mind_read'], 1);
    expect(P.plannedOn(p, 1, ['skill_practice'])).toEqual(['mind_read', 'skill_practice']);
    expect(P.dayOutcome(p, 1)).toBe('kept');
    // Its week: credited by its completion only.
    expect(P.weekProgress(p, 'skill_practice', 1)?.credited).toBe(1);
  });
});

describe('readiness: a minimum is recorded, not done', () => {
  const standard = () => program(['mind_read'], 'standard');
  const r = (p: P.PilotProgram, today: number) =>
    readiness({ state: p.progression.mind_read, logs: p.logs, ctx: P.ctxOf(p), today });

  it('never speeds up a step-up', () => {
    let p = standard();
    for (let d = 1; d <= 11; d++) p = done(p, ['mind_read'], d);
    for (let d = 12; d <= 14; d++) p = min(p, ['mind_read'], d);
    const out = r(p, 15);
    expect(out.counts).toEqual({ done: 11, skipped: 0, minimum: 3, missed: 0, unknown: 0 });
    expect(out.outcome).toBe('maintain'); // 11 of 14: had the minimums been done, it would be ready
    expect(dayStatus(p.logs, START, 12, 'mind_read')).toBe('minimum');
  });

  it('days on the minimum are recorded: mostly minimums can still lead to the existing easier offer', () => {
    let p = standard();
    for (let d = 1; d <= 14; d++) p = min(p, ['mind_read'], d);
    expect(r(p, 15).outcome).toBe('struggling');
  });
});

describe('Insights: consistency counts minimums, full completions are kept apart', () => {
  it('a habit’s tally, its consistency and its full share', () => {
    let p = done(program(), ['mind_read'], 1);
    p = min(p, ['mind_read'], 2);
    expect(P.habitTally(p, 'mind_read', 4)).toEqual({ done: 1, eligible: 3, minimum: 1 });
    expect(P.consistency(P.habitTally(p, 'mind_read', 4))).toBeCloseTo(2 / 3);
    expect(P.fullShare(P.habitTally(p, 'mind_read', 4))).toBeCloseTo(1 / 3);
    // Like a completion, a minimum makes today an opportunity.
    p = min(p, ['mind_read'], 4);
    expect(P.habitTally(p, 'mind_read', 4)).toEqual({ done: 1, eligible: 4, minimum: 2 });
    // A habit without minimums: its tally is exactly what it always was.
    expect(P.habitTally(p, 'move_walk', 4)).toEqual({ done: 0, eligible: 3 });
    // The weekly trend adds up the same opportunities as the overall consistency.
    const overall = P.overallTally(p, 4);
    expect(weeklyTrend(p, 4)[0].share).toBeCloseTo(P.consistency(overall)!);
  });
});

describe('the Journey and the words: a minimum is activity', () => {
  it('a minimum-only day is a partial day with its minimums, and it ends an absence', () => {
    const p = min(done(program(), FOUR, 1), ['mind_read'], 4);
    expect(dayCell(p, 4, 5)).toMatchObject({ state: 'partial', done: [], minimum: ['mind_read'] });
    expect(dayCell(p, 1, 5)).not.toHaveProperty('minimum');
    expect(activeOn(p, 4)).toBe(true);
    expect(programAbsence(p, 5)).toBeNull();
    // Without it, Days 2–4 were an absence.
    expect(programAbsence(done(program(), FOUR, 1), 5)).toBe(2);
  });
});

describe('records stay as they were recorded', () => {
  it('a kept day stays kept when the habit later has no minimum', () => {
    let p = program(['eat_well', 'mind_read'], 'standard');
    p = min(p, ['eat_well', 'mind_read'], 3);
    // Stopped, then added again at Starter: no minimum there now.
    p = P.removeHabit(p, 'eat_well', 4)!;
    p = P.addHabit(p, {}, { habitId: 'eat_well', intensity: 'starter' }, 5)!;
    expect(P.minimumFor(p, 'eat_well', 5, 'drafts')).toBe(false);
    expect([P.dayOutcome(p, 3), P.pilotXp(p)]).toEqual(['kept', 10]);
  });

  it('a minimum the catalogue never offered is ignored (Sleep was never offered: an edited backup can’t add one)', () => {
    const p = forge(program(['sleep_wake']), 'sleep_wake', 1, { minimum: true });
    expect(P.minimumFor(p, 'sleep_wake', 1, 'drafts')).toBe(false);
    expect([P.dayOutcome(p, 1), P.pilotXp(p), P.minimumsOn(p, 1)]).toEqual(['missed', 0, []]);
    // The raw record is kept as it is.
    expect(P.trackOf(reload(p), 'sleep_wake', 1).minimum).toBe(true);
  });

  it('survives a save and a load; a malformed minimum is dropped', () => {
    const p = min(done(program(), ['mind_read'], 1), ['move_walk'], 1);
    expect(reload(p)).toEqual(p);
    expect(P.pilotXp(reload(p))).toBe(P.pilotXp(p));
    const bad = forge(program(), 'mind_read', 1, { minimum: 'yes' as unknown as true });
    expect(P.trackOf(reload(bad), 'mind_read', 1).minimum).toBeUndefined();
    expect([P.dayOutcome(reload(bad), 1), P.pilotXp(reload(bad))]).toEqual(['missed', 0]);
  });
});

describe('after the summit and into a New Ascent', () => {
  it('a 66-day climb kept entirely with minimums: a streak of 66, no completed day, the summit as for everyone', () => {
    let p = program(['mind_read']);
    for (let d = 1; d <= 66; d++) p = min(p, ['mind_read'], d);
    expect(P.journeyStats(p, 66)).toEqual({ done: 0, kept: 66, streak: 66, best: 66 });
    expect(P.pilotXp(p)).toBe(66 * PARTIAL_XP);
    expect(P.summitReached(p, 66)).toBe(P.summitReached(program(['mind_read']), 66));
    expect(P.dayOutcome(p, 67)).toBe('rest'); // waiting for the choice
    expect(P.carriedStreak(p, 67)).toBe(66);
  });

  it('Keep My Momentum: kept days are reported beside counted ones', () => {
    let p = P.keepMomentum(done(program(['mind_read']), ['mind_read'], 66), 67);
    p = done(p, ['mind_read'], 67);
    p = min(p, ['mind_read'], 68);
    expect(P.sinceSummit(p, 69)).toMatchObject({ counted: 1, kept: 1, judged: 2, best: 2 });
    expect(P.pilotStreak(p, 68)).toBe(3);
  });
});

describe('rapid actions', () => {
  it('any sequence of taps leaves XP exact, idempotent and never above 10 for a habit’s day', () => {
    let seed = 7;
    const rnd = (n: number) => (((seed = (seed * 1103515245 + 12345) % 2 ** 31) % n) + n) % n;
    let p = program();
    const ops = [
      (q: P.PilotProgram, id: string, d: number) => P.setMinimum(q, id, d, true, 'drafts').program,
      (q: P.PilotProgram, id: string, d: number) => P.setMinimum(q, id, d, false, 'drafts').program,
      (q: P.PilotProgram, id: string, d: number) => P.complete(q, id, d).program,
      (q: P.PilotProgram, id: string, d: number) => P.undo(q, id, d).program,
      (q: P.PilotProgram, id: string, d: number) => P.setSkipped(q, id, d, true).program,
      (q: P.PilotProgram, id: string, d: number) => P.setSkipped(q, id, d, false).program,
      (q: P.PilotProgram, id: string, d: number) => P.setPartial(q, id, d, true).program,
      (q: P.PilotProgram, id: string, d: number) => P.setPartial(q, id, d, false).program,
    ];
    for (let i = 0; i < 400; i++) {
      const op = ops[rnd(ops.length)];
      const id = FOUR[rnd(4)];
      const d = 1 + rnd(3);
      p = op(p, id, d);
      // The same tap again: recording is idempotent, XP never doubles.
      if (op === ops[0] || op === ops[2]) expect(P.pilotXp(op(p, id, d))).toBe(P.pilotXp(p));
      for (const day of [1, 2, 3])
        for (const h of FOUR) {
          const t = P.trackOf(p, h, day);
          expect(t.skipped && t.minimum).toBeFalsy();
        }
    }
    // Recomputed from scratch (a save and a load), everything agrees.
    const fresh = reload(p);
    expect(P.pilotXp(fresh)).toBe(P.pilotXp(p));
    expect(P.journeyStats(fresh, 4)).toEqual(P.journeyStats(p, 4));
    // And XP is exactly the rule: at most 10 per habit and day, 5 for a minimum or partial, +20 for a full day.
    let expected = 0;
    for (const day of [1, 2, 3]) {
      for (const h of FOUR)
        expected += P.isDone(p, h, day)
          ? XP_PER_HABIT
          : P.minimumOn(p, h, day) || P.trackOf(p, h, day).progress
            ? PARTIAL_XP
            : 0;
      if (P.dayFull(p, day)) expected += XP_FULL_DAY_BONUS;
    }
    expect(P.pilotXp(p)).toBe(expected);
  });
});

describe('saves without minimums: every result exactly as before', () => {
  /** Programs as people have them: misses, skips, partial progress, weekly habits, a removal, after the summit. */
  function saves(): { p: P.PilotProgram; until: number }[] {
    let a = program();
    for (let d = 1; d <= 30; d++)
      a = done(
        a,
        FOUR.filter((_, i) => (d + i) % 3 !== 0),
        d,
      );
    a = P.setSkipped(a, 'mind_read', 31, true).program;
    a = P.setPartial(a, 'move_walk', 31, true).program;
    let b = program(['mind_read', 'skill_practice', 'move_walk']);
    for (let d = 1; d <= 66; d++)
      if (d % 7 !== 3)
        b = done(b, d % 2 ? ['mind_read', 'move_walk'] : ['mind_read', 'skill_practice', 'move_walk'], d);
    b = P.removeHabit(b, 'move_walk', 40)!;
    let c = P.keepMomentum(b, 67);
    for (let d = 67; d <= 80; d++) if (d % 4) c = done(c, ['mind_read'], d);
    return [
      { p: a, until: 33 },
      { p: b, until: 66 },
      { p: c, until: 82 },
    ];
  }
  /** The streak as the engine counted it before minimums existed. */
  const legacyStreak = (p: P.PilotProgram, today: number) => {
    let s = 0;
    for (let d = today; d >= 1; d--) {
      const r = P.dayResult(p, d);
      if (r === 'rest') continue;
      if (r === 'counted') s++;
      else if (d !== today) return s;
    }
    return s + (p.carry?.streak ?? 0);
  };

  it('outcomes, streaks, XP, tallies and Journey cells', () => {
    for (const { p, until } of saves()) {
      const legacyXp = Object.values(p.logs).reduce(
        (n, l) =>
          n +
          doneCount(l) * XP_PER_HABIT +
          partialCount(l) * PARTIAL_XP +
          (P.dayFull(p, l.day) ? XP_FULL_DAY_BONUS : 0),
        0,
      );
      expect(P.pilotXp(p)).toBe(legacyXp);
      for (let d = 1; d <= until; d++) {
        expect(P.dayOutcome(p, d)).toBe(P.dayResult(p, d));
        expect(P.pilotStreak(p, d)).toBe(legacyStreak(p, d));
        expect(P.minimumsOn(p, d)).toEqual([]);
      }
      expect(P.journeyStats(p, until).kept).toBe(0);
      for (const id of P.allHabits(p)) {
        const t = P.habitTally(p, id, until);
        expect(t).not.toHaveProperty('minimum');
        expect(P.consistency(t)).toBe(P.fullShare(t));
      }
      for (const cell of dayCells(p, Math.min(until, 66))) expect(cell).not.toHaveProperty('minimum');
    }
  });
});
