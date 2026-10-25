import { describe, expect, it } from '@jest/globals';
import { LEVEL_NAME, shownText } from '../../habits';
import { nextPhaseRise } from '../../progression';
import type { PlanHabit } from '../../types';
import { exclusion, fitsPlan } from '../engine';
import { EXERCISE_IDS } from '../exercise';
import { DEV_CLEARED } from '../gate';
import { BY_ID, GOALS, titleFor } from '../library';
import {
  addableHabits,
  addedHabit,
  assemblePlan,
  extraOptions,
  extraRoom,
  libraryOptions,
  prepareAdd,
  withMissingTimes,
  PLAN_MAX,
  previewPlan,
  type PreviewPlan,
} from '../program';
import { FIXTURES } from './fixtures';
import { sample } from './sample';
import type { ProfileV2 } from '../types';

const ok = (p: ProfileV2) => {
  const r = previewPlan(p);
  if (r.status !== 'ok') throw new Error('expected a plan');
  return r as Extract<PreviewPlan, { status: 'ok' }>;
};
/** The plan as started with the first allowed choices, or null when the times it needs aren't known. */
const started = (p: ProfileV2) => {
  const r = ok(p);
  return assemblePlan(
    p,
    r.options.slice(0, r.choice?.required ?? 0).map((o) => o.id),
  );
};
const PROFILES = [...Object.values(FIXTURES), ...sample(1500)];
const HELD = new Set<string>([...EXERCISE_IDS, 'move_strength_session']);

describe('library discovery reuses the plan’s own rules', () => {
  it('offers only reviewed, eligible habits that fit, never a held or prototype one, never a duplicate', () => {
    for (const p of PROFILES) {
      if (p.age === 'u16') continue;
      const plan = started(p);
      if (!plan) continue;
      const ids = plan.map((h) => h.habitId);
      for (const o of libraryOptions(p, ids)) {
        expect(HELD.has(o.id)).toBe(false);
        expect(DEV_CLEARED.has(o.id)).toBe(true);
        expect(ids).not.toContain(o.id);
        expect(o.id).not.toBe('discipline_bed');
        expect(exclusion(BY_ID[o.id], p, DEV_CLEARED)).toBeNull();
        expect(fitsPlan(o.id, ids)).toBe(true);
      }
    }
  });

  it('respects age and health precautions', () => {
    const teen = FIXTURES['A · 16, focus'];
    const ids = libraryOptions(teen, ['discipline_bed']).map((o) => o.id);
    // Adults only in the library (bedtime, fruit and veg).
    expect(ids).not.toContain('sleep_bedtime');
    expect(ids).not.toContain('food_produce');
    const heart: ProfileV2 = { ...FIXTURES['G1 · healthy, fitness'], precautions: ['heart'] };
    expect(libraryOptions(heart, ['discipline_bed']).map((o) => o.id)).not.toContain('move_walk');
    expect(libraryOptions(heart, ['discipline_bed']).map((o) => o.id)).not.toContain('mind_breathe');
  });

  it('lists the person’s goal habits first, in the goal’s order, and groups every habit', () => {
    for (const p of Object.values(FIXTURES)) {
      const list = libraryOptions(p, ['discipline_bed']);
      const firstOther = list.findIndex((o) => !o.forGoal);
      if (firstOther >= 0) expect(list.slice(firstOther).every((o) => !o.forGoal)).toBe(true);
      const goal = [...GOALS[p.goal].core, ...GOALS[p.goal].support, ...GOALS[p.goal].suggest];
      const goalOrder = list.filter((o) => o.forGoal).map((o) => goal.indexOf(o.id));
      expect(goalOrder).toEqual([...goalOrder].sort((a, b) => a - b));
      for (const o of list) expect(['Energy', 'Focus', 'Calm', 'Confidence', 'Fitness']).toContain(o.category);
    }
  });

  it('a running plan can only take what fits now: room under 6; a habit needing a time is added only once it is known', () => {
    for (const p of Object.values(FIXTURES)) {
      const plan = started(p);
      if (!plan) continue;
      for (const o of addableHabits(p, plan)) if (o.needsTime) expect(addedHabit(p, plan, o.id, 10)).toBeNull();
      const full: PlanHabit[] = [...plan];
      for (const o of addableHabits(p, plan)) {
        if (full.length >= PLAN_MAX) break;
        const h = addedHabit(p, full, o.id, 10);
        if (h) full.push(h);
      }
      expect(full.length).toBeLessThanOrEqual(PLAN_MAX);
      if (full.length === PLAN_MAX) expect(addableHabits(p, full)).toEqual([]);
    }
  });

  it('an added habit starts at Foundation from its day, with personal targets and the same fit rules', () => {
    const p = FIXTURES['C · 28, energy'];
    const plan = started(p)!;
    const o = addableHabits(p, plan)[0];
    const h = addedHabit(p, plan, o.id, 30)!;
    expect(h).toMatchObject({ habitId: o.id, level: 'easy', addedOnDay: 30, levelSince: 29 });
    expect(h.spec?.targets).toEqual(o.targets);
    expect(addedHabit(p, [...plan, h], o.id, 31)).toBeNull(); // no duplicates
    expect(addedHabit(p, plan, 'move_strength_prep', 30)).toBeNull(); // held
    expect(addedHabit(p, plan, 'discipline_bed', 30)).toBeNull();
  });
});

