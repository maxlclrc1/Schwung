import { OBSERVATION } from './catalog';
import { BASELINE, dayRecord, EXPERIMENT } from './journey';
import type { FnRun, Rating, TimeOfDay } from './types';

/*
 * What Field Notes says about the days so far: only counts and comparisons of what the person recorded, with fixed
 * thresholds (documented in SCHWUNG_FIELD_NOTES_PROTOTYPE.md). Missing notes are left out, never counted as zero.
 * It never says one thing caused another, never turns a difference into a percentage "improvement", and says so
 * plainly when there's too little to compare.
 */

export const RULES = {
  /** Starting-day notes needed before any comparison with them. */
  minBaseline: 2,
  /** Notes on days the experiment was tried, needed before comparing them with the starting days. */
  minTriedNotes: 3,
  /** Notes needed in each group to compare tried and not-tried days. */
  minPerGroup: 2,
  /** The smallest average difference (on the 1–5 scale) worth mentioning. */
  meaningfulDiff: 0.5,
  /** Share of tried-day notes on the same side of the starting average for a "higher"/"lower" pattern. */
  consistentShare: 2 / 3,
  /** Time of day: at least this many "when" answers, and one time making up at least this share. */
  minTimes: 3,
  timeShare: 0.6,
} as const;

export const CAVEAT =
  'These are your own notes from a few days: patterns worth noticing, not proof of what caused what.';

export type Pattern = 'higher' | 'lower' | 'same' | 'mixed' | 'notEnough';

