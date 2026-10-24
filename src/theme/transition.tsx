import { createContext, ReactNode, useContext, useEffect } from 'react';
import { StyleSheet, TextStyle, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolateColor,
  SharedValue,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { animatedColors, ColorProp, THEME_FADE_MS } from './fade';
import { Colors, palettes, Scheme, useTheme } from './index';

export { animatedColors, findToken, THEME_FADE_MS, themedPairs } from './fade';

/*
 * Theme transitions. One shared value eases between dark (0) and light (1) whenever the resolved
 * theme changes: a toggle, a Settings choice, or the phone's own appearance under "System".
 * Themed components map each palette color they use back to its token and blend between that
 * token's dark and light values on the UI thread. Nothing remounts and nothing is overlaid;
 * the preference itself is saved immediately, exactly as before.
 */

const progressFor = (scheme: Scheme) => (scheme === 'light' ? 1 : 0);

const ThemeProgress = createContext<SharedValue<number> | null>(null);

export function ThemeTransitionProvider({ children }: { children: ReactNode }) {
  const { scheme } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(progressFor(scheme));

  useEffect(() => {
    const target = progressFor(scheme);
    // Retargets smoothly from wherever it is, so rapid toggles never jump or flash.
    progress.set(
      reduceMotion ? target : withTiming(target, { duration: THEME_FADE_MS, easing: Easing.out(Easing.quad) }),
    );
  }, [scheme, reduceMotion, progress]);

  return <ThemeProgress.Provider value={progress}>{children}</ThemeProgress.Provider>;
}

/** Keeps everything inside dark and still, whatever the app theme (ceremonies). */
export function PinnedDark({ children }: { children: ReactNode }) {
  const pinned = useSharedValue(0);
  return <ThemeProgress.Provider value={pinned}>{children}</ThemeProgress.Provider>;
}

/** 0 = dark, 1 = light, animated. Falls back to the current scheme outside a provider. */
export function useThemeProgress(): SharedValue<number> {
  const { scheme } = useTheme();
  const fallback = useSharedValue(progressFor(scheme));
  return useContext(ThemeProgress) ?? fallback;
}

/** Animated overrides for the palette colors in `style`. */
export function useThemedColors(style: ViewStyle | TextStyle | undefined) {
  const { c } = useTheme();
  const progress = useThemeProgress();
  const { fades, fixed } = animatedColors((style ?? {}) as Partial<Record<ColorProp, unknown>>, c);
  const deps = [...fades, ...fixed].map((p) => p.join(':')).join('|');
  return useAnimatedStyle(() => {
    const out: Record<string, string> = {};
    for (const [prop, d, l] of fades) out[prop] = interpolateColor(progress.value, [0, 1], [d, l]);
    // Written every time too, so a color that stops being a palette token replaces the last faded one.
    for (const [prop, v] of fixed) out[prop] = v;
    return out;
  }, [deps, progress]);
}

/** A View whose palette colors fade with the theme. Drop-in for <View style={...}>. */
export function ThemedView({ style, ...rest }: React.ComponentProps<typeof Animated.View>) {
  const flat = StyleSheet.flatten(style as ViewStyle) ?? {};
  const animated = useThemedColors(flat);
  return <Animated.View {...rest} style={[flat, animated]} />;
}

/** The current value of one token, blended between themes (for use inside a worklet). */
export function blendToken(progress: number, token: keyof Colors): string {
  'worklet';
  return interpolateColor(progress, [0, 1], [palettes.dark[token], palettes.light[token]]);
}
