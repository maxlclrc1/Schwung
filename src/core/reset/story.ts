import { LANDMARKS } from '../ascent';
import { dateForDay, PROGRAM_DAYS } from '../dates';
import * as C from './charts';
import * as P from './pilot';

/*
 * The 66-Day Story's facts, from the saved days only: the days completed (of 66, never rounded up), every habit
 * done, the longest streak, how many habits were practised, and at most one highlight the record actually supports.
 * No habit names: the story is made to be shared.
 */

export type StoryFacts = {
  /** Date keys of Day 1 and Day 66. */
  from: string;
  to: string;
  daysCompleted: number;
  totalDone: number;
  longestStreak: number;
  habits: number;
  /** Which days were complete (1-based), for the lights on the trail. */
  complete: number[];
  highlight: string | null;
};

export function storyFacts(p: P.PilotProgram, today: number): StoryFacts {
  const at = Math.max(today, PROGRAM_DAYS);
  const cells = C.dayCells(p, at);
  const complete = cells.filter((d) => d.state === 'full').map((d) => d.day);
  const records = C.records(p, at);
  const best = records.bestWeek;
  const milestones = Object.keys(LANDMARKS)
    .map(Number)
    .filter((d) => complete.includes(d));
  const highlight =
    best && best.share >= 0.6
      ? `Best week: Week ${best.week}, ${Math.round(best.share * 100)}% of habits done`
      : records.bestStreak >= 7
        ? `A ${records.bestStreak}-day run along the way`
        : milestones.length
          ? `${milestones.length} milestone day${milestones.length === 1 ? '' : 's'} completed`
          : null;
  return {
    from: p.startedAt,
    to: dateForDay(p.startedAt, PROGRAM_DAYS),
    daysCompleted: complete.length,
    totalDone: P.totalCompleted(p),
    longestStreak: records.bestStreak,
    habits: P.allHabits(p).length,
    complete,
    highlight,
  };
}

/** The story is there once the 66 days are done (the summit seen, or any day after Day 66). */
export const storyAvailable = (p: P.PilotProgram, today: number) => !!p.ceremonies?.summit || today > PROGRAM_DAYS;
