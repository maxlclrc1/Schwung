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
const ALL = allAnswers();
const PLANS = new Map(ALL.map((a) => [a, buildPlan(a)]));

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

/** An "answer" habit may only appear when the answer for its area shows room to improve. */
const ANSWER_TRIGGERS: Record<string, (a: Answers) => boolean> = {
  sleep_bedtime: (a) => a.sleep === '<5h' || a.sleep === '5-6h' || a.sleep === '6-7h',
  sleep_no_phone_bed: (a) => a.sleep === '6-7h',
  screen_limit: (a) => a.screen === '6-8h' || a.screen === '8h+',
  screen_social: (a) => a.screen === '4-6h',
  screen_morning: (a) => a.screen === '2-4h',
  move_walk: (a) => a.exercise === 'never',
  move_steps: (a) => a.exercise === 'rarely' || (a.exercise === '1-2x' && a.goal === 'energy'),
  move_workout: (a) =>
    (a.exercise === '1-2x' && a.goal !== 'energy') ||
    ((a.exercise === 'never' || a.exercise === 'rarely') && a.goal === 'fitness'),
  water: (a) => a.water === '<0.5L' || a.water === '0.5-1L' || a.water === '1-2L',
  mind_journal: (a) => ['never', 'rarely', 'weekly'].includes(a.mind),
  mind_meditate: (a) => ['never', 'rarely', 'weekly'].includes(a.mind),
  mind_read: (a) => ['never', 'rarely', 'weekly'].includes(a.mind),
};

/** The habits that *are* each goal. */
const CORE: Record<Goal, string[]> = {
  energy: ['move_walk', 'water', 'sleep_bedtime', 'move_steps', 'sleep_wake'],
  focus: ['focus_deepwork', 'focus_top3'],
  discipline: ['discipline_cold', 'focus_top3'],
  confidence: ['confidence_talk', 'confidence_compliment'],
  calm: ['mind_meditate', 'sleep_no_phone_bed', 'move_walk'],
  fitness: ['move_workout', 'move_steps'],
};
const GOAL_WORDS: Record<Goal, RegExp> = {
  energy: /energy/i,
  focus: /focus/i,
  discipline: /discipline/i,
  confidence: /confiden/i,
  calm: /stress|calm|settle/i,
  fitness: /shape|recovery|training/i,
};

const PHONE_RULES = ['sleep_no_phone_bed', 'screen_morning', 'screen_social', 'screen_limit'];
const OVERLAPS = [
  ['move_walk', 'move_steps'],
  ['screen_morning', 'screen_social'],
];

const ids = (p: PlanPick[]) => p.map((x) => x.habit.id);
const byId = (p: PlanPick[], id: string) => p.find((x) => x.habit.id === id);

const struggling: Omit<Answers, 'goal'> = {
  sleep: '<5h',
  screen: '8h+',
  exercise: 'never',
  water: '<0.5L',
  mind: 'never',
};
const busy: Omit<Answers, 'goal'> = {
  sleep: '6-7h',
  screen: '6-8h',
  exercise: 'rarely',
  water: '1-2L',
  mind: 'rarely',
};
const student: Omit<Answers, 'goal'> = {
  sleep: '6-7h',
  screen: '4-6h',
  exercise: '1-2x',
  water: '0.5-1L',
  mind: 'weekly',
};
const healthy: Omit<Answers, 'goal'> = { sleep: '8h+', screen: '<2h', exercise: '5x+', water: '3L+', mind: 'daily' };
const athlete: Omit<Answers, 'goal'> = { sleep: '5-6h', screen: '2-4h', exercise: '5x+', water: '2-3L', mind: 'never' };

describe('answer space', () => {
  it('covers every combination the answer types allow', () => {
    const v = ANSWER_VALUES;
    const expected =
      v.sleep.length * v.screen.length * v.exercise.length * v.water.length * v.mind.length * v.goal.length;
    expect(expected).toBe(5 * 5 * 5 * 5 * 5 * 6); // 18,750
    expect(ALL).toHaveLength(expected);
  });
});

