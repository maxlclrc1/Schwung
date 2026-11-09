import { describe, expect, it } from '@jest/globals';
import { INTENSITIES, PHASES, RESET_HABITS, type Intensity, type Phase } from '../reset/habits';
import * as P from '../reset/pilot';
import {
  harderLevel,
  makeHarder,
  newProgression,
  nextPhase,
  nextRealHarder,
  nextRealPhase,
  sameTarget,
  type Level,
} from '../reset/readiness';

/*
 * A step up is a change of target (docs/66_DAY_EXPERIENCE_AUDIT.md, B2): some phases ask exactly what the one before
 * asked, and those are never offered, nor made by "Make it harder". Steps that change the target are as before.
 */

const START = '2026-01-05'; // a Monday: weeks are Days 1–7, 8–14…
const ADULT: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 180,
  strengthStart: 'sometimes',
  ownSessions: 3,
  phone: '4_6',
  pullMinutes: 180,
  wake: { kind: 'time', time: '07:00' },
  activeDays: '3_4',
  skill: 'Language',
};
const LEVELS: Level[] = INTENSITIES.flatMap((intensity) => PHASES.map((phase) => ({ intensity, phase })));
const key = (l: Level | null) => (l ? `${l.intensity}/${l.phase}` : 'none');

/** A program with one habit at a level from Day 1, where that intensity is allowed for these answers. */
function at(id: string, l: Level, a: P.PilotAnswers = ADULT): P.PilotProgram | null {
  const p = P.createPilot(a, [{ habitId: id, intensity: l.intensity }], START);
  if (!p) return null;
  const s = p.progression[id];
  return { ...p, progression: { [id]: { ...s, eras: [{ ...l, fromDay: 1, reason: 'start' }] } } };
}

/** What the person is asked, in their words: target and how often. */
const asks = (p: P.PilotProgram, id: string, day: number) =>
  `${P.targetText(p, id, day)} · ${P.frequencyText(p, id, day)}`;

/** Every habit done (weekly ones: each day the week is still open) from `from` to `to`. */
function doAll(p: P.PilotProgram, from: number, to: number): P.PilotProgram {
  let q = p;
  for (let d = from; d <= to; d++)
    for (const id of q.habits) if (['due', 'open'].includes(P.stateOn(q, id, d))) q = P.complete(q, id, d).program;
  return q;
}

describe('a step up always changes the target', () => {
  it('finds the phase steps that ask the same (21 in the catalog, the audit’s 22nd is personal), and never takes one', () => {
    const same: string[] = [];
    for (const h of RESET_HABITS)
      for (const intensity of INTENSITIES)
        for (const [from, to] of [
          ['foundation', 'momentum'],
          ['momentum', 'mastery'],
        ] as [Phase, Phase][])
          if (sameTarget(h.id, { intensity, phase: from }, { intensity, phase: to }))
            same.push(`${h.id} ${intensity} ${from}`);
    expect(same).toHaveLength(21);
    expect(same).toEqual(
      expect.arrayContaining([
        'mind_meditation starter foundation',
        'outdoor_time standard momentum',
        'eat_well challenge foundation',
        'strength_log challenge foundation',
        'strength_log challenge momentum',
        'strength_log starter momentum',
      ]),
    );
    // The audit's 22nd: Less Scrolling at Challenge, Momentum → Mastery, for someone at 2 hours on their main app. The
    // catalog's limits differ, but both reach that person's floor: refused as the "lowest" limit, as before.
    const low = at('screen_app_limit', { intensity: 'challenge', phase: 'momentum' }, { ...ADULT, pullMinutes: 120 })!;
    expect(P.harder(low, 'screen_app_limit', 3)).toEqual({
      blocked: 'your limit is already as low as it goes for you',
    });
    expect(P.offersNow(doAll(low, 1, 50), 51, false)).toEqual([]);
  });

  it('for every built-in habit at every level: the next step (offered or chosen) asks something different', () => {
    for (const h of RESET_HABITS)
      for (const l of LEVELS) {
        for (const to of [nextRealPhase(h.id, l), nextRealHarder(h.id, l)]) {
          if (!to) continue;
          expect(sameTarget(h.id, l, to)).toBe(false);
          // And in the person's own words, where the intensity is open to them.
          const p = at(h.id, l);
          const q = at(h.id, to);
          if (p && q) expect(asks(q, h.id, 1)).not.toBe(asks(p, h.id, 1));
        }
        // Where the next level already changes the target, the step is exactly that level, as before.
        const next = nextPhase(l);
        if (next && !sameTarget(h.id, l, next)) expect(nextRealPhase(h.id, l)).toEqual(next);
        const harder = harderLevel(l);
        if (harder && !sameTarget(h.id, l, harder)) expect(nextRealHarder(h.id, l)).toEqual(harder);
      }
  });

  it('a step never leaves the intensity the person chose, and stays one step of target', () => {
    for (const h of RESET_HABITS)
      for (const l of LEVELS) {
        const to = nextRealPhase(h.id, l);
        if (to) expect(to.intensity).toBe(l.intensity);
      }
    // Meditation asks the same at every phase of an intensity: nothing to offer within it…
    expect(nextRealPhase('mind_meditation', { intensity: 'starter', phase: 'foundation' })).toBeNull();
    // …and "Make it harder" goes to the next real target (2 → 5 minutes), never to a level that asks the same.
    expect(key(nextRealHarder('mind_meditation', { intensity: 'starter', phase: 'foundation' }))).toBe(
      'standard/mastery',
    );
    expect(nextRealHarder('strength_log', { intensity: 'challenge', phase: 'foundation' })).toBeNull();
  });
});

