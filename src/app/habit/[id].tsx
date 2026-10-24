import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconOrb } from '../../components/Art';
import { Field } from '../../components/Field';
import { SheetHeader } from '../../components/SheetHeader';
import { Button, Card, LEVEL_LABEL, Screen, T } from '../../components/ui';
import { habitIcon, habitTaskAt, habitTitle, habitWhy, LEVELS } from '../../core/habits';
import { MIN_HABITS } from '../../core/plan';
import { completionRun } from '../../core/progression';
import {
  coversEveryWeekday,
  nextSessionLabel,
  SESSIONS_PER_WEEK,
  validDays,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  WEEKDAYS,
} from '../../core/schedule';
import type { PlanHabit, Weekday } from '../../core/types';
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
  const [title, setTitle] = useState(habit?.custom?.title ?? '');
  const [desc, setDesc] = useState(habit?.custom?.description ?? '');

  if (!habit || !startedAt) {
    return (
      <Screen>
        <SheetHeader title="Habit" />
      </Screen>
    );
  }

  const why = habitWhy(habit);
  const run = completionRun({ ...habit, levelSince: 0 }, logs, startedAt, currentDay());
  const atMinimum = plan.length <= MIN_HABITS;
  // Removing must never leave a weekday with nothing due.
  const leavesEmptyDay = !coversEveryWeekday(plan.filter((h) => h.habitId !== habit.habitId));
  const canRemove = !atMinimum && !leavesEmptyDay;

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
          ) : why ? (
            <>
              <Card style={{ gap: space.sm }}>
                <T v="overline" color={c.textDim}>
                  Why
                </T>
                <T>{why}</T>
                {habit.spec?.notes.map((n) => (
                  <T key={n} v="caption" color={c.textDim}>
                    {n}
                  </T>
                ))}
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
                        {habitTaskAt(habit, l)}
                      </T>
                    </Pressable>
                  );
                })}
                <T v="caption" color={c.textFaint}>
                  {habit.schedule && !habit.schedule.phaseLevelUps
                    ? 'Levels rise when you accept an offer after 7 sessions in a row. Day 22 and Day 45 don’t raise this one automatically. Change it anytime if it doesn’t fit your life.'
                    : 'Levels rise with each phase. Change it anytime if it doesn’t fit your life.'}
                </T>
              </View>
            </>
          ) : null}

          {habit.schedule ? <ScheduleEditor habit={habit} startKey={startedAt} /> : null}

          <Card style={styles.statRow}>
            <T color={c.textDim}>Current run</T>
            <T v="bodyStrong">
              {run} {habit.schedule ? (run === 1 ? 'session' : 'sessions') : run === 1 ? 'day' : 'days'}
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
            {atMinimum ? (
              <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
                Keep at least {MIN_HABITS} habits. Swap this one instead.
              </T>
            ) : leavesEmptyDay ? (
              <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
                Every day needs at least one habit, and this is the only one due on some days. Swap it instead.
              </T>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** Which weekdays a scheduled habit is due (2–3), and when the next session is. */
function ScheduleEditor({ habit, startKey }: { habit: PlanHabit; startKey: string }) {
  const { c } = useTheme();
  const saved = habit.schedule!.days;
  // A draft so a day can be swapped (untick one, tick another) without passing through an invalid schedule.
  const [draft, setDraft] = useState<Weekday[]>(saved);
  const [message, setMessage] = useState<string | null>(null);
  const next = nextSessionLabel(habit, startKey, currentDay());

  const toggle = (w: Weekday) => {
    haptic.tap();
    const days = draft.includes(w) ? draft.filter((d) => d !== w) : [...draft, w];
    setDraft(days);
    if (!validDays(days)) {
      setMessage(`Choose ${SESSIONS_PER_WEEK.min} or ${SESSIONS_PER_WEEK.max} days.`);
      return;
    }
    if (useApp.getState().setSchedule(habit.habitId, days)) setMessage(null);
    else setMessage('Every day needs at least one habit due, so this schedule can’t be saved.');
  };

  return (
    <View style={{ gap: space.sm }}>
      <T v="overline" color={c.textDim}>
        Schedule
      </T>
      <View style={styles.days} accessibilityRole="none">
        {WEEKDAYS.map((w) => {
          const on = draft.includes(w);
          return (
            <Pressable
              key={w}
              onPress={() => toggle(w)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={WEEKDAY_LONG[w]}
              style={[
                styles.day,
                { backgroundColor: on ? c.accentSoft : c.surface, borderColor: on ? c.accentInk : 'transparent' },
              ]}
            >
              <T v="caption" color={on ? c.accentInk : c.textDim} style={{ fontWeight: '700' }}>
                {WEEKDAY_SHORT[w]}
              </T>
            </Pressable>
          );
        })}
      </View>
      <T v="caption" color={message ? c.accentInk : c.textFaint} accessibilityLiveRegion="polite">
        {message ??
          `Due on ${saved.length} days a week. Next session: ${next}. Other days are rest days and never count as missed.`}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  days: { flexDirection: 'row', gap: space.xs },
  day: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
