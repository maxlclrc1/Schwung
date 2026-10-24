import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { IconOrb } from '../../components/Art';
import { Field } from '../../components/Field';
import { SheetHeader } from '../../components/SheetHeader';
import { TargetPath } from '../../components/TargetPath';
import { Button, Card, Screen, T } from '../../components/ui';
import { habitIcon, habitTaskAt, habitTitle, habitWhy, LEVEL_NAME, shownText } from '../../core/habits';
import { MIN_HABITS } from '../../core/plan';
import { ACCEPT_ONLY_LEVEL_UPS, completionRun, LEVEL_UP_RUN, nextPhaseRise } from '../../core/progression';
import {
  coversEveryWeekday,
  isDueOn,
  nextSessionLabel,
  SESSIONS_PER_WEEK,
  validDays,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  WEEKDAYS,
} from '../../core/schedule';
import type { PlanHabit, Weekday } from '../../core/types';
import { dateForDay } from '../../core/dates';
import { isExercise, validExerciseDays, type ExerciseId } from '../../core/v2/exercise';
import { ExerciseGuide } from '../../components/Exercise';
import { haptic } from '../../lib/haptics';
import { currentDay, useApp } from '../../store/useApp';
import { radius, space, useTheme } from '../../theme';

export default function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const plan = useApp((s) => s.plan);
  const logs = useApp((s) => s.logs);
  const startedAt = useApp((s) => s.startedAt);
  const appliedPhase = useApp((s) => s.appliedPhase);
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
                    {shownText(n)}
                  </T>
                ))}
              </Card>

              <View style={{ gap: space.sm }}>
                <T v="overline" color={c.textDim}>
                  Your path
                </T>
                <TargetPath
                  targets={{
                    easy: habitTaskAt(habit, 'easy') ?? '',
                    medium: habitTaskAt(habit, 'medium') ?? '',
                    hard: habitTaskAt(habit, 'hard') ?? '',
                  }}
                  current={habit.level}
                  onPick={(l) => useApp.getState().setLevel(habit.habitId, l)}
                />
                <T v="caption" color={c.textFaint}>
                  {pathNote(habit, nextPhaseRise(habit, appliedPhase))}
                </T>
              </View>
            </>
          ) : null}

          {habit.schedule ? <ScheduleEditor habit={habit} startKey={startedAt} /> : null}

          {isExercise(habit.habitId) ? <ExerciseExtras habitId={habit.habitId} /> : null}

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

/**
 * What happens next on this habit's path, honestly: the planned phase step, an early offer, and that a level can
 * always be changed here. Never a promise that it reaches Mastery on a given day.
 */
function pathNote(habit: PlanHabit, rise: number | null): string {
  const change = 'Tap a level to change it anytime.';
  if (habit.level === 'hard') return `You’re at ${LEVEL_NAME.hard}, the full version of this habit. ${change}`;
  const offer = `${LEVEL_UP_RUN} ${habit.schedule ? 'sessions' : 'days'} in a row brings an offer to step up sooner.`;
  if (rise !== null) {
    return `Planned to step up on Day ${rise}. ${offer} ${change}`;
  }
  if (ACCEPT_ONLY_LEVEL_UPS.has(habit.habitId) || habit.schedule) {
    return `This one steps up only when you accept an offer: ${offer} ${change}`;
  }
  return `${offer} ${change}`;
}

/** Why these days don't fit an exercise habit's rule, or null when they do. */
function exerciseDayRule(habitId: string, days: Weekday[]): string | null {
  if (validExerciseDays(habitId, days)) return null;
  if (habitId === 'move_balance') return 'Choose 3 days for balance practice.';
  return 'Choose 2 days that aren’t next to each other, so there’s a rest day between sessions.';
}

/** For exercise habits: how to do it, the safety lines, and resting today without it counting as missed. */
function ExerciseExtras({ habitId }: { habitId: ExerciseId }) {
  const { c } = useTheme();
  const startedAt = useApp((s) => s.startedAt);
  const logs = useApp((s) => s.logs);
  const plan = useApp((s) => s.plan);
  const day = currentDay();
  const h = plan.find((x) => x.habitId === habitId);
  const rested = !!startedAt && !!logs[dateForDay(startedAt, day)]?.rested?.includes(habitId);
  const dueToday = !!startedAt && !!h && isDueOn(h, startedAt, day);
  return (
    <View style={{ gap: space.md }}>
      <ExerciseGuide id={habitId} />
      {dueToday ? (
        <View style={{ gap: space.xs }}>
          <Button
            label={rested ? 'Do it today after all' : 'Rest today'}
            kind="secondary"
            onPress={() => {
              haptic.tap();
              useApp.getState().restToday(habitId, !rested);
            }}
          />
          <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
            Feeling sore, tired or unwell? Resting is fine and never counts as missed.
          </T>
        </View>
      ) : null}
    </View>
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
    const rule = exerciseDayRule(habit.habitId, days);
    if (rule) {
      setMessage(rule);
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
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
