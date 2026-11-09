import { Easing, FadeIn, FadeOut, LinearTransition, ReduceMotion, withTiming } from 'react-native-reanimated';

/*
 * Schwung's shared motion vocabulary (docs/INTERACTION_AUDIT.md §4). One easing curve, a few durations, and every
 * animation follows the phone's Reduce Motion setting. Onboarding's page timings (components/onboarding/kit.tsx
 * DURATION), the pager's spring and the native sheet and stack transitions keep their own, unchanged.
 */

/** The one easing curve: a quick start that settles softly. */
export const EASE = Easing.bezier(0.22, 1, 0.36, 1);

/** Durations in ms. */
export const MOTION = {
  /** A control dimming as a finger lands on it. */
  pressIn: 70,
  /** The control returning once the finger lifts. */
  pressOut: 200,
  /** A choice's wash, mark and label weight; a button becoming available. */
  select: 180,
  /** Inline content appearing (a message, a confirmation, a stepper). */
  reveal: 200,
  /** Inline content going. */
  conceal: 150,
  /** Siblings moving when something above opens or closes. */
  reflow: 240,
} as const;

/** How far a row, link or secondary control dims while held. */
export const PRESS_DIM = 0.6;

export type MotionToken = keyof typeof MOTION;

/** A timing on the shared curve for one of the tokens; follows Reduce Motion. */
export const timing = (to: number, token: MotionToken) => {
  'worklet';
  return withTiming(to, { duration: MOTION[token], easing: EASE, reduceMotion: ReduceMotion.System });
};

/** Siblings moving into place when content opens or closes above them. */
export const reflow = () => LinearTransition.duration(MOTION.reflow).easing(EASE).reduceMotion(ReduceMotion.System);

/** Inline content appearing in place (a message, a confirmation, a stepper): a fade, nothing moving. */
export const reveal = () => FadeIn.duration(MOTION.reveal).easing(EASE).reduceMotion(ReduceMotion.System);

/** Inline content going: a shorter fade, so what replaces it is never kept waiting. */
export const conceal = () => FadeOut.duration(MOTION.conceal).easing(EASE).reduceMotion(ReduceMotion.System);
