import { BY_ID, hasPrecaution, isTeen, precautionsUnknown, TEEN_FOCUS_MAX_MIN } from '../v2/library';
import type { ProfileV2 } from '../v2/types';

/*
 * The 66-Day Life Reset habit catalog (SCHWUNG_LIFE_RESET_HABITS.md, commit 70481e6). Pure data, used only by the
 * Life Reset pilot (testing builds: Read Daily, Focus Time and Strength Training; see pilot.ts). No other habit here
 * is offered to anyone yet, and no existing V1 or V2 habit, plan or save changes.
 *
 * Eight habits reuse an existing habit id (so their scenes and safety rules carry over); a Life Reset plan will save
 * its own targets with each habit, as V2 plans do, so a reused id never changes an existing program. Every target is
 * a design default the person can make easier or harder; scheduling, recording and progression are later stages.
 * Open questions are in SCHWUNG_LIFE_RESET_CATALOG_NOTES.md.
 */

export type Intensity = 'starter' | 'standard' | 'challenge';
export type Phase = 'foundation' | 'momentum' | 'mastery';
export const INTENSITIES: Intensity[] = ['starter', 'standard', 'challenge'];
export const PHASES: Phase[] = ['foundation', 'momentum', 'mastery'];

export type Category =
  'focus' | 'digital' | 'execution' | 'learning' | 'social' | 'activity' | 'sleep' | 'home' | 'skill' | 'strength';

/** How often a target is due. Metadata only: the weekly scheduling engine isn't built yet. */
export type Schedule =
  | { kind: 'daily' }
  /** On any N days of the week the person chooses. */
  | { kind: 'weekly'; days: number }
  /** On N of the person's workdays (Monday–Friday by default, editable). */
  | { kind: 'workdays'; days: number }
  /** Strength sessions: N a week (or the person's own number), on any days, at most one credited a day. */
  | { kind: 'sessions'; perWeek: number | 'own'; maxPerDay: 1 };

/** What a target counts. */
export type Unit =
  | 'minutes' // a timed block
  | 'limit' // a daily time limit for the main phone app (minutes; lower is harder)
  | 'tasks' // tasks finished
  | 'actions' // social actions done (one a due day)
  | 'people' // people reached out to
  | 'wake-window' // up within this many minutes of the person's own wake time (lower is harder)
  | 'sessions'; // strength sessions in a week

export const LOWER_IS_HARDER: ReadonlySet<Unit> = new Set(['limit', 'wake-window']);

export type Amount =
  | { kind: 'fixed'; value: number }
  /** The person's own daily time on their main app, less this many minutes (Less Scrolling). */
  | { kind: 'below-baseline'; reduceBy: number }
  /** The person's own current number (strength sessions they already do), kept steady. */
  | { kind: 'own'; min: number; max: number };

export type Target = {
  /** What the card says, as in the specification. `{limit}` and `{time}` are filled from the person's answers. */
  text: string;
  amount: Amount;
  unit: Unit;
  schedule: Schedule;
  /** Pages instead of minutes (Read Daily's optional pages mode). */
  pages?: number;
  /** The time may be split into this many blocks (always required for 16–17 when a block would pass the cap). */
  blocks?: number;
  /** Get It Done: the #1 task counts only when ticked before this time (HH:MM, editable). */
  firstBefore?: string;
  /** Stay Connected: how many of the people are a call. */
  calls?: number;
  /** Social Confidence: which levels of the action library the day's suggestion comes from. */
  levels?: SocialLevel[];
  /** Strength: an approximate session length shown as a guide, never a requirement. */
  aboutMinutes?: number;
  /** Optional, never part of the target (e.g. "or 3 if it feels good"). */
  optional?: string;
  /** Minutes the target takes on a day it's due, when it has a time cost (for time checks later). */
  minutesPerDueDay: number | null;
};

export type Targets = Record<Intensity, Record<Phase, Target>>;

