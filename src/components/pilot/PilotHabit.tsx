import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SheetHeader } from '../SheetHeader';
import { Button, Card, Screen, T } from '../ui';
import { dateForDay } from '../../core/dates';
import * as P from '../../core/reset/pilot';
import { activeMs } from '../../core/reset/timer';
import { readTrack, recoveryNote, SESSION_TYPES } from '../../core/reset/tracking';
import { haptic } from '../../lib/haptics';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * A pilot habit's details: today, the optional timer and minutes, a strength session's details, and difficulty
 * (development and internal-testing builds only: see app/pilot/[id].tsx).
 */
export function PilotHabit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const [now, setNow] = useState(() => Date.now());
  const [message, setMessage] = useState<string | null>(null);
  const today = program ? pilotToday({ program, devDayOffset: offset }) : 0;
  const timer = program && P.isPilotHabit(id) ? P.timerOn(program, id, today, now, today) : null;
  const running = timer?.status === 'running';
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), running ? 1000 : 30_000);
    return () => clearInterval(t);
  }, [running]);

  if (!program || !P.isPilotHabit(id) || !program.habits.includes(id)) {
    return (
      <Screen>
        <SheetHeader title="Habit" />
      </Screen>
    );
  }

  const s = useResetPilot.getState;
  const level = P.levelFor(program, id, today);
  const done = P.isDone(program, id, today);
  const week = P.weekProgress(program, id, today);
  const track = readTrack(program.logs[dateForDay(program.startedAt, today)], id);
  const strength = id === 'strength_log';
  const pending = P.pendingText(program, id, today);
  const fb = program.progression[id].feedback;
  // Feedback about the current target only (as readiness reads it).
  const since = program.progression[id].eras.filter((e) => e.fromDay <= today).pop()?.fromDay ?? 1;
  const recentFeedback = fb && fb.day >= since ? fb.kind : null;
  const amount = track.amount?.value ?? null;
  const total = timer ? timer.blocks.reduce((a, b) => a + b, 0) * 60_000 : 0;

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
          <T v="heading">{P.targetText(program, id, today)}</T>
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
            {done ? (strength ? 'Session logged.' : 'Done.') : strength ? 'No session logged today.' : 'Not done yet.'}
          </T>
          <Button
            label={done ? (strength ? 'Undo session' : 'Undo') : strength ? 'Log a session' : 'Mark as done'}
            kind={done ? 'secondary' : 'primary'}
            onPress={() => s().toggle(id)}
          />
        </Card>

        {!strength ? (
          <Card style={styles.gap}>
            <T v="bodyStrong">Timer (optional)</T>
            {timer ? (
              <T v="title" style={styles.tabular}>
                {clock(activeMs(timer, now))} / {clock(total)}
              </T>
            ) : null}
            {timer && timer.blocks.length > 1 ? (
              <T v="caption" color={c.textDim}>
                {timer.blocks.length} blocks of {timer.blocks[0]} min. Block{' '}
                {Math.min(timer.block + 1, timer.blocks.length)}.
              </T>
            ) : null}
            <T v="caption" color={c.textDim}>
              {timer?.status === 'ready'
                ? 'Target reached. Confirm when you’ve finished: the timer never marks it done by itself.'
                : timer?.status === 'day-ended'
                  ? 'The timer stopped at midnight. Its time stays with that day.'
                  : 'Keeps counting when you leave the app. You can always just swipe instead.'}
            </T>
            <View style={styles.buttons}>
              {timer?.status === 'ready' && !done ? (
                <Button label="Confirm done" style={styles.flex} onPress={() => s().complete(id)} />
              ) : running ? (
                <Button label="Pause" style={styles.flex} onPress={() => s().pauseTimer(id)} />
              ) : timer?.status !== 'day-ended' && timer?.status !== 'ready' && !done ? (
                <Button
                  label={timer && timer.status !== 'idle' ? 'Resume' : 'Start'}
                  style={styles.flex}
                  onPress={() => s().startTimer(id)}
                />
              ) : null}
              {timer && timer.status !== 'idle' ? (
                <Button label="Reset" kind="secondary" style={styles.flex} onPress={() => s().resetTimer(id)} />
              ) : null}
            </View>
          </Card>
        ) : null}

        {!strength ? (
          <Card style={styles.gap}>
            <T v="bodyStrong">Minutes (optional)</T>
            <T v="caption" color={c.textDim}>
              Note how long you {id === 'mind_read' ? 'read' : 'focused'}, now or later. It never changes whether today
              is done.{track.minutes ? ` The timer counted ${track.minutes} min.` : ''}
            </T>
            <View style={styles.stepper}>
              <Step label="−5" onPress={() => s().setMinutes(id, amount && amount > 5 ? amount - 5 : null)} />
              <T v="heading" style={[styles.tabular, styles.flexCenter]}>
                {amount ? `${amount} min` : '—'}
              </T>
              <Step label="+5" onPress={() => s().setMinutes(id, (amount ?? 0) + 5)} />
            </View>
            {amount ? <Button label="Clear minutes" kind="ghost" onPress={() => s().setMinutes(id, null)} /> : null}
          </Card>
        ) : (
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
        )}

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
  buttons: { flexDirection: 'row', gap: space.sm },
  stack: { gap: space.sm },
  flex: { flex: 1 },
  flexCenter: { flex: 1, textAlign: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
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
