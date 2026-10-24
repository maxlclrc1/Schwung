import type { GoalV2, HabitSpecV2, ProfileV2 } from './types';

/*
 * Library V2 (HABIT_SCIENCE_V2_ARCHITECTURE.md, revision 5, section B).
 * Every target is a product-defined step [PRODUCT]; every benefit is unverified [VERIFY].
 * Each habit says why it would be excluded for a profile, its personal ladder, and its baseline start rung.
 */

export const isTeen = (p: ProfileV2) => p.age === '16_17';
export const isAdult = (p: ProfileV2) => p.age !== 'u16' && p.age !== '16_17';
export const has = (p: ProfileV2, r: ProfileV2['routines'][number]) => p.routines.includes(r);
export const precautionsUnknown = (p: ProfileV2) => p.precautions === 'unknown';
export const hasPrecaution = (p: ProfileV2, t: Exclude<ProfileV2['precautions'], 'unknown'>[number]) =>
  p.precautions !== 'unknown' && p.precautions.includes(t);
const wakeRegular = (p: ProfileV2) => !p.wake || p.wake.kind === 'time';
const phoneAtLeast1h = (p: ProfileV2) => p.phone !== 'lt1';

export function minutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
export function clock(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
/** Hours between getting into bed and getting up. */
export function timeInBed(inBed: string, wake: string): number {
  return ((((minutes(wake) - minutes(inBed)) % 1440) + 1440) % 1440) / 60;
}

/** Sleep below the age band (CDC: teens 8–10 h, adults 7+ h [POP]). */
export const sleepBelowBand = (p: ProfileV2) =>
  p.sleepHours === 'lt6' || p.sleepHours === '6_7' || (isTeen(p) && p.sleepHours === '7_8');

export type HabitDef = HabitSpecV2 & {
  /** Reason the habit can't be offered to this person at all, or null. */
  exclude: (p: ProfileV2) => string | null;
  /** The personal ladder (all rungs). */
  ladder: (p: ProfileV2) => string[];
  /** Baseline start rung, or null when the baseline says they already do it. */
  start: (p: ProfileV2) => number | null;
  /** A claim-free line for the reason text; real "why" copy ships only after review (H2). */
  why: string;
};

const fixed = (rungs: string[]) => () => rungs;

export const LIBRARY: HabitDef[] = [
  {
    id: 'discipline_bed',
    title: 'Make your bed',
    domain: 'foundation',
    mode: 'foundation',
    release: 'candidate',
    exclude: () => null,
    ladder: fixed(['Make your bed', 'Make your bed and clear one surface', 'Make your bed and a 2-minute room reset']),
    start: () => 0,
    why: 'A small win to start the day.',
  },
  {
    id: 'sleep_bedtime',
    title: 'Earlier bedtime',
    domain: 'sleep',
    mode: 'auto',
    release: 'candidate',
    // Teens' body clocks run later (AAP 2014); with early school starts an earlier bedtime can mean lying awake.
    note: 'Go to bed when you feel sleepy. If you lie awake for a long time, it’s fine to keep your usual bedtime.',
    exclude: (p) => {
      if (!sleepBelowBand(p)) return 'your sleep is already in the recommended range for your age';
      if (isTeen(p)) return 'earlier bedtimes for 16–17-year-olds are waiting for sleep-expert review';
      if (p.sleepTrouble !== 'rarely') return 'you have trouble sleeping, and more time in bed can make that worse';
      if (hasPrecaution(p, 'sleepCondition')) return 'you have a diagnosed sleep condition';
      if (precautionsUnknown(p)) return 'precautions are unknown';
      // The time-in-bed ceiling needs a regular wake time.
      if (p.wake && p.wake.kind !== 'time') return 'your wake time changes, so a safe bedtime target can’t be set';
      if (p.wake?.kind === 'time' && p.inBed && bedtimeRungs(p).length < 3)
        return 'no room under the time-in-bed ceiling';
      return null;
    },
    ladder: (p) => bedtimeRungs(p),
    start: () => 0,
    why: 'Getting into bed a little earlier than you do now.',
  },
  {
    id: 'sleep_wake',
    title: 'Steady wake-up',
    domain: 'sleep',
    mode: 'auto',
    release: 'candidate',
    exclude: (p) =>
      has(p, 'sameWake')
        ? 'you already wake at about the same time'
        : !wakeRegular(p)
          ? 'your wake time changes a lot or you work shifts'
          : null,
    ladder: (p) => {
      const at = p.wake?.kind === 'time' ? p.wake.time : 'your usual time';
      return [60, 45, 30, 15].map((m) => `Up within ${m} min of ${at}`);
    },
    start: () => 0,
    why: 'Getting up at about the same time each day.',
  },
  {
    id: 'sleep_no_phone_bed',
    title: 'Phone-free wind-down',
    domain: 'sleep',
    mode: 'auto',
    release: 'candidate',
    phoneRule: true,
    exclude: (p) =>
      has(p, 'phoneAway')
        ? 'your phone is already out of reach before sleep'
        : !phoneAtLeast1h(p)
          ? 'you use your phone less than an hour a day'
          : null,
    ladder: fixed([15, 30, 45, 60].map((m) => `Phone away ${m} min before bed`)),
    start: (p) => (p.sleepTrouble !== 'rarely' ? 1 : 0),
    why: 'A screen-free stretch before bed.',
  },
  {
    id: 'sleep_morning_light',
    title: 'Morning daylight',
    domain: 'sleep',
    mode: 'auto',
    release: 'candidate',
    exclude: () => null,
    ladder: (p) =>
      [5, 10, 15, 20].map((m) =>
        p.wake?.kind === 'shift'
          ? `Outside for ${m} min soon after your main sleep`
          : `Outside within an hour of waking for ${m} min`,
      ),
    start: () => 0,
    why: 'Daylight early in your day.',
  },
  {
    id: 'move_walk',
    title: 'Walk',
    domain: 'activity',
    mode: 'auto',
    release: 'candidate',
    exclude: (p) =>
      has(p, 'walk')
        ? 'you already walk 30+ minutes most days'
        : hasPrecaution(p, 'walkingDifficult')
          ? 'walking or standing for long is difficult for you (no reviewed alternative yet)'
          : hasPrecaution(p, 'heart') || hasPrecaution(p, 'pregnancy')
            ? 'needs individual advice from your clinician or midwife (waiting for expert review)'
            : p.activeDays === '5p' && p.goal !== 'energy' && p.goal !== 'calm'
              ? 'you are already active 5+ days a week'
              : null,
    ladder: fixed([5, 10, 15, 20, 25, 30, 40, 50, 60].map((m) => `${m} min walk at a comfortable pace`)),
    start: (p) => ({ '0': 0, '1_2': 1, '3_4': 3, '5p': 3 })[p.activeDays],
    why: 'A daily walk at a comfortable pace.',
  },
  {
    id: 'move_strength_prep',
    title: 'Strength preparation',
    domain: 'activity',
    mode: 'choice',
    release: 'candidate',
    note: 'Practice for a strength routine, not a full strength workout. Guidelines recommend strength work on 2+ days a week.',
    exclude: (p) => {
      if (hasPrecaution(p, 'heart') || hasPrecaution(p, 'pregnancy') || hasPrecaution(p, 'walkingDifficult'))
        return 'not suitable with your precautions';
      // These would need the gentle variant, which is held until reviewed.
      if (p.age === '65p' || hasPrecaution(p, 'joint') || precautionsUnknown(p))
        return 'the gentle variant needed here is not reviewed yet';
      // Never recommend preparation to people who are already active most days (they may already train).
      if (p.activeDays === '3_4' || p.activeDays === '5p') return 'you are already active most days';
      return null;
    },
    ladder: fixed([
      '1 set of 1 strength move',
      '1 set of 2 strength moves',
      '1 set of 3 strength moves',
      '2 sets of 3 strength moves',
    ]),
    start: () => 0,
    why: 'A first step toward a strength routine.',
  },
  {
    id: 'food_produce',
    title: 'Fruit and veg',
    domain: 'nutrition',
    mode: 'auto',
    release: 'candidate',
    note: 'This builds the habit. It doesn’t measure whether your diet meets guidelines. If counting food ever feels stressful, swap this habit.',
    // Food habits for 16–17 wait for eating-disorder-informed review (food tracking is linked with disordered eating).
    exclude: (p) =>
      p.produce === 'skip'
        ? 'you chose to skip food habits'
        : isTeen(p)
          ? 'food habits for 16–17-year-olds are waiting for expert review'
          : null,
    ladder: fixed([1, 2, 3, 4, 5].map((n) => `Eat ${n} ${n === 1 ? 'portion' : 'portions'} of fruit or veg today`)),
    start: (p) => ({ '0': 0, '1_2': 1, '3_4': 3, '5p': null, skip: null })[p.produce],
    why: 'Adding fruit and veg to your day.',
  },
  {
    id: 'food_unsweetened',
    title: 'Unsweetened drinks',
    domain: 'nutrition',
    mode: 'auto',
    release: 'candidate',
    // NHS advice treats low blood sugar with a sugary drink or juice, so that must always come first.
    note: 'If you use a sugary drink or juice to treat low blood sugar, always do that. It never counts against this habit. If you have diabetes, your care team’s advice comes first.',
    exclude: (p) =>
      !isAdult(p) ? 'not offered under 18' : p.produce === 'skip' ? 'you chose to skip food habits' : null,
    ladder: fixed([
      'Choose water or an unsweetened drink instead of a sugary one, once today',
      'Choose water or an unsweetened drink instead of a sugary one, twice today',
      'All your drinks today are unsweetened',
    ]),
    start: (p) => (p.sugary === 'most' ? 0 : p.sugary === 'some' ? 1 : null),
    why: 'An easy swap for a sugary drink.',
  },
  {
    id: 'food_water_meals',
    title: 'Water with meals',
    domain: 'nutrition',
    mode: 'add',
    release: 'candidate',
    exclude: (p) =>
      hasPrecaution(p, 'fluidLimit')
        ? 'you were told to limit fluids'
        : p.produce === 'skip'
          ? 'you chose to skip food habits'
          : null,
    ladder: fixed(['A glass of water with 1 meal', 'A glass of water with 2 meals', 'A glass of water with 3 meals']),
    start: () => 0,
    why: 'A glass of water with meals, if it suits you.',
  },
  {
    id: 'screen_morning',
    title: 'Phone-free start',
    domain: 'digital',
    mode: 'auto',
    release: 'candidate',
    phoneRule: true,
    overlapGroup: 'morning_phone',
    exclude: () => null,
    ladder: fixed([15, 30, 45, 60].map((m) => `No phone for the first ${m} min after waking (an alarm doesn’t count)`)),
    start: (p) => ({ '6p': 0, '4_6': 1, '2_4': 1, unknown: 1, '1_2': 2, lt1: null })[p.phone],
    why: 'Start the day before your phone does.',
  },
  {
    id: 'screen_social',
    title: 'Social-free start',
    domain: 'digital',
    mode: 'auto',
    release: 'candidate',
    phoneRule: true,
    overlapGroup: 'morning_phone',
    exclude: (p) => (p.phonePull === 'social' ? null : 'social media isn’t what takes most of your phone time'),
    ladder: fixed(['30 min', '1 h', '2 h', '3 h', '4 h'].map((t) => `No social apps for the first ${t} after waking`)),
    start: (p) => ({ '6p': 0, '4_6': 1, '2_4': 2, unknown: 1, '1_2': null, lt1: null })[p.phone],
    why: 'Keep social apps out of your first hours.',
  },
  {
    id: 'screen_app_limit',
    title: 'App limit',
    domain: 'digital',
    mode: 'auto',
    release: 'candidate',
    phoneRule: true,
    exclude: (p) =>
      p.phonePull === 'video' || p.phonePull === 'games' || p.phonePull === 'mix'
        ? null
        : 'videos or games aren’t what takes most of your phone time',
    ladder: (p) => {
      const what = p.phonePull === 'video' ? 'Videos' : p.phonePull === 'games' ? 'Games' : 'Your most-used app';
      return [120, 90, 60, 45, 30].map((m) => `${what} under ${m} min today`);
    },
    start: (p) => ({ '6p': 0, '4_6': 1, '2_4': 2, unknown: 1, '1_2': null, lt1: null })[p.phone],
    why: 'A daily limit on what pulls you in most.',
  },
  {
    id: 'mind_read',
    title: 'Read',
    domain: 'mind',
    mode: 'auto',
    release: 'candidate',
    exclude: (p) => (has(p, 'reading') ? 'you already read most days' : null),
    ladder: fixed([5, 10, 15, 20, 30].map((m) => `Read for ${m} min`)),
    start: (p) => (p.goal === 'focus' ? 1 : 0),
    why: 'A few minutes of reading.',
  },
  {
    id: 'mind_breathe',
    title: 'Slow breathing',
    domain: 'mind',
    mode: 'auto',
    release: 'candidate',
    note: 'Breathe gently and comfortably, without holding your breath. If you feel dizzy, light-headed or panicky, stop and breathe normally.',
    exclude: (p) =>
      has(p, 'breathing')
        ? 'you already breathe or meditate most days'
        : hasPrecaution(p, 'heart') || hasPrecaution(p, 'pregnancy')
          ? 'breathing exercises with your condition are waiting for expert review'
          : null,
    ladder: fixed([2, 3, 5, 8, 10].map((m) => `${m} min of slow breathing`)),
    start: () => 0,
    why: 'A few slow minutes to take the edge off.',
  },
  {
    id: 'mind_journal',
    title: 'Journal',
    domain: 'mind',
    mode: 'auto',
    release: 'candidate',
    exclude: (p) => (has(p, 'journaling') ? 'you already journal most days' : null),
    ladder: fixed(
      [1, 2, 3, 5].map((n) => `Write ${n} ${n === 1 ? 'sentence' : 'sentences'}: what went well, what’s on your mind`),
    ),
    start: () => 0,
    why: 'A sentence or two to clear your head.',
  },
  {
    id: 'focus_deepwork',
    title: 'Deep work',
    domain: 'focus',
    mode: 'auto',
    release: 'candidate',
    exclude: () => null,
    ladder: (p) =>
      (isTeen(p) ? [10, 15, 25, 45, 60] : [10, 15, 25, 45, 60, 90]).map(
        (m) => `${m} min of focused work, phone in another room`,
      ),
    start: () => 1,
    why: 'One protected block of focus.',
  },
  {
    id: 'focus_top3',
    title: 'First task',
    domain: 'focus',
    mode: 'auto',
    release: 'candidate',
    exclude: () => null,
    ladder: fixed([
      'Write your #1 task for the day',
      'Write your #1 task and work on it for 10 min first',
      'Write your #1 task and work on it for 25 min first',
      'Write your #1 task and work on it for 45 min first',
    ]),
    // Already planning? Writing it down is the same behavior; starting on it first is the new one.
    start: (p) => (has(p, 'planning') ? 1 : 0),
    why: 'Decide your most important task and start with it.',
  },
  {
    id: 'social_reach_out',
    title: 'Reach out',
    domain: 'social',
    mode: 'auto',
    release: 'candidate',
    exclude: () => null,
    ladder: fixed([1, 2, 3].map((n) => `Message or call ${n} ${n === 1 ? 'person' : 'people'} you care about`)),
    start: () => 0,
    why: 'A quick message to someone you care about.',
  },
  {
    id: 'confidence_compliment',
    title: 'Genuine compliment',
    domain: 'social',
    mode: 'auto',
    release: 'candidate',
    exclude: () => null,
    ladder: fixed(
      [1, 2, 3].map((n) => `Give ${n} genuine ${n === 1 ? 'compliment' : 'compliments'} (a message counts)`),
    ),
    start: () => 0,
    why: 'Noticing what others do well.',
  },
  {
    id: 'confidence_talk',
    title: 'Start a conversation',
    domain: 'social',
    mode: 'choice',
    release: 'candidate',
    opportunityDependent: true,
    note: 'Any short chat counts, even a quick “how’s your day?”. If it feels like too much, swap it for something else.',
    exclude: () => null,
    ladder: fixed(
      [1, 2, 3].map((n) => `Start ${n} ${n === 1 ? 'conversation' : 'conversations'} (in person or a call)`),
    ),
    start: () => 0,
    why: 'Small conversations make the next one easier.',
  },
  {
    id: 'move_strength_session',
    title: 'Strength session',
    domain: 'activity',
    mode: 'auto',
    release: 'held', // scheduled habit: design only
    exclude: () => 'scheduled habits aren’t available yet',
    ladder: fixed([]),
    start: () => null,
    why: '',
  },
  {
    id: 'move_balance',
    title: 'Balance practice',
    domain: 'activity',
    mode: 'auto',
    release: 'held', // no target is released until reviewed
    exclude: () => 'balance targets aren’t reviewed yet',
    ladder: fixed([]),
    start: () => null,
    why: '',
  },
];

/** Earlier-bedtime rungs from the user's own in-bed time, under the age ceiling (adult 9 h, teen 10 h in bed). */
export function bedtimeRungs(p: ProfileV2): string[] {
  const steps = [15, 30, 45, 60];
  if (p.wake?.kind !== 'time' || !p.inBed) return steps.map((m) => `In bed ${m} min earlier than usual`);
  const ceiling = isTeen(p) ? 10 : 9;
  const wake = p.wake.time;
  const inBed = p.inBed;
  return steps
    .filter((m) => timeInBed(clock(minutes(inBed) - m), wake) <= ceiling)
    .map((m) => `In bed by ${clock(minutes(inBed) - m)}`);
}

export const BY_ID: Record<string, HabitDef> = Object.fromEntries(LIBRARY.map((h) => [h.id, h]));

/** Goal lists in priority order (section B). ★ = core. */
export const GOALS: Record<GoalV2, { core: string[]; support: string[]; suggest: string[] }> = {
  energy: {
    core: ['sleep_bedtime', 'sleep_wake', 'sleep_morning_light', 'move_walk'],
    support: [
      'sleep_no_phone_bed',
      'food_produce',
      'food_unsweetened',
      'screen_morning',
      'screen_app_limit',
      'social_reach_out',
    ],
    suggest: [],
  },
  focus: {
    core: ['focus_deepwork', 'focus_top3', 'screen_social', 'mind_read'],
    support: ['sleep_wake', 'sleep_morning_light', 'mind_breathe', 'screen_app_limit'],
    suggest: [],
  },
  discipline: { core: ['focus_top3', 'sleep_wake'], support: ['focus_deepwork', 'mind_journal'], suggest: [] },
  confidence: {
    core: ['social_reach_out', 'confidence_compliment'],
    support: ['mind_journal'],
    suggest: ['confidence_talk', 'move_strength_prep'],
  },
  calm: {
    core: ['mind_breathe', 'sleep_no_phone_bed', 'move_walk'],
    support: [
      'mind_journal',
      'screen_morning',
      'screen_social',
      'screen_app_limit',
      'social_reach_out',
      'focus_top3',
      'sleep_morning_light',
    ],
    suggest: [],
  },
  fitness: {
    core: ['move_walk', 'move_balance'],
    // Sleep habits are not presented as fitness habits; they can still come from a sleep need.
    support: ['food_produce', 'food_unsweetened'],
    suggest: ['move_strength_prep'],
  },
};

export const FITNESS_NOTE =
  'This first version only has daily habits, so it doesn’t include the strength sessions guidelines recommend on 2+ days a week.';
