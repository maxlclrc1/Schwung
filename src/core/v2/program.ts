import type { HabitSpec, PlanHabit } from '../types';
import {
  exclusion,
  fitsPlan,
  generatePlanV2,
  habitNotes,
  PREVIEW_MOVEMENT_NOTE,
  swapOptionsV2,
  targetsFor,
  V2_LIMITS,
  WAKE_ANCHORED,
} from './engine';
import { DEV_CLEARED } from './gate';
import { BY_ID, GOALS, LIBRARY, titleFor } from './library';
import type { ChoiceStep, PickV2, ProfileV2, Targets, Wake } from './types';

/*
 * The only V2 module the app talks to. It always applies the development release gate, and turns engine
 * output into plan habits that carry their personal targets with them.
 */

const ICON: Record<string, string> = {
  discipline_bed: 'bed',
  sleep_bedtime: 'moon',
  sleep_wake: 'alarm',
  sleep_no_phone_bed: 'eye-off',
  sleep_morning_light: 'partly-sunny',
  move_walk: 'walk',
  move_strength_prep: 'barbell',
  move_strength_gentle: 'fitness',
  move_balance: 'accessibility',
  move_seated: 'body',
  food_produce: 'nutrition',
  food_unsweetened: 'cafe',
  food_water_meals: 'water',
  screen_morning: 'sunny',
  screen_social: 'time',
  screen_app_limit: 'hourglass',
  mind_read: 'book',
  mind_breathe: 'leaf',
  mind_journal: 'create',
  focus_deepwork: 'flash',
  focus_top3: 'list',
  social_reach_out: 'chatbubble-ellipses',
  confidence_compliment: 'heart',
  confidence_talk: 'chatbubbles',
};

export const iconFor = (id: string) => ICON[id] ?? 'star';

export type Option = {
  id: string;
  title: string;
  icon: string;
  domain: string;
  why: string;
  targets: Targets;
  notes: string[];
};

export type PreviewPlan =
  | { status: 'not_eligible'; message: string }
  | {
      status: 'ok';
      picks: PickV2[];
      choice: ChoiceStep;
      /** The choice step's alternatives, ready to show. */
      options: Option[];
      planNotes: string[];
      /** Honest development-only limitation: what the release gate withheld, if anything. */
      limitation: string | null;
      /** Not even the choice step can reach the minimum of 3 with reviewed habits. */
      blocked: boolean;
    };

const titles = (ids: string[]) =>
  ids.length === 1 ? ids[0] : `${ids.slice(0, -1).join(', ')} and ${ids[ids.length - 1]}`;

function option(id: string, p: ProfileV2): Option {
  const h = BY_ID[id];
  return {
    id,
    title: titleFor(h, p),
    icon: iconFor(id),
    domain: h.domain,
    why: h.why,
    targets: targetsFor(h, p),
    notes: habitNotes(h, p),
  };
}

/** The plan offered for these answers under the release gate (gate null = the full candidate pool, for tests). */
export function previewPlan(p: ProfileV2, gate: ReadonlySet<string> | null = DEV_CLEARED): PreviewPlan {
  const r = generatePlanV2(p, gate ?? undefined);
  if (r.status !== 'ok') return r;
  // What the full candidate pool would have given that the gate held back.
  const full = generatePlanV2(p);
  const withheld = full.status === 'ok' && gate ? full.picks.filter((x) => !gate.has(x.id)).map((x) => x.title) : [];
  const blocked = !!r.choice && r.choice.required > r.choice.alternatives.length;
  const limitation = blocked
    ? 'There aren’t enough suitable habits for your answers to make a plan of 3 yet.'
    : withheld.length
      ? `${titles(withheld)} would suit your answers, but ${
          withheld.length === 1 ? 'it is' : 'they are'
        } still being reviewed, so ${withheld.length === 1 ? 'it isn’t' : 'they aren’t'} offered yet.`
      : null;
  return {
    status: 'ok',
    picks: r.picks,
    choice: r.choice,
    options: r.choice?.alternatives.map((a) => option(a.id, p)) ?? [],
    // The limitation already names the withheld movement habit.
    planNotes: withheld.length ? r.planNotes.filter((n) => n !== PREVIEW_MOVEMENT_NOTE) : r.planNotes,
    limitation,
    blocked,
  };
}

