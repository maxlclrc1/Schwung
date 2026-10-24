import { describe, expect, it } from '@jest/globals';
import { ACTIVE_NOTE, exclusion, fitsPlan, generatePlanV2, needs, UNDER_16_MESSAGE } from '../engine';
import { DEV_CLEARED } from '../gate';
import { BY_ID, LIBRARY } from '../library';
import {
  assemblePlan,
  canChoose,
  pendingTimeQuestion,
  previewPlan,
  repairSpec,
  swapChoices,
  swappedHabit,
  type PreviewPlan,
} from '../program';
import { QUESTIONS_V2, toProfile, visibleQuestions, type Draft } from '../quiz';
import type { ProfileV2 } from '../types';
import { FIXTURES } from './fixtures';
import { sample } from './sample';

// Node built-ins, available under Jest (the app itself has no Node types).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as {
  readdirSync(dir: string): string[];
  readFileSync(file: string, encoding: 'utf8'): string;
  statSync(path: string): { isDirectory(): boolean };
};
const join = (...parts: string[]) => parts.join('/');
const SRC = join(process.cwd(), 'src');

type Ok = Extract<PreviewPlan, { status: 'ok' }>;
const ok = (p: ProfileV2): Ok => {
  const r = previewPlan(p);
  if (r.status !== 'ok') throw new Error('expected a plan');
  return r;
};
const ids = (r: Ok) => r.picks.map((x) => x.id);

/** The 12 habits the owner cleared for development testing, and nothing else. */
const CLEARED = [
  'discipline_bed',
  'sleep_wake',
  'sleep_morning_light',
  'screen_morning',
  'screen_social',
  'screen_app_limit',
  'mind_read',
  'focus_deepwork',
  'focus_top3',
  'social_reach_out',
  'confidence_compliment',
  'mind_journal',
];

/** Picks the first n choices that fit together, as a person tapping down the list would. */
function choose(r: Ok, n: number): string[] {
  const chosen: string[] = [];
  for (const o of r.options) if (chosen.length < n && canChoose(r, chosen, o.id)) chosen.push(o.id);
  return chosen;
}

describe('release gate', () => {
  it('clears exactly the 12 approved habits', () => {
    expect([...DEV_CLEARED].sort()).toEqual([...CLEARED].sort());
  });

  it('never clears a held habit or one pending review', () => {
    for (const id of ['move_balance', 'move_strength_session', 'move_seated', 'move_strength_prep']) {
      expect(DEV_CLEARED.has(id)).toBe(false);
    }
    for (const id of [
      'move_walk',
      'sleep_bedtime',
      'sleep_no_phone_bed',
      'food_produce',
      'food_unsweetened',
      'food_water_meals',
      'mind_breathe',
      'confidence_talk',
    ]) {
      expect(DEV_CLEARED.has(id)).toBe(false);
    }
    for (const id of DEV_CLEARED) expect(BY_ID[id].release).toBe('candidate');
  });

  it('offers only cleared habits in plans, choices and swaps, across the answer space', () => {
    for (const p of sample(6000)) {
      const r = previewPlan(p);
      if (r.status !== 'ok') continue;
      // With today's gate, reviewed habits always reach the minimum of 3.
      expect(r.blocked).toBe(false);
      const offered = [...ids(r), ...r.options.map((o) => o.id)];
      for (const id of offered) expect(DEV_CLEARED.has(id)).toBe(true);
      for (const id of ids(r).slice(1)) {
        const plan = assemblePlan(p, choose(r, r.choice?.required ?? 0));
        if (!plan) continue;
        for (const s of swapChoices(p, plan, id)) expect(DEV_CLEARED.has(s.id)).toBe(true);
      }
    }
  });

  it('every offered habit is still eligible for the person without the gate (the gate only removes)', () => {
    for (const p of sample(3000)) {
      const r = previewPlan(p);
      if (r.status !== 'ok') continue;
      for (const id of [...ids(r), ...r.options.map((o) => o.id)]) expect(exclusion(BY_ID[id], p)).toBeNull();
    }
  });

  it('never fills a plan with something unrelated: each habit is for the goal or a need of 2+', () => {
    for (const p of sample(4000)) {
      const r = generatePlanV2(p, DEV_CLEARED);
      if (r.status !== 'ok') continue;
      const n = needs(p);
      for (const x of r.picks.slice(1)) {
        const d = BY_ID[x.id].domain as keyof typeof n;
        expect(x.forGoal || (d in n && n[d] >= 2)).toBe(true);
      }
    }
  });
});

