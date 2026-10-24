import type { HabitSpec, PlanHabit } from '../types';
import {
  fitsPlan,
  generatePlanV2,
  habitNotes,
  PREVIEW_MOVEMENT_NOTE,
  swapOptionsV2,
  targetsFor,
  WAKE_ANCHORED,
} from './engine';
import { DEV_CLEARED } from './gate';
import { BY_ID } from './library';
import type { ChoiceStep, PickV2, ProfileV2, Targets } from './types';

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
    title: h.title,
    icon: iconFor(id),
    domain: h.domain,
    why: h.why,
    targets: targetsFor(h, p),
    notes: habitNotes(h, p),
  };
}

/** The plan the development preview offers for these answers (gate null = the full candidate pool, for tests). */
export function previewPlan(p: ProfileV2, gate: ReadonlySet<string> | null = DEV_CLEARED): PreviewPlan {
  const r = generatePlanV2(p, gate ?? undefined);
  if (r.status !== 'ok') return r;
  // What the full candidate pool would have given that the gate held back.
  const full = generatePlanV2(p);
  const withheld = full.status === 'ok' && gate ? full.picks.filter((x) => !gate.has(x.id)).map((x) => x.title) : [];
  const blocked = !!r.choice && r.choice.required > r.choice.alternatives.length;
  const limitation = blocked
    ? 'Development preview: there aren’t enough reviewed habits for your answers to make a plan of 3 yet.'
    : withheld.length
      ? `Development preview: ${titles(withheld)} would suit your answers, but ${
          withheld.length === 1 ? 'it is' : 'they are'
        } still waiting for scientific review, so ${withheld.length === 1 ? 'it isn’t' : 'they aren’t'} offered yet.`
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

function spec(id: string, targets: Targets, notes: string[]): HabitSpec {
  const h = BY_ID[id];
  return { title: h.title, icon: iconFor(id), why: h.why, targets, notes };
}

/**
 * The plan to start: the generated habits plus the choices, every one at Easy of its personal window.
 * Null when the choices don't satisfy the choice step (the screen never allows that).
 */
export function assemblePlan(p: ProfileV2, chosen: string[], day = 1): PlanHabit[] | null {
  const r = previewPlan(p);
  if (r.status !== 'ok' || r.blocked) return null;
  const required = r.choice?.required ?? 0;
  if (required > 0 ? chosen.length !== required : chosen.length > (r.choice ? 1 : 0)) return null;
  // Earlier bedtime is only safe with the person's own wake and in-bed times (the time-in-bed ceiling).
  const timed = p.wake?.kind === 'time' && p.inBed !== undefined;
  const all = [...r.picks.map((x) => x.id), ...chosen];
  if (!timed && all.includes('sleep_bedtime')) return null;
  // Wake-anchored targets are only set once the wake time has been asked.
  if (!p.wake && all.some((id) => WAKE_ANCHORED.includes(id))) return null;
  const made: string[] = [];
  for (const id of chosen) {
    if (!canChoose(r, made, id)) return null;
    made.push(id);
  }
  const at = (id: string, targets: Targets, notes: string[]): PlanHabit => ({
    habitId: id,
    level: 'easy',
    addedOnDay: day,
    levelSince: day - 1,
    spec: spec(id, targets, notes),
  });
  return [
    ...r.picks.map((x) => at(x.id, x.targets, x.notes)),
    ...made.map((id) => {
      const o = r.options.find((x) => x.id === id)!;
      return at(id, o.targets, o.notes);
    }),
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
    spec: spec(id, o.targets, o.notes),
  };
  return habit;
}

/** A saved V2 habit that lost its spec (damaged save): rebuilt from the profile, or left to the V1 fallback. */
export function repairSpec(p: ProfileV2 | null, h: PlanHabit): PlanHabit {
  if (h.spec || h.custom || !p || !BY_ID[h.habitId] || BY_ID[h.habitId].start(p) === null) return h;
  const def = BY_ID[h.habitId];
  if (def.ladder(p).length < def.start(p)! + 3) return h;
  return { ...h, spec: spec(h.habitId, targetsFor(def, p), habitNotes(def, p)) };
}