/** How a habit is completed: one swipe always works; a timer or counter may also complete it. */
export type Completion = {
  kind: 'check' | 'timer' | 'counter' | 'session';
  /** In plain words, when it counts as done. */
  criterion: string;
  timer?: { optional: true; completesAtZero: true };
  counter?: { optional: true; completesAtTarget: true };
};

/** One short answer a habit needs (or can use) from the person. */
export type Personalization =
  | { key: 'pullMinutes'; required: true; options: number[] } // current daily time on the main app
  | { key: 'wakeTime'; required: true } // the existing W1 question
  | { key: 'activeDays'; required: true } // the existing V2 question
  | { key: 'ownMinutes'; required: false } // Daily Movement: someone already doing more keeps their number
  | { key: 'readingMode'; required: false; options: ['minutes', 'pages'] }
  | { key: 'skill'; required: true; options: string[] }
  | { key: 'workdays'; required: false }
  | { key: 'taskNames'; required: false }
  | { key: 'strengthStart'; required: true; options: ['new', 'sometimes', 'regular'] }
  | { key: 'strengthDays'; required: false }
  | { key: 'sessionDetails'; required: false; options: ['full body', 'upper', 'lower', 'other'] };

export type Availability = {
  /** Never true in this stage: nothing is offered in the app yet. */
  active: false;
  /** May be offered in internal testing builds once its later stages are built and approved. */
  status: 'internal-test-candidate';
  /** Reviews still needed before it can reach production. */
  beforeProduction: string[];
};

export type ResetHabit = {
  id: string;
  name: string;
  /** What the card says under the name when no target is filled in. */
  description: string;
  category: Category;
  /** The existing V1/V2 habit this id belongs to, or null for a new one. */
  existingId: string | null;
  /** The light/dark scene id (a habit id with art in `habitArt.ts`), or null for the world-crop fallback. */
  art: string | null;
  frequency: 'daily' | 'workdays' | 'weekly' | 'sessions' | 'mixed';
  targets: Targets;
  completion: Completion;
  personalization: Personalization[];
  /** Ages and intensities this habit can be taken at. Under 16 is never eligible anywhere in Schwung. */
  ages: { adult: Intensity[]; teen: Intensity[] };
  /** Mandatory safety or explanatory notes (shown with the habit when it's eventually built). */
  notes: string[];
  availability: Availability;
};

// --- Target helpers, so the tables below read like the specification. ---

const DAILY: Schedule = { kind: 'daily' };
const weekly = (days: number): Schedule => (days === 7 ? DAILY : { kind: 'weekly', days });
const fixed = (value: number): Amount => ({ kind: 'fixed', value });

function minutesTargets(
  rows: Record<Intensity, [number, number, number]>,
  schedule: (i: Intensity) => Schedule,
  text: (m: number) => string,
  extra: (i: Intensity, p: Phase, m: number) => Partial<Target> = () => ({}),
): Targets {
  return Object.fromEntries(
    INTENSITIES.map((i) => [
      i,
      Object.fromEntries(
        PHASES.map((p, k) => {
          const m = rows[i][k];
          const t: Target = {
            text: text(m),
            amount: fixed(m),
            unit: 'minutes',
            schedule: schedule(i),
            minutesPerDueDay: m,
            ...extra(i, p, m),
          };
          return [p, t];
        }),
      ),
    ]),
  ) as Targets;
}

const ALL: Intensity[] = ['starter', 'standard', 'challenge'];
const pending = (...reviews: string[]): Availability => ({
  active: false,
  status: 'internal-test-candidate',
  beforeProduction: ['Founder approval', ...reviews],
});

/** A 90-minute block is split into two for 16–17 (the focus cap); adults may choose to split it. */
export const BLOCK_SPLIT = { teen: 'required', adult: 'optional' } as const;