describe('offers and "Make it harder" follow the same rule', () => {
  /** Each habit, intensity and day: ready (every day done), with and without "too easy". */
  const sweep = (cb: (p: P.PilotProgram, id: string, day: number) => void) => {
    for (const h of RESET_HABITS)
      for (const intensity of INTENSITIES) {
        const p0 = at(h.id, { intensity, phase: 'foundation' });
        if (!p0) continue;
        for (const day of [15, 22, 23, 30, 45, 46, 52]) {
          const done = doAll(p0, 1, day - 1);
          cb(done, h.id, day);
          cb(P.feedback(done, h.id, 'too-easy', day - 1), h.id, day);
        }
      }
  };

  it('every offered step-up changes the target, to the same level "Make it harder" would choose', () => {
    let offered = 0;
    sweep((p, id, day) => {
      for (const { habitId, offer } of P.offersNow(p, day, false)) {
        if (offer.kind !== 'step-up') continue;
        offered++;
        const after = P.accept(p, habitId, offer, day);
        expect(asks(after, id, offer.effectiveDay)).not.toBe(asks(p, id, offer.effectiveDay));
        const manual = P.harder(p, habitId, day);
        expect('level' in manual && key(manual.level)).toBe(key(offer.to));
      }
    });
    expect(offered).toBeGreaterThan(20);
  });

  it('no step-up is offered for a habit whose next phase asks the same', () => {
    for (const [id, intensity] of [
      ['mind_meditation', 'starter'],
      ['outdoor_time', 'standard'],
      ['eat_well', 'challenge'],
      ['strength_log', 'challenge'],
    ] as [string, Intensity][]) {
      const p = doAll(at(id, { intensity, phase: 'foundation' })!, 1, 50);
      expect(P.offersNow(p, 51, false)).toEqual([]);
      expect(P.offersNow(P.feedback(p, id, 'too-easy', 50), 51, false)).toEqual([]);
    }
    // Strength at Starter: Foundation → Momentum is real (and offered); Momentum → Mastery asks the same.
    const s = doAll(at('strength_log', { intensity: 'starter', phase: 'momentum' })!, 1, 50);
    expect(P.offersNow(s, 51, false)).toEqual([]);
    expect(P.harder(s, 'strength_log', 51)).toMatchObject({ level: { intensity: 'standard', phase: 'mastery' } });
  });

  it('"Make it harder" with nothing harder left says so, and never makes an empty change', () => {
    const s = at('strength_log', { intensity: 'challenge', phase: 'foundation' })!;
    expect(P.harder(s, 'strength_log', 3)).toEqual({ blocked: 'this is already the hardest target' });
    const m = at('mind_meditation', { intensity: 'challenge', phase: 'foundation' })!;
    expect(P.harder(m, 'mind_meditation', 3)).toEqual({ blocked: 'this is already the hardest target' });
  });

  it('legitimate step-ups are unchanged: Read at Starter goes to Momentum on Day 22, from the next day', () => {
    const p = doAll(at('mind_read', { intensity: 'starter', phase: 'foundation' })!, 1, 21);
    const [{ offer }] = P.offersNow(p, 22, false);
    expect(offer).toMatchObject({
      kind: 'step-up',
      to: { intensity: 'starter', phase: 'momentum' },
      early: false,
      effectiveDay: 23,
    });
  });

  it('weekly habits still change from next Monday', () => {
    const p = doAll(at('skill_practice', { intensity: 'starter', phase: 'foundation' })!, 1, 23);
    const [{ offer }] = P.offersNow(p, 24, false);
    expect(offer.to).toEqual({ intensity: 'starter', phase: 'momentum' });
    expect(offer.effectiveDay).toBe(29); // Monday of week 5
    const manual = P.harder(p, 'skill_practice', 24);
    expect('program' in manual && manual.program.progression.skill_practice.eras.at(-1)!.fromDay).toBe(29);
  });
});