/** True when choosing this alternative needs a time answer first (W1, or W2 for Earlier bedtime). */
export function choiceNeedsTime(p: ProfileV2, chosen: string[], id: string): boolean {
  return pendingTimeQuestion(p, DEV_CLEARED, [...chosen, id]) !== null;
}

/** The conditional time question these answers still need (W1, then W2), or null when there's none. */
export function pendingTimeQuestion(
  p: ProfileV2,
  gate: ReadonlySet<string> | null = DEV_CLEARED,
  chosen: string[] = [],
): 'wake' | 'bed' | null {
  const r = previewPlan(p, gate);
  if (r.status !== 'ok') return null;
  // Only the habits actually in the plan: the generated ones plus any the person has chosen. An optional
  // alternative that needs a time asks for it when it's chosen, not before.
  const ids = [...r.picks.map((x) => x.id), ...chosen];
  if (!p.wake && ids.some((id) => WAKE_ANCHORED.includes(id))) return 'wake';
  if (p.wake?.kind === 'time' && p.inBed === undefined && ids.includes('sleep_bedtime')) return 'bed';
  return null;
}

/** Whether a choice can be added next to the plan and the choices already made. */
export function canChoose(r: Extract<PreviewPlan, { status: 'ok' }>, chosen: string[], id: string): boolean {
  if (!r.choice || chosen.includes(id) || !r.options.some((o) => o.id === id)) return false;
  const limit = r.choice.required > 0 ? r.choice.required : 1;
  return chosen.length < limit && fitsPlan(id, [...r.picks.map((x) => x.id), ...chosen]);
}

function spec(id: string, targets: Targets, notes: string[], p: ProfileV2): HabitSpec {
  const h = BY_ID[id];
  return { title: titleFor(h, p), icon: iconFor(id), why: h.why, targets, notes };
}

/**
 * The plan to start: the generated habits plus the choices, every one at Easy of its personal window.
 * Null when the choices don't satisfy the choice step (the screen never allows that).
 */
export function assemblePlan(p: ProfileV2, chosen: string[], day = 1, extras: string[] = []): PlanHabit[] | null {
  const r = previewPlan(p);
  if (r.status !== 'ok' || r.blocked) return null;
  const required = r.choice?.required ?? 0;
  if (required > 0 ? chosen.length !== required : chosen.length > (r.choice ? 1 : 0)) return null;
  // Earlier bedtime is only safe with the person's own wake and in-bed times (the time-in-bed ceiling).
  const timed = p.wake?.kind === 'time' && p.inBed !== undefined;
  const all = [...r.picks.map((x) => x.id), ...chosen, ...extras];
  if (!timed && all.includes('sleep_bedtime')) return null;
  // Wake-anchored targets are only set once the wake time has been asked.
  if (!p.wake && all.some((id) => WAKE_ANCHORED.includes(id))) return null;
  const made: string[] = [];
  for (const id of chosen) {
    if (!canChoose(r, made, id)) return null;
    made.push(id);
  }
  // Optional extras: each one must still be on offer next to everything before it, up to the plan maximum.
  const added: Option[] = [];
  for (const id of extras) {
    const o = extraOptions(p, r, [...made, ...added.map((x) => x.id)]).find((x) => x.id === id);
    if (!o || extraRoom(r, [...made, ...added.map((x) => x.id)]) < 1) return null;
    added.push(o);
  }
  const at = (id: string, targets: Targets, notes: string[]): PlanHabit => ({
    habitId: id,
    level: 'easy',
    addedOnDay: day,
    levelSince: day - 1,
    spec: spec(id, targets, notes, p),
  });
  return [
    ...r.picks.map((x) => at(x.id, x.targets, x.notes)),
    ...made.map((id) => {
      const o = r.options.find((x) => x.id === id)!;
      return at(id, o.targets, o.notes);
    }),
    ...added.map((o) => at(o.id, o.targets, o.notes)),
  ];
}

/** The most habits a plan holds: the generated plan never goes above it, and neither do additions. */
export const PLAN_MAX = V2_LIMITS.PLAN_MAX;

