import { Image, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { worldFrame } from '../core/world';
import { space, useTheme } from '../theme';
import { ThemedView, useThemeProgress } from '../theme/transition';

const ART = {
  dark: require('../../assets/world-dark.jpg'),
  light: require('../../assets/world-light.jpg'),
};

/**
 * The Schwung world behind a screen: sky, the mountain, and fog that settles into the app background.
 * `zoneTop` is where the painting (the trail area) starts, measured from this view's top.
 * `dim` veils it with the background color for text-heavy screens. `clip` limits it to a top strip
 * (Today uses that to keep the sky behind the status bar while the page scrolls under it).
 * Decorative only: hidden from screen readers and ignores touches.
 */
export function WorldBackdrop({ zoneTop, dim = 0, clip }: { zoneTop: number; dim?: number; clip?: number }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const { imageTop, imageHeight } = worldFrame(width, zoneTop);
  const theme = useThemeProgress();
  const lightArt = useAnimatedStyle(() => ({ opacity: theme.value }));
  const image = { position: 'absolute' as const, left: 0, top: imageTop, width, height: imageHeight };

  return (
    <ThemedView
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.fill,
        { backgroundColor: c.bg },
        clip !== undefined && { bottom: undefined, height: clip, overflow: 'hidden' },
      ]}
    >
      {/* Both themes stay mounted; light crossfades over dark with the theme, like the Ascent did. */}
      <Image source={ART.dark} style={image} resizeMode="cover" />
      <Animated.Image source={ART.light} style={[image, lightArt]} resizeMode="cover" />
      {dim > 0 ? <ThemedView style={[styles.fill, { backgroundColor: c.bg, opacity: dim }]} /> : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
});

/** How much onboarding's text-heavy screens veil the world: present, but well behind the words. */
export const ONBOARDING_DIM = 0.8;

/** The world behind the quiz, starting point, plan and reminder: the summit just under the top bar, dimmed. */
export function OnboardingBackdrop() {
  const insets = useSafeAreaInsets();
  return <WorldBackdrop zoneTop={insets.top + space.xl} dim={ONBOARDING_DIM} />;
}
