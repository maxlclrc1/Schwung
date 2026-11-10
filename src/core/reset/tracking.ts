import { dateForDay } from '../dates';
import type { DayLog } from '../types';
import { activeMinutes, settle, type TimerRun } from './timer';

/*
 * Tracking records for Life Reset habits: how a day's habit was done (a swipe, a timer, a counter, a strength
 * session), partial progress, explicit skips, corrections and undo. Pure.
 *
 * One rule keeps everything consistent: **whether a habit was done is only ever `log.completed`**, exactly as for
 * every existing habit. XP, the 80% rule, streaks and the weekly scheduling all read that list, so tracking details
 * can't add XP twice, and partial progress is never mistaken for completion. A swipe completes a habit on the
 * person's word; nothing here claims it was checked.
 *
 * Every change returns the new logs and at most one event, and only when completion actually changes. `first` tells a
 * future UI whether this is the day's first completion of the habit, so crossing a target again after a correction
 * never celebrates twice.
 *
 * Completion always comes from the person: a swipe or a tap (also to confirm a ready timer), a counter they tap up to
 * its target, or a session they log. A timer alone never completes anything.
 */

export type SessionType = 'full body' | 'upper' | 'lower' | 'other';
export const SESSION_TYPES: SessionType[] = ['full body', 'upper', 'lower', 'other'];

/** A day's tracking details for one habit (`DayLog.track[habitId]`). Every field is optional. */
export type HabitTrack = {
  v: 1;
  /** How the current completion was made (absent when not completed). */
  by?: 'manual' | 'timer' | 'counter' | 'session' | 'progress';
  /** The person chose to skip it today. Never set on a completed habit. */
  skipped?: true;
  /** Counter progress (tasks finished, people reached). */
  count?: number;
  /** Active minutes the timer counted (tracking information; never completion by itself). */
  minutes?: number;
  /** The counter target in force when the counter completed the habit (an undo goes back to one below it). */
  countTarget?: number;
  /** An amount the person entered, any time, optionally (never needed to complete). */
  amount?: Amount;
  /** The day's timer, while one exists. */
  timer?: TimerRun;
  /** Strength Training: optional details of the day's session. */
  session?: { type?: SessionType; minutes?: number };
  /** The habit has been completed at least once today (one celebration a day, however often it's corrected). */
  everCompleted?: true;
  /**
   * Partial progress the person logged: minutes (timed habits), an amount (counters), or just "made an effort" (no
   * value). Worth PARTIAL_XP while the habit isn't completed; never counts toward the streak, a full day or a weekly
   * goal. Absent on older saves, so their XP never changes.
   */
  progress?: { value?: number };
  /**
   * The person did the habit's minimum today (docs/MINIMUM_EFFORT_SPEC.md): the smallest version, a one-day fallback
   * that never changes the level. Never a completion (it's never in `completed`): worth PARTIAL_XP, it counts toward
   * consistency (the streak, a kept day), never toward a full day or step-up readiness. Kept underneath a completion
   * that follows, so undoing that completion goes back to it. Mutually exclusive with a skip. Absent in older saves.
   */
  minimum?: true;
};

/** XP for a habit with logged progress that isn't completed (a completion is worth XP_PER_HABIT in all). */
export const PARTIAL_XP = 5;
const PROGRESS_MAX = 5000;

export type Amount = { value: number; unit: 'minutes' | 'pages' };
const AMOUNT_MAX: Record<Amount['unit'], number> = { minutes: 1440, pages: 5000 };

export type DayStatus = 'completed' | 'skipped' | 'minimum' | 'incomplete' | 'unrecorded';

type Logs = Record<string, DayLog>;
export type Event = null | { kind: 'completed'; first: boolean } | { kind: 'uncompleted' };
export type Change = { logs: Logs; event: Event };

/** Where a day's record is, and the planned list to give a new one (the caller's rules decide what's planned). */
export type At = { startKey: string; day: number; planned: string[] };

const keyOf = (at: At) => dateForDay(at.startKey, at.day);
const validAmount = (v: unknown, unit: Amount['unit']) =>
  typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= AMOUNT_MAX[unit];
const empty: HabitTrack = { v: 1 };

