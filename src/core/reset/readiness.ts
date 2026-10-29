import { PHASE_START } from '../progression';
import type { Weekday } from '../dates';
import type { DayLog } from '../types';
import type { Profile } from './profile';
import {
  INTENSITIES,
  PHASES,
  RESET_BY_ID,
  resetExclusion,
  scrollingLimit,
  type Intensity,
  type Phase,
  type Schedule,
} from './habits';
import { dayStatus, observation, type Observation } from './tracking';
import { erasFor, programWeeks, scheduleOn, weekOf, weekSummary, type ScheduleEra, type WeeklyContext } from './weekly';

/*
 * Readiness-based progression for Life Reset programs. Pure.
 *
 * Difficulty only changes when the person chooses: phases say which targets are *available* (Momentum from Day 22,
 * Mastery from Day 45), readiness decides whether one is *offered*, and every change, up or down, is accepted or
 * declined by the person. Thresholds, denominators and rounding: SCHWUNG_LIFE_RESET_PROGRESSION.md.
 */

export const READINESS = {
  /** Daily habits: the most recent eligible opportunities considered. */
  dailyWindow: 14,
  /** Daily habits: recorded opportunities (done, skipped or missed) needed before any recommendation. */
  minRecorded: 7,
  /** Weekly habits: the most recent closed weeks considered, and judged weeks needed. */
  weeklyWindow: 3,
  minJudgedWeeks: 2,
  /** Percentages, compared in whole numbers (no float rounding). */
  offerAt: 80,
  earlyAt: 90,
  easierBelow: 60,
  /** A declined offer (up or down) isn't made again for this many days. */
  declineCooldownDays: 7,
  /** "Too hard" given this recently (and since the current target began) holds back step-up offers. */
  tooHardDays: 14,
} as const;

/** The first day each phase's targets become available. */
export const PHASE_OPENS: Record<Phase, number> = { foundation: 1, momentum: PHASE_START[2], mastery: PHASE_START[3] };

export type Level = { intensity: Intensity; phase: Phase };
export type Era = Level & { fromDay: number; reason: 'start' | 'step-up' | 'step-down' | 'easier' | 'harder' };
export type Feedback = { kind: 'too-easy' | 'too-hard'; day: number };

/**
 * One Life Reset habit's progression, saved with a future Life Reset program. `eras` are in day order; the last may
 * start in the future (an accepted change waiting for its boundary). Existing programs never have one.
 */
export type ProgressionState = {
  v: 1;
  habitId: string;
  eras: Era[];
  /** The person's latest "too easy" or "too hard". */
  feedback?: Feedback;
  /** The last offer the person declined, and when. */
  declined?: { to: Level; day: number };
  /** A habit of the person's own: its schedule (it has no catalog targets, levels or offers). */
  schedule?: Schedule;
  /** Out of the program from `from` (removed), and back from `to` (added again); its days in between don't exist. */
  gaps?: { from: number; to?: number }[];
};

export function newProgression(habitId: string, intensity: Intensity, day: number, phase: Phase = 'foundation') {
  const s: ProgressionState = { v: 1, habitId, eras: [{ intensity, phase, fromDay: day, reason: 'start' }] };
  return s;
}

const sameLevel = (a: Level, b: Level) => a.intensity === b.intensity && a.phase === b.phase;

/** The era in effect on a day (the first one before the habit started). */
function eraOn(s: ProgressionState, day: number): Era {
  let e = s.eras[0];
  for (const x of s.eras) if (x.fromDay <= day) e = x;
  return e;
}

/** The target level in effect on a day. */
export function levelOn(s: ProgressionState, day: number): Level {
  const { intensity, phase } = eraOn(s, day);
  return { intensity, phase };
}

/** An accepted change that hasn't started yet, if any. */
export function pendingChange(s: ProgressionState, today: number): Era | null {
  const last = s.eras[s.eras.length - 1];
  return last.fromDay > today ? last : null;
}

/** The habit's schedule over time, for the weekly scheduling engine. */
export function scheduleEras(s: ProgressionState): ScheduleEra[] {
  const own = s.schedule;
  const base: ScheduleEra[] = own
    ? s.eras.map((e) => ({ fromDay: e.fromDay, schedule: own }))
    : erasFor(
        s.habitId,
        s.eras.map((e) => ({ fromDay: e.fromDay, intensity: e.intensity, phase: e.phase })),
      );
  if (!s.gaps?.length) return base;
  // A gap ends the schedule from its first day; coming back picks up the schedule in effect then. On the same day,
  // these markers come after the eras (a stable sort), so they win.
  const marks: ScheduleEra[] = s.gaps.flatMap((g) => [
    { fromDay: g.from, schedule: null },
    ...(g.to !== undefined ? [{ fromDay: g.to, schedule: scheduleOn(base, g.to) }] : []),
  ]);
  return [...base, ...marks].sort((a, b) => a.fromDay - b.fromDay);
}

