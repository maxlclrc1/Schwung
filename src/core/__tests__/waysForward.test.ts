import { describe, expect, it } from '@jest/globals';
import { dayCells } from '../reset/charts';
import * as P from '../reset/pilot';
import { dueReflection } from '../reset/reflections';
import { pendingChange } from '../reset/readiness';
import { waysForward } from '../reset/waysForward';

/*
 * Phase R1A of the recovery system (docs/RECOVERY_SYSTEM_PROPOSAL.md): after "Harder than expected", the weekly
 * reflection offers only real ways forward. Choices come from the person's own levels and answer, never from missing
 * days; every change goes through the existing actions and needs its own confirmation; history never changes.
 */

const START = '2026-01-05'; // a Monday
const A_ANSWERS: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 45,
  wake: { kind: 'time', time: '07:00' },
  activeDays: '1_2',
};
const A_HABITS = ['mind_read', 'mind_meditation', 'move_walk', 'sleep_wake'];
/** User A of the audit: four habits, all at Starter. */
const userA = () =>
  P.createPilot(
    A_ANSWERS,
    A_HABITS.map((habitId) => ({ habitId, intensity: 'starter' as const })),
    START,
  )!;

/** User A's first two weeks: everything in week 1, then meditation dropped, then two habits on two days in three. */
function struggling(p: P.PilotProgram): P.PilotProgram {
  let q = p;
  for (let d = 1; d <= 14; d++) {
    const ids = d <= 7 ? A_HABITS : d <= 13 ? A_HABITS.filter((h) => h !== 'mind_meditation') : [];
    for (const id of ids) q = P.complete(q, id, d).program;
  }
  return q;
}

const set = (ids: string[]) => [...ids].sort().join(',');
/**
 * Everything a plan change must never touch: the recorded days and what's computed from them up to `day`. (A day's
 * habits are compared as a set: a stopped habit is listed after the active ones, as removal always did.)
 */
const history = (p: P.PilotProgram, day: number) => ({
  logs: JSON.stringify(p.logs),
  xp: P.pilotXp(p),
  stats: P.journeyStats(p, day),
  cells: dayCells(p, day).map((c) => [c.day, c.state, set(c.done), set(c.planned)]),
  tallies: Object.fromEntries(P.allHabits(p).map((id) => [id, P.habitTally(p, id, day)])),
});

describe('User A at Starter with four habits, struggling on Day 15', () => {
  const p = struggling(userA());

  it('has no easier target to offer, so "Make a habit easier" is not shown; fewer habits is', () => {
    expect(waysForward(p, 15)).toEqual({ easier: [], fewer: A_HABITS });
    // The dead end the audit found is still true of the level system (no fourth level was added) …
    for (const id of A_HABITS) expect(P.easier(p, id, 15)).toHaveProperty('blocked');
  });

  it('can stop one habit, with every past day, XP and tally exactly as before', () => {
    const before = history(p, 14);
    const q = P.removeHabit(p, 'mind_meditation', 15)!;
    expect(q.habits).toEqual(['mind_read', 'move_walk', 'sleep_wake']);
    expect(history(q, 14)).toEqual(before);
    // Its levels and its days are kept in the save; it's out of the program from today (not a pause).
    expect(q.progression.mind_meditation.eras).toEqual(p.progression.mind_meditation.eras);
    expect(q.progression.mind_meditation.gaps).toEqual([{ from: 15 }]);
    // The others are untouched, and nothing changes difficulty.
    for (const id of q.habits) expect(q.progression[id]).toEqual(p.progression[id]);
    expect(waysForward(q, 15)).toEqual({ easier: [], fewer: ['mind_read', 'move_walk', 'sleep_wake'] });
  });
});

