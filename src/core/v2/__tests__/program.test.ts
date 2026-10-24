import { describe, expect, it } from '@jest/globals';
import { ACTIVE_NOTE, exclusion, fitsPlan, generatePlanV2, needs, UNDER_16_MESSAGE } from '../engine';
import { DEV_CLEARED } from '../gate';
import { BY_ID, LIBRARY } from '../library';
import {
  assemblePlan,
  canChoose,
  choiceNeedsTime,
  pendingTimeQuestion,
  previewPlan,
  repairSpec,
  swapChoices,
  swappedHabit,
  type PreviewPlan,
} from '../program';
import { QUESTIONS_V2, screensV2, toProfile, visibleQuestions, type Draft } from '../quiz';
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

/** The habits cleared for development testing: the first 12, plus the 8 unlocked by the 2026-10-24 review. */
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
  'move_walk',
  'sleep_bedtime',
  'sleep_no_phone_bed',
  'mind_breathe',
  'food_produce',
  'food_unsweetened',
  'food_water_meals',
  'confidence_talk',
];

/** Picks the first n choices that fit together, as a person tapping down the list would. */
function choose(r: Ok, n: number): string[] {
  const chosen: string[] = [];
  for (const o of r.options) if (chosen.length < n && canChoose(r, chosen, o.id)) chosen.push(o.id);
  return chosen;
}

/** What the screens do: choose, then answer any time question the plan now needs (07:00 up, 23:00 in bed). */
function startable(p: ProfileV2): { profile: ProfileV2; chosen: string[] } {
  let profile = p;
  for (let i = 0; i < 4; i++) {
    const r = ok(profile);
    const chosen = choose(r, r.choice?.required ?? 0);
    const q = pendingTimeQuestion(profile, DEV_CLEARED, chosen);
    if (q === 'wake') profile = { ...profile, wake: { kind: 'time', time: '07:00' } };
    else if (q === 'bed') profile = { ...profile, inBed: '23:00' };
    else return { profile, chosen };
  }
  throw new Error('time questions never settled');
}

