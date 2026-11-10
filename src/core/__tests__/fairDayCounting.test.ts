import { describe, expect, it, jest } from '@jest/globals';
import { MODELS, readDays, runModel } from '../../../scripts/audit/dayModels';
import { ascentDays } from '../ascent';
import { cellSummary } from '../charts';
import { dateForDay, PROGRAM_DAYS } from '../dates';
import { dayNeed, doneCount, XP_FULL_DAY_BONUS, XP_PER_HABIT } from '../progression';
import { dayCell, dayCells, records } from '../reset/charts';
import { programAbsence } from '../reset/comeback';
import { completeDaysSoFar } from '../reset/moments';
import * as P from '../reset/pilot';
import { storyFacts } from '../reset/story';
import { partialCount, PARTIAL_XP } from '../reset/tracking';
import { sanitizeJourneys } from '../../store/journeys';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

/*
 * Fairer Day Counting (docs/FAIRER_DAY_COUNTING.md, approved at 6c0913e):
 *   - a day counts when 80% of its habits, rounded down (at least one), are done; it's kept when that's met only with
 *     minimums;
 *   - the streak carries one missed day over in any seven (a grace day): it adds nothing and is never counted, kept
 *     or climbed. Two misses in a row, or two in seven days, end it. Rest days are neutral.
 * Complete days, XP, Minimum Effort, readiness and every saved record are unchanged; past and archived journeys are
 * re-scored by the same rule, only ever upwards.
 */

const START = '2026-01-05'; // a Monday
const ANSWERS: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 120,
  wake: { kind: 'time', time: '07:00' },
  activeDays: '1_2',
  skill: 'Language',
};
const SIX = ['mind_read', 'mind_meditation', 'move_walk', 'outdoor_time', 'eat_well', 'sleep_wake'];
const FOUR = SIX.slice(0, 4);
const program = (ids: string[] = FOUR) =>
  P.createPilot(
    ANSWERS,
    ids.map((habitId) => ({ habitId, intensity: 'starter' as const })),
    START,
  )!;
const done = (p: P.PilotProgram, ids: string[], day: number) =>
  ids.reduce((q, id) => P.complete(q, id, day).program, p);
const min = (p: P.PilotProgram, ids: string[], day: number) =>
  ids.reduce((q, id) => P.setMinimum(q, id, day, true, 'drafts').program, p);

/**
 * A program played from a pattern, one character a day: 'c' everything done, 'x' nothing recorded, 'p' one habit done
 * (a missed day with a record), 's' everything skipped, 'm' everything at its minimum (kept).
 */
function play(pattern: string, ids: string[] = FOUR): P.PilotProgram {
  let p = program(ids);
  [...pattern].forEach((c, i) => {
    const d = i + 1;
    if (c === 'c') p = done(p, ids, d);
    if (c === 'p') p = done(p, ids.slice(0, 1), d);
    if (c === 's') p = ids.reduce((q, id) => P.setSkipped(q, id, d, true).program, p);
    if (c === 'm') p = min(p, ids, d);
  });
  return p;
}
const streakOn = (pattern: string, today = pattern.length + 1, ids?: string[]) =>
  P.pilotStreak(play(pattern, ids), today);

describe('the day: 80% of its habits, rounded down, at least one', () => {
  it('needs 1, 1, 2, 3, 4, 4 of 1–6 habits, and never more than the earlier rule (80% rounded up)', () => {
    expect([1, 2, 3, 4, 5, 6].map(dayNeed)).toEqual([1, 1, 2, 3, 4, 4]);
    for (let n = 1; n <= 30; n++) expect(dayNeed(n)).toBeLessThanOrEqual(Math.ceil(n * 0.8 - 1e-9));
  });

  it('1–6 habits: a day counts exactly from its need; minimums can make up the rest (kept), never a full day', () => {
    for (let n = 1; n <= 6; n++) {
      const ids = SIX.slice(0, n);
      for (let k = 0; k <= n; k++) {
        const p = done(program(ids), ids.slice(0, k), 1);
        expect([n, k, P.dayResult(p, 1)]).toEqual([n, k, k >= dayNeed(n) ? 'counted' : 'missed']);
        expect(P.dayFull(p, 1)).toBe(k === n);
      }
      // One done short of the need, plus one minimum (Read Daily has one at every Starter level): kept.
      const short = done(program(ids), ids.slice(1, dayNeed(n)), 1);
      const kept = min(short, ['mind_read'], 1);
      expect([n, P.dayOutcome(short, 1), P.dayOutcome(kept, 1), P.dayFull(kept, 1)]).toEqual([
        n,
        'missed',
        'kept',
        false,
      ]);
    }
  });

  it('partial progress and skips are not done', () => {
    let p = done(program(['mind_read', 'move_walk']), [], 1);
    p = P.setPartial(p, 'mind_read', 1, true).program;
    p = P.setSkipped(p, 'move_walk', 1, true).program;
    expect(P.dayOutcome(p, 1)).toBe('missed');
    expect(P.dayOutcome(done(p, ['move_walk'], 1), 1)).toBe('counted'); // 1 of 2
  });
});

