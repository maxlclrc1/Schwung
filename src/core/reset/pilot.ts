import { dateForDay, PROGRAM_DAYS } from '../dates';
import { dayQualifies, doneCount, XP_FULL_DAY_BONUS, XP_PER_HABIT } from '../progression';
import type { DayLog } from '../types';
import {
  isTeen,
  type ActiveDays,
  type AgeBand,
  type PhoneHours,
  type Precaution,
  type Profile,
  type Wake,
} from './profile';
import {
  INTENSITIES,
  PHASES,
  RESET_BY_ID,
  RESET_HABITS,
  resetExclusion,
  scrollingLimit,
  SKILLS,
  SOCIAL_ACTIONS,
  strengthNotes,
  upBy,
  type Intensity,
  type Schedule,
  type SocialAction,
  type Target,
} from './habits';
import { sanitizeCollection } from './collection';
import { sanitizeReflections, type Reflection } from './reflections';
import { recordWeekly, weeklyMeasure, type WeeklyMeasure, type WeeklyMeasures } from './measures';
import {
  acceptOffer,
  declineOffer,
  levelOn,
  makeEasier,
  makeHarder,
  newProgression,
  pendingChange,
  progressionOffer,
  scheduleEras,
  setFeedback,
  type Constraints,
  type Feedback,
  type Level,
  type ManualResult,
  type Offer,
  type ProgressionState,
} from './readiness';
import { timerBlocks } from './timer';
import {
  confirmDone,
  decrement,
  editSession,
  increment,
  logSession,
  readTrack,
  recordAmount,
  skip,
  undoDone,
  undoSession,
  unskip,
  type At,
  type Change,
  type SessionType,
} from './tracking';
import {
  countsTowardDay,
  dayState,
  scheduleOn,
  weekOf,
  weekSummaries,
  weekSummary,
  type DayState,
  type WeekSummary,
  type WeeklyContext,
} from './weekly';

/*
 * The Life Reset program, the app's one program (saved by store/resetPilot.ts). It began as a
 * three-habit pilot, kept its save, and now runs all 11 catalog habits. This module is its rules, pure: it joins the
 * catalog, weekly scheduling, tracking and readiness engines and adds only what a running program needs. Every
 * program-specific rule (day lists, XP, streak, no ceremonies, the Insights numbers) is documented in
 * SCHWUNG_LIFE_RESET_PROGRAM.md and tested in resetPilot.test.ts.
 *
 * Timers are not part of the experience: targets are just shown, and a swipe confirms. Timer data saved by the pilot
 * stays in the day records, untouched (timer.ts is kept, unused).
 */

/** All 11 habits, in the catalog's order (the cards' order too). */
export const PILOT_HABITS = RESET_HABITS.map((h) => h.id) as readonly string[];
export type PilotHabitId = string;
export const isPilotHabit = (id: string): id is PilotHabitId => PILOT_HABITS.includes(id);

/** The existing plan limit (SCHWUNG_LIFE_RESET_HABITS.md §6), kept for now. */
export const MAX_HABITS = 30;

/** "On a day all your habits fall on, about how long can you give them?" (minutes). */
export const PILOT_TIME_OPTIONS = [20, 30, 45, 60, 90, 120, 180] as const;

/** A suggested first set: easy to start, no special answers needed beyond the setup's. Never pre-selected. */
export const SUGGESTED_START = ['mind_read', 'move_walk', 'sleep_wake'] as const;

export type StrengthStart = 'new' | 'sometimes' | 'regular';

/** Only what the chosen habits need to know. */
export type PilotAnswers = {
  age: AgeBand;
  /** The existing precautions question; skipping it is 'unknown', never "none". */
  precautions: Precaution[] | 'unknown';
  minutesPerDay: number;
  /** Strength Training: where the person is starting from. */
  strengthStart?: StrengthStart;
  /** Strength Training at Challenge: the sessions a week the person already does (2–7), kept as it is. */
  ownSessions?: number;
  /** Adults: time a 90-minute Focus block as two halves. 16–17 always get blocks of at most 60 minutes. */
  splitFocus?: boolean;
  /** Less Scrolling: overall phone time (the existing question), and daily minutes on the main app. */
  phone?: PhoneHours;
  pullMinutes?: number;
  /** Sleep Routine: the existing wake question (a time, varies, or shifts). */
  wake?: Wake;
  /** Daily Movement: active days a week (the existing question). */
  activeDays?: ActiveDays;
  /** Practice a Skill: which one. */
  skill?: string;
};

export type PilotChoice = { habitId: PilotHabitId; intensity: Intensity };

export type PilotProgram = {
  v: 1;
  /** Date key of Day 1. */
  startedAt: string;
  answers: PilotAnswers;
  /** The chosen habits, in card order. */
  habits: PilotHabitId[];
  /** Each habit's targets over time (eras, pending changes, feedback, declines): see readiness.ts. */
  progression: Record<string, ProgressionState>;
  /** Day records, keyed by date: `completed` decides everything; `track` holds the details. */
  logs: Record<string, DayLog>;
  /** Less Scrolling's optional weekly Screen Time check (self-reported). */
  measures?: WeeklyMeasures;
  /** The person's own habits, by id (`custom_1`, `custom_2`…). Their schedules are in `progression`. */
  custom?: Record<string, CustomHabit>;
  /** The two ceremonies, once each per Life Reset: set when seen through (or skipped). */
  ceremonies?: { day1?: boolean; summit?: boolean; milestones?: number[] };
  /** Weekly reflections by program week (reflections.ts): answers kept on the phone, never acted on by themselves. */
  reflections?: Record<string, Reflection>;
  /** The welcome back (comeback.ts): the first day of the last absence already welcomed. */
  comeback?: { seen: number };
  /** The XP collection (collection.ts): objects unlocked, kept for good. */
  collection?: { unlocked: string[] };
};

/** The milestone moments between the two ceremonies: a first foothold, Foundation complete, Momentum complete. */
export const MILESTONE_DAYS = [7, 21, 44] as const;

/**
 * The milestone moment due today, if any: the latest milestone reached, while its stage lasts (until the next
 * milestone, or the summit), and not seen. Someone back after a milestone has passed sees at most that one (the
 * earlier ones are marked with it), never a stack; consistency never decides it.
 */
export function milestoneDue(p: PilotProgram, today: number): number | null {
  const seen = p.ceremonies?.milestones ?? [];
  const reached = MILESTONE_DAYS.filter((m) => m <= today);
  const m = reached[reached.length - 1];
  if (!m || seen.includes(m)) return null;
  const next = MILESTONE_DAYS.find((x) => x > m) ?? PROGRAM_DAYS;
  return today < next ? m : null;
}

/**
 * The summit ceremony is due once the 66 days are done: on Day 66 when the day is complete, or from the day after
 * whatever happened (consistency never decides it). Never before Day 66, never twice.
 */