describe('plan validity, for every answer combination', () => {
  it('has 5–6 real habits, no duplicates, the foundation first', () => {
    for (const p of PLANS.values()) {
      expect(p.length).toBeGreaterThanOrEqual(5);
      expect(p.length).toBeLessThanOrEqual(6);
      expect(new Set(ids(p)).size).toBe(p.length);
      expect(p[0]).toMatchObject({ source: 'foundation' });
      expect(p[0].habit.id).toBe('discipline_bed');
      for (const x of p) expect(getHabit(x.habit.id)).toBe(x.habit);
    }
  });

  it('never assigns something the user already does regularly', () => {
    for (const [a, p] of PLANS) for (const id of alreadyDoing(a)) expect(ids(p)).not.toContain(id);
  });

  it('only gives an answer-based reason when that answer shows room to improve', () => {
    for (const [a, p] of PLANS)
      for (const x of p)
        if (x.source === 'answer') expect([x.habit.id, ANSWER_TRIGGERS[x.habit.id]?.(a)]).toEqual([x.habit.id, true]);
  });

  it('starts achievable: never hard, and only water at 4–8 glasses starts one step up', () => {
    for (const [a, p] of PLANS)
      for (const x of p) expect(x.level).toBe(x.habit.id === 'water' && a.water === '1-2L' ? 'medium' : 'easy');
  });

  it('is deterministic', () => {
    for (const a of ALL.slice(0, 3000)) expect(buildPlan(a)).toEqual(PLANS.get(a));
  });
});

describe('relevance: the goal shapes the actual plan', () => {
  it('always includes a core habit for the goal when one is available', () => {
    for (const [a, p] of PLANS) {
      const available = CORE[a.goal].filter((id) => !alreadyDoing(a).includes(id));
      if (!available.length) continue;
      expect([a, ids(p).some((id) => CORE[a.goal].includes(id))]).toEqual([a, true]);
    }
  });

  it('marks at least one habit as serving the goal, and lists goal habits right after the foundation', () => {
    for (const p of PLANS.values()) {
      expect(p.some((x) => x.forGoal)).toBe(true);
      const firstOther = p.findIndex((x, i) => i > 0 && !x.forGoal);
      const lastGoal = p.map((x) => x.forGoal).lastIndexOf(true);
      if (firstOther !== -1) expect(lastGoal).toBeLessThan(firstOther);
    }
  });

  it('changes the plan when only the goal changes (at least 4 distinct plans across 6 goals, for every answer set)', () => {
    const groups = new Map<string, Set<string>>();
    for (const [a, p] of PLANS) {
      const k = [a.sleep, a.screen, a.exercise, a.water, a.mind].join('|');
      const set = groups.get(k) ?? new Set<string>();
      set.add([...ids(p)].sort().join(','));
      groups.set(k, set);
    }
    expect(groups.size).toBe(3125);
    for (const set of groups.values()) expect(set.size).toBeGreaterThanOrEqual(4);
  });

  it('keeps generic filler rare: at most 2 per plan, and under 5% of plans have any', () => {
    let withFiller = 0;
    for (const p of PLANS.values()) {
      const n = p.filter((x) => x.source === 'complement').length;
      expect(n).toBeLessThanOrEqual(2);
      if (n) withFiller++;
    }
    expect(withFiller / PLANS.size).toBeLessThan(0.05);
  });
});

describe('coherence', () => {
  it('never pairs habits that are really the same practice', () => {
    for (const p of PLANS.values())
      for (const [x, y] of OVERLAPS) expect(ids(p).includes(x) && ids(p).includes(y)).toBe(false);
  });

  it('has at most two phone rules', () => {
    for (const p of PLANS.values())
      expect(ids(p).filter((id) => PHONE_RULES.includes(id)).length).toBeLessThanOrEqual(2);
  });

  it('has at most two mind habits and at most two movement habits', () => {
    for (const p of PLANS.values()) {
      expect(ids(p).filter((id) => id.startsWith('mind_')).length).toBeLessThanOrEqual(2);
      expect(ids(p).filter((id) => id.startsWith('move_')).length).toBeLessThanOrEqual(2);
    }
  });
});

describe('transparency: reasons', () => {
  it('gives every habit its own specific reason, with no repeated openers or old filler phrasing', () => {
    for (const p of PLANS.values()) {
      const reasons = p.map((x) => x.reason);
      expect(new Set(reasons).size).toBe(reasons.length);
      expect(new Set(reasons.map((r) => r.slice(0, 24))).size).toBe(reasons.length);
      for (const r of reasons) {
        expect(r.trim().length).toBeGreaterThan(20);
        expect(r).not.toMatch(/^For your goal of|Rounds out your plan|quiz didn’t cover/);
      }
    }
  });

  it('ties the goal to a habit in plain words whenever no habit was added just for it', () => {
    for (const [a, p] of PLANS) {
      if (p.some((x) => x.source === 'goal')) continue;
      expect([a, p.filter((x) => x.forGoal).some((x) => GOAL_WORDS[a.goal].test(x.reason))]).toEqual([a, true]);
    }
  });

  it('quotes the answer given', () => {
    expect(byId(buildPlan({ ...healthy, sleep: '<5h', goal: 'focus' }), 'sleep_bedtime')!.reason).toContain(
      'less than 5 hours',
    );
    expect(byId(buildPlan({ ...healthy, screen: '8h+', goal: 'focus' }), 'screen_limit')!.reason).toContain(
      'more than 8 hours',
    );
    expect(byId(buildPlan({ ...healthy, water: '0.5-1L', goal: 'focus' }), 'water')!.reason).toContain('2–4 glasses');
  });
});

