import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
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
  const press = useAnimatedStyle(() => ({
    opacity: 1 - pressed.value * 0.2,
    transform: [{ scale: 1 - pressed.value * 0.08 }],
  }));
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPressIn={() => pressed.set(withTiming(1, { duration: 70 }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }))}
    >
      <Animated.View style={press}>
        <ThemedView style={[styles.iconButton, { backgroundColor: c.surface }]}>
          <Ionicons name={name} size={20} color={c.text} />
        </ThemedView>
      </Animated.View>
    </Pressable>
  );
}

export function SettingsButton() {
  return <IconButton name="settings-outline" label="Settings" onPress={() => router.push('/settings')} />;
}

const styles = StyleSheet.create({
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