export function summitDue(p: PilotProgram, today: number): boolean {
  if (p.ceremonies?.summit) return false;
  return today > PROGRAM_DAYS || (today === PROGRAM_DAYS && dayFull(p, PROGRAM_DAYS));
}

/** A habit the person made: a name, what counts (optional), how often, and its window onto the world. */
export type CustomHabit = {
  name: string;
  note?: string;
  /** Days a week: 7 is every day; 1–6 any days the person chooses. */
  perWeek: number;
  /** Which part of the panorama its card shows (habitArt.ts cropAt). */
  scene: number;
};

export const isCustomId = (id: string) => /^custom_\d+$/.test(id);

/** A habit's name: the catalog's, or the person's own. */
export const nameOf = (p: PilotProgram, id: string) => p.custom?.[id]?.name ?? habitName(id);

/**
 * Every habit that has been part of the program, current first: the history (days, XP, streak, Insights) counts
 * each one only on the days it was in the program (removed habits keep their past).
 */
export const allHabits = (p: PilotProgram) => [
  ...p.habits,
  ...Object.keys(p.progression).filter((id) => !p.habits.includes(id)),
];

// --- Setup ---

/** The answers the eligibility rules read (reset/profile.ts), from the setup's. */
export function pilotProfile(a: PilotAnswers): Profile {
  return {
    age: a.age,
    precautions: a.precautions,
    ...(a.phone ? { phone: a.phone } : {}),
    ...(a.wake ? { wake: a.wake } : {}),
    ...(a.activeDays ? { activeDays: a.activeDays } : {}),
  };
}

export const habitName = (id: string) => RESET_BY_ID[id]?.name ?? id;
export const habitDescription = (id: string) => RESET_BY_ID[id]?.description ?? '';
export const INTENSITY_NAME: Record<Intensity, string> = {
  starter: 'Starter',
  standard: 'Standard',
  challenge: 'Challenge',
};
export const PHASE_NAME = { foundation: 'Foundation', momentum: 'Momentum', mastery: 'Mastery' } as const;

/** The baseline questions a habit needs answered before it can start. */
export type Baseline = 'phone' | 'pullMinutes' | 'wake' | 'activeDays' | 'skill' | 'strengthStart';
export const BASELINES: Partial<Record<string, Baseline[]>> = {
  screen_app_limit: ['phone', 'pullMinutes'],
  sleep_wake: ['wake'],
  move_walk: ['activeDays'],
  skill_practice: ['skill'],
  strength_log: ['strengthStart'],
};

/** The baselines the chosen habits need, in a stable order. */
export function baselinesFor(ids: string[]): Baseline[] {
  const all = ids.flatMap((id) => BASELINES[id] ?? []);
  return (['phone', 'pullMinutes', 'wake', 'activeDays', 'skill', 'strengthStart'] as Baseline[]).filter((b) =>
    all.includes(b),
  );
}

const answered = (a: PilotAnswers, b: Baseline) => a[b] !== undefined;

/** Each intensity of a habit for this person, with the reason when the existing rules don't allow it. */
export function intensityOptions(
  habitId: PilotHabitId,
  a: PilotAnswers,
): { intensity: Intensity; reason: string | null }[] {
  const profile = pilotProfile(a);
  return INTENSITIES.map((intensity) => ({
    intensity,
    reason: resetExclusion(RESET_BY_ID[habitId], profile, intensity),
  }));
}

/** Why a habit can't be taken at all by this person (every intensity excluded), or null. */
export function habitExclusion(habitId: PilotHabitId, a: PilotAnswers): string | null {
  const o = intensityOptions(habitId, a);
  return o.every((x) => x.reason) ? o[0].reason : null;
}

/**
 * A starting suggestion, always one the person can take: Strength from where they're starting, Movement from their
 * active days, Less Scrolling from their main-app time, Starter otherwise (a manageable start).
 */
export function suggestedIntensity(habitId: PilotHabitId, a: PilotAnswers): Intensity | null {
  const allowed = intensityOptions(habitId, a)
    .filter((o) => !o.reason)
    .map((o) => o.intensity);
  if (!allowed.length) return null;
  const wanted: Intensity =
    habitId === 'strength_log'
      ? a.strengthStart === 'regular'
        ? 'challenge'
        : a.strengthStart === 'sometimes'
          ? 'standard'
          : 'starter'
      : habitId === 'move_walk'
        ? a.activeDays === '5p'
          ? 'challenge'
          : a.activeDays === '3_4'
            ? 'standard'
            : 'starter'
        : habitId === 'screen_app_limit'
          ? (a.pullMinutes ?? 0) >= 180
            ? 'standard'
            : 'starter'
          : 'starter';
  // The nearest allowed one, preferring easier.
  const i = INTENSITIES.indexOf(wanted);
  return [...allowed].sort(
    (x, y) =>
      Math.abs(INTENSITIES.indexOf(x) - i) - Math.abs(INTENSITIES.indexOf(y) - i) ||
      INTENSITIES.indexOf(x) - INTENSITIES.indexOf(y),
  )[0];
}

/** Safety and guidance notes to show with a habit for this person (the catalog's, plus Strength's own). */
export function habitNotes(habitId: PilotHabitId, a: PilotAnswers): string[] {
  const h = RESET_BY_ID[habitId];
  return habitId === 'strength_log' ? [...h.notes, ...strengthNotes(pilotProfile(a))] : h.notes;
}

export const targetFor = (habitId: string, l: Level): Target => RESET_BY_ID[habitId].targets[l.intensity][l.phase];

/** Minutes a target takes on a day it's done (timed habits: the target; Strength: its approximate length). */
export const minutesFor = (habitId: string, l: Level) =>
  RESET_BY_ID[habitId] ? (targetFor(habitId, l).minutesPerDueDay ?? 0) : 0;

const BASELINE_PROBLEM: Record<Baseline, string> = {
  phone: 'Less Scrolling: say how long you use your phone a day.',
  pullMinutes: 'Less Scrolling: say how long a day you spend on your main app.',
  wake: 'Sleep Routine: say when you usually get up.',
  activeDays: 'Daily Movement: say how many days a week you’re active.',
  skill: 'Practice a Skill: choose your skill.',
  strengthStart: 'Strength Training: say where you’re starting from.',
};

