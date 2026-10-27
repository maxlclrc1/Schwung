import { dateForDay, PROGRAM_DAYS } from '../dates';
import { dayQualifies, isFullDay, totalXp } from '../progression';
import type { DayLog } from '../types';
import { isTeen } from '../v2/library';
import type { AgeBand, Precaution, ProfileV2 } from '../v2/types';
import { INTENSITIES, PHASES, RESET_BY_ID, resetExclusion, strengthNotes, type Intensity, type Target } from './habits';
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
import { createTimer, localDayEnd, pause, reset, start, type TimerRun } from './timer';
import {
  confirmDone,
  editSession,
  loadTimer,
  logSession,
  readTrack,
  recordAmount,
  saveTimer,
  undoDone,
  undoSession,
  type At,
  type Change,
  type SessionType,
} from './tracking';
import { countsTowardDay, dayState, scheduleOn, weekSummary, type DayState, type WeeklyContext } from './weekly';

/*
 * The first in-app Life Reset pilot (development and internal-testing builds only; see store/resetPilot.ts): three
 * habits, Read Daily, Focus Time and Strength Training, in a separate 66-day test program with its own save. This
 * module is the pilot's rules, pure: it joins the catalog, weekly scheduling, tracking and readiness engines and adds
 * only what a running program needs. Every pilot-specific rule (day lists, XP, streak, no ceremonies) is documented
 * in SCHWUNG_LIFE_RESET_PILOT.md and tested in resetPilot.test.ts.
 */

export const PILOT_HABITS = ['mind_read', 'focus_deepwork', 'strength_log'] as const;
export type PilotHabitId = (typeof PILOT_HABITS)[number];
export const isPilotHabit = (id: string): id is PilotHabitId => (PILOT_HABITS as readonly string[]).includes(id);

/** "On a day all your habits fall on, about how long can you give them?" (minutes). */
export const PILOT_TIME_OPTIONS = [20, 30, 45, 60, 90, 120] as const;

export type StrengthStart = 'new' | 'sometimes' | 'regular';

/** Only what these three habits need to know. */
export type PilotAnswers = {
  age: AgeBand;
  /** The existing precautions question; skipping it is 'unknown', never "none". */
  precautions: Precaution[] | 'unknown';
  minutesPerDay: number;
  /** Strength Training only: where the person is starting from. */
  strengthStart?: StrengthStart;
  /** Strength Training at Challenge: the sessions a week the person already does (2–7), kept as it is. */
  ownSessions?: number;
  /** Adults: time a 90-minute Focus block as two halves. 16–17 always get blocks of at most 60 minutes. */
  splitFocus?: boolean;
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
};

// --- Setup ---

/**
 * The profile the existing eligibility rules read. Only `age` and `precautions` matter for these three habits; the
 * other fields are neutral values the rules never use for them (they're never shown or saved as answers).
 */
export function pilotProfile(a: Pick<PilotAnswers, 'age' | 'precautions'>): ProfileV2 {
  return {
    age: a.age,
    goal: 'focus',
    sleepHours: '7_8',
    sleepTrouble: 'rarely',
    activeDays: '0',
    produce: '3_4',
    phone: '2_4',
    routines: [],
    precautions: a.precautions,
  };
}

export const habitName = (id: string) => RESET_BY_ID[id]?.name ?? id;
export const INTENSITY_NAME: Record<Intensity, string> = {
  starter: 'Starter',
  standard: 'Standard',
  challenge: 'Challenge',
};
export const PHASE_NAME = { foundation: 'Foundation', momentum: 'Momentum', mastery: 'Mastery' } as const;

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

/** A starting suggestion: Strength from where the person is starting; the others at Standard. Always allowed, if any is. */
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
      : 'standard';
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

/** Minutes a target takes on a day it's done (Read and Focus: the target; Strength: its approximate length). */
export const minutesFor = (habitId: string, l: Level) => targetFor(habitId, l).minutesPerDueDay ?? 0;

