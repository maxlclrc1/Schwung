import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { canEditYesterday } from '../../core/dates';
import * as P from '../../core/reset/pilot';
import { recoveryNote, SESSION_TYPES } from '../../core/reset/tracking';
import { haptic } from '../../lib/haptics';
import { pilotNow, pilotToday, useResetPilot } from '../../store/resetPilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { SheetHeader } from '../SheetHeader';
import { Button, Card, Screen, T } from '../ui';

/** Habits measured in minutes, where noting the minutes is offered (optional, never needed). */
const TIMED = new Set(['focus_deepwork', 'mind_read', 'move_walk', 'home_tidy', 'skill_practice']);

/**
 * A Life Reset habit's details (development and internal-testing builds only: see app/pilot/[id].tsx): today and,
 * until noon, yesterday; a counter, a strength session's details or optional minutes where they apply; Social
 * Confidence's steps; and difficulty. Nothing here is needed to complete a habit: a swipe on the card is enough.
 */
export function PilotHabit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const [message, setMessage] = useState<string | null>(null);

  if (!program || !P.isPilotHabit(id) || !program.habits.includes(id)) {
    return (
      <Screen>
        <SheetHeader title="Habit" />
      </Screen>
    );
  }

  const s = useResetPilot.getState;
  const today = pilotToday({ program, devDayOffset: offset });
  const yesterday = today > 1 && canEditYesterday(pilotNow(offset)) ? today - 1 : null;
  const level = P.levelFor(program, id, today);
  const done = P.isDone(program, id, today);
  const week = P.weekProgress(program, id, today);
  const track = P.trackOf(program, id, today);
  const strength = id === 'strength_log';
  const social = id === 'confidence_talk';
  const counter = P.counterTarget(program, id, today);
  const pending = P.pendingText(program, id, today);
  const fb = program.progression[id].feedback;
  // Feedback about the current target only (as readiness reads it).
  const since = program.progression[id].eras.filter((e) => e.fromDay <= today).pop()?.fromDay ?? 1;
  const recentFeedback = fb && fb.day >= since ? fb.kind : null;
  const amount = track.amount?.value ?? null;

  const change = (f: () => string | null) => {
    const blocked = f();
    if (blocked) setMessage(`Can’t change it: ${blocked}.`);
    else {
      haptic.success();
      const after = useResetPilot.getState().program;
      const next = after ? P.pendingText(after, id, today) : null;
      setMessage(next ? `Saved. ${next}.` : 'Saved: back to your current target.');
    }
  };

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={P.habitName(id)} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.gap}>
          <T v="overline" color={c.accentInk}>
            {P.levelLabel(level)}
          </T>
          <T v="heading">{social ? 'Today’s step' : P.targetText(program, id, today)}</T>
          {social ? <T>{P.targetText(program, id, today)}</T> : null}
          <T color={c.textDim}>{P.frequencyText(program, id, today)}</T>
          {week ? (
            <T v="bodyStrong">
              {week.goal === 0
                ? 'A short week: no goal this week.'
                : `${week.credited} of ${week.goal} this week${week.credited >= week.goal ? ' · goal met' : ''}`}
            </T>
          ) : null}
          {week && week.goal > week.credited ? (
            <T v="caption" color={c.textDim}>
              Any days you choose. A day without it is a rest day, never a missed one.
            </T>
          ) : null}
          {pending ? (
            <T v="caption" color={c.accentInk}>
              Coming up: {pending}.
            </T>
          ) : null}
        </Card>

        <Card style={styles.gap}>
          <T v="bodyStrong">Today</T>
          <T color={c.textDim}>
            {done
              ? strength
                ? 'Session logged.'
                : 'Done.'
              : track.skipped
                ? 'Skipped today. That’s fine: it never counts as a failure.'
                : strength
                  ? 'No session logged today.'
                  : 'Not done yet.'}
          </T>
          {counter !== null ? (
            <View style={styles.stepper}>
              <Step label="−1" onPress={() => s().count(id, -1)} />
              <T v="heading" style={[styles.tabular, styles.flexCenter]}>
                {Math.min(track.count ?? 0, counter)} of {counter}
              </T>
              <Step label="+1" onPress={() => s().count(id, 1)} />
            </View>
          ) : null}
          <Button
            label={done ? (strength ? 'Undo session' : 'Undo') : strength ? 'Log a session' : 'Mark as done'}
            kind={done ? 'secondary' : 'primary'}
            onPress={() => s().toggle(id)}
          />
          {social && !done ? (
            <Button
              label={track.skipped ? 'Don’t skip today' : 'Skip today'}
              kind="ghost"
              onPress={() => s().setSkipped(id, !track.skipped)}
            />
          ) : null}
          {yesterday !== null ? (
            <View style={styles.yesterday}>
              <T v="caption" color={c.textDim} style={{ flex: 1 }}>
                Yesterday: {P.isDone(program, id, yesterday) ? 'done' : 'not done'} (you can correct it until noon)
              </T>
              <Choice
                label={P.isDone(program, id, yesterday) ? 'Undo yesterday' : 'Done yesterday'}
                on={false}
                onPress={() => s().toggle(id, yesterday)}
              />
            </View>
          ) : null}
        </Card>

        {social ? (
          <Card style={styles.gap}>
            <T v="bodyStrong">Any of these counts</T>
            {P.socialSteps(program, today).map((a) => (
              <T key={a.id} v="caption" color={c.textDim}>
                · {a.text}
              </T>
            ))}
          </Card>
        ) : null}

        {TIMED.has(id) ? (
          <Card style={styles.gap}>
            <T v="bodyStrong">Minutes (optional)</T>
            <T v="caption" color={c.textDim}>
              Note how long it took, if you like. It never changes whether today is done.
            </T>
            <View style={styles.stepper}>
              <Step label="−5" onPress={() => s().setMinutes(id, amount && amount > 5 ? amount - 5 : null)} />
              <T v="heading" style={[styles.tabular, styles.flexCenter]}>
                {amount ? `${amount} min` : '—'}
              </T>
              <Step label="+5" onPress={() => s().setMinutes(id, (amount ?? 0) + 5)} />
            </View>
          </Card>
        ) : null}

        {strength ? (
          <Card style={styles.gap}>
            <T v="bodyStrong">Session details (optional)</T>
            <T v="caption" color={c.textDim}>
              One session counts a day. Choosing a detail logs today’s session if it isn’t yet.
            </T>
            <View style={styles.chips}>
              {SESSION_TYPES.map((t) => (
                <Choice
                  key={t}
                  label={t[0].toUpperCase() + t.slice(1)}
                  on={track.session?.type === t}
                  onPress={() => s().setSession({ type: t })}
                />
              ))}
            </View>
            <View style={styles.stepper}>
              <Step
                label="−5"
                onPress={() => s().setSession({ minutes: Math.max(5, (track.session?.minutes ?? 30) - 5) })}
              />
              <T v="heading" style={[styles.tabular, styles.flexCenter]}>
                {track.session?.minutes ? `${track.session.minutes} min` : '—'}
              </T>
              <Step label="+5" onPress={() => s().setSession({ minutes: (track.session?.minutes ?? 25) + 5 })} />
            </View>
            {done && recoveryNote(program.logs, program.startedAt, today, id) ? (
              <T v="caption" color={c.textDim}>
                You also trained yesterday. That’s fine; going lighter on back-to-back days can help recovery.
              </T>
            ) : null}
          </Card>
        ) : null}

        <Card style={styles.gap}>
          <T v="bodyStrong">Difficulty</T>
          <T v="caption" color={c.textDim}>
            Change it any time. Easier and harder start {week ? 'next Monday' : 'tomorrow'}, never partway through.
          </T>
          <View style={styles.stack}>
            <Button label="Make it easier" kind="secondary" onPress={() => change(() => s().easier(id))} />
            <Button label="Make it harder" kind="secondary" onPress={() => change(() => s().harder(id))} />
          </View>
          <T v="caption" color={c.textDim}>
            How does it feel?
          </T>
          <View style={styles.chips}>
            <Choice label="Too easy" on={recentFeedback === 'too-easy'} onPress={() => s().feedback(id, 'too-easy')} />
            <Choice label="Too hard" on={recentFeedback === 'too-hard'} onPress={() => s().feedback(id, 'too-hard')} />
          </View>
          {message ? <T v="caption">{message}</T> : null}
        </Card>

        {P.habitNotes(id, program.answers).map((n) => (
          <T key={n} v="caption" color={c.textFaint}>
            {n}
          </T>
        ))}
      </ScrollView>
    </Screen>
  );
}

function Step({ label, onPress }: { label: string; onPress: () => void }) {
  return <Button label={label} kind="secondary" style={{ width: 72 }} onPress={onPress} />;
}

function Choice({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
    >
      <ThemedView
        style={[
          styles.chip,
          { backgroundColor: on ? c.accentSoft : c.surfaceHigh, borderColor: on ? c.accentInk : c.border },
        ]}
      >
        <T v="caption" color={on ? c.accentInk : c.text} style={{ fontWeight: '600' }}>
          {label}
        </T>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  gap: { gap: space.sm },
  stack: { gap: space.sm },
  flexCenter: { flex: 1, textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  yesterday: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  tabular: { fontVariant: ['tabular-nums'] },
});