/** The checks for starting: one problem per line, or none. */
export function setupProblems(a: PilotAnswers, choices: PilotChoice[]): string[] {
  const out: string[] = [];
  if (a.age === 'u16') return ['Schwung is made for people 16 and older.'];
  if (!choices.length) out.push('Choose at least one habit.');
  if (choices.length > MAX_HABITS) out.push(`Choose at most ${MAX_HABITS} habits for now.`);
  const ids = new Set<string>();
  for (const c of choices) {
    if (!isPilotHabit(c.habitId)) {
      out.push('Choose from the Life Reset habits.');
      continue;
    }
    if (ids.has(c.habitId)) {
      out.push('Each habit can be chosen once.');
      continue;
    }
    ids.add(c.habitId);
    for (const b of BASELINES[c.habitId] ?? []) if (!answered(a, b)) out.push(BASELINE_PROBLEM[b]);
    if ((BASELINES[c.habitId] ?? []).every((b) => answered(a, b))) {
      const reason = resetExclusion(RESET_BY_ID[c.habitId], pilotProfile(a), c.intensity);
      if (reason) out.push(`${habitName(c.habitId)} at ${INTENSITY_NAME[c.intensity]}: ${reason}.`);
    }
  }
  if (ids.has('skill_practice') && a.skill !== undefined && !SKILLS.includes(a.skill))
    out.push('Practice a Skill: choose your skill.');
  if (ids.has('screen_app_limit') && a.pullMinutes !== undefined && !(a.pullMinutes > 0 && a.pullMinutes <= 1440))
    out.push('Less Scrolling: say how long a day you spend on your main app.');
  const strength = choices.find((c) => c.habitId === 'strength_log');
  const own = a.ownSessions;
  if (strength?.intensity === 'challenge' && !(own !== undefined && Number.isInteger(own) && own >= 2 && own <= 7))
    out.push('Strength Training at Challenge: say how many sessions a week you already do (2–7).');
  if (!PILOT_TIME_OPTIONS.includes(a.minutesPerDay as (typeof PILOT_TIME_OPTIONS)[number]))
    out.push('Say how much time you have on a busy day.');
  else {
    // Only real Life Reset habits count (anything else is refused above, never looked up).
    const total = busiestDayMinutes(
      choices
        .filter((c) => isPilotHabit(c.habitId))
        .map((c) => ({ habitId: c.habitId, level: foundation(c.intensity) })),
    );
    if (total > a.minutesPerDay)
      out.push(
        `These take about ${total} min on a day they all fall on, more than the ${a.minutesPerDay} min you have. Choose an easier intensity or fewer habits.`,
      );
  }
  return [...new Set(out)];
}

const foundation = (intensity: Intensity): Level => ({ intensity, phase: 'foundation' });

/** The time all the habits take on a day they all fall on (the time check's worst case). */
export function busiestDayMinutes(habits: { habitId: string; level: Level }[]): number {
  return habits.reduce((n, h) => n + minutesFor(h.habitId, h.level), 0);
}

/** Only the answers the chosen habits use are kept. */
function keptAnswers(a: PilotAnswers, ids: string[]): PilotAnswers {
  const needs = new Set(baselinesFor(ids));
  const strength = ids.includes('strength_log');
  return {
    age: a.age,
    precautions: a.precautions,
    minutesPerDay: a.minutesPerDay,
    ...(needs.has('phone') && a.phone ? { phone: a.phone } : {}),
    ...(needs.has('pullMinutes') && a.pullMinutes !== undefined ? { pullMinutes: a.pullMinutes } : {}),
    ...(needs.has('wake') && a.wake ? { wake: a.wake } : {}),
    ...(needs.has('activeDays') && a.activeDays ? { activeDays: a.activeDays } : {}),
    ...(needs.has('skill') && a.skill ? { skill: a.skill } : {}),
    ...(strength
      ? { strengthStart: a.strengthStart, ...(a.ownSessions !== undefined ? { ownSessions: a.ownSessions } : {}) }
      : {}),
    ...(a.splitFocus ? { splitFocus: true } : {}),
  };
}

/** A new program, starting today at Foundation for each chosen intensity; null if the setup has a problem. */
export function createPilot(a: PilotAnswers, choices: PilotChoice[], startKey: string): PilotProgram | null {
  if (setupProblems(a, choices).length) return null;
  const ordered = PILOT_HABITS.filter((id) => choices.some((c) => c.habitId === id));
  return {
    v: 1,
    startedAt: startKey,
    answers: keptAnswers(a, ordered),
    habits: ordered,
    progression: Object.fromEntries(
      ordered.map((id) => [id, newProgression(id, choices.find((c) => c.habitId === id)!.intensity, 1)]),
    ),
    logs: {},
  };
}

// --- Adding a habit to a running program ---

/** The habits a running program can still add (not in it yet), in catalog order. */
export const addableHabits = (p: PilotProgram) => PILOT_HABITS.filter((id) => !p.habits.includes(id));

/** The questions a habit needs that this program hasn't answered yet. */
export const missingBaselines = (p: PilotProgram, id: string) =>
  baselinesFor([id]).filter((b) => !answered(p.answers, b));

/**
 * Why a habit can't join this program today (one problem per line), or none. The set-up's rules: the 11 habits only,
 * once each, at most MAX_HABITS, its questions answered, its eligibility, and the time check, now with every habit at
 * the level it's at today. `extra` holds the new answers (its questions, or more time a day).
 */
export function addProblems(p: PilotProgram, extra: Partial<PilotAnswers>, choice: PilotChoice, day: number): string[] {
  if (!isPilotHabit(choice.habitId)) return ['Choose from the Life Reset habits.'];
  if (p.habits.includes(choice.habitId)) return [`${habitName(choice.habitId)} is already in your Life Reset.`];
  const a = { ...p.answers, ...extra };
  const out: string[] = [];
  if (p.habits.length >= MAX_HABITS) out.push(`You have ${MAX_HABITS} habits, the most for now.`);
  // Its questions and eligibility, worded as in set-up (set-up's own time check is replaced below).
  out.push(...setupProblems(a, [choice]).filter((x) => !x.startsWith('These take') && !x.startsWith('Say how much')));
  const total = busiestDayMinutes([
    ...p.habits.map((id) => ({ habitId: id, level: levelFor(p, id, day) })),
    { habitId: choice.habitId, level: foundation(choice.intensity) },
  ]);
  if (total > a.minutesPerDay)
    out.push(
      `With it, your habits take about ${total} min on a day they all fall on, more than the ${a.minutesPerDay} min you have. Choose an easier intensity or more time.`,
    );
  return [...new Set(out)];
}

/**
 * The program with a habit added from `day`, at Foundation of the chosen intensity; null if it can't join. Earlier
 * days are untouched: the habit simply didn't exist then (never a miss), and its weeks start on the day it joined.
 */
export function addHabit(
  p: PilotProgram,
  extra: Partial<PilotAnswers>,
  choice: PilotChoice,
  day: number,
): PilotProgram | null {
  if (addProblems(p, extra, choice, day).length) return null;
  const habits = ordered([...p.habits, choice.habitId]);
  const before = p.progression[choice.habitId];
  return {
    ...p,
    answers: keptAnswers({ ...p.answers, ...extra }, habits.filter(isPilotHabit)),
    habits,
    progression: {
      ...p.progression,
      [choice.habitId]: before
        ? comeBack(before, { intensity: choice.intensity, phase: 'foundation' }, day)
        : newProgression(choice.habitId, choice.intensity, day),
    },
  };
}

