import { memo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, { interpolate, makeMutable, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { ThemedView, useThemeProgress } from '../theme/transition';
import { ThemedImage } from './ThemedImage';
import { LAKESIDE_BAND_TOP, type Theme, TILE_HEIGHT, type TileName, TILES } from './worldTiles';

const TILE_NAMES = Object.keys(TILES.dark) as TileName[];

/*
 * One continuous world behind the three tabs, in a light and a dark painting:
 * Habits' peaceful valley, Journey's ascent and Insights' lakeside camp are regions of one panorama
 * (design/canvas/assemble_panorama.py, SCHWUNG_CONTINUOUS_WORLD_ARTWORK_SPEC.md). Switching tabs pans the camera
 * across it; nothing reloads. The panorama scales so 1536 px span the screen, as the old world did, so the
 * Journey painting (rows 800-1824) keeps lining up with the trail drawn by the Journey screen.
 */

export const SCREEN_PX = 1536;
/** Where the camera rests for each tab, in panorama px. */
const STOP_PX = 1280;
/**
 * The panorama row each tab lines up with its trail area: the Journey painting's top (row 800) under Journey's
 * trail, and the lakeside band under Insights' window onto the camp. Habits has no trail and keeps Journey's alignment.
 */
const BAND_TOP_PX = [800, 800, LAKESIDE_BAND_TOP];
/** How much of the background colour veils each region (Habits, Journey, Insights), so text stays readable. */
const VEIL: Record<Theme, number[]> = { dark: [0.5, 0, 0.18], light: [0.45, 0, 0.15] };

/** 0 Habits, 1 Journey, 2 Insights; moved by the pager (PagerTabs) on the UI thread, pages and world together. */
export const worldCamera = makeMutable(0);
/**
 * Per tab: where its trail area starts in its page (pt; -1 until measured) and how far its page has scrolled.
 * Journey scrolls the world with its page, so its markers stay on the art; Habits and Insights don't.
 */
export const worldAnchor = [makeMutable(-1), makeMutable(-1), makeMutable(-1)];
export const worldScroll = [makeMutable(0), makeMutable(0), makeMutable(0)];

/**
 * For what a tab's page draws on the painting (Journey's trail and labels). Pages slide a
 * screen width per tab while the painting pans STOP_PX of SCREEN_PX, so mid-slide the drawing is moved by the
 * difference and stays on its spot of the painting; it fades out as the camera leaves its tab (and in as it
 * arrives), so it's never seen out of place where the world also moves vertically between tabs.
 */
export function useOnPainting(index: number) {
  const { width } = useWindowDimensions();
  const slip = width * (1 - STOP_PX / SCREEN_PX);
  return useAnimatedStyle(() => {
    const off = index - worldCamera.get();
    return {
      opacity: Math.min(1, Math.max(0, 1 - Math.abs(off) * 3)),
      transform: [{ translateX: -off * slip }],
    };
  });
}

export function WorldLayer() {
  const { c } = useTheme();
  const progress = useThemeProgress();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scale = width / SCREEN_PX;
  // Before a tab's page has been measured: roughly where its trail area starts.
  const fallback = [insets.top + 107, insets.top + 107, insets.top + 125];

  const pan = useAnimatedStyle(() => {
    const cam = worldCamera.get();
    // Each tab's own vertical placement, blended by how close the camera is to it, so a pan between tabs eases
    // from one to the other. Habits follows Journey's placement and never scrolls the world.
    const anchorOf = (i: number) => (worldAnchor[i].get() >= 0 ? worldAnchor[i].get() : fallback[i]);
    let y = 0;
    for (let i = 0; i < 3; i++) {
      const weight = Math.max(0, 1 - Math.abs(cam - i));
      if (weight === 0) continue;
      const anchor = i === 0 ? anchorOf(1) : anchorOf(i);
      // Habits and Insights keep the world still while their pages scroll; Journey moves it (its trail is on it).
      const scroll = i === 1 ? worldScroll[i].get() : 0;
      y += weight * (anchor - BAND_TOP_PX[i] * scale - scroll);
    }
    return { transform: [{ translateX: -cam * STOP_PX * scale }, { translateY: y }] };
  });
  const veil = useAnimatedStyle(() => {
    const cam = worldCamera.get();
    const light = progress.get();
    return {
      opacity: interpolate(cam, [0, 1, 2], VEIL.dark) * (1 - light) + interpolate(cam, [0, 1, 2], VEIL.light) * light,
    };
  });

  return (
    <ThemedView
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, { backgroundColor: c.bg, overflow: 'hidden' }]}
    >
      {/* The camera moves this view on the UI thread; the tiles inside never re-render for it. */}
      <Animated.View style={[styles.pano, pan]}>
        <Tiles scale={scale} />
      </Animated.View>
      {/* ThemedView flattens its style, so the animated veil opacity sits on a wrapper. */}
      <Animated.View style={[StyleSheet.absoluteFill, veil]}>
        <ThemedView style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]} />
      </Animated.View>
    </ThemedView>
  );
}

/**
 * The six tiles (both themes of each region, kept decoded: see ThemedImage), memoized so a tab change, a pathname
 * update or a camera move never re-renders them.
 */
const Tiles = memo(function Tiles({ scale }: { scale: number }) {
  return TILE_NAMES.map((name) => {
    const tile = TILES.dark[name];
    return (
      <ThemedImage
        key={name}
        sources={{ dark: tile.source, light: TILES.light[name].source }}
        contentFit="fill"
        style={{
          position: 'absolute',
          left: tile.x * scale,
          top: 0,
          width: tile.width * scale,
          height: TILE_HEIGHT * scale,
        }}
      />
    );
  });
});

const styles = StyleSheet.create({
  pano: { position: 'absolute', left: 0, top: 0 },
});
