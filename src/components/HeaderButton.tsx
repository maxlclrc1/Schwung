import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { haptic } from '../lib/haptics';
import { useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

/** A round icon button for a screen's header. */
export function IconButton({
  name,
  label,
  onPress,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const pressed = useSharedValue(0);
  // Only the round backing gives under the finger: the glyph is never scaled, so it stays sharp.
  const backing = useAnimatedStyle(() => ({ transform: [{ scale: 1 - pressed.value * 0.1 }] }));
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => pressed.set(withTiming(1, { duration: 70 }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }))}
    >
      <View style={styles.iconButton}>
        <Animated.View style={[StyleSheet.absoluteFill, backing]}>
          <ThemedView style={[styles.circle, { backgroundColor: c.surface }]} />
        </Animated.View>
        <Ionicons name={name} size={20} color={c.text} />
      </View>
    </Pressable>
  );
}

export function SettingsButton() {
  return <IconButton name="settings-outline" label="Settings" onPress={() => router.push('/settings')} />;
}

const styles = StyleSheet.create({
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  circle: { flex: 1, borderRadius: 20 },
});
