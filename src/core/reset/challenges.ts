import { BY_ID, isTeen, TEEN_FOCUS_MAX_MIN } from '../v2/library';
import type { ProfileV2 } from '../v2/types';

/*
 * The 66-Day Life Reset: flagship challenge definitions (Stage 1 of SCHWUNG_LIFE_RESET_HABIT_AUDIT.md; decisions in
 * SCHWUNG_LIFE_RESET_CHALLENGES.md). Data only: nothing in the app imports this yet, and no challenge may be
 * recommended to anyone until its review status says so.
 *
 * Every number here is a design default the person can adjust, not a proven outcome or a minimum. A target only
 * ever scales its challenge's one core measure; anything else (a phone-free zone, a wind-down, a weekly review) is an
 * option the person turns on themselves, so choosing a challenge never adds commitments they didn't pick.
 */

export type Intensity = 'starter' | 'standard' | 'challenge';
export type Phase = 'foundation' | 'momentum' | 'mastery';
export const INTENSITIES: Intensity[] = ['starter', 'standard', 'challenge'];
export const PHASES: Phase[] = ['foundation', 'momentum', 'mastery'];

/** The onboarding answers to "What do you want to change in the next 66 days?" (audit 7.3). */
export type Transformation =
  | 'discipline' // Become more disciplined
  | 'phone' // Stop wasting time on my phone
  | 'focus' // Improve my focus and productivity
  | 'confidence' // Become more confident
  | 'healthy' // Build a healthier routine
  | 'control' // Feel more in control of my life
  | 'learn'; // Learn or build something
export const TRANSFORMATIONS: Transformation[] = [
  'discipline',
  'phone',
  'focus',
  'confidence',
  'healthy',
  'control',
  'learn',
];

/** How much of a challenge someone already does, which suggests an intensity (never forces one). */
export type Baseline = 'none' | 'occasional' | 'regular' | 'experienced';
export const BASELINES: Baseline[] = ['none', 'occasional', 'regular', 'experienced'];
/** The intensity suggested for each baseline: experienced people start at Challenge, never at a trivial step. */
export const SUGGESTED_INTENSITY: Record<Baseline, Intensity> = {
  none: 'starter',
  occasional: 'starter',
  regular: 'standard',
  experienced: 'challenge',
};

/** What a target counts, and which way is harder. */
export type TargetUnit =
  | 'focus-minutes' // per session, phone in another room
  | 'reading-minutes' // per session
  | 'practice-minutes' // per session
  | 'pull-budget-minutes' // a day, for the main phone pull (lower is harder)
  | 'priority-days' // days a week the #1 task is done by the chosen time
  | 'initiatives' // social initiatives a week, from the person's own ladder
  | 'active-minutes-week' // weekly active minutes, in activities the person chooses
  | 'wake-window-minutes' // up within this many minutes of the person's own anchor time (lower is harder)
  | 'reset-minutes' // per evening reset
  | 'reach-outs'; // meaningful messages or calls a week

export const HARDER: Record<TargetUnit, 'higher' | 'lower'> = {
  'focus-minutes': 'higher',
  'reading-minutes': 'higher',
  'practice-minutes': 'higher',
  'pull-budget-minutes': 'lower',
  'priority-days': 'higher',
  initiatives: 'higher',
  'active-minutes-week': 'higher',
  'wake-window-minutes': 'lower',
  'reset-minutes': 'higher',
  'reach-outs': 'higher',
};

/**
 * A target amount: a fixed default, or a share of the person's own baseline (their Screen Time for the main pull,
 * their usual weekly active minutes). A baseline amount needs that baseline; without it the first week measures
 * it instead (never a guessed number).
 */
export type Amount =
  | { kind: 'fixed'; value: number }
  | {
      kind: 'baseline';
      factor: number;
      /** For "higher" units: increases stop here (someone already above it keeps their own level). */
      max?: number;
    };

export type Target = {
  amount: Amount;
  unit: TargetUnit;
  /** Days a week it's due, on days the person chooses (7 = every day). */
  daysPerWeek: number;
  /** A session may be split into this many blocks (each within the 16–17 focus cap). */
  blocks?: number;
  /** Rungs of the person's own social ladder (discomfort 0–10) the initiatives come from. */
  rungs?: [number, number];
  /** Estimated minutes it takes on a day it's due, for the time check. */
  minutesPerDay: number;
};

