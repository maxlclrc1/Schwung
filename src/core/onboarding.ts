import { ANSWER_LABEL } from './answers';
import { ASCENT_PHASES } from './ascent';
import { getHabit } from './habits';
import { Area, AREA_PRIORITY, areaHabit, PlanPick, SEVERITY } from './plan';
import { LEVEL_UP_RUN, STEP_DOWN_MISSES } from './progression';
import type { Answers, Level } from './types';

/*
 * What onboarding tells people about their answers and their plan. Everything here is derived from
 * the same rules that build and run the plan, so the screens can't promise something the app won't do.
 */

export const AREA_TITLE: Record<Area, string> = {
  sleep: 'Sleep',
  screen: 'Screen time',
  exercise: 'Exercise',
  water: 'Water',
  mind: 'Reading, meditating or journaling',
};

export const AREA_ICON: Record<Area, string> = {
  sleep: 'moon',
  screen: 'phone-portrait',
  exercise: 'barbell',
  water: 'water',
  mind: 'book',
};

/** How a healthy answer is described under "Already working". */
const WORKING: { [K in Area]: Partial<Record<Answers[K], string>> } = {
  sleep: { '7-8h': '7–8 hours of sleep', '8h+': '8+ hours of sleep' },
  screen: { '<2h': 'Under 2 hours of screen time' },
  exercise: { '3-4x': 'Active 3–4 times a week', '5x+': 'Active 5+ times a week' },
  water: { '2-3L': '8–12 glasses of water a day', '3L+': '12+ glasses of water a day' },
  mind: {
    'most-days': 'Reading, meditating or journaling most days',
    daily: 'Reading, meditating or journaling daily',
  },
};

export type Lever = { area: Area; title: string; answer: string; habitId: string; task: string };

export type StartingPoint = {
  /** Areas where the answer is already healthy, so no habit was needed for them. */
  working: { area: Area; text: string }[];
  /** The area furthest from healthy that the plan has a habit for, or null if every answer is healthy. */
  lever: Lever | null;
};

const answerOf = (area: Area, a: Answers) => a[area] as keyof (typeof SEVERITY)[Area];

export function startingPoint(a: Answers, picks: PlanPick[]): StartingPoint {
  const working = AREA_PRIORITY.filter((area) => areaHabit(area, a) === null).map((area) => ({
    area,
    text: (WORKING[area] as Record<string, string>)[a[area]] ?? ANSWER_LABEL[area][a[area] as never],
  }));

  let lever: Lever | null = null;
  let worst = -1;
  // AREA_PRIORITY order, so ties go to the more foundational area (the same tie-break the plan uses).
  for (const area of AREA_PRIORITY) {
    const id = areaHabit(area, a);
    const pick = picks.find((p) => p.source === 'answer' && p.habit.id === id);
    if (!pick) continue;
    const severity = (SEVERITY[area] as Record<string, number>)[answerOf(area, a)];
    if (severity <= worst) continue;
    worst = severity;
    lever = {
      area,
      title: AREA_TITLE[area],
      answer: (ANSWER_LABEL[area] as Record<string, string>)[a[area]],
      habitId: pick.habit.id,
      task: pick.habit.levels[pick.level],
    };
  }
  return { working, lever };
}

export type PhaseStep = { name: string; from: number; to: number; level: Level; text: string; about: string };

const PHASE_ABOUT = [
  'Each habit starts at the level your answers point to.',
  'Each habit steps up one level.',
  'Each habit reaches its full version.',
];

/**
 * How one habit from the plan grows across the three phases. Phase changes level every habit up one
 * step (see `reconcile`), and onboarding plans start at easy or medium, so an easy habit shows all three.
 */
export function phasePreview(picks: PlanPick[]): { habitTitle: string; steps: PhaseStep[] } {
  const example =
    picks.find((p) => p.source !== 'foundation' && p.level === 'easy') ?? picks.find((p) => p.level === 'easy')!;
  const order: Level[] = ['easy', 'medium', 'hard'];
  const habit = getHabit(example.habit.id)!;
  return {
    habitTitle: habit.title,
    steps: ASCENT_PHASES.map((phase, i) => {
      const level = order[Math.min(order.indexOf(example.level) + i, 2)];
      return {
        name: phase.name,
        from: phase.from,
        to: phase.to,
        level,
        text: habit.levels[level],
        about: PHASE_ABOUT[i],
      };
    }),
  };
}

/** The extra rules that move levels between phases, worded from their actual thresholds. */
export const GROWTH_NOTES = [
  `Done a habit ${LEVEL_UP_RUN} days in a row? You’ll be offered an early level-up.`,
  `A habit left for ${STEP_DOWN_MISSES} days in a row steps back one level, never below its easiest, so it’s easy to pick up again.`,
];
