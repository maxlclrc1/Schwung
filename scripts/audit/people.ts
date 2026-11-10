/*
 * The 66-day audit's three people (docs/66_DAY_EXPERIENCE_AUDIT.md §2), shared by the audit simulation
 * (__tests__/journey66.test.ts) and the day-counting comparison (__tests__/dayCounting.test.ts). Read-only: nothing
 * here is part of the app.
 */
import * as P from '../../src/core/reset/pilot';
import type { Offer } from '../../src/core/reset/readiness';

export const START = '2026-01-05'; // a Monday: program weeks are calendar weeks

export type Behaviour = {
  /** Which of the habits asked of the day the person does (ids), given the day. */
  does: (d: number, asked: string[]) => string[];
  /** What the person does with an offer: accept, decline, or leave it (ignore). */
  onOffer: (d: number, o: { habitId: string; offer: Offer }) => 'accept' | 'decline' | 'ignore';
  /** Feedback the person gives on a day ("too easy"/"too hard"), per habit. */
  feedback?: (d: number, id: string) => 'too-easy' | 'too-hard' | null;
  /** Whether the person opens the app that day (default: yes). Only an opened app shows offers, moments, notes. */
  opens?: (d: number) => boolean;
  /** The weekly reflection answer (default: "about right"). */
  reflect?: (week: number) => 'easier' | 'right' | 'harder';
  /** Day counting only: habits not done that the person records the minimum for (where one is offered). */
  minimums?: (d: number, asked: string[]) => string[];
  /** Day counting only: habits not done that the person marks "Partially completed". */
  partials?: (d: number, asked: string[]) => string[];
  /** Day counting only: habits not done that the person skips. */
  skips?: (d: number, asked: string[]) => string[];
};

/** The habits the day asks for, as Habits shows them: due daily habits, and weekly ones still open. */
export const askedOn = (p: P.PilotProgram, d: number) =>
  p.habits.filter((id) => ['due', 'open'].includes(P.stateOn(p, id, d)));

export const answersA: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 45,
  activeDays: '1_2',
  wake: { kind: 'time', time: '07:00' },
};
export const startA = () =>
  P.createPilot(
    answersA,
    ['mind_read', 'move_walk', 'sleep_wake', 'mind_meditation'].map((habitId) => ({
      habitId,
      intensity: P.suggestedIntensity(habitId, answersA)!,
    })),
    START,
  )!;
/** A: everything in week 1; one habit dropped in week 2; from Day 14 two habits on two days in three; from Day 31
 *  one habit every other day; gone Days 51–65; back on Day 66 for one habit. */
export const behaviourA: Behaviour = {
  does: (d, asked) => {
    if (d <= 7) return asked;
    if (d <= 13) return asked.filter((id) => id !== 'mind_meditation');
    if (d <= 30) return d % 3 === 0 ? [] : asked.filter((id) => id === 'mind_read' || id === 'sleep_wake');
    if (d <= 50) return d % 2 === 0 ? asked.filter((id) => id === 'sleep_wake') : [];
    if (d <= 65) return [];
    return asked.filter((id) => id === 'sleep_wake');
  },
  onOffer: () => 'ignore',
  opens: (d) => !(d >= 51 && d <= 65),
  reflect: (w) => (w >= 2 ? 'harder' : 'right'),
};

export const answersB: P.PilotAnswers = {
  age: '18_29',
  precautions: [],
  minutesPerDay: 45,
  activeDays: '3_4',
  wake: { kind: 'time', time: '06:30' },
};
export const startB = () =>
  P.createPilot(
    answersB,
    ['mind_read', 'move_walk', 'sleep_wake'].map((habitId) => ({
      habitId,
      intensity: P.suggestedIntensity(habitId, answersB)!,
    })),
    START,
  )!;
/** B: four good days, then a week away (Days 5–11), back on Day 12 with two of three, then steady with a miss a
 *  week; accepts an easier target when offered. */
export const behaviourB: Behaviour = {
  does: (d, asked) => {
    if (d <= 4) return asked;
    if (d <= 11) return [];
    if (d === 12) return asked.slice(0, 2);
    return d % 7 === 6 ? [] : asked;
  },
  onOffer: (_d, o) => (o.offer.kind === 'step-down' ? 'accept' : 'decline'),
  opens: (d) => !(d >= 5 && d <= 11),
};

export const answersC: P.PilotAnswers = {
  age: '30_49',
  precautions: [],
  minutesPerDay: 90,
  activeDays: '5p',
  wake: { kind: 'time', time: '06:00' },
  strengthStart: 'regular',
  ownSessions: 3,
};
export const startC = () =>
  P.createPilot(
    answersC,
    ['focus_top3', 'mind_read', 'move_walk', 'sleep_wake', 'strength_log'].map((habitId) => ({
      habitId,
      intensity: P.suggestedIntensity(habitId, answersC)!,
    })),
    START,
  )!;
/** C: everything asked, every day; accepts every step up; says "too easy" on Day 8 of every habit. */
export const behaviourC: Behaviour = {
  does: (_d, asked) => asked,
  onOffer: (_d, o) => (o.offer.kind === 'step-up' ? 'accept' : 'decline'),
  feedback: (d) => (d === 8 ? 'too-easy' : null),
};
