import { describe, expect, it } from '@jest/globals';
import { HABITS } from '../habits';
import {
  BASELINES,
  CHALLENGE_BY_ID,
  CHALLENGES,
  challengeExclusion,
  fitsTime,
  HARDER,
  HELD_CHALLENGES,
  INTENSITIES,
  optionExclusion,
  PEAK_MINUTES,
  personalAmount,
  PHASES,
  phaseMinutes,
  PROHIBITED,
  RETIRED_V1,
  shareOfObserved,
  SUGGESTED_INTENSITY,
  SUPPORTING_HABITS,
  TRANSFORMATIONS,
  type Challenge,
  type Intensity,
  type Target,
} from '../reset/challenges';
import { DEV_CLEARED } from '../v2/gate';
import { BY_ID, LIBRARY, TEEN_FOCUS_MAX_MIN } from '../v2/library';
import type { ProfileV2 } from '../v2/types';

const V1_IDS = new Set(HABITS.map((h) => h.id));
const known = (id: string) => V1_IDS.has(id) || !!BY_ID[id];
const unavailable = new Set(LIBRARY.filter((h) => h.release !== 'candidate').map((h) => h.id));
const value = (t: Target) => (t.amount.kind === 'fixed' ? t.amount.value : t.amount.factor);
const harderOrEqual = (unit: Target['unit'], a: number, b: number) => (HARDER[unit] === 'higher' ? b >= a : b <= a);

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
  wake: { kind: 'time', time: '07:30' },
  inBed: '23:30',
};
const TEEN: ProfileV2 = { ...ADULT, age: '16_17', sugary: undefined };

describe('Life Reset challenge catalog: completeness', () => {
  it('has the ten approved flagships, with stable ids', () => {
    // Stable ids: saved programs will refer to these, so they never change once shipped.
    expect(CHALLENGES.map((c) => c.id)).toEqual([
      'reset_deep_work',
      'reset_phone',
      'reset_plan_execute',
      'reset_reading',
      'reset_social_courage',
      'reset_move',
      'reset_sleep_anchor',
      'reset_order',
      'reset_skill',
      'reset_connections',
    ]);
    expect(new Set(CHALLENGES.map((c) => c.name)).size).toBe(10);
  });

  it('gives every challenge a name, description, area, destination and a target for every intensity and phase', () => {
    for (const c of CHALLENGES) {
      for (const s of [c.name, c.area, c.description, c.destination.prompt, c.destination.example])
        expect(s.trim().length).toBeGreaterThan(3);
      for (const i of INTENSITIES) for (const p of PHASES) expect(c.targets[i][p]).toBeDefined();
    }
  });

  it('links every challenge to transformations, and every transformation to a challenge', () => {
    for (const c of CHALLENGES) {
      expect(c.transformations.primary.length).toBeGreaterThan(0);
      for (const tr of [...c.transformations.primary, ...c.transformations.paired])
        expect(TRANSFORMATIONS).toContain(tr);
    }
    for (const tr of TRANSFORMATIONS) expect(CHALLENGES.some((c) => c.transformations.primary.includes(tr))).toBe(true);
  });

  it('suggests an intensity for every baseline, and Challenge for experienced people', () => {
    for (const b of BASELINES) expect(INTENSITIES).toContain(SUGGESTED_INTENSITY[b]);
    expect(SUGGESTED_INTENSITY.experienced).toBe('challenge');
  });
});

