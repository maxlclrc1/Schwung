import { describe, expect, it } from '@jest/globals';
import { buildPlan } from '../../plan';
import { ANSWER_VALUES, type Answers } from '../../types';
import { exclusion, generatePlanV2, needs, swapOptionsV2, V2_LIMITS } from '../engine';
import { BY_ID, GOALS, LIBRARY } from '../library';
import type { PlanResultV2, ProfileV2 } from '../types';
import { FIXTURES } from './fixtures';

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

  it('A (16, focus): two focus habits, teen-safe, no drink habit', () => {
    const r = ok(FIXTURES['A · 16, focus']);
    expect(ids(r)).toEqual(['discipline_bed', 'screen_social', 'focus_deepwork', 'sleep_bedtime', 'move_walk']);
    expect(r.picks.find((x) => x.id === 'sleep_bedtime')!.targets).toEqual({
      easy: 'In bed by 00:00',
      medium: 'In bed by 23:45',
      hard: 'In bed by 23:30',
    });
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

/** Deterministic sample of profiles across every answer (seeded, so CI is stable). */
function sample(n: number): ProfileV2[] {
  let seed = 7;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  const routines = ['reading', 'breathing', 'journaling', 'planning', 'walk', 'phoneAway', 'sameWake', 'bed'] as const;
  const precautions = ['joint', 'walkingDifficult', 'heart', 'pregnancy', 'fluidLimit', 'sleepCondition'] as const;
  const out: ProfileV2[] = [];
  for (let i = 0; i < n; i++) {
    const age = pick(['16_17', '18_29', '30_49', '50_64', '65p'] as const);
    const produce = pick(['0', '1_2', '3_4', '5p', 'skip'] as const);
    const phone = pick(['lt1', '1_2', '2_4', '4_6', '6p', 'unknown'] as const);
    const wakeKind = pick(['time', 'varies', 'shift', 'none'] as const);
    out.push({
      age,
      goal: pick(['energy', 'focus', 'discipline', 'confidence', 'calm', 'fitness'] as const),
      sleepHours: pick(['lt6', '6_7', '7_8', '8_9', 'gt9'] as const),
      sleepTrouble: pick(['rarely', 'some', 'most'] as const),
      activeDays: pick(['0', '1_2', '3_4', '5p'] as const),
      produce,
      sugary: age !== '16_17' && produce !== 'skip' ? pick(['most', 'some', 'rarely'] as const) : undefined,
      phone,
      phonePull: ['2_4', '4_6', '6p', 'unknown'].includes(phone)
        ? pick(['social', 'video', 'games', 'messages', 'mix'] as const)
        : undefined,
      routines: routines.filter(() => rnd() < 0.3),
      precautions: rnd() < 0.15 ? 'unknown' : precautions.filter(() => rnd() < 0.12),
      wake:
        wakeKind === 'time'
          ? { kind: 'time', time: pick(['05:30', '06:30', '07:00', '08:00', '09:30']) }
          : wakeKind === 'none'
            ? undefined
            : { kind: wakeKind },
      inBed: wakeKind === 'time' ? pick(['21:30', '22:30', '23:15', '00:00', '01:00']) : undefined,
    });
  }
  return out;
}
