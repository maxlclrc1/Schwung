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
  /** One or two user-facing sentences, grounded only in what the user actually answered. */
  reason: string;
  /** Serves the user's stated goal (picked for it, or an answer habit that also serves it). */
  forGoal: boolean;
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

type AreaPick = { id: string; level: Level; reason: string; forGoal: boolean };

/**
 * The habit (if any) each answer calls for, with a reason that quotes the answer.
 * Where an answer leaves room for more than one sensible habit, the goal picks the one that serves
 * it best (`forGoal`), so the goal shapes the plan itself, not just the wording.
 */
function areaPick(area: Area, a: Answers): AreaPick | null {
  const g = a.goal;
  const screenHabit = a.screen !== '<2h';
  switch (area) {
    case 'sleep':
      if (a.sleep === '<5h' || a.sleep === '5-6h')
        return {
          id: 'sleep_bedtime',
          level: 'easy',
          reason: `You sleep ${a.sleep === '<5h' ? 'less than 5' : '5–6'} hours. More time in bed is the most direct fix.`,
          forGoal: g === 'energy' || g === 'fitness',
        };
      if (a.sleep === '6-7h') {
        if (g === 'energy' || g === 'fitness')
          return {
            id: 'sleep_bedtime',
            level: 'easy',
            reason:
              g === 'energy'
                ? 'You sleep 6–7 hours. A little more sleep is the most direct route to more energy.'
                : 'You sleep 6–7 hours. Training pays off in recovery, and most recovery is sleep.',
            forGoal: true,
          };
        // A wind-down is another phone rule; with a screen habit already in the plan, go to bed earlier instead.
        if (screenHabit && g !== 'calm')
          return {
            id: 'sleep_bedtime',
            level: 'easy',
            reason: 'You sleep 6–7 hours. Getting to bed a little earlier is the simplest fix.',
            forGoal: false,
          };
        return {
          id: 'sleep_no_phone_bed',
          level: 'easy',
          reason:
            g === 'calm'
              ? 'You sleep 6–7 hours. A screen-free wind-down settles your mind and helps you fall asleep sooner.'
              : 'You sleep 6–7 hours. A screen-free wind-down helps you fall asleep sooner.',
          forGoal: g === 'calm',
        };
      }
      return null;
    case 'screen':
      if (a.screen === '6-8h' || a.screen === '8h+')
        return {
          id: 'screen_limit',
          level: 'easy',
          reason: `You use screens ${a.screen === '8h+' ? 'more than 8' : '6–8'} hours a day. This starts with a cap you can actually hit.`,
          forGoal: false,
        };
      if (a.screen === '4-6h')
        return {
          id: 'screen_social',
          level: 'easy',
          reason:
            g === 'focus'
              ? 'You use screens 4–6 hours a day. Keeping social apps out of your mornings protects your best focus hours.'
              : 'You use screens 4–6 hours a day. Keeping social apps out of your mornings is the easiest hour to win back.',
          forGoal: g === 'focus',
        };
      if (a.screen === '2-4h')
        return {
          id: 'screen_morning',
          level: 'easy',
          reason: 'Your screen time is moderate. A phone-free start keeps the first part of your day yours.',
          forGoal: false,
        };
      return null;
    case 'exercise':
      if ((a.exercise === 'never' || a.exercise === 'rarely') && g === 'fitness')
        return {
          id: 'move_workout',
          level: 'easy',
          reason:
            a.exercise === 'never'
              ? 'You don’t exercise yet and want to get in shape. Ten push-ups and twenty squats is a real start.'
              : 'You exercise a few times a month and want to get in shape. A short daily workout makes it a habit.',
          forGoal: true,
        };
      if (a.exercise === 'never')
        return {
          id: 'move_walk',
          level: 'easy',
          reason:
            g === 'energy' || g === 'calm'
              ? `You don’t exercise yet. A short daily walk is the easiest way in, and one of the best for ${g === 'energy' ? 'energy' : 'stress'}.`
              : 'You don’t exercise yet. A short daily walk is the easiest way in.',
          forGoal: g === 'energy' || g === 'calm',
        };
      if (a.exercise === 'rarely')
        return {
          id: 'move_steps',
          level: 'easy',
          reason: 'You exercise a few times a month. A daily step goal turns that into everyday movement.',
          forGoal: g === 'energy',
        };
      if (a.exercise === '1-2x' && g === 'energy')
        return {
          id: 'move_steps',
          level: 'easy',
          reason: 'You work out 1–2 times a week. Moving every day keeps your energy up on the days in between.',
          forGoal: true,
        };
      if (a.exercise === '1-2x')
        return {
          id: 'move_workout',
          level: 'easy',
          reason: 'You work out 1–2 times a week. A short daily session builds on that.',
          forGoal: g === 'fitness',
        };
      return null;
    case 'water':
      if (a.water === '<0.5L' || a.water === '0.5-1L')
        return {
          id: 'water',
          level: 'easy',
          reason: `You drink ${a.water === '<0.5L' ? 'less than 2' : '2–4'} glasses a day. This starts at 4.`,
          forGoal: g === 'energy',
        };
      if (a.water === '1-2L')
        return {
          id: 'water',
          // 4 glasses would already be met by many people in this range, so start one step up.
          level: 'medium',
          reason: 'You drink 4–8 glasses a day. This makes 6 a steady daily minimum.',
          forGoal: g === 'energy',
        };
      return null;
    case 'mind': {
      if (a.mind !== 'never' && a.mind !== 'rarely' && a.mind !== 'weekly') return null;
      const habit =
        g === 'calm'
          ? 'mind_meditate'
          : g === 'focus'
            ? 'mind_read'
            : g === 'confidence'
              ? 'mind_journal'
              : a.mind === 'never'
                ? 'mind_journal'
                : a.mind === 'rarely'
                  ? 'mind_meditate'
                  : 'mind_read';
      const lead =
        a.mind === 'never'
          ? 'You don’t read, meditate, or journal yet.'
          : a.mind === 'rarely'
            ? 'You rarely read, meditate, or journal.'
            : 'You read, meditate, or journal about once a week.';
      const why: Record<string, string> = {
        mind_journal:
          g === 'confidence'
            ? 'Writing one line a day about what went well makes your progress visible to you.'
            : 'One line a day is the smallest possible start.',
        mind_meditate:
          g === 'calm'
            ? 'Three slow minutes a day is the easiest way to take the edge off stress.'
            : 'Three minutes of breathing is easy to fit in.',
        mind_read:
          g === 'focus'
            ? 'A few pages a day trains the sustained attention focus depends on.'
            : 'A few pages a day makes it daily.',
      };
      return {
        id: habit,
        level: 'easy',
        reason: `${lead} ${why[habit]}`,
        forGoal: g === 'calm' || g === 'focus' || g === 'confidence',
      };
    }
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

/** How each goal is phrased to the user ("Built for more energy"). */
export const GOAL_LABEL: Record<Goal, string> = {
  energy: 'more energy',
  focus: 'better focus',
  discipline: 'more discipline',
  confidence: 'more confidence',
  calm: 'less stress',
  fitness: 'getting in shape',
};

/**
 * Habits that serve each goal, best first, each with its own reason. The later entries are
 * goal-relevant second choices used when there's room, so a plan never needs generic filler
 * unless the user already does almost everything here.
 */
const GOAL_HABITS: Record<Goal, { id: string; reason: string }[]> = {
  energy: [
    { id: 'move_walk', reason: 'A brisk daily walk is one of the fastest ways to lift your energy.' },
    { id: 'water', reason: 'Even mild dehydration feels like tiredness, which makes this an easy energy win.' },
    {
      id: 'sleep_wake',
      reason: 'Waking at the same time every day steadies your energy more than an extra hour in bed.',
    },
    { id: 'move_steps', reason: 'Moving through the day keeps your energy from dipping in the afternoon.' },
    { id: 'screen_morning', reason: 'Starting the day off your phone keeps your morning energy for yourself.' },
  ],
  focus: [
    { id: 'focus_deepwork', reason: 'One protected block of deep work a day is how focus is built.' },
    { id: 'focus_top3', reason: 'Choosing your one priority each morning keeps the day from scattering.' },
    {
      id: 'screen_social',
      reason: 'Social apps break focus like nothing else. Keeping them out of your mornings protects it.',
    },
    { id: 'mind_read', reason: 'Reading a few pages a day trains the sustained attention focus depends on.' },
    { id: 'sleep_wake', reason: 'A steady wake time keeps your mind sharp at the same hours every day.' },
  ],
  discipline: [
    { id: 'discipline_cold', reason: 'Doing one hard thing on purpose, every day, is discipline in its purest form.' },
    { id: 'focus_top3', reason: 'Naming your most important task and doing it first is discipline in practice.' },
    { id: 'sleep_wake', reason: 'Getting up at the same time every day is the backbone of a disciplined day.' },
    { id: 'mind_journal', reason: 'A one-line daily check-in keeps you honest with yourself.' },
  ],
  confidence: [
    {
      id: 'confidence_talk',
      reason: 'Confidence grows from small social reps. One conversation a day is enough to start.',
    },
    {
      id: 'confidence_compliment',
      reason: 'Saying something kind and specific gets easier every time, and so does speaking up.',
    },
    { id: 'move_workout', reason: 'Getting physically stronger changes how you carry yourself.' },
    { id: 'mind_journal', reason: 'Writing down one thing you did well makes your progress visible to you.' },
  ],
  calm: [
    { id: 'mind_meditate', reason: 'A few slow breaths are the fastest way to bring stress down.' },
    { id: 'sleep_no_phone_bed', reason: 'A screen-free last few minutes lets your mind settle before sleep.' },
    { id: 'mind_journal', reason: 'Getting worries out of your head and onto paper makes them smaller.' },
    { id: 'move_walk', reason: 'A daily walk is one of the most reliable ways to lower stress.' },
    { id: 'screen_social', reason: 'Less scrolling first thing means a calmer start to every day.' },
    { id: 'focus_top3', reason: 'One clear priority each morning makes a busy day feel far less overwhelming.' },
  ],
  fitness: [
    { id: 'move_workout', reason: 'Short daily workouts are how getting in shape actually happens.' },
    { id: 'move_steps', reason: 'Daily steps on top of your training add up to real fitness.' },
    { id: 'water', reason: 'Your body trains and recovers better when it’s properly hydrated.' },
    { id: 'sleep_wake', reason: 'A steady wake time improves your sleep, which is where recovery happens.' },
  ],
};

/**
 * The habits that *are* each goal, as opposed to ones that support it. Only these count as
 * already covering the goal, and only these are protected when a full plan has to drop one.
 */
const CORE: Record<Goal, string[]> = {
  energy: ['move_walk', 'water', 'sleep_bedtime', 'move_steps', 'sleep_wake'],
  focus: ['focus_deepwork', 'focus_top3'],
  discipline: ['discipline_cold', 'focus_top3'],
  confidence: ['confidence_talk', 'confidence_compliment'],
  calm: ['mind_meditate', 'sleep_no_phone_bed', 'move_walk'],
  fitness: ['move_workout', 'move_steps'],
};

/** Added to an answer habit's reason when it is also what carries the goal. */
const GOAL_TIE: Record<Goal, string> = {
  energy: 'It’s also one of the best levers for energy.',
  focus: 'It also sharpens your focus.',
  discipline: 'It’s also daily discipline practice.',
  confidence: 'It also builds confidence.',
  calm: 'It also helps with stress.',
  fitness: 'It’s also the core of getting in shape.',
};

/** Habits that are really the same practice; a plan never contains both. */
const OVERLAPS: [string, string][] = [
  ['move_walk', 'move_steps'],
  ['screen_morning', 'screen_social'],
];
/** Phone-limiting habits; a plan has at most two, so it doesn't read as "use your phone less" five ways. */
const PHONE_RULES = ['sleep_no_phone_bed', 'screen_morning', 'screen_social', 'screen_limit'];
const MAX_PHONE_RULES = 2;

/**
 * Not covered by any quiz question, so no one has told us they already do these.
 * Used only to reach 5 habits when the basics are already in good shape.
 */
const COMPLEMENTS = ['focus_top3', 'confidence_compliment', 'discipline_cold', 'focus_deepwork', 'confidence_talk'];

const FOUNDATION_REASON = 'An easy win to start every day. Small wins build momentum.';

function pick(id: string, level: Level, source: PickSource, reason: string, forGoal = false): PlanPick {
  return { habit: getHabit(id)!, level, source, reason, forGoal };
}

/**
 * Deterministic plan from quiz answers: 5–6 habits, each with a reason.
 *
 * Order of selection:
 * 1. The foundation habit (make your bed).
 * 2. One habit per area where the answers show room to improve; where an answer allows more than
 *    one sensible habit, the goal chooses (see areaPick).
 * 3. The goal. If a habit already in the plan serves it and there's no room, that habit carries
 *    the goal. Otherwise the first suitable goal habit is added, preferring a new category; if that
 *    makes 7, the least severe area habit that isn't serving the goal is dropped.
 * 4. Fillers up to 5: other habits for the same goal, then complements (preferring categories not
 *    yet in the plan).
 * Never something the user already does, never two overlapping habits, at most two phone rules.
 * Shown in order: foundation, goal habits, then the rest.
 */
export function buildPlan(a: Answers): PlanPick[] {
  const skip = alreadyDoing(a);
  const picks: PlanPick[] = [pick(FOUNDATION, 'easy', 'foundation', FOUNDATION_REASON)];
  const has = (id: string) => picks.some((p) => p.habit.id === id);
  // The foundation habit doesn't count, so it never crowds out the discipline goal.
  const hasCategory = (id: string) =>
    picks.some((p) => p.source !== 'foundation' && p.habit.category === getHabit(id)!.category);
  const phoneRules = () => picks.filter((p) => PHONE_RULES.includes(p.habit.id)).length;
  const fits = (id: string) =>
    !skip.has(id) &&
    !has(id) &&
    !OVERLAPS.some(([x, y]) => (id === x && has(y)) || (id === y && has(x))) &&
    !(PHONE_RULES.includes(id) && phoneRules() >= MAX_PHONE_RULES);
  const areaOf = new Map<string, Area>();

  // 2. Areas, most foundational first.
  for (const area of AREA_PRIORITY) {
    const p = areaPick(area, a);
    if (!p || skip.has(p.id) || has(p.id)) continue;
    picks.push(pick(p.id, p.level, 'answer', p.reason, p.forGoal));
    areaOf.set(p.id, area);
  }

  // 3. Goal.
  const goal = a.goal;
  const options = GOAL_HABITS[goal].filter((g) => !skip.has(g.id));
  const core = CORE[goal];
  for (const p of picks) if (p.source === 'answer' && options.some((g) => g.id === p.habit.id)) p.forGoal = true;
  const covering = picks.find((p) => p.source === 'answer' && core.includes(p.habit.id));
  const fresh = options.filter((g) => fits(g.id));
  // Without a core habit yet, add one. With one already there, branch out to a different area
  // instead of stacking a second habit of the same kind (e.g. a workout and a step goal on day one).
  const choice = covering
    ? (fresh.find((g) => !hasCategory(g.id)) ?? fresh[0])
    : (fresh.find((g) => core.includes(g.id) && !hasCategory(g.id)) ??
      fresh.find((g) => core.includes(g.id)) ??
      fresh.find((g) => !hasCategory(g.id)) ??
      fresh[0]);

  if (covering && (picks.length >= TARGET_MAX || !choice)) {
    if (!mentionsGoal(covering.reason, goal)) covering.reason += ` ${GOAL_TIE[goal]}`;
  } else if (choice) {
    picks.push(pick(choice.id, 'easy', 'goal', choice.reason, true));
    if (picks.length > TARGET_MAX) dropLeastSevere(picks, areaOf, a, core);
  }

  // 4. Fill to 5: more habits for the goal first, then complements, preferring new categories.
  for (const g of options) {
    if (picks.length >= TARGET_MIN) break;
    if (fits(g.id)) picks.push(pick(g.id, 'easy', 'goal', g.reason, true));
  }
  const complements = COMPLEMENTS.filter((id) => !skip.has(id));
  for (const allowSameCategory of [false, true]) {
    for (const id of complements) {
      if (picks.length >= TARGET_MIN) break;
      if (!fits(id) || (!allowSameCategory && hasCategory(id))) continue;
      picks.push(pick(id, 'easy', 'complement', getHabit(id)!.why));
    }
  }

  // Foundation first, then what serves the goal (the reason the user is here), then the rest.
  const rank = (p: PlanPick) => (p.source === 'foundation' ? 0 : p.forGoal ? 1 : p.source === 'answer' ? 2 : 3);
  return picks
    .map((p, i) => ({ p, i }))
    .sort((x, y) => rank(x.p) - rank(y.p) || x.i - y.i)
    .map((x) => x.p);
}

/** Whether a reason already speaks to the goal, so we don't add a second sentence saying the same. */
function mentionsGoal(reason: string, goal: Goal): boolean {
  const words: Record<Goal, RegExp> = {
    energy: /energy/i,
    focus: /focus/i,
    discipline: /discipline/i,
    confidence: /confiden/i,
    calm: /stress|calm|settle/i,
    fitness: /shape|recovery|training/i,
  };
  return words[goal].test(reason);
}

function dropLeastSevere(picks: PlanPick[], areaOf: Map<string, Area>, a: Answers, core: string[]) {
  const severity = (area: Area) => (SEVERITY[area] as Record<string, number>)[a[area]];
  // Never drop a core goal habit first; if every area habit is core, drop the mildest anyway.
  for (const spareGoal of [true, false]) {
    let victim = -1;
    for (let i = 0; i < picks.length; i++) {
      const area = areaOf.get(picks[i].habit.id);
      if (!area || picks[i].source !== 'answer' || (spareGoal && core.includes(picks[i].habit.id))) continue;
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
    if (victim !== -1) {
      picks.splice(victim, 1);
      return;
    }
  }
}

/** The habits only, in plan order. */
export function generatePlan(a: Answers): LibraryHabit[] {
  return buildPlan(a).map((p) => p.habit);
}

export function toPlan(picks: PlanPick[], day = 1): PlanHabit[] {
  return picks.map((p) => ({ habitId: p.habit.id, level: p.level, addedOnDay: day, levelSince: day - 1 }));
}