describe('optional extras during onboarding', () => {
  it('never change the recommended plan: extras are only appended, at Foundation', () => {
    for (const p of Object.values(FIXTURES)) {
      const r = ok(p);
      if (r.blocked) continue;
      const chosen = r.options.slice(0, r.choice?.required ?? 0).map((o) => o.id);
      const base = assemblePlan(p, chosen);
      if (!base) continue;
      const pool = extraOptions(p, r, chosen).filter((o) => o.needsTime === null);
      const room = extraRoom(r, chosen);
      expect(base.length + room).toBeLessThanOrEqual(PLAN_MAX);
      const take = pool.slice(0, 1).map((o) => o.id);
      const withExtras = assemblePlan(p, chosen, 1, take);
      if (!take.length || room === 0) {
        if (take.length) expect(withExtras).toBeNull();
        continue;
      }
      expect(withExtras!.slice(0, base.length)).toEqual(base);
      expect(withExtras!.slice(base.length).map((h) => [h.habitId, h.level])).toEqual(take.map((id) => [id, 'easy']));
    }
  });

  it('never repeat the choice step, and refuse anything over 6, not on offer, or needing an unknown time', () => {
    for (const p of PROFILES.slice(0, 600)) {
      if (p.age === 'u16') continue;
      const r = previewPlan(p);
      if (r.status !== 'ok' || r.blocked) continue;
      const chosen = r.options.slice(0, r.choice?.required ?? 0).map((o) => o.id);
      if (!assemblePlan(p, chosen)) continue;
      const pool = extraOptions(p, r, chosen);
      const choiceIds = r.options.map((x) => x.id);
      if ((r.choice?.required ?? 0) > 0) for (const o of pool) expect(choiceIds).not.toContain(o.id);
      else {
        // One optional list: the optional choice's alternatives that still fit come first, in the engine's order.
        const fromChoice = pool.filter((o) => choiceIds.includes(o.id)).map((o) => o.id);
        expect(pool.slice(0, fromChoice.length).map((o) => o.id)).toEqual(fromChoice);
        expect(fromChoice).toEqual(choiceIds.filter((id) => fromChoice.includes(id)));
      }
      // Everything on offer, one after another: accepted only while it fits and there's room.
      const all = pool.filter((o) => o.needsTime === null).map((o) => o.id);
      const made = assemblePlan(p, chosen, 1, all);
      if (made) expect(made.length).toBeLessThanOrEqual(PLAN_MAX);
      expect(assemblePlan(p, chosen, 1, ['move_strength_prep'])).toBeNull();
      expect(assemblePlan(p, chosen, 1, [chosen[0] ?? r.picks[0].id])).toBeNull();
      for (const o of pool.filter((x) => x.needsTime !== null)) expect(assemblePlan(p, chosen, 1, [o.id])).toBeNull();
    }
  });

  it('are not offered when the plan is already full', () => {
    for (const p of PROFILES) {
      if (p.age === 'u16') continue;
      const r = previewPlan(p);
      if (r.status !== 'ok' || r.blocked) continue;
      const chosen = r.options.slice(0, r.choice?.required ?? 0).map((o) => o.id);
      if (r.picks.length + chosen.length >= PLAN_MAX) expect(extraRoom(r, chosen)).toBe(0);
    }
  });
});

