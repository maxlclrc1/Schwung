import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SheetHeader } from '../../components/SheetHeader';
import { Screen, T } from '../../components/ui';
import { habitCategory, swapCandidates } from '../../core/habits';
import { phaseLevel, phaseOf } from '../../core/progression';
import { haptic } from '../../lib/haptics';
import { currentDay, useApp } from '../../store/useApp';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

export default function Swap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const plan = useApp((s) => s.plan);
  const current = plan.find((h) => h.habitId === id);
  const level = phaseLevel(phaseOf(currentDay()));

  if (!current) {
    return (
      <Screen>
        <SheetHeader title="Swap" action="Cancel" />
      </Screen>
    );
  }

  const category = habitCategory(current);
  const candidates = swapCandidates(current, plan);
  const similar = candidates.filter((h) => h.category === category);
  const other = candidates.filter((h) => h.category !== category);

  const choose = (newId: string) => {
    haptic.success();
    useApp.getState().swapHabit(current.habitId, newId);
    // Close both the swap sheet and the detail sheet underneath it.
    router.dismissTo('/today');
  };

  const section = (label: string, items: typeof candidates) =>
    items.length ? (
      <View style={{ gap: space.sm }}>
        <T v="overline" color={c.textDim}>
          {label}
        </T>
        {items.map((h) => (
          <Pressable
            key={h.id}
            onPress={() => choose(h.id)}
            accessibilityRole="button"
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <ThemedView style={[styles.item, { backgroundColor: c.surface }]}>
              <ThemedView style={[styles.icon, { backgroundColor: c.accentSoft }]}>
                <Ionicons name={h.icon as keyof typeof Ionicons.glyphMap} size={20} color={c.accentInk} />
              </ThemedView>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{h.levels[level]}</T>
                <T v="caption" color={c.textDim}>
                  {h.why}
                </T>
              </View>
            </ThemedView>
          </Pressable>
        ))}
      </View>
    ) : null;

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Swap habit" action="Cancel" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {section('Similar', similar)}
        {section('Something different', other)}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  item: { padding: space.lg, borderRadius: radius.md, flexDirection: 'row', gap: space.md, alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