/** Focus and practice blocks over the 16–17 cap are shown as two blocks (the approved "2 × 45"). */
const twoBlocksOver = (m: number) => (m > TEEN_FOCUS_MAX_MIN ? { blocks: 2 } : {});

/** Less Scrolling: how much each phase takes off the person's own daily time. Limits never go below the floor. */
export const SCROLLING_REDUCTION: Record<Intensity, [number, number, number]> = {
  starter: [15, 30, 45],
  standard: [30, 60, 90],
  challenge: [45, 90, 120],
};
export const SCROLLING_FLOOR_MIN = 30;
/** The answers to "About how long a day do you spend on [your main app] now?" (minutes; the last is "4 h+"). */
export const PULL_MINUTES_OPTIONS = [30, 60, 90, 120, 180, 240];

/**
 * Less Scrolling is recommended automatically only from this much daily time on the main app; below it, a person can
 * still choose it themselves (decision of 2026-10-27).
 */
export const SCROLLING_AUTO_RECOMMEND_MIN = 60;

export function scrollingRecommended(baselineMinutes: number): boolean {
  return baselineMinutes >= SCROLLING_AUTO_RECOMMEND_MIN;
}

/**
 * The daily limit for a person's own baseline: rounded to 15 min, never below the floor, never below the time they
 * say they need, and never above where they are now (a low starting point is kept, not pushed further down).
 */
export function scrollingLimit(baselineMinutes: number, reduceBy: number, statedNeedMinutes = 0): number {
  const raw = Math.round((baselineMinutes - reduceBy) / 15) * 15;
  const floor = Math.max(SCROLLING_FLOOR_MIN, statedNeedMinutes);
  return Math.max(raw, Math.min(floor, baselineMinutes));
}

