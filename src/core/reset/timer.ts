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
 * - A running timer keeps counting while the app is in the background or closed: the person may well have put the
 *   phone away on purpose.
 * - Reaching the target makes the timer **ready to confirm**. A timer never completes a habit by itself: running it
 *   doesn't prove the habit was done (especially Daily Movement), so the person confirms with one tap or a swipe.
 * - The day ends at the program's local midnight, fixed when the timer is created (`dayEndsAt`), so a later
 *   time-zone change can't move it. Time up to midnight is credited to that day, the session stops there ("day
 *   ended") and nothing carries into the next day.
 * - A ready timer left unconfirmed for longer than its habit's grace period is flagged (`needsCheck`), so a future
 *   UI asks rather than assumes. Valid time is never thrown away for being in the background.
 * - If the device clock goes backwards, a negative stretch counts as zero.
 * Edge cases and their reasons: SCHWUNG_LIFE_RESET_TRACKING.md.
 */

export type TimerStatus =
  | 'idle'
  | 'running'
  | 'paused'
  | 'between-blocks'
  /** The target was reached: waiting for the person to confirm (never completed automatically). */
  | 'ready'
  /** The program day ended (local midnight) before the target was confirmed: time up to midnight is kept. */
  | 'day-ended';

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
  /** The local midnight that ends the timer's day (epoch ms), fixed when it was created. */
  dayEndsAt?: number;
  /** When the target was reached (epoch ms). */
  readyAt?: number;
};

const MIN = 60_000;

/**
 * How long a ready timer may wait for confirmation before it's flagged for a check (minutes), per habit; adjustable.
 * Shorter where the timer proves least (movement), longer where people often leave the phone for a long stretch.
 */
export const TIMER_GRACE_MIN: Record<string, number> = {
  focus_deepwork: 120,
  mind_read: 120,
  skill_practice: 120,
  home_tidy: 60,
  move_walk: 30,
};
export const DEFAULT_TIMER_GRACE_MIN = 60;

/** Habits that have a timer: only those whose completion offers one in the catalog. */
export function hasTimer(habitId: string): boolean {
  return !!RESET_BY_ID[habitId]?.completion.timer;
}

/** The epoch ms of the next local midnight after `now`, in the device's time zone at that moment. */
export function localDayEnd(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
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

/**
 * A new timer for a habit's target, or null when the habit has no timer. `dayEndsAt` is the local midnight ending
 * that program day (`localDayEnd(now)` when it's created).
 */
export function createTimer(
  habitId: string,
  day: number,
  target: Target,
  opts: { teen?: boolean; split?: boolean; dayEndsAt?: number } = {},
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
    ...(opts.dayEndsAt !== undefined ? { dayEndsAt: opts.dayEndsAt } : {}),
  };
}

/** Time after midnight never counts for the day the timer belongs to. */
const until = (t: TimerRun, now: number) => (t.dayEndsAt === undefined ? now : Math.min(now, t.dayEndsAt));
const stretch = (t: TimerRun, now: number) =>
  t.status === 'running' && t.runStartedAt !== undefined ? Math.max(0, until(t, now) - t.runStartedAt) : 0;
const blockMs = (t: TimerRun) => (t.blocks[t.block] ?? 0) * MIN;
const totalMs = (t: TimerRun) => t.blocks.reduce((a, b) => a + b, 0) * MIN;

/** Active milliseconds counted so far (never more than the target, never past the day's midnight). */
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
  return t.status === 'ready' ? 0 : Math.max(0, blockMs(t) - (t.bankedMs + stretch(t, now)));
}

const dayOver = (t: TimerRun, now: number, today: number) =>
  t.dayEndsAt !== undefined ? now >= t.dayEndsAt : today !== t.day;

/**
 * Brings a timer up to date at `now` on program day `today`. A block that has run its length finishes (the next
 * block waits to be started) and the last one makes the timer ready to confirm, as of the moment it got there. A day
 * that has ended stops the timer at midnight, keeping the time up to then.
 */
export function settle(t: TimerRun, now: number, today: number): TimerRun {
  if (t.status === 'ready' || t.status === 'day-ended') return t;
  let s = t;
  // Without a known midnight (a timer saved before it was recorded), a stretch reopened on a later day can't be
  // placed in time, so it isn't credited at all.
  const placeable = s.dayEndsAt !== undefined || today === s.day;
  if (placeable && s.status === 'running' && s.runStartedAt !== undefined) {
    const reachedAt = s.runStartedAt + (blockMs(s) - s.bankedMs);
    if (reachedAt <= until(s, now)) {
      const finishedMs = s.finishedMs + blockMs(s);
      const done = { finishedMs, bankedMs: 0, runStartedAt: undefined };
      if (s.block + 1 >= s.blocks.length) return { ...s, ...done, status: 'ready', readyAt: reachedAt };
      s = { ...s, ...done, status: 'between-blocks', block: s.block + 1 };
    }
  }
  if (!dayOver(s, now, today)) return s;
  // The day is over: credit a running stretch up to midnight (when known), then stop there.
  const banked =
    s.status === 'running' && s.dayEndsAt !== undefined
      ? Math.min(blockMs(s), s.bankedMs + stretch(s, now))
      : s.bankedMs;
  return { ...s, status: 'day-ended', bankedMs: banked, runStartedAt: undefined };
}

/** Starts (or resumes, or starts the next block). A ready or ended timer is left as it is. */
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

/** Back to the start of the whole target (a ready or ended timer too), on the same day. */
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
    ...(t.dayEndsAt !== undefined ? { dayEndsAt: t.dayEndsAt } : {}),
  };
}

/**
 * A ready timer that has waited unconfirmed longer than its habit's grace period: a future UI should ask whether the
 * habit was really done, rather than assume it. Nothing is completed or discarded either way.
 */
export function needsCheck(t: TimerRun, now: number, graceMin: Record<string, number> = TIMER_GRACE_MIN): boolean {
  if (t.status !== 'ready' || t.readyAt === undefined) return false;
  return now - t.readyAt > (graceMin[t.habitId] ?? DEFAULT_TIMER_GRACE_MIN) * MIN;
}

/** Whole minutes of active time (for recording). */
export const activeMinutes = (t: TimerRun, now: number) => Math.floor(activeMs(t, now) / MIN);
