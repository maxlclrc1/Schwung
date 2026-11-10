/*
 * Fairer Day Counting (docs/FAIRER_DAY_COUNTING.md): candidate rules for how a day counts, run over what the real
 * engine saved. Read-only and outside the app. "current" is the rule until 6c0913e (80% rounded up, no grace);
 * "recommended" is the approved rule the engine now implements (pilot.ts dayOutcome, streakWalk), and the tests check
 * that this copy of it agrees with the engine on every simulated day.
 *
 * Every model reads the same record of each day (`readDays`) and keeps the approved Minimum Effort structure:
 *   - counted: the rule is met by full completions alone;
 *   - kept:    not counted, but met when the day's minimums count as showing up (consistency only);
 *   - missed:  neither; rest: nothing was asked.
 * Partial progress and skips are "not done" in every model (the approved skip and partial rules), except the
 * audit's option (a), which counts partial progress as half, for comparison.
 */
import { dateForDay, PROGRAM_DAYS } from '../../src/core/dates';
import * as P from '../../src/core/reset/pilot';

export type HabitDay = 'done' | 'minimum' | 'partial' | 'skipped' | 'none';
export type DayRecord = { day: number; rest: boolean; habits: { id: string; s: HabitDay }[] };
export type Outcome = 'rest' | 'counted' | 'kept' | 'missed';

/** Each day 1..last as the engine saw it: the day's list (the 80% rule's list) and what happened to each habit. */
export function readDays(p: P.PilotProgram, last = PROGRAM_DAYS): DayRecord[] {
  const out: DayRecord[] = [];
  for (let d = 1; d <= last; d++) {
    const log = p.logs[dateForDay(p.startedAt, d)];
    const list = log ? P.plannedOn(p, d, log.completed) : P.allHabits(p).filter((id) => P.isDaily(p, id, d));
    const habits = list.map((id) => {
      const t = P.trackOf(p, id, d);
      const s: HabitDay = P.isDone(p, id, d)
        ? 'done'
        : P.minimumOn(p, id, d)
          ? 'minimum'
          : t.skipped
            ? 'skipped'
            : t.progress
              ? 'partial'
              : 'none';
      return { id, s };
    });
    out.push({ day: d, rest: P.dayResult(p, d) === 'rest', habits });
  }
  return out;
}

// --- Day thresholds: how many of a day's n habits must be done ---

export type Threshold = { key: string; name: string; need: (n: number) => number; partialHalf?: boolean };
const EPS = 1e-9;
export const CURRENT: Threshold = {
  key: 'current',
  name: '80%, rounded up (before)',
  need: (n) => Math.ceil(n * 0.8 - EPS),
};
export const MAJORITY: Threshold = {
  key: 'majority',
  name: 'Majority (more than half)',
  need: (n) => Math.floor(n / 2) + 1,
};
export const MAJORITY_HALF: Threshold = {
  key: 'majorityHalf',
  name: 'Majority, partial = ½ (audit option a)',
  need: (n) => Math.floor(n / 2) + 1,
  partialHalf: true,
};
export const FLOOR80: Threshold = {
  key: 'floor80',
  name: '80%, rounded down (at least 1)',
  need: (n) => Math.max(1, Math.floor(n * 0.8 + EPS)),
};

export function outcome(r: DayRecord, t: Threshold): Outcome {
  if (r.rest) return 'rest';
  const n = r.habits.length;
  const done = r.habits.filter((h) => h.s === 'done').length;
  const half = t.partialHalf ? r.habits.filter((h) => h.s === 'partial').length / 2 : 0;
  const minimum = r.habits.filter((h) => h.s === 'minimum').length;
  const need = t.need(n);
  if (done + half >= need - EPS) return 'counted';
  if (done + half + minimum >= need - EPS) return 'kept';
  return 'missed';
}

// --- Streaks over days ---

/** How a streak treats a missed day: 'none' breaks on any miss (today); 'week' tolerates one missed day in any 7. */
export type Grace = 'none' | 'week' | 'twice';

export type DayStats = {
  counted: number;
  kept: number;
  missed: number;
  best: number;
  streak: number;
  resets: number;
  /** The streak at the end of each day (for checkpoint tables). */
  run: number[];
};

/**
 * journeyStats' walk, with an optional grace: counted and kept days add one; rest days are neutral; a missed day
 * other than today breaks the run, unless the grace tolerates it (it then adds nothing and breaks nothing).
 *   - 'week':  tolerated when no other missed day was tolerated in the 6 days before it ("one missed day a week");
 *   - 'twice': tolerated when the day before it (ignoring rest days) wasn't missed ("never miss twice").
 * An absence of two days or more always ends the run.
 */