/** The next phase within the same intensity (never a higher intensity), or null at Mastery. */
export function nextPhase(l: Level): Level | null {
  const i = PHASES.indexOf(l.phase);
  return i < 2 ? { intensity: l.intensity, phase: PHASES[i + 1] } : null;
}

/** One step easier: the previous phase, or at Foundation the next intensity down; null at Starter Foundation. */
export function easierLevel(l: Level): Level | null {
  const i = PHASES.indexOf(l.phase);
  if (i > 0) return { intensity: l.intensity, phase: PHASES[i - 1] };
  const n = INTENSITIES.indexOf(l.intensity);
  return n > 0 ? { intensity: INTENSITIES[n - 1], phase: 'foundation' } : null;
}

/** One step harder: the next phase, or at Mastery the next intensity's Mastery; null at Challenge Mastery. */
export function harderLevel(l: Level): Level | null {
  const next = nextPhase(l);
  if (next) return next;
  const n = INTENSITIES.indexOf(l.intensity);
  return n < 2 ? { intensity: INTENSITIES[n + 1], phase: 'mastery' } : null;
}

// --- Readiness ---

export type ReadinessOutcome =
  /** At least 80%: ready for the next phase's target when it's available. */
  | 'ready'
  /** At least 90% and the person said "too easy": ready even before the next phase opens. */
  | 'ready-early'
  /** 60–79% (or ready with nothing above): keep the target. */
  | 'maintain'
  /** Under 60% of recorded opportunities: suggest an easier target. */
  | 'struggling'
  /** Too little recorded to say anything: no recommendation either way. */
  | 'insufficient-data';

export type Readiness = {
  basis: 'daily' | 'weekly';
  outcome: ReadinessOutcome;
  /** Opportunities (daily) or weeks (weekly) in the window, unknown ones included. */
  window: number;
  /** Daily: done / skipped / missed / unknown days. Weekly: achieved / – / not achieved / unrecorded weeks. */
  counts: Record<Observation, number>;
};

export type ReadinessInput = {
  state: ProgressionState;
  logs: Record<string, DayLog>;
  ctx: WeeklyContext;
  today: number;
  /** Before noon yesterday can still be edited, so it isn't final yet. */
  yesterdayEditable?: boolean;
};

const atLeast = (part: number, whole: number, percent: number) => whole > 0 && part * 100 >= percent * whole;
const below = (part: number, whole: number, percent: number) => whole > 0 && part * 100 < percent * whole;

/**
 * How ready the current target looks. Only days or weeks since the current target began count (a new target needs
 * new evidence), and only final ones (never today, nor yesterday while it can still be edited).
 */
export function readiness({ state, logs, ctx, today, yesterdayEditable = false }: ReadinessInput): Readiness {
  const lastFinal = today - (yesterdayEditable ? 2 : 1);
  const era = eraOn(state, today);
  const since = era.fromDay;
  const schedule = scheduleOn(scheduleEras(state), today);
  const tooEasy = state.feedback?.kind === 'too-easy' && state.feedback.day >= since;
  const counts: Record<Observation, number> = { done: 0, skipped: 0, missed: 0, unknown: 0 };

  if (schedule?.kind === 'daily') {
    // The latest eligible opportunities: every day of a daily habit, newest first.
    let window = 0;
    for (let d = lastFinal; d >= Math.max(1, since) && window < READINESS.dailyWindow; d--) {
      counts[observation(dayStatus(logs, ctx.startKey, d, state.habitId))]++;
      window++;
    }
    return { basis: 'daily', window, counts, outcome: decide(counts, window, READINESS.minRecorded, tooEasy, true) };
  }

  // Weekly habits: closed weeks that began on or after the current target, with a goal; newest last.
  const eras = scheduleEras(state);
  const weeks = programWeeks(ctx.startKey, ctx.programDays)
    .filter((w) => w.firstDay >= since && w.lastDay <= lastFinal)
    .map((w) => weekSummary(state.habitId, eras, logs, ctx, w.firstDay, today, yesterdayEditable))
    .filter((w) => w.status !== 'no-goal' && w.status !== 'pending')
    .slice(-READINESS.weeklyWindow);
  for (const w of weeks)
    counts[w.status === 'achieved' ? 'done' : w.status === 'not-achieved' ? 'missed' : 'unknown']++;
  return {
    basis: 'weekly',
    window: weeks.length,
    counts,
    outcome: decide(counts, weeks.length, READINESS.minJudgedWeeks, tooEasy, false),
  };
}

