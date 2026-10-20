import { describe, expect, it } from '@jest/globals';
import { getHabit } from '../habits';
import { buildPlan, generatePlan, PlanPick, toPlan } from '../plan';
import { ANSWER_VALUES, type Answers, type Goal } from '../types';

// Expectations below are written independently of plan.ts, from the product rules.

/** Every answer combination the types allow, derived from the same source lists. */
function allAnswers(): Answers[] {
  const out: Answers[] = [];
  const v = ANSWER_VALUES;
  for (const sleep of v.sleep)
    for (const screen of v.screen)
      for (const exercise of v.exercise)
        for (const water of v.water)
          for (const mind of v.mind)
            for (const goal of v.goal) out.push({ sleep, screen, exercise, water, mind, goal });
  return out;
}

/** Habits the user says they already do (or don't need), which must never be assigned. */
function alreadyDoing(a: Answers): string[] {
  const out: string[] = [];
  if (a.exercise === '3-4x' || a.exercise === '5x+') out.push('move_walk', 'move_workout');
  if (a.water === '2-3L' || a.water === '3L+') out.push('water');
  if (a.mind === 'most-days' || a.mind === 'daily') out.push('mind_read', 'mind_meditate', 'mind_journal');
  if (a.sleep === '7-8h' || a.sleep === '8h+') out.push('sleep_bedtime');
  if (a.screen === '<2h') out.push('screen_limit', 'screen_social', 'screen_morning');
  return out;
}

/** An "answer" habit may only appear for the answers that call for it. */
const ANSWER_TRIGGERS: Record<string, (a: Answers) => boolean> = {
  sleep_bedtime: (a) => a.sleep === '<5h' || a.sleep === '5-6h',
  sleep_no_phone_bed: (a) => a.sleep === '6-7h',
  screen_limit: (a) => a.screen === '6-8h' || a.screen === '8h+',
  screen_social: (a) => a.screen === '4-6h',
  screen_morning: (a) => a.screen === '2-4h',
  move_walk: (a) => a.exercise === 'never',
  move_steps: (a) => a.exercise === 'rarely',
  move_workout: (a) => a.exercise === '1-2x',
  water: (a) => a.water === '<0.5L' || a.water === '0.5-1L' || a.water === '1-2L',
  mind_journal: (a) => a.mind === 'never',
  mind_meditate: (a) => a.mind === 'rarely',
  mind_read: (a) => a.mind === 'weekly',
};

const GOAL_SUITABLE: Record<Goal, string[]> = {
  energy: ['move_walk', 'water', 'sleep_wake', 'move_steps'],
  focus: ['focus_deepwork', 'focus_top3'],
  discipline: ['discipline_cold', 'focus_top3'],
  confidence: ['confidence_talk', 'confidence_compliment'],
  calm: ['mind_meditate', 'sleep_no_phone_bed', 'mind_journal'],
  fitness: ['move_workout', 'move_steps'],
};

const ids = (p: PlanPick[]) => p.map((x) => x.habit.id);
const byId = (p: PlanPick[], id: string) => p.find((x) => x.habit.id === id);

const struggling: Answers = {
  sleep: '<5h',
  screen: '8h+',
  exercise: 'never',
  water: '<0.5L',
  mind: 'never',
  goal: 'energy',
};
const healthy: Answers = { sleep: '8h+', screen: '<2h', exercise: '5x+', water: '3L+', mind: 'daily', goal: 'focus' };

describe('answer space', () => {
  it('covers every combination the answer types allow', () => {
    const v = ANSWER_VALUES;
    const expected =
      v.sleep.length * v.screen.length * v.exercise.length * v.water.length * v.mind.length * v.goal.length;
    expect(expected).toBe(5 * 5 * 5 * 5 * 5 * 6); // 18,750
    expect(allAnswers()).toHaveLength(expected);
  });

  it('has six goals', () => {
    expect([...ANSWER_VALUES.goal]).toEqual(['energy', 'focus', 'discipline', 'confidence', 'calm', 'fitness']);
  });
});

