import { dateForDay } from './dates';
import type { DayLog } from './types';

/*
 * Day rules shared by the Life Reset and its Journey: XP, a day that counts (80% of its habits, rounded down, at least
 * one: docs/FAIRER_DAY_COUNTING.md), a full day.
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

/**
 * How many of a day's `n` habits must be done for it to count: 80% rounded down, at least one (1 of 1, 1 of 2, 2 of 3,
 * 3 of 4, 4 of 5, 4 of 6). It never asks more than the earlier rule (80% rounded up), so no day that counted stops
 * counting. None for an empty list.
 */
export function dayNeed(n: number): number {
  // Small epsilon so 0.8 × 5 = 4 despite float error.
  return n > 0 ? Math.max(1, Math.floor(n * STREAK_THRESHOLD + 1e-9)) : Infinity;
}

/** Whether `done` of `n` habits make a day count (`dayNeed`). */
export const meetsDay = (done: number, n: number) => n > 0 && done >= dayNeed(n);

export function dayQualifies(log: DayLog | undefined): boolean {
  return !!log && meetsDay(doneCount(log), log.planned.length);
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