/**
 * The rules, shared by daily and weekly habits:
 * - Recorded (done + skipped + missed) under the minimum → insufficient data. Unknown is never success.
 * - Step-up shares use the whole window as denominator, so unrecorded opportunities count as not done: unknown data
 *   can never make a habit look ready, and a skip is never done.
 * - The easier suggestion uses recorded opportunities only, so unknown data can never push a habit down.
 */
function decide(
  c: Record<Observation, number>,
  window: number,
  minRecorded: number,
  tooEasy: boolean,
  daily: boolean,
): ReadinessOutcome {
  const recorded = c.done + c.skipped + c.missed;
  if (recorded < minRecorded) return 'insufficient-data';
  if (atLeast(c.done, window, READINESS.earlyAt) && tooEasy) return 'ready-early';
  if (atLeast(c.done, window, READINESS.offerAt)) return 'ready';
  // Daily: skips are recorded and not done; weekly: judged weeks are achieved + not achieved.
  const judged = daily ? recorded : c.done + c.missed;
  if (below(c.done, judged, READINESS.easierBelow)) return 'struggling';
  return 'maintain';
}

// --- Offers ---

export type Offer = {
  kind: 'step-up' | 'step-down';
  from: Level;
  to: Level;
  /** Offered before the next phase opened (90% and "too easy"). */
  early: boolean;
  /** The day the new target would start. */
  effectiveDay: number;
};

/** What a change is checked against before it's offered or allowed. Anything not given isn't checked. */
export type Constraints = {
  profile?: Profile;
  /** Minutes a day the person said they can give, and what their other habits already take. */
  availableMinutes?: number;
  otherMinutes?: number;
  /** Less Scrolling: the person's own daily minutes on the main app, and what they need. */
  pullBaseline?: number;
  statedNeed?: number;
  workdays?: Weekday[];
};

/**
 * The first day a changed target can start, up or down: tomorrow for daily habits, next Monday for weekly ones. A
 * target never changes partway through a day or a week that has already started.
 */
export function nextBoundary(s: ProgressionState, ctx: WeeklyContext, today: number): number {
  const schedule = scheduleOn(scheduleEras(s), today);
  return schedule?.kind === 'daily' ? today + 1 : weekOf(ctx.startKey, today, ctx.programDays).lastDay + 1;
}

/** Why a level can't be used for this person (null = it can). */
export function checkLevel(habitId: string, from: Level, to: Level, c: Constraints = {}): string | null {
  const h = RESET_BY_ID[habitId];
  if (!h) return 'not a Life Reset habit';
  const target = h.targets[to.intensity][to.phase];
  if (c.profile) {
    const reason = resetExclusion(h, c.profile, to.intensity);
    if (reason) return reason;
  }
  const minutes = target.minutesPerDueDay;
  if (minutes !== null && c.availableMinutes !== undefined && (c.otherMinutes ?? 0) + minutes > c.availableMinutes)
    return 'it doesn’t fit the time you have';
  if (target.schedule.kind === 'workdays' && c.workdays && target.schedule.days > c.workdays.length)
    return 'it needs more workdays than you have';
  if (habitId === 'screen_app_limit' && c.pullBaseline !== undefined) {
    const limit = (l: Level) => {
      const a = h.targets[l.intensity][l.phase].amount;
      return a.kind === 'below-baseline' ? scrollingLimit(c.pullBaseline!, a.reduceBy, c.statedNeed) : 0;
    };
    // A harder limit that can't go any lower for this person (their floor or stated need) isn't a real change.
    const harder =
      INTENSITIES.indexOf(to.intensity) * 3 + PHASES.indexOf(to.phase) >
      INTENSITIES.indexOf(from.intensity) * 3 + PHASES.indexOf(from.phase);
    if (harder && limit(to) >= limit(from)) return 'your limit is already as low as it goes for you';
  }
  return null;
}

/**
 * The offer to show now, if any. A step-up only within the person's chosen intensity, only when ready and the next
 * phase is open (or early with 90% and "too easy"), and only if it fits their constraints. A step-up isn't suggested
 * after a recent "too hard". A step-down is suggested when struggling (never because of feedback alone), from the
 * next boundary. Nothing is offered while an accepted change is waiting, or within the cooldown after a decline.
 */