/** Sleep Routine: the card's "Up by" time, from the person's own wake time plus the window. */
export function upBy(wakeTime: string, windowMinutes: number): string {
  const [h, m] = wakeTime.split(':').map(Number);
  const t = (h * 60 + m + windowMinutes) % 1440;
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

// --- Social Confidence: the action library. ---

export type SocialLevel = 1 | 2 | 3;
export type SocialAction = {
  id: string;
  level: SocialLevel;
  text: string;
  /** Who it involves: people the person already knows or sees, or someone new in an everyday setting. */
  with: 'known' | 'everyday';
};

/** Every suggestion can be chosen, swapped for another or skipped; skipping one is never a failure. */
export const SOCIAL_RULES = {
  selectable: true,
  swappable: true,
  skippable: true,
  skipIsFailure: false,
  strangersRequired: false,
  disclosureRequired: false,
  discomfortRatings: false,
  ladderToWrite: false,
} as const;

export const SOCIAL_ACTIONS: SocialAction[] = [
  {
    id: 'sc_day_followup',
    level: 1,
    with: 'known',
    text: 'Ask someone how their day is going and ask one follow-up question',
  },
  { id: 'sc_thank_by_name', level: 1, with: 'known', text: 'Thank someone by name for something specific' },
  { id: 'sc_hello_first', level: 1, with: 'known', text: 'Say hello first to someone you see often' },
  {
    id: 'sc_group_chat_opinion',
    level: 1,
    with: 'known',
    text: 'Reply to a group chat with your own opinion, not just a reaction',
  },
  {
    id: 'sc_rarely_talk',
    level: 2,
    with: 'known',
    text: 'Start a conversation with a classmate or colleague you rarely talk to',
  },
  { id: 'sc_ask_question', level: 2, with: 'everyday', text: 'Ask a question in class, a meeting or a shop' },
  { id: 'sc_group_opinion', level: 2, with: 'known', text: 'Share an opinion in a group conversation' },
  { id: 'sc_compliment_aloud', level: 2, with: 'known', text: 'Give someone a specific compliment out loud' },
  { id: 'sc_speak_up', level: 3, with: 'known', text: 'Speak up once in a class, meeting or group' },
  {
    id: 'sc_suggest_plan',
    level: 3,
    with: 'known',
    text: 'Suggest a plan to a friend (coffee, a walk, studying together)',
  },
  {
    id: 'sc_introduce',
    level: 3,
    with: 'everyday',
    text: 'Introduce yourself to someone new at school, work or a club',
  },
  { id: 'sc_disagree', level: 3, with: 'known', text: 'Disagree politely when you see things differently' },
];

// --- Strength Training: tracking only. ---

/** The approved recovery handling: one credited session a day; the day after a session only shows a note. */
export const STRENGTH_RULES = {
  maxCreditedPerDay: 1,
  consecutiveDays: 'note',
  recoveryNote: 'Rest days help you recover. Did you train different muscles?',
  prescribesExercises: false,
  prescribesLoad: false,
  autoIncreasesFrequency: false,
} as const;

/** The held instructional exercise programmes, kept separate: never part of this catalog or Strength Training. */
export const HELD_EXERCISE_PROGRAMMES = [
  'move_strength_prep',
  'move_strength_gentle',
  'move_balance',
  'move_seated',
  'move_strength_session',
] as const;

const sessions = (perWeek: number | 'own'): Schedule => ({ kind: 'sessions', perWeek, maxPerDay: 1 });
const strengthTarget = (text: string, perWeek: number, aboutMinutes: number, optional?: string): Target => ({
  text,
  amount: fixed(perWeek),
  unit: 'sessions',
  schedule: sessions(perWeek),
  aboutMinutes,
  minutesPerDueDay: aboutMinutes,
  ...(optional ? { optional } : {}),
});
const ownSessions = (text: string, optional?: string): Target => ({
  text,
  // Their own current number, kept as it is (up to one credited session a day); never raised automatically.
  amount: { kind: 'own', min: 2, max: 7 },
  unit: 'sessions',
  schedule: sessions('own'),
  minutesPerDueDay: null,
  ...(optional ? { optional } : {}),
});

// --- Weekly habits. ---

/** The approved rules for flexible weekly targets (metadata; the engine comes later). */
export const WEEKLY_RULES = {
  restDayIsMiss: false,
  /** Weekly adherence is evaluated per week, separately from the daily streak. */
  evaluatedSeparatelyFromDailyStreak: true,
  /** A week with no sessions against a target above zero is not a successful week. */
  zeroAgainstTargetSucceeds: false,
  streakLossForWeeklyHabits: false,
} as const;

/** Less Scrolling's approved decision: completion is the person's own daily confirmation. */
export const SCROLLING_RULES = {
  verification: 'self-reported',
  weeklyScreenTimeCheck: 'optional',
  /** A missing weekly check never undoes a completed day. */
  missingWeeklyCheckInvalidatesDays: false,
} as const;

// --- The catalog. ---

/** Read Daily's optional pages mode. */
const READ_PAGES: Record<Intensity, [number, number, number]> = {
  starter: [5, 10, 15],
  standard: [10, 15, 20],
  challenge: [20, 30, 40],
};

export const SKILLS = ['Language', 'Instrument', 'Drawing', 'Coding', 'Writing', 'Sport skill', 'Other'];

export const RESET_HABITS: ResetHabit[] = [
  {
    id: 'focus_deepwork',
    name: 'Focus Time',
    description: 'Work on one thing, phone in another room',
    category: 'focus',
    existingId: 'focus_deepwork',
    art: 'focus_deepwork',
    frequency: 'weekly',
    targets: minutesTargets(
      { starter: [15, 20, 30], standard: [25, 40, 50], challenge: [45, 60, 90] },
      (i) => weekly(i === 'starter' ? 4 : 5),
      (m) => `${m} min, phone in another room`,
      (_i, _p, m) => twoBlocksOver(m),
    ),
    completion: {
      kind: 'timer',
      criterion: 'Swipe when the block is done, or let the timer finish',
      timer: { optional: true, completesAtZero: true },
    },
    personalization: [],
    ages: { adult: ALL, teen: ALL },
    notes: [`16–17: blocks of at most ${TEEN_FOCUS_MAX_MIN} min (shown as 2 × 45 min at Challenge Mastery).`],
    availability: pending(),
  },
  {
    id: 'screen_app_limit',
    name: 'Less Scrolling',
    description: 'Keep your main app under your daily limit',
    category: 'digital',
    existingId: 'screen_app_limit',
    art: null,
    frequency: 'daily',
    targets: Object.fromEntries(
      INTENSITIES.map((i) => [
        i,
        Object.fromEntries(
          PHASES.map((p, k) => {
            const t: Target = {
              text: 'Under {limit} today',
              amount: { kind: 'below-baseline', reduceBy: SCROLLING_REDUCTION[i][k] },
              unit: 'limit',
              schedule: DAILY,
              minutesPerDueDay: null,
            };
            return [p, t];
          }),
        ),
      ]),
    ) as Targets,
    completion: { kind: 'check', criterion: 'Swipe in the evening if you stayed under your limit' },
    personalization: [{ key: 'pullMinutes', required: true, options: PULL_MINUTES_OPTIONS }],
    ages: { adult: ALL, teen: ALL },
    notes: [
      'Your own check: Schwung can’t see your Screen Time. Settings → Screen Time shows the real number if you want it.',
    ],
    availability: pending(),
  },
  {
    id: 'focus_top3',
    name: 'Get It Done',
    description: 'Write today’s top tasks and finish them',
    category: 'execution',
    existingId: 'focus_top3',
    art: null,
    frequency: 'workdays',
    targets: (() => {
      const row = (i: Intensity, days: number, cells: [string, number, string | undefined][]): Record<Phase, Target> =>
        Object.fromEntries(
          PHASES.map((p, k) => {
            const [text, tasks, firstBefore] = cells[k];
            const t: Target = {
              text,
              amount: fixed(tasks),
              unit: 'tasks',
              schedule: { kind: 'workdays', days },
              minutesPerDueDay: null,
              ...(firstBefore ? { firstBefore } : {}),
            };
            return [p, t];
          }),
        ) as Record<Phase, Target>;
      return {
        starter: row('starter', 3, [
          ['Finish your #1 task', 1, undefined],
          ['Finish your #1 task before 15:00', 1, '15:00'],
          ['Finish your top 2 tasks', 2, undefined],
        ]),
        standard: row('standard', 5, [
          ['Finish your top 2 tasks', 2, undefined],
          ['Finish your top 3 tasks', 3, undefined],
          ['Finish your top 3, your #1 before noon', 3, '12:00'],
        ]),
        challenge: row('challenge', 5, [
          ['Finish your top 3 tasks', 3, undefined],
          ['Top 3, your #1 before noon', 3, '12:00'],
          ['Top 3, your #1 before 10:00', 3, '10:00'],
        ]),
      };
    })(),
    completion: {
      kind: 'counter',
      criterion: 'Tick each task as it’s finished; reaching the day’s number completes it (or swipe)',
      counter: { optional: true, completesAtTarget: true },
    },
    personalization: [
      { key: 'workdays', required: false },
      { key: 'taskNames', required: false },
    ],
    ages: { adult: ALL, teen: ALL },
    notes: [],
    availability: pending(),
  },
  {
    id: 'mind_read',
    name: 'Read Daily',
    description: 'Read a book, an e-book or an audiobook',
    category: 'learning',
    existingId: 'mind_read',
    art: 'mind_read',
    frequency: 'daily',
    targets: minutesTargets(
      { starter: [10, 15, 20], standard: [20, 25, 30], challenge: [30, 45, 60] },
      () => DAILY,
      (m) => `${m} min`,
      (i, p) => ({ pages: READ_PAGES[i][PHASES.indexOf(p)] }),
    ),
    completion: {
      kind: 'timer',
      criterion: 'Swipe when you’ve read, or let the timer finish',
      timer: { optional: true, completesAtZero: true },
    },
    personalization: [{ key: 'readingMode', required: false, options: ['minutes', 'pages'] }],
    ages: { adult: ALL, teen: ALL },
    notes: [],
    availability: pending(),
  },
  {
    id: 'confidence_talk',
    name: 'Social Confidence',
    description: 'Do today’s social step: swap it or skip it any time',
    category: 'social',
    existingId: 'confidence_talk',
    art: null,
    frequency: 'mixed',
    targets: (() => {
      const cell = (days: number, levels: SocialLevel[]): Target => ({
        text: `${days === 7 ? 'Daily' : `${days} days a week`}, Level ${levels.join('–')}`,
        amount: fixed(1),
        unit: 'actions',
        schedule: weekly(days),
        levels,
        minutesPerDueDay: null,
      });
      return {
        starter: { foundation: cell(3, [1]), momentum: cell(4, [1]), mastery: cell(4, [2]) },
        standard: { foundation: cell(4, [1]), momentum: cell(5, [2]), mastery: cell(5, [3]) },
        challenge: { foundation: cell(5, [2]), momentum: cell(6, [2, 3]), mastery: cell(7, [3]) },
      };
    })(),
    completion: { kind: 'check', criterion: 'Swipe when you’ve done the day’s step (any step from the list counts)' },
    personalization: [],
    ages: { adult: ALL, teen: ALL },
    notes: ['Everyday situations only. Every step can be swapped or skipped; skipping one is never a failure.'],
    availability: pending('Psychologist review of the action library and signposting'),
  },
  {
    id: 'move_walk',
    name: 'Daily Movement',
    description: 'Move in any way you choose: walk, cycle, dance, sport',
    category: 'activity',
    existingId: 'move_walk',
    art: 'move_walk',
    frequency: 'daily',
    targets: minutesTargets(
      { starter: [10, 15, 20], standard: [20, 25, 30], challenge: [30, 40, 45] },
      () => DAILY,
      (m) => `${m} min of movement you choose`,
    ),
    completion: {
      kind: 'timer',
      criterion: 'Swipe when you’ve moved, or let the timer finish',
      timer: { optional: true, completesAtZero: true },
    },
    personalization: [
      { key: 'activeDays', required: true },
      { key: 'ownMinutes', required: false },
    ],
    ages: { adult: ALL, teen: ALL },
    notes: ['If you already move for longer, keep your own number: it’s never lowered.'],
    availability: pending(
      'Exercise review of the 16–17 targets; WHO adolescent guidance added to the evidence register',
    ),
  },
  {
    id: 'sleep_wake',
    name: 'Sleep Routine',
    description: 'Be up by your time, every day',
    category: 'sleep',
    existingId: 'sleep_wake',
    art: null,
    frequency: 'daily',
    targets: Object.fromEntries(
      (
        [
          ['starter', [60, 45, 30]],
          ['standard', [45, 30, 20]],
          ['challenge', [30, 20, 15]],
        ] as const
      ).map(([i, w]) => [
        i,
        Object.fromEntries(
          PHASES.map((p, k) => {
            const t: Target = {
              text: 'Up by {time}',
              amount: fixed(w[k]),
              unit: 'wake-window',
              schedule: DAILY,
              minutesPerDueDay: null,
            };
            return [p, t];
          }),
        ),
      ]),
    ) as Targets,
    completion: { kind: 'check', criterion: 'Swipe when you’re up' },
    personalization: [{ key: 'wakeTime', required: true }],
    ages: { adult: ALL, teen: ALL },
    notes: [
      'Your own wake time is the anchor: never earlier, and never less sleep. No bedtime or phone rule is added.',
    ],
    availability: pending(),
  },
  {
    id: 'home_tidy',
    name: 'Tidy Up',
    description: 'Tidy your room, desk or kitchen',
    category: 'home',
    existingId: null,
    art: null,
    frequency: 'daily',
    targets: minutesTargets(
      { starter: [5, 8, 10], standard: [10, 12, 15], challenge: [15, 20, 25] },
      () => DAILY,
      (m) => `${m} min`,
    ),
    completion: {
      kind: 'timer',
      criterion: 'Swipe when you’ve tidied, or let the timer finish',
      timer: { optional: true, completesAtZero: true },
    },
    personalization: [],
    ages: { adult: ALL, teen: ALL },
    notes: [],
    availability: pending('Light and dark scenes (until then, a crop of the world)'),
  },
  {
    id: 'skill_practice',
    name: 'Practice a Skill',
    description: 'Practise the skill you picked',
    category: 'skill',
    existingId: null,
    art: null,
    frequency: 'weekly',
    targets: minutesTargets(
      { starter: [10, 15, 20], standard: [20, 30, 40], challenge: [40, 60, 90] },
      (i) => weekly(i === 'starter' ? 4 : 5),
      (m) => `${m} min`,
      (_i, _p, m) => twoBlocksOver(m),
    ),
    completion: {
      kind: 'timer',
      criterion: 'Swipe when you’ve practised, or let the timer finish',
      timer: { optional: true, completesAtZero: true },
    },
    personalization: [{ key: 'skill', required: true, options: SKILLS }],
    ages: { adult: ALL, teen: ALL },
    notes: [
      `16–17: blocks of at most ${TEEN_FOCUS_MAX_MIN} min.`,
      'Sport skills are your own practice: Schwung doesn’t prescribe drills.',
    ],
    availability: pending('Light and dark scenes (until then, a crop of the world)'),
  },
  {
    id: 'social_reach_out',
    name: 'Stay Connected',
    description: 'Message or call people you care about (more than a like)',
    category: 'social',
    existingId: 'social_reach_out',
    art: null,
    frequency: 'mixed',
    targets: (() => {
      const cell = (people: number, days: number, calls?: number): Target => ({
        text:
          days === 7
            ? `${people} ${people === 1 ? 'person' : 'people'} a day${calls ? ', one of them a call' : ''}`
            : `1 person, ${days} days a week`,
        amount: fixed(people),
        unit: 'people',
        schedule: weekly(days),
        minutesPerDueDay: null,
        ...(calls ? { calls } : {}),
      });
      return {
        starter: { foundation: cell(1, 4), momentum: cell(1, 5), mastery: cell(1, 7) },
        standard: { foundation: cell(1, 7), momentum: cell(2, 7), mastery: cell(2, 7, 1) },
        challenge: { foundation: cell(2, 7), momentum: cell(3, 7), mastery: cell(3, 7, 1) },
      };
    })(),
    completion: {
      kind: 'counter',
      criterion: 'Tap +1 for each person; reaching the day’s number completes it (or swipe)',
      counter: { optional: true, completesAtTarget: true },
    },
    personalization: [],
    ages: { adult: ALL, teen: ALL },
    notes: ['Never a prompt to contact someone who harmed you.'],
    availability: pending(),
  },
  {
    id: 'strength_log',
    name: 'Strength Training',
    description: 'Log a strength session from a routine you follow or choose',
    category: 'strength',
    existingId: null,
    art: null,
    frequency: 'sessions',
    targets: {
      starter: {
        foundation: strengthTarget('2 sessions a week, ~20 min', 2, 20),
        momentum: strengthTarget('2 a week, ~30 min', 2, 30),
        mastery: strengthTarget('2 a week, ~30 min', 2, 30, 'or 3 if it feels good'),
      },
      standard: {
        foundation: strengthTarget('2 a week, ~30 min', 2, 30),
        momentum: strengthTarget('3 a week, ~40 min', 3, 40),
        mastery: strengthTarget('3 a week, ~45 min', 3, 45),
      },
      challenge: {
        foundation: ownSessions('Your current sessions (2 or more)'),
        momentum: ownSessions('Same, kept steady'),
        mastery: ownSessions('Same, kept steady', '+1 a week only if you choose'),
      },
    },
    completion: {
      kind: 'session',
      criterion: 'Swipe to log a session; at most one counts a day',
    },
    personalization: [
      { key: 'strengthStart', required: true, options: ['new', 'sometimes', 'regular'] },
      { key: 'strengthDays', required: false },
      { key: 'sessionDetails', required: false, options: ['full body', 'upper', 'lower', 'other'] },
    ],
    ages: { adult: ALL, teen: ['starter', 'standard'] },
    notes: [
      'Schwung tracks your sessions. It doesn’t choose your exercises, sets, repetitions or weights.',
      'If you don’t have a routine yet, start with one from a qualified coach, PE teacher, physiotherapist, or your national health service’s strength guidance.',
      'Stop and get medical help if you have chest pain, feel faint, or are much more out of breath than usual.',
    ],
    availability: pending(
      'Exercise professional or physiotherapist review of the guidance, joint-pain and 16–17 rules, and source links',
    ),
  },
];

export const RESET_BY_ID: Record<string, ResetHabit> = Object.fromEntries(RESET_HABITS.map((h) => [h.id, h]));

// --- Eligibility, from the existing V2 rules. ---

/**
 * Only answers that say the person *already does* a habit (their routines, being active most days) are removed
 * before reusing a V2 habit's rules: a Life Reset habit welcomes people who already do it. Every age, precaution and
 * feasibility rule stays exactly as V2 has it.
 */
const withoutBaseline = (p: ProfileV2): ProfileV2 => ({ ...p, routines: [], activeDays: '0' });

/** The extra notes Strength Training shows for some answers (not exclusions). */
export function strengthNotes(p: ProfileV2): string[] {
  const out: string[] = [];
  if (hasPrecaution(p, 'joint')) out.push('Keep to what your physiotherapist or clinician has advised.');
  if (isTeen(p))
    out.push(
      'Learn technique from a qualified coach or PE teacher first, build up gradually, avoid maximal lifts, and stop if anything hurts.',
    );
  if (p.age === '65p') out.push('A professional can also suggest balance and strength activities that suit you.');
  return out;
}

/** Why this habit can't be taken by this person at this intensity (null = it can). */
export function resetExclusion(h: ResetHabit, p: ProfileV2, intensity: Intensity): string | null {
  if (p.age === 'u16') return 'Schwung is made for people 16 and older';
  if (!(isTeen(p) ? h.ages.teen : h.ages.adult).includes(intensity))
    return 'this intensity isn’t offered to 16–17-year-olds';
  switch (h.id) {
    case 'move_walk':
    case 'sleep_wake':
      return BY_ID[h.id].exclude(withoutBaseline(p));
    case 'screen_app_limit':
      // App time's existing rule: not offered under 2 h of overall phone use. Its pull-type rule isn't reused:
      // Less Scrolling covers social media too (named after the person's main pull).
      return BY_ID.screen_app_limit.start(p) === null ? 'you use your phone less than 2 hours a day' : null;
    case 'strength_log':
      // The same conditions the held exercise programmes exclude, without using or releasing them.
      if (precautionsUnknown(p)) return 'answer the health question first: a professional can advise what suits you';
      if (hasPrecaution(p, 'heart') || hasPrecaution(p, 'pregnancy') || hasPrecaution(p, 'walkingDifficult'))
        return 'needs individual advice from your clinician or midwife first';
      if (hasPrecaution(p, 'joint') && intensity === 'starter')
        return 'with joint, back or injury pain, start with a routine your physiotherapist or clinician suggests';
      return null;
    default:
      return null;
  }
}
