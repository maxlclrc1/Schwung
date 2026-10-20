import { getHabit } from './habits';
import type { Answers, Goal, Level, LibraryHabit, PlanHabit } from './types';

export const MIN_HABITS = 3;
const TARGET_MIN = 5;
const TARGET_MAX = 6;

/** Always first: an easy, concrete win to start each day. */
const FOUNDATION = 'discipline_bed';

/**
 * Why a habit is in the plan.
 * - foundation: the always-on easy first win
 * - answer: the user reported something in this area that this habit addresses
 * - goal: picked for the user's stated goal
 * - complement: the basics are already covered, so this adds something new
 */
export type PickSource = 'foundation' | 'answer' | 'goal' | 'complement';

export type PlanPick = {
  habit: LibraryHabit;
  level: Level;
  source: PickSource;
  /** One user-facing sentence, grounded only in what the user actually answered. */
  reason: string;
};

type Area = 'sleep' | 'exercise' | 'water' | 'screen' | 'mind';

/**
 * When a plan has more than 6 habits, the area habit with the lowest severity goes.
 * Ties go in this order, most foundational kept longest.
 */
const AREA_PRIORITY: Area[] = ['sleep', 'exercise', 'water', 'screen', 'mind'];

// 0 = healthy, 4 = the hardest end of each scale.
const SEVERITY = {
  sleep: { '8h+': 0, '7-8h': 1, '6-7h': 2, '5-6h': 3, '<5h': 4 },
  screen: { '<2h': 0, '2-4h': 1, '4-6h': 2, '6-8h': 3, '8h+': 4 },
  exercise: { '5x+': 0, '3-4x': 1, '1-2x': 2, rarely: 3, never: 4 },
  water: { '3L+': 0, '2-3L': 1, '1-2L': 2, '0.5-1L': 3, '<0.5L': 4 },
  mind: { daily: 0, 'most-days': 1, weekly: 2, rarely: 3, never: 4 },
} as const;

type AreaPick = { id: string; level: Level; reason: string };

/** The habit (if any) each answer calls for, with a reason that quotes the answer. */
function areaPick(area: Area, a: Answers): AreaPick | null {
  switch (area) {
    case 'sleep':
      if (a.sleep === '<5h' || a.sleep === '5-6h')
        return {
          id: 'sleep_bedtime',
          level: 'easy',
          reason: `You sleep ${a.sleep === '<5h' ? 'less than 5' : '5–6'} hours. More time in bed is the most direct fix.`,
        };
      if (a.sleep === '6-7h')
        return {
          id: 'sleep_no_phone_bed',
          level: 'easy',
          reason: 'You sleep 6–7 hours. A screen-free wind-down helps you fall asleep sooner.',
        };
      return null;
    case 'screen':
      if (a.screen === '6-8h' || a.screen === '8h+')
        return {
          id: 'screen_limit',
          level: 'easy',
          reason: `You use screens ${a.screen === '8h+' ? 'more than 8' : '6–8'} hours a day. This starts with a cap you can actually hit.`,
        };
      if (a.screen === '4-6h')
        return {
          id: 'screen_social',
          level: 'easy',
          reason:
            'You use screens 4–6 hours a day. Keeping social apps out of your mornings is the easiest hour to win back.',
        };
      if (a.screen === '2-4h')
        return {
          id: 'screen_morning',
          level: 'easy',
          reason: 'Your screen time is moderate. A phone-free start keeps the first part of your day yours.',
        };
      return null;
    case 'exercise':
      if (a.exercise === 'never')
        return {
          id: 'move_walk',
          level: 'easy',
          reason: 'You don’t exercise yet. A short daily walk is the easiest way in.',
        };
      if (a.exercise === 'rarely')
        return {
          id: 'move_steps',
          level: 'easy',
          reason: 'You exercise a few times a month. A daily step goal turns that into everyday movement.',
        };
      if (a.exercise === '1-2x')
        return {
          id: 'move_workout',
          level: 'easy',
          reason: 'You work out 1–2 times a week. A short daily session builds on that.',
        };
      return null;
    case 'water':
      if (a.water === '<0.5L' || a.water === '0.5-1L')
        return {
          id: 'water',
          level: 'easy',
          reason: `You drink ${a.water === '<0.5L' ? 'less than 2' : '2–4'} glasses a day. This starts at 4.`,
        };
      if (a.water === '1-2L')
        return {
          id: 'water',
          // 4 glasses would already be met by many people in this range, so start one step up.
          level: 'medium',
          reason: 'You drink 4–8 glasses a day. This makes 6 a steady daily minimum.',
        };
      return null;
    case 'mind':
      if (a.mind === 'never')
        return {
          id: 'mind_journal',
          level: 'easy',
          reason: 'You don’t read, meditate, or journal yet. One line a day is the smallest possible start.',
        };
      if (a.mind === 'rarely')
        return {
          id: 'mind_meditate',
          level: 'easy',
          reason: 'You rarely read, meditate, or journal. Three minutes of breathing is easy to fit in.',
        };
      if (a.mind === 'weekly')
        return {
          id: 'mind_read',
          level: 'easy',
          reason: 'You read, meditate, or journal about once a week. A few pages a day makes it daily.',
        };
      return null;
  }
}