describe('the streak’s grace: one missed day in any seven', () => {
  it('carries one missed day over, adding nothing', () => {
    expect(streakOn('ccc')).toBe(3);
    expect(streakOn('cccx')).toBe(3);
    expect(streakOn('cccxc')).toBe(4);
    expect(streakOn('cccpc')).toBe(4); // a recorded miss (1 of 4) is the same
    expect(streakOn('cccsc')).toBe(4); // so is a skipped day
  });

  it('two misses in a row end it, whatever they are', () => {
    for (const two of ['xx', 'xp', 'ps', 'ss']) expect([two, streakOn(`ccc${two}c`)]).toEqual([two, 1]);
  });

  it('a rolling window: a second miss within seven days ends it; seven days after the first, it’s carried again', () => {
    // Misses on Days 3 and 9 (6 days apart): ended on Day 9.
    expect(streakOn('ccxcccccxcc')).toBe(2);
    // Misses on Days 3 and 10 (7 days apart): both carried.
    expect(streakOn('ccxccccccxcc')).toBe(10);
    // Every 7 days through 66 days: all carried; the run is the days done.
    const weekly = Array.from({ length: 66 }, (_, i) => ((i + 1) % 7 === 0 ? 'x' : 'c')).join('');
    expect(streakOn(weekly, 67)).toBe(57);
    expect(P.graceDays(play(weekly), 67)).toEqual([7, 14, 21, 28, 35, 42, 49, 56, 63]);
  });

  it('the window is the person’s: a miss that ends a run starts no grace, and the next run starts fresh', () => {
    // Day 4 carried, Day 7 ends it (3 days later); Day 9, two days into the new run, is carried.
    const p = play('cccxccxcxcc');
    expect(P.graceDays(p, 12)).toEqual([4, 9]);
    expect(P.pilotStreak(p, 12)).toBe(3);
  });

  it('grace days never add up to a streak: every-other-day effort, and misses every few days', () => {
    expect(P.journeyStats(play('cx'.repeat(33)), 67).best).toBe(2);
    expect(P.journeyStats(play('cccx'.repeat(16)), 67).best).toBe(6);
    expect(P.journeyStats(play('xc'.repeat(33)), 67).best).toBe(2);
    // Before a run begins there's nothing to carry: a first-day miss uses no grace.
    expect(P.graceDays(play('xcc'), 4)).toEqual([]);
  });

  it('rest days are neutral: they neither break a run nor separate two misses', () => {
    // Read Daily daily; Skill Practice weekly (rest unless done). Days 3–5 have only the weekly habit: rest.
    let p = program(['mind_read', 'skill_practice']);
    p = done(p, ['mind_read'], 1);
    p = done(p, ['mind_read'], 2);
    p = P.removeHabit(p, 'mind_read', 2)!;
    p = P.addHabit(p, {}, { habitId: 'mind_read', intensity: 'starter' }, 6)!;
    expect([3, 4, 5].map((d) => P.dayOutcome(p, d))).toEqual(['rest', 'rest', 'rest']);
    expect(P.pilotStreak(p, 6)).toBe(2);
    expect(P.pilotStreak(p, 7)).toBe(2); // Day 6 missed: carried
    expect(P.pilotStreak(p, 8)).toBe(0); // Day 7 too: two in a row
  });

  it('an unfinished today is never a miss, and never uses the grace', () => {
    const p = play('cccx');
    expect(P.pilotStreak(p, 4)).toBe(3);
    expect(P.graceDays(p, 4)).toEqual([]);
    expect(P.graceDays(p, 5)).toEqual([4]);
  });

  it('an absence of two days or more always ends it, and the welcome back follows', () => {
    const p = play('cccccxxc');
    expect(P.pilotStreak(p, 9)).toBe(1);
    expect(programAbsence(p, 8)).toBe(6);
    const one = play('cccccxc');
    expect([P.pilotStreak(one, 8), programAbsence(one, 7)]).toEqual([6, null]);
  });

  it('minimums keep days, and a day with too few is a miss like any other', () => {
    let p = play('ccmm');
    expect(P.journeyStats(p, 5)).toEqual({ done: 2, kept: 2, streak: 4, best: 4 });
    p = min(done(p, ['mind_read'], 5), ['move_walk'], 5); // 1 done + 1 minimum of 4: missed
    expect([P.dayOutcome(p, 5), P.pilotStreak(p, 6), P.graceDays(p, 6)]).toEqual(['missed', 4, [5]]);
    p = min(p, FOUR, 6);
    expect(P.journeyStats(p, 7)).toEqual({ done: 2, kept: 3, streak: 5, best: 5 });
  });
});

