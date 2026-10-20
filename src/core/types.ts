/** Every value each quiz answer can take. The answer types below are derived from these lists. */
export const ANSWER_VALUES = {
  sleep: ['<5h', '5-6h', '6-7h', '7-8h', '8h+'],
  screen: ['<2h', '2-4h', '4-6h', '6-8h', '8h+'],
  exercise: ['never', 'rarely', '1-2x', '3-4x', '5x+'], // per week
  water: ['<0.5L', '0.5-1L', '1-2L', '2-3L', '3L+'],
  mind: ['never', 'rarely', 'weekly', 'most-days', 'daily'],
  goal: ['energy', 'focus', 'discipline', 'confidence', 'calm', 'fitness'],
} as const;

export type Sleep = (typeof ANSWER_VALUES.sleep)[number];
export type Screen = (typeof ANSWER_VALUES.screen)[number];
export type Exercise = (typeof ANSWER_VALUES.exercise)[number];
export type Water = (typeof ANSWER_VALUES.water)[number];
export type Mind = (typeof ANSWER_VALUES.mind)[number];
export type Goal = (typeof ANSWER_VALUES.goal)[number];

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
