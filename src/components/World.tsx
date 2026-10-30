import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { worldFrame } from '../core/world';
import { space, useTheme } from '../theme';
import { ART_IMAGE } from './ThemedImage';
import { ThemedView, useThemeProgress } from '../theme/transition';
import { physical } from '../i18n/direction';

/** The world painting behind single screens (welcome, onboarding, ceremonies); prefetched at launch (artPrefetch). */
export const WORLD_ART = {
  dark: require('../../assets/world-dark.jpg'),
  light: require('../../assets/world-light.jpg'),
};

/**
 * The Schwung world behind a screen: sky, the mountain, and fog that settles into the app background.
 * `zoneTop` is where the painting (the trail area) starts, measured from this view's top.
 * `dim` veils it with the background color for text-heavy screens.
 * `fadeTop` softens the sky's top edge into the background, for screens where that edge is on screen.
 * Decorative only: hidden from screen readers and ignores touches.
 */
export function WorldBackdrop({
  zoneTop,
  dim = 0,
  fadeTop = false,
}: {
  zoneTop: number;
  dim?: number;
  fadeTop?: boolean;
}) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const { imageTop, imageHeight } = worldFrame(width, zoneTop);
  const theme = useThemeProgress();
  const lightArt = useAnimatedStyle(() => ({ opacity: theme.value }));
  // The dark art fades out as the light fades in (not left underneath), so the light image's softened bottom
  // edge can't show a line of dark art through it.
  const darkArt = useAnimatedStyle(() => ({ opacity: 1 - theme.value }));
  const image = { position: 'absolute' as const, left: 0, top: imageTop, width, height: imageHeight };

  return (
    <ThemedView
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.fill, physical, { backgroundColor: c.bg }]}
    >
      {/* Both themes stay mounted and crossfade with the theme (drawn from the shared decoded cache: ThemedImage). */}
      <Animated.View style={[image, darkArt]}>
        <Image {...ART_IMAGE} source={WORLD_ART.dark} style={styles.full} contentFit="cover" priority="high" />
      </Animated.View>
      <Animated.View style={[image, lightArt]}>
        <Image {...ART_IMAGE} source={WORLD_ART.light} style={styles.full} contentFit="cover" priority="high" />
      </Animated.View>
      {fadeTop ? (
        <LinearGradient
          colors={[c.bg, `${c.bg}00`]}
          style={{ position: 'absolute', left: 0, width, top: imageTop - 1, height: TOP_FADE }}
        />
      ) : null}
      {dim > 0 ? <ThemedView style={[styles.fill, { backgroundColor: c.bg, opacity: dim }]} /> : null}
    </ThemedView>
  );
}

const TOP_FADE = 140;

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  full: { width: '100%', height: '100%' },
});

/** How much onboarding's text-heavy screens veil the world: present, but well behind the words. */
export const ONBOARDING_DIM = 0.8;

/** The world behind the quiz, starting point, plan and reminder: the summit just under the top bar, dimmed. */
export function OnboardingBackdrop() {
  const insets = useSafeAreaInsets();
  return <WorldBackdrop zoneTop={insets.top + space.xl} dim={ONBOARDING_DIM} />;
}
