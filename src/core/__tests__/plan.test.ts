import { describe, expect, it } from '@jest/globals';
import { generatePlan, toPlan } from '../plan';
import type { Answers } from '../types';

const ids = (a: Answers) => generatePlan(a).map((h) => h.id);

const base: Answers = {
  sleep: '8h+',
  screen: '<3h',
  exercise: 'regularly',
  water: '2L+',
  mind: 'regularly',
  goal: 'focus',
};

describe('generatePlan', () => {
  it('builds a plan for someone struggling everywhere (energy goal)', () => {
    expect(
      ids({ sleep: '<6h', screen: '6h+', exercise: 'never', water: '<1L', mind: 'never', goal: 'energy' }),
    ).toEqual(['discipline_bed', 'sleep_bedtime', 'screen_limit', 'move_walk', 'water', 'mind_journal']);
  });

  it('fills up to 5 for someone already doing well', () => {
    expect(ids(base)).toEqual(['discipline_bed', 'focus_deepwork', 'mind_read', 'water', 'move_walk']);
  });

  it('maps middle answers to the gentler habits', () => {
    expect(
      ids({
        sleep: '6-7h',
        screen: '3-6h',
        exercise: 'sometimes',
        water: '1-2L',
        mind: 'sometimes',
        goal: 'confidence',
      }),
    ).toEqual(['discipline_bed', 'sleep_no_phone_bed', 'screen_morning', 'move_workout', 'water', 'mind_read']);
  });

  it('energy goal adds a walk when there is none', () => {
    expect(ids({ ...base, goal: 'energy' })).toContain('move_walk');
  });

  it('energy goal adds water when a walk is already in the plan', () => {
    expect(ids({ ...base, exercise: 'never', goal: 'energy' })).toEqual(expect.arrayContaining(['move_walk', 'water']));
  });

  it('drops the discipline extra first when over 6', () => {
    const plan = ids({
      sleep: '<6h',
      screen: '6h+',
      exercise: 'sometimes',
      water: '<1L',
      mind: 'never',
      goal: 'discipline',
    });
    expect(plan).toHaveLength(6);
    expect(plan).not.toContain('discipline_cold');
    expect(plan).toContain('discipline_bed');
  });

  it('drops the confidence extra first when over 6', () => {
    const plan = ids({
      sleep: '<6h',
      screen: '6h+',
      exercise: 'never',
      water: '<1L',
      mind: 'never',
      goal: 'confidence',
    });
    expect(plan).toHaveLength(6);
    expect(plan).not.toContain('confidence_talk');
  });

  it('drops from the bottom of the list when there is no extra to drop', () => {
    const plan = ids({
      sleep: '<6h',
      screen: '6h+',
      exercise: 'sometimes',
      water: '<1L',
      mind: 'never',
      goal: 'focus',
    });
    expect(plan).toEqual(['discipline_bed', 'sleep_bedtime', 'screen_limit', 'move_workout', 'water', 'mind_journal']);
  });

  it('holds its invariants for every possible answer combination', () => {
    const sleeps = ['<6h', '6-7h', '8h+'] as const;
    const screens = ['<3h', '3-6h', '6h+'] as const;
    const freqs = ['never', 'sometimes', 'regularly'] as const;
    const waters = ['<1L', '1-2L', '2L+'] as const;
    const goals = ['energy', 'focus', 'discipline', 'confidence'] as const;
    let count = 0;
    for (const sleep of sleeps)
      for (const screen of screens)
        for (const exercise of freqs)
          for (const water of waters)
            for (const mind of freqs)
              for (const goal of goals) {
                const a = { sleep, screen, exercise, water, mind, goal };
                const plan = ids(a);
                expect(plan.length).toBeGreaterThanOrEqual(5);
                expect(plan.length).toBeLessThanOrEqual(6);
                expect(new Set(plan).size).toBe(plan.length);
                expect(plan[0]).toBe('discipline_bed');
                expect(ids(a)).toEqual(plan); // deterministic
                count++;
              }
    expect(count).toBe(972);
  });
});

describe('toPlan', () => {
  it('starts every habit at easy on day 1', () => {
    const plan = toPlan(generatePlan(base));
    expect(plan.every((h) => h.level === 'easy' && h.addedOnDay === 1 && h.levelSince === 0)).toBe(true);
  });
});
