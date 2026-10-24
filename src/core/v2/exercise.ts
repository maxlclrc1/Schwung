import type { Weekday } from '../types';
import type { CheckAnswer, ExerciseCheck, ExerciseCheckKey, ProfileV2 } from './types';
import { DEV_CLEARED } from './gate';

/*
 * The four exercise prototypes and their shared safety layer (SCHWUNG_V2_FITNESS_PROTOTYPES.md).
 * Development-only: their library entries are `release: 'prototype'`, so no normal plan, choice, swap or
 * onboarding can offer them. Only the Exercise Preview passes EXERCISE_PREVIEW_GATE. Every target is a
 * provisional product draft, not clinically validated; nothing here is medical advice.
 */

export const EXERCISE_IDS = ['move_strength_prep', 'move_strength_gentle', 'move_balance', 'move_seated'] as const;
export type ExerciseId = (typeof EXERCISE_IDS)[number];
export const isExercise = (id: string): id is ExerciseId => (EXERCISE_IDS as readonly string[]).includes(id);

/** The release gate plus the exercise prototypes. Used only by the development Exercise Preview. */
export const EXERCISE_PREVIEW_GATE: ReadonlySet<string> = new Set([...DEV_CLEARED, ...EXERCISE_IDS]);

/** Shown with every exercise habit, everywhere. */
export const EXERCISE_SAFETY = [
  'Move comfortably, without straining or holding your breath.',
  'Stop for pain, dizziness, chest discomfort, faintness or unusual breathlessness.',
  'Seek urgent medical help for serious or persistent warning symptoms.',
  'Follow any advice you already have from a clinician. Schwung can’t assess you and isn’t medical advice.',
];

export type Movement = { name: string; steps: string[] };

export type ExerciseContent = {
  /** One-line summary of who it's for (shown in the preview and habit detail). */
  forWhom: string;
  setup: string;
  movements: Movement[];
  /** The schedule rule in words. */
  rhythm: string;
};

export const EXERCISE_CONTENT: Record<ExerciseId, ExerciseContent> = {
  move_strength_prep: {
    forWhom: 'For people aged 16–64 who are inactive or lightly active, with no health precautions reported.',
    setup: 'Use a wall, and a stable chair that won’t slide. Move slowly and with control; breathe normally.',
    movements: [
      {
        name: 'Wall push-up',
        steps: [
          'Stand an arm’s length from a wall, hands flat on it at shoulder height.',
          'Bend your elbows to bring your chest towards the wall, then push back.',
        ],
      },
      {
        name: 'Sit-to-stand',
        steps: [
          'Sit near the front of a stable chair, feet flat and hip-width apart.',
          'Stand up, then sit back down slowly. Use your hands on your thighs if you need to.',
        ],
      },
      {
        name: 'Supported calf raise',
        steps: [
          'Stand holding the back of a stable chair or a worktop.',
          'Rise slowly onto your toes, then lower your heels with control.',
        ],
      },
    ],
    rhythm: '2 days a week, never two days in a row. You choose the days.',
  },
  move_strength_gentle: {
    forWhom:
      'Possibly suitable for older adults or people with joint discomfort who can stand up and move about on their own.',
    setup:
      'Keep a stable support within reach the whole time. Go at a comfortable pace and stop well before it’s hard.',
    movements: [
      {
        name: 'Supported sit-to-stand',
        steps: [
          'Sit in a stable chair with arms, feet flat.',
          'Push on the chair arms to stand up, then lower yourself slowly back down.',
        ],
      },
      {
        name: 'Gentle wall push-up',
        steps: [
          'Stand close to a wall, hands flat on it at shoulder height.',
          'Bend your elbows a little, then push back. Keep the movement small and comfortable.',
        ],
      },
      {
        name: 'Supported heel raise',
        steps: ['Hold a worktop with both hands.', 'Lift your heels a little, then lower them slowly.'],
      },
    ],
    rhythm: '2 days a week, never two days in a row. You choose the days.',
  },
  move_balance: {
    forWhom:
      'Possibly suitable for older adults who can stand on their own and have no recent falls, unsteadiness or dizziness.',
    setup:
      'Stand at a kitchen worktop or the back of a heavy chair that won’t move, with clear floor around you. Hold on the whole time; you never need to let go.',
    movements: [
      {
        name: 'Supported stance',
        steps: [
          'Stand tall facing the worktop, holding it with both hands.',
          'Bring your feet a little closer together than usual and hold the position, still holding on.',
          'Rest between holds. Sit down whenever you want to.',
        ],
      },
    ],
    rhythm: '3 days a week. You choose the days.',
  },
  move_seated: {
    forWhom: 'For people who find walking or standing difficult and can do gentle movements sitting down.',
    setup:
      'Sit upright in a stable chair without wheels, feet flat if you can. Leave out any movement that’s uncomfortable.',
    movements: [
      {
        name: 'Ankle movements',
        steps: ['Lift your toes, then press them down, or circle each foot slowly.'],
      },
      {
        name: 'Seated marching',
        steps: ['Hold the sides of the chair.', 'Lift one knee a little, lower it, then the other.'],
      },
      {
        name: 'Arm movements',
        steps: ['Raise your arms forward or out to the side, only as high as is comfortable, then lower them.'],
      },
    ],
    rhythm: 'Daily, with a rest day whenever you need one. Resting never counts as missed.',
  },
};