/** Simple groups for browsing the library. */
export type Category = 'Energy' | 'Focus' | 'Calm' | 'Confidence' | 'Fitness';
export const CATEGORIES: Category[] = ['Energy', 'Focus', 'Calm', 'Confidence', 'Fitness'];
const CATEGORY: Record<string, Category> = {
  sleep_bedtime: 'Energy',
  sleep_wake: 'Energy',
  sleep_morning_light: 'Energy',
  food_produce: 'Energy',
  food_unsweetened: 'Energy',
  food_water_meals: 'Energy',
  focus_deepwork: 'Focus',
  focus_top3: 'Focus',
  screen_morning: 'Focus',
  screen_social: 'Focus',
  screen_app_limit: 'Focus',
  mind_read: 'Focus',
  mind_breathe: 'Calm',
  mind_journal: 'Calm',
  sleep_no_phone_bed: 'Calm',
  social_reach_out: 'Confidence',
  confidence_compliment: 'Confidence',
  confidence_talk: 'Confidence',
  move_walk: 'Fitness',
};
export const categoryOf = (id: string): Category => CATEGORY[id] ?? 'Energy';

export type LibraryOption = Option & {
  category: Category;
  /** One of the habits for the person's goal. */
  forGoal: boolean;
  /** The time answer this habit's targets need and the profile doesn't have yet, if any. */
  needsTime: 'wake' | 'bed' | null;
};

function timeNeeded(p: ProfileV2, id: string): 'wake' | 'bed' | null {
  if (!WAKE_ANCHORED.includes(id)) return null;
  if (!p.wake) return 'wake';
  if (id === 'sleep_bedtime' && p.wake.kind === 'time' && p.inBed === undefined) return 'bed';
  return null;
}

/**
 * Reviewed habits this person could add next to the habits in `planIds`: the same eligibility as the plan itself
 * (age, health precautions, the release gate, so never a held or prototype exercise habit) and the same fit rules
 * (no duplicates, no overlapping habits, no more than the plan allows per area). Goal habits come first, in the
 * goal's own order; the rest follow in library order. This only lists; it never recommends anything new.
 */
export function libraryOptions(
  p: ProfileV2,
  planIds: string[],
  gate: ReadonlySet<string> = DEV_CLEARED,
): LibraryOption[] {
  const goal = GOALS[p.goal];
  const goalIds = [...goal.core, ...goal.support, ...goal.suggest];
  const ids = planIds.filter((id) => BY_ID[id]);
  const ok = LIBRARY.filter(
    (h) => h.mode !== 'foundation' && !ids.includes(h.id) && exclusion(h, p, gate) === null && fitsPlan(h.id, ids),
  );
  const rank = (id: string) =>
    goalIds.includes(id) ? goalIds.indexOf(id) : goalIds.length + LIBRARY.findIndex((h) => h.id === id);
  return ok
    .sort((a, b) => rank(a.id) - rank(b.id))
    .map((h) => ({
      ...option(h.id, p),
      category: categoryOf(h.id),
      forGoal: goalIds.includes(h.id),
      needsTime: timeNeeded(p, h.id),
    }));
}

/**
 * What can be added to a running plan: room under the maximum, and eligible habits that fit. A habit whose targets
 * need a time the plan never asked for is listed with `needsTime`; adding it asks that first (`prepareAdd`).
 */
export function addableHabits(p: ProfileV2, plan: PlanHabit[]): LibraryOption[] {
  if (plan.length >= PLAN_MAX) return [];
  return libraryOptions(
    p,
    plan.filter((h) => !h.custom).map((h) => h.habitId),
  );
}

/** The plan habit a library addition becomes: Easy of its personal window, from today, like a swap. */
export function addedHabit(p: ProfileV2, plan: PlanHabit[], id: string, day: number): PlanHabit | null {
  const o = addableHabits(p, plan).find((x) => x.id === id);
  if (!o || o.needsTime !== null) return null;
  return { habitId: id, level: 'easy', addedOnDay: day, levelSince: day - 1, spec: spec(id, o.targets, o.notes, p) };
}

/** Time answers collected while adding a habit. */
export type TimeAnswers = { wake?: Wake; inBed?: string };

/** The profile with only the missing time answers filled in: an answer the profile already has is never replaced. */
export function withMissingTimes(p: ProfileV2, a: TimeAnswers): ProfileV2 {
  return {
    ...p,
    ...(p.wake === undefined && a.wake ? { wake: a.wake } : {}),
    ...(p.inBed === undefined && a.inBed !== undefined && (p.wake ?? a.wake)?.kind === 'time'
      ? { inBed: a.inBed }
      : {}),
  };
}

export type AddStep =
  | { status: 'ok'; profile: ProfileV2; habit: PlanHabit }
  | { status: 'ask'; question: 'wake' | 'bed' }
  | { status: 'unsuitable'; message: string };

