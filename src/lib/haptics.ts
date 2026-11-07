import * as Haptics from 'expo-haptics';
import { AppState, Platform } from 'react-native';

/*
 * Schwung's one haptic vocabulary, by meaning rather than by motor:
 * - select: choosing something (an answer, a level, an option, a button);
 * - tick: a discrete step under the finger (a picker stop, a swipe crossing its threshold), rate-limited;
 * - complete: a habit done. One Light impact: a quiet confirmation, meant to still feel right on the thousandth
 *   habit (the system Success pattern, a double pulse, is kept for the whole day being complete);
 * - confirm: something saved or changed (a setting, a confirmed change);
 * - undo: a habit un-done: a light selection tick, never a second "done";
 * - success: a moment that matters (the whole day complete, a milestone's light, starting the reset);
 * - warning: not possible right now, said gently (a crisp tap, never the long buzz);
 * - press: holding something open (a long-press for details).
 *
 * One interaction, one haptic: a haptic is skipped only if an equal or stronger one fired in the same instant
 * (DUPLICATE_MS: a button's own select right after its action already confirmed). Separate taps always play.
 *
 * Background: haptics are only held back after the app has actually gone to the background. (Not by reading
 * AppState.currentState: on iOS it can still say "inactive" long after launch, which silenced every haptic.)
 * Failures are logged in development and ignored in release; a phone without haptics simply stays still. iOS plays
 * them only when the person's System Haptics setting is on. Never on the web (expo-haptics would vibrate there).
 */

const PRIORITY = { tick: 0, select: 1, undo: 2, confirm: 2, warning: 2, complete: 3, press: 3, success: 4 } as const;
type Kind = keyof typeof PRIORITY;
const DUPLICATE_MS = 80;
const TICK_GAP_MS = 40;

let inBackground = false;
AppState.addEventListener('change', (s) => {
  inBackground = s === 'background';
});

let last = { at: 0, priority: -1 };

function fire(kind: Kind, play: () => Promise<void>) {
  if (inBackground || Platform.OS === 'web') return;
  const now = Date.now();
  const priority = PRIORITY[kind];
  if (kind === 'tick' && now - last.at < TICK_GAP_MS) return;
  if (now - last.at < DUPLICATE_MS && last.priority >= priority) return;
  last = { at: now, priority };
  play().catch((e: unknown) => {
    if (__DEV__) console.warn(`[haptics] ${kind} failed:`, e);
  });
}

export const haptic = {
  select: () => fire('select', () => Haptics.selectionAsync()),
  tick: () => fire('tick', () => Haptics.selectionAsync()),
  complete: () => fire('complete', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  confirm: () => fire('confirm', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  undo: () => fire('undo', () => Haptics.selectionAsync()),
  success: () => fire('success', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => fire('warning', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
  press: () => fire('press', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** A light arriving in a scene (a ceremony's first light): soft, once. */
  land: () => fire('confirm', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
};

/**
 * A habit's completion feedback, from what actually changed (the program's tracking event): completed, undone, or
 * nothing (a cancelled swipe, an idempotent repeat, a change that couldn't be made) and so no haptic.
 */
export function completionHaptic(event: { kind: 'completed' | 'uncompleted' } | null | undefined | void) {
  if (!event) return;
  if (event.kind === 'completed') haptic.complete();
  else haptic.undo();
}