export type Summary = {
  /** The last day included. */
  through: number;
  /** Experiment days so far (from day 4 to `through`). */
  experimentDays: number;
  tried: number;
  notTried: number;
  /** Experiment days with no answer about trying. */
  unanswered: number;
  baselineNotes: Rating[];
  triedNotes: Rating[];
  notTriedNotes: Rating[];
  /** Days (of `through`) with an observation. */
  notesGiven: number;
  baselineAvg: number | null;
  triedAvg: number | null;
  notTriedAvg: number | null;
  pattern: Pattern;
  /** Plain sentences, in order, each true of the recorded data. */
  lines: string[];
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
export const fmt = (x: number) => x.toFixed(1);
const days = (n: number) => (n === 1 ? 'day' : 'days');

/** The last day to include today: today only once something has been recorded for it. */
export function summaryThrough(run: Pick<FnRun, 'startedAt' | 'days'>, today: number): number {
  const r = dayRecord(run, today);
  const recorded = !!r && (r.tried !== undefined || r.rating !== undefined);
  return Math.max(0, recorded ? today : today - 1);
}

export function summarize(run: Pick<FnRun, 'startedAt' | 'days' | 'goal'>, through: number): Summary {
  const noun = OBSERVATION[run.goal].noun;
  const baselineNotes: Rating[] = [];
  const triedNotes: Rating[] = [];
  const notTriedNotes: Rating[] = [];
  const times: TimeOfDay[] = [];
  let tried = 0;
  let notTried = 0;
  let unanswered = 0;
  let notesGiven = 0;
  for (let d = 1; d <= through; d++) {
    const r = dayRecord(run, d);
    if (r?.rating !== undefined) notesGiven++;
    if (d <= BASELINE.to) {
      if (r?.rating !== undefined) baselineNotes.push(r.rating);
      continue;
    }
    if (r?.tried === true) {
      tried++;
      if (r.rating !== undefined) triedNotes.push(r.rating);
      if (r.when) times.push(r.when);
    } else if (r?.tried === false) {
      notTried++;
      if (r.rating !== undefined) notTriedNotes.push(r.rating);
    } else unanswered++;
  }
  const experimentDays = Math.max(0, through - EXPERIMENT.from + 1);
  const baselineAvg = avg(baselineNotes);
  const triedAvg = avg(triedNotes);
  const notTriedAvg = avg(notTriedNotes);

  const lines: string[] = [];
  if (experimentDays > 0) lines.push(`You tried it on ${tried} of ${experimentDays} ${days(experimentDays)}.`);
  if (through > 0) lines.push(`You noted your ${noun} on ${notesGiven} of ${through} ${days(through)}.`);

  // Compared with the starting days.
  let pattern: Pattern = 'notEnough';
  if (baselineNotes.length >= RULES.minBaseline && triedNotes.length >= RULES.minTriedNotes) {
    const base = baselineAvg!;
    const n = triedNotes.length;
    const higher = triedNotes.filter((x) => x > base).length;
    const lower = triedNotes.filter((x) => x < base).length;
    const diff = triedAvg! - base;
    if (diff >= RULES.meaningfulDiff && higher / n >= RULES.consistentShare) {
      pattern = 'higher';
      lines.push(
        `Your ${noun} was higher than on your starting days on ${higher} of the ${n} days you tried it and noted it.`,
      );
    } else if (diff <= -RULES.meaningfulDiff && lower / n >= RULES.consistentShare) {
      pattern = 'lower';
      lines.push(
        `Your ${noun} was lower than on your starting days on ${lower} of the ${n} days you tried it and noted it.`,
      );
    } else if (Math.abs(diff) < RULES.meaningfulDiff) {
      pattern = 'same';
      lines.push(`On days you tried it, your ${noun} was about the same as on your starting days.`);
    } else {
      pattern = 'mixed';
      lines.push(
        `Mixed so far: higher than your starting days on ${higher} of the ${n} days you tried it and noted it, lower on ${lower}.`,
      );
    }
    lines.push(`Average ${fmt(triedAvg!)} on those days, ${fmt(base)} on your starting days (1–5).`);
  } else if (experimentDays > 0) {
    lines.push(
      tried > 0
        ? 'There aren’t enough notes yet to compare with your starting days. The days you tried it still count.'
        : 'There aren’t enough notes yet to compare with your starting days.',
    );
  }

  // Tried and not-tried days, only when both have enough notes and the gap is worth mentioning.
  if (
    triedNotes.length >= RULES.minPerGroup &&
    notTriedNotes.length >= RULES.minPerGroup &&
    Math.abs(triedAvg! - notTriedAvg!) >= RULES.meaningfulDiff
  ) {
    lines.push(
      `On days you tried it, your ${noun} averaged ${fmt(triedAvg!)}; on days you didn’t, ${fmt(notTriedAvg!)}.`,
    );
  }

  // When they tried it.
  if (times.length >= RULES.minTimes) {
    const counts = (['morning', 'afternoon', 'evening'] as TimeOfDay[]).map(
      (t) => [t, times.filter((x) => x === t).length] as const,
    );
    const [top, k] = counts.reduce((a, b) => (b[1] > a[1] ? b : a));
    if (k / times.length >= RULES.timeShare)
      lines.push(`You mostly tried it in the ${top} (${k} of ${times.length} times).`);
  }

  return {
    through,
    experimentDays,
    tried,
    notTried,
    unanswered,
    baselineNotes,
    triedNotes,
    notTriedNotes,
    notesGiven,
    baselineAvg,
    triedAvg,
    notTriedAvg,
    pattern,
    lines,
  };
}

/** A short, honest heading for a summary: never more positive than the data. */
export const PATTERN_HEADING: Record<Pattern, string> = {
  higher: 'A pattern worth noticing',
  lower: 'Not the direction you hoped, and worth knowing',
  same: 'No clear difference yet',
  mixed: 'Mixed so far',
  notEnough: 'Not enough notes to compare yet',
};

/** The starting point in one sentence, for the camp it belongs to. */
export function baselineLine(run: Pick<FnRun, 'startedAt' | 'days' | 'goal'>): string {
  const noun = OBSERVATION[run.goal].noun;
  const notes: number[] = [];
  for (let d = BASELINE.from; d <= BASELINE.to; d++) {
    const r = dayRecord(run, d)?.rating;
    if (r !== undefined) notes.push(r);
  }
  if (!notes.length) return `No starting notes. That’s fine: the experiment still runs, with less to compare.`;
  return `You noted your ${noun} on ${notes.length} of 3 starting days, ${notes.length === 1 ? 'at' : 'averaging'} ${fmt(avg(notes)!)} out of 5.`;
}