export type Targets = Record<Intensity, Record<Phase, Target>>;

/** What a target restricts or commits, so a challenge can't add one of these the person didn't choose. */
export type Commitment = 'phone' | 'sleep' | 'activity';

/** A part of a challenge. The core is what the targets scale; options are only ever turned on by the person. */
export type Component = {
  id: string;
  label: string;
  role: 'core' | 'option';
  commits?: Commitment;
  /** An option with its own eligibility: the V2 habit whose safety rules decide who can turn it on. */
  safetyFrom?: string;
};

/** The person's own Day 66 destination: always set (or skipped) by them, with a suggestion, never a quota. */
export type Destination = {
  kind: 'milestone' | 'count' | 'reduction' | 'consistency' | 'weekly-amount';
  prompt: string;
  example: string;
  /** What the person counts, for count destinations. */
  unit?: string;
  /** A suggested range for each intensity; the person picks any value, or none. */
  suggestion?: Record<Intensity, [number, number]>;
};

/**
 * How progress is recorded, kept light: the card's one tap a day, and at most one optional number a week. A day
 * with nothing recorded is unknown, never a miss.
 */
export type Measurement = {
  daily: 'tap' | 'tap-counts';
  weekly: null | { prompt: string; unit: string; optional: true };
  checkIn: 'weekly-optional';
  missing: 'unknown';
};

export type AgeRule = 'allowed' | 'starter-only' | 'not-offered';

export type Review = {
  /** No challenge can be recommended to real users yet (approval is a separate step). */
  recommendable: false;
  status: 'design-draft' | 'needs-expert-review';
  pending: string[];
};

export type Challenge = {
  id: string;
  name: string;
  area: string;
  description: string;
  transformations: { primary: Transformation[]; paired: Transformation[] };
  /** Existing habits whose role this challenge takes over (they stay in saved programs as they are). */
  absorbs: string[];
  /** Retired V1 habits this challenge stands in for in new programs (never offered again themselves). */
  replaces: string[];
  /** Supporting microhabits that suit it (reviewed V2 habits, kept as separate habits). */
  supports: string[];
  components: Component[];
  targets: Targets;
  destination: Destination;
  measurement: Measurement;
  /** Existing V2 habits whose safety rules apply to the whole challenge (see `challengeExclusion`). */
  safetyFrom: string[];
  ages: { teen: AgeRule; note?: string };
  review: Review;
};

// Helpers to keep the tables readable.
const fixed = (value: number): Amount => ({ kind: 'fixed', value });
const share = (factor: number, max?: number): Amount =>
  max === undefined ? { kind: 'baseline', factor } : { kind: 'baseline', factor, max };
const t = (unit: TargetUnit, amount: Amount, daysPerWeek: number, minutesPerDay: number, extra = {}): Target => ({
  unit,
  amount,
  daysPerWeek,
  minutesPerDay,
  ...extra,
});
const timed = (unit: TargetUnit, rows: Record<Intensity, [number, number, number]>, days: number[][], blocks = {}) =>
  Object.fromEntries(
    INTENSITIES.map((i, n) => [
      i,
      Object.fromEntries(
        PHASES.map((p, k) => {
          const minutes = rows[i][k];
          const b = (blocks as Record<string, number>)[`${i}.${p}`];
          return [p, t(unit, fixed(minutes), days[n][k], minutes, b ? { blocks: b } : {})];
        }),
      ),
    ]),
  ) as Targets;

const LIGHT: Pick<Measurement, 'checkIn' | 'missing'> = { checkIn: 'weekly-optional', missing: 'unknown' };
const DRAFT: Review = { recommendable: false, status: 'design-draft', pending: ['Founder approval of the defaults'] };

