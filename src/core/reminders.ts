import { dayNumber, toDateKey } from './dates';

/*
 * The optional daily reminder, planned as plain data (the scheduling itself is lib/reminders.ts). One gentle line a
 * day at the person's time, for the next REMINDER_DAYS days, re-planned whenever the app opens or anything changes:
 * nothing piles up, a day already complete gets none, and a phone left alone for two weeks simply goes quiet.
 * Never guilt, urgency or streak threats. Habit names only when the person asked for them (they can show on the
 * lock screen), and then only now and then.
 */

export const REMINDER_DAYS = 14;

export type ReminderSettings = {
  enabled: boolean;
  /** Local time, 0–23 and 0–59. */
  hour: number;
  minute: number;
  /** Mention a habit by name now and then (off by default: it can show on the lock screen). */
  showHabits: boolean;
};

export const DEFAULT_REMINDERS: ReminderSettings = { enabled: false, hour: 9, minute: 0, showHabits: false };

const LINES: { title: string; body: string }[] = [
  { title: 'A little momentum today?', body: 'One small step is plenty.' },
  { title: 'Your next step is waiting.', body: 'Whenever you’re ready.' },
  { title: 'The trail’s right where you left it.', body: 'A few minutes is all it takes.' },
  { title: 'A good moment for a small step.', body: 'Your habits are ready when you are.' },
  { title: 'Fresh air on the trail today.', body: 'Whatever today holds, a small step counts.' },
  { title: 'Still climbing, one day at a time.', body: 'Today’s step can be a small one.' },
  { title: 'The view gets better from here.', body: 'Open Schwung for today’s habits.' },
];

/** The line that names a habit (only when the person asked for names). */
export function habitLine(name: string): { title: string; body: string } {
  return { title: `Time for a little ${name}?`, body: 'One small step is plenty.' };
}

/** Today's words: rotating by date (so a day's line is stable), sometimes naming a habit if allowed. */
export function reminderText(
  dateKey: string,
  programDay: number,
  habitNames: string[] | null,
): { title: string; body: string } {
  const seed = Number(dateKey.replace(/-/g, '')) || 0;
  if (habitNames?.length && seed % 3 === 0) return habitLine(habitNames[Math.floor(seed / 3) % habitNames.length]);
  const line = LINES[seed % LINES.length];
  return programDay >= 1 && programDay <= 66 && seed % 5 === 1
    ? { title: `Day ${programDay} of your Life Reset.`, body: line.body }
    : line;
}

export type PlannedReminder = { id: string; date: Date; title: string; body: string };

/**
 * The reminders to schedule from `now`: one a day at the chosen time, starting today if that time is still ahead
 * and today isn't already complete, for REMINDER_DAYS days. Ids are by date, so the plan never holds two for a day.
 */
export function planReminders(
  s: ReminderSettings,
  program: { startedAt: string; after?: unknown } | null,
  now: Date,
  opts: { todayComplete: boolean; habitNames: string[] },
): PlannedReminder[] {
  if (!s.enabled || !program) return [];
  const out: PlannedReminder[] = [];
  for (let i = 0; i < REMINDER_DAYS; i++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, s.hour, s.minute, 0, 0);
    // Past (or within the next minute): skip it, never fire late.
    if (date.getTime() <= now.getTime() + 60_000) continue;
    if (i === 0 && opts.todayComplete) continue;
    const key = toDateKey(date);
    const day = dayNumber(program.startedAt, key);
    if (day < 1) continue;
    // Past the summit, reminders wait until the person chooses how to go on (Keep My Momentum, or a New Ascent).
    if (day > 66 && !program.after) continue;
    out.push({ id: `schwung-reminder-${key}`, date, ...reminderText(key, day, s.showHabits ? opts.habitNames : null) });
  }
  return out;
}

/** Keeps only a well-formed saved setting. */
export function sanitizeReminders(x: unknown): ReminderSettings {
  const r = (x ?? {}) as Partial<ReminderSettings>;
  const int = (v: unknown, lo: number, hi: number, d: number) =>
    typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : d;
  return {
    enabled: r.enabled === true,
    hour: int(r.hour, 0, 23, DEFAULT_REMINDERS.hour),
    minute: int(r.minute, 0, 59, DEFAULT_REMINDERS.minute),
    showHabits: r.showHabits === true,
  };
}