export function progressionOffer(input: ReadinessInput & { constraints?: Constraints }): Offer | null {
  const { state, today, ctx } = input;
  if (pendingChange(state, today)) return null;
  const r = readiness(input);
  const from = levelOn(state, today);
  const cooling = (to: Level) =>
    !!state.declined && sameLevel(state.declined.to, to) && today < state.declined.day + READINESS.declineCooldownDays;

  if (r.outcome === 'ready' || r.outcome === 'ready-early') {
    // The person recently said it's too hard: no step-up is suggested (and nothing is lowered because of it).
    if (saidTooHard(state, today)) return null;
    const to = nextPhase(from);
    if (!to || cooling(to) || checkLevel(state.habitId, from, to, input.constraints)) return null;
    const open = today >= PHASE_OPENS[to.phase];
    if (!open && r.outcome !== 'ready-early') return null;
    return { kind: 'step-up', from, to, early: !open, effectiveDay: nextBoundary(state, ctx, today) };
  }
  if (r.outcome === 'struggling') {
    const to = easierLevel(from);
    if (!to || cooling(to) || checkLevel(state.habitId, from, to, input.constraints)) return null;
    return { kind: 'step-down', from, to, early: false, effectiveDay: nextBoundary(state, ctx, today) };
  }
  return null;
}

/** "Too hard", said since the current target began and within the last `tooHardDays` days. */
export function saidTooHard(s: ProgressionState, today: number): boolean {
  const f = s.feedback;
  return f?.kind === 'too-hard' && f.day >= eraOn(s, today).fromDay && today - f.day < READINESS.tooHardDays;
}

/** Replaces any change still waiting, then adds this one (or just cancels the waiting one, if it leads back). */
function withEra(s: ProgressionState, era: Era, today: number): ProgressionState {
  const eras = s.eras.filter((e) => e.fromDay <= today && e.fromDay < era.fromDay);
  const back = eras.length > 0 && sameLevel(eras[eras.length - 1], era);
  const out: ProgressionState = { ...s, eras: back ? eras : [...eras, era] };
  delete out.declined;
  return out;
}

/** The person accepts an offer: the new target starts on the offer's day. */
export function acceptOffer(s: ProgressionState, offer: Offer, today: number): ProgressionState {
  return withEra(s, { ...offer.to, fromDay: Math.max(offer.effectiveDay, today), reason: offer.kind }, today);
}

/** The person declines: nothing changes, and the same offer waits out the cooldown. */
export function declineOffer(s: ProgressionState, offer: Offer, today: number): ProgressionState {
  return { ...s, declined: { to: offer.to, day: today } };
}

/** The person says the target feels too easy or too hard (used by readiness from the current target on). */
export function setFeedback(s: ProgressionState, kind: Feedback['kind'], day: number): ProgressionState {
  return { ...s, feedback: { kind, day } };
}

export type ManualResult = { state: ProgressionState; level: Level } | { blocked: string };

/**
 * "Make it easier", any time, without waiting for readiness: one step easier, from the next boundary (tomorrow, or
 * next Monday for a weekly habit). Blocked only at Starter Foundation or by a constraint.
 */
export function makeEasier(s: ProgressionState, ctx: WeeklyContext, today: number, c: Constraints = {}): ManualResult {
  const from = levelOn(s, pendingChange(s, today)?.fromDay ?? today);
  const to = easierLevel(from);
  if (!to) return { blocked: 'this is already the easiest target' };
  const reason = checkLevel(s.habitId, from, to, c);
  if (reason) return { blocked: reason };
  return { state: withEra(s, { ...to, fromDay: nextBoundary(s, ctx, today), reason: 'easier' }, today), level: to };
}

/**
 * "Make it harder", any time (choosing it is the consent, even to a higher intensity at Mastery): one step harder,
 * from the next boundary. Blocked at Challenge Mastery, or by age, safety, time, frequency or the person's baseline.
 */
export function makeHarder(s: ProgressionState, ctx: WeeklyContext, today: number, c: Constraints = {}): ManualResult {
  const from = levelOn(s, pendingChange(s, today)?.fromDay ?? today);
  const to = harderLevel(from);
  if (!to) return { blocked: 'this is already the hardest target' };
  const reason = checkLevel(s.habitId, from, to, c);
  if (reason) return { blocked: reason };
  return { state: withEra(s, { ...to, fromDay: nextBoundary(s, ctx, today), reason: 'harder' }, today), level: to };
}