describe('a habit at Standard that can genuinely step down', () => {
  const p = P.createPilot(
    { ...A_ANSWERS, minutesPerDay: 90 },
    [
      { habitId: 'mind_read', intensity: 'standard' },
      { habitId: 'mind_meditation', intensity: 'starter' },
    ],
    START,
  )!;

  it('offers Make a habit easier for that habit only, and it changes only once confirmed, from tomorrow', () => {
    const ways = waysForward(p, 15);
    expect(ways.easier).toEqual(['mind_read']);
    // Choosing the way changes nothing; the confirmation is the existing "Make it easier".
    const r = P.easier(p, 'mind_read', 15);
    if ('blocked' in r) throw new Error(r.blocked);
    expect(r.level).toEqual({ intensity: 'starter', phase: 'foundation' });
    expect(P.levelFor(r.program, 'mind_read', 15)).toEqual({ intensity: 'standard', phase: 'foundation' });
    expect(P.levelFor(r.program, 'mind_read', 16)).toEqual({ intensity: 'starter', phase: 'foundation' });
    expect(r.program.logs).toBe(p.logs);
    // Once changing, it isn't offered again (the change is waiting).
    expect(pendingChange(r.program.progression.mind_read, 15)).not.toBeNull();
    expect(waysForward(r.program, 15).easier).toEqual([]);
  });

  it('never offers an easier level that a safety rule rules out', () => {
    // Joint pain rules out Strength at Starter: Standard has no easier target this person may take.
    const joint = P.createPilot(
      { ...A_ANSWERS, precautions: ['joint'], minutesPerDay: 120, strengthStart: 'sometimes' },
      [
        { habitId: 'strength_log', intensity: 'standard' },
        { habitId: 'mind_read', intensity: 'standard' },
      ],
      START,
    )!;
    expect(P.easier(joint, 'strength_log', 15)).toHaveProperty('blocked');
    expect(waysForward(joint, 15).easier).toEqual(['mind_read']);
  });

  it('never offers the person’s own habits a level (they have none), but they can be stopped', () => {
    const { program: own, id } = P.addCustomHabit(p, { name: 'Stretch', perWeek: 7 }, 3, 0)!;
    expect(waysForward(own, 15)).toEqual({ easier: ['mind_read'], fewer: ['mind_read', 'mind_meditation', id] });
  });
});

describe('someone reducing their active habits', () => {
  it('stops one at a time, never the last one, keeping every past day', () => {
    const p = struggling(userA());
    const before = history(p, 14);
    let q = p;
    for (const id of ['mind_meditation', 'sleep_wake', 'move_walk']) q = P.removeHabit(q, id, 15)!;
    expect(q.habits).toEqual(['mind_read']);
    expect(waysForward(q, 15)).toEqual({ easier: [], fewer: [] });
    expect(P.removeHabit(q, 'mind_read', 15)).toBeNull();
    expect(history(q, 14)).toEqual(before);
  });

  it('a habit already done today leaves from tomorrow, so today stays as it is', () => {
    const p = P.complete(struggling(userA()), 'mind_read', 15).program;
    const q = P.removeHabit(p, 'mind_read', 15)!;
    expect(q.progression.mind_read.gaps).toEqual([{ from: 16 }]);
    expect(P.isDone(q, 'mind_read', 15)).toBe(true);
    expect(P.pilotXp(q)).toBe(P.pilotXp(p));
  });

  it('can add a stopped habit back later; it starts again at Foundation and its old days stay', () => {
    const p = P.removeHabit(struggling(userA()), 'mind_meditation', 15)!;
    const back = P.addHabit(p, {}, { habitId: 'mind_meditation', intensity: 'starter' }, 30)!;
    expect(back.habits).toContain('mind_meditation');
    expect(P.levelFor(back, 'mind_meditation', 30)).toEqual({ intensity: 'starter', phase: 'foundation' });
    expect(history(back, 14)).toEqual(history(p, 14));
  });
});