/**
 * Habits the user's answers say they already do regularly. These are never assigned,
 * neither as an area habit nor as a goal habit or filler.
 */
function alreadyDoing(a: Answers): Set<string> {
  const out = new Set<string>();
  if (a.exercise === '3-4x' || a.exercise === '5x+') {
    // Daily steps are everyday movement, not training, so they stay available as a goal habit.
    out.add('move_walk').add('move_workout');
  }
  if (a.water === '2-3L' || a.water === '3L+') out.add('water');
  // The quiz asks about reading, meditating and journaling together, so a regular answer covers all three.
  if (a.mind === 'most-days' || a.mind === 'daily') out.add('mind_read').add('mind_meditate').add('mind_journal');
  if (a.sleep === '7-8h' || a.sleep === '8h+') out.add('sleep_bedtime');
  if (a.screen === '<2h') out.add('screen_limit').add('screen_social').add('screen_morning');
  return out;
}

const GOAL_LABEL: Record<Goal, string> = {
  energy: 'more energy',
  focus: 'better focus',
  discipline: 'more discipline',
  confidence: 'more confidence',
  calm: 'less stress',
  fitness: 'getting in shape',
};

/** Habits that serve each goal, best first, with the goal-specific reason. */
const GOAL_HABITS: Record<Goal, { id: string; reason: string }[]> = {
  energy: [
    { id: 'move_walk', reason: 'A daily walk is one of the quickest natural energy boosts.' },
    { id: 'water', reason: 'Even mild dehydration shows up as tiredness.' },
    { id: 'sleep_wake', reason: 'A steady wake time makes the sleep you get more restful.' },
    { id: 'move_steps', reason: 'Moving through the day keeps your energy from dipping.' },
  ],
  focus: [
    { id: 'focus_deepwork', reason: 'One protected block of focus trains your attention.' },
    { id: 'focus_top3', reason: 'Knowing your priority stops the day from scattering.' },
  ],
  discipline: [
    { id: 'discipline_cold', reason: 'Doing one hard thing on purpose builds the discipline muscle.' },
    { id: 'focus_top3', reason: 'Deciding in advance, then following through, is discipline in practice.' },
  ],
  confidence: [
    { id: 'confidence_talk', reason: 'Small social reps are how confidence grows.' },
    { id: 'confidence_compliment', reason: 'Speaking up kindly gets easier every time you do it.' },
  ],
  calm: [
    { id: 'mind_meditate', reason: 'A few slow breaths are the fastest way to calm your nervous system.' },
    { id: 'sleep_no_phone_bed', reason: 'A screen-free evening lets your mind settle before sleep.' },
    { id: 'mind_journal', reason: 'Writing worries down gets them out of your head.' },
  ],
  fitness: [
    { id: 'move_workout', reason: 'Short daily workouts add up to real strength.' },
    { id: 'move_steps', reason: 'Daily movement on top of your training builds overall fitness.' },
  ],
};

/**
 * Not covered by any quiz question, so no one has told us they already do these.
 * Used only to reach 5 habits when the basics are already in good shape.
 */
const COMPLEMENTS = ['focus_top3', 'confidence_compliment', 'discipline_cold', 'focus_deepwork', 'confidence_talk'];

const FOUNDATION_REASON = 'An easy win to start every day. Small wins build momentum.';

function pick(id: string, level: Level, source: PickSource, reason: string): PlanPick {
  return { habit: getHabit(id)!, level, source, reason };
}

