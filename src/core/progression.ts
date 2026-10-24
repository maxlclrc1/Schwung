import { isCustom, levelDown, levelUp } from './habits';
import { dateForDay, PROGRAM_DAYS } from './dates';
import { wasDueOn } from './schedule';
import type { DayLog, Level, PlanHabit } from './types';

export const XP_PER_HABIT = 10;
export const XP_FULL_DAY_BONUS = 20;
export const XP_PER_LEVEL = 200;
export const STREAK_THRESHOLD = 0.8;
export const LEVEL_UP_RUN = 7;
export const STEP_DOWN_MISSES = 3;
export const PHASE_START = { 2: 22, 3: 45 } as const;
export const MILESTONES = [1, 7, 21, 44, 66] as const;
/**
 * Habits whose level rises only when the person accepts an early level-up offer, never at Day 22 or Day 45,
 * whether they're scheduled or daily (owner decision for strength and balance). None is active yet.
 */
export const ACCEPT_ONLY_LEVEL_UPS: ReadonlySet<string> = new Set([
  'move_strength_prep',
  'move_strength_gentle',
  'move_strength_session',
  'move_balance',
  'move_seated',
]);

export type Logs = Record<string, DayLog>;

export function phaseOf(day: number): 1 | 2 | 3 {
  if (day >= PHASE_START[3]) return 3;
  if (day >= PHASE_START[2]) return 2;
  return 1;
}

export function phaseLevel(phase: 1 | 2 | 3): Level {
  return phase === 1 ? 'easy' : phase === 2 ? 'medium' : 'hard';
}

export function logForDay(logs: Logs, startKey: string, day: number): DayLog | undefined {
  return logs[dateForDay(startKey, day)];
}

export function doneCount(log: DayLog): number {
  return log.completed.filter((id) => log.planned.includes(id)).length;
}

export function dayRatio(log: DayLog | undefined): number {
  if (!log || log.planned.length === 0) return 0;
  return doneCount(log) / log.planned.length;
}

export function isFullDay(log: DayLog | undefined): boolean {
  return !!log && log.planned.length > 0 && doneCount(log) === log.planned.length;
}

export function dayQualifies(log: DayLog | undefined): boolean {
  // Small epsilon so 4/5 = 0.8 counts despite float error.
  return dayRatio(log) >= STREAK_THRESHOLD - 1e-9;
}

export function xpForLog(log: DayLog): number {
  return doneCount(log) * XP_PER_HABIT + (isFullDay(log) ? XP_FULL_DAY_BONUS : 0);
}

export function totalXp(logs: Logs): number {
  return Object.values(logs).reduce((sum, l) => sum + xpForLog(l), 0);
}