describe('someone who declines every suggestion', () => {
  it('looking at the ways forward changes nothing, on any day', () => {
    const p = struggling(userA());
    const saved = JSON.stringify(p);
    for (let d = 8; d <= 66; d++) waysForward(p, d);
    expect(JSON.stringify(p)).toBe(saved);
  });

  it('the ways never depend on missing days: an absent person and an active one see the same choices', () => {
    const active = struggling(userA());
    const absent = userA(); // nothing recorded at all
    expect(waysForward(absent, 15)).toEqual(waysForward(active, 15));
    // … and nothing is offered either way by readiness because of the absence.
    expect(P.offersNow(absent, 15, false)).toEqual([]);
  });
});

describe('returning to the reflection after navigating away', () => {
  it('the answer is kept, the invitation is not repeated, and the same ways are offered again', () => {
    const p = struggling(userA());
    const answered: P.PilotProgram = {
      ...p,
      reflections: { 2: { week: 2, day: 15, answer: 'harder' } },
    };
    expect(dueReflection(answered.reflections, 15)).toBeNull();
    // Reopened later (from Journey's reflections): nothing was changed by leaving, and the choices are as they were.
    expect(answered.habits).toEqual(p.habits);
    expect(answered.progression).toEqual(p.progression);
    expect(waysForward(answered, 16)).toEqual(waysForward(p, 15));
  });
});

describe('an existing saved program with history', () => {
  /** A program saved before this phase: an earlier step down, a declined offer, a removal and reflections. */
  function saved(): P.PilotProgram {
    let p = P.createPilot(
      { ...A_ANSWERS, minutesPerDay: 120 },
      [
        { habitId: 'mind_read', intensity: 'standard' },
        { habitId: 'move_walk', intensity: 'standard' },
        { habitId: 'mind_meditation', intensity: 'starter' },
        { habitId: 'outdoor_time', intensity: 'starter' },
      ],
      START,
    )!;
    for (let d = 1; d <= 20; d++) for (const id of ['mind_read', 'move_walk']) p = P.complete(p, id, d).program;
    const easier = P.easier(p, 'move_walk', 10);
    if ('blocked' in easier) throw new Error(easier.blocked);
    p = P.removeHabit(easier.program, 'outdoor_time', 12)!;
    p = { ...p, reflections: { 1: { week: 1, day: 8, answer: 'right' }, 2: { week: 2, day: 15, answer: 'harder' } } };
    // Through a save and a load, as on the phone.
    return P.sanitizePilotProgram(JSON.parse(JSON.stringify(p)))!;
  }

  it('loads unchanged and offers the ways its levels allow', () => {
    const p = saved();
    expect(p.progression.move_walk.eras.map((e) => e.reason)).toEqual(['start', 'easier']);
    expect(waysForward(p, 22)).toEqual({ easier: ['mind_read'], fewer: ['mind_read', 'mind_meditation', 'move_walk'] });
  });

  it('stopping a habit from the reflection keeps every recorded day, earlier removals and reflections', () => {
    const p = saved();
    const q = P.removeHabit(p, 'move_walk', 22)!;
    expect(history(q, 21)).toEqual(history(p, 21));
    expect(q.progression.outdoor_time).toEqual(p.progression.outdoor_time);
    expect(q.progression.move_walk.eras).toEqual(p.progression.move_walk.eras);
    expect(q.reflections).toEqual(p.reflections);
    // And it survives a save and a load in the same shape.
    expect(P.sanitizePilotProgram(JSON.parse(JSON.stringify(q)))).toEqual(q);
  });
});

describe('when the plan can’t be changed from here', () => {
  it('offers nothing while the program waits for a choice after the summit', () => {
    const p = userA();
    expect(P.awaitingChoice(p, 67)).toBe(true);
    expect(waysForward(p, 67)).toEqual({ easier: [], fewer: [] });
  });

  it('offers nothing for a program paused for age', () => {
    const p = { ...userA(), answers: { ...A_ANSWERS, age: '16_17' as const } };
    expect(waysForward(p, 15)).toEqual({ easier: [], fewer: [] });
  });

  it('works on with Keep My Momentum after the summit', () => {
    const p = P.keepMomentum(userA(), 67);
    expect(waysForward(p, 70).fewer).toEqual(A_HABITS);
  });
});
