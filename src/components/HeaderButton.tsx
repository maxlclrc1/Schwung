import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
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
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <ThemedView style={[styles.iconButton, { backgroundColor: c.surface }]}>
        <Ionicons name={name} size={20} color={c.text} />
      </ThemedView>
    </Pressable>
  );
}

export function SettingsButton() {
  return <IconButton name="settings-outline" label="Settings" onPress={() => router.push('/settings')} />;
}

const styles = StyleSheet.create({
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