export const CHALLENGES: Challenge[] = [
  {
    id: 'reset_deep_work',
    name: 'Deep Work Sprint',
    area: 'Deep focus',
    description: 'Protected focus blocks on one project you name, phone in another room.',
    transformations: { primary: ['focus', 'learn'], paired: ['discipline'] },
    absorbs: ['focus_deepwork'],
    replaces: [],
    supports: ['screen_morning'],
    components: [{ id: 'focus-blocks', label: 'Focus blocks on your project', role: 'core' }],
    // Long sessions are split into blocks no longer than the 16–17 focus cap.
    targets: timed(
      'focus-minutes',
      { starter: [20, 25, 30], standard: [30, 45, 60], challenge: [60, 90, 120] },
      [
        [4, 5, 5],
        [5, 5, 5],
        [5, 5, 5],
      ],
      { 'challenge.momentum': 2, 'challenge.mastery': 2 },
    ),
    destination: {
      kind: 'milestone',
      prompt: 'What will your focus blocks move forward by Day 66?',
      example: 'First draft of my thesis chapter submitted',
    },
    measurement: { daily: 'tap', weekly: null, ...LIGHT },
    safetyFrom: [],
    ages: { teen: 'allowed', note: `Blocks of at most ${TEEN_FOCUS_MAX_MIN} min, as Focused work already does.` },
    review: DRAFT,
  },
  {
    id: 'reset_phone',
    name: 'Phone Under Control',
    area: 'Digital discipline',
    description: 'A daily budget for what pulls you in most, set from your own Screen Time.',
    transformations: { primary: ['phone'], paired: ['focus', 'discipline'] },
    absorbs: ['screen_app_limit', 'screen_social', 'screen_morning'],
    replaces: ['screen_limit'],
    supports: ['sleep_no_phone_bed'],
    components: [
      { id: 'pull-budget', label: 'Daily budget for your main pull', role: 'core', commits: 'phone' },
      { id: 'zone-morning', label: 'Phone-free first hour', role: 'option', commits: 'phone' },
      { id: 'zone-bed', label: 'Phone-free before bed', role: 'option', commits: 'phone' },
      { id: 'zone-meals', label: 'Phone-free meals', role: 'option', commits: 'phone' },
      { id: 'phone-free-evening', label: 'A phone-free evening a week', role: 'option', commits: 'phone' },
    ],
    // Shares of the person's own baseline for the main pull, never below what they say they need.
    targets: Object.fromEntries(
      (
        [
          ['starter', [0.9, 0.8, 0.7]],
          ['standard', [0.8, 0.7, 0.6]],
          ['challenge', [0.7, 0.55, 0.45]],
        ] as const
      ).map(([i, f]) => [
        i,
        Object.fromEntries(PHASES.map((p, k) => [p, t('pull-budget-minutes', share(f[k]), 7, 0)])),
      ]),
    ) as Targets,
    destination: {
      kind: 'reduction',
      prompt: 'How much time a day do you want your main pull to take by Day 66?',
      example: 'Social media down from about 3 h to about 2 h a day',
      unit: 'share of your Week 1 average',
      suggestion: { starter: [0.7, 0.9], standard: [0.55, 0.8], challenge: [0.4, 0.65] },
    },
    measurement: {
      daily: 'tap',
      weekly: { prompt: 'This week’s daily average for your main pull (Screen Time)', unit: 'minutes', optional: true },
      ...LIGHT,
    },
    safetyFrom: [],
    ages: { teen: 'allowed' },
    review: DRAFT,
  },
  {
    id: 'reset_plan_execute',
    name: 'Plan and Execute',
    area: 'Daily execution',
    description: 'Choose tomorrow’s most important task the evening before, and do it first.',
    transformations: { primary: ['discipline', 'control', 'focus'], paired: [] },
    absorbs: ['focus_top3'],
    replaces: [],
    supports: ['discipline_bed'],
    components: [
      { id: 'priority-first', label: 'Your #1 task, planned and done first', role: 'core' },
      { id: 'weekly-review', label: 'A short weekly review', role: 'option' },
    ],
    targets: Object.fromEntries(
      (
        [
          ['starter', [2, 3, 4], 3],
          ['standard', [3, 4, 5], 5],
          ['challenge', [4, 5, 5], 10],
        ] as const
      ).map(([i, d, minutes]) => [
        i,
        Object.fromEntries(PHASES.map((p, k) => [p, t('priority-days', fixed(d[k]), d[k], minutes)])),
      ]),
    ) as Targets,
    destination: {
      kind: 'consistency',
      prompt: 'On how many of your work or school days do you want your #1 done first?',
      example: '4 of my 5 workdays',
    },
    measurement: { daily: 'tap', weekly: null, ...LIGHT },
    safetyFrom: [],
    ages: { teen: 'allowed' },
    review: DRAFT,
  },
  {
    id: 'reset_reading',
    name: 'The Reading Path',
    area: 'Reading and learning',
    description: 'Read most days toward the books, or the course, you choose. Audiobooks count.',
    transformations: { primary: ['learn'], paired: ['phone', 'focus'] },
    absorbs: ['mind_read'],
    replaces: [],
    supports: [],
    components: [{ id: 'reading', label: 'Reading (or a course, in learning mode)', role: 'core' }],
    targets: timed('reading-minutes', { starter: [10, 15, 20], standard: [20, 30, 40], challenge: [30, 45, 60] }, [
      [5, 5, 5],
      [5, 5, 5],
      [5, 6, 6],
    ]),
    destination: {
      kind: 'count',
      prompt: 'How many books (or course units) would make Day 66 a win?',
      example: '3 books from my list',
      unit: 'books',
      suggestion: { starter: [1, 2], standard: [2, 4], challenge: [3, 6] },
    },
    measurement: {
      daily: 'tap',
      weekly: { prompt: 'Finished a book this week?', unit: 'books', optional: true },
      ...LIGHT,
    },
    safetyFrom: [],
    ages: { teen: 'allowed' },
    review: DRAFT,
  },
  {
    id: 'reset_social_courage',
    name: 'Social Courage Ladder',
    area: 'Social confidence',
    description: 'Climb your own list of everyday social steps, one rung at a time. Every step is your choice.',
    transformations: { primary: ['confidence'], paired: [] },
    absorbs: ['confidence_talk'],
    replaces: [],
    supports: ['confidence_compliment'],
    components: [{ id: 'initiatives', label: 'Social initiatives from your own ladder', role: 'core' }],
    targets: Object.fromEntries(
      (
        [
          [
            'starter',
            [2, 3, 4],
            [
              [1, 3],
              [2, 4],
              [3, 5],
            ],
          ],
          [
            'standard',
            [3, 4, 5],
            [
              [2, 4],
              [3, 5],
              [4, 6],
            ],
          ],
          [
            'challenge',
            [4, 5, 6],
            [
              [3, 5],
              [4, 6],
              [5, 7],
            ],
          ],
        ] as const
      ).map(([i, n, r]) => [
        i,
        Object.fromEntries(
          PHASES.map((p, k) => [p, t('initiatives', fixed(n[k]), n[k], 10, { rungs: [r[k][0], r[k][1]] })]),
        ),
      ]),
    ) as Targets,
    destination: {
      kind: 'milestone',
      prompt: 'Which step on your own list would you like to have done by Day 66?',
      example: 'Speak up once in a seminar',
    },
    measurement: { daily: 'tap-counts', weekly: null, ...LIGHT },
    safetyFrom: [],
    ages: {
      teen: 'allowed',
      note: 'Only ordinary situations; never strangers by obligation or meeting people from online.',
    },
    review: {
      recommendable: false,
      status: 'needs-expert-review',
      pending: [
        'Founder approval of the defaults',
        'Psychologist review of the graded-exposure framing and signposting',
      ],
    },
  },
  {
    id: 'reset_move',
    name: 'Move Every Day',
    area: 'Physical activity',
    description: 'Weekly active minutes in activities you choose. No exercises, sets or intensity are prescribed.',
    transformations: { primary: ['healthy'], paired: ['confidence'] },
    absorbs: ['move_walk'],
    replaces: ['move_steps', 'move_workout'],
    supports: ['sleep_morning_light'],
    components: [{ id: 'active-minutes', label: 'Active minutes a week', role: 'core', commits: 'activity' }],
    // Starter and Standard rise gradually (about 15% a week within a phase at most); Challenge starts from the
    // person's own weekly minutes and only adds a little, never past 300 unless they already do more.
    targets: {
      starter: {
        foundation: t('active-minutes-week', fixed(70), 5, 14),
        momentum: t('active-minutes-week', fixed(105), 5, 21),
        mastery: t('active-minutes-week', fixed(150), 5, 30),
      },
      standard: {
        foundation: t('active-minutes-week', fixed(120), 5, 24),
        momentum: t('active-minutes-week', fixed(150), 5, 30),
        mastery: t('active-minutes-week', fixed(200), 5, 40),
      },
      challenge: {
        foundation: t('active-minutes-week', share(1, 300), 5, 60),
        momentum: t('active-minutes-week', share(1.1, 300), 5, 60),
        mastery: t('active-minutes-week', share(1.2, 300), 5, 60),
      },
    },
    destination: {
      kind: 'weekly-amount',
      prompt: 'How many active minutes a week would feel like a win by Day 66?',
      example: 'About 150 minutes a week of walking and cycling',
      unit: 'minutes a week',
    },
    measurement: {
      daily: 'tap',
      weekly: { prompt: 'Active minutes this week, if it differed from your plan', unit: 'minutes', optional: true },
      ...LIGHT,
    },
    safetyFrom: ['move_walk'],
    ages: {
      teen: 'starter-only',
      note: 'Standard and Challenge wait for the exercise review; no guideline claim for 16–17 until it’s in the register.',
    },
    review: {
      recommendable: false,
      status: 'needs-expert-review',
      pending: [
        'Founder approval of the defaults',
        'Exercise professional review of weekly increases and 16–17 targets',
      ],
    },
  },
  {
    id: 'reset_sleep_anchor',
    name: 'Sleep Anchor',
    area: 'Sleep consistency',
    description: 'Get up around your own usual time every day. Never earlier, never less time in bed.',
    transformations: { primary: ['discipline', 'healthy', 'control'], paired: [] },
    absorbs: ['sleep_wake', 'sleep_bedtime'],
    replaces: [],
    supports: ['sleep_no_phone_bed', 'sleep_morning_light'],
    components: [
      { id: 'wake-window', label: 'Up around your own anchor time', role: 'core', commits: 'sleep' },
      {
        id: 'wind-down',
        label: 'A phone-free wind-down',
        role: 'option',
        commits: 'phone',
        safetyFrom: 'sleep_no_phone_bed',
      },
      { id: 'in-bed-time', label: 'An in-bed time', role: 'option', commits: 'sleep', safetyFrom: 'sleep_bedtime' },
      { id: 'morning-daylight', label: 'Morning daylight', role: 'option', safetyFrom: 'sleep_morning_light' },
    ],
    targets: Object.fromEntries(
      (
        [
          ['starter', [60, 45, 30], [5, 5, 5]],
          ['standard', [45, 30, 30], [6, 6, 7]],
          ['challenge', [30, 20, 15], [7, 7, 7]],
        ] as const
      ).map(([i, w, d]) => [
        i,
        Object.fromEntries(PHASES.map((p, k) => [p, t('wake-window-minutes', fixed(w[k]), d[k], 0)])),
      ]),
    ) as Targets,
    destination: {
      kind: 'consistency',
      prompt: 'On how many days a week do you want to be up around your anchor time?',
      example: '6 days a week, weekends included',
    },
    measurement: { daily: 'tap', weekly: null, ...LIGHT },
    safetyFrom: ['sleep_wake'],
    ages: {
      teen: 'allowed',
      note: 'The in-bed-time option follows Earlier bedtime’s rules, so it isn’t offered to 16–17.',
    },
    review: DRAFT,
  },
  {
    id: 'reset_order',
    name: 'Order Out of Chaos',
    area: 'Personal organisation',
    description: 'A short evening reset of your space and to-dos, so things stop slipping.',
    transformations: { primary: ['control'], paired: ['discipline'] },
    absorbs: ['discipline_bed'],
    replaces: [],
    supports: [],
    components: [
      { id: 'evening-reset', label: 'Evening reset', role: 'core' },
      { id: 'weekly-reset', label: 'A weekly reset', role: 'option' },
    ],
    targets: timed('reset-minutes', { starter: [5, 5, 10], standard: [10, 10, 15], challenge: [15, 15, 20] }, [
      [5, 5, 5],
      [5, 6, 6],
      [6, 6, 7],
    ]),
    destination: {
      kind: 'count',
      prompt: 'How many of the things that have been nagging you do you want cleared by Day 66?',
      example: 'All 12 items on my list',
      unit: 'items from your own list',
    },
    measurement: { daily: 'tap', weekly: null, ...LIGHT },
    safetyFrom: [],
    ages: { teen: 'allowed' },
    review: DRAFT,
  },
  {
    id: 'reset_skill',
    name: 'Skill Sprint',
    area: 'Skill development',
    description: 'Practise one skill you choose, with something to show on Day 66.',
    transformations: { primary: ['learn'], paired: ['focus', 'confidence'] },
    absorbs: [],
    replaces: [],
    supports: [],
    components: [{ id: 'practice', label: 'Practice on your skill', role: 'core' }],
    targets: timed(
      'practice-minutes',
      { starter: [15, 20, 25], standard: [20, 30, 45], challenge: [45, 60, 90] },
      [
        [5, 5, 5],
        [5, 5, 5],
        [5, 5, 5],
      ],
      { 'challenge.mastery': 2 },
    ),
    destination: {
      kind: 'milestone',
      prompt: 'What would you like to be able to show on Day 66?',
      example: 'Play the whole piece, recorded',
    },
    measurement: { daily: 'tap', weekly: null, ...LIGHT },
    safetyFrom: [],
    ages: {
      teen: 'allowed',
      note: `Blocks of at most ${TEEN_FOCUS_MAX_MIN} min. Physical or sport skills are self-directed: no drills prescribed.`,
    },
    review: DRAFT,
  },
  {
    id: 'reset_connections',
    name: 'Real Connections',
    area: 'Meaningful relationships',
    description: 'Keep in real touch with the people who matter, a message or call at a time.',
    transformations: { primary: ['confidence'], paired: ['healthy', 'control'] },
    absorbs: ['social_reach_out'],
    replaces: [],
    supports: ['confidence_compliment'],
    components: [
      { id: 'reach-out', label: 'A meaningful message or call', role: 'core' },
      { id: 'quality-time', label: 'Quality time once a week', role: 'option' },
    ],
    targets: Object.fromEntries(
      (
        [
          ['starter', [3, 4, 5]],
          ['standard', [5, 6, 7]],
          ['challenge', [7, 7, 7]],
        ] as const
      ).map(([i, n]) => [i, Object.fromEntries(PHASES.map((p, k) => [p, t('reach-outs', fixed(n[k]), n[k], 10)]))]),
    ) as Targets,
    destination: {
      kind: 'count',
      prompt: 'How many people would you like to be in regular touch with by Day 66?',
      example: '3 friends I talk to every week',
      unit: 'people',
      suggestion: { starter: [1, 2], standard: [2, 4], challenge: [3, 5] },
    },
    measurement: { daily: 'tap-counts', weekly: null, ...LIGHT },
    safetyFrom: [],
    ages: { teen: 'allowed', note: 'Never a prompt to contact someone who harmed you.' },
    review: DRAFT,
  },
];