describe('targets', () => {
  it('are valid numbers, with one unit per challenge and sensible days', () => {
    for (const c of CHALLENGES) {
      const units = new Set(INTENSITIES.flatMap((i) => PHASES.map((p) => c.targets[i][p].unit)));
      expect(units.size).toBe(1);
      for (const i of INTENSITIES)
        for (const p of PHASES) {
          const t = c.targets[i][p];
          expect(value(t)).toBeGreaterThan(0);
          expect(Number.isFinite(value(t))).toBe(true);
          if (t.amount.kind === 'baseline' && HARDER[t.unit] === 'lower') expect(t.amount.factor).toBeLessThan(1);
          expect(Number.isInteger(t.daysPerWeek) && t.daysPerWeek >= 1 && t.daysPerWeek <= 7).toBe(true);
          expect(t.minutesPerDay).toBeGreaterThanOrEqual(0);
          if (t.rungs) expect(t.rungs[0] <= t.rungs[1] && t.rungs[0] >= 0 && t.rungs[1] <= 10).toBe(true);
        }
    }
  });

  it('never get easier from one phase to the next', () => {
    for (const c of CHALLENGES)
      for (const i of INTENSITIES)
        for (let k = 1; k < PHASES.length; k++) {
          const a = c.targets[i][PHASES[k - 1]];
          const b = c.targets[i][PHASES[k]];
          expect([c.id, i, PHASES[k], harderOrEqual(a.unit, value(a), value(b))]).toEqual([c.id, i, PHASES[k], true]);
          expect(b.daysPerWeek).toBeGreaterThanOrEqual(a.daysPerWeek);
          expect(b.minutesPerDay).toBeGreaterThanOrEqual(a.minutesPerDay);
        }
  });

  it('are at least as demanding at a higher intensity, in every phase', () => {
    for (const c of CHALLENGES)
      for (const p of PHASES)
        for (let n = 1; n < INTENSITIES.length; n++) {
          const a = c.targets[INTENSITIES[n - 1]][p];
          const b = c.targets[INTENSITIES[n]][p];
          if (a.amount.kind === b.amount.kind) expect(harderOrEqual(a.unit, value(a), value(b))).toBe(true);
          expect(b.daysPerWeek).toBeGreaterThanOrEqual(a.daysPerWeek);
        }
  });

  it('keep every focus or practice block within the 16–17 cap', () => {
    for (const c of CHALLENGES)
      for (const i of INTENSITIES)
        for (const p of PHASES) {
          const t = c.targets[i][p];
          if (t.unit === 'focus-minutes' || t.unit === 'practice-minutes')
            expect(value(t) / (t.blocks ?? 1)).toBeLessThanOrEqual(TEEN_FOCUS_MAX_MIN);
        }
  });

  it('starts experienced people where they are: Move Every Day at Challenge is personal, never trivial', () => {
    const move = CHALLENGE_BY_ID.reset_move.targets.challenge;
    expect(move.foundation.amount).toEqual({ kind: 'baseline', factor: 1, max: 300 });
    expect(personalAmount(move.foundation, 240)).toBe(240);
    expect(personalAmount(move.mastery, 200)).toBe(240);
    // Increases stop at 300, but nobody is asked for less than they already do.
    expect(personalAmount(move.mastery, 280)).toBe(300);
    expect(personalAmount(move.mastery, 420)).toBe(420);
    expect(CHALLENGE_BY_ID.reset_deep_work.targets.challenge.foundation.amount).toEqual({ kind: 'fixed', value: 60 });
  });
});

describe('time: a combined plan stays feasible in every phase', () => {
  it('keeps each challenge within its intensity’s peak, every phase', () => {
    for (const c of CHALLENGES)
      for (const i of INTENSITIES)
        for (const p of PHASES) expect(c.targets[i][p].minutesPerDay).toBeLessThanOrEqual(PEAK_MINUTES[i]);
  });

  it('fits any one Starter challenge into 30 minutes and any two into an hour, through Mastery', () => {
    const ids = CHALLENGES.map((c) => c.id);
    for (const a of ids) {
      expect(fitsTime([{ id: a, intensity: 'starter' }], 30)).toBe(true);
      for (const b of ids)
        if (a < b)
          expect(
            fitsTime(
              [
                { id: a, intensity: 'starter' },
                { id: b, intensity: 'starter' },
              ],
              60,
            ),
          ).toBe(true);
    }
  });

  it('rejects a plan that fits on Day 1 but not by Mastery', () => {
    const plan = (['reset_deep_work', 'reset_reading', 'reset_skill'] as const).map((id) => ({
      id,
      intensity: 'standard' as Intensity,
    }));
    const m = phaseMinutes(plan);
    expect(m.foundation).toBeLessThanOrEqual(90);
    expect(m.mastery).toBeGreaterThan(90);
    expect(fitsTime(plan, 90)).toBe(false);
    expect(fitsTime(plan, 150)).toBe(true);
  });

  it('counts no time for rules (a budget, a wake window) that don’t take time', () => {
    for (const id of ['reset_phone', 'reset_sleep_anchor'])
      for (const i of INTENSITIES)
        for (const p of PHASES) expect(CHALLENGE_BY_ID[id].targets[i][p].minutesPerDay).toBe(0);
  });
});

