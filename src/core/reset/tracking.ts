import { dateForDay } from '../dates';
import type { DayLog } from '../types';
import { activeMinutes, settle, type TimerRun } from './timer';

/*
 * Tracking records for Life Reset habits: how a day's habit was done (a swipe, a timer, a counter, a strength
 * session), partial progress, explicit skips, corrections and undo. Pure and not used by the app yet.
 *
 * One rule keeps everything consistent: **whether a habit was done is only ever `log.completed`**, exactly as for
 * every existing habit. XP, the 80% rule, streaks and the weekly scheduling all read that list, so tracking details
 * can't add XP twice, and partial progress is never mistaken for completion. A swipe completes a habit on the
 * person's word; nothing here claims it was checked.
 *
 * Every change returns the new logs and at most one event, and only when completion actually changes. `first` tells a
 * future UI whether this is the day's first completion of the habit, so crossing a target again after a correction
 * never celebrates twice.
 */

export type SessionType = 'full body' | 'upper' | 'lower' | 'other';
export const SESSION_TYPES: SessionType[] = ['full body', 'upper', 'lower', 'other'];

/** A day's tracking details for one habit (`DayLog.track[habitId]`). Every field is optional. */
export type HabitTrack = {
  v: 1;
  /** How the current completion was made (absent when not completed). */
  by?: 'manual' | 'timer' | 'counter' | 'session';
  /** The person chose to skip it today. Never set on a completed habit. */
  skipped?: true;
  /** Counter progress (tasks finished, people reached). */
  count?: number;
  /** Active minutes the timer counted, or minutes the person entered. */
  minutes?: number;
  /** The day's timer, while one exists. */
  timer?: TimerRun;
  /** Strength Training: optional details of the day's session. */
  session?: { type?: SessionType; minutes?: number };
  /** The habit has been completed at least once today (one celebration a day, however often it's corrected). */
  everCompleted?: true;
};

export type DayStatus = 'completed' | 'skipped' | 'incomplete' | 'unrecorded';

type Logs = Record<string, DayLog>;
export type Event = null | { kind: 'completed'; first: boolean } | { kind: 'uncompleted' };
export type Change = { logs: Logs; event: Event };

/** Where a day's record is, and the planned list to give a new one (the caller's rules decide what's planned). */
export type At = { startKey: string; day: number; planned: string[] };

const keyOf = (at: At) => dateForDay(at.startKey, at.day);
const empty: HabitTrack = { v: 1 };

/** A habit's tracking details on a day, read defensively: anything damaged is ignored, never trusted. */
export function readTrack(log: DayLog | undefined, habitId: string): HabitTrack {
  const raw = (log?.track as Record<string, unknown> | undefined)?.[habitId];
  if (!raw || typeof raw !== 'object') return empty;
  const r = raw as Record<string, unknown>;
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : undefined);
  const out: HabitTrack = { v: 1 };
  if (r.by === 'manual' || r.by === 'timer' || r.by === 'counter' || r.by === 'session') out.by = r.by;
  if (r.skipped === true) out.skipped = true;
  if (n(r.count) !== undefined) out.count = n(r.count);
  if (n(r.minutes) !== undefined) out.minutes = n(r.minutes);
  if (r.everCompleted === true) out.everCompleted = true;
  const t = r.timer as TimerRun | undefined;
  if (t && typeof t === 'object' && t.v === 1 && Array.isArray(t.blocks) && typeof t.status === 'string') out.timer = t;
  const s = r.session as Record<string, unknown> | undefined;
  if (s && typeof s === 'object') {
    out.session = {
      ...(SESSION_TYPES.includes(s.type as SessionType) ? { type: s.type as SessionType } : {}),
      ...(n(s.minutes) !== undefined ? { minutes: n(s.minutes) } : {}),
    };
  }
  return out;
}

/** A habit's status on a day. Partial progress is still `incomplete`. */
export function dayStatus(logs: Logs, startKey: string, day: number, habitId: string): DayStatus {
  const log = logs[dateForDay(startKey, day)];
  if (!log) return 'unrecorded';
  if (log.completed.includes(habitId)) return 'completed';
  return readTrack(log, habitId).skipped ? 'skipped' : 'incomplete';
}

/** Applies a change to one habit's day, creating the day's record if needed; completion only via `completed`. */
function edit(logs: Logs, at: At, habitId: string, f: (done: boolean, t: HabitTrack) => [boolean, HabitTrack]): Change {
  const key = keyOf(at);
  const prev = logs[key];
  const done = prev?.completed.includes(habitId) ?? false;
  const [nextDone, nextTrack] = f(done, readTrack(prev, habitId));
  // Nothing to record on a day with no record (an undo of nothing): it stays unrecorded.
  if (!prev && !nextDone && JSON.stringify(nextTrack) === JSON.stringify(empty)) return { logs, event: null };
  const completed = prev?.completed ?? [];
  const log: DayLog = {
    ...(prev ?? { day: at.day, date: key, completed: [], planned: at.planned }),
    completed:
      nextDone === done ? completed : nextDone ? [...completed, habitId] : completed.filter((x) => x !== habitId),
    track: { ...(prev?.track ?? {}), [habitId]: nextTrack },
  };
  const event: Event =
    nextDone === done
      ? null
      : nextDone
        ? { kind: 'completed', first: !readTrack(prev, habitId).everCompleted }
        : { kind: 'uncompleted' };
  return { logs: { ...logs, [key]: log }, event };
}

const completedBy = (t: HabitTrack, by: NonNullable<HabitTrack['by']>): HabitTrack => {
  const out: HabitTrack = { ...t, by, everCompleted: true };
  delete out.skipped;
  return out;
};
const notCompleted = (t: HabitTrack): HabitTrack => {
  const out = { ...t };
  delete out.by;
  return out;
};

