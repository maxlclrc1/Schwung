import { doneCount, logForDay, Logs } from './progression';
import type { PlanHabit } from './types';

/*
 * The comeback: a quiet welcome on Today for someone returning after one or more days with nothing
 * checked. Derived entirely from existing logs on every render. Nothing is stored, written or
 * back-filled, so it can't touch the program, streaks, XP or the 80% rule.
 */

export type Comeback = {
  /** Days in a row before today with nothing checked. */
  away: number;
  /** Most recent day with at least one check-off, or 0 if there isn't one yet. */
  lastActiveDay: number;
  /** True once anything on today's list is checked. The welcome then steps aside. */
  resumed: boolean;
  /** The habit suggested as the one first step: the one they've done most often (plan order on ties). */
  suggestion: string | null;
};

export type ComebackInput = {
  plan: PlanHabit[];
  logs: Logs;
  startKey: string;
  today: number;
  /** Before noon, yesterday can still be filled in, so on its own it isn't a missed day yet. */
  yesterdayEditable: boolean;
};

const active = (logs: Logs, startKey: string, day: number) => {
  const log = logForDay(logs, startKey, day);
  return !!log && doneCount(log) > 0;
};

export function comebackFor({ plan, logs, startKey, today, yesterdayEditable }: ComebackInput): Comeback | null {
  if (today <= 1 || !plan.length) return null;
  let lastActiveDay = 0;
  for (let d = today - 1; d >= 1; d--) {
    if (active(logs, startKey, d)) {
      lastActiveDay = d;
      break;
    }
  }
  const away = today - 1 - lastActiveDay;
  // Only days that can no longer be edited count as missed.
  const lastFinal = yesterdayEditable ? today - 2 : today - 1;
  if (lastFinal - lastActiveDay < 1) return null;

  const todayLog = logForDay(logs, startKey, today);
  const counts = new Map<string, number>();
  for (const log of Object.values(logs)) {
    if (log.day >= today) continue;
    for (const id of log.completed) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  let suggestion = plan[0].habitId;
  for (const h of plan) if ((counts.get(h.habitId) ?? 0) > (counts.get(suggestion) ?? 0)) suggestion = h.habitId;

  return { away, lastActiveDay, resumed: !!todayLog && doneCount(todayLog) > 0, suggestion };
}

/** Calm, specific copy. Never counts what was missed against them and never asks them to catch up. */
export function comebackCopy(c: Pick<Comeback, 'away' | 'lastActiveDay'>): { head: string; body: string } {
  const kept = c.lastActiveDay > 0 ? 'Everything you’ve built is still here. ' : '';
  if (c.away <= 1) {
    return {
      head: 'Welcome back.',
      body: 'Yesterday was a pause, not a reset. One habit is enough to get today moving.',
    };
  }
  if (c.away < 7) {
    return { head: 'Welcome back.', body: `${kept}No catching up needed. Start with one habit and go from there.` };
  }
  return {
    head: 'Good to see you again.',
    body: `${kept}Today is a fresh step on the same trail. Start with one small thing.`,
  };
}

export const RESUMED_COPY = {
  head: 'You’re back.',
  body: 'That first one is the hardest. Take the rest at your pace.',
};