/** A habit's tracking details on a day, read defensively: anything damaged is ignored, never trusted. */
export function readTrack(log: DayLog | undefined, habitId: string): HabitTrack {
  const raw = (log?.track as Record<string, unknown> | undefined)?.[habitId];
  if (!raw || typeof raw !== 'object') return empty;
  const r = raw as Record<string, unknown>;
  const n = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? Math.floor(x) : undefined);
  const out: HabitTrack = { v: 1 };
  if (['manual', 'timer', 'counter', 'session', 'progress'].includes(r.by as string)) out.by = r.by as HabitTrack['by'];
  if (r.skipped === true) out.skipped = true;
  if (r.minimum === true) out.minimum = true;
  if (n(r.count) !== undefined) out.count = n(r.count);
  if (n(r.minutes) !== undefined) out.minutes = n(r.minutes);
  if (n(r.countTarget) !== undefined && n(r.countTarget)! > 0) out.countTarget = n(r.countTarget);
  const a = r.amount as Record<string, unknown> | undefined;
  if (a && typeof a === 'object' && (a.unit === 'minutes' || a.unit === 'pages') && validAmount(a.value, a.unit))
    out.amount = { value: Math.round(a.value as number), unit: a.unit };
  if (r.everCompleted === true) out.everCompleted = true;
  const pr = r.progress as Record<string, unknown> | undefined;
  if (pr && typeof pr === 'object') {
    const v = n(pr.value);
    out.progress = v !== undefined && v >= 1 && v <= PROGRESS_MAX ? { value: v } : {};
  }
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

/** Partial progress on a day: logged, not completed and not skipped. */
export const isPartial = (log: DayLog | undefined, habitId: string): boolean =>
  !!log && !log.completed.includes(habitId) && !!readTrack(log, habitId).progress && !readTrack(log, habitId).skipped;

/** Habits with partial progress in a day's record (each worth PARTIAL_XP). */
export const partialCount = (log: DayLog): number =>
  Object.keys((log.track as Record<string, unknown> | undefined) ?? {}).filter((id) => isPartial(log, id)).length;

/** A habit's status on a day. Partial progress is still `incomplete`; a minimum under a completion is `completed`. */
export function dayStatus(logs: Logs, startKey: string, day: number, habitId: string): DayStatus {
  const log = logs[dateForDay(startKey, day)];
  if (!log) return 'unrecorded';
  if (log.completed.includes(habitId)) return 'completed';
  const t = readTrack(log, habitId);
  return t.skipped ? 'skipped' : t.minimum ? 'minimum' : 'incomplete';
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
  delete out.countTarget;
  return out;
};

/**
 * Quick completion: the person says it's done (a swipe or a tap). Immediate and idempotent: doing it twice changes
 * nothing, and no amount is needed. Confirming while the day's timer is ready to confirm records it as timer-assisted
 * (its minutes are already there); otherwise it's manual. Either way it's the person's word, not a check.
 */
export function confirmDone(logs: Logs, at: At, habitId: string): Change {
  return edit(logs, at, habitId, (done, t) =>
    done ? [true, t] : [true, completedBy(t, t.timer?.status === 'ready' ? 'timer' : 'manual')],
  );
}

/** Confirming a ready timer is the same one tap as a swipe. */
export const confirmTimer = confirmDone;

/**
 * Undo a completion. Timer minutes and any entered amount stay. A completion the counter made goes back to one below
 * the target it completed at, so one new, intentional tap completes it again; a swiped completion leaves the count
 * as it was.
 */
export function undoDone(logs: Logs, at: At, habitId: string): Change {
  return edit(logs, at, habitId, (done, t) => {
    if (!done) return [false, t];
    if (t.by === 'counter' && t.countTarget !== undefined) {
      const count = Math.max(0, t.countTarget - 1);
      const out: HabitTrack = { ...notCompleted(t), count };
      if (count > 0) out.progress = { value: count };
      else delete out.progress;
      return [false, out];
    }
    return [false, notCompleted(t)];
  });
}

/**
 * Records (or, with null, clears) an optional amount the person entered, such as minutes read, at any time, before
 * or after completing. It never completes, undoes or creates a completion; invalid values are ignored.
 */
export function recordAmount(logs: Logs, at: At, habitId: string, amount: Amount | null): Change {
  return edit(logs, at, habitId, (done, t) => {
    const out = { ...t };
    if (amount === null) delete out.amount;
    else if (validAmount(amount.value, amount.unit))
      out.amount = { value: Math.round(amount.value), unit: amount.unit };
    return [done, out];
  });
}

/** Skip today on purpose. Not possible once completed (undo first); never counted as a failure here. */
export function skip(logs: Logs, at: At, habitId: string): Change {
  return edit(logs, at, habitId, (done, t) => {
    if (done) return [true, t];
    const out: HabitTrack = { ...t, skipped: true };
    delete out.progress;
    // A skip replaces a minimum: the two say opposite things about the day.
    delete out.minimum;
    return [false, out];
  });
}

/**
 * Records (or, with `on` false, removes) the day's minimum. Never a completion and never an event: a completed habit
 * is left as it is (its minimum, if any, stays underneath). Recording it clears a skip; logged progress is kept.
 * Recording it twice, or removing one that isn't there, changes nothing.
 */
