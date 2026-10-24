import type { Precaution, ProfileV2, Routine } from './types';

/*
 * The V2 quiz (HABIT_SCIENCE_V2_ARCHITECTURE.md, section A): copy, options and when each question shows.
 * No answer is pre-selected. Skipping precautions means unknown, never "none". W1 and W2 are asked
 * afterwards, only when the plan needs them (see program.ts, pendingTimeQuestion).
 */

export type Draft = Partial<ProfileV2>;

type Key = 'age' | 'goal' | 'sleepHours' | 'sleepTrouble' | 'activeDays' | 'produce' | 'sugary' | 'phone' | 'phonePull';

export type SingleQuestion = {
  kind: 'single';
  key: Key;
  icon: string;
  section: string;
  title: string;
  hint?: string;
  options: { value: string; label: string; sub?: string; icon?: string }[];
  shown?: (d: Draft) => boolean;
};

export type MultiQuestion = {
  kind: 'multi';
  key: 'routines' | 'precautions';
  icon: string;
  section: string;
  title: string;
  hint?: string;
  options: { value: string; label: string }[];
  /** The exclusive "None of these" option. */
  none: string;
  /** Precautions only: Skip, saved as unknown. */
  skippable?: boolean;
};

export type QuestionV2 = SingleQuestion | MultiQuestion;

const NOW = 'Where you are now';
const opt = (value: string, label: string) => ({ value, label });

export const QUESTIONS_V2: QuestionV2[] = [
  {
    kind: 'single',
    key: 'age',
    icon: 'person',
    section: 'About you',
    title: 'How old are you?',
    options: [
      opt('u16', 'Under 16'),
      opt('16_17', '16–17'),
      opt('18_29', '18–29'),
      opt('30_49', '30–49'),
      opt('50_64', '50–64'),
      opt('65p', '65 or older'),
    ],
  },
  {
    kind: 'single',
    key: 'goal',
    icon: 'flag',
    section: 'Where you’re headed',
    title: 'What do you want most right now?',
    hint: 'Pick one. Your plan is built around it.',
    options: [
      { value: 'energy', label: 'More energy', sub: 'Feel awake all day', icon: 'battery-charging' },
      { value: 'focus', label: 'Better focus', sub: 'Get the important things done', icon: 'locate' },
      { value: 'discipline', label: 'More discipline', sub: 'Do what you said you’d do', icon: 'shield-checkmark' },
      { value: 'confidence', label: 'More confidence', sub: 'Feel at ease with people', icon: 'happy' },
      { value: 'calm', label: 'Less stress', sub: 'Feel calmer day to day', icon: 'leaf' },
      { value: 'fitness', label: 'Get in shape', sub: 'Move more, feel stronger', icon: 'fitness' },
    ],
  },
  {
    kind: 'single',
    key: 'sleepHours',
    icon: 'moon',
    section: NOW,
    title: 'How many hours do you usually sleep on a school or work night?',
    options: [
      opt('lt6', 'Less than 6'),
      opt('6_7', '6–7'),
      opt('7_8', '7–8'),
      opt('8_9', '8–9'),
      opt('gt9', 'More than 9'),
    ],
  },
  {
    kind: 'single',
    key: 'sleepTrouble',
    icon: 'cloudy-night',
    section: NOW,
    title: 'How often do you have trouble falling asleep, staying asleep, or waking too early?',
    options: [opt('rarely', 'Rarely'), opt('some', '1–2 nights a week'), opt('most', '3+ nights a week')],
  },
  {
    kind: 'single',
    key: 'activeDays',
    icon: 'bicycle',
    section: NOW,
    title: 'On how many days a week do you do at least 20 minutes of activity that makes you breathe harder?',
    options: [opt('0', '0'), opt('1_2', '1–2'), opt('3_4', '3–4'), opt('5p', '5+')],
  },
  {
    kind: 'single',
    key: 'produce',
    icon: 'nutrition',
    section: NOW,
    title: 'On a typical day, how many portions of fruit and vegetables do you eat?',
    hint: 'A portion is about a handful (roughly 80 g). Potatoes don’t count.',
    options: [
      opt('0', 'Hardly any'),
      opt('1_2', '1–2'),
      opt('3_4', '3–4'),
      opt('5p', '5+'),
      opt('skip', 'I’d rather skip food questions'),
    ],
  },
  {
    kind: 'single',
    key: 'sugary',
    icon: 'cafe',
    section: NOW,
    title: 'How often do you have sugary drinks?',
    hint: 'Soda, energy drinks, sweetened coffee or tea, juice.',
    options: [opt('most', 'Most days'), opt('some', 'A few times a week'), opt('rarely', 'Rarely or never')],
    shown: (d) => d.age !== '16_17' && d.produce !== 'skip',
  },
  {
    kind: 'single',
    key: 'phone',
    icon: 'phone-portrait',
    section: NOW,
    title: 'Outside work or school, about how long are you on your phone each day?',
    hint: 'Screen Time in your phone’s Settings has the real number.',
    options: [
      opt('lt1', 'Under 1 h'),
      opt('1_2', '1–2 h'),
      opt('2_4', '2–4 h'),
      opt('4_6', '4–6 h'),
      opt('6p', '6 h+'),
      opt('unknown', 'Not sure'),
    ],
  },
  {
    kind: 'single',
    key: 'phonePull',
    icon: 'apps',
    section: NOW,
    title: 'What takes most of that time?',
    options: [
      opt('social', 'Social media'),
      opt('video', 'Videos'),
      opt('games', 'Games'),
      opt('messages', 'Messages and news'),
      opt('mix', 'A mix'),
    ],
    shown: (d) => d.phone === '2_4' || d.phone === '4_6' || d.phone === '6p' || d.phone === 'unknown',
  },
  {
    kind: 'multi',
    key: 'routines',
    icon: 'repeat',
    section: NOW,
    title: 'Which of these are already part of most of your days (5+ days a week)?',
    hint: 'Choose all that apply.',
    options: [
      opt('reading', 'Reading 10+ min'),
      opt('breathing', 'Breathing or meditation'),
      opt('journaling', 'Journaling'),
      opt('planning', 'Planning my day'),
      opt('walk', 'A 30+ minute walk'),
      opt('phoneAway', 'Phone out of reach 30 min before sleep'),
      opt('sameWake', 'Waking up at about the same time every day'),
      opt('bed', 'Making my bed'),
    ],
    none: 'None of these',
  },
  {
    kind: 'multi',
    key: 'precautions',
    icon: 'medkit',
    section: 'Keeping it safe',
    title: 'Anything we should keep in mind?',
    hint: 'Optional. It stays on your phone.',
    options: [
      opt('joint', 'Joint, back or injury pain'),
      opt('walkingDifficult', 'Walking or standing for long is difficult for me'),
      opt('heart', 'Heart or blood-pressure condition'),
      opt('pregnancy', 'Pregnant or recently gave birth'),
      opt('fluidLimit', 'A clinician told me to limit fluids'),
      opt('sleepCondition', 'Diagnosed sleep condition'),
    ],
    none: 'None of these',
    skippable: true,
  },
];

