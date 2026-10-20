export type Sleep = '<6h' | '6-7h' | '8h+';
export type Screen = '<3h' | '3-6h' | '6h+';
export type Frequency = 'never' | 'sometimes' | 'regularly';
export type Water = '<1L' | '1-2L' | '2L+';
export type Goal = 'energy' | 'focus' | 'discipline' | 'confidence';

export type Answers = {
  sleep: Sleep;
  screen: Screen;
  exercise: Frequency;
  water: Water;
  mind: Frequency;
  goal: Goal;
};

export type Level = 'easy' | 'medium' | 'hard';

export type Category = 'sleep' | 'screen' | 'exercise' | 'water' | 'mind' | 'focus' | 'discipline' | 'confidence';

export type LibraryHabit = {
  id: string;
  category: Category;
  title: string;
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