/** Challenges that exist only as a placeholder: never offered, never selectable, nothing designed yet. */
export type HeldChallenge = { id: string; name: string; status: 'held'; holds: string[]; reason: string };

export const HELD_CHALLENGES: HeldChallenge[] = [
  {
    id: 'reset_strength',
    name: 'Strength Foundations',
    status: 'held',
    holds: ['move_strength_prep', 'move_strength_gentle', 'move_balance', 'move_seated', 'move_strength_session'],
    reason: 'Waits for the physiotherapist and exercise-protocol reviews; the held exercise prototypes stay inactive.',
  },
];

/** Reviewed V2 habits kept as separate supporting microhabits next to the flagships (audit 2.3). */
export const SUPPORTING_HABITS = [
  'discipline_bed',
  'sleep_no_phone_bed',
  'sleep_morning_light',
  'screen_morning',
  'mind_breathe',
  'confidence_compliment',
  'food_produce',
  'food_unsweetened',
  'food_water_meals',
] as const;

/** V1 habits retired from new recommendations; never part of a challenge or a support. */
export const RETIRED_V1 = ['discipline_cold', 'water', 'move_workout', 'move_steps', 'screen_limit', 'mind_meditate'];
/** Never even stood in for: these have no Life Reset replacement at all. */
export const PROHIBITED = ['discipline_cold', 'water'];

