import { withLayoutContext } from 'expo-router';
import {
  createNavigatorFactory,
  type DefaultNavigatorOptions,
  type ParamListBase,
  TabRouter,
  type TabRouterOptions,
  type TabActionHelpers,
  type TabNavigationState,
  useNavigationBuilder,
} from 'expo-router/react-navigation';
import React, { memo, type ReactNode, useEffect, useSyncExternalStore } from 'react';
import { Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, type ColorValue } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  makeMutable,
  useAnimatedStyle,
  useReducedMotion,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { PAGE_MS, pageOffset, pageTarget } from '../core/pager';
import { haptic } from '../lib/haptics';
import { useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { PagerGesture, pagerOpen } from './TabPager';
import { worldCamera } from './WorldLayer';

/*
 * The three tabs as one horizontal pager over the shared world (testing builds; the public release keeps its
 * js-tabs navigator in app/(tabs)/_layout.tsx). Everything that moves with a swipe reads one value on the UI thread,
 * `worldCamera` (0 Habits, 1 Journey, 2 Insights): the pages' row and the panorama behind them, so they move in the
 * same frame, with no JS work per frame.
 *
 * - The drag is a gesture-handler pan with worklet callbacks: it activates once the drag is clearly sideways (a
 *   vertical or diagonal drag stays the page's scroll), never on a touch that started on a habit card (the card
 *   blocks it: TabPager.useCardBlock), and not under a modal or with the keyboard up (pagerOpen).
 * - On release the camera springs from the finger's position and speed to the target tab (no jump, and a flick is
 *   carried through); the navigator's state follows on the JS thread, which moves nothing.
 * - A tab tap or a link animates the camera the same way. With Reduce Motion, nothing follows the finger: a swipe
 *   or a tap just changes tab.
 * - All three pages stay mounted and laid out (their scroll positions are kept), with only the shown one exposed
 *   to accessibility.
 */

type Options = {
  title?: string;
  tabBarIcon?: (p: { focused: boolean; color: ColorValue; size: number }) => ReactNode;
  /** null hides the tab (not used in testing builds, where all three are shown). */
  href?: null;
};

/** The tab the pager is on (or heading to): set on the UI thread at release, and from navigation otherwise. */
const pagerIndex = makeMutable(0);

/** The tab bar's selected tab: updated the moment a swipe is released, without re-rendering the pages. */
let shownTab = 0;
const highlightListeners = new Set<() => void>();
const highlighted = () => shownTab;
const subscribeHighlight = (l: () => void) => {
  highlightListeners.add(l);
  return () => highlightListeners.delete(l);
};
function highlight(i: number) {
  if (i === shownTab) return;
  shownTab = i;
  highlightListeners.forEach((l) => l());
}
// Critically damped (no bounce past the page) and quick: about 360 ms to rest (Reanimated's spring `duration` is the
// perceived one; it fully settles in 1.5 times that), shorter when a flick has already carried it most of the way.
const SPRING = { duration: 240, dampingRatio: 1, overshootClamping: true } as const;

/** A tab press, as the bottom tabs emit it (a listener may prevent the switch). */
type EventMap = { tabPress: { data: undefined; canPreventDefault: true } };

type Props = DefaultNavigatorOptions<
  ParamListBase,
  string | undefined,
  TabNavigationState<ParamListBase>,
  Options,
  EventMap,
  unknown
> &
  TabRouterOptions;

function PagerNavigator({ id, initialRouteName, backBehavior, children, screenListeners, screenOptions }: Props) {
  const { state, navigation, descriptors, NavigationContent } = useNavigationBuilder<
    TabNavigationState<ParamListBase>,
    TabRouterOptions,
    TabActionHelpers<ParamListBase>,
    Options,
    EventMap
  >(TabRouter, {
    id,
    initialRouteName,
    backBehavior,
    children,
    screenListeners,
    screenOptions,
  });
  const { width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  // Pages sit in the order the tabs are declared, whatever order they were visited in; the router only lists the
  // routes it has visited or preloaded, so all of them are preloaded at once (every page stays mounted).
  const names = state.routeNames;
  const count = names.length;
  const focused = names.indexOf(state.routes[state.index].name);
  const routeOf = (name: string) => state.routes.find((r) => r.name === name);
  useEffect(() => {
    for (const name of state.routeNames) if (!state.routes.some((r) => r.name === name)) navigation.preload(name);
  }, [state.routeNames, state.routes, navigation]);

  // Navigation (a tab tap, a link, the back button) moves the camera; a released swipe has already sent it there.
  useEffect(() => {
    highlight(focused);
    if (pagerIndex.get() === focused && Math.abs(worldCamera.get() - focused) < 0.001) return;
    pagerIndex.set(focused);
    worldCamera.set(
      reduceMotion ? focused : withTiming(focused, { duration: PAGE_MS, easing: Easing.out(Easing.cubic) }),
    );
  }, [focused, reduceMotion]);

  const go = (target: number) => {
    if (names[target] && target !== focused) navigation.navigate(names[target]);
    else highlight(focused);
  };

  const pan = usePanGesture({
    enabled: pagerOpen,
    activeOffsetX: [-14, 14],
    failOffsetY: [-10, 10],
    onActivate: () => {
      'worklet';
      cancelAnimation(worldCamera);
    },
    onUpdate: (e) => {
      'worklet';
      if (reduceMotion) return;
      const at = pagerIndex.get();
      worldCamera.set(at - pageOffset(e.translationX, at, count) / width);
    },
    onDeactivate: (e) => {
      'worklet';
      const at = pagerIndex.get();
      // Gesture-handler velocities are in pt/s; the pager's rules use pt/ms.
      const target = e.canceled ? at : pageTarget(e.translationX, e.velocityX / 1000, width, at, count);
      pagerIndex.set(target);
      // The tab bar shows the new tab at once (a tiny update); the navigator's state, which re-renders more, follows
      // once the slide has landed, so no React work competes with it. An interrupted slide hands over to the next.
      if (target !== at) scheduleOnRN(highlight, target);
      if (reduceMotion) {
        worldCamera.set(target);
        scheduleOnRN(go, target);
      } else
        worldCamera.set(
          withSpring(target, { ...SPRING, velocity: -e.velocityX / width }, (finished) => {
            if (finished) scheduleOnRN(go, target);
          }),
        );
    },
  });

  const row = useAnimatedStyle(() => ({ transform: [{ translateX: -worldCamera.get() * width }] }));

  return (
    <NavigationContent>
      <PagerGesture value={pan}>
        <View style={styles.fill}>
          <GestureDetector gesture={pan}>
            <View style={[styles.fill, styles.clip, WEB_PAN_Y]}>
              <Animated.View style={[styles.row, { width: width * count }, row]}>
                {names.map((name, i) => {
                  const route = routeOf(name);
                  return route ? (
                    <Page key={route.key} left={i * width} width={width} shown={i === focused}>
                      {descriptors[route.key].render()}
                    </Page>
                  ) : null;
                })}
              </Animated.View>
            </View>
          </GestureDetector>
          <TabBar
            routes={names.flatMap((name) => {
              const r = routeOf(name);
              return r ? [{ key: r.key, name, options: descriptors[r.key].options }] : [];
            })}
            onPress={(i, key) => {
              haptic.tap();
              const e = navigation.emit({ type: 'tabPress', target: key, canPreventDefault: true });
              if (!e.defaultPrevented && i !== focused) go(i);
            }}
          />
        </View>
      </PagerGesture>
    </NavigationContent>
  );
}

/** On the web, the browser keeps vertical pans and hands sideways ones to the pager (iOS decides natively). */
const WEB_PAN_Y = Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as object) : null;

/** One tab's page, laid out beside the others; only the shown one is exposed to accessibility. */
const Page = memo(function Page({
  left,
  width,
  shown,
  children,
}: {
  left: number;
  width: number;
  shown: boolean;
  children: ReactNode;
}) {
  return (
    <View
      style={[styles.page, { left, width }]}
      accessibilityElementsHidden={!shown}
      importantForAccessibility={shown ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </View>
  );
});

/** The bottom tabs, as the js-tabs bar looked: icon over label, surface background, hairline on top. */
function TabBar({
  routes,
  onPress,
}: {
  routes: { key: string; name: string; options: Options }[];
  onPress: (i: number, key: string) => void;
}) {
  const { c } = useTheme();
  const index = useSyncExternalStore(subscribeHighlight, highlighted);
  const insets = useSafeAreaInsets();
  return (
    <ThemedView
      accessibilityRole="tablist"
      style={[
        styles.bar,
        {
          backgroundColor: c.surface,
          borderTopColor: c.border,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {routes.map((r, i) => {
        if (r.options.href === null) return null;
        const focused = i === index;
        const color = focused ? c.accentInk : c.textDim;
        return (
          <Pressable
            key={r.key}
            onPress={() => onPress(i, r.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={r.options.title}
            style={styles.tab}
          >
            {r.options.tabBarIcon?.({ focused, color, size: 24 })}
            <Text style={[styles.label, { color }]} maxFontSizeMultiplier={1.3} numberOfLines={1}>
              {r.options.title ?? r.name}
            </Text>
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  clip: { overflow: 'hidden' },
  row: { flex: 1 },
  page: { position: 'absolute', top: 0, bottom: 0 },
  bar: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: 6 },
  label: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
});

/** The pager as an Expo Router layout navigator (`<PagerTabs>` with `<PagerTabs.Screen>`s). */
export const PagerTabs = withLayoutContext<Options, React.ComponentType<Props>>(
  createNavigatorFactory(PagerNavigator)().Navigator,
);