/** Catalog habits in catalog order, then the person's own in the order they were made. */
const ordered = (ids: string[]) => [
  ...PILOT_HABITS.filter((id) => ids.includes(id)),
  ...ids.filter(isCustomId).sort((a, b) => Number(a.slice(7)) - Number(b.slice(7))),
];

/**
 * A removed habit back in the program from `day`, at the given level: its earlier days stay as they were, and its days
 * away never existed. (Removed earlier today after being done, it simply stays.)
 */
function comeBack(s: ProgressionState, level: Level, day: number): ProgressionState {
  const gaps = s.gaps ?? [];
  const open = gaps[gaps.length - 1];
  const closed =
    open && open.to === undefined
      ? open.from > day
        ? gaps.slice(0, -1)
        : [...gaps.slice(0, -1), { ...open, to: day }]
      : gaps;
  return { ...s, eras: [...s.eras, { ...level, fromDay: day, reason: 'start' }], gaps: closed };
}

/** The part of the panorama a new habit of the person's own gets: the first view none of their current ones shows. */
export function nextScene(p: PilotProgram, views: number): number {
  const used = p.habits.flatMap((x) => (p.custom?.[x] ? [p.custom[x].scene] : []));
  return Array.from({ length: views }, (_, i) => i).find((i) => !used.includes(i)) ?? used.length % views;
}

/** Why the person's own habit can't be added (one problem per line), or none. */
export function customProblems(p: PilotProgram, name: string, perWeek: number): string[] {
  const out: string[] = [];
  const n = name.trim();
  if (!n) out.push('Give it a name.');
  else if (n.length > 40) out.push('Keep the name to 40 characters.');
  else if (p.habits.some((id) => nameOf(p, id).toLowerCase() === n.toLowerCase()))
    out.push('You already have a habit with that name.');
  if (!(Number.isInteger(perWeek) && perWeek >= 1 && perWeek <= 7)) out.push('Choose how many days a week.');
  if (p.habits.length >= MAX_HABITS) out.push(`You have ${MAX_HABITS} habits, the most for now.`);
  return out;
}

/**
 * The program with a habit of the person's own added from `day`: their name and what counts, every day or any 1–6
 * days a week (counted by the week like the catalog's weekly habits). It has no levels or offers, and its card shows
 * a part of the panorama that no other habit of theirs shows (while there are views to go round).
 */
export function addCustomHabit(
  p: PilotProgram,
  def: { name: string; note?: string; perWeek: number },
  day: number,
  views: number,
): { program: PilotProgram; id: string } | null {
  if (customProblems(p, def.name, def.perWeek).length) return null;
  const custom = p.custom ?? {};
  const id = `custom_${Object.keys(custom).length + 1}`;
  const scene = nextScene(p, views);
  const note = def.note?.trim().slice(0, 80);
  const schedule: Schedule = def.perWeek >= 7 ? { kind: 'daily' } : { kind: 'weekly', days: def.perWeek };
  return {
    id,
    program: {
      ...p,
      habits: ordered([...p.habits, id]),
      custom: { ...custom, [id]: { name: def.name.trim(), ...(note ? { note } : {}), perWeek: def.perWeek, scene } },
      progression: {
        ...p.progression,
        [id]: {
          v: 1,
          habitId: id,
          eras: [{ intensity: 'starter', phase: 'foundation', fromDay: day, reason: 'start' }],
          schedule,
        },
      },
    },
  };
}

/** Why a habit can't be removed, or null. */
export function removeProblem(p: PilotProgram, id: string): string | null {
  if (!p.habits.includes(id)) return 'It isn’t in your Life Reset.';
  if (p.habits.length <= 1) return 'Keep at least one habit. To stop altogether, end the Life Reset in Settings.';
  return null;
}

/**
 * The program without a habit from `day` (from tomorrow if it's already done today, so today stays as it is). Its
 * past stays: earlier days, XP, the streak and Insights count it while it was in the program, and never after. A
 * change it had waiting is dropped. It can be added again later.
 */
export function removeHabit(p: PilotProgram, id: string, day: number): PilotProgram | null {
  if (removeProblem(p, id)) return null;
  const s = p.progression[id];
  const from = isDone(p, id, day) ? day + 1 : day;
  const eras = s.eras.filter((e, i) => i === 0 || e.fromDay <= day);
  return {
    ...p,
    habits: p.habits.filter((x) => x !== id),
    progression: { ...p.progression, [id]: { ...s, eras, gaps: [...(s.gaps ?? []), { from }] } },
  };
}

/** What a habit would ask at Foundation of an intensity, for the setup's review (target and how often). */
export function previewTarget(habitId: PilotHabitId, intensity: Intensity, a: PilotAnswers) {
  const p: PilotProgram = {
    v: 1,
    startedAt: '2026-01-05',
    answers: a,
    habits: [habitId],
    progression: { [habitId]: newProgression(habitId, intensity, 1) },
    logs: {},
  };
  return { target: targetText(p, habitId, 1), frequency: frequencyText(p, habitId, 1) };
}

// --- Reading the program ---

export const ctxOf = (p: PilotProgram): WeeklyContext => ({
  startKey: p.startedAt,
  ...(p.answers.ownSessions !== undefined ? { ownSessions: p.answers.ownSessions } : {}),
});

export const levelFor = (p: PilotProgram, id: string, day: number): Level => levelOn(p.progression[id], day);
const erasOf = (p: PilotProgram, id: string) => scheduleEras(p.progression[id]);

/** Whether a habit is part of the program on a day (from the day it joined). */
const activeOn = (p: PilotProgram, id: string, day: number) => scheduleOn(erasOf(p, id), day) !== null;

/** Whether a habit is due every day, or counted by the week, on a day. */
export function isDaily(p: PilotProgram, id: string, day: number): boolean {
  return scheduleOn(erasOf(p, id), day)?.kind === 'daily';
}

/**
 * The day's list for the 80% rule and XP. Daily habits always belong to it; a weekly habit only on a day it's done
 * (it helps the day, and a rest day never pulls a day down). Derived, never chosen.
 */
export function plannedOn(p: PilotProgram, day: number, completed: string[]): string[] {
  return allHabits(p).filter((id) => {
    const s = scheduleOn(erasOf(p, id), day);
    return s !== null && countsTowardDay(s, completed.includes(id));
  });
}

const logOf = (p: PilotProgram, day: number) => p.logs[dateForDay(p.startedAt, day)];
export const isDone = (p: PilotProgram, id: string, day: number) => !!logOf(p, day)?.completed.includes(id);
export const trackOf = (p: PilotProgram, id: string, day: number) => readTrack(logOf(p, day), id);

const fmtMinutes = (m: number) => `${m} minute${m === 1 ? '' : 's'}`;
const fmtDuration = (m: number) =>
  m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${String(m % 60).padStart(2, '0')}` : ''}`;
