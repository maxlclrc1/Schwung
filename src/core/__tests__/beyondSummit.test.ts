import { describe, expect, it } from '@jest/globals';
import { dateForDay, PROGRAM_DAYS } from '../dates';
import { DEFAULT_REMINDERS, planReminders } from '../reminders';
import * as P from '../reset/pilot';

const START = '2026-01-05'; // a Monday
const answers: P.PilotAnswers = { age: '30_49', precautions: [], minutesPerDay: 120, skill: 'Instrument' };
const fresh = () =>
  P.createPilot(
    answers,
    [
      { habitId: 'mind_read', intensity: 'starter' },
      { habitId: 'skill_practice', intensity: 'starter' },
    ],
    START,
  )!;

/** Every daily habit done each day from `from` to `to` (weekly habits on Mondays). */
function climb(p: P.PilotProgram, from: number, to: number): P.PilotProgram {
  let q = p;
  for (let d = from; d <= to; d++) {
    q = P.complete(q, 'mind_read', d).program;
    if ((d - 1) % 7 === 0) q = P.complete(q, 'skill_practice', d).program;
  }
  return q;
}
const summited = () => climb(fresh(), 1, PROGRAM_DAYS);

describe('Beyond the summit: the 66 days stay as they were', () => {
  it('without a choice, nothing past Day 66 is tracked, asked for or missed', () => {
    const p = summited();
    expect(P.awaitingChoice(p, 67)).toBe(true);
    expect(P.complete(p, 'mind_read', 67).program).toBe(p);
    expect(P.dayResult(p, 68)).toBe('rest');
    // The streak waits; it isn't broken by days nobody was asked about.
    expect(P.pilotStreak(p, 70)).toBe(P.pilotStreak(p, PROGRAM_DAYS));
  });

  it('reminders rest after Day 66 until a continuation is chosen', () => {
    const on = { ...DEFAULT_REMINDERS, enabled: true, hour: 9, minute: 0 };
    const opts = { todayComplete: false, habitNames: [] };
    const day67 = new Date(2026, 2, 12, 8); // 2026-03-12 is Day 67
    expect(dateForDay(START, 67)).toBe('2026-03-12');
    expect(planReminders(on, { startedAt: START }, day67, opts)).toEqual([]);
    expect(planReminders(on, { startedAt: START, after: { mode: 'momentum', since: 67 } }, day67, opts).length).toBe(
      14,
    );
    // Before the summit, reminders stop at Day 66.
    const day60 = new Date(2026, 2, 5, 8);
    expect(planReminders(on, { startedAt: START }, day60, opts).length).toBe(7);
  });
});

describe('Keep My Momentum', () => {
  it('tracks Day 67 onwards with the same engine: XP, streak and weekly habits go on', () => {
    const p = P.keepMomentum(summited(), 67);
    expect(p.after).toEqual({ mode: 'momentum', since: 67 });
    const streak66 = P.pilotStreak(p, PROGRAM_DAYS);
    const q = climb(p, 67, 80);
    expect(P.isDone(q, 'mind_read', 80)).toBe(true);
    expect(P.pilotXp(q)).toBeGreaterThan(P.pilotXp(p));
    expect(P.pilotStreak(q, 80)).toBe(streak66 + 14);
    // A weekly habit keeps its weeks past the summit.
    expect(P.stateOn(q, 'skill_practice', 82)).not.toBe('inactive');
    expect(P.habitWeeks(q, 'skill_practice', 80).length).toBeGreaterThan(P.habitWeeks(p, 'skill_practice', 66).length);
    expect(P.sinceSummit(q, 80)).toMatchObject({ days: 14, counted: 14, best: 14 });
    // The ascent's own numbers are frozen at 66.
    expect(P.journeyStats(q, 80)).toMatchObject({ done: 66, best: 66 });
    expect(P.offersNow(q, 80, false)).toEqual([]);
  });

  it('a late choice: the days between the summit and the choice are a pause, never misses', () => {
    const p = P.keepMomentum(summited(), 72);
    expect(p.after?.since).toBe(72);
    for (let d = 67; d < 72; d++) expect(P.dayResult(p, d)).toBe('rest');
    expect(P.complete(p, 'mind_read', 70).program).toBe(p);
    const q = climb(p, 72, 75);
    expect(P.pilotStreak(q, 75)).toBe(P.pilotStreak(p, PROGRAM_DAYS) + 4);
    expect(P.habitTally(q, 'mind_read', 75).eligible).toBe(PROGRAM_DAYS + 4);
  });

  it('own habits and target changes keep working', () => {
    let p = P.keepMomentum(summited(), 67);
    const own = P.addCustomHabit(p, { name: 'Stretch', perWeek: 7 }, 70, 7);
    expect(own).not.toBeNull();
    p = P.complete(own!.program, own!.id, 70).program;
    expect(P.isDone(p, own!.id, 70)).toBe(true);
    const harder = P.harder(p, 'mind_read', 70);
    expect('program' in harder).toBe(true);
    if ('program' in harder) {
      // From tomorrow, past the summit, like any day.
      expect(P.levelFor(harder.program, 'mind_read', 71)).not.toEqual(P.levelFor(harder.program, 'mind_read', 70));
      expect('program' in P.easier(harder.program, 'mind_read', 72)).toBe(true);
    }
  });

  it('stays quick with a very long history (three years of days)', () => {
    let p = P.keepMomentum(summited(), 67);
    p = climb(p, 67, 1100);
    const t = Date.now();
    expect(P.pilotXp(p)).toBeGreaterThan(0);
    expect(P.pilotStreak(p, 1100)).toBeGreaterThan(1000);
    P.sinceSummit(p, 1100);
    P.recentDays80(p, 1100);
    P.habitTally(p, 'skill_practice', 1100);
    expect(Date.now() - t).toBeLessThan(3000);
  });
});