/**
 * Quick completion: the person says it's done (a swipe). Idempotent: doing it twice changes nothing. An optional
 * amount (for example minutes read) is recorded as given.
 */
export function confirmDone(logs: Logs, at: At, habitId: string, minutes?: number): Change {
  return edit(logs, at, habitId, (done, t) =>
    done
      ? [true, minutes === undefined ? t : { ...t, minutes }]
      : [true, completedBy(minutes === undefined ? t : { ...t, minutes }, 'manual')],
  );
}

/** Undo a completion. Progress (a counter, timer minutes) stays as it was, so nothing the person did is lost. */
export function undoDone(logs: Logs, at: At, habitId: string): Change {
  return edit(logs, at, habitId, (done, t) => (done ? [false, notCompleted(t)] : [false, t]));
}

/** Skip today on purpose. Not possible once completed (undo first); never counted as a failure here. */
export function skip(logs: Logs, at: At, habitId: string): Change {
  return edit(logs, at, habitId, (done, t) => (done ? [true, t] : [false, { ...t, skipped: true }]));
}

export function unskip(logs: Logs, at: At, habitId: string): Change {
  return edit(logs, at, habitId, (done, t) => {
    const out = { ...t };
    delete out.skipped;
    return [done, out];
  });
}

/**
 * Sets a counter (never below zero). Reaching the target completes the habit; going back under it undoes a
 * completion the counter made (a correction), but never one the person confirmed themselves.
 */
export function setCount(logs: Logs, at: At, habitId: string, count: number, target: number): Change {
  const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  return edit(logs, at, habitId, (done, t) => {
    const before = t.count ?? 0;
    const next: HabitTrack = { ...t, count: n };
    if (!done && n >= target && before < target) return [true, completedBy(next, 'counter')];
    if (done && n < target && t.by === 'counter') return [false, notCompleted(next)];
    return [done, next];
  });
}

export const increment = (logs: Logs, at: At, habitId: string, target: number) =>
  setCount(logs, at, habitId, (readTrack(logs[keyOf(at)], habitId).count ?? 0) + 1, target);
export const decrement = (logs: Logs, at: At, habitId: string, target: number) =>
  setCount(logs, at, habitId, (readTrack(logs[keyOf(at)], habitId).count ?? 0) - 1, target);

/** Counter progress toward a target, 0..1 (progress is not completion: see `dayStatus`). */
export function countProgress(logs: Logs, startKey: string, day: number, habitId: string, target: number): number {
  const c = readTrack(logs[dateForDay(startKey, day)], habitId).count ?? 0;
  return target > 0 ? Math.min(1, c / target) : 0;
}

/**
 * Saves a timer (the person's timer survives tab switches and restarts this way) after bringing it up to date. A
 * timer that finishes completes the habit once, recording its active minutes; an expired one completes nothing.
 * A habit already completed by a swipe stays completed, with the timer's minutes added.
 */
export function saveTimer(logs: Logs, at: At, timer: TimerRun, now: number): Change {
  const t = settle(timer, now, at.day);
  return edit(logs, { ...at, day: t.day }, t.habitId, (done, tr) => {
    const next: HabitTrack = { ...tr, timer: t, minutes: activeMinutes(t, now) };
    if (t.status === 'finished' && !done) return [true, completedBy(next, 'timer')];
    return [done, next];
  });
}

/** The day's saved timer for a habit, brought up to date (expired if the day has passed). */
export function loadTimer(logs: Logs, startKey: string, day: number, habitId: string, now: number, today: number) {
  const t = readTrack(logs[dateForDay(startKey, day)], habitId).timer;
  return t ? settle(t, now, today) : null;
}

/** Strength Training: details are optional and validated (duration 1–600 min). */
const validSession = (d: { type?: SessionType; minutes?: number } = {}) => ({
  ...(d.type && SESSION_TYPES.includes(d.type) ? { type: d.type } : {}),
  ...(d.minutes !== undefined && Number.isFinite(d.minutes) && d.minutes >= 1 && d.minutes <= 600
    ? { minutes: Math.round(d.minutes) }
    : {}),
});

/**
 * Logs today's strength session. One session is credited a day: logging again the same day only updates the details,
 * never adds a second session. Nothing is prescribed or checked.
 */
export function logSession(logs: Logs, at: At, habitId: string, details?: { type?: SessionType; minutes?: number }) {
  return edit(logs, at, habitId, (done, t) => {
    const session = { ...(t.session ?? {}), ...validSession(details) };
    return [true, done ? { ...t, session } : completedBy({ ...t, session }, 'session')];
  });
}

/** Corrects a logged session's details (type or length). A day without a session is left alone. */
export function editSession(logs: Logs, at: At, habitId: string, details: { type?: SessionType; minutes?: number }) {
  const log = logs[keyOf(at)];
  if (!log?.completed.includes(habitId)) return { logs, event: null } as Change;
  return edit(logs, at, habitId, (done, t) => [done, { ...t, session: validSession({ ...t.session, ...details }) }]);
}

/** Removes a logged session (a mistake): not completed any more, and its details go with it. */
export function undoSession(logs: Logs, at: At, habitId: string): Change {
  return edit(logs, at, habitId, (done, t) => {
    const out = notCompleted(t);
    delete out.session;
    return [false, out];
  });
}

/** Whether a session was also logged the day before: the gentle recovery note. Informational only. */
export function recoveryNote(logs: Logs, startKey: string, day: number, habitId: string): boolean {
  return day > 1 && dayStatus(logs, startKey, day - 1, habitId) === 'completed';
}