const skillWords = (skill: string | undefined) =>
  !skill || skill === 'Other' ? 'your skill' : skill === 'Sport skill' ? 'your sport skill' : skill.toLowerCase();

/** Less Scrolling's limit for a level, from the person's own main-app time. */
export function scrollLimitFor(p: PilotProgram, l: Level): number {
  const a = targetFor('screen_app_limit', l).amount;
  return a.kind === 'below-baseline' ? scrollingLimit(p.answers.pullMinutes ?? 120, a.reduceBy) : 0;
}

/** Social Confidence: the steps that count at a level (any of them does). */
export function socialSteps(p: PilotProgram, day: number): SocialAction[] {
  const levels = targetFor('confidence_talk', levelFor(p, 'confidence_talk', day)).levels ?? [1];
  return SOCIAL_ACTIONS.filter((a) => levels.includes(a.level));
}

/** Social Confidence: the day's suggested step (it changes each day; any step from the list counts). */
export function socialStep(p: PilotProgram, day: number): SocialAction {
  const steps = socialSteps(p, day);
  return steps[(day * 7) % steps.length];
}

/** The counter's daily number for Get It Done (tasks) and Stay Connected (people); null for other habits. */
export function counterTarget(p: PilotProgram, id: string, day: number): number | null {
  if (RESET_BY_ID[id]?.completion.kind !== 'counter') return null;
  const a = targetFor(id, levelFor(p, id, day)).amount;
  return a.kind === 'fixed' ? a.value : null;
}

/** What the card says: what to do and how much, in a few words. */
export function targetText(p: PilotProgram, id: string, day: number): string {
  const own = p.custom?.[id];
  if (own) return own.note || frequencyText(p, id, day);
  const l = levelFor(p, id, day);
  const t = targetFor(id, l);
  const minutes = t.amount.kind === 'fixed' ? t.amount.value : 0;
  const blocks = timerBlocksFor(p, id, day);
  const time = blocks.length > 1 ? `${blocks.length} × ${fmtMinutes(blocks[0])}` : fmtMinutes(minutes);
  switch (id) {
    case 'strength_log': {
      const n = t.amount.kind === 'own' ? (p.answers.ownSessions ?? 2) : minutes;
      return `${n} session${n === 1 ? '' : 's'} a week${t.aboutMinutes ? `, about ${t.aboutMinutes} min` : ''}`;
    }
    case 'focus_deepwork':
      return `Focus for ${time}, phone in another room`;
    case 'mind_read':
      return `Read for ${time}`;
    case 'move_walk':
      return `Move for ${time}, any way you like`;
    case 'home_tidy':
      return `Tidy up for ${time}`;
    case 'skill_practice':
      return `Practise ${skillWords(p.answers.skill)} for ${time}`;
    case 'screen_app_limit':
      return `Keep your main app under ${fmtDuration(scrollLimitFor(p, l))} today`;
    case 'sleep_wake':
      return p.answers.wake?.kind === 'time' ? `Up by ${upBy(p.answers.wake.time, minutes)}` : 'Up at your usual time';
    case 'confidence_talk':
      return socialStep(p, day).text;
    case 'social_reach_out':
      return `Reach out to ${minutes} ${minutes === 1 ? 'person' : 'people'}${t.calls ? ', one of them a call' : ''} (more than a like)`;
    default:
      return t.text;
  }
}

/** How often, in words. */
export function frequencyText(p: PilotProgram, id: string, day: number): string {
  const own = p.custom?.[id];
  if (own) return own.perWeek >= 7 ? 'Every day' : `Any ${own.perWeek} day${own.perWeek === 1 ? '' : 's'} a week`;
  const s = targetFor(id, levelFor(p, id, day)).schedule;
  if (s.kind === 'daily') return 'Every day';
  if (s.kind === 'weekly') return `Any ${s.days} days a week`;
  if (s.kind === 'sessions') return 'Any days you choose, one session a day at most';
  return `Any ${s.days} workdays a week`;
}

export type WeekProgress = { credited: number; goal: number; status: string; daysLeft: number };

/** This week's progress for a weekly habit (null for a daily one). Rest days are never misses. */
export function weekProgress(p: PilotProgram, id: string, day: number): WeekProgress | null {
  if (isDaily(p, id, day)) return null;
  const w = weekSummary(id, erasOf(p, id), p.logs, ctxOf(p), day, day);
  return { credited: w.credited, goal: w.goal, status: w.status, daysLeft: w.lastDay - day + 1 };
}

/** What the habit asks of the day: due (daily), open or goal met (weekly), done, not a workday. */
export const stateOn = (p: PilotProgram, id: string, day: number): DayState =>
  dayState(id, erasOf(p, id), p.logs, ctxOf(p), day);

/** The blocks a timed target is shown in (16–17 always within the focus cap; adults only if they chose). */
export function timerBlocksFor(p: PilotProgram, id: string, day: number): number[] {
  if (!RESET_BY_ID[id]) return [];
  const t = targetFor(id, levelFor(p, id, day));
  if (t.unit !== 'minutes') return [];
  return timerBlocks(t, { teen: isTeen(pilotProfile(p.answers)), split: !!p.answers.splitFocus });
}

// --- Day rules: XP, streak, a full day ---

/**
 * The habits a day asks for, for "Day complete": every daily habit, and each weekly habit whose week is still open
 * and that can count that day (one whose goal is already met, or that can't count that day, is resting). A weekly
 * habit done that day is included (it's done). Evaluated as of that day, from the saved days only.
 */
export function requiredOn(p: PilotProgram, day: number): string[] {
  return allHabits(p).filter((id) => {
    const st = stateOn(p, id, day);
    return st === 'due' || st === 'open' || st === 'done';
  });
}

/** A complete day: something asked of it, and all of it done (open weekly habits included). */
export function dayFull(p: PilotProgram, day: number): boolean {
  const required = requiredOn(p, day);
  return required.length > 0 && required.every((id) => isDone(p, id, day));
}

/**
 * XP: 10 for each done habit on the day's list, +20 for a complete day (dayFull). Computed from the saved days, so an
 * undo takes it back and nothing is ever awarded twice.
 */
export const pilotXp = (p: PilotProgram) =>
  Object.values(p.logs).reduce(
    (xp, l) => xp + doneCount(l) * XP_PER_HABIT + (dayFull(p, l.day) ? XP_FULL_DAY_BONUS : 0),
    0,
  );

/**
 * How a day counts for the streak and the Journey: 'rest' when nothing was due (no daily habit, nothing done:
 * weekly habits resting), else whether it met the existing 80% rule.
 */
export function dayResult(p: PilotProgram, day: number): 'rest' | 'counted' | 'missed' {
  const log = logOf(p, day);
  const dailyDue = allHabits(p).some((id) => isDaily(p, id, day));
  const planned = log ? plannedOn(p, day, log.completed) : dailyDue ? ['due'] : [];
  if (planned.length === 0) return 'rest';
  return log && dayQualifies({ ...log, planned }) ? 'counted' : 'missed';
}