describe('the eight established profiles through the development preview', () => {
  for (const [name, p] of Object.entries(FIXTURES)) {
    it(`${name}: a valid, gated plan that can be started`, () => {
      const r = ok(p);
      expect(ids(r)[0]).toBe('discipline_bed');
      for (const id of ids(r)) expect(DEV_CLEARED.has(id)).toBe(true);
      expect(r.blocked).toBe(false);
      const plan = assemblePlan(p, choose(r, r.choice?.required ?? 0));
      expect(plan).not.toBeNull();
      expect(plan!.length).toBeGreaterThanOrEqual(3);
      for (const h of plan!) {
        expect(h.level).toBe('easy');
        expect(h.spec?.targets.easy && h.spec.targets.medium && h.spec.targets.hard).toBeTruthy();
      }
    });
  }

  it('A (16, focus): teen deep-work cap, no drinks habit, limitation names what was withheld', () => {
    const r = ok(FIXTURES['A · 16, focus']);
    expect(ids(r)).toContain('focus_deepwork');
    expect(r.picks.find((x) => x.id === 'focus_deepwork')!.targets.hard).not.toMatch(/90 min/);
    expect(ids(r)).not.toContain('food_unsweetened');
    expect(r.limitation).toMatch(/Development preview: .*Walk.*waiting for scientific review/);
  });

  it('F (67, fitness): no movement habit is invented; the plan needs a choice and says why', () => {
    const r = ok(FIXTURES['F · 67, fitness']);
    expect(ids(r).some((id) => BY_ID[id].domain === 'activity')).toBe(false);
    expect(r.choice?.required).toBeGreaterThan(0);
    expect(r.limitation).toMatch(/Walk would suit your answers/);
    expect(r.options.some((o) => BY_ID[o.id].domain === 'activity')).toBe(false);
  });

  it('G1 (healthy, fitness, active 5+ days): the already-training copy, no strength preparation', () => {
    const r = ok(FIXTURES['G1 · healthy, fitness']);
    expect(r.planNotes).toContain(ACTIVE_NOTE);
    expect(r.planNotes.join(' ')).not.toMatch(/None of our current fitness habits/);
    expect(r.options.map((o) => o.id)).not.toContain('move_strength_prep');
    expect(exclusion(BY_ID.move_strength_prep, FIXTURES['G1 · healthy, fitness'])).toMatch(/already active/);
  });
});

describe('fitness copy', () => {
  const base = FIXTURES['G1 · healthy, fitness'];

  it('uses the approved wording for people already active 3+ days', () => {
    expect(ACTIVE_NOTE).toBe(
      'You already have a strong activity routine. Let’s focus on the other changes that matter to you.',
    );
    for (const activeDays of ['3_4', '5p'] as const) {
      const r = generatePlanV2({ ...base, activeDays, routines: [...base.routines, 'walk'] });
      if (r.status !== 'ok') throw new Error();
      expect(r.planNotes).toContain(ACTIVE_NOTE);
    }
  });

  it('never recommends strength preparation to people already active most days', () => {
    for (const p of sample(3000).filter((x) => x.activeDays === '3_4' || x.activeDays === '5p')) {
      const r = generatePlanV2(p);
      if (r.status !== 'ok') continue;
      expect(r.choice?.alternatives.map((a) => a.id) ?? []).not.toContain('move_strength_prep');
      expect(
        swapChoicesFull(
          p,
          r.picks.map((x) => x.id),
        ),
      ).not.toContain('move_strength_prep');
    }
  });
});

const swapChoicesFull = (p: ProfileV2, planIds: string[]) =>
  LIBRARY.filter((h) => h.mode !== 'foundation' && exclusion(h, p) === null && fitsPlan(h.id, planIds)).map(
    (h) => h.id,
  );

