import { describe, expect, it } from '@jest/globals';
import { generatePlan, toPlan } from '../plan';
import type { Answers } from '../types';

const ids = (a: Answers) => generatePlan(a).map((h) => h.id);

const base: Answers = {
  sleep: '8h+',
  screen: '<2h',
  exercise: '5x+',
  water: '3L+',
  mind: 'daily',
  goal: 'focus',
};

const struggling: Answers = {
  sleep: '<5h',
  screen: '8h+',
  exercise: 'never',
  water: '<0.5L',
  mind: 'never',
  goal: 'energy',
};

describe('generatePlan', () => {
  it('builds a plan for someone struggling everywhere (energy goal)', () => {
    expect(ids(struggling)).toEqual([
      'discipline_bed',
      'sleep_bedtime',
      'screen_limit',
      'move_walk',
      'water',
      'mind_journal',
    ]);
  });

  it('fills up to 5 for someone already doing well', () => {
    expect(ids(base)).toEqual(['discipline_bed', 'focus_deepwork', 'mind_read', 'water', 'move_walk']);
  });

  it('maps middle answers to their own habits', () => {
    expect(
      ids({ sleep: '7-8h', screen: '4-6h', exercise: 'rarely', water: '1-2L', mind: 'rarely', goal: 'confidence' }),
    ).toEqual(['discipline_bed', 'sleep_wake', 'screen_social', 'move_steps', 'water', 'mind_meditate']);
  });

  it('maps the gentler middle answers', () => {
    expect(
      ids({ sleep: '6-7h', screen: '2-4h', exercise: '1-2x', water: '2-3L', mind: 'weekly', goal: 'focus' }),
    ).toEqual([
      'discipline_bed',
      'sleep_no_phone_bed',
      'screen_morning',
      'move_workout',
      'mind_read',
      'focus_deepwork',
    ]);
  });

  it('energy goal adds a walk when there is none', () => {
    expect(ids({ ...base, goal: 'energy' })).toContain('move_walk');
  });

  it('energy goal adds water when a walk is already in the plan', () => {
    expect(ids({ ...base, exercise: 'never', goal: 'energy' })).toEqual(expect.arrayContaining(['move_walk', 'water']));
  });

  it('calm goal adds breathing, or journaling if breathing is already there', () => {
    expect(ids({ ...base, goal: 'calm' })).toContain('mind_meditate');
    expect(ids({ ...base, mind: 'rarely', goal: 'calm' })).toEqual(
      expect.arrayContaining(['mind_meditate', 'mind_journal']),
    );
  });

  it('fitness goal adds a workout, or steps if a workout is already there', () => {
    expect(ids({ ...base, goal: 'fitness' })).toContain('move_workout');
    expect(ids({ ...base, exercise: '1-2x', goal: 'fitness' })).toEqual(
      expect.arrayContaining(['move_workout', 'move_steps']),
    );
  });

  it('drops the discipline extra first when over 6', () => {
    const plan = ids({ ...struggling, exercise: '1-2x', goal: 'discipline' });
    expect(plan).toHaveLength(6);
    expect(plan).not.toContain('discipline_cold');
    expect(plan).toContain('discipline_bed');
  });

  it('drops the confidence extra first when over 6', () => {
    const plan = ids({ ...struggling, goal: 'confidence' });
    expect(plan).toHaveLength(6);
    expect(plan).not.toContain('confidence_talk');
  });

  it('drops from the bottom of the list when there is no extra to drop', () => {
    expect(ids({ ...struggling, exercise: '1-2x', goal: 'focus' })).toEqual([
      'discipline_bed',
      'sleep_bedtime',
      'screen_limit',
      'move_workout',
      'water',
      'mind_journal',
    ]);
  });

  it('holds its invariants for every possible answer combination', () => {
    const sleeps = ['<5h', '5-6h', '6-7h', '7-8h', '8h+'] as const;
    const screens = ['<2h', '2-4h', '4-6h', '6-8h', '8h+'] as const;
    const exercises = ['never', 'rarely', '1-2x', '3-4x', '5x+'] as const;
    const waters = ['<0.5L', '0.5-1L', '1-2L', '2-3L', '3L+'] as const;
    const minds = ['never', 'rarely', 'weekly', 'most-days', 'daily'] as const;
    const goals = ['energy', 'focus', 'discipline', 'confidence', 'calm', 'fitness'] as const;
    let count = 0;
    for (const sleep of sleeps)
      for (const screen of screens)
        for (const exercise of exercises)
          for (const water of waters)
            for (const mind of minds)
              for (const goal of goals) {
                const a = { sleep, screen, exercise, water, mind, goal };
                const plan = ids(a);
                expect(plan.length).toBeGreaterThanOrEqual(5);
                expect(plan.length).toBeLessThanOrEqual(6);
                expect(new Set(plan).size).toBe(plan.length);
                expect(plan[0]).toBe('discipline_bed');
                count++;
              }
    expect(count).toBe(5 ** 5 * 6);
  });
});

describe('toPlan', () => {
  it('starts every habit at easy on day 1', () => {
    const plan = toPlan(generatePlan(base));
    expect(plan.every((h) => h.level === 'easy' && h.addedOnDay === 1 && h.levelSince === 0)).toBe(true);
  });
});