export const CHALLENGE_BY_ID: Record<string, Challenge> = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));

/** The most minutes a single challenge may ask for on a due day, at each intensity (the time check's building block). */
export const PEAK_MINUTES: Record<Intensity, number> = { starter: 30, standard: 60, challenge: 120 };

/** The answers to "How much time can you give this most days?" (minutes). */
export const TIME_BUDGETS = [15, 30, 60, 90, 120] as const;

export type Selection = { id: string; intensity: Intensity };

/** Minutes a combined plan needs on a day everything is due, in each phase. */
export function phaseMinutes(selections: Selection[]): Record<Phase, number> {
  const out = { foundation: 0, momentum: 0, mastery: 0 };
  for (const s of selections) {
    const c = CHALLENGE_BY_ID[s.id];
    for (const p of PHASES) out[p] += c.targets[s.intensity][p].minutesPerDay;
  }
  return out;
}

/** Whether a combined plan fits the time the person has, in every phase (not just at the start). */
export function fitsTime(selections: Selection[], budgetMinutes: number): boolean {
  const m = phaseMinutes(selections);
  return PHASES.every((p) => m[p] <= budgetMinutes);
}

/**
 * The target for one person: a fixed default, or a share of their own baseline. Returns null when the baseline is
 * needed and not known yet (the first week measures it). A budget never goes below what the person says they
 * need; an increase never goes past `max` unless they already do more.
 */
