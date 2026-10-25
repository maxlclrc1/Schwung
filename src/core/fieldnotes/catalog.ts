import { exclusion } from '../v2/engine';
import { DEV_CLEARED } from '../v2/gate';
import { BY_ID } from '../v2/library';
import type { ProfileV2 } from '../v2/types';
import type { Experiment, FnGoal, FnProfile } from './types';

/*
 * What Field Notes offers. Every experiment uses a reviewed Schwung habit (the release gate, so never a held or
 * prototype exercise habit) and passes the same eligibility rules as a Schwung plan. Its daily action is the
 * smallest step of that habit's own ladder; "easier" is a smaller version of the same action.
 */

export const GOALS: { id: FnGoal; title: string; sub: string }[] = [
  { id: 'focus', title: 'What helps me focus', sub: 'Sharper attention, fewer scattered hours' },
  { id: 'energy', title: 'What gives me energy', sub: 'Feeling more awake through the day' },
  { id: 'calm', title: 'What helps me feel calm', sub: 'Less tension, more ease' },
  { id: 'confidence', title: 'What builds my confidence', sub: 'Feeling surer of yourself with people' },
];

/** The one thing noticed each evening, on a labelled 1–5 scale. Self-reported, never a measurement. */
export const OBSERVATION: Record<FnGoal, { noun: string; question: string; low: string; high: string }> = {
  focus: { noun: 'focus', question: 'How focused did today feel?', low: 'Scattered', high: 'Very focused' },
  energy: { noun: 'energy', question: 'How was your energy today?', low: 'Drained', high: 'Full of energy' },
  calm: { noun: 'calm', question: 'How calm did today feel?', low: 'Tense', high: 'Very calm' },
  confidence: {
    noun: 'confidence',
    question: 'How confident did you feel today?',
    low: 'Unsure',
    high: 'Very confident',
  },
};

type Def = { id: string; goal: FnGoal; habitId: string; question: string; easier: string };

/** In each goal's order of suggestion. */
const DEFS: Def[] = [
  {
    id: 'focus_phone_free_start',
    goal: 'focus',
    habitId: 'screen_morning',
    question: 'Does a phone-free start make my mornings sharper?',
    easier: 'No phone for the first 5 min after waking (an alarm doesn’t count)',
  },
  {
    id: 'focus_read',
    goal: 'focus',
    habitId: 'mind_read',
    question: 'Does a little reading help me focus?',
    easier: 'Read one page',
  },
  {
    id: 'focus_block',
    goal: 'focus',
    habitId: 'focus_deepwork',
    question: 'Does one protected focus block change my day?',
    easier: '5 min of focused work, phone in another room',
  },
  {
    id: 'energy_walk',
    goal: 'energy',
    habitId: 'move_walk',
    question: 'Does a short walk change my energy?',
    easier: 'Step outside and walk for 2 min at a comfortable pace',
  },
  {
    id: 'energy_daylight',
    goal: 'energy',
    habitId: 'sleep_morning_light',
    question: 'Does daylight early in the day change my energy?',
    easier: 'Step outside for 2 min in the morning',
  },
  {
    id: 'energy_wind_down',
    goal: 'energy',
    habitId: 'sleep_no_phone_bed',
    question: 'Does a phone-free wind-down change how I feel the next day?',
    easier: 'Phone away 5 min before bed',
  },
  {
    id: 'calm_breathe',
    goal: 'calm',
    habitId: 'mind_breathe',
    question: 'Do a few slow minutes change how calm I feel?',
    easier: '5 slow breaths',
  },
  {
    id: 'calm_journal',
    goal: 'calm',
    habitId: 'mind_journal',
    question: 'Does writing a line about my day help me feel calmer?',
    easier: 'Write 3 words about your day',
  },
  {
    id: 'calm_wind_down',
    goal: 'calm',
    habitId: 'sleep_no_phone_bed',
    question: 'Does a phone-free wind-down help me feel calmer?',
    easier: 'Phone away 5 min before bed',
  },
  {
    id: 'confidence_reach_out',
    goal: 'confidence',
    habitId: 'social_reach_out',
    question: 'Does reaching out to someone change how I feel?',
    easier: 'Reply to one message from someone you care about',
  },
  {
    id: 'confidence_compliment',
    goal: 'confidence',
    habitId: 'confidence_compliment',
    question: 'Does giving a genuine compliment change how confident I feel?',
    easier: 'Notice one thing you appreciate about someone (saying it is optional)',
  },
  {
    id: 'confidence_talk',
    goal: 'confidence',
    habitId: 'confidence_talk',
    question: 'Does one real conversation change how confident I feel?',
    easier: 'Ask one person a question about their day',
  },
];

/** Experiments that involve moving or breathing exercises: never offered when health answers were not given. */
const NEEDS_HEALTH_ANSWERS = new Set(['move_walk', 'mind_breathe']);

/**
 * The profile the eligibility rules see. A Schwung profile is copied (never changed); otherwise neutral answers
 * that keep every action at the bottom of its ladder.
 */
export function eligibilityProfile(goal: FnGoal, fn: FnProfile, schwung: ProfileV2 | null): ProfileV2 {
  if (schwung && fn.fromSchwung) return { ...schwung, goal };
  return {
    age: fn.age,
    goal,
    sleepHours: '7_8',
    sleepTrouble: 'rarely',
    activeDays: '0',
    produce: '3_4',
    phone: '6p',
    phonePull: 'mix',
    routines: [],
    precautions: fn.precautions,
  };
}

export type Option = Experiment & { easier: string; habitTitle: string; why: string; notes: string[] };

/** The experiments this person can run for a goal, suggested one first. Empty when none fits. */
export function experimentOptions(goal: FnGoal, fn: FnProfile, schwung: ProfileV2 | null = null): Option[] {
  const p = eligibilityProfile(goal, fn, schwung);
  return DEFS.filter((d) => d.goal === goal)
    .filter((d) => {
      const h = BY_ID[d.habitId];
      if (!h || !DEV_CLEARED.has(h.id)) return false;
      if (fn.precautions === 'unknown' && NEEDS_HEALTH_ANSWERS.has(h.id)) return false;
      return exclusion(h, p, DEV_CLEARED) === null;
    })
    .map((d) => {
      const h = BY_ID[d.habitId];
      return {
        id: d.id,
        habitId: d.habitId,
        question: d.question,
        // The first rung of the person's own ladder: the smallest version Schwung has for them.
        action: h.ladder(p)[0],
        easier: d.easier,
        habitTitle: h.title,
        why: h.why,
        notes: h.note ? [h.note] : [],
      };
    });
}

export const experimentById = (id: string) => DEFS.find((d) => d.id === id);

/** Whether a goal would need the health question to decide what can be offered. */
export const goalNeedsHealthAnswers = (goal: FnGoal) =>
  DEFS.some((d) => d.goal === goal && NEEDS_HEALTH_ANSWERS.has(d.habitId));