describe('Begin a New Ascent', () => {
  it('starts a fresh 66 days carrying lifetime XP, the collection and the ascent number, never double-counting', () => {
    const prev = { ...summited(), collection: { unlocked: ['compass', 'edelweiss'] } };
    const d = P.ascentDefaults(prev, 67);
    expect(d.choices).toEqual([
      { habitId: 'mind_read', intensity: 'starter' },
      { habitId: 'skill_practice', intensity: 'starter' },
    ]);
    const next = P.beginAscent(prev, answers, d.choices, [], dateForDay(START, 67), 67, 7)!;
    expect(next.startedAt).toBe(dateForDay(START, 67));
    expect(Object.keys(next.logs)).toEqual([]);
    expect(next.carry).toMatchObject({ ascent: 2, xp: P.pilotXp(prev) });
    expect(P.lifetimeXp(next)).toBe(P.pilotXp(prev));
    expect(next.collection).toEqual(prev.collection);
    expect(next.ceremonies).toBeUndefined();
    // A third ascent carries the second's lifetime total, once.
    const later = climb(next, 1, 66);
    const third = P.beginAscent(later, answers, d.choices, [], '2026-07-01', 67, 7)!;
    expect(third.carry?.ascent).toBe(3);
    expect(P.lifetimeXp(third)).toBe(P.pilotXp(prev) + P.pilotXp(later));
  });

  it('carries the streak only when it begins the day after the last one ended', () => {
    const prev = summited();
    const streak = P.pilotStreak(prev, PROGRAM_DAYS);
    expect(P.carriedStreak(prev, 67)).toBe(streak);
    expect(P.carriedStreak(prev, 69)).toBe(0);
    // After Keep My Momentum, the previous one ended yesterday.
    const kept = climb(P.keepMomentum(prev, 67), 67, 90);
    expect(P.carriedStreak(kept, 91)).toBe(P.pilotStreak(kept, 90));
    const next = P.beginAscent(prev, answers, P.ascentDefaults(prev, 67).choices, [], dateForDay(START, 67), 67, 7)!;
    expect(P.pilotStreak(next, 1)).toBe(streak);
    const done = P.complete(next, 'mind_read', 1).program;
    expect(P.pilotStreak(done, 1)).toBe(streak + 1);
  });

  it('keeps the person’s own habits when chosen, and refuses an unsafe set-up', () => {
    const own = P.addCustomHabit(summited(), { name: 'Stretch', perWeek: 3 }, 10, 7)!;
    const d = P.ascentDefaults(own.program, 67);
    expect(d.custom).toEqual([own.id]);
    const next = P.beginAscent(own.program, answers, d.choices, d.custom, '2026-03-12', 67, 7)!;
    expect(Object.values(next.custom ?? {}).map((c) => c.name)).toEqual(['Stretch']);
    expect(P.beginAscent(own.program, { ...answers, age: 'u16' }, d.choices, [], '2026-03-12', 67, 7)).toBeNull();
  });
});

describe('Saving and reading the new fields', () => {
  it('reads after and carry, and names anything malformed instead of guessing', () => {
    const p = { ...P.keepMomentum(summited(), 67), carry: { ascent: 2, xp: 500, streak: 3 } };
    const read = P.inspectPilotProgram(JSON.parse(JSON.stringify(p)));
    expect(read.lost).toEqual([]);
    expect(read.program?.after).toEqual(p.after);
    expect(read.program?.carry).toEqual(p.carry);
    const bad = P.inspectPilotProgram({ ...p, after: { mode: 'forever', since: 3 }, carry: { ascent: 1, xp: -1 } });
    expect(bad.lost).toHaveLength(2);
  });
});
