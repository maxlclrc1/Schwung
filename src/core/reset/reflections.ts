import { t } from '../../i18n';
import { PROGRAM_DAYS } from '../dates';

/*
 * Weekly reflections: after each program week (Days 1–7, 8–14, … the ninth ends on Day 63), one gentle question:
 * how did the habits feel? Only the latest finished week is ever offered, so someone who comes back late gets one
 * invitation, never a stack. Answers are kept on the phone with the program; a reflection never changes anything
 * by itself (any easier or harder target is the person's explicit choice, through the existing rules).
 */

export type ReflectionAnswer = 'easier' | 'right' | 'harder';

export type Reflection = {
  week: number;
  /** Absent when the invitation was put off ("Not now"). */
  answer?: ReflectionAnswer;
  /** The program day it was answered (or put off). */
  day: number;
  /** Habits whose target the person chose to change from it. */
  changed?: string[];
};

export const REFLECTION_WEEKS = Math.floor(PROGRAM_DAYS / 7);

export const reflectionDays = (week: number) => ({ from: week * 7 - 6, to: week * 7 });

/** The latest program week that has finished by `today` (0 before the first). */
export const lastFinishedWeek = (today: number) => Math.max(0, Math.min(REFLECTION_WEEKS, Math.floor((today - 1) / 7)));

/** The week to invite a reflection for: the latest finished one, if it has no answer and wasn't put off. */
export function dueReflection(reflections: Record<string, Reflection> | undefined, today: number): number | null {
  const w = lastFinishedWeek(today);
  return w >= 1 && !reflections?.[w] ? w : null;
}

export const ANSWER_WORDS: Record<ReflectionAnswer, string> = {
  get easier() {
    return t('progress.answer.easier');
  },
  get right() {
    return t('progress.answer.right');
  },
  get harder() {
    return t('progress.answer.harder');
  },
};

/** Keeps only well-formed reflections from a save. */
export function sanitizeReflections(x: unknown): Record<string, Reflection> | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const out: Record<string, Reflection> = {};
  for (const [k, v] of Object.entries(x as Record<string, unknown>)) {
    const r = v as Partial<Reflection> | null;
    const week = Number(k);
    if (!r || !Number.isInteger(week) || week < 1 || week > REFLECTION_WEEKS || r.week !== week) continue;
    if (typeof r.day !== 'number' || !Number.isFinite(r.day)) continue;
    out[k] = {
      week,
      day: r.day,
      ...(r.answer && r.answer in ANSWER_WORDS ? { answer: r.answer } : {}),
      ...(Array.isArray(r.changed) ? { changed: r.changed.filter((s): s is string => typeof s === 'string') } : {}),
    };
  }
  return Object.keys(out).length ? out : undefined;
}