export const EXERCISE_LADDERS: Record<ExerciseId, [string, string, string]> = {
  move_strength_prep: [
    '1 move, 5 controlled reps (wall push-up, sit-to-stand or calf raise)',
    '2 moves, 5–8 controlled reps each',
    '3 moves, 8–10 controlled reps each',
  ],
  move_strength_gentle: [
    '1 move, about 5 comfortable reps, with support',
    '2 moves, about 5–8 comfortable reps each',
    '3 moves, about 8–10 comfortable reps each',
  ],
  move_balance: [
    'Supported stance at a worktop: 3 short holds of about 10 seconds',
    'Supported stance: 3 holds of about 20 seconds, still holding on',
    'Supported stance: 3 holds of about 30 seconds, still holding on',
  ],
  move_seated: [
    '2 seated movements you choose, about 5 times each',
    '3 seated movements, about 5 times each',
    '3 seated movements, about 8 times each, only if comfortable',
  ],
};

/** The short safety check. "Safe" is the answer that lets the prototype go ahead; anything else blocks it. */
export const CHECK_QUESTIONS: Record<ExerciseCheckKey, { question: string; safe: CheckAnswer }> = {
  standUnaided: {
    question: 'Can you stand up and stay standing safely without help from another person?',
    safe: 'yes',
  },
  fallsOrUnsteady: { question: 'Have you fallen recently, or felt significantly unsteady on your feet?', safe: 'no' },
  dizziness: { question: 'Do you get dizzy spells or faint?', safe: 'no' },
  recentSurgery: { question: 'Have you had a fracture, surgery or a joint replacement recently?', safe: 'no' },
  clinicianLimit: { question: 'Has a clinician told you to limit or avoid physical activity?', safe: 'no' },
};

/** Which check questions each prototype needs. Beginner strength relies on the quiz's precautions. */
export const CHECK_FOR: Record<ExerciseId, ExerciseCheckKey[]> = {
  move_strength_prep: [],
  move_strength_gentle: ['standUnaided', 'fallsOrUnsteady', 'dizziness', 'recentSurgery', 'clinicianLimit'],
  move_balance: ['standUnaided', 'fallsOrUnsteady', 'dizziness', 'recentSurgery', 'clinicianLimit'],
  move_seated: ['dizziness', 'recentSurgery', 'clinicianLimit'],
};

