import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconOrb } from '../../components/Art';
import { Field } from '../../components/Field';
import { SheetHeader } from '../../components/SheetHeader';
import { Button, Card, LEVEL_LABEL, Screen, T } from '../../components/ui';
import { getHabit, habitIcon, habitTitle, LEVELS } from '../../core/habits';
import { MIN_HABITS } from '../../core/plan';
import { completionRun } from '../../core/progression';
import { haptic } from '../../lib/haptics';
import { currentDay, useApp } from '../../store/useApp';
import { radius, space, useTheme } from '../../theme';

export default function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const plan = useApp((s) => s.plan);
  const logs = useApp((s) => s.logs);
  const startedAt = useApp((s) => s.startedAt);
  const habit = plan.find((h) => h.habitId === id);
  const lib = getHabit(id);
  const [title, setTitle] = useState(habit?.custom?.title ?? '');
  const [desc, setDesc] = useState(habit?.custom?.description ?? '');

  if (!habit || !startedAt) {
    return (
      <Screen>
        <SheetHeader title="Habit" />
      </Screen>
    );
  }

  const run = completionRun({ ...habit, levelSince: 0 }, logs, startedAt, currentDay());
  const canRemove = plan.length > MIN_HABITS;

  const remove = () =>
    Alert.alert('Remove this habit?', 'Your past check-offs stay in your history.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          if (useApp.getState().removeHabit(habit.habitId)) {
            haptic.warning();
            router.back();
          }
        },
      },
    ]);

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={habitTitle(habit)} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center' }}>
            <IconOrb icon={habitIcon(habit) as keyof typeof Ionicons.glyphMap} size={72} />
          </View>
          {habit.custom ? (
            <View style={{ gap: space.lg }}>
              <Field label="Habit" value={title} onChangeText={setTitle} maxLength={60} returnKeyType="next" />
              <Field
                label="Details (optional)"
                value={desc}
                onChangeText={setDesc}
                maxLength={120}
                placeholder="e.g. Before lunch"
              />
              <Button
                label="Save"
                disabled={!title.trim()}
                onPress={() => {
                  useApp.getState().editCustomHabit(habit.habitId, title, desc);
                  router.back();
                }}
              />
            </View>
          ) : lib ? (
            <>
              <Card style={{ gap: space.sm }}>
                <T v="overline" color={c.textDim}>
                  Why
                </T>
                <T>{lib.why}</T>
              </Card>

              <View style={{ gap: space.sm }}>
                <T v="overline" color={c.textDim}>
                  Level
                </T>
                {LEVELS.map((l) => {
                  const active = habit.level === l;
                  return (
                    <Pressable
                      key={l}
                      onPress={() => {
                        if (active) return;
                        haptic.tap();
                        useApp.getState().setLevel(habit.habitId, l);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.level,
                        {
                          backgroundColor: active ? c.accentSoft : c.surface,
                          borderColor: active ? c.accentInk : 'transparent',
                        },
                      ]}
                    >
                      <T v="caption" color={active ? c.accentInk : c.textDim} style={styles.levelTag}>
                        {LEVEL_LABEL[l]}
                      </T>
                      <T v="bodyStrong" style={{ flex: 1 }}>
                        {lib.levels[l]}
                      </T>
                    </Pressable>
                  );
                })}
                <T v="caption" color={c.textFaint}>
                  Levels rise with each phase. Change it anytime if it doesn’t fit your life.
                </T>
              </View>
            </>
          ) : null}

          <Card style={styles.statRow}>
            <T color={c.textDim}>Current run</T>
            <T v="bodyStrong">
              {run} {run === 1 ? 'day' : 'days'}
            </T>
          </Card>

          <View style={{ gap: space.sm }}>
            {!habit.custom ? (
              <Button
                label="Swap for another habit"
                kind="secondary"
                onPress={() => router.push(`/swap/${habit.habitId}`)}
              />
            ) : null}
            <Button label="Remove habit" kind="danger" disabled={!canRemove} onPress={remove} />
            {!canRemove ? (
              <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
                Keep at least {MIN_HABITS} habits. Swap this one instead.
              </T>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  level: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  levelTag: { width: 36, fontWeight: '800' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