/** The checks for starting: one problem per line, or none. */
export function setupProblems(a: PilotAnswers, choices: PilotChoice[]): string[] {
  const out: string[] = [];
  if (a.age === 'u16') return ['Schwung is made for people 16 and older.'];
  if (!choices.length) out.push('Choose at least one habit.');
  const ids = new Set<string>();
  for (const c of choices) {
    if (!isPilotHabit(c.habitId) || ids.has(c.habitId)) {
      out.push('Each habit can be chosen once.');
      continue;
    }
    ids.add(c.habitId);
    const reason = resetExclusion(RESET_BY_ID[c.habitId], pilotProfile(a), c.intensity);
    if (reason) out.push(`${habitName(c.habitId)} at ${INTENSITY_NAME[c.intensity]}: ${reason}.`);
  }
  if (ids.has('strength_log')) {
    if (!a.strengthStart) out.push('Strength Training: say where you’re starting from.');
    const strength = choices.find((c) => c.habitId === 'strength_log');
    const own = a.ownSessions;
    if (strength?.intensity === 'challenge' && !(own !== undefined && Number.isInteger(own) && own >= 2 && own <= 7))
      out.push('Strength Training at Challenge: say how many sessions a week you already do (2–7).');
  }
  if (!PILOT_TIME_OPTIONS.includes(a.minutesPerDay as (typeof PILOT_TIME_OPTIONS)[number]))
    out.push('Say how much time you have on a busy day.');
  else {
    const total = busiestDayMinutes(choices.map((c) => ({ habitId: c.habitId, level: foundation(c.intensity) })));
    if (total > a.minutesPerDay)
      out.push(
        `These take about ${total} min on a day they all fall on, more than the ${a.minutesPerDay} min you have. Choose an easier intensity or fewer habits.`,
      );
  }
  return out;
}

const foundation = (intensity: Intensity): Level => ({ intensity, phase: 'foundation' });

/** The time all the habits take on a day they all fall on (the time check's worst case). */
export function busiestDayMinutes(habits: { habitId: string; level: Level }[]): number {
  return habits.reduce((n, h) => n + minutesFor(h.habitId, h.level), 0);
}