describe('one optional list during onboarding', () => {
  it('an optional choice taken as an extra gives exactly the habit the choice step gave (same targets)', () => {
    let checked = 0;
    for (const p of [...Object.values(FIXTURES), ...PROFILES.slice(0, 400)]) {
      if (p.age === 'u16') continue;
      const r = previewPlan(p);
      if (r.status !== 'ok' || r.blocked || !r.choice || r.choice.required > 0) continue;
      for (const o of r.options) {
        const asChoice = assemblePlan(p, [o.id]);
        const asExtra = assemblePlan(p, [], 1, [o.id]);
        if (!asChoice) continue;
        expect(asExtra).toEqual(asChoice);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe('adding a habit that needs a time answer', () => {
  /** A running plan for this profile with no time answers, so time-anchored habits need asking. */
  const noTimes = (p: ProfileV2): ProfileV2 => ({ ...p, wake: undefined, inBed: undefined });
  const cases = PROFILES.slice(0, 500)
    .filter((p) => p.age !== 'u16')
    .map(noTimes)
    .map((p) => ({ p, plan: started(p) }))
    .filter((x): x is { p: ProfileV2; plan: PlanHabit[] } => !!x.plan);

  it('asks only what is missing, then adds it with targets from the answer; nothing else changes', () => {
    let added = 0;
    for (const { p, plan } of cases) {
      for (const o of addableHabits(p, plan).filter((x) => x.needsTime === 'wake')) {
        const first = prepareAdd(p, plan, o.id, {}, 5);
        expect(first).toEqual({ status: 'ask', question: 'wake' });
        const answers = { wake: { kind: 'time' as const, time: '07:00' }, inBed: '23:30' };
        let step = prepareAdd(p, plan, o.id, { wake: answers.wake }, 5);
        if (step.status === 'ask') {
          expect(step.question).toBe('bed');
          step = prepareAdd(p, plan, o.id, answers, 5);
        }
        if (step.status !== 'ok') continue;
        added++;
        expect(step.habit).toMatchObject({ habitId: o.id, level: 'easy', addedOnDay: 5 });
        // Targets come from the answer, e.g. "Up within 60 min of 07:00".
        if (o.id === 'sleep_wake') expect(step.habit.spec!.targets.easy).toMatch(/07:00/);
        // Only the missing answers are added to the profile; nothing else in it changes.
        expect({ ...step.profile, wake: undefined, inBed: undefined }).toEqual({
          ...p,
          wake: undefined,
          inBed: undefined,
        });
      }
    }
    expect(added).toBeGreaterThan(0);
  });

  it('an answer that makes the habit unsuitable is explained and adds nothing', () => {
    let explained = 0;
    for (const { p, plan } of cases) {
      const o = addableHabits(p, plan).find((x) => x.id === 'sleep_wake' && x.needsTime === 'wake');
      if (!o) continue;
      for (const wake of [{ kind: 'varies' as const }, { kind: 'shift' as const }]) {
        const step = prepareAdd(p, plan, o.id, { wake }, 5);
        expect(step.status).toBe('unsuitable');
        if (step.status === 'unsuitable') expect(step.message).toMatch(/Nothing was added/);
        explained++;
      }
    }
    expect(explained).toBeGreaterThan(0);
  });

  it('answers never unlock a habit that wasn’t on offer, and never replace an answer already given', () => {
    for (const { p, plan } of cases.slice(0, 120)) {
      const offered = addableHabits(p, plan).map((o) => o.id);
      for (const id of ['sleep_bedtime', 'sleep_wake', 'move_strength_prep', 'move_balance', 'discipline_bed']) {
        if (offered.includes(id)) continue;
        const step = prepareAdd(p, plan, id, { wake: { kind: 'time', time: '07:00' }, inBed: '23:00' }, 5);
        expect([p.age, id, step.status]).toEqual([p.age, id, 'unsuitable']);
      }
    }
    const C = FIXTURES['C · 28, energy'];
    expect(withMissingTimes(C, { wake: { kind: 'shift' }, inBed: '01:00' })).toEqual(C);
    // A bedtime is only kept with a wake time.
    expect(withMissingTimes(noTimes(C), { wake: { kind: 'varies' }, inBed: '23:00' }).inBed).toBeUndefined();
  });

  it('teens are never offered Earlier bedtime, whatever they answer', () => {
    const teen = noTimes(FIXTURES['A · 16, focus']);
    const plan = started(teen);
    if (!plan) return;
    expect(addableHabits(teen, plan).map((o) => o.id)).not.toContain('sleep_bedtime');
    expect(
      prepareAdd(teen, plan, 'sleep_bedtime', { wake: { kind: 'time', time: '07:00' }, inBed: '23:00' }, 3).status,
    ).toBe('unsuitable');
  });
});

describe('names, wording and the planned path', () => {
  it('the app-time habit is named after what takes the person’s time; renamed habits read plainly', () => {
    const C = FIXTURES['C · 28, energy'];
    expect(titleFor(BY_ID.screen_app_limit, { ...C, phonePull: 'video' })).toBe('Video time');
    expect(titleFor(BY_ID.screen_app_limit, { ...C, phonePull: 'games' })).toBe('Gaming time');
    expect(titleFor(BY_ID.screen_app_limit, { ...C, phonePull: 'mix' })).toBe('App time');
    expect(BY_ID.focus_top3.title).toBe('Most important task');
    expect(BY_ID.focus_deepwork.title).toBe('Focused work');
    expect(BY_ID.screen_morning.title).not.toBe(BY_ID.screen_social.title);
    // One clear action defines a Journal day.
    expect(BY_ID.mind_journal.ladder(C)[0]).toBe('Write 1 sentence about your day');
    const plan = started(C)!;
    const limit = plan.find((h) => h.habitId === 'screen_app_limit');
    if (limit) expect(limit.spec?.title).toBe('Video time');
  });

  it('targets keep their amounts: only the wording changed', () => {
    const C = FIXTURES['C · 28, energy'];
    expect(BY_ID.mind_journal.ladder(C).map((s) => s.match(/\d+/)![0])).toEqual(['1', '2', '3', '5']);
    expect(BY_ID.focus_deepwork.ladder(C).length).toBeGreaterThan(2);
  });

  it('times are shown in the phone’s format; everything else is left alone', () => {
    const twelve = (t: string) => (t === '07:00' ? '7:00 AM' : t === '22:45' ? '10:45 PM' : t);
    expect(shownText('Up within 60 min of 07:00', twelve)).toBe('Up within 60 min of 7:00 AM');
    expect(shownText('In bed by 22:45', twelve)).toBe('In bed by 10:45 PM');
    expect(shownText('Videos under 120 min today', twelve)).toBe('Videos under 120 min today');
    expect(shownText('24:00 and 7:5', twelve)).toBe('24:00 and 7:5');
  });

  it('levels are named after their phases', () => {
    expect(LEVEL_NAME).toEqual({ easy: 'Foundation', medium: 'Momentum', hard: 'Mastery' });
  });

  it('the next planned step follows reconcile’s rules, and is never promised where it won’t happen', () => {
    const h: PlanHabit = { habitId: 'move_walk', level: 'easy', addedOnDay: 1, levelSince: 0 };
    expect(nextPhaseRise(h, 1)).toBe(22);
    expect(nextPhaseRise({ ...h, level: 'medium' }, 2)).toBe(45);
    expect(nextPhaseRise({ ...h, level: 'hard' }, 1)).toBeNull();
    expect(nextPhaseRise({ ...h, addedOnDay: 30 }, 2)).toBe(45); // added in Momentum: rises at Mastery
    expect(nextPhaseRise({ ...h, addedOnDay: 45 }, 3)).toBeNull();
    expect(nextPhaseRise({ ...h, addedOnDay: 22 }, 1)).toBe(45); // added on Day 22 itself: not raised that day
    expect(nextPhaseRise({ ...h, habitId: 'move_strength_prep' }, 1)).toBeNull();
    expect(nextPhaseRise({ ...h, schedule: { days: [1, 3] } }, 1)).toBeNull();
    expect(nextPhaseRise({ ...h, schedule: { days: [1, 3], phaseLevelUps: true } }, 1)).toBe(22);
    expect(nextPhaseRise({ ...h, habitId: 'custom_x', custom: { title: 'x' } }, 1)).toBeNull();
  });
});
