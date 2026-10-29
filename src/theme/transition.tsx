import { createContext, ReactNode, startTransition, useContext, useEffect, useRef, useState } from 'react';
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
import { requestScheme, useThemeGate } from './gate';
import { Colors, palettes, Scheme, SchemeContext, useRootTheme, useTheme, useThemeTarget } from './index';

export { animatedColors, findToken, THEME_FADE_MS, themedPairs } from './fade';

/*
 * Theme transitions. One shared value eases between dark (0) and light (1) whenever the resolved
 * theme changes: a toggle, a Settings choice, or the phone's own appearance under "System".
 * Themed components map each palette color they use back to its token and blend between that
 * token's dark and light values on the UI thread. Nothing remounts and nothing is overlaid;
 * the preference itself is saved immediately. The fade starts once the
 * incoming theme's paintings have loaded (./gate), so the colours and the world change as one.
 */

const progressFor = (scheme: Scheme) => (scheme === 'light' ? 1 : 0);

const ThemeProgress = createContext<SharedValue<number> | null>(null);

export function ThemeTransitionProvider({ children }: { children: ReactNode }) {
  const initial = useRootTheme().scheme;
  const target = useThemeTarget();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(progressFor(initial));
  const [scheme, setScheme] = useState<Scheme>(initial);
  const still = useRef(reduceMotion);
  useEffect(() => {
    still.current = reduceMotion;
  }, [reduceMotion]);

  // A new theme is shown once its paintings are ready (./gate).
  useEffect(() => {
    requestScheme(target);
  }, [target]);

  // The switch itself, outside React: the UI thread fades every themed colour and painting at once (retargeting
  // smoothly on rapid toggles); React re-renders afterwards, at low priority, for the few colours it draws itself.
  useEffect(() => {
    let last: Scheme = initial;
    return useThemeGate.subscribe((g) => {
      const next = g.shown;
      if (!next || next === last) return;
      last = next;
      const to = progressFor(next);
      progress.set(still.current ? to : withTiming(to, { duration: THEME_FADE_MS, easing: Easing.out(Easing.quad) }));
      startTransition(() => setScheme(next));
    });
    // Subscribed once; `initial` is only the starting point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  return (
    <SchemeContext.Provider value={scheme}>
      <ThemeProgress.Provider value={progress}>{children}</ThemeProgress.Provider>
    </SchemeContext.Provider>
  );
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