/**
 * The streak: consecutive days that count by the 80% rule, ending today (an unfinished today doesn't break it). A
 * rest day is neutral: it neither counts nor breaks the streak.
 */
export function pilotStreak(p: PilotProgram, today: number): number {
  let streak = 0;
  for (let d = today; d >= 1; d--) {
    const r = dayResult(p, d);
    if (r === 'rest') continue;
    if (r === 'counted') streak++;
    else if (d !== today) break;
  }
  return streak;
}

/** The best streak so far (rest days neutral), and the days that counted. */
export function journeyStats(p: PilotProgram, today: number) {
  let best = 0;
  let run = 0;
  let done = 0;
  for (let d = 1; d <= Math.min(today, PROGRAM_DAYS); d++) {
    const r = dayResult(p, d);
    if (r === 'rest') continue;
    if (r === 'counted') {
      done++;
      run++;
      best = Math.max(best, run);
    } else if (d !== today) run = 0;
  }
  return { done, streak: pilotStreak(p, today), best };
}

// --- Changes. Each returns the new program and the tracking event (at most one, only when completion changes). ---

export type PilotChange = { program: PilotProgram; event: Change['event'] };

const atFor = (p: PilotProgram, day: number): At => ({
  startKey: p.startedAt,
  day,
  planned: plannedOn(p, day, logOf(p, day)?.completed ?? []),
});

/** Applies a tracking change and re-derives that day's list from what's done (days are never hand-planned). */
function apply(p: PilotProgram, day: number, f: (logs: PilotProgram['logs'], at: At) => Change): PilotChange {
  const r = f(p.logs, atFor(p, day));
  if (r.logs === p.logs) return { program: p, event: null };
  const key = dateForDay(p.startedAt, day);
  const log = r.logs[key];
  const logs = log ? { ...r.logs, [key]: { ...log, planned: plannedOn(p, day, log.completed) } } : r.logs;
  return { program: { ...p, logs }, event: r.event };
}

const inProgram = (p: PilotProgram, id: string, day: number) =>
  p.habits.includes(id) && day >= 1 && day <= PROGRAM_DAYS;
const none = (p: PilotProgram): PilotChange => ({ program: p, event: null });

/** The swipe or the check button: done. Idempotent (no second XP, ever). */
export function complete(p: PilotProgram, id: string, day: number): PilotChange {
  if (!inProgram(p, id, day)) return none(p);
  return apply(p, day, (logs, at) => (id === 'strength_log' ? logSession(logs, at, id) : confirmDone(logs, at, id)));
}

/** Undo. A strength session is removed with its details; a counter goes back to one below its target. */
export function undo(p: PilotProgram, id: string, day: number): PilotChange {
  if (!inProgram(p, id, day) || !isDone(p, id, day)) return none(p);
  return apply(p, day, (logs, at) => (id === 'strength_log' ? undoSession(logs, at, id) : undoDone(logs, at, id)));
}

export function toggle(p: PilotProgram, id: string, day: number): PilotChange {
  return isDone(p, id, day) ? undo(p, id, day) : complete(p, id, day);
}

/** Get It Done and Stay Connected: one more (reaching the day's number completes it) or one less (a correction). */
export function count(p: PilotProgram, id: string, day: number, by: 1 | -1): PilotChange {
  const target = counterTarget(p, id, day);
  if (!inProgram(p, id, day) || target === null) return none(p);
  return apply(p, day, (logs, at) => (by > 0 ? increment : decrement)(logs, at, id, target));
}

/** Skip today on purpose (Social Confidence: skipping a step is never a failure, but it's not done either). */
export function setSkipped(p: PilotProgram, id: string, day: number, on: boolean): PilotChange {
  if (!inProgram(p, id, day)) return none(p);
  return apply(p, day, (logs, at) => (on ? skip : unskip)(logs, at, id));
}

/** Optional minutes the person notes (null clears them). Never completes or undoes anything. */
export function setMinutes(p: PilotProgram, id: string, day: number, minutes: number | null): PilotChange {
  if (!inProgram(p, id, day)) return none(p);
  return apply(p, day, (logs, at) =>
    recordAmount(logs, at, id, minutes === null ? null : { value: minutes, unit: 'minutes' }),
  );
}

/** Strength: the optional type and length of the day's session (logging it if it wasn't yet). */
export function setSession(
  p: PilotProgram,
  day: number,
  details: { type?: SessionType; minutes?: number },
): PilotChange {
  const id = 'strength_log';
  if (!inProgram(p, id, day)) return none(p);
  return apply(p, day, (logs, at) =>
    isDone(p, id, day) ? editSession(logs, at, id, details) : logSession(logs, at, id, details),
  );
}

/** Less Scrolling's weekly Screen Time check: the person's own daily average this week (self-reported). */
export function setScreenTime(p: PilotProgram, day: number, minutesPerDay: number): PilotProgram {
  if (!p.habits.includes('screen_app_limit')) return p;
  const measures = recordWeekly(p.measures ?? {}, p.startedAt, day, 'screen_app_limit', minutesPerDay);
  return measures === p.measures ? p : { ...p, measures };
}

export function screenTimeFor(p: PilotProgram, day: number): WeeklyMeasure | null {
  return weeklyMeasure(p.measures, 'screen_app_limit', weekOf(p.startedAt, day).week);
}

// --- Progression ---

/** What a change is checked against: the existing eligibility rules and the time the person has. */
export function constraintsFor(p: PilotProgram, id: string, day: number): Constraints {
  return {
    profile: pilotProfile(p.answers),
    availableMinutes: p.answers.minutesPerDay,
    otherMinutes: busiestDayMinutes(
      p.habits.filter((x) => x !== id).map((x) => ({ habitId: x, level: levelOn(p.progression[x], day + 1) })),
    ),
    ...(p.answers.pullMinutes !== undefined ? { pullBaseline: p.answers.pullMinutes } : {}),
  };
}

/** Every habit's offer right now (at most one each), in card order. */
export function offersNow(
  p: PilotProgram,
  today: number,
  yesterdayEditable: boolean,
): { habitId: PilotHabitId; offer: Offer }[] {
  if (today > PROGRAM_DAYS) return [];
  return p.habits.flatMap((id) => {
    if (!RESET_BY_ID[id]) return []; // the person's own habits have no levels to offer
    const offer = progressionOffer({
      state: p.progression[id],
      logs: p.logs,
      ctx: ctxOf(p),
      today,
      yesterdayEditable,
      constraints: constraintsFor(p, id, today),
    });
    return offer ? [{ habitId: id, offer }] : [];
  });
}

/** The offer to show now, if any: one at a time, the first habit (in card order) with one. */
export const currentOffer = (p: PilotProgram, today: number, yesterdayEditable: boolean) =>
  offersNow(p, today, yesterdayEditable)[0] ?? null;

