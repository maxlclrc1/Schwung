import type { HabitTrack } from './reset/tracking';

/** App appearance: follow the phone, or an explicit choice. */
export type ThemePreference = 'system' | 'light' | 'dark';

/** One program day's record. */
export type DayLog = {
  day: number;
  date: string; // YYYY-MM-DD, local
  /** Habit ids done that day: the only thing that decides completion. */
  completed: string[];
  /** Habit ids on the day's list when it was last edited. */
  planned: string[];
  /** Tracking details per habit (counter, strength session, skip, saved timer data). Optional. */
  track?: Record<string, HabitTrack>;
};
