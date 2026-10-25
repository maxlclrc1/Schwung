import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  makeMutable,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tabs } from '../lib/flags';
import { useTheme } from '../theme';

/*
 * One continuous world behind the three tabs (testing builds, dark theme while only the dark art exists):
 * Habits' peaceful valley, Journey's ascent and Field Notes' lakeside camp are regions of one panorama
 * (design/canvas/assemble_panorama.py, SCHWUNG_CONTINUOUS_WORLD_ARTWORK_SPEC.md). Switching tabs pans the camera
 * across it; nothing reloads. The panorama scales so 1536 px span the screen, as the old world did, so the
 * Journey painting (rows 800-1824) keeps lining up with the trail drawn by the Journey screen.
 */

const TILES = [
  { x: 0, width: 1296, source: require('../../assets/world/pano-dark-habits.webp') },
  { x: 1264, width: 1568, source: require('../../assets/world/pano-dark-journey.webp') },
  { x: 2800, width: 1296, source: require('../../assets/world/pano-dark-fieldnotes.webp') },
];
const SCREEN_PX = 1536;
const HEIGHT_PX = 3584;
/** Where the camera rests for each tab, in panorama px. */
const STOP_PX = 1280;
const PAINTING_TOP_PX = 800;
/** How much of the background colour veils each region, so text over the world stays readable. */
const VEIL = [0.5, 0, 0.18];

/** 0 Habits, 1 Journey, 2 Field Notes; animated between. */
export const worldCamera = makeMutable(0);
/** The Journey screen's scroll offset and where its trail area starts in its content (pt; -1 until measured). */
export const journeyScroll = makeMutable(0);
export const journeyAnchor = makeMutable(-1);

const TAB_INDEX: Record<string, number> = { '/today': 0, '/progress': 1, '/fieldnotes': 2 };

/** Whether the continuous world is shown: testing builds, dark theme (the light art isn't made yet). */
export function useWorldLayer(): boolean {
  const { isDark } = useTheme();
  return tabs() && isDark;
}

export function WorldLayer() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const scale = width / SCREEN_PX;
  const fallbackAnchor = insets.top + 107;

  useEffect(() => {
    const index = TAB_INDEX[pathname];
    // Settings and the sheets open over the tabs: the camera stays on the tab underneath.
    if (index === undefined) return;
    worldCamera.set(reduceMotion ? index : withTiming(index, { duration: 420, easing: Easing.inOut(Easing.cubic) }));
  }, [pathname, reduceMotion]);

  const pan = useAnimatedStyle(() => {
    const cam = worldCamera.get();
    // Journey's page scrolls the world with it (its trail must stay on the painting); the others leave it still.
    const onJourney = Math.max(0, 1 - Math.abs(cam - 1));
    const anchor = journeyAnchor.get() >= 0 ? journeyAnchor.get() : fallbackAnchor;
    return {
      transform: [
        { translateX: -cam * STOP_PX * scale },
        { translateY: anchor - PAINTING_TOP_PX * scale - journeyScroll.get() * onJourney },
      ],
    };
  });
  const veil = useAnimatedStyle(() => ({ opacity: interpolate(worldCamera.get(), [0, 1, 2], VEIL) }));

  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, overflow: 'hidden' }]}
    >
      <Animated.View style={[styles.pano, pan]}>
        {TILES.map((t) => (
          <Image
            key={t.x}
            source={t.source}
            resizeMode="stretch"
            style={{
              position: 'absolute',
              left: t.x * scale,
              top: 0,
              width: t.width * scale,
              height: HEIGHT_PX * scale,
            }}
          />
        ))}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }, veil]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pano: { position: 'absolute', left: 0, top: 0 },
});
