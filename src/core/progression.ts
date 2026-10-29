import { dateForDay } from './dates';
import type { DayLog } from './types';

/*
 * Day rules shared by the Life Reset and its Journey: XP, a day that counts (the 80% rule), a full day.
 */

export const XP_PER_HABIT = 10;
export const XP_FULL_DAY_BONUS = 20;
export const XP_PER_LEVEL = 200;
export const STREAK_THRESHOLD = 0.8;
/** The phases' first days (Foundation 1–21, Momentum 22–44, Mastery 45–66). */
export const PHASE_START = { 2: 22, 3: 45 } as const;
export const MILESTONES = [1, 7, 21, 44, 66] as const;

export type Logs = Record<string, DayLog>;

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