export function markMinimum(logs: Logs, at: At, habitId: string, on: boolean): Change {
  const prev = logs[keyOf(at)];
  const t = readTrack(prev, habitId);
  if (on ? t.minimum || prev?.completed.includes(habitId) : !t.minimum) return { logs, event: null };
  return edit(logs, at, habitId, (done, tr) => {
    const out: HabitTrack = { ...tr };
    if (on) {
      out.minimum = true;
      delete out.skipped;
    } else delete out.minimum;
    return [done, out];
  });
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
    // The count is the counter's progress: any amount is partial progress until it completes.
    if (n > 0) {
      next.progress = { value: Math.min(n, PROGRESS_MAX) };
      delete next.skipped;
    } else delete next.progress;
    if (!done && n >= target && before < target)
      return [true, { ...completedBy(next, 'counter'), countTarget: target }];
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
 * Logs (or, with null, removes) partial progress: minutes or an amount (`value`), or just an effort (no value).
 * Reaching `target` completes the habit (by 'progress'), worth XP_PER_HABIT in all, never more; correcting it back
 * under the target undoes only a completion progress made, never one the person confirmed by swiping. A completed
 * habit keeps its completion. Logging progress un-skips the day.
 */
export function logProgress(
  logs: Logs,
  at: At,
  habitId: string,
  value: number | null | undefined,
  target: number | null,
): Change {
  return edit(logs, at, habitId, (done, t) => {
    const out: HabitTrack = { ...t };
    delete out.skipped;
    const v = value == null || !Number.isFinite(value) ? undefined : Math.min(PROGRESS_MAX, Math.floor(value));
    // Removing it (null, or nothing left): a completion that progress made goes with it.
    if (value === null || (v !== undefined && v < 1)) {
      delete out.progress;
      return done && t.by === 'progress' ? [false, notCompleted(out)] : [done, out];
    }
    out.progress = v === undefined ? {} : { value: v };
    const reached = target !== null && v !== undefined && v >= target;
    if (!done && reached) return [true, completedBy(out, 'progress')];
    if (done && !reached && t.by === 'progress') return [false, notCompleted(out)];
    return [done, out];
  });
}

/**
 * Saves a timer (so it survives tab switches and restarts) after bringing it up to date, on its own day's record,
 * with its active minutes. It never completes the habit: a ready timer waits for the person to confirm. A habit
 * already completed stays completed, with the minutes added.
 */
export function saveTimer(logs: Logs, at: At, timer: TimerRun, now: number): Change {
  const t = settle(timer, now, at.day);
  return edit(logs, { ...at, day: t.day }, t.habitId, (done, tr) => [
    done,
    { ...tr, timer: t, minutes: activeMinutes(t, now) },
  ]);
}

/** The day's saved timer for a habit, brought up to date (stopped at midnight if that day has ended). */
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

// --- Skips, for future daily-success and readiness calculations (not used by any rule yet). ---

/** The approved skip rules (2026-10-27). XP and streaks are unchanged: they read only `completed`. */
export const SKIP_RULES = {
  /** A skipped due habit earns no completion credit toward a day's success. */
  completionCredit: false,
  /** For readiness, a skip is not done: skipping can never raise the share and so speed up a step-up. */
  countsAsDoneForReadiness: false,
  /** Skips are counted separately from ordinary misses, so future rules can treat them differently. */
  separateFromMisses: true,
} as const;

/** The approved Minimum Effort rules (docs/MINIMUM_EFFORT_SPEC.md, approved at ea0c86c). */
export const MINIMUM_RULES = {
  /** Worth PARTIAL_XP, never on top of partial progress for the same habit and day, never with a completion's XP. */
  xp: PARTIAL_XP,
  countsAsCompletion: false,
  countsTowardFullDay: false,
  /** Combined with full completions under the existing 80% rule, a day can be kept (the consistency streak). */
  countsTowardConsistency: true,
  /** For readiness a minimum is recorded and not done, kept apart from misses: it never speeds up a step-up. */
  countsAsDoneForReadiness: false,
  /** Logged partial progress never becomes a minimum by itself. */
  convertsPartialProgress: false,
} as const;

export type Observation = 'done' | 'skipped' | 'minimum' | 'missed' | 'unknown';

/** How a day's status counts as an observation: an unrecorded day is unknown, never a miss. */
export function observation(status: DayStatus): Observation {
  return status === 'completed'
    ? 'done'
    : status === 'skipped'
      ? 'skipped'
      : status === 'minimum'
        ? 'minimum'
        : status === 'incomplete'
          ? 'missed'
          : 'unknown';
}

/** Counts of each observation, kept apart. */
export function tally(obs: Observation[]): Record<Observation, number> {
  const out = { done: 0, skipped: 0, minimum: 0, missed: 0, unknown: 0 };
  for (const o of obs) out[o]++;
  return out;
}

/**
 * The share of known days that were done: skips and misses both count as not done, unknown days are left out. Null
 * when nothing is known. (A skip never inflates it.)
 */
export function doneShare(obs: Observation[]): number | null {
  const t = tally(obs);
  const known = t.done + t.skipped + t.minimum + t.missed;
  return known ? t.done / known : null;
}
