import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptic } from '../lib/haptics';
import { usePreferences } from '../store/preferences';
import { useTheme, useThemeTarget } from '../theme';
import { ThemedView } from '../theme/transition';

/**
 * Sun/moon button that flips between Light and Dark and remembers the choice (the saved theme preference).
 * Shows the mode you'll switch *to*: a sun in dark mode, a moon in light mode. The two vector glyphs crossfade by
 * opacity only, never scaled or rotated (a transformed text layer is redrawn as a blurry, jagged bitmap on iOS),
 * and only the round backing gives under the finger, so the icon stays sharp throughout.
 */
export function ThemeToggle() {
  const { c } = useTheme();
  // The theme asked for: the icon answers the tap at once, and a second tap asks to go back.
  const isDark = useThemeTarget() === 'dark';
  const setThemePreference = usePreferences((s) => s.setThemePreference);
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  const dark = useSharedValue(isDark ? 1 : 0);
  const pressed = useSharedValue(0);
  useEffect(() => {
    dark.set(
      withTiming(isDark ? 1 : 0, { duration: 200, easing: Easing.out(Easing.quad), reduceMotion: ReduceMotion.System }),
    );
  }, [isDark, dark]);
  const sun = useAnimatedStyle(() => ({ opacity: dark.value }));
  const moon = useAnimatedStyle(() => ({ opacity: 1 - dark.value }));
  const backing = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.1 }] }));

  return (
    <Pressable
      onPress={() => {
        haptic.confirm();
        setThemePreference(isDark ? 'light' : 'dark');
      }}
      onPressIn={() => pressed.set(withTiming(1, { duration: 70 }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }))}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.button}>
        <Animated.View style={[StyleSheet.absoluteFill, backing]}>
          <ThemedView style={[styles.circle, { backgroundColor: c.surface }]} />
        </Animated.View>
        <Animated.View style={[styles.icon, sun]}>
          <Ionicons name="sunny" size={20} color={c.peach} />
        </Animated.View>
        <Animated.View style={[styles.icon, moon]}>
          <Ionicons name="moon" size={18} color={c.indigo} />
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  circle: { flex: 1, borderRadius: 20 },
  icon: { position: 'absolute' },
});