describe('safety, time and choice are as before', () => {
  it('a step to a real target is still checked against the time a day and against safety', () => {
    const ctx = { startKey: START };
    // Meditation's next real target from Starter is Standard (5 min): with 16 minutes taken of 20, it doesn't fit.
    const med = newProgression('mind_meditation', 'starter', 1);
    expect(makeHarder(med, ctx, 3, { availableMinutes: 20, otherMinutes: 16 })).toEqual({
      blocked: expect.stringMatching(/time/i),
    });
    expect(makeHarder(med, ctx, 3, { availableMinutes: 20, otherMinutes: 15 })).toMatchObject({
      level: { intensity: 'standard', phase: 'mastery' },
    });
    // Strength with a heart precaution: no step at all.
    const strength = newProgression('strength_log', 'standard', 1);
    const heart = { age: '30_49', precautions: ['heart'] } as const;
    expect(makeHarder(strength, ctx, 3, { profile: { ...heart, precautions: [...heart.precautions] } })).toHaveProperty(
      'blocked',
    );
  });

  it('a health precaution still closes Strength, whatever the step', () => {
    const heart = { ...ADULT, precautions: ['heart'] } as P.PilotAnswers;
    expect(P.habitExclusion('strength_log', heart)).not.toBeNull();
    // Move with a heart precaution is closed at every level.
    expect(P.intensityOptions('move_walk', heart).every((o) => o.reason)).toBe(true);
  });

  it('nothing changes until the person accepts: an offer alone leaves the program as it was', () => {
    const p = doAll(at('mind_read', { intensity: 'starter', phase: 'foundation' })!, 1, 21);
    const before = JSON.stringify(p);
    P.offersNow(p, 22, false);
    P.harder(p, 'mind_read', 22);
    expect(JSON.stringify(p)).toBe(before);
  });
});

describe('saved programs are read as they were', () => {
  it('a program already at a level that asked the same keeps its days, level, XP and streak', () => {
    // Saved before this fix: Strength at Challenge stepped "up" to Momentum on Day 22 (the same target).
    let p = at('strength_log', { intensity: 'challenge', phase: 'foundation' })!;
    p = {
      ...p,
      progression: {
        strength_log: {
          ...p.progression.strength_log,
          eras: [
            { intensity: 'challenge', phase: 'foundation', fromDay: 1, reason: 'start' },
            { intensity: 'challenge', phase: 'momentum', fromDay: 22, reason: 'step-up' },
          ],
        },
      },
    };
    p = doAll(p, 1, 40);
    const before = {
      level: P.levelFor(p, 'strength_log', 40),
      xp: P.pilotXp(p),
      streak: P.pilotStreak(p, 40),
      days: Object.keys(p.logs).length,
    };
    expect(before.level).toEqual({ intensity: 'challenge', phase: 'momentum' });
    // Its target reads as it did, nothing further is offered, and the numbers stand.
    expect(asks(p, 'strength_log', 40)).toBe(
      asks(at('strength_log', { intensity: 'challenge', phase: 'foundation' })!, 'strength_log', 1),
    );
    expect(P.offersNow(p, 45, false)).toEqual([]);
    expect({
      level: P.levelFor(p, 'strength_log', 40),
      xp: P.pilotXp(p),
      streak: P.pilotStreak(p, 40),
      days: Object.keys(p.logs).length,
    }).toEqual(before);
  });
});