describe('a grace day is never counted, kept or climbed', () => {
  const p = play('ccccpcc');
  const today = 8;

  it('the Journey: its numbers, the calendar cell, the mountain and its words', () => {
    expect(P.journeyStats(p, today)).toEqual({ done: 6, kept: 0, streak: 6, best: 6 });
    const cell = dayCell(p, 5, today);
    expect(cell).toMatchObject({ state: 'partial', grace: true });
    expect(cell).not.toHaveProperty('kept');
    expect(cellSummary(cell, (id) => P.nameOf(p, id))).toBe(
      '1 of 4 done: Read Daily. It didn’t count, but your streak carried on: one missed day a week won’t break it.',
    );
    expect(
      dayCells(p, today)
        .filter((c) => c.grace)
        .map((c) => c.day),
    ).toEqual([5]);
    const counted = (d: number) => P.dayResult(p, d) === 'counted';
    const kept = (d: number) => d < today && P.dayOutcome(p, d) === 'kept';
    const days = ascentDays(p.logs, p.startedAt, today, undefined, kept, counted);
    expect(days[4].status).toBe('missed');
    expect(days.filter((d) => d.status === 'done').length).toBe(P.journeyStats(p, today).done);
  });

  it('Insights and the welcome back: still a missed day; complete days and XP unchanged', () => {
    expect(P.recentDays80(p, today)).toEqual({ counted: 6, kept: 0, judged: 7, from: 1 });
    expect(completeDaysSoFar(p, today)).toBe(6);
    expect(P.pilotXp(p)).toBe(6 * (4 * XP_PER_HABIT + XP_FULL_DAY_BONUS) + XP_PER_HABIT);
  });
});

describe('the Story, the summit, a New Ascent and after Day 66', () => {
  const weeklyMiss = (d: number) => d % 7 === 6; // the audit's User B pattern
  const full = () => {
    let p = program(['mind_read', 'move_walk']);
    for (let d = 1; d <= PROGRAM_DAYS; d++) if (!weeklyMiss(d)) p = done(p, ['mind_read', 'move_walk'], d);
    return p;
  };

  it('Story and summit: the longest streak carries the weekly misses; days completed stay complete days', () => {
    const p = full();
    const facts = storyFacts(p, PROGRAM_DAYS + 1);
    expect(facts.longestStreak).toBe(P.journeyStats(p, PROGRAM_DAYS).best);
    expect(facts.longestStreak).toBe(57);
    expect(facts.daysCompleted).toBe(57);
    expect(records(p, PROGRAM_DAYS + 1).bestStreak).toBe(57);
  });

  it('a New Ascent carries the streak; its first missed day is carried, the second ends it', () => {
    const prev = { ...full(), ceremonies: { day1: true, summit: true } };
    expect(P.carriedStreak(prev, 67)).toBe(57);
    const next = P.beginAscent(prev, ANSWERS, P.ascentDefaults(prev, 67).choices, [], dateForDay(START, 67), 67, 7)!;
    expect(P.pilotStreak(next, 2)).toBe(57);
    expect(P.pilotStreak(next, 3)).toBe(0);
  });

  it('Keep My Momentum: the same rule after Day 66', () => {
    let p = P.keepMomentum(full(), 67);
    for (let d = 67; d <= 90; d++) if (d !== 70 && d !== 84 && d !== 85) p = done(p, ['mind_read', 'move_walk'], d);
    const s = P.sinceSummit(p, 91);
    // Day 70 carried (67–83 is a run of 16); Days 84 and 85 end it; 86–90 is 5.
    expect([s.counted, s.judged, s.best]).toEqual([21, 24, 16]);
    expect(P.sinceSummitStrip(p, 91)[3]).toBe('missed'); // Day 70: still shown as missed
    expect(P.pilotStreak(p, 91)).toBe(5);
  });
});

