import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Easing, type GestureResponderEvent, Platform, TextInput } from 'react-native';
import { cancelAnimation, withTiming } from 'react-native-reanimated';
import { PAGE_MS, pageOffset, pageTarget } from '../core/pager';
import { touchIntent } from '../core/swipe';
import { haptic } from '../lib/haptics';
import { worldCamera } from './WorldLayer';

/*
 * Swiping between the tabs, over the one continuous world (testing builds). The tabs stay the bottom-tab navigator;
 * its pages are laid side by side (each at its offset from the focused one, a screen width apart) and all three
 * stay mounted, so a drag shows the next page coming in while the world pans with the finger. Letting go past the
 * threshold (or flicking) navigates as a tab press would: the navigator's slide and the world's pan then carry on
 * from where the finger left them, with the same timing, so they land together. Tapping a tab slides the same way.
 *
 * Who gets a sideways drag:
 * - a habit card's, if the touch started on one (the card marks the touch: claimTouch);
 * - nobody's while a sheet or modal is open over a tab (usePagerBlock), or while a text field is being edited;
 * - otherwise the pager's, once the drag is clearly sideways (the same first-clear-direction rule as the cards: a
 *   vertical or diagonal touch is the page's scroll for the whole touch). A tap still reaches buttons and markers.
 */

const PAGE_EASING = Easing.out(Easing.cubic);
const SPRING_BACK_MS = 220;
const NATIVE = Platform.OS !== 'web';

/** The pages' shared drag offset (pt), added to each page's place. */
export const pageDrag = new Animated.Value(0);

/**
 * The navigator's slide for one page: side by side, plus the drag. The navigator only tells a page whether it's
 * before (-1), on (0) or after (1) the focused one, so `distance` (how many tabs away it is, at least 1) puts a page
 * two tabs away twice as far out, behind its neighbour rather than on top of it.
 */
export function pageTransition(width: number, distance: number) {
  const step = width * Math.max(1, distance);
  return {
    transitionSpec: { animation: 'timing' as const, config: { duration: PAGE_MS, easing: PAGE_EASING } },
    sceneStyleInterpolator: ({ current }: { current: { progress: Animated.Value } }) => ({
      sceneStyle: { transform: [{ translateX: Animated.add(Animated.multiply(current.progress, step), pageDrag) }] },
    }),
  };
}

let owned = false;
let blocks = 0;
/** A swipe that let go and navigated, waiting for the navigator's slide to start. */
let pending: ReturnType<typeof setTimeout> | undefined;
/** Until when the last slide runs: a new swipe meanwhile navigates on release without following the finger. */
let busyUntil = 0;

/** Marks the current touch as a child's own (a habit card's swipe): the pager leaves it alone. */
export function claimTouch() {
  owned = true;
}

/** While `active` (a sheet or modal open over a tab), swiping between tabs is off. */
export function usePagerBlock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    blocks += 1;
    return () => {
      blocks -= 1;
    };
  }, [active]);
}

/** A text field is being edited (react-native-web has no TextInput.State). */
const editing = () =>
  Boolean((TextInput.State as Partial<typeof TextInput.State> | undefined)?.currentlyFocusedInput?.());

function settle(duration: number) {
  Animated.timing(pageDrag, { toValue: 0, duration, easing: PAGE_EASING, useNativeDriver: NATIVE }).start();
}

/** The navigator's slide has started: the drag offset eases out with it, so the two move as one. */
export function onPageTransitionStart() {
  if (pending === undefined) return;
  clearTimeout(pending);
  pending = undefined;
  settle(PAGE_MS);
}

/**
 * The pager's touch handlers, for a view around the tabs. `routes` are the tabs in order; `index` is the focused
 * one (-1 when the screen isn't one of them, e.g. a sheet on top).
 */
export function useTabPager({
  routes,
  index,
  width,
  enabled,
  follow,
}: {
  routes: readonly string[];
  index: number;
  width: number;
  enabled: boolean;
  /** Pages and world follow the finger (off with Reduce Motion: a swipe then just changes tab). */
  follow: boolean;
}) {
  const g = useRef({
    x0: 0,
    y0: 0,
    intent: 'undecided' as ReturnType<typeof touchIntent>,
    dragging: false,
    following: false,
    samples: [] as { x: number; t: number }[],
  });

  // Never left mid-drag (e.g. the screen changed under the finger).
  useEffect(() => () => pageDrag.setValue(0), []);

  const sample = (e: GestureResponderEvent) => {
    const s = g.current.samples;
    const t = e.nativeEvent.timestamp ?? Date.now();
    s.push({ x: e.nativeEvent.pageX, t });
    while (s.length > 2 && t - s[0].t > 80) s.shift();
  };
  const velocity = () => {
    const s = g.current.samples;
    const a = s[0];
    const b = s[s.length - 1];
    return s.length > 1 && b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0;
  };
  const springBack = () => {
    settle(SPRING_BACK_MS);
    if (g.current.following) worldCamera.set(withTiming(index, { duration: SPRING_BACK_MS }));
  };
  const end = (e: GestureResponderEvent | null) => {
    const d = g.current;
    if (!d.dragging) return;
    d.dragging = false;
    const dx = e ? e.nativeEvent.pageX - d.x0 : 0;
    const target = e ? pageTarget(dx, velocity(), width, index, routes.length) : index;
    if (target === index) {
      springBack();
      return;
    }
    haptic.tap();
    busyUntil = Date.now() + PAGE_MS;
    if (d.following) {
      // The drag offset eases out with the navigator's slide once it starts (or shortly after, if it doesn't).
      pending = setTimeout(onPageTransitionStart, 120);
    }
    router.navigate(routes[target] as never);
  };

  return {
    onStartShouldSetResponderCapture: (e: GestureResponderEvent) => {
      const d = g.current;
      d.x0 = e.nativeEvent.pageX;
      d.y0 = e.nativeEvent.pageY;
      d.intent = 'undecided';
      d.samples = [];
      owned = false;
      return false;
    },
    // Asked before the touched view (capture), so a button or marker under the finger gives the drag up once it's
    // clearly sideways; a habit card has already claimed its touches.
    onMoveShouldSetResponderCapture: (e: GestureResponderEvent) => {
      const d = g.current;
      if (!enabled || index < 0 || owned || blocks > 0 || editing()) return false;
      if (d.intent === 'undecided') d.intent = touchIntent(e.nativeEvent.pageX - d.x0, e.nativeEvent.pageY - d.y0);
      return d.intent === 'swipe';
    },
    onResponderGrant: (e: GestureResponderEvent) => {
      const d = g.current;
      d.dragging = true;
      // During the previous slide, a swipe still changes tab but doesn't drag what's already moving.
      d.following = follow && Date.now() >= busyUntil;
      if (d.following) {
        pageDrag.stopAnimation();
        cancelAnimation(worldCamera);
      }
      sample(e);
      // Android: keeps native views (the page's scroll) from taking the touch.
      return true;
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const d = g.current;
      sample(e);
      if (!d.following) return;
      const x = pageOffset(e.nativeEvent.pageX - d.x0, index, routes.length);
      pageDrag.setValue(x);
      // The world pans with the finger, never past its first or last tab.
      worldCamera.set(Math.min(routes.length - 1, Math.max(0, index - x / width)));
    },
    onResponderRelease: (e: GestureResponderEvent) => end(e),
    onResponderTerminationRequest: () => !g.current.dragging,
    onResponderTerminate: () => end(null),
  };
}
