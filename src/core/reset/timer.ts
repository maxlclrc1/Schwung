import { TEEN_FOCUS_MAX_MIN } from '../v2/library';
import { RESET_BY_ID, type Target } from './habits';

/*
 * The optional timer for Life Reset habits (Focus Time, Read Daily, Daily Movement, Tidy Up, Practice a Skill).
 * Pure: every function takes the current time (`now`, epoch ms) and returns a new state, so a timer is just data that
 * can be saved and restored. Time is never counted by ticking: it comes from saved timestamps, so leaving the screen,
 * switching tabs, backgrounding or restarting the app neither loses time nor drifts.
 *
 * - Active time is what the timer counted while running; wall-clock time is from the first start to now (pauses
 *   included). Only active time counts toward the target.
 * - A running timer keeps counting while the app is in the background or closed: the person is meant to be away
 *   (phone in another room). When the app reopens on the same program day, the time is simply there.
 * - If the app reopens on a later program day, the timer has expired: the stretch that was still running is not
 *   counted (nobody can know when it really stopped), and nothing completes. Time banked by earlier pauses stays as
 *   that day's partial progress.
 * - If the device clock goes backwards, a negative stretch counts as zero.
 * Edge cases and their reasons: SCHWUNG_LIFE_RESET_TRACKING.md.
 */

export type TimerStatus = 'idle' | 'running' | 'paused' | 'between-blocks' | 'finished' | 'expired';

export type TimerRun = {
  v: 1;
  habitId: string;
  /** The program day it was started for. */
  day: number;
  /** Minutes of each block, in order (one block unless split). */
  blocks: number[];
  /** The block being timed. */
  block: number;
  status: TimerStatus;
  /** Active milliseconds banked in the current block (not counting a running stretch). */
  bankedMs: number;
  /** Active milliseconds of the blocks already finished. */
  finishedMs: number;
  /** When the current running stretch began. */
  runStartedAt?: number;
  /** When the timer was first started (for wall-clock time). */
  firstStartedAt?: number;
};

const MIN = 60_000;

/** Habits that have a timer: only those whose completion offers one in the catalog. */
export function hasTimer(habitId: string): boolean {
  return !!RESET_BY_ID[habitId]?.completion.timer;
}

/**
 * The blocks for a timed target: one block, or equal blocks when the target asks for a split. 16–17 always get the
 * split when a block would pass the focus cap (90 min → 2 × 45); adults only when they choose it.
 */
export function timerBlocks(target: Target, opts: { teen?: boolean; split?: boolean } = {}): number[] {
  const minutes = target.amount.kind === 'fixed' ? target.amount.value : 0;
  const required = !!opts.teen && minutes > TEEN_FOCUS_MAX_MIN;
  const chosen = !!opts.split && (target.blocks ?? 1) > 1;
  if (!required && !chosen) return [minutes];
  const n = Math.max(target.blocks ?? 2, Math.ceil(minutes / TEEN_FOCUS_MAX_MIN));
  return Array.from({ length: n }, () => minutes / n);
}

/** A new timer for a habit's target, or null when the habit has no timer. */
export function createTimer(
  habitId: string,
  day: number,
  target: Target,
  opts: { teen?: boolean; split?: boolean } = {},
): TimerRun | null {
  if (!hasTimer(habitId) || target.unit !== 'minutes') return null;
  return {
    v: 1,
    habitId,
    day,
    blocks: timerBlocks(target, opts),
    block: 0,
    status: 'idle',
    bankedMs: 0,
    finishedMs: 0,
  };
}

const stretch = (t: TimerRun, now: number) =>
  t.status === 'running' && t.runStartedAt !== undefined ? Math.max(0, now - t.runStartedAt) : 0;
const blockMs = (t: TimerRun) => (t.blocks[t.block] ?? 0) * MIN;
const totalMs = (t: TimerRun) => t.blocks.reduce((a, b) => a + b, 0) * MIN;

/** Active milliseconds counted so far (never more than the target). */
export function activeMs(t: TimerRun, now: number): number {
  return Math.min(totalMs(t), t.finishedMs + Math.min(blockMs(t), t.bankedMs + stretch(t, now)));
}

/** Wall-clock milliseconds since the first start (pauses included); 0 before it starts. */
export function wallClockMs(t: TimerRun, now: number): number {
  return t.firstStartedAt === undefined ? 0 : Math.max(0, now - t.firstStartedAt);
}

/** Progress toward the whole target, 0..1. */
export function progress(t: TimerRun, now: number): number {
  const total = totalMs(t);
  return total ? activeMs(t, now) / total : 0;
}

/** Remaining milliseconds in the current block. */
export function remainingInBlockMs(t: TimerRun, now: number): number {
  return Math.max(0, blockMs(t) - (t.bankedMs + stretch(t, now)));
}

/**
 * Brings a timer up to date at `now` on program day `today`: a block that has run its length finishes (the next
 * block waits to be started), the last one finishes the timer, and a timer from an earlier day expires.
 */
export function settle(t: TimerRun, now: number, today: number): TimerRun {
  if (t.status === 'finished' || t.status === 'expired') return t;
  if (today !== t.day) {
    // The open stretch can't be placed in time, so it isn't counted; banked time stays as partial progress.
    return { ...t, status: 'expired', runStartedAt: undefined };
  }
  if (t.status !== 'running') return t;
  if (t.bankedMs + stretch(t, now) < blockMs(t)) return t;
  const finishedMs = t.finishedMs + blockMs(t);
  if (t.block + 1 >= t.blocks.length)
    return { ...t, status: 'finished', finishedMs, bankedMs: 0, runStartedAt: undefined };
  return { ...t, status: 'between-blocks', block: t.block + 1, finishedMs, bankedMs: 0, runStartedAt: undefined };
}

/** Starts (or resumes, or starts the next block). Anything else is left as it is. */
export function start(t: TimerRun, now: number, today: number): TimerRun {
  const s = settle(t, now, today);
  if (s.status !== 'idle' && s.status !== 'paused' && s.status !== 'between-blocks') return s;
  return { ...s, status: 'running', runStartedAt: now, firstStartedAt: s.firstStartedAt ?? now };
}

export const resume = start;

/** Pauses a running timer, banking its time. */
export function pause(t: TimerRun, now: number, today: number): TimerRun {
  const s = settle(t, now, today);
  if (s.status !== 'running') return s;
  return {
    ...s,
    status: 'paused',
    bankedMs: Math.min(blockMs(s), s.bankedMs + stretch(s, now)),
    runStartedAt: undefined,
  };
}

/** Back to the start of the whole target (a finished or expired timer too). */
export function reset(t: TimerRun): TimerRun {
  return {
    v: 1,
    habitId: t.habitId,
    day: t.day,
    blocks: t.blocks,
    block: 0,
    status: 'idle',
    bankedMs: 0,
    finishedMs: 0,
  };
}

/** Whole minutes of active time (for recording). */
export const activeMinutes = (t: TimerRun, now: number) => Math.floor(activeMs(t, now) / MIN);
