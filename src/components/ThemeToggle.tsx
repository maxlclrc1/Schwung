import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';
import { haptic } from '../lib/haptics';
import { useApp } from '../store/useApp';
import { useTheme, useThemeTarget } from '../theme';
import { ThemedView } from '../theme/transition';

/**
 * Sun/moon button that flips between Light and Dark and remembers the choice.
 * Shows the mode you'll switch *to*: a sun in dark mode, a moon in light mode.
 */
export function ThemeToggle() {
  const { c } = useTheme();
  // The theme asked for, which can be a moment ahead of the one on screen while its paintings load (testing builds):
  // the icon answers the tap at once, and a second tap asks to go back.
  const isDark = useThemeTarget() === 'dark';
  const setThemePreference = useApp((s) => s.setThemePreference);
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        setThemePreference(isDark ? 'light' : 'dark');
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <ThemedView style={[styles.button, { backgroundColor: c.surface }]}>
        <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={c.text} />
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