/** The questions this draft gets, in order (conditional ones depend on earlier answers). */
export function visibleQuestions(d: Draft): QuestionV2[] {
  return QUESTIONS_V2.filter((q) => q.kind === 'multi' || !q.shown || q.shown(d));
}

export function isAnswered(q: QuestionV2, d: Draft): boolean {
  return d[q.key] !== undefined;
}

/**
 * The finished profile, or null if anything shown is unanswered or the person is under 16. Answers to
 * questions that are no longer shown (e.g. after changing an earlier answer) are dropped.
 */
export function toProfile(d: Draft): ProfileV2 | null {
  if (d.age === undefined || d.age === 'u16') return null;
  const shown = visibleQuestions(d);
  if (!shown.every((q) => isAnswered(q, d))) return null;
  const has = (k: Key) => shown.some((q) => q.key === k);
  const p: ProfileV2 = {
    age: d.age,
    goal: d.goal!,
    sleepHours: d.sleepHours!,
    sleepTrouble: d.sleepTrouble!,
    activeDays: d.activeDays!,
    produce: d.produce!,
    phone: d.phone!,
    routines: d.routines as Routine[],
    precautions: d.precautions as Precaution[] | 'unknown',
  };
  if (has('sugary')) p.sugary = d.sugary;
  if (has('phonePull')) p.phonePull = d.phonePull;
  if (d.wake) p.wake = d.wake;
  if (d.inBed !== undefined) p.inBed = d.inBed;
  return p;
}
