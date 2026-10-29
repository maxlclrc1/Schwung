import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { haptic } from '../lib/haptics';
import { usePreferences } from '../store/preferences';
import { useTheme, useThemeTarget } from '../theme';
import { ThemedView } from '../theme/transition';

/**
 * Sun/moon button that flips between Light and Dark and remembers the choice (the saved theme preference).
 * Shows the mode you'll switch *to*: a sun in dark mode, a moon in light mode. On a tap the one icon turns away and
 * shrinks as the other turns in, a quarter turn on the shared ease-out curve; the button gives a little under the
 * finger. Sits in the same place in every tab's header, beside Settings.
 */
export function ThemeToggle() {
  const { c } = useTheme();
  // The theme asked for, which can be a moment ahead of the one on screen while its paintings load:
  // the icon answers the tap at once, and a second tap asks to go back.
  const isDark = useThemeTarget() === 'dark';
  const setThemePreference = usePreferences((s) => s.setThemePreference);
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  const dark = useSharedValue(isDark ? 1 : 0);
  const pressed = useSharedValue(0);
  useEffect(() => {
    dark.set(
      withTiming(isDark ? 1 : 0, {
        duration: 420,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        reduceMotion: ReduceMotion.System,
      }),
    );
  }, [isDark, dark]);
  const sun = useAnimatedStyle(() => ({
    opacity: dark.value,
    transform: [{ rotate: `${interpolate(dark.value, [0, 1], [-90, 0])}deg` }, { scale: 0.5 + dark.value * 0.5 }],
  }));
  const moon = useAnimatedStyle(() => ({
    opacity: 1 - dark.value,
    transform: [{ rotate: `${interpolate(dark.value, [0, 1], [0, 90])}deg` }, { scale: 1 - dark.value * 0.5 }],
  }));
  const press = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.08 }] }));

  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        setThemePreference(isDark ? 'light' : 'dark');
      }}
      onPressIn={() => pressed.set(withTiming(1, { duration: 70 }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }))}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Animated.View style={press}>
        <ThemedView style={[styles.button, { backgroundColor: c.surface }]}>
          <Animated.View style={[styles.icon, sun]}>
            <Ionicons name="sunny" size={19} color={c.peach} />
          </Animated.View>
          <Animated.View style={[styles.icon, moon]}>
            <Ionicons name="moon" size={17} color={c.indigo} />
          </Animated.View>
        </ThemedView>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  icon: { position: 'absolute' },
});