describe('personal destinations', () => {
  it('are prompts with suggestions, never fixed quotas', () => {
    for (const c of CHALLENGES) {
      const s = c.destination.suggestion;
      if (!s) continue;
      for (const i of INTENSITIES) expect(s[i][0]).toBeLessThanOrEqual(s[i][1]);
    }
    // Reading: the person picks the number of books; the suggestion is a range.
    expect(CHALLENGE_BY_ID.reset_reading.destination.suggestion?.standard).toEqual([2, 4]);
  });

  it('sets phone budgets from the person’s own baseline, never below what they need', () => {
    const phone = CHALLENGE_BY_ID.reset_phone;
    for (const i of INTENSITIES) for (const p of PHASES) expect(phone.targets[i][p].amount.kind).toBe('baseline');
    const mastery = phone.targets.standard.mastery;
    expect(personalAmount(mastery, 200)).toBe(120);
    expect(personalAmount(mastery, 200, 150)).toBe(150);
    // No baseline yet: no number is guessed (the first week measures it).
    expect(personalAmount(mastery)).toBeNull();
    for (const i of INTENSITIES) {
      const [lo, hi] = phone.destination.suggestion![i];
      expect(lo > 0 && hi < 1).toBe(true);
    }
  });
});

describe('measurement stays light, and missing data is never a failure', () => {
  it('asks for one tap a day and at most one optional number a week', () => {
    for (const c of CHALLENGES) {
      expect(['tap', 'tap-counts']).toContain(c.measurement.daily);
      if (c.measurement.weekly) expect(c.measurement.weekly.optional).toBe(true);
      expect(c.measurement.checkIn).toBe('weekly-optional');
      expect(c.measurement.missing).toBe('unknown');
    }
  });

  it('leaves unknown days out, and makes no call on too little data', () => {
    const week = (done: number, missed: number, unknown: number) => [
      ...Array(done).fill('done'),
      ...Array(missed).fill('missed'),
      ...Array(unknown).fill('unknown'),
    ];
    expect(shareOfObserved(week(8, 2, 4))).toBe(0.8);
    expect(shareOfObserved(week(3, 0, 11))).toBeNull();
    expect(shareOfObserved(week(0, 0, 14))).toBeNull();
  });
});

describe('no commitments the person didn’t choose', () => {
  it('gives each challenge exactly one core measure; everything else is an option', () => {
    for (const c of CHALLENGES) expect(c.components.filter((x) => x.role === 'core')).toHaveLength(1);
  });

  it('only lets Phone, Sleep and Move commit to phone, sleep or activity by default', () => {
    const core = CHALLENGES.flatMap((c) =>
      c.components.filter((x) => x.role === 'core' && x.commits).map((x) => [c.id, x.commits]),
    );
    expect(core).toEqual([
      ['reset_phone', 'phone'],
      ['reset_move', 'activity'],
      ['reset_sleep_anchor', 'sleep'],
    ]);
  });
});

