export type Sleep = '<5h' | '5-6h' | '6-7h' | '7-8h' | '8h+';
export type Screen = '<2h' | '2-4h' | '4-6h' | '6-8h' | '8h+';
export type Exercise = 'never' | 'rarely' | '1-2x' | '3-4x' | '5x+'; // per week
export type Water = '<0.5L' | '0.5-1L' | '1-2L' | '2-3L' | '3L+';
export type Mind = 'never' | 'rarely' | 'weekly' | 'most-days' | 'daily';
export type Goal = 'energy' | 'focus' | 'discipline' | 'confidence' | 'calm' | 'fitness';

export type Answers = {
  sleep: Sleep;
  screen: Screen;
  exercise: Exercise;
  water: Water;
  mind: Mind;
  goal: Goal;
};

export type Level = 'easy' | 'medium' | 'hard';

export type Category = 'sleep' | 'screen' | 'exercise' | 'water' | 'mind' | 'focus' | 'discipline' | 'confidence';

export type LibraryHabit = {
  id: string;
  category: Category;
  title: string;
  /** Ionicons glyph name. */
  icon: string;
  levels: Record<Level, string>;
  why: string;
};

export type PlanHabit = {
  habitId: string;
  custom?: { title: string; description?: string };
  level: Level;
  addedOnDay: number;
  /** Consecutive-day counters (level-up offers, step-downs) only look at days after this one. */
  levelSince: number;
};

export type DayLog = {
  day: number;
  date: string; // YYYY-MM-DD, local
  completed: string[]; // habitIds
  /** Habit ids that were in the plan when this day was last edited. */
  planned: string[];
};

export type Notice =
  | { id: string; kind: 'stepDown'; habitIds: string[]; day: number }
  | { id: string; kind: 'phaseUp'; phase: 2 | 3; day: number };