/**
 * Adding a library habit to a running plan, one step at a time. With the time answers given so far: add it (with
 * the profile those answers complete), ask the next missing time, or explain why the answers make it unsuitable.
 * Eligibility is checked again with every answer, so an answer can rule a habit out but never unlock one, and
 * nothing in the plan or its saved targets changes until the habit is actually added.
 */
export function prepareAdd(p: ProfileV2, plan: PlanHabit[], id: string, answers: TimeAnswers, day: number): AddStep {
  const before = addableHabits(p, plan).find((o) => o.id === id);
  const title = before?.title ?? BY_ID[id]?.title ?? 'That habit';
  if (!before) return { status: 'unsuitable', message: `${title} can’t be added to your plan right now.` };
  const next = withMissingTimes(p, answers);
  const o = addableHabits(next, plan).find((x) => x.id === id);
  if (!o) {
    const reason = exclusion(BY_ID[id], next, DEV_CLEARED);
    return {
      status: 'unsuitable',
      message: reason
        ? `With that answer, ${title} isn’t a good fit: ${reason}. Nothing was added.`
        : `With that answer, ${title} wouldn’t fit next to your plan. Nothing was added.`,
    };
  }
  if (o.needsTime) return { status: 'ask', question: o.needsTime };
  const habit = addedHabit(next, plan, id, day);
  return habit ? { status: 'ok', profile: next, habit } : { status: 'unsuitable', message: `${title} can’t be added.` };
}

/** How many optional extras still fit in a new plan: the generated habits and choices come first. */
export function extraRoom(r: Extract<PreviewPlan, { status: 'ok' }>, chosen: string[]): number {
  const base = r.picks.length + Math.max(r.choice?.required ?? 0, chosen.length);
  return Math.max(0, PLAN_MAX - base);
}

/**
 * Optional extras for a new plan, after the generated habits and any required choices (`chosen` may also hold
 * extras already added). When the plan's choice step is optional, its alternatives are the first extras, in the
 * engine's order, so there is one optional list; a required choice step stays separate and isn't repeated here.
 * Never preselected by the app.
 */
export function extraOptions(
  p: ProfileV2,
  r: Extract<PreviewPlan, { status: 'ok' }>,
  chosen: string[],
): LibraryOption[] {
  if (r.blocked) return [];
  const choiceIds = r.options.map((o) => o.id);
  const list = libraryOptions(p, [...r.picks.map((x) => x.id), ...chosen]);
  if ((r.choice?.required ?? 0) > 0) return list.filter((o) => !choiceIds.includes(o.id));
  return [
    ...choiceIds.map((id) => list.find((o) => o.id === id)).filter((o): o is LibraryOption => !!o),
    ...list.filter((o) => !choiceIds.includes(o.id)),
  ];
}

/** D.6: what a V2 habit can be swapped for, age- and precaution-aware and gated. Each starts at Easy. */
export function swapChoices(p: ProfileV2, plan: PlanHabit[], replacing: string): Option[] {
  if (!BY_ID[replacing]) return [];
  const ids = plan.filter((h) => !h.custom && BY_ID[h.habitId]).map((h) => h.habitId);
  return swapOptionsV2(p, ids, replacing, DEV_CLEARED).map((s) => ({ ...option(s.id, p), targets: s.targets }));
}

/** The swapped-in plan habit: Easy of its personal window, whatever the phase (D.6). */
export function swappedHabit(p: ProfileV2, plan: PlanHabit[], replacing: string, id: string, day: number) {
  const o = swapChoices(p, plan, replacing).find((x) => x.id === id);
  if (!o) return null;
  const habit: PlanHabit = {
    habitId: id,
    level: 'easy',
    addedOnDay: day,
    levelSince: day - 1,
    spec: spec(id, o.targets, o.notes, p),
  };
  return habit;
}

/** A saved V2 habit that lost its spec (damaged save): rebuilt from the profile, or left to the V1 fallback. */
export function repairSpec(p: ProfileV2 | null, h: PlanHabit): PlanHabit {
  if (h.spec || h.custom || !p || !BY_ID[h.habitId] || BY_ID[h.habitId].start(p) === null) return h;
  const def = BY_ID[h.habitId];
  if (def.ladder(p).length < def.start(p)! + 3) return h;
  return { ...h, spec: spec(h.habitId, targetsFor(def, p), habitNotes(def, p), p) };
}