export function dayStats(outcomes: Outcome[], today: number, grace: Grace = 'none'): DayStats {
  let counted = 0;
  let kept = 0;
  let missed = 0;
  let best = 0;
  let run = 0;
  let resets = 0;
  let lastTolerated = -Infinity;
  let prevMissed = false;
  const runs: number[] = [];
  outcomes.forEach((o, i) => {
    const d = i + 1;
    if (o === 'counted' || o === 'kept') {
      if (o === 'counted') counted++;
      else kept++;
      run++;
      best = Math.max(best, run);
      prevMissed = false;
    } else if (o === 'missed' && d !== today) {
      missed++;
      const tolerated =
        grace === 'week' ? d - lastTolerated > 6 && !prevMissed : grace === 'twice' ? !prevMissed : false;
      if (tolerated && run > 0) lastTolerated = d;
      else {
        if (run > 0) resets++;
        run = 0;
        lastTolerated = -Infinity;
      }
      prevMissed = true;
    }
    runs.push(run);
  });
  return { counted, kept, missed, best, streak: run, resets, run: runs };
}

// --- Per-habit streaks, one missed opportunity tolerated ---

export type HabitStreak = {
  id: string;
  kind: 'daily' | 'weekly';
  best: number;
  streak: number;
  kept: number;
  of: number;
};

/**
 * Each habit on its own: its opportunities are its daily days (done or at its minimum: kept; anything else: missed)
 * and, for a weekly habit, its finished weeks with a goal (goal met: kept). A missed opportunity is tolerated when the
 * one before it wasn't missed; a second in a row ends that habit's streak. Streaks are in opportunities (days, or
 * weeks for weekly habits).
 */
export function habitStreaks(p: P.PilotProgram, today = PROGRAM_DAYS): HabitStreak[] {
  return P.allHabits(p).map((id) => {
    const opps: boolean[] = [];
    let weekly = false;
    for (let d = 1; d <= Math.min(today, PROGRAM_DAYS); d++) {
      if (!P.isDaily(p, id, d)) continue;
      const done = P.isDone(p, id, d) || P.minimumOn(p, id, d);
      if (d === today && !done) continue; // an unfinished today is no opportunity yet
      opps.push(done);
    }
    for (const w of P.habitWeeks(p, id, today)) {
      if (!w.closed || w.goal === 0) continue;
      if (Array.from({ length: w.lastDay - w.firstDay + 1 }, (_, i) => w.firstDay + i).some((d) => P.isDaily(p, id, d)))
        continue; // a week the habit was daily in is already counted by its days
      weekly = true;
      opps.push(w.status === 'achieved');
    }
    let run = 0;
    let best = 0;
    let prevMissed = false;
    for (const ok of opps) {
      if (ok) {
        run++;
        best = Math.max(best, run);
        prevMissed = false;
      } else {
        if (prevMissed) run = 0;
        prevMissed = true;
      }
    }
    return {
      id,
      kind: weekly ? 'weekly' : 'daily',
      best,
      streak: run,
      kept: opps.filter(Boolean).length,
      of: opps.length,
    };
  });
}

// --- The models compared ---

export type Model = { key: string; name: string; threshold: Threshold; grace: Grace };
export const MODELS: Model[] = [
  { key: 'current', name: CURRENT.name, threshold: CURRENT, grace: 'none' },
  { key: 'majority', name: MAJORITY.name, threshold: MAJORITY, grace: 'none' },
  { key: 'majorityHalf', name: MAJORITY_HALF.name, threshold: MAJORITY_HALF, grace: 'none' },
  { key: 'floor80', name: FLOOR80.name, threshold: FLOOR80, grace: 'none' },
  // Model 3's tolerance ("never miss twice") lifted to the day, to show why the recommendation limits it to a week.
  { key: 'floor80Twice', name: '80% rounded down + never miss twice', threshold: FLOOR80, grace: 'twice' },
  { key: 'recommended', name: '80% rounded down + one missed day a week', threshold: FLOOR80, grace: 'week' },
];

export function runModel(days: DayRecord[], m: Model, today = days.length): DayStats & { outcomes: Outcome[] } {
  const outcomes = days.map((r) => outcome(r, m.threshold));
  return { ...dayStats(outcomes, today, m.grace), outcomes };
}