describe('existing and archived journeys: re-scored, never lowered, nothing stored changed', () => {
  /** Programs as people have them: misses, skips, partial progress, a removal, minimums, after the summit. */
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
      if (d % 7 !== 3) b = done(b, d % 2 ? ['mind_read'] : ['mind_read', 'skill_practice', 'move_walk'], d);
    b = P.removeHabit(b, 'move_walk', 40)!;
    let c = P.keepMomentum(b, 67);
    for (let d = 67; d <= 80; d++) if (d % 4) c = done(c, ['mind_read'], d);
    let m = program();
    for (let d = 1; d <= 20; d++)
      m = d % 5 === 0 ? min(done(m, FOUR.slice(0, 1), d), FOUR.slice(1, 3), d) : done(m, FOUR.slice(0, d % 4), d);
    return [
      { p: a, until: 33 },
      { p: b, until: 66 },
      { p: c, until: 82 },
      { p: m, until: 21 },
    ];
  }
  const before = MODELS.find((m) => m.key === 'current')!; // 80% rounded up, no grace (the rule until now)
  const now = MODELS.find((m) => m.key === 'recommended')!;

  it('the engine is the approved model, day for day (scripts/audit/dayModels.ts)', () => {
    for (const { p, until } of saves()) {
      const r = runModel(readDays(p, until), now, until);
      expect(Array.from({ length: until }, (_, i) => P.dayOutcome(p, i + 1))).toEqual(r.outcomes);
      if (until <= PROGRAM_DAYS) {
        const j = P.journeyStats(p, until);
        expect([j.done, j.kept, j.best, j.streak]).toEqual([r.counted, r.kept, r.best, r.streak]);
      }
    }
  });

  it('no counted day, kept day, best or current streak is lower than under the rule until now', () => {
    for (const { p, until } of saves()) {
      const days = readDays(p, Math.min(until, PROGRAM_DAYS));
      const old = runModel(days, before, Math.min(until, PROGRAM_DAYS));
      const j = P.journeyStats(p, until);
      expect(j.done).toBeGreaterThanOrEqual(old.counted);
      expect(j.done + j.kept).toBeGreaterThanOrEqual(old.counted + old.kept);
      expect(j.best).toBeGreaterThanOrEqual(old.best);
      if (until <= PROGRAM_DAYS) expect(j.streak).toBeGreaterThanOrEqual(old.streak);
    }
  });

  it('XP, complete days, tallies and saved records are exactly as before', () => {
    for (const { p, until } of saves()) {
      const legacyXp = Object.values(p.logs).reduce(
        (n, l) =>
          n +
          doneCount(l) * XP_PER_HABIT +
          (partialCount(l) +
            P.minimumsOn(p, l.day).filter((id) => !l.completed.includes(id) && !P.trackOf(p, id, l.day).progress)
              .length) *
            PARTIAL_XP +
          (P.dayFull(p, l.day) ? XP_FULL_DAY_BONUS : 0),
        0,
      );
      expect(P.pilotXp(p)).toBe(legacyXp);
      const fullDays = Array.from({ length: Math.min(until, PROGRAM_DAYS) }, (_, i) => i + 1).filter((d) =>
        P.dayFull(p, d),
      );
      expect(dayCells(p, until).filter((c) => c.state === 'full').length).toBe(fullDays.length);
      // Every number is derived: a save and a load (and the reload's sanitising) give the same ones.
      const loaded = P.sanitizePilotProgram(JSON.parse(JSON.stringify(p)))!;
      expect(loaded.logs).toEqual(p.logs);
      expect(P.journeyStats(loaded, until)).toEqual(P.journeyStats(p, until));
      expect(P.overallTally(loaded, until)).toEqual(P.overallTally(p, until));
    }
  });

  it('an archived journey is re-scored by the same rule when it’s read back', () => {
    const { p } = saves()[1];
    const stored = JSON.parse(
      JSON.stringify([{ v: 1, id: 'ascent-1-2026-01-05', archivedAt: '2026-03-12T08:00:00.000Z', program: p }]),
    );
    const archived = sanitizeJourneys(stored)![0].program;
    expect(P.journeyStats(archived, PROGRAM_DAYS)).toEqual(P.journeyStats(p, PROGRAM_DAYS));
    const old = runModel(readDays(p), before, PROGRAM_DAYS);
    expect(P.journeyStats(archived, PROGRAM_DAYS).best).toBeGreaterThan(old.best);
    expect(storyFacts(archived, PROGRAM_DAYS).longestStreak).toBe(P.journeyStats(archived, PROGRAM_DAYS).best);
  });
});