/** A new pilot program, starting today at Foundation for each chosen intensity; null if the setup has a problem. */
export function createPilot(a: PilotAnswers, choices: PilotChoice[], startKey: string): PilotProgram | null {
  if (setupProblems(a, choices).length) return null;
  const answers: PilotAnswers = {
    age: a.age,
    precautions: a.precautions,
    minutesPerDay: a.minutesPerDay,
    ...(choices.some((c) => c.habitId === 'strength_log')
      ? { strengthStart: a.strengthStart, ...(a.ownSessions !== undefined ? { ownSessions: a.ownSessions } : {}) }
      : {}),
    ...(a.splitFocus ? { splitFocus: true } : {}),
  };
  const ordered = PILOT_HABITS.filter((id) => choices.some((c) => c.habitId === id));
  return {
    v: 1,
    startedAt: startKey,
    answers,
    habits: ordered,
    progression: Object.fromEntries(
      ordered.map((id) => [id, newProgression(id, choices.find((c) => c.habitId === id)!.intensity, 1)]),
    ),
    logs: {},
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

/** Whether a habit is due every day (Read Daily) or counted by the week (Focus Time, Strength Training). */
export function isDaily(p: PilotProgram, id: string, day: number): boolean {
  return scheduleOn(scheduleEras(p.progression[id]), day)?.kind === 'daily';
}

/**
 * The day's list for the 80% rule and XP. Daily habits always belong to it; a weekly habit only on a day it's done
 * (it helps the day, and a rest day never pulls a day down). Derived, never chosen.
 */
export function plannedOn(p: PilotProgram, day: number, completed: string[]): string[] {
  return p.habits.filter((id) => {
    const s = scheduleOn(scheduleEras(p.progression[id]), day);
    return s !== null && countsTowardDay(s, completed.includes(id));
  });
}

const logOf = (p: PilotProgram, day: number) => p.logs[dateForDay(p.startedAt, day)];
export const isDone = (p: PilotProgram, id: string, day: number) => !!logOf(p, day)?.completed.includes(id);

/** What the card says: the target, in a few words. */
export function targetText(p: PilotProgram, id: string, day: number): string {
  const l = levelFor(p, id, day);
  const t = targetFor(id, l);
  if (id === 'strength_log') {
    const n = t.amount.kind === 'own' ? (p.answers.ownSessions ?? 2) : t.amount.kind === 'fixed' ? t.amount.value : 0;
    return `${n} session${n === 1 ? '' : 's'} a week${t.aboutMinutes ? `, about ${t.aboutMinutes} min` : ''}`;
  }
  const minutes = t.amount.kind === 'fixed' ? t.amount.value : 0;
  const blocks = timerBlocksFor(p, id, day);
  const time = blocks.length > 1 ? `${blocks.length} × ${blocks[0]} min` : `${minutes} min`;
  return id === 'focus_deepwork' ? `${time}, phone in another room` : `Read ${time}`;
}

/** How often, in words. */
export function frequencyText(p: PilotProgram, id: string, day: number): string {
  const s = targetFor(id, levelFor(p, id, day)).schedule;
  if (s.kind === 'daily') return 'Every day';
  if (s.kind === 'weekly') return `Any ${s.days} days a week`;
  if (s.kind === 'sessions') return 'Any days you choose, one session a day at most';
  return `${s.days} workdays a week`;
}

export type WeekProgress = { credited: number; goal: number; status: string; daysLeft: number };

/** This week's progress for a weekly habit (null for a daily one). Rest days are never misses. */
export function weekProgress(p: PilotProgram, id: string, day: number): WeekProgress | null {
  if (isDaily(p, id, day)) return null;
  const w = weekSummary(id, scheduleEras(p.progression[id]), p.logs, ctxOf(p), day, day);
  return { credited: w.credited, goal: w.goal, status: w.status, daysLeft: w.lastDay - day + 1 };
}

/** What the habit asks of the day: due (daily), open or goal met (weekly), done. */
export const stateOn = (p: PilotProgram, id: string, day: number): DayState =>
  dayState(id, scheduleEras(p.progression[id]), p.logs, ctxOf(p), day);

/** The blocks a timed target is split into (16–17 always within the focus cap). */
export function timerBlocksFor(p: PilotProgram, id: string, day: number): number[] {
  const t = createTimer(id, day, targetFor(id, levelFor(p, id, day)), timerOpts(p));
  return t?.blocks ?? [];
}

const timerOpts = (p: PilotProgram) => ({
  teen: isTeen(pilotProfile(p.answers)),
  split: !!p.answers.splitFocus,
});

/** The day's timer as it stands now (brought up to date; stopped at midnight if that day is over), or null. */
export function timerOn(p: PilotProgram, id: string, day: number, now: number, today: number): TimerRun | null {
  return loadTimer(p.logs, p.startedAt, day, id, now, today);
}

// --- Day rules: XP, streak, a full day ---

/** XP exactly as everywhere else (10 a done habit on the day's list, +20 when the whole list is done). */
export const pilotXp = (p: PilotProgram) => totalXp(p.logs);

/** A full day: something on the day's list, and all of it done. */
export const dayFull = (p: PilotProgram, day: number) => isFullDay(logOf(p, day));

/**
 * The pilot's streak: consecutive days that count by the 80% rule, ending today (an unfinished today doesn't break
 * it). A day with no daily habit and nothing done (only weekly habits, resting) is neutral: it neither counts nor
 * breaks the streak, so weekly habits never turn a rest day into a broken streak.
 */
export function pilotStreak(p: PilotProgram, today: number): number {
  let streak = 0;
  for (let d = today; d >= 1; d--) {
    const log = logOf(p, d);
    const dailyDue = p.habits.some((id) => isDaily(p, id, d));
    const planned = log ? plannedOn(p, d, log.completed) : dailyDue ? ['due'] : [];
    if (planned.length === 0) continue; // a rest day: neutral
    if (log && dayQualifies({ ...log, planned })) streak++;
    else if (d !== today) break;
  }
  return streak;
}

// --- Changes. Each returns the new program and the tracking event (at most one, only when completion changes). ---

export type PilotChange = { program: PilotProgram; event: Change['event'] };

const atFor = (p: PilotProgram, day: number): At => ({
  startKey: p.startedAt,
  day,
  planned: plannedOn(p, day, logOf(p, day)?.completed ?? []),
});

/** Applies a tracking change and re-derives that day's list from what's done (pilot days are never hand-planned). */
function apply(p: PilotProgram, day: number, f: (logs: PilotProgram['logs'], at: At) => Change): PilotChange {
  const r = f(p.logs, atFor(p, day));
  if (r.logs === p.logs) return { program: p, event: null };
  const key = dateForDay(p.startedAt, day);
  const log = r.logs[key];
  const logs = log ? { ...r.logs, [key]: { ...log, planned: plannedOn(p, day, log.completed) } } : r.logs;
  return { program: { ...p, logs }, event: r.event };
}

const inProgram = (p: PilotProgram, id: string, day: number) =>
  p.habits.includes(id as PilotHabitId) && day >= 1 && day <= PROGRAM_DAYS;

/** The swipe, the check button or a timer's confirmation: done. Idempotent (no second XP, ever). */
export function complete(p: PilotProgram, id: string, day: number): PilotChange {
  if (!inProgram(p, id, day)) return { program: p, event: null };
  return apply(p, day, (logs, at) => (id === 'strength_log' ? logSession(logs, at, id) : confirmDone(logs, at, id)));
}

/** Undo. A strength session is removed with its details; a timer's minutes and an entered amount stay. */
export function undo(p: PilotProgram, id: string, day: number): PilotChange {
  if (!inProgram(p, id, day) || !isDone(p, id, day)) return { program: p, event: null };
  return apply(p, day, (logs, at) => (id === 'strength_log' ? undoSession(logs, at, id) : undoDone(logs, at, id)));
}

export function toggle(p: PilotProgram, id: string, day: number): PilotChange {
  return isDone(p, id, day) ? undo(p, id, day) : complete(p, id, day);
}

/** Starts or resumes the day's timer (creating it with the day's local midnight as its end). Never completes. */
export function startTimer(p: PilotProgram, id: string, day: number, now: number): PilotChange {
  if (!inProgram(p, id, day)) return { program: p, event: null };
  const t =
    timerOn(p, id, day, now, day) ??
    createTimer(id, day, targetFor(id, levelFor(p, id, day)), { ...timerOpts(p), dayEndsAt: localDayEnd(now) });
  if (!t) return { program: p, event: null };
  return apply(p, day, (logs, at) => saveTimer(logs, at, start(t, now, day), now));
}

export function pauseTimer(p: PilotProgram, id: string, day: number, now: number): PilotChange {
  const t = timerOn(p, id, day, now, day);
  if (!t) return { program: p, event: null };
  return apply(p, day, (logs, at) => saveTimer(logs, at, pause(t, now, day), now));
}

/** Back to zero (the minutes it had counted go too; an entered amount stays). */
export function resetTimer(p: PilotProgram, id: string, day: number, now: number): PilotChange {
  const t = timerOn(p, id, day, now, day);
  if (!t) return { program: p, event: null };
  return apply(p, day, (logs, at) => saveTimer(logs, at, reset(t), now));
}

/** Saves the day's timer as it now stands (a ready or day-ended state is kept for the person to see). */
export function settleTimer(p: PilotProgram, id: string, day: number, now: number, today: number): PilotChange {
  const t = timerOn(p, id, day, now, today);
  const saved = readTrack(logOf(p, day), id).timer;
  if (!t || !saved || t.status === saved.status) return { program: p, event: null };
  return apply(p, day, (logs, at) => saveTimer(logs, at, t, now));
}

/** Minutes the person adds later (null clears them). Never completes or undoes anything. */
export function setMinutes(p: PilotProgram, id: string, day: number, minutes: number | null): PilotChange {
  if (!inProgram(p, id, day)) return { program: p, event: null };
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
  if (!inProgram(p, id, day)) return { program: p, event: null };
  return apply(p, day, (logs, at) =>
    isDone(p, id, day) ? editSession(logs, at, id, details) : logSession(logs, at, id, details),
  );
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

/** A change waiting to start, in words ("Momentum from tomorrow"), or null. */
export function pendingText(p: PilotProgram, id: string, today: number): string | null {
  const e = pendingChange(p.progression[id], today);
  if (!e) return null;
  const when = e.fromDay === today + 1 ? 'tomorrow' : `Day ${e.fromDay}`;
  return `${INTENSITY_NAME[e.intensity]} ${PHASE_NAME[e.phase]} from ${when}: ${targetText(p, id, e.fromDay)}`;
}

/** "Standard · Foundation", and the level's position (0–8) for the card's three bars. */
export function levelLabel(l: Level): string {
  return `${INTENSITY_NAME[l.intensity]} · ${PHASE_NAME[l.phase]}`;
}
export const phaseIndex = (l: Level) => PHASES.indexOf(l.phase);

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
    )
  );
}