export function playerLevel(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

/** 0..1 progress towards the next player level. */
export function levelProgress(xp: number): number {
  return (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
}

/**
 * Consecutive qualifying days ending today. An unfinished today doesn't break the
 * streak; it just isn't counted yet.
 */
export function currentStreak(logs: Logs, startKey: string, today: number): number {
  let streak = dayQualifies(logForDay(logs, startKey, today)) ? 1 : 0;
  for (let d = today - 1; d >= 1; d--) {
    if (!dayQualifies(logForDay(logs, startKey, d))) break;
    streak++;
  }
  return streak;
}

export function bestStreak(logs: Logs, startKey: string, today: number): number {
  let best = 0;
  let run = 0;
  for (let d = 1; d <= today; d++) {
    run = dayQualifies(logForDay(logs, startKey, d)) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

export function daysCompleted(logs: Logs, startKey: string, today: number): number {
  let n = 0;
  for (let d = 1; d <= Math.min(today, PROGRAM_DAYS); d++) {
    if (dayQualifies(logForDay(logs, startKey, d))) n++;
  }
  return n;
}

function completedOn(logs: Logs, startKey: string, habitId: string, day: number): boolean {
  return logForDay(logs, startKey, day)?.completed.includes(habitId) ?? false;
}

/**
 * Consecutive completions of one habit ending today (or yesterday if today isn't done yet). For a scheduled
 * habit only its due days count: rest days are skipped, so this is consecutive *sessions*.
 */
export function completionRun(h: PlanHabit, logs: Logs, startKey: string, today: number): number {
  let d = completedOn(logs, startKey, h.habitId, today) ? today : today - 1;
  let run = 0;
  for (; d > h.levelSince && d >= h.addedOnDay && d >= 1; d--) {
    if (!wasDueOn(h, logs, startKey, d)) continue;
    if (!completedOn(logs, startKey, h.habitId, d)) break;
    run++;
  }
  return run;
}

/**
 * The day a habit is next planned to rise by phase (Day 22 or Day 45), or null when it won't rise automatically
 * from here: custom habits, habits at Mastery, exercise and scheduled habits that only rise when an offer is
 * accepted, and habits added on or after the phase's first day. The same rules as `reconcile`; a plan, not a promise
 * (an earlier offer or a step-down can change the level before then).
 */
export function nextPhaseRise(h: PlanHabit, appliedPhase: number): number | null {
  if (isCustom(h) || h.level === 'hard' || ACCEPT_ONLY_LEVEL_UPS.has(h.habitId)) return null;
  if (h.schedule && h.schedule.phaseLevelUps !== true) return null;
  for (const phase of [2, 3] as const) {
    if (phase > appliedPhase && h.addedOnDay < PHASE_START[phase]) return PHASE_START[phase];
  }
  return null;
}

/** Habits that have earned an early "Level up now?" offer. */
export function levelUpOffers(plan: PlanHabit[], logs: Logs, startKey: string, today: number): string[] {
  return plan
    .filter((h) => !isCustom(h) && h.level !== 'hard')
    .filter((h) => completionRun(h, logs, startKey, today) >= LEVEL_UP_RUN)
    .map((h) => h.habitId);
}

export type ReconcileInput = {
  plan: PlanHabit[];
  appliedPhase: number;
  startKey: string;
  logs: Logs;
  today: number;
  /** Before noon, yesterday can still be fixed, so it doesn't count as missed yet. */
  yesterdayEditable: boolean;
};

export type ReconcileEvent =
  { kind: 'phaseUp'; phase: 2 | 3; day: number } | { kind: 'stepDown'; habitIds: string[]; day: number };

export type ReconcileResult = {
  plan: PlanHabit[];
  appliedPhase: number;
  events: ReconcileEvent[];
};

/**
 * Brings levels up to date with the calendar. Safe to call any number of times:
 * it only acts on things that haven't been applied yet. Handles the app being
 * closed for days — however long the gap, a habit drops at most one level.
 */
export function reconcile(input: ReconcileInput): ReconcileResult {
  const { startKey, logs, today } = input;
  let appliedPhase = input.appliedPhase;
  const events: ReconcileEvent[] = [];
  let plan = input.plan.map((h) => ({ ...h }));

  const target = phaseOf(today);
  while (appliedPhase < target) {
    appliedPhase++;
    const phase = appliedPhase as 2 | 3;
    const start = PHASE_START[phase];
    plan = plan.map((h) =>
      // Strength and balance never rise with the phase (owner decision); a scheduled habit only does when that
      // was explicitly approved for it.
      isCustom(h) ||
      h.addedOnDay >= start ||
      ACCEPT_ONLY_LEVEL_UPS.has(h.habitId) ||
      (h.schedule && h.schedule.phaseLevelUps !== true)
        ? h
        : { ...h, level: levelUp(h.level), levelSince: Math.max(h.levelSince, start - 1) },
    );
    events.push({ kind: 'phaseUp', phase, day: start });
  }

  const lastFinal = input.yesterdayEditable ? today - 2 : today - 1;
  const steppedDown: string[] = [];
  plan = plan.map((h) => {
    if (isCustom(h) || h.level === 'easy') return h;
    let misses = 0;
    for (let d = lastFinal; d > h.levelSince && d >= h.addedOnDay && d >= 1; d--) {
      if (!wasDueOn(h, logs, startKey, d)) continue; // a rest day is never a miss
      if (completedOn(logs, startKey, h.habitId, d)) break;
      misses++;
    }
    if (misses < STEP_DOWN_MISSES) return h;
    steppedDown.push(h.habitId);
    return { ...h, level: levelDown(h.level), levelSince: lastFinal };
  });
  // One kind message for all of them, never a pile of separate ones.
  if (steppedDown.length) events.push({ kind: 'stepDown', habitIds: steppedDown, day: today });

  return { plan, appliedPhase, events };
}

/**
 * The ceremony to show now, if any. Day 1 plays as soon as the program starts. Milestones 7, 21 and 44
 * play once that day is fully done. The finale (day 66) plays once that day is a successful day by the
 * streak rule (`dayQualifies`, 80%+ of that day's planned habits), so the last day doesn't demand
 * perfection. Any milestone missed on its day plays on a later open; only the latest unseen one is returned.
 */
export function pendingCeremony(
  seen: number[],
  today: number,
  todayFull: boolean,
  todayQualifies: boolean = todayFull,
): number | null {
  let pending: number | null = null;
  for (const m of MILESTONES) {
    if (seen.includes(m)) continue;
    const doneEnough = m === PROGRAM_DAYS ? todayQualifies : todayFull;
    if (m === 1 ? today >= 1 : m < today || (m === today && doneEnough)) pending = m;
  }
  return pending;
}