const withState = (p: PilotProgram, id: string, s: ProgressionState): PilotProgram => ({
  ...p,
  progression: { ...p.progression, [id]: s },
});

export const accept = (p: PilotProgram, id: string, offer: Offer, today: number) =>
  withState(p, id, acceptOffer(p.progression[id], offer, today));
export const decline = (p: PilotProgram, id: string, offer: Offer, today: number) =>
  withState(p, id, declineOffer(p.progression[id], offer, today));
export const feedback = (p: PilotProgram, id: string, kind: Feedback['kind'], today: number) =>
  withState(p, id, setFeedback(p.progression[id], kind, today));

export type ManualChange = { program: PilotProgram; level: Level } | { blocked: string };
const manual = (p: PilotProgram, id: string, r: ManualResult): ManualChange =>
  'blocked' in r ? r : { program: withState(p, id, r.state), level: r.level };

/** Make it easier / harder, any time: from tomorrow (daily) or next Monday (weekly). */
export const easier = (p: PilotProgram, id: string, today: number): ManualChange =>
  manual(p, id, makeEasier(p.progression[id], ctxOf(p), today, constraintsFor(p, id, today)));
export const harder = (p: PilotProgram, id: string, today: number): ManualChange =>
  manual(p, id, makeHarder(p.progression[id], ctxOf(p), today, constraintsFor(p, id, today)));

/** A change waiting to start, in words ("Standard Momentum from tomorrow: …"), or null. */
export function pendingText(p: PilotProgram, id: string, today: number): string | null {
  const e = pendingChange(p.progression[id], today);
  if (!e) return null;
  const when = e.fromDay === today + 1 ? 'tomorrow' : `Day ${e.fromDay}`;
  return `${INTENSITY_NAME[e.intensity]} ${PHASE_NAME[e.phase]} from ${when}: ${targetText(p, id, e.fromDay)}`;
}

/** The card's level line: "Standard · Foundation", or "Your habit" for one the person made. */
export const levelLineFor = (p: PilotProgram, id: string, day: number) =>
  p.custom?.[id] ? 'Your habit' : levelLabel(levelFor(p, id, day));

/** "Standard · Foundation", and the phase's position (0–2) for the card's three bars. */
export function levelLabel(l: Level): string {
  return `${INTENSITY_NAME[l.intensity]} · ${PHASE_NAME[l.phase]}`;
}
export const phaseIndex = (l: Level) => PHASES.indexOf(l.phase);

// --- Insights: numbers from the saved days only (rules in SCHWUNG_LIFE_RESET_PROGRAM.md) ---

export type Tally = { done: number; eligible: number };
const share = (t: Tally) => (t.eligible ? t.done / t.eligible : null);
export const consistency = share;

/**
 * A habit's opportunities so far, never inventing a miss:
 * - daily habits: each day from Day 1 to yesterday is one opportunity; today counts only once it's done;
 * - weekly habits: each finished week brings its goal (a closed week's credited completions, up to the goal, are
 *   done); the current week counts only what's already credited, never what's still possible.
 * Before noon yesterday is still editable, but it already counts here (a correction updates it).
 */
export function habitTally(p: PilotProgram, id: string, today: number): Tally {
  const last = Math.min(today, PROGRAM_DAYS);
  return weekSummaries(id, erasOf(p, id), p.logs, ctxOf(p), last).reduce(
    (t, w) => {
      const x = weekTallyOf(p, id, w, today);
      return { done: t.done + x.done, eligible: t.eligible + x.eligible };
    },
    { done: 0, eligible: 0 },
  );
}

/** One habit's opportunities in one program week (habitTally's rules; the weekly trend adds these up). */
export function weekTallyOf(p: PilotProgram, id: string, w: WeekSummary, today: number): Tally {
  const last = Math.min(w.lastDay, today, PROGRAM_DAYS);
  let done = 0;
  let eligible = 0;
  let weekly = false;
  // Within a week, a habit is daily or weekly on a day by its schedule then (mixed habits change between phases);
  // days before it joined the program don't count at all.
  for (let d = w.firstDay; d <= last; d++) {
    if (!activeOn(p, id, d)) continue;
    if (!isDaily(p, id, d)) {
      weekly = true;
      continue;
    }
    const isDoneDay = isDone(p, id, d);
    if (d < today || isDoneDay) eligible++;
    if (isDoneDay) done++;
  }
  if (!weekly || w.goal === 0) return { done, eligible };
  // Credited: eligible days done, at most one a day, up to the goal (extras and non-workdays don't count).
  return { done: done + w.credited, eligible: eligible + (w.closed ? w.goal : w.credited) };
}

/** Every habit's tally together (the overall consistency). */
export function overallTally(p: PilotProgram, today: number): Tally {
  return allHabits(p).reduce(
    (t, id) => {
      const h = habitTally(p, id, today);
      return { done: t.done + h.done, eligible: t.eligible + h.eligible };
    },
    { done: 0, eligible: 0 },
  );
}

/** Every completed habit action on record (each habit once a day at most). */
export function totalCompleted(p: PilotProgram): number {
  const ids = allHabits(p);
  return Object.values(p.logs).reduce((n, l) => n + l.completed.filter((id) => ids.includes(id)).length, 0);
}

/**
 * This calendar week so far: for daily habits, each day up to today is eligible (today included: it's still
 * possible) and done days count; for weekly habits, the week's goal is eligible and its credited days are done.
 */
export function weekTally(p: PilotProgram, today: number): Tally {
  const w = weekOf(p.startedAt, Math.min(today, PROGRAM_DAYS));
  let done = 0;
  let eligible = 0;
  for (const id of allHabits(p)) {
    const days = Array.from({ length: Math.min(today, w.lastDay) - w.firstDay + 1 }, (_, i) => w.firstDay + i).filter(
      (d) => activeOn(p, id, d),
    );
    if (!days.length) continue;
    if (days.every((d) => isDaily(p, id, d))) {
      eligible += days.length;
      done += days.filter((d) => isDone(p, id, d)).length;
    } else {
      const s = weekSummary(id, erasOf(p, id), p.logs, ctxOf(p), w.firstDay, today);
      eligible += s.goal;
      done += s.credited;
    }
  }
  return { done, eligible };
}

/** A habit's recent days, newest last: done, skipped, not done, or rest (a weekly habit's day off). */
export function recentDays(p: PilotProgram, id: string, today: number, n = 14) {
  const out: { day: number; state: 'done' | 'skipped' | 'missed' | 'rest' | 'today' }[] = [];
  for (let d = Math.max(1, today - n + 1); d <= Math.min(today, PROGRAM_DAYS); d++) {
    if (!activeOn(p, id, d)) continue; // before it joined
    const t = trackOf(p, id, d);
    out.push({
      day: d,
      state: isDone(p, id, d)
        ? 'done'
        : t.skipped
          ? 'skipped'
          : d === today
            ? 'today'
            : isDaily(p, id, d)
              ? 'missed'
              : 'rest',
    });
  }
  return out;
}

