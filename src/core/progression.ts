import { isCustom, levelDown, levelUp } from './habits';
import { dateForDay, PROGRAM_DAYS } from './dates';
import type { DayLog, Level, PlanHabit } from './types';

export const XP_PER_HABIT = 10;
export const XP_FULL_DAY_BONUS = 20;
export const XP_PER_LEVEL = 200;
export const STREAK_THRESHOLD = 0.8;
export const LEVEL_UP_RUN = 7;
export const STEP_DOWN_MISSES = 3;
export const PHASE_START = { 2: 22, 3: 45 } as const;
export const MILESTONES = [1, 7, 21, 44, 66] as const;

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

function doneCount(log: DayLog): number {
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

/** Consecutive completions of one habit ending today (or yesterday if today isn't done yet). */
export function completionRun(h: PlanHabit, logs: Logs, startKey: string, today: number): number {
  let d = completedOn(logs, startKey, h.habitId, today) ? today : today - 1;
  let run = 0;
  for (; d > h.levelSince && d >= h.addedOnDay && d >= 1; d--) {
    if (!completedOn(logs, startKey, h.habitId, d)) break;
    run++;
  }
  return run;
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
      isCustom(h) || h.addedOnDay >= start
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
 * The ceremony to show now, if any. Milestone N plays once day N is fully done,
 * or on any later open if it was missed. Day 1 plays as soon as the program starts.
 */
export function pendingCeremony(seen: number[], today: number, todayFull: boolean): number | null {
  let pending: number | null = null;
  for (const m of MILESTONES) {
    if (seen.includes(m)) continue;
    if (m === 1 ? today >= 1 : m < today || (m === today && todayFull)) pending = m;
  }
  return pending;
}
