import { useEffect } from 'react';
import { interpolateColor, useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';
import { useTheme } from './index';
import { themePair, type ColorProp } from './fade';
import { timing } from './motion';
import { useThemeProgress } from './transition';

/*
 * Selection transitions (docs/INTERACTION_AUDIT.md, finding F): a choice's wash, outline, indicator and ink ease
 * between their unselected and selected looks on the shared `select` timing (theme/motion.ts), on the UI thread, and
 * instantly with Reduce Motion. At rest, both ends are exactly the colours drawn before, so resting screens are
 * unchanged; font weight can't be interpolated, so a label's weight still changes at once.
 */

/** 0 → 1 as `on` turns true. Starts where it is (no animation on first render); a quick re-tap reverses from
 * wherever it got to, so rapid changes always end in the right state. */
export function useSelected(on: boolean): SharedValue<number> {
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    v.set(timing(on ? 1 : 0, 'select'));
  }, [on, v]);
  return v;
}

/** [unselected, selected] for a colour prop; null draws nothing (the transparent form of the other colour). */
export type SelectPair = [string | null, string | null];

/**
 * An animated style easing each prop between its two colours as `v` goes 0 → 1. Palette colours also follow a theme
 * change (like ThemedView), so a selected control fades correctly when the app switches between light and dark.
 */
export function useSelectColors(v: SharedValue<number>, colors: Partial<Record<ColorProp, SelectPair>>) {
  const { c } = useTheme();
  const progress = useThemeProgress();
  const entries = (Object.entries(colors) as [ColorProp, SelectPair][]).map(
    ([prop, [off, on]]) => [prop, themePair(off, on, c), themePair(on, off, c)] as const,
  );
  const deps = JSON.stringify(entries);
  return useAnimatedStyle(() => {
    const out: Record<string, string | number> = {};
    for (const [prop, a, b] of entries) {
      const from = interpolateColor(progress.value, [0, 1], [a[0], a[1]]);
      const to = interpolateColor(progress.value, [0, 1], [b[0], b[1]]);
      out[prop] = interpolateColor(v.value, [0, 1], [from, to]);
    }
    return out;
  }, [deps, progress, v]);
}

/** Something shown only when selected (a dot, a tick, an underline) fading in and out instead of popping. */
export function useSelectedOpacity(v: SharedValue<number>) {
  return useAnimatedStyle(() => ({ opacity: v.value }));
}