describe('safety: existing V2 rules, release holds and prohibited content', () => {
  const all = (c: Challenge) => [...c.absorbs, ...c.replaces, ...c.supports, ...c.safetyFrom];

  it('refers only to habits that exist, and supports only reviewed, released ones', () => {
    for (const c of CHALLENGES) {
      for (const id of all(c)) expect([c.id, id, known(id)]).toEqual([c.id, id, true]);
      for (const id of [...c.supports, ...c.safetyFrom]) expect(DEV_CLEARED.has(id)).toBe(true);
      for (const o of c.components) if (o.safetyFrom) expect(DEV_CLEARED.has(o.safetyFrom)).toBe(true);
      for (const id of c.supports) expect(SUPPORTING_HABITS as readonly string[]).toContain(id);
      for (const id of c.replaces) expect(RETIRED_V1).toContain(id);
    }
    for (const id of SUPPORTING_HABITS) expect(DEV_CLEARED.has(id)).toBe(true);
  });

  it('never includes held or prototype exercise content, or prohibited habits', () => {
    for (const c of CHALLENGES)
      for (const id of [...all(c), ...c.components.map((o) => o.safetyFrom ?? '')]) {
        expect(unavailable.has(id)).toBe(false);
        expect(PROHIBITED).not.toContain(id);
      }
    for (const id of SUPPORTING_HABITS) expect(RETIRED_V1).not.toContain(id);
  });

  it('keeps Strength Foundations held and separate', () => {
    expect(HELD_CHALLENGES.map((h) => [h.id, h.status])).toEqual([['reset_strength', 'held']]);
    for (const h of HELD_CHALLENGES) {
      expect(CHALLENGE_BY_ID[h.id]).toBeUndefined();
      for (const id of h.holds) expect(unavailable.has(id)).toBe(true);
    }
  });

  it('can’t be recommended to anyone yet', () => {
    for (const c of CHALLENGES) {
      expect(c.review.recommendable).toBe(false);
      expect(c.review.pending.length).toBeGreaterThan(0);
    }
    expect(CHALLENGE_BY_ID.reset_social_courage.review.status).toBe('needs-expert-review');
    expect(CHALLENGE_BY_ID.reset_move.review.status).toBe('needs-expert-review');
  });

  it('applies V2’s age and precaution rules, but never turns people away for already doing it', () => {
    const move = CHALLENGE_BY_ID.reset_move;
    expect(challengeExclusion(move, ADULT, 'standard')).toBeNull();
    // Already walking most days and active 5+ days: welcome (V2's Walk would exclude them).
    const active: ProfileV2 = { ...ADULT, routines: ['walk'], activeDays: '5p' };
    expect(BY_ID.move_walk.exclude(active)).not.toBeNull();
    expect(challengeExclusion(move, active, 'challenge')).toBeNull();
    for (const pre of ['heart', 'pregnancy', 'walkingDifficult'] as const)
      expect(challengeExclusion(move, { ...ADULT, precautions: [pre] }, 'starter')).not.toBeNull();
    expect(challengeExclusion(move, TEEN, 'starter')).toBeNull();
    expect(challengeExclusion(move, TEEN, 'standard')).not.toBeNull();

    const sleep = CHALLENGE_BY_ID.reset_sleep_anchor;
    expect(challengeExclusion(sleep, { ...ADULT, routines: ['sameWake'] }, 'standard')).toBeNull();
    expect(challengeExclusion(sleep, { ...ADULT, wake: { kind: 'shift' } }, 'starter')).not.toBeNull();
    const inBed = sleep.components.find((o) => o.id === 'in-bed-time')!;
    const short: ProfileV2 = { ...ADULT, sleepHours: '6_7', wake: { kind: 'time', time: '07:00' }, inBed: '00:30' };
    expect(optionExclusion(inBed, short)).toBeNull();
    expect(optionExclusion(inBed, { ...short, age: '16_17' })).not.toBeNull();
    expect(optionExclusion(inBed, { ...short, sleepTrouble: 'most' })).not.toBeNull();

    for (const c of CHALLENGES) expect(challengeExclusion(c, { ...ADULT, age: 'u16' }, 'starter')).not.toBeNull();
    for (const c of CHALLENGES.filter((x) => x.safetyFrom.length === 0 && x.ages.teen === 'allowed'))
      for (const i of INTENSITIES) {
        expect(challengeExclusion(c, ADULT, i)).toBeNull();
        expect(challengeExclusion(c, TEEN, i)).toBeNull();
      }
  });

  it('leaves V2’s Focused work ladder exactly as it was', () => {
    const rungs = (p: ProfileV2) => BY_ID.focus_deepwork.ladder(p).map((s) => parseInt(s, 10));
    expect(rungs(TEEN)).toEqual([10, 15, 25, 45, 60]);
    expect(rungs(ADULT)).toEqual([10, 15, 25, 45, 60, 90]);
  });

  it('uses no prohibited or overclaiming language', () => {
    const banned =
      /\bcold\b|\bfast(ing)?\b|calorie|weight|\bdiet\b|lit(re|er)s?\b|glasses of water|5 ?a\.?m\.?|proven|guarantee|scientific|validated|\bmust\b|no excuses/i;
    const text = (x: unknown): string[] =>
      typeof x === 'string'
        ? [x]
        : Array.isArray(x)
          ? x.flatMap(text)
          : x && typeof x === 'object'
            ? Object.values(x).flatMap(text)
            : [];
    const strings = text([CHALLENGES, HELD_CHALLENGES]);
    expect(strings.length).toBeGreaterThan(150);
    for (const s of strings) expect([s, banned.test(s)]).toEqual([s, false]);
  });
});
