import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SheetHeader } from '../../components/SheetHeader';
import { Screen, T } from '../../components/ui';
import { habitCategory, swapCandidates } from '../../core/habits';
import { phaseLevel, phaseOf } from '../../core/progression';
import { swapChoices } from '../../core/v2/program';
import { BY_ID } from '../../core/v2/library';
import { haptic } from '../../lib/haptics';
import { currentDay, useApp } from '../../store/useApp';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

type Item = { id: string; icon: string; task: string; why: string };

export default function Swap() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const plan = useApp((s) => s.plan);
  const programVersion = useApp((s) => s.programVersion);
  const profile = useApp((s) => s.profile);
  const current = plan.find((h) => h.habitId === id);
  const level = phaseLevel(phaseOf(currentDay()));

  if (!current) {
    return (
      <Screen>
        <SheetHeader title="Swap" action="Cancel" />
      </Screen>
    );
  }

  let similar: Item[];
  let other: Item[];
  if (programVersion === 2) {
    // V2: age- and precaution-aware, gated to reviewed habits; a swapped-in habit starts at Easy.
    const options = profile ? swapChoices(profile, plan, current.habitId) : [];
    const domain = BY_ID[current.habitId]?.domain;
    const item = (o: (typeof options)[number]): Item => ({ id: o.id, icon: o.icon, task: o.targets.easy, why: o.why });
    similar = options.filter((o) => o.domain === domain).map(item);
    other = options.filter((o) => o.domain !== domain).map(item);
  } else {
    const category = habitCategory(current);
    const candidates = swapCandidates(current, plan);
    const item = (h: (typeof candidates)[number]): Item => ({
      id: h.id,
      icon: h.icon,
      task: h.levels[level],
      why: h.why,
    });
    similar = candidates.filter((h) => h.category === category).map(item);
    other = candidates.filter((h) => h.category !== category).map(item);
  }

  const choose = (newId: string) => {
    haptic.success();
    if (programVersion === 2) useApp.getState().swapHabitV2(current.habitId, newId);
    else useApp.getState().swapHabit(current.habitId, newId);
    // Close both the swap sheet and the detail sheet underneath it.
    router.dismissTo('/today');
  };

  const section = (label: string, items: Item[]) =>
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
                <T v="bodyStrong">{h.task}</T>
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
        {programVersion === 2 ? (
          <T v="caption" color={c.textFaint}>
            {similar.length || other.length
              ? 'A new habit starts at its easiest level, whatever the phase.'
              : 'No reviewed habit fits in its place right now.'}
          </T>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  item: { padding: space.lg, borderRadius: radius.md, flexDirection: 'row', gap: space.md, alignItems: 'center' },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
