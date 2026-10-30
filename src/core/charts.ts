import { language, t } from '../i18n';
import { dateForDay, weekdayOfDay } from './dates';

/*
 * The Insights charts' shapes, filled in by reset/charts.ts from the saved days only, computed once per change
 * (memoized by the screens), never per animation frame. Rules: SCHWUNG_LIFE_RESET_PROGRAM.md ("Insights charts").
 */

export type Tally = { done: number; eligible: number };

/**
 * One program week of the consistency trend (weeks run Monday to Sunday, so the first and last may be short):
 * - 'closed': finished; `share` is done ÷ eligible, the same opportunities as the overall consistency;
 * - 'current': this week, so far (an unfinished day or a weekly goal still open is never counted against it);
 * - 'unrecorded': finished with no day record at all, shown as a gap, never as 0%;
 * - 'none': no opportunities that week (nothing was due: rest days only).
 */
export type WeekPoint = {
  week: number;
  firstDay: number;
  lastDay: number;
  /** Program days in the week (7, or fewer for a first or last week). */
  days: number;
  done: number;
  eligible: number;
  share: number | null;
  state: 'closed' | 'current' | 'unrecorded' | 'none';
};

/**
 * A program day in the heatmap:
 * - 'full': everything on the day's list done; 'partial': some of it;
 * - 'missed': the day has a record, but nothing on it was done (an explicit non-completion);
 * - 'skipped': nothing done, and the person chose to skip at least one habit;
 * - 'rest': nothing was due (weekly habits resting, rested sessions);
 * - 'unrecorded': something was due and the day has no record at all;
 * - 'today': still open (unless already full); 'future': not reached yet.
 */
export type CellState = 'full' | 'partial' | 'missed' | 'skipped' | 'rest' | 'unrecorded' | 'today' | 'future';

export type DayCell = {
  day: number;
  date: string;
  /** 0 Monday … 6 Sunday. */
  weekday: number;
  state: CellState;
  /** Habit ids done, skipped, and on the day's list (what the day was judged on). */
  done: string[];
  skipped: string[];
  planned: string[];
};

export type Records = {
  /**
   * The finished full week (all seven days in the program) with the highest consistency; ties go to the one with more
   * done, then the earlier one.
   */
  bestWeek: { week: number; share: number; done: number; eligible: number } | null;
  /** Every completed habit action on record. */
  total: number;
  /** Days with Read Daily done; null when the program has no reading habit. */
  readingDays: number | null;
  /** Strength sessions logged; null when the program has no strength habit. */
  strengthSessions: number | null;
  /** The longest run of counted days (the program's own streak rule). */
  bestStreak: number;
};

/** Monday-based weekday of a program day (0 Monday … 6 Sunday). */
export const mondayIndex = (startKey: string, day: number) => (weekdayOfDay(startKey, day) + 6) % 7;

/** A week's point from its tally and whether it's finished or has any record. */
export function weekPoint(
  w: { week: number; firstDay: number; lastDay: number },
  t: Tally,
  closed: boolean,
  recorded: boolean,
): WeekPoint {
  const base = { ...w, days: w.lastDay - w.firstDay + 1, done: t.done, eligible: t.eligible };
  if (!closed) return { ...base, share: t.eligible ? t.done / t.eligible : null, state: 'current' };
  if (!recorded && t.eligible > 0) return { ...base, share: null, state: 'unrecorded' };
  if (t.eligible === 0) return { ...base, share: null, state: 'none' };
  return { ...base, share: t.done / t.eligible, state: 'closed' };
}

/** The best finished full week, or null before the first one ends (a short first week never counts). */
export function bestWeek(points: WeekPoint[]): Records['bestWeek'] {
  let best: WeekPoint | null = null;
  for (const p of points) {
    if (p.state !== 'closed' || p.share === null || p.days < 7) continue;
    if (!best || p.share > best.share! + 1e-9 || (Math.abs(p.share - best.share!) < 1e-9 && p.done > best.done))
      best = p;
  }
  return best ? { week: best.week, share: best.share!, done: best.done, eligible: best.eligible } : null;
}

/** How much of the trend there is to read: finished weeks with a value. */
export const judgedWeeks = (points: WeekPoint[]) => points.filter((p) => p.state === 'closed').length;

/**
 * The heatmap's layout: one column per calendar week (Monday on top), program days in place and empty slots
 * before Day 1 and after Day 66, so every day sits on its real weekday.
 */
export function heatmapColumns(cells: DayCell[]): (DayCell | null)[][] {
  if (!cells.length) return [];
  const cols: (DayCell | null)[][] = [];
  let col: (DayCell | null)[] = Array.from({ length: cells[0].weekday }, () => null);
  for (const c of cells) {
    if (c.weekday === 0 && col.length) {
      cols.push(col);
      col = [];
    }
    col.push(c);
  }
  while (col.length < 7) col.push(null);
  cols.push(col);
  return cols;
}

/** The cell's base fields for a program day. */
export const cellBase = (startKey: string, day: number) => ({
  day,
  date: dateForDay(startKey, day),
  weekday: mondayIndex(startKey, day),
});

const list = (ids: string[], name: (id: string) => string) => ids.map(name).join(t('common.listSeparator'));

/** What a heatmap day shows when it's inspected: its state in words, and what was done or skipped. */
export function cellSummary(cell: DayCell, name: (id: string) => string): string {
  const n = cell.planned.length;
  const done = cell.done.length;
  const skipped = cell.skipped.length ? t('progress.cell.skipped', { list: list(cell.skipped, name) }) : '';
  const doneList = list(cell.done, name);
  switch (cell.state) {
    case 'full':
      return done === 1
        ? t('progress.cell.doneOne', { list: doneList })
        : t('progress.cell.doneAll', { count: done, list: doneList });
    case 'partial':
      return t('progress.cell.partial', { done, planned: n, list: doneList, skipped });
    case 'today':
      return done
        ? t('progress.cell.todaySoFar', { done, planned: n, list: doneList, skipped })
        : t('progress.cell.todayOpen', { skipped });
    case 'missed':
      return t('progress.cell.missed', { count: n });
    case 'skipped':
      return t('progress.cell.skippedOnly', { skipped });
    case 'rest':
      return t('progress.cell.rest');
    case 'unrecorded':
      return t('progress.cell.unrecorded');
    case 'future':
      return t('progress.cell.future');
  }
}

/** "Tue 3 Nov" for a date key, in the phone's language. */
export function shortDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  try {
    return new Date(y, m - 1, d).toLocaleDateString(language(), { weekday: 'short', day: 'numeric', month: 'short' });
  } catch {
    return key;
  }
}
