import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ceremonyCover, setCeremonyState } from '../ceremony/state';
import { cover } from './cover';
import { Finale } from './Finale';

/*
 * The hand-off from set-up into the app. The finale is drawn above the whole navigator (the root layout's
 * <FinaleHost />, over <CeremonyHost />). On Begin Day 1 the Day 1 ceremony is drawn beneath it, Habits is opened
 * beneath both, and one value on the UI thread, `cover`, fades the finale away (its words first, the mountain
 * last) into the ceremony, which later fades into Habits. No blank frame, no cut.
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

const MS = { begin: 700, skip: 400, still: 250 };

/** Set-up confirmed: the program is created; show the finale over everything. */
export function showFinale(habits: string[]) {
  cover.set(1);
  setCeremonyState({ finaleUp: true, day1FromFinale: false });
  update({ habits, saved: false, entering: null, ready: false });
}

/** The program is on disk: the way in can be offered. */
export function markSaved() {
  update({ saved: true });
}

/**
 * Begin Day 1 (or Skip): the Day 1 ceremony comes up beneath the finale (CeremonyHost), Habits is opened beneath
 * both, and the finale fades away into the ceremony. Runs once.
 */
function enter(kind: 'begin' | 'skip') {
  if (state.entering || !state.saved) return;
  update({ entering: kind });
  ceremonyCover.set(1);
  setCeremonyState({ finaleUp: false, day1FromFinale: true });
  if (router.canDismiss()) router.dismissAll();
  router.replace('/today');
  // Two frames, so the ceremony is drawn beneath before the finale starts to clear.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      void AccessibilityInfo.isReduceMotionEnabled()
        .catch(() => false)
        .then((still) => {
          cover.set(
            withTiming(0, { duration: still ? MS.still : MS[kind], easing: Easing.out(Easing.quad) }, (finished) => {
              if (finished) scheduleOnRN(done);
            }),
          );
        });
    }),
  );
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