describe('release gate', () => {
  it('clears exactly the reviewed habits', () => {
    expect([...DEV_CLEARED].sort()).toEqual([...CLEARED].sort());
  });

  it('never clears a held habit or one still pending expert review', () => {
    for (const id of ['move_balance', 'move_strength_session', 'move_seated', 'move_strength_prep']) {
      expect(DEV_CLEARED.has(id)).toBe(false);
    }
    for (const id of DEV_CLEARED) expect(BY_ID[id].release).toBe('candidate');
    // Every candidate except Strength preparation is now cleared.
    expect(LIBRARY.filter((h) => h.release === 'candidate' && !DEV_CLEARED.has(h.id)).map((h) => h.id)).toEqual([
      'move_strength_prep',
    ]);
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
        const { profile, chosen } = startable(p);
        const plan = assemblePlan(profile, chosen);
        if (!plan) continue;
        for (const s of swapChoices(profile, plan, id)) expect(DEV_CLEARED.has(s.id)).toBe(true);
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
      const { profile, chosen } = startable(p);
      const plan = assemblePlan(profile, chosen);
      expect(plan).not.toBeNull();
      expect(plan!.length).toBeGreaterThanOrEqual(3);
      for (const h of plan!) {
        expect(h.level).toBe('easy');
        expect(h.spec?.targets.easy && h.spec.targets.medium && h.spec.targets.hard).toBeTruthy();
      }
    });
  }

  it('A (16, focus): teen deep-work cap, no drinks, no earlier bedtime, no food habit', () => {
    const r = ok(FIXTURES['A · 16, focus']);
    expect(ids(r)).toContain('focus_deepwork');
    expect(r.picks.find((x) => x.id === 'focus_deepwork')!.targets.hard).not.toMatch(/90 min/);
    for (const id of ['food_unsweetened', 'food_produce', 'sleep_bedtime']) expect(ids(r)).not.toContain(id);
    expect(r.limitation).toBeNull();
  });

  it('F (67, fitness, joint pain): a gentle walk with its safety note; strength and balance stay held', () => {
    const r = ok(FIXTURES['F · 67, fitness']);
    const walk = r.picks.find((x) => x.id === 'move_walk')!;
    expect(walk.targets.easy).toBe('5 min walk at a comfortable pace');
    expect(walk.notes.join(' ')).toMatch(/stop if it hurts/);
    expect(walk.forGoal).toBe(true);
    for (const id of ['move_strength_prep', 'move_balance']) expect(ids(r)).not.toContain(id);
    expect(r.planNotes.join(' ')).toMatch(/balance and strength activities for older adults/);
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

  it('adapts to the person: in-bed time, activity baseline, phone pull', () => {
    const c = FIXTURES['C · 28, energy'];
    const r = ok(c);
    // In bed at 00:30, up at 07:00: earlier in 15-minute steps, all under the 9-hour time-in-bed ceiling.
    expect(r.picks.find((x) => x.id === 'sleep_bedtime')!.targets).toEqual({
      easy: 'In bed by 00:15',
      medium: 'In bed by 00:00',
      hard: 'In bed by 23:45',
    });
    expect(r.picks.find((x) => x.id === 'move_walk')!.targets.easy).toBe('5 min walk at a comfortable pace');
    expect(r.picks.find((x) => x.id === 'screen_app_limit')!.targets).toEqual({
      easy: 'Videos under 60 min today',
      medium: 'Videos under 45 min today',
      hard: 'Videos under 30 min today',
    });
    const d = ok(FIXTURES['D · 35, calm']);
    // Sleep trouble: the wind-down starts one step up.
    expect(d.picks.find((x) => x.id === 'sleep_no_phone_bed')!.targets.easy).toBe('Phone away 30 min before bed');
  });

  it('bedtime targets follow the person’s own in-bed time (review discrepancy: 00:30 vs the 23:00 default)', () => {
    const c = FIXTURES['C · 28, energy'];
    // Fixture: in bed at 00:30, up at 07:00.
    expect(ok(c).picks.find((x) => x.id === 'sleep_bedtime')!.targets).toEqual({
      easy: 'In bed by 00:15',
      medium: 'In bed by 00:00',
      hard: 'In bed by 23:45',
    });
    // The browser run could only keep the time pickers' defaults (in bed 23:00): Day 22's 22:30 is that
    // window's Medium, not a rendering error.
    expect(ok({ ...c, inBed: '23:00' }).picks.find((x) => x.id === 'sleep_bedtime')!.targets).toEqual({
      easy: 'In bed by 22:45',
      medium: 'In bed by 22:30',
      hard: 'In bed by 22:15',
    });
    // Already 9 h in bed: no step fits under the ceiling, so it isn't offered.
    expect(ids(ok({ ...c, inBed: '22:00' }))).not.toContain('sleep_bedtime');
  });

  it('never starts an earlier bedtime without the person’s own wake and in-bed times', () => {
    const c = FIXTURES['C · 28, energy'];
    expect(assemblePlan(c, [])!.some((h) => h.habitId === 'sleep_bedtime')).toBe(true);
    expect(assemblePlan({ ...c, inBed: undefined }, [])).toBeNull();
    expect(pendingTimeQuestion({ ...c, inBed: undefined })).toBe('bed');
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

describe('Start a conversation ladder (revision 6.2)', () => {
  const talk = BY_ID.confidence_talk;
  const p = FIXTURES['B · 19, confidence'];

  it('is one conversation a day at every level, deeper rather than more', () => {
    expect(talk.ladder(p)).toEqual([
      'Have one genuine conversation today, beyond basic logistics',
      'In one conversation today, ask a follow-up question about something the other person said',
      'Start one conversation yourself today with someone you know',
    ]);
    for (const rung of talk.ladder(p)) {
      expect(rung).toMatch(/\bone\b.*conversation/);
      expect(rung).not.toMatch(/stranger|\b[23]\b|two|three/i);
    }
    expect(talk.note).toMatch(/family, friends or colleagues/);
    expect(talk.note).toMatch(/No strangers needed/);
    expect(talk.note).toMatch(/swap it for something else/);
  });

  it('stays voluntary: choice-only, never automatic, at most one per plan', () => {
    expect(talk.mode).toBe('choice');
    expect(talk.opportunityDependent).toBe(true);
    for (const x of sample(4000)) {
      const r = previewPlan(x);
      if (r.status !== 'ok') continue;
      expect(ids(r)).not.toContain('confidence_talk');
    }
    // Offered as a choice where the plan has room, starting at Easy.
    const confident: ProfileV2 = { ...FIXTURES['G2 · organized, discipline'], goal: 'confidence' };
    const r = ok(confident);
    const o = r.options.find((x) => x.id === 'confidence_talk');
    if (o) expect(o.targets.easy).toBe('Have one genuine conversation today, beyond basic logistics');
    expect(swapChoices(p, assemblePlan(p, [])!, 'confidence_compliment').map((x) => x.id)).toContain('confidence_talk');
  });
});

describe('unsweetened drinks ladder', () => {
  it('never requires a sugary drink: "up to" targets, and a day with none counts', () => {
    const c = FIXTURES['C · 28, energy'];
    const t = ok(c).picks.find((x) => x.id === 'food_unsweetened');
    const targets = t?.targets ?? BY_ID.food_unsweetened.ladder(c).slice(0, 3);
    expect(targets).toEqual(
      t
        ? {
            easy: 'Swap a sugary drink for water or an unsweetened one',
            medium: 'Swap up to 2 sugary drinks for water or unsweetened ones',
            hard: 'Swap up to 3 sugary drinks for water or unsweetened ones',
          }
        : [
            'Swap a sugary drink for water or an unsweetened one',
            'Swap up to 2 sugary drinks for water or unsweetened ones',
            'Swap up to 3 sugary drinks for water or unsweetened ones',
          ],
    );
    for (const rung of BY_ID.food_unsweetened.ladder(c)) expect(rung).not.toMatch(/\ball\b/i);
    const note = BY_ID.food_unsweetened.note!;
    expect(note).toMatch(/no sugary drinks counts too/);
    expect(note).toMatch(/low blood sugar, always do that/);
    expect(note).toMatch(/care team/);
    // Still adults only, and only for "most days" (the 3-rung ladder leaves no room above "a few times a week").
    expect(exclusion(BY_ID.food_unsweetened, { ...c, age: '16_17' })).not.toBeNull();
    expect(exclusion(BY_ID.food_unsweetened, { ...c, sugary: 'some' })).not.toBeNull();
    expect(exclusion(BY_ID.food_unsweetened, { ...c, sugary: 'most' })).toBeNull();
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

  it('puts both sleep questions on one screen, keeping both questions and all their options', () => {
    const screens = screensV2(answered);
    const sleep = screens.find((x) => x[0].key === 'sleepHours')!;
    expect(sleep.map((x) => x.key)).toEqual(['sleepHours', 'sleepTrouble']);
    expect(sleep.map((x) => (x.kind === 'single' ? x.options.length : 0))).toEqual([5, 3]);
    expect(screens.flat().map((x) => x.key)).toEqual(visibleQuestions(answered).map((x) => x.key));
    expect(screens).toHaveLength(visibleQuestions(answered).length - 1);
    // Nothing is preselected: a fresh draft has neither answer.
    expect(toProfile({ ...answered, sleepTrouble: undefined })).toBeNull();
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

  it('asks W1 only when a wake-anchored habit is in the plan, and only once', () => {
    const p = toProfile(answered)!;
    const r = ok(p);
    const anchored = ids(r).some((id) =>
      ['sleep_wake', 'screen_morning', 'screen_social', 'sleep_morning_light', 'sleep_bedtime'].includes(id),
    );
    expect(pendingTimeQuestion(p)).toBe(anchored ? 'wake' : null);
    expect(pendingTimeQuestion({ ...p, wake: { kind: 'time', time: '07:00' } })).toBeNull();
    expect(pendingTimeQuestion({ ...p, wake: { kind: 'varies' } })).toBeNull();
  });

  describe('W1 waits for an optional or required choice that needs it (E, G1, G2)', () => {
    for (const name of ['E · 45, discipline', 'G1 · healthy, fitness', 'G2 · organized, discipline']) {
      const p = FIXTURES[name];
      it(name, () => {
        expect(p.wake).toBeUndefined();
        const r = ok(p);
        // Nothing in the generated plan needs a wake time, so the quiz goes straight to the plan.
        expect(pendingTimeQuestion(p)).toBeNull();
        // Choosing an alternative that needs it asks W1 at that moment; one that doesn't, never does.
        const light = r.options.find((o) => o.id === 'sleep_morning_light')!;
        const plain = r.options.find((o) => !['sleep_morning_light', 'sleep_wake', 'sleep_bedtime'].includes(o.id))!;
        expect(choiceNeedsTime(p, [], light.id)).toBe(true);
        expect(choiceNeedsTime(p, [], plain.id)).toBe(false);
        expect(pendingTimeQuestion(p, DEV_CLEARED, [light.id])).toBe('wake');
        // Without the answer the choice can't be started; with it, it can, and nothing else is lost.
        const extra = r.choice!.required > 1 ? [plain.id] : [];
        const picked = [...extra, light.id].slice(-Math.max(1, r.choice!.required));
        expect(assemblePlan(p, picked)).toBeNull();
        for (const wake of [{ kind: 'time', time: '06:30' }, { kind: 'varies' }, { kind: 'shift' }] as const) {
          const answered2: ProfileV2 = { ...p, wake };
          const r2 = ok(answered2);
          // The generated plan doesn't change because of the answer.
          expect(ids(r2)).toEqual(ids(r));
          const plan = assemblePlan(answered2, picked);
          expect(plan).not.toBeNull();
          const lightHabit = plan!.find((h) => h.habitId === 'sleep_morning_light')!;
          expect(lightHabit.spec!.targets.easy).toBe(
            wake.kind === 'shift'
              ? 'Outside for 5 min soon after your main sleep'
              : 'Outside within an hour of waking for 5 min',
          );
          for (const id of extra) expect(plan!.some((h) => h.habitId === id)).toBe(true);
        }
      });
    }
  });

  it('a changing schedule removes Steady wake-up from the choices once W1 is answered', () => {
    const g1 = FIXTURES['G1 · healthy, fitness'];
    const withWake = ok({ ...g1, routines: g1.routines.filter((x) => x !== 'sameWake') });
    expect(withWake.options.map((o) => o.id)).toContain('sleep_wake');
    const varies = ok({ ...g1, routines: g1.routines.filter((x) => x !== 'sameWake'), wake: { kind: 'varies' } });
    expect(varies.options.map((o) => o.id)).not.toContain('sleep_wake');
  });

  it('asks W2 only after a W1 time, and only when Earlier bedtime is offered', () => {
    const c = { ...FIXTURES['C · 28, energy'], inBed: undefined };
    // Full candidate pool: bedtime is in the plan, so W2 follows a W1 time.
    expect(pendingTimeQuestion({ ...c, wake: undefined }, null)).toBe('wake');
    expect(pendingTimeQuestion(c, null)).toBe('bed');
    expect(pendingTimeQuestion({ ...c, inBed: '23:30' }, null)).toBeNull();
    expect(pendingTimeQuestion({ ...c, wake: { kind: 'shift' } }, null)).toBeNull();
    // Now that Earlier bedtime is cleared, the development preview asks W2 too; teens never get it.
    expect(pendingTimeQuestion(c)).toBe('bed');
    expect(pendingTimeQuestion({ ...c, age: '16_17', sugary: undefined })).toBeNull();
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