export function personalAmount(target: Target, baseline?: number, statedNeed = 0): number | null {
  const a = target.amount;
  if (a.kind === 'fixed') return a.value;
  if (baseline === undefined) return null;
  const v = baseline * a.factor;
  if (HARDER[target.unit] === 'lower') return Math.round(Math.max(v, statedNeed));
  return Math.round(a.max === undefined ? v : Math.min(v, Math.max(a.max, baseline)));
}

/** A day's record for a challenge: unknown (nothing recorded) is never treated as a miss. */
export type Observation = 'done' | 'missed' | 'unknown';

/** Readiness defaults (audit 5.3); constants only, not connected to the 66-day engine. */
export const READINESS = {
  windowDays: 14,
  /** Fewer recorded days than this in the window: no decision either way. */
  minObservedDays: 7,
  offerStepUpAt: 0.8,
  offerEarlyAt: 0.9,
  suggestStepDownBelow: 0.6,
} as const;

/** The share of recorded days that were done, or null when too little was recorded to say. */
export function shareOfObserved(days: Observation[]): number | null {
  const seen = days.filter((d) => d !== 'unknown');
  if (seen.length < READINESS.minObservedDays) return null;
  return seen.filter((d) => d === 'done').length / seen.length;
}

/**
 * Only an answer that says the person already does a habit (routines, being active most days) is removed before
 * reusing that habit's V2 rules, so experienced people aren't turned away from a challenge; every age, precaution
 * and feasibility rule stays exactly as V2 has it.
 */
const withoutBaseline = (p: ProfileV2): ProfileV2 => ({ ...p, routines: [], activeDays: '0' });

/** Why this challenge can't be offered to this person at this intensity (null = it can), from existing V2 rules. */
export function challengeExclusion(c: Challenge, p: ProfileV2, intensity: Intensity): string | null {
  if (p.age === 'u16') return 'Schwung is for people 16 and older';
  if (isTeen(p) && c.ages.teen === 'not-offered') return 'not offered to 16–17-year-olds';
  if (isTeen(p) && c.ages.teen === 'starter-only' && intensity !== 'starter')
    return 'only the Starter intensity is offered to 16–17-year-olds for now';
  for (const id of c.safetyFrom) {
    const reason = BY_ID[id].exclude(withoutBaseline(p));
    if (reason) return reason;
  }
  return null;
}

/** Why an option of a challenge can't be turned on for this person (null = it can), from its V2 habit's rules. */
export function optionExclusion(o: Component, p: ProfileV2): string | null {
  if (!o.safetyFrom) return null;
  return BY_ID[o.safetyFrom].exclude(withoutBaseline(p));
}