describe('buildPlan invariants, for every answer combination', () => {
  const all = allAnswers();

  it('has 5–6 habits, no duplicates, the foundation first, all real habits', () => {
    for (const a of all) {
      const p = buildPlan(a);
      expect(p.length).toBeGreaterThanOrEqual(5);
      expect(p.length).toBeLessThanOrEqual(6);
      expect(new Set(ids(p)).size).toBe(p.length);
      expect(p[0].habit.id).toBe('discipline_bed');
      expect(p[0].source).toBe('foundation');
      for (const x of p) expect(getHabit(x.habit.id)).toBe(x.habit);
    }
  });

  it('never assigns something the user already does regularly', () => {
    for (const a of all) {
      const plan = ids(buildPlan(a));
      for (const id of alreadyDoing(a)) expect(plan).not.toContain(id);
    }
  });

  it('only claims an answer-based reason when the answer actually calls for it', () => {
    for (const a of all) {
      for (const x of buildPlan(a)) {
        if (x.source !== 'answer') continue;
        expect(ANSWER_TRIGGERS[x.habit.id]?.(a)).toBe(true);
      }
    }
  });

  it('represents the goal whenever a suitable habit exists', () => {
    for (const a of all) {
      const p = buildPlan(a);
      const suitable = GOAL_SUITABLE[a.goal].filter((id) => !alreadyDoing(a).includes(id));
      if (!suitable.length) continue;
      const carrying = p.filter((x) => suitable.includes(x.habit.id));
      expect(carrying.length).toBeGreaterThan(0);
      // Either a goal pick, or an existing habit whose reason says it serves the goal.
      expect(carrying.some((x) => x.source === 'goal' || x.reason.includes('your goal of'))).toBe(true);
    }
  });

  it('every goal can be represented for every answer set (no goal is ever impossible)', () => {
    for (const a of all) {
      const suitable = GOAL_SUITABLE[a.goal].filter((id) => !alreadyDoing(a).includes(id));
      expect(suitable.length).toBeGreaterThan(0);
    }
  });

  it('gives every habit a non-empty reason that matches its source', () => {
    for (const a of all) {
      for (const x of buildPlan(a)) {
        expect(x.reason.trim().length).toBeGreaterThan(20);
        expect(['foundation', 'answer', 'goal', 'complement']).toContain(x.source);
        if (x.source === 'goal') expect(x.reason.startsWith('For your goal of')).toBe(true);
        if (x.source === 'complement') expect(x.reason).toContain('the quiz didn’t cover');
      }
    }
  });

  it('starts achievable: never hard, and only water at 4–8 glasses starts one step up', () => {
    for (const a of all) {
      for (const x of buildPlan(a)) {
        expect(x.level).not.toBe('hard');
        const expected = x.habit.id === 'water' && a.water === '1-2L' ? 'medium' : 'easy';
        expect(x.level).toBe(expected);
      }
    }
  });

  it('is deterministic', () => {
    for (const a of all) expect(buildPlan(a)).toEqual(buildPlan(a));
  });

  it('includes a habit for every area with room to improve, unless the plan is full', () => {
    for (const a of all) {
      const p = buildPlan(a);
      const triggered = Object.entries(ANSWER_TRIGGERS).filter(([, t]) => t(a)).length;
      const answerPicks = p.filter((x) => x.source === 'answer').length;
      if (triggered <= 4) expect(answerPicks).toBe(triggered);
      else expect(answerPicks).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('buildPlan examples', () => {
  it('struggling everywhere: keeps the goal habit and drops the least foundational area', () => {
    for (const goal of ['focus', 'discipline', 'confidence', 'fitness'] as const) {
      const p = buildPlan({ ...struggling, goal });
      expect(p).toHaveLength(6);
      expect(p[5].source).toBe('goal');
      expect(GOAL_SUITABLE[goal]).toContain(p[5].habit.id);
      // All areas are equally severe here, so mind (least foundational) gives way.
      expect(ids(p)).not.toContain('mind_journal');
      expect(ids(p)).toEqual(expect.arrayContaining(['sleep_bedtime', 'move_walk', 'water', 'screen_limit']));
    }
  });

  it('drops the least severe area, not a fixed one', () => {
    // Mind is the worst answer here; water is the mildest, so water goes.
    const p = buildPlan({ ...struggling, water: '1-2L', goal: 'focus' });
    expect(ids(p)).not.toContain('water');
    expect(ids(p)).toContain('mind_journal');
    expect(ids(p)).toContain('focus_deepwork');
  });

  it('energy with walk and water already in a full plan: no extra habit, the walk carries the goal', () => {
    const p = buildPlan(struggling);
    expect(ids(p)).toEqual(['discipline_bed', 'sleep_bedtime', 'move_walk', 'water', 'screen_limit', 'mind_journal']);
    expect(byId(p, 'move_walk')!.reason).toContain('your goal of more energy');
  });

  it('energy with walk and water present and room left: adds a different energy habit', () => {
    const p = buildPlan({ ...healthy, exercise: 'never', water: '<0.5L', goal: 'energy' });
    expect(ids(p)).toEqual(expect.arrayContaining(['move_walk', 'water']));
    const goalPicks = p.filter((x) => x.source === 'goal').map((x) => x.habit.id);
    expect(goalPicks.length).toBeGreaterThan(0);
    for (const id of goalPicks) expect(['sleep_wake', 'move_steps']).toContain(id);
  });

  it('healthy everywhere: no repeats of what they already do, fills with goal and new habits', () => {
    for (const goal of ANSWER_VALUES.goal) {
      const p = buildPlan({ ...healthy, goal });
      expect(p).toHaveLength(5);
      for (const id of ['move_walk', 'move_workout', 'water', 'mind_read', 'mind_meditate', 'mind_journal'])
        expect(ids(p)).not.toContain(id);
      expect(p.some((x) => x.source === 'goal')).toBe(true);
      expect(p.every((x) => x.source !== 'answer')).toBe(true);
    }
  });

  it('healthy fitness goal gets daily steps, not another workout', () => {
    const p = buildPlan({ ...healthy, goal: 'fitness' });
    expect(byId(p, 'move_steps')?.source).toBe('goal');
    expect(ids(p)).not.toContain('move_workout');
  });

  it('calm goal for someone who already meditates/reads/journals daily avoids mind habits', () => {
    const p = buildPlan({ ...healthy, goal: 'calm' });
    expect(byId(p, 'sleep_no_phone_bed')?.source).toBe('goal');
  });

  it('discipline goal gets the cold shower even though the foundation is also a discipline habit', () => {
    expect(byId(buildPlan({ ...healthy, goal: 'discipline' }), 'discipline_cold')?.source).toBe('goal');
    expect(byId(buildPlan({ ...struggling, goal: 'discipline' }), 'discipline_cold')?.source).toBe('goal');
  });

  it('maps each middle answer to its own habit with an honest reason', () => {
    const p = buildPlan({
      sleep: '6-7h',
      screen: '4-6h',
      exercise: 'rarely',
      water: '1-2L',
      mind: 'weekly',
      goal: 'confidence',
    });
    expect(ids(p)).toEqual([
      'discipline_bed',
      'sleep_no_phone_bed',
      'move_steps',
      'water',
      'screen_social',
      'confidence_talk',
    ]);
    expect(byId(p, 'water')!.level).toBe('medium');
    expect(byId(p, 'sleep_no_phone_bed')!.reason).toContain('6–7 hours');
  });

  it('reasons quote the answer given', () => {
    expect(byId(buildPlan({ ...healthy, sleep: '<5h' }), 'sleep_bedtime')!.reason).toContain('less than 5 hours');
    expect(byId(buildPlan({ ...healthy, sleep: '5-6h' }), 'sleep_bedtime')!.reason).toContain('5–6 hours');
    expect(byId(buildPlan({ ...healthy, screen: '8h+' }), 'screen_limit')!.reason).toContain('more than 8 hours');
    expect(byId(buildPlan({ ...healthy, water: '0.5-1L' }), 'water')!.reason).toContain('2–4 glasses');
  });

  it('every supported answer value appears in some plan with its expected habit', () => {
    for (const [id, trigger] of Object.entries(ANSWER_TRIGGERS)) {
      const a = allAnswers().find(trigger)!;
      // Use otherwise-healthy answers so the area habit can't be dropped.
      const probe = { ...healthy, goal: 'confidence' as const };
      const key = (Object.keys(ANSWER_VALUES) as (keyof Answers)[]).find((k) => {
        const b = { ...probe, [k]: a[k] } as Answers;
        return trigger(b);
      })!;
      const p = buildPlan({ ...probe, [key]: a[key] } as Answers);
      expect(byId(p, id)?.source).toBe('answer');
    }
  });
});

describe('starting targets', () => {
  it('uses achievable first steps for water, screen time, and sleep', () => {
    expect(getHabit('water')!.levels.easy).toContain('4 glasses');
    expect(getHabit('screen_limit')!.levels.easy).toBe('Under 7h screen time');
    expect(getHabit('sleep_bedtime')!.levels.easy).toBe('In bed 30 minutes earlier than usual');
  });
});

describe('generatePlan / toPlan', () => {
  it('generatePlan returns the same habits as buildPlan', () => {
    expect(generatePlan(struggling)).toEqual(buildPlan(struggling).map((x) => x.habit));
  });

  it('toPlan keeps each pick’s starting level', () => {
    const plan = toPlan(buildPlan({ ...healthy, water: '1-2L' }));
    expect(plan.find((h) => h.habitId === 'water')!.level).toBe('medium');
    expect(plan.every((h) => h.addedOnDay === 1 && h.levelSince === 0)).toBe(true);
  });
});
