import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { cover } from './cover';
import { Finale } from './Finale';

/*
 * The hand-off from set-up into the app. The finale is drawn above the whole navigator (the root layout's
 * <FinaleHost />), so on Begin Day 1 the app navigates to Habits at once, underneath it. Once the Habits page has
 * laid out and drawn (todayReady), one value on the UI thread, `cover`, fades the finale away (its words first, the
 * mountain last, so it settles into the panorama behind the tabs) while the Habits content rises the last few
 * points into place. No blank frame, no cut, nothing waits on React once it starts.
 */

type State = { habits: string[] | null; saved: boolean; entering: 'begin' | 'skip' | null; ready: boolean };
let state: State = { habits: null, saved: false, entering: null, ready: false };
const listeners = new Set<() => void>();
const update = (next: Partial<State>) => {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
};
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const useHandoff = () => useSyncExternalStore(subscribe, () => state);

const MS = { begin: 800, skip: 450, still: 250 };
let fallback: ReturnType<typeof setTimeout> | null = null;

/** Set-up confirmed: the program is created; show the finale over everything. */
export function showFinale(habits: string[]) {
  cover.set(1);
  update({ habits, saved: false, entering: null, ready: false });
}

/** The program is on disk: the way in can be offered. */
export function markSaved() {
  update({ saved: true });
}

/** Begin Day 1 (or Skip): go to Habits beneath the finale, then reveal it. Runs once. */
function enter(kind: 'begin' | 'skip') {
  if (state.entering || !state.saved) return;
  update({ entering: kind });
  if (router.canDismiss()) router.dismissAll();
  router.replace('/today');
  // If the page never reports (it always should), reveal anyway rather than hold the finale up.
  fallback = setTimeout(() => todayReady(), 1500);
}

/** The Habits page has laid out and drawn a frame: fade the finale away. */
export function todayReady() {
  if (!state.entering || state.ready) return;
  if (fallback) clearTimeout(fallback);
  fallback = null;
  update({ ready: true });
  const kind = state.entering;
  void AccessibilityInfo.isReduceMotionEnabled()
    .catch(() => false)
    .then((still) => {
      const duration = still ? MS.still : MS[kind];
      cover.set(
        withTiming(0, { duration, easing: Easing.out(Easing.quad) }, (finished) => {
          if (finished) scheduleOnRN(done);
        }),
      );
    });
}

function done() {
  update({ habits: null, saved: false, entering: null, ready: false });
}

/** Above the navigator in the root layout: the finale while it's up, and its fade into the app. */
export function FinaleHost() {
  const s = useHandoff();
  const fade = useAnimatedStyle(() => ({ opacity: cover.value }));
  if (!s.habits) return null;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, fade]} pointerEvents={s.entering ? 'none' : 'auto'}>
      <Finale habits={s.habits} saved={s.saved} entering={!!s.entering} onEnter={enter} />
    </Animated.View>
  );
}
