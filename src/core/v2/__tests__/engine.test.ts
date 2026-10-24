import { describe, expect, it } from '@jest/globals';
import { buildPlan } from '../../plan';
import { ANSWER_VALUES, type Answers } from '../../types';
import { exclusion, generatePlanV2, habitNotes, needs, swapOptionsV2, V2_LIMITS } from '../engine';
import { BY_ID, GOALS, LIBRARY } from '../library';
import type { PlanResultV2, ProfileV2 } from '../types';
import { FIXTURES } from './fixtures';
import { sample } from './sample';

type Ok = Extract<PlanResultV2, { status: 'ok' }>;
const ok = (p: ProfileV2): Ok => {
  const r = generatePlanV2(p);
  if (r.status !== 'ok') throw new Error('expected a plan');
  return r;
};
const ids = (r: Ok) => r.picks.map((x) => x.id);

/** The checks every plan must pass (the validation brief). */
function checkPlan(p: ProfileV2, r: Ok) {
  const goal = GOALS[p.goal];
  const planIds = ids(r);
  // Foundation first, distinct habits.
  expect(planIds[0]).toBe('discipline_bed');
  expect(new Set(planIds).size).toBe(planIds.length);
  // At most 6; never silently under the minimum (fewer than 3 always comes with a required choice).
  expect(planIds.length).toBeLessThanOrEqual(V2_LIMITS.PLAN_MAX);
  if (planIds.length < V2_LIMITS.PLAN_MIN) {
    expect(r.choice?.required).toBe(V2_LIMITS.PLAN_MIN - planIds.length);
    expect(r.choice!.alternatives.length).toBeGreaterThanOrEqual(r.choice!.required);
  }
  for (const id of planIds) {
    const h = BY_ID[id];
    // Eligible for this person: age, precautions, routines, baseline room, released.
    expect(exclusion(h, p)).toBeNull();
    // Add-only and choice-only habits are never selected automatically.
    expect(['foundation', 'auto']).toContain(h.mode);
  }
  for (const x of r.picks) {
    // Easy is the baseline rung, and Medium/Hard exist above it.
    expect(x.startRung).toBe(BY_ID[x.id].start(p));
    expect(x.targets.easy && x.targets.medium && x.targets.hard).toBeTruthy();
  }
  // Goal representation: a core goal habit whenever one is eligible.
  const anyCoreEligible = goal.core.some((id) => exclusion(BY_ID[id], p) === null);
  if (anyCoreEligible) expect(planIds.some((id) => goal.core.includes(id))).toBe(true);
  // No more than one food habit, at most two phone rules.
  expect(planIds.filter((id) => BY_ID[id].domain === 'nutrition').length).toBeLessThanOrEqual(1);
  expect(planIds.filter((id) => BY_ID[id].phoneRule).length).toBeLessThanOrEqual(2);
  // No irrelevant filler: every non-foundation habit is goal-listed or answers a need of 2+.
  const n = needs(p);
  for (const id of planIds.slice(1)) {
    const d = BY_ID[id].domain as keyof typeof n;
    const goalListed = [...goal.core, ...goal.support].includes(id);
    expect(goalListed || (d in n && n[d] >= 2)).toBe(true);
  }
  // A sixth habit only for an unaddressed need at the maximum.
  if (planIds.length === 6) expect(Object.values(n)).toContain(4);
  // Age and safety.
  if (p.age === '16_17') {
    expect(planIds).not.toContain('food_unsweetened');
    const deep = r.picks.find((x) => x.id === 'focus_deepwork');
    if (deep) expect(deep.targets.hard).not.toMatch(/90 min/);
  }
  if (p.sleepTrouble !== 'rarely' || p.precautions === 'unknown') expect(planIds).not.toContain('sleep_bedtime');
}

