import { cellBase, type DayCell, type Records, type Tally, weekPoint, type WeekPoint, bestWeek } from '../charts';
import { dateForDay, PROGRAM_DAYS } from '../dates';
import * as P from './pilot';
import { programWeeks } from './weekly';

/*
 * The Life Reset's Insights charts, from its saved days only. The weekly trend adds up exactly the
 * opportunities the overall consistency counts (pilot.ts habitTally, week by week), so the two always agree. Rules:
 * SCHWUNG_LIFE_RESET_PROGRAM.md ("Insights charts").
 */

const hasLog = (p: P.PilotProgram, day: number) => p.logs[dateForDay(p.startedAt, day)] !== undefined;

/** Each program week up to this one: done ÷ eligible over every habit, with its state. */
export function weeklyTrend(p: P.PilotProgram, today: number): WeekPoint[] {
  const last = Math.min(today, PROGRAM_DAYS);
  const byHabit = P.allHabits(p).map((id) => ({
    id,
    weeks: new Map(P.habitWeeks(p, id, last).map((w) => [w.week, w])),
  }));
  return programWeeks(p.startedAt)
    .filter((w) => w.firstDay <= last)
    .map((w) => {
      const t: Tally = { done: 0, eligible: 0 };
      for (const h of byHabit) {
        const s = h.weeks.get(w.week);
        if (!s) continue;
        const x = P.weekTallyOf(p, h.id, s, today);
        t.done += x.done;
        t.eligible += x.eligible;
      }
      let recorded = false;
      for (let d = w.firstDay; d <= Math.min(w.lastDay, last) && !recorded; d++) recorded = hasLog(p, d);
      return weekPoint(w, t, w.lastDay < today, recorded);
    });
}

/** Every program day, Day 1 to 66, with what was done, skipped and due on it. */
export function dayCells(p: P.PilotProgram, today: number): DayCell[] {
  const out: DayCell[] = [];
  for (let d = 1; d <= PROGRAM_DAYS; d++) {
    const base = cellBase(p.startedAt, d);
    if (d > today) {
      out.push({ ...base, state: 'future', done: [], skipped: [], planned: [] });
      continue;
    }
    const log = p.logs[base.date];
    // Every habit that was in the program that day (one removed later still counts for its days).
    const ids = P.allHabits(p);
    const done = ids.filter((id) => log?.completed.includes(id));
    const skipped = ids.filter((id) => !done.includes(id) && P.trackOf(p, id, d).skipped);
    const dailyDue = ids.filter((id) => P.isDaily(p, id, d));
    // The day's list as the 80% rule sees it: daily habits, plus weekly ones done that day.
    const planned = log ? P.plannedOn(p, d, log.completed) : dailyDue;
    const full = P.dayFull(p, d);
    const state: DayCell['state'] = full
      ? 'full'
      : d === today
        ? 'today'
        : done.length
          ? 'partial'
          : skipped.length
            ? 'skipped'
            : dailyDue.length === 0
              ? 'rest'
              : log
                ? 'missed'
                : 'unrecorded';
    out.push({ ...base, state, done, skipped, planned });
  }
  return out;
}

export type HabitBar = {
  id: string;
  /** Daily habits by the day; weekly ones by their weekly goal (sessions credited toward it). */
  kind: 'daily' | 'weekly';
  tally: Tally;
  /** Weekly habits: finished weeks whose goal was met, of finished weeks with a goal. */
  weeksMet: number;
  weeksJudged: number;
};

/** Each habit's consistency, for the breakdown's bars. */
export function habitBars(p: P.PilotProgram, today: number): HabitBar[] {
  const last = Math.min(today, PROGRAM_DAYS);
  return p.habits.map((id) => {
    const weeks = P.habitWeeks(p, id, last);
    const judged = weeks.filter((w) => w.status === 'achieved' || w.status === 'not-achieved');
    return {
      id,
      kind: P.isDaily(p, id, last) ? 'daily' : 'weekly',
      tally: P.habitTally(p, id, today),
      weeksMet: judged.filter((w) => w.status === 'achieved' && w.closed).length,
      weeksJudged: judged.filter((w) => w.closed).length,
    };
  });
}

const daysDone = (p: P.PilotProgram, id: string) =>
  Object.values(p.logs).filter((l) => l.completed.includes(id)).length;

/** The personal records: counts of what was actually done, never minutes or hours. */
export function records(p: P.PilotProgram, today: number, trend = weeklyTrend(p, today)): Records {
  return {
    bestWeek: bestWeek(trend),
    total: P.totalCompleted(p),
    readingDays: P.allHabits(p).includes('mind_read') ? daysDone(p, 'mind_read') : null,
    strengthSessions: P.allHabits(p).includes('strength_log') ? daysDone(p, 'strength_log') : null,
    bestStreak: P.journeyStats(p, today).best,
  };
}