describe('representative users', () => {
  it('struggling everywhere: every goal keeps its core habit, and the heaviest problems stay', () => {
    for (const goal of ANSWER_VALUES.goal) {
      const p = ids(buildPlan({ ...struggling, goal }));
      expect(p).toHaveLength(6);
      expect(p.some((id) => CORE[goal].includes(id))).toBe(true);
      expect(p).toEqual(expect.arrayContaining(['sleep_bedtime', 'water', 'screen_limit']));
    }
    expect(ids(buildPlan({ ...struggling, goal: 'focus' }))).toContain('focus_deepwork');
    expect(ids(buildPlan({ ...struggling, goal: 'calm' }))).toContain('mind_meditate');
    expect(ids(buildPlan({ ...struggling, goal: 'fitness' }))).toContain('move_workout');
  });

  it('busy professional: fitness gets a workout, calm gets a wind-down, and goals differ', () => {
    expect(ids(buildPlan({ ...busy, goal: 'fitness' }))).toContain('move_workout');
    expect(ids(buildPlan({ ...busy, goal: 'calm' }))).toEqual(
      expect.arrayContaining(['sleep_no_phone_bed', 'mind_meditate']),
    );
    // With a screen cap already in the plan, non-calm goals don't get a second phone rule at night.
    expect(ids(buildPlan({ ...busy, goal: 'focus' }))).not.toContain('sleep_no_phone_bed');
    const plans = new Set(ANSWER_VALUES.goal.map((goal) => [...ids(buildPlan({ ...busy, goal }))].sort().join()));
    expect(plans.size).toBe(6);
  });

  it('student: energy, calm and fitness no longer produce the same plan', () => {
    const [energy, calm, fitness] = (['energy', 'calm', 'fitness'] as const).map((goal) =>
      [...ids(buildPlan({ ...student, goal }))].sort().join(),
    );
    expect(new Set([energy, calm, fitness]).size).toBe(3);
  });

  it('healthy user: goal habits first, nothing they already do', () => {
    const calm = buildPlan({ ...healthy, goal: 'calm' });
    expect(ids(calm).slice(1, 3)).toEqual(['sleep_no_phone_bed', 'focus_top3']);
    const fitness = ids(buildPlan({ ...healthy, goal: 'fitness' }));
    expect(fitness).not.toContain('move_workout');
    expect(fitness).toContain('move_steps');
  });

  it('athlete who sleeps too little: no extra training, sleep comes first', () => {
    const p = ids(buildPlan({ ...athlete, goal: 'fitness' }));
    expect(p).not.toContain('move_workout');
    expect(p).toContain('sleep_bedtime');
  });

  it('discipline gets the cold finish even though the foundation is also a discipline habit', () => {
    expect(byId(buildPlan({ ...healthy, goal: 'discipline' }), 'discipline_cold')?.source).toBe('goal');
    expect(byId(buildPlan({ ...struggling, goal: 'discipline' }), 'discipline_cold')?.source).toBe('goal');
  });

  it('a full plan drops the mildest non-goal area, never the core goal habit', () => {
    // Water is the mildest answer here, so it gives way to deep work.
    const p = ids(buildPlan({ ...struggling, water: '1-2L', goal: 'focus' }));
    expect(p).toContain('focus_deepwork');
    expect(p).not.toContain('water');
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
    const a = { ...struggling, goal: 'energy' as const };
    expect(generatePlan(a)).toEqual(buildPlan(a).map((x) => x.habit));
  });

  it('toPlan keeps each pick’s starting level and order', () => {
    const picks = buildPlan({ ...healthy, water: '1-2L', goal: 'focus' });
    const plan = toPlan(picks);
    expect(plan.map((h) => h.habitId)).toEqual(ids(picks));
    expect(plan.find((h) => h.habitId === 'water')!.level).toBe('medium');
    expect(plan.every((h) => h.addedOnDay === 1 && h.levelSince === 0)).toBe(true);
  });
});