describe('fixed scenario fixtures', () => {
  for (const [name, p] of Object.entries(FIXTURES)) {
    it(name, () => checkPlan(p, ok(p)));
  }

  it('A (16, focus): two focus habits, teen-safe: no drinks, no earlier bedtime, no food habit', () => {
    const r = ok(FIXTURES['A · 16, focus']);
    // Earlier bedtime for 16–17 waits for sleep-expert review (evidence review 2026-10-24), so the sleep need
    // is answered by a phone-free wind-down instead.
    expect(ids(r)).toEqual(['discipline_bed', 'screen_social', 'focus_deepwork', 'sleep_no_phone_bed', 'move_walk']);
    expect(ids(r)).not.toContain('food_produce');
  });

  it('B (19, confidence): flexible social habits, no automatic conversations', () => {
    const r = ok(FIXTURES['B · 19, confidence']);
    expect(ids(r).slice(0, 3)).toEqual(['discipline_bed', 'social_reach_out', 'confidence_compliment']);
    expect(ids(r)).not.toContain('confidence_talk');
    expect(r.planNotes.join(' ')).toMatch(/health condition/);
  });

  it('C (28, energy): five habits, one food habit', () => {
    const r = ok(FIXTURES['C · 28, energy']);
    expect(ids(r)).toHaveLength(5);
    expect(ids(r).filter((id) => BY_ID[id].domain === 'nutrition')).toEqual(['food_produce']);
  });

  it('E (45, discipline): no fruit-and-veg filler, Easy never below baseline', () => {
    const r = ok(FIXTURES['E · 45, discipline']);
    expect(ids(r)).not.toContain('food_produce');
  });

  it('F (67, fitness): no strength or balance (held), wind-down not given to a low phone user', () => {
    const r = ok(FIXTURES['F · 67, fitness']);
    expect(ids(r)).not.toContain('sleep_no_phone_bed');
    expect(ids(r)).not.toContain('move_strength_prep');
    expect(ids(r)).not.toContain('move_balance');
    expect(r.planNotes.join(' ')).toMatch(/strength sessions/);
    // Steady wake-up may answer her sleep need, but is never presented as a fitness habit.
    const wake = r.picks.find((x) => x.id === 'sleep_wake');
    if (wake) expect(wake.forGoal).toBe(false);
  });

  it('reasons are one honest sentence: the person’s own answer, or what the habit is', () => {
    for (const p of [...Object.values(FIXTURES), ...sample(500)]) {
      const r = generatePlanV2(p);
      if (r.status !== 'ok') continue;
      for (const x of r.picks) {
        expect(x.reason).not.toMatch(/Picked for/);
        expect(x.reason.length).toBeGreaterThan(0);
        // At most two sentences (a need line can carry a "Screen Time" hint).
        expect(x.reason.split(/(?<=\.)\s/).length).toBeLessThanOrEqual(2);
      }
    }
    const c = ok(FIXTURES['C · 28, energy']);
    expect(c.picks.find((x) => x.id === 'food_produce')!.reason).toBe('You eat hardly any fruit and veg.');
    expect(c.picks.find((x) => x.id === 'move_walk')!.reason).toBe('You’re not active on most days yet.');
  });

  it('fitness notes never stack generic copy on a precaution that already explains the gap', () => {
    const fit: ProfileV2 = { ...FIXTURES['C · 28, energy'], goal: 'fitness' };
    for (const c of ['heart', 'pregnancy', 'walkingDifficult'] as const) {
      const r = ok({ ...fit, precautions: [c] });
      expect(r.planNotes).toHaveLength(1);
      expect(r.planNotes.join(' ')).not.toMatch(/None of our current fitness habits|strength sessions/);
    }
    // Inactive people aren't told "if you train already"; people active 1–2 days are.
    expect(ok({ ...fit, activeDays: '0' }).planNotes.join(' ')).not.toMatch(/train already/);
    expect(ok({ ...fit, activeDays: '1_2' }).planNotes.join(' ')).toMatch(/train already/);
  });

  it('fitness plans never present sleep habits as fitness habits', () => {
    expect([...GOALS.fitness.core, ...GOALS.fitness.support]).not.toContain('sleep_wake');
    expect([...GOALS.fitness.core, ...GOALS.fitness.support]).not.toContain('sleep_bedtime');
  });

  it('Unsweetened drinks always carries the low-blood-sugar note', () => {
    expect(BY_ID.food_unsweetened.note).toMatch(/low blood sugar/);
    expect(BY_ID.food_unsweetened.note).toMatch(/care team/);
  });

  it('G1 and G2: small plans come with the choice step; under 3 makes it required', () => {
    const g1 = ok(FIXTURES['G1 · healthy, fitness']);
    expect(g1.choice).not.toBeNull();
    if (ids(g1).length < 3) {
      expect(g1.choice!.required).toBeGreaterThan(0);
      expect(g1.choice!.ruleNote).toMatch(/at least 3 habits/);
    }
    const g2 = ok(FIXTURES['G2 · organized, discipline']);
    expect(g2.choice).not.toBeNull();
    expect(g2.choice!.ruleNote).toMatch(/all \d are done/);
  });
});