describe('choice step', () => {
  const four = FIXTURES['E · 45, discipline'];
  const one = FIXTURES['G1 · healthy, fitness'];

  it('four habits: an optional "one more", at most one choice, keeping four is allowed', () => {
    const r = ok({ ...four, wake: { kind: 'time', time: '07:00' } });
    expect(r.picks).toHaveLength(4);
    expect(r.choice).toMatchObject({ required: 0, optional: true });
    expect(r.choice!.ruleNote).toBe('With 4 habits, a day counts when all 4 are done. With 5, one can slip.');
    const p = { ...four, wake: { kind: 'time' as const, time: '07:00' } };
    expect(assemblePlan(p, [])).toHaveLength(4);
    expect(assemblePlan(p, [r.options[0].id])).toHaveLength(5);
    expect(canChoose(r, [r.options[0].id], r.options[1].id)).toBe(false);
    expect(assemblePlan(p, [r.options[0].id, r.options[1].id])).toBeNull();
  });

  it('one habit: two mandatory choices; fewer, more, or unknown ids are refused', () => {
    const p = { ...one, wake: { kind: 'time' as const, time: '07:00' } };
    const r = ok(p);
    expect(r.picks).toHaveLength(1);
    expect(r.choice).toMatchObject({ required: 2, optional: false });
    expect(r.choice!.ruleNote).toMatch(/Plans need at least 3 habits, so choose 2 more/);
    const [a, b, c] = r.options.map((o) => o.id);
    expect(assemblePlan(p, [])).toBeNull();
    expect(assemblePlan(p, [a])).toBeNull();
    expect(assemblePlan(p, [a, b])).toHaveLength(3);
    expect(assemblePlan(p, [a, b, c])).toBeNull();
    expect(assemblePlan(p, [a, 'move_walk'])).toBeNull();
    expect(assemblePlan(p, [a, a])).toBeNull();
  });

  it('two choices that conflict with each other are never both allowed', () => {
    for (const p of sample(3000)) {
      const r = previewPlan(p);
      if (r.status !== 'ok' || !r.choice || r.choice.required < 2) continue;
      for (const x of r.options) {
        for (const y of r.options) {
          if (x.id === y.id || !canChoose(r, [x.id], y.id)) continue;
          expect(fitsPlan(y.id, [...ids(r), x.id])).toBe(true);
        }
      }
    }
  });

  it('shows an honest limitation and blocks the start when reviewed habits cannot reach 3', () => {
    const tiny = new Set(['discipline_bed', 'mind_read']);
    const p = { ...one, wake: { kind: 'time' as const, time: '07:00' } };
    const r = previewPlan(p, tiny);
    if (r.status !== 'ok') throw new Error();
    expect(r.blocked).toBe(true);
    expect(r.limitation).toMatch(/aren’t enough reviewed habits/);
  });
});

describe('personal targets', () => {
  it('Easy, Medium and Hard are consecutive rungs of the personal ladder, starting at the baseline', () => {
    for (const p of sample(2000)) {
      const r = previewPlan(p);
      if (r.status !== 'ok') continue;
      for (const x of r.picks) {
        const ladder = BY_ID[x.id].ladder(p);
        const s = BY_ID[x.id].start(p)!;
        expect([x.targets.easy, x.targets.medium, x.targets.hard]).toEqual(ladder.slice(s, s + 3));
      }
    }
  });

  it('adapts to the person: wake time, phone pull, focus reading start', () => {
    const c = FIXTURES['C · 28, energy'];
    const r = ok(c);
    expect(r.picks.find((x) => x.id === 'sleep_wake')!.targets.easy).toBe('Up within 60 min of 07:00');
    expect(r.picks.find((x) => x.id === 'screen_app_limit')!.targets).toEqual({
      easy: 'Videos under 60 min today',
      medium: 'Videos under 45 min today',
      hard: 'Videos under 30 min today',
    });
  });

  it('teens get the teen deep-work ladder; adults the adult one', () => {
    const teen = BY_ID.focus_deepwork.ladder(FIXTURES['A · 16, focus']);
    const adult = BY_ID.focus_deepwork.ladder(FIXTURES['E · 45, discipline']);
    expect(teen[teen.length - 1]).toMatch(/^60 min/);
    expect(adult[adult.length - 1]).toMatch(/^90 min/);
  });
});

