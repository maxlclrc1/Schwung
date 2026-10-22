import type { Answers, Goal } from './types';

/*
 * How each quiz answer is worded. Shared by the quiz and the screens that quote answers back,
 * so the user always sees their own answer in the same words.
 */

type Labels = { [K in keyof Answers]: Record<Answers[K], string> };

export const ANSWER_LABEL: Labels = {
  goal: {
    energy: 'More energy',
    focus: 'Better focus',
    discipline: 'More discipline',
    confidence: 'More confidence',
    calm: 'Less stress',
    fitness: 'Get in shape',
  },
  sleep: {
    '<5h': 'Less than 5 hours',
    '5-6h': '5–6 hours',
    '6-7h': '6–7 hours',
    '7-8h': '7–8 hours',
    '8h+': '8 hours or more',
  },
  screen: {
    '<2h': 'Under 2 hours',
    '2-4h': '2–4 hours',
    '4-6h': '4–6 hours',
    '6-8h': '6–8 hours',
    '8h+': 'More than 8 hours',
  },
  exercise: {
    never: 'Never',
    rarely: 'A few times a month',
    '1-2x': '1–2 times a week',
    '3-4x': '3–4 times a week',
    '5x+': '5+ times a week',
  },
  water: {
    '<0.5L': 'Less than 2 glasses',
    '0.5-1L': '2–4 glasses',
    '1-2L': '4–8 glasses',
    '2-3L': '8–12 glasses',
    '3L+': 'More than 12 glasses',
  },
  mind: {
    never: 'Never',
    rarely: 'Rarely',
    weekly: 'About once a week',
    'most-days': 'Most days',
    daily: 'Every day',
  },
};

export const GOAL_DETAIL: Record<Goal, { icon: string; sub: string }> = {
  energy: { icon: 'battery-charging', sub: 'Feel awake all day' },
  focus: { icon: 'locate', sub: 'Get the important things done' },
  discipline: { icon: 'shield-checkmark', sub: 'Do what you said you’d do' },
  confidence: { icon: 'happy', sub: 'Feel at ease with people' },
  calm: { icon: 'leaf', sub: 'Feel calmer day to day' },
  fitness: { icon: 'fitness', sub: 'Move more, feel stronger' },
};