/**
 * Deterministic plan from quiz answers: 5–6 habits, each with a reason.
 *
 * Order of selection:
 * 1. The foundation habit (make your bed).
 * 2. One habit per area where the answers show room to improve.
 * 3. The goal. If a habit already in the plan serves it and there's no room, that habit carries
 *    the goal. Otherwise the first suitable goal habit is added, preferring a new category; if that
 *    makes 7, the least severe area habit is dropped. The goal habit is never dropped.
 * 4. Fillers up to 5: other habits for the same goal, then complements (preferring categories not
 *    yet in the plan). Never something the user already does.
 */
export function buildPlan(a: Answers): PlanPick[] {
  const skip = alreadyDoing(a);
  const picks: PlanPick[] = [pick(FOUNDATION, 'easy', 'foundation', FOUNDATION_REASON)];
  const has = (id: string) => picks.some((p) => p.habit.id === id);
  // The foundation habit doesn't count, so it never crowds out the discipline goal.
  const hasCategory = (id: string) =>
    picks.some((p) => p.source !== 'foundation' && p.habit.category === getHabit(id)!.category);
  const areaOf = new Map<string, Area>();

  // 2. Areas, most foundational first.
  for (const area of AREA_PRIORITY) {
    const p = areaPick(area, a);
    if (!p || skip.has(p.id) || has(p.id)) continue;
    picks.push(pick(p.id, p.level, 'answer', p.reason));
    areaOf.set(p.id, area);
  }

  // 3. Goal.
  const goal = a.goal;
  const goalLabel = GOAL_LABEL[goal];
  const options = GOAL_HABITS[goal].filter((g) => !skip.has(g.id));
  const covering = picks.find((p) => options.some((g) => g.id === p.habit.id));
  const fresh = options.filter((g) => !has(g.id));
  const choice = fresh.find((g) => !hasCategory(g.id)) ?? fresh[0];

  if (covering && (picks.length >= TARGET_MAX || !choice)) {
    covering.reason += ` It also serves your goal of ${goalLabel}.`;
  } else if (choice) {
    picks.push(pick(choice.id, 'easy', 'goal', `For your goal of ${goalLabel}: ${lower(choice.reason)}`));
    if (picks.length > TARGET_MAX) dropLeastSevere(picks, areaOf, a);
  }

  // 4. Fill to 5: more habits for the goal first, then complements, preferring new categories.
  for (const g of options) {
    if (picks.length >= TARGET_MIN) break;
    if (!has(g.id)) picks.push(pick(g.id, 'easy', 'goal', `For your goal of ${goalLabel}: ${lower(g.reason)}`));
  }
  const complements = COMPLEMENTS.filter((id) => !skip.has(id));
  for (const allowSameCategory of [false, true]) {
    for (const id of complements) {
      if (picks.length >= TARGET_MIN) break;
      if (has(id) || (!allowSameCategory && hasCategory(id))) continue;
      picks.push(
        pick(
          id,
          'easy',
          'complement',
          `Rounds out your plan with something the quiz didn’t cover. ${getHabit(id)!.why}`,
        ),
      );
    }
  }

  return picks;
}

function dropLeastSevere(picks: PlanPick[], areaOf: Map<string, Area>, a: Answers) {
  const severity = (area: Area) => (SEVERITY[area] as Record<string, number>)[a[area]];
  let victim = -1;
  for (let i = 0; i < picks.length; i++) {
    const area = areaOf.get(picks[i].habit.id);
    if (!area || picks[i].source !== 'answer') continue;
    if (victim === -1) {
      victim = i;
      continue;
    }
    const current = areaOf.get(picks[victim].habit.id)!;
    const sv = severity(area);
    const sc = severity(current);
    // Lower severity loses; on a tie, the less foundational area (later in AREA_PRIORITY) loses.
    if (sv < sc || (sv === sc && AREA_PRIORITY.indexOf(area) > AREA_PRIORITY.indexOf(current))) victim = i;
  }
  if (victim !== -1) picks.splice(victim, 1);
}

function lower(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** The habits only, in plan order. */
export function generatePlan(a: Answers): LibraryHabit[] {
  return buildPlan(a).map((p) => p.habit);
}

export function toPlan(picks: PlanPick[], day = 1): PlanHabit[] {
  return picks.map((p) => ({ habitId: p.habit.id, level: p.level, addedOnDay: day, levelSince: day - 1 }));
}