describe('swaps', () => {
  const p = FIXTURES['C · 28, energy'];

  it('start at Easy of the personal window, whatever the phase', () => {
    const plan = assemblePlan(p, [])!;
    const h = swappedHabit(p, plan, 'screen_morning', swapChoices(p, plan, 'screen_morning')[0].id, 30)!;
    expect(h.level).toBe('easy');
    expect(h.addedOnDay).toBe(30);
    expect(h.levelSince).toBe(29);
    expect(h.spec!.targets.easy).toBe(BY_ID[h.habitId].ladder(p)[BY_ID[h.habitId].start(p)!]);
  });

  it('are age- and precaution-aware and respect plan limits', () => {
    const teen = FIXTURES['A · 16, focus'];
    const plan = assemblePlan(teen, [])!;
    for (const id of plan.map((h) => h.habitId).slice(1)) {
      const options = swapChoices(teen, plan, id);
      for (const o of options) {
        expect(exclusion(BY_ID[o.id], teen, DEV_CLEARED)).toBeNull();
        expect(plan.some((h) => h.habitId === o.id)).toBe(false);
      }
    }
    const shift: ProfileV2 = { ...p, wake: { kind: 'shift' } };
    const shiftPlan = assemblePlan(shift, [])!;
    for (const id of shiftPlan.map((h) => h.habitId).slice(1)) {
      expect(swapChoices(shift, shiftPlan, id).map((o) => o.id)).not.toContain('sleep_wake');
    }
  });

  it('refuse anything not offered, and ignore custom habits safely', () => {
    const plan = [
      ...assemblePlan(p, [])!,
      { habitId: 'custom_x', custom: { title: 'Mine' }, level: 'easy' as const, addedOnDay: 1, levelSince: 0 },
    ];
    expect(swappedHabit(p, plan, 'screen_morning', 'move_walk', 3)).toBeNull();
    expect(swappedHabit(p, plan, 'screen_morning', 'move_balance', 3)).toBeNull();
    expect(swapChoices(p, plan, 'custom_x')).toEqual([]);
    expect(() => swapChoices(p, plan, 'screen_morning')).not.toThrow();
  });
});