/** A weekly habit's weeks so far (Strength Training: sessions a week). */
export const habitWeeks = (p: PilotProgram, id: string, today: number): WeekSummary[] =>
  weekSummaries(id, erasOf(p, id), p.logs, ctxOf(p), Math.min(today, PROGRAM_DAYS));

// --- Loading saves ---

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const isObj = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
const strings = (x: unknown) => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string') : []);

function validState(s: unknown, id: string): s is ProgressionState {
  return (
    isObj(s) &&
    s.v === 1 &&
    s.habitId === id &&
    Array.isArray(s.eras) &&
    s.eras.length > 0 &&
    s.eras.every(
      (e) =>
        isObj(e) &&
        INTENSITIES.includes(e.intensity as Intensity) &&
        PHASES.includes(e.phase as Level['phase']) &&
        typeof e.fromDay === 'number' &&
        Number.isInteger(e.fromDay),
    ) &&
    (s.gaps === undefined ||
      (Array.isArray(s.gaps) &&
        s.gaps.every(
          (g) =>
            isObj(g) &&
            Number.isInteger(g.from) &&
            (g.to === undefined || (Number.isInteger(g.to) && (g.to as number) >= (g.from as number))),
        ))) &&
    (s.schedule === undefined ||
      (isObj(s.schedule) &&
        (s.schedule.kind === 'daily' || (s.schedule.kind === 'weekly' && Number.isInteger(s.schedule.days)))))
  );
}

/** A saved program, if it's well formed (damaged day records are repaired or dropped); otherwise null. */
/**
 * A saved program as far as it can be understood, and what couldn't be: the program with every part that's valid
 * (each habit, its targets and history, the day records, reflections, the collection) and, in `lost`, a plain-words
 * list of anything left out. A damaged habit is set aside, never quietly dropped: it's named in `lost`, and its
 * records stay in the logs (the original save is kept whole for recovery by the store). `program` is null only
 * when the program itself can't be read (no valid start date, answers or habits).
 */
export function inspectPilotProgram(x: unknown): { program: PilotProgram | null; lost: string[] } {
  if (!isObj(x) || x.v !== 1 || typeof x.startedAt !== 'string' || !DATE_KEY.test(x.startedAt))
    return { program: null, lost: ['The Life Reset itself (its start date or format)'] };
  const a = x.answers;
  if (
    !isObj(a) ||
    typeof a.age !== 'string' ||
    typeof a.minutesPerDay !== 'number' ||
    !(a.precautions === 'unknown' || Array.isArray(a.precautions))
  )
    return { program: null, lost: ['Your set-up answers'] };
  const lost: string[] = [];
  const custom: Record<string, CustomHabit> = {};
  for (const [id, c] of Object.entries(isObj(x.custom) ? x.custom : {}))
    if (
      isCustomId(id) &&
      isObj(c) &&
      typeof c.name === 'string' &&
      c.name.trim() &&
      typeof c.perWeek === 'number' &&
      Number.isInteger(c.perWeek) &&
      c.perWeek >= 1 &&
      c.perWeek <= 7 &&
      typeof c.scene === 'number' &&
      Number.isInteger(c.scene) &&
      c.scene >= 0
    )
      custom[id] = {
        name: c.name.slice(0, 40),
        ...(typeof c.note === 'string' && c.note ? { note: c.note.slice(0, 80) } : {}),
        perWeek: c.perWeek,
        scene: c.scene,
      };
  const known = (id: string) => isPilotHabit(id) || id in custom;
  const label = (id: string) =>
    id in custom ? custom[id].name : isPilotHabit(id) ? habitName(id) : 'One of your own habits';
  const progressionIn = isObj(x.progression) ? x.progression : {};
  const habits: string[] = [];
  const progression: Record<string, ProgressionState> = {};
  for (const id of strings(x.habits)) {
    const s = progressionIn[id];
    if (known(id) && validState(s, id)) {
      habits.push(id);
      progression[id] = s;
    } else lost.push(`${label(id)}: its targets and progress`);
  }
  // Removed habits keep their state (their past counts); a damaged one is named, not dropped silently.
  for (const [id, s] of Object.entries(progressionIn))
    if (!(id in progression) && !strings(x.habits).includes(id)) {
      if (known(id) && validState(s, id)) progression[id] = s;
      else lost.push(`${label(id)} (a habit you removed): its past progress`);
    }
  for (const id of Object.keys(custom)) if (!(id in progression)) delete custom[id];
  if (!habits.length) return { program: null, lost: lost.length ? lost : ['Your habits'] };
  const logs: Record<string, DayLog> = {};
  let badDays = 0;
  for (const [k, l] of Object.entries(isObj(x.logs) ? x.logs : {})) {
    if (!DATE_KEY.test(k) || !isObj(l) || typeof l.day !== 'number') {
      badDays++;
      continue;
    }
    logs[k] = {
      ...(l as Partial<DayLog>),
      day: l.day,
      date: k,
      completed: strings(l.completed),
      planned: strings(l.planned),
    } as DayLog;
  }
  if (badDays) lost.push(`${badDays} day record${badDays === 1 ? '' : 's'}`);
  const reflections = sanitizeReflections(x.reflections);
  if (isObj(x.reflections) && Object.keys(x.reflections).length > Object.keys(reflections ?? {}).length)
    lost.push('Some weekly reflections');
  const collection = sanitizeCollection(x.collection);
  const program: PilotProgram = {
    v: 1,
    startedAt: x.startedAt,
    answers: a as PilotAnswers,
    habits,
    progression,
    logs,
    ...(isObj(x.measures) ? { measures: x.measures as WeeklyMeasures } : {}),
    ...(Object.keys(custom).length ? { custom } : {}),
    ...(reflections ? { reflections } : {}),
    ...(collection ? { collection } : {}),
    ...(isObj(x.comeback) && Number.isInteger(x.comeback.seen)
      ? { comeback: { seen: x.comeback.seen as number } }
      : {}),
    ...(isObj(x.ceremonies)
      ? {
          ceremonies: {
            ...(x.ceremonies.day1 === true ? { day1: true } : {}),
            ...(x.ceremonies.summit === true ? { summit: true } : {}),
            ...(Array.isArray(x.ceremonies.milestones)
              ? {
                  milestones: (x.ceremonies.milestones as unknown[]).filter(
                    (m): m is number => typeof m === 'number' && (MILESTONE_DAYS as readonly number[]).includes(m),
                  ),
                }
              : {}),
          },
        }
      : {}),
  };
  return { program, lost };
}

/** A saved program only if every part of it could be read (see inspectPilotProgram for the forgiving reading). */
export function sanitizePilotProgram(x: unknown): PilotProgram | null {
  const r = inspectPilotProgram(x);
  return r.lost.length ? null : r.program;
}