/** A saved pilot program, if it's well formed (damaged day records are repaired or dropped); otherwise null. */
export function sanitizePilotProgram(x: unknown): PilotProgram | null {
  if (!isObj(x) || x.v !== 1 || typeof x.startedAt !== 'string' || !DATE_KEY.test(x.startedAt)) return null;
  const a = x.answers;
  if (!isObj(a) || typeof a.age !== 'string' || typeof a.minutesPerDay !== 'number') return null;
  if (!(a.precautions === 'unknown' || Array.isArray(a.precautions))) return null;
  const habits = strings(x.habits).filter(isPilotHabit);
  if (!habits.length || !isObj(x.progression)) return null;
  const progression: Record<string, ProgressionState> = {};
  for (const id of habits) {
    const s = x.progression[id];
    if (!validState(s, id)) return null;
    progression[id] = s;
  }
  const logs: Record<string, DayLog> = {};
  for (const [k, l] of Object.entries(isObj(x.logs) ? x.logs : {})) {
    if (!DATE_KEY.test(k) || !isObj(l) || typeof l.day !== 'number') continue;
    logs[k] = {
      ...(l as Partial<DayLog>),
      day: l.day,
      date: k,
      completed: strings(l.completed),
      planned: strings(l.planned),
    } as DayLog;
  }
  return { v: 1, startedAt: x.startedAt, answers: a as PilotAnswers, habits, progression, logs };
}