describe('V2 quiz', () => {
  const answered: Draft = {
    age: '30_49',
    goal: 'focus',
    sleepHours: '7_8',
    sleepTrouble: 'rarely',
    activeDays: '1_2',
    produce: '3_4',
    sugary: 'rarely',
    phone: '4_6',
    phonePull: 'social',
    routines: [],
    precautions: [],
  };
  const keys = (d: Draft) => visibleQuestions(d).map((q) => q.key);

  it('asks age first and has every spec question', () => {
    expect(QUESTIONS_V2[0].key).toBe('age');
    expect(QUESTIONS_V2.map((q) => q.key)).toEqual([
      'age',
      'goal',
      'sleepHours',
      'sleepTrouble',
      'activeDays',
      'produce',
      'sugary',
      'phone',
      'phonePull',
      'routines',
      'precautions',
    ]);
  });

  it('asks about sugary drinks only for adults who did not skip food questions', () => {
    expect(keys({ ...answered })).toContain('sugary');
    expect(keys({ ...answered, age: '16_17' })).not.toContain('sugary');
    expect(keys({ ...answered, produce: 'skip' })).not.toContain('sugary');
  });

  it('asks what takes phone time only at 2–4 h or more, or not sure', () => {
    for (const phone of ['2_4', '4_6', '6p', 'unknown'] as const)
      expect(keys({ ...answered, phone })).toContain('phonePull');
    for (const phone of ['lt1', '1_2'] as const) expect(keys({ ...answered, phone })).not.toContain('phonePull');
  });

  it('drops answers to questions that are no longer shown', () => {
    const p = toProfile({ ...answered, age: '16_17', phone: '1_2' })!;
    expect(p.sugary).toBeUndefined();
    expect(p.phonePull).toBeUndefined();
  });

  it('needs every shown question answered; skipped precautions are unknown, never none', () => {
    expect(toProfile({ ...answered, precautions: undefined })).toBeNull();
    expect(toProfile({ ...answered, precautions: 'unknown' })!.precautions).toBe('unknown');
    expect(toProfile({ ...answered })!.precautions).toEqual([]);
  });

  it('under 16: no profile, and the engine stops with the stop-screen message', () => {
    expect(toProfile({ ...answered, age: 'u16' })).toBeNull();
    const r = generatePlanV2({ ...(toProfile(answered) as ProfileV2), age: 'u16' });
    expect(r).toEqual({ status: 'not_eligible', message: UNDER_16_MESSAGE });
    expect(previewPlan({ ...(toProfile(answered) as ProfileV2), age: 'u16' }).status).toBe('not_eligible');
  });

  it('asks W1 only when a wake-anchored habit is in the plan or the choices, and only once', () => {
    const p = toProfile(answered)!;
    const r = ok(p);
    const anchored = [...ids(r), ...r.options.map((o) => o.id)].some((id) =>
      ['sleep_wake', 'screen_morning', 'screen_social', 'sleep_morning_light', 'sleep_bedtime'].includes(id),
    );
    expect(pendingTimeQuestion(p)).toBe(anchored ? 'wake' : null);
    expect(pendingTimeQuestion({ ...p, wake: { kind: 'time', time: '07:00' } })).toBeNull();
    expect(pendingTimeQuestion({ ...p, wake: { kind: 'varies' } })).toBeNull();
  });

  it('asks W2 only after a W1 time, and only when Earlier bedtime is offered (never in the gated preview)', () => {
    const c = { ...FIXTURES['C · 28, energy'], inBed: undefined };
    // Full candidate pool: bedtime is in the plan, so W2 follows a W1 time.
    expect(pendingTimeQuestion({ ...c, wake: undefined }, null)).toBe('wake');
    expect(pendingTimeQuestion(c, null)).toBe('bed');
    expect(pendingTimeQuestion({ ...c, inBed: '23:30' }, null)).toBeNull();
    expect(pendingTimeQuestion({ ...c, wake: { kind: 'shift' } }, null)).toBeNull();
    // Development preview: Earlier bedtime is pending review, so W2 is never needed.
    expect(pendingTimeQuestion(c)).toBeNull();
  });

  it('a varies or shift answer removes wake-anchored rules from the plan', () => {
    const c = FIXTURES['C · 28, energy'];
    for (const kind of ['varies', 'shift'] as const) {
      expect(ids(ok({ ...c, wake: { kind } }))).not.toContain('sleep_wake');
    }
  });
});

describe('damaged saves', () => {
  it('rebuilds a missing V2 spec from the profile, and leaves anything else alone', () => {
    const p = FIXTURES['C · 28, energy'];
    const bare = { habitId: 'sleep_wake', level: 'medium' as const, addedOnDay: 1, levelSince: 21 };
    expect(repairSpec(p, bare).spec?.targets.medium).toBe('Up within 45 min of 07:00');
    expect(repairSpec(p, bare).level).toBe('medium');
    expect(repairSpec(null, bare)).toBe(bare);
    const custom = { ...bare, habitId: 'custom_1', custom: { title: 'x' } };
    expect(repairSpec(p, custom)).toBe(custom);
  });
});

describe('integration boundaries', () => {
  const files = (dir: string): string[] =>
    fs.readdirSync(dir).flatMap((f) => {
      const full = join(dir, f);
      return fs.statSync(full).isDirectory() ? (f === '__tests__' ? [] : files(full)) : [full];
    });

  it('screens and the store only reach the V2 engine through the gated program module', () => {
    const root = SRC;
    const checked = [...files(join(root, 'app')), ...files(join(root, 'store'))];
    expect(checked.some((f) => f.endsWith('v2/plan.tsx'))).toBe(true);
    for (const f of checked) {
      const src = fs.readFileSync(f, 'utf8');
      expect([f, /generatePlanV2|swapOptionsV2/.test(src)]).toEqual([f, false]);
    }
  });

  it('V1 plan code never imports V2', () => {
    const root = join(SRC, 'core');
    for (const f of ['plan.ts', 'habits.ts', 'progression.ts', 'onboarding.ts']) {
      expect(fs.readFileSync(join(root, f), 'utf8')).not.toMatch(/v2\//);
    }
  });
});