export const CHECK_BLOCKED_MESSAGE =
  'Thanks for telling us. With these answers, Schwung can’t safely suggest exercises on its own. That doesn’t mean you shouldn’t move: a physiotherapist, GP or other health professional can suggest what suits you.';

export type CheckOutcome = 'not-needed' | 'needed' | 'clear' | 'blocked';

/** The check result for one prototype: unanswered or "not sure" never counts as safe. */
export function checkOutcome(id: ExerciseId, check: ExerciseCheck | undefined): CheckOutcome {
  const keys = CHECK_FOR[id];
  if (!keys.length) return 'not-needed';
  if (!check || keys.some((k) => check[k] === undefined)) {
    // An unsafe answer already given blocks even before the rest is answered.
    if (check && keys.some((k) => check[k] !== undefined && check[k] !== CHECK_QUESTIONS[k].safe)) return 'blocked';
    return 'needed';
  }
  return keys.every((k) => check[k] === CHECK_QUESTIONS[k].safe) ? 'clear' : 'blocked';
}

/** Weekdays are a ring: Saturday and Sunday are next to each other. */
function adjacent(a: Weekday, b: Weekday): boolean {
  const d = Math.abs(a - b);
  return d === 1 || d === 6;
}

/** The schedule each prototype allows (seated mobility is daily: no schedule). */
export function validExerciseDays(id: string, days: Weekday[]): boolean {
  if (id === 'move_strength_prep' || id === 'move_strength_gentle')
    return days.length === 2 && new Set(days).size === 2 && !adjacent(days[0], days[1]);
  if (id === 'move_balance') return days.length === 3 && new Set(days).size === 3;
  return true;
}

/** Suggested days the person confirms or changes when adding (Mon/Thu; Mon/Wed/Fri). */
export const SUGGESTED_DAYS: Partial<Record<ExerciseId, Weekday[]>> = {
  move_strength_prep: [1, 4],
  move_strength_gentle: [1, 4],
  move_balance: [1, 3, 5],
};

/** Who each prototype is never offered to (also enforced by the library's rules). */
export const EXCLUSIONS: Record<ExerciseId, string[]> = {
  move_strength_prep: [
    'Aged 65 or over (the gentle version is designed for you)',
    'Joint, back or injury pain (the gentle version is designed for you)',
    'Heart or blood-pressure condition',
    'Pregnant or recently gave birth',
    'Walking or standing for long is difficult',
    'Health questions skipped',
    'Already active 3+ days a week',
  ],
  move_strength_gentle: [
    'Under 65 without joint discomfort (beginner version instead)',
    'Heart or blood-pressure condition',
    'Pregnant or recently gave birth',
    'Walking or standing for long is difficult',
    'Health questions skipped',
    'Already active 3+ days a week',
    'Any safety-check answer other than the safe one (including "Not sure")',
  ],
  move_balance: [
    'Under 65',
    'Heart or blood-pressure condition',
    'Pregnant or recently gave birth',
    'Walking or standing for long is difficult',
    'Health questions skipped',
    'Any safety-check answer other than the safe one (including "Not sure")',
  ],
  move_seated: [
    'Walking and standing aren’t difficult (other movement habits fit better)',
    'Heart or blood-pressure condition',
    'Pregnant or recently gave birth',
    'Health questions skipped',
    'Any safety-check answer other than the safe one (including "Not sure")',
  ],
};

/** The level-up self-check: an exercise habit only levels up when the person confirms this. */
export const SELF_CHECK = 'This level feels comfortable, controlled and manageable for me.';

export function canAcceptLevelUp(habitId: string, selfCheck: boolean): boolean {
  return !isExercise(habitId) || selfCheck;
}

/** Profile helpers shared by the library's exclusion rules. */
export const exerciseAges = {
  beginner: (p: ProfileV2) => p.age !== 'u16' && p.age !== '65p',
  older: (p: ProfileV2) => p.age === '65p',
};
