import * as Haptics from 'expo-haptics';
import { AppState } from 'react-native';

/*
 * Schwung's one haptic vocabulary, by meaning rather than by motor:
 * - select: choosing something (an answer, a level, an option, a button);
 * - tick: a discrete step under the finger (a picker stop, a swipe crossing its threshold), rate-limited;
 * - confirm: something done or saved (a habit completed, a setting changed, a change confirmed);
 * - undo: the soft opposite (a habit un-done);
 * - success: a moment that matters (the whole day complete, a milestone's light, starting the reset);
 * - warning: not possible right now, said gently (a crisp tap, never the long warning buzz);
 * - press: holding something open (a long-press for details).
 *
 * One interaction, one haptic: a haptic is skipped if an equal or stronger one fired just before (a button's
 * own select after its action already confirmed, two parts of one gesture). Nothing fires while the app isn't in
 * the foreground; a phone without haptics (or with system haptics off) simply stays still.
 */

const PRIORITY = { tick: 0, select: 1, undo: 2, confirm: 2, warning: 2, press: 3, success: 4 } as const;
type Kind = keyof typeof PRIORITY;
const WINDOW_MS = 140;
const TICK_GAP_MS = 45;

let last = { at: 0, priority: -1 };

function fire(kind: Kind, play: () => Promise<void>) {
  if (AppState.currentState !== 'active') return;
  const now = Date.now();
  const priority = PRIORITY[kind];
  if (kind === 'tick' && now - last.at < TICK_GAP_MS) return;
  if (now - last.at < WINDOW_MS && last.priority >= priority) return;
  last = { at: now, priority };
  // Haptics are a nicety; never let a failure surface to the user.
  play().catch(() => {});
}

export const haptic = {
  select: () => fire('select', () => Haptics.selectionAsync()),
  tick: () => fire('tick', () => Haptics.selectionAsync()),
  confirm: () => fire('confirm', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  undo: () => fire('undo', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
  success: () => fire('success', () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () => fire('warning', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid)),
  press: () => fire('press', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
  /** A light arriving in a scene (a ceremony's first light): soft, once. */
  land: () => fire('confirm', () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft)),
};