describe('rules', () => {
  const base = FIXTURES['C · 28, energy'];

  it('evidence review restrictions (2026-10-24)', () => {
    const teen: ProfileV2 = { ...base, age: '16_17', sugary: undefined };
    expect(exclusion(BY_ID.sleep_bedtime, teen)).toMatch(/sleep-expert review/);
    expect(exclusion(BY_ID.food_produce, teen)).toMatch(/expert review/);
    for (const c of ['heart', 'pregnancy'] as const) {
      expect(exclusion(BY_ID.move_walk, { ...base, precautions: [c] })).toMatch(/clinician or midwife/);
      expect(exclusion(BY_ID.mind_breathe, { ...base, precautions: [c] })).toMatch(/expert review/);
      const r = ok({ ...base, precautions: [c] });
      expect(r.planNotes.join(' ')).toMatch(/heart conditions and pregnancy are waiting for expert review/);
    }
    // Joint pain, 65+ and unknown precautions keep Walk, with the comfort and warning-sign note.
    for (const p of [
      { ...base, precautions: ['joint'] as ProfileV2['precautions'] },
      { ...base, age: '65p' as const },
      { ...base, precautions: 'unknown' as const },
    ]) {
      expect(exclusion(BY_ID.move_walk, p)).toBeNull();
      expect(habitNotes(BY_ID.move_walk, p).join(' ')).toMatch(/chest pain/);
    }
    expect(habitNotes(BY_ID.move_walk, base)).toEqual([]);
    // A changing wake time means no safe time-in-bed ceiling, so no earlier bedtime.
    expect(exclusion(BY_ID.sleep_bedtime, { ...base, wake: { kind: 'varies' } })).not.toBeNull();
    expect(exclusion(BY_ID.sleep_bedtime, { ...base, wake: { kind: 'shift' } })).not.toBeNull();
    expect(BY_ID.mind_breathe.note).toMatch(/without holding your breath/);
    expect(BY_ID.sleep_bedtime.note).toMatch(/feel sleepy/);
  });

  it('never gives a teen an earlier bedtime or a food habit, or anyone with heart or pregnancy precautions a walk or breathing habit', () => {
    for (const p of sample(5000)) {
      const r = generatePlanV2(p);
      if (r.status !== 'ok') continue;
      const offered = [...ids(r), ...(r.choice?.alternatives.map((a) => a.id) ?? [])];
      if (p.age === '16_17') {
        expect(offered).not.toContain('sleep_bedtime');
        expect(offered).not.toContain('food_produce');
        expect(offered).not.toContain('food_unsweetened');
      }
      if (p.precautions !== 'unknown' && (p.precautions.includes('heart') || p.precautions.includes('pregnancy'))) {
        expect(offered).not.toContain('move_walk');
        expect(offered).not.toContain('mind_breathe');
      }
    }
  });

  it('stops under-16s without a plan', () => {
    expect(generatePlanV2({ ...base, age: 'u16' }).status).toBe('not_eligible');
  });

  it('never offers Strength preparation or Start a conversation automatically', () => {
    for (const p of sample(4000)) {
      const r = generatePlanV2(p);
      if (r.status !== 'ok') continue;
      expect(ids(r)).not.toContain('move_strength_prep');
      expect(ids(r)).not.toContain('confidence_talk');
      expect(ids(r)).not.toContain('food_water_meals');
    }
  });

  it('never uses held habits anywhere, including choices and swaps', () => {
    for (const p of sample(1500)) {
      const r = generatePlanV2(p);
      if (r.status !== 'ok') continue;
      const everywhere = [...ids(r), ...(r.choice?.alternatives.map((a) => a.id) ?? [])];
      expect(everywhere.some((id) => BY_ID[id].release === 'held')).toBe(false);
      const swaps = swapOptionsV2(p, ids(r), ids(r)[ids(r).length - 1]);
      expect(swaps.some((s) => BY_ID[s.id].release === 'held')).toBe(false);
    }
  });

  it('swaps start at Easy of the baseline window, and only offer eligible habits', () => {
    const r = ok(base);
    const swaps = swapOptionsV2(base, ids(r), 'food_produce');
    expect(swaps.length).toBeGreaterThan(0);
    for (const s of swaps) {
      expect(s.level).toBe('easy');
      expect(exclusion(BY_ID[s.id], base)).toBeNull();
      expect(s.targets.easy).toBe(BY_ID[s.id].ladder(base)[BY_ID[s.id].start(base)!]);
    }
  });

  it('respects precautions: heart/pregnancy/walking difficulty never get strength; fluid limit never gets water', () => {
    expect(exclusion(BY_ID.move_strength_prep, { ...base, precautions: ['heart'] })).not.toBeNull();
    expect(exclusion(BY_ID.move_strength_prep, { ...base, precautions: ['pregnancy'] })).not.toBeNull();
    expect(exclusion(BY_ID.move_walk, { ...base, precautions: ['walkingDifficult'] })).not.toBeNull();
    expect(exclusion(BY_ID.food_water_meals, { ...base, precautions: ['fluidLimit'] })).not.toBeNull();
    expect(exclusion(BY_ID.sleep_bedtime, { ...base, precautions: ['sleepCondition'] })).not.toBeNull();
    // Unknown precautions are conservative, not "none".
    expect(exclusion(BY_ID.move_strength_prep, { ...base, precautions: 'unknown' })).not.toBeNull();
    expect(exclusion(BY_ID.sleep_bedtime, { ...base, precautions: 'unknown' })).not.toBeNull();
  });

  it('keeps bedtime targets under the time-in-bed ceiling', () => {
    const late: ProfileV2 = { ...base, wake: { kind: 'time', time: '07:00' }, inBed: '22:30' }; // 8.5 h in bed
    expect(exclusion(BY_ID.sleep_bedtime, late)).not.toBeNull(); // only 30 min of room: under 3 rungs
  });

  it('is deterministic', () => {
    for (const p of sample(500)) expect(generatePlanV2(p)).toEqual(generatePlanV2(p));
  });

  it('passes every plan check across a large sample of the answer space', () => {
    for (const p of sample(20000)) {
      const r = generatePlanV2(p);
      if (r.status === 'ok') checkPlan(p, r);
    }
  });

  it('leaves V1 plan generation unchanged', () => {
    const a: Answers = {
      goal: 'calm',
      sleep: '6-7h',
      screen: '6-8h',
      exercise: 'rarely',
      water: '0.5-1L',
      mind: 'rarely',
    };
    expect(buildPlan(a).map((x) => x.habit.id)).toEqual([
      'discipline_bed',
      'sleep_no_phone_bed',
      'mind_meditate',
      'move_steps',
      'water',
      'screen_limit',
    ]);
    expect(ANSWER_VALUES.goal).toHaveLength(6);
  });

  it('every library ladder has at least 3 rungs for released habits', () => {
    for (const h of LIBRARY.filter((x) => x.release === 'candidate'))
      expect(h.ladder(base).length).toBeGreaterThanOrEqual(3);
  });
});
