import { router, useLocalSearchParams } from 'expo-router';
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
import { useT } from '../../i18n/react';

/** Habits measured in minutes, where noting the minutes is offered (optional, never needed). */
const TIMED = new Set(['focus_deepwork', 'mind_read', 'move_walk', 'home_tidy', 'skill_practice']);

/**
 * A Life Reset habit's details (app/life-reset/[id].tsx): today and,
 * until noon, yesterday; a counter, a strength session's details or optional minutes where they apply; Social
 * Confidence's steps; and difficulty. Nothing here is needed to complete a habit: a swipe on the card is enough.
 */
export function PilotHabit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const t = useT();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const [message, setMessage] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  if (!program || !program.habits.includes(id)) {
    return (
      <Screen>
        <SheetHeader title={t('today.habit.fallback')} />
      </Screen>
    );
  }

  const s = useResetPilot.getState;
  const own = program.custom?.[id];
  const name = P.nameOf(program, id);
  const today = pilotToday({ program, devDayOffset: offset });
  const yesterday = today > 1 && canEditYesterday(pilotNow(offset)) ? today - 1 : null;
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
    if (blocked) setMessage(t('today.habit.cantChange', { reason: blocked }));
    else {
      haptic.confirm();
      const after = useResetPilot.getState().program;
      const next = after ? P.pendingText(after, id, today) : null;
      setMessage(next ? t('today.habit.saved', { pending: next }) : t('today.habit.savedBack'));
    }
  };

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={name} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card style={styles.gap}>
          <T v="overline" color={c.accentInk}>
            {P.levelLineFor(program, id, today)}
          </T>
          <T v="heading">{social ? t('today.habit.todaysStep') : P.targetText(program, id, today)}</T>
          {social ? <T>{P.targetText(program, id, today)}</T> : null}
          <T color={c.textDim}>{P.frequencyText(program, id, today)}</T>
          {week ? (
            <T v="bodyStrong">
              {week.goal === 0
                ? t('today.habit.shortWeek')
                : t(week.credited >= week.goal ? 'today.habit.weekMet' : 'today.habit.week', {
                    done: week.credited,
                    goal: week.goal,
                  })}
            </T>
          ) : null}
          {week && week.goal > week.credited ? (
            <T v="caption" color={c.textDim}>
              {t('today.habit.anyDays')}
            </T>
          ) : null}
          {pending ? (
            <T v="caption" color={c.accentInk}>
              {t('today.habit.comingUp', { pending })}
            </T>
          ) : null}
        </Card>

        <Card style={styles.gap}>
          <T v="bodyStrong">{t('today.habit.today')}</T>
          <T color={c.textDim}>
            {done
              ? strength
                ? t('today.habit.sessionLogged')
                : t('today.habit.done')
              : track.skipped
                ? t('today.habit.skipped')
                : strength
                  ? t('today.habit.noSession')
                  : t('today.habit.notYet')}
          </T>
          {counter !== null ? (
            <View style={styles.stepper}>
              <Step label="−1" onPress={() => s().count(id, -1)} />
              <T v="heading" style={[styles.tabular, styles.flexCenter]}>
                {t('today.habit.of', { done: Math.min(track.count ?? 0, counter), goal: counter })}
              </T>
              <Step label="+1" onPress={() => s().count(id, 1)} />
            </View>
          ) : null}
          <Button
            label={
              done
                ? strength
                  ? t('today.habit.undoSession')
                  : t('today.habit.undo')
                : strength
                  ? t('today.habit.logSession')
                  : t('today.habit.markDone')
            }
            kind={done ? 'secondary' : 'primary'}
            onPress={() => s().toggle(id)}
          />
          {social && !done ? (
            <Button
              label={track.skipped ? t('today.habit.dontSkip') : t('today.habit.skip')}
              kind="ghost"
              onPress={() => s().setSkipped(id, !track.skipped)}
            />
          ) : null}
          {yesterday !== null ? (
            <View style={styles.yesterday}>
              <T v="caption" color={c.textDim} style={{ flex: 1 }}>
                {P.isDone(program, id, yesterday) ? t('today.habit.yesterdayDone') : t('today.habit.yesterdayNotDone')}
              </T>
              <Choice
                label={
                  P.isDone(program, id, yesterday) ? t('today.habit.undoYesterday') : t('today.habit.doneYesterday')
                }
                on={false}
                onPress={() => s().toggle(id, yesterday)}
              />
            </View>
          ) : null}
        </Card>

        {social ? (
          <Card style={styles.gap}>
            <T v="bodyStrong">{t('today.habit.anyCounts')}</T>
            {P.socialSteps(program, today).map((a) => (
              <T key={a.id} v="caption" color={c.textDim}>
                · {P.socialText(a)}
              </T>
            ))}
          </Card>
        ) : null}

        {TIMED.has(id) ? (
          <Card style={styles.gap}>
            <T v="bodyStrong">{t('today.habit.minutes')}</T>
            <T v="caption" color={c.textDim}>
              {t('today.habit.minutesHint')}
            </T>
            <View style={styles.stepper}>
              <Step label="−5" onPress={() => s().setMinutes(id, amount && amount > 5 ? amount - 5 : null)} />
              <T v="heading" style={[styles.tabular, styles.flexCenter]}>
                {amount ? t('today.habit.min', { minutes: amount }) : '—'}
              </T>
              <Step label="+5" onPress={() => s().setMinutes(id, (amount ?? 0) + 5)} />
            </View>
          </Card>
        ) : null}

        {strength ? (
          <Card style={styles.gap}>
            <T v="bodyStrong">{t('today.habit.session')}</T>
            <T v="caption" color={c.textDim}>
              {t('today.habit.sessionHint')}
            </T>
            <View style={styles.chips}>
              {SESSION_TYPES.map((type) => (
                <Choice
                  key={type}
                  label={P.sessionName(type)}
                  on={track.session?.type === type}
                  onPress={() => s().setSession({ type })}
                />
              ))}
            </View>
            <View style={styles.stepper}>
              <Step
                label="−5"
                onPress={() => s().setSession({ minutes: Math.max(5, (track.session?.minutes ?? 30) - 5) })}
              />
              <T v="heading" style={[styles.tabular, styles.flexCenter]}>
                {track.session?.minutes ? t('today.habit.min', { minutes: track.session.minutes }) : '—'}
              </T>
              <Step label="+5" onPress={() => s().setSession({ minutes: (track.session?.minutes ?? 25) + 5 })} />
            </View>
            {done && recoveryNote(program.logs, program.startedAt, today, id) ? (
              <T v="caption" color={c.textDim}>
                {t('today.habit.recovery')}
              </T>
            ) : null}
          </Card>
        ) : null}

        {own ? null : (
          <Card style={styles.gap}>
            <T v="bodyStrong">{t('today.habit.difficulty')}</T>
            <T v="caption" color={c.textDim}>
              {week ? t('today.habit.difficultyHintWeek') : t('today.habit.difficultyHintDay')}
            </T>
            <View style={styles.stack}>
              <Button label={t('today.habit.easier')} kind="secondary" onPress={() => change(() => s().easier(id))} />
              <Button label={t('today.habit.harder')} kind="secondary" onPress={() => change(() => s().harder(id))} />
            </View>
            <T v="caption" color={c.textDim}>
              {t('today.habit.feel')}
            </T>
            <View style={styles.chips}>
              <Choice
                label={t('today.habit.tooEasy')}
                on={recentFeedback === 'too-easy'}
                onPress={() => s().feedback(id, 'too-easy')}
              />
              <Choice
                label={t('today.habit.tooHard')}
                on={recentFeedback === 'too-hard'}
                onPress={() => s().feedback(id, 'too-hard')}
              />
            </View>
            {message ? <T v="caption">{message}</T> : null}
          </Card>
        )}

        {own
          ? null
          : P.habitNotes(id, program.answers).map((n) => (
              <T key={n} v="caption" color={c.textFaint}>
                {n}
              </T>
            ))}

        <Card style={styles.gap}>
          <T v="bodyStrong">{t('today.habit.remove')}</T>
          <T v="caption" color={c.textDim}>
            {P.isDone(program, id, today) ? t('today.habit.leavesTomorrow') : t('today.habit.leavesToday')}
            {own ? t('today.habit.pastStays') : t('today.habit.pastStaysAdd')}
          </T>
          {removing ? (
            <View style={styles.stack}>
              <Button
                label={t('today.habit.removeName', { habit: name })}
                kind="danger"
                onPress={() => {
                  const problem = s().removeHabit(id);
                  if (problem) setRemoveError(problem);
                  else {
                    haptic.confirm();
                    if (router.canGoBack()) router.back();
                    else router.replace('/today');
                  }
                }}
              />
              <Button label={t('today.habit.keepIt')} kind="ghost" onPress={() => setRemoving(false)} />
            </View>
          ) : (
            <Button label={t('today.habit.removeThis')} kind="secondary" onPress={() => setRemoving(true)} />
          )}
          {removeError ? (
            <T v="caption" color={c.danger}>
              {removeError}
            </T>
          ) : null}
        </Card>
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
        haptic.select();
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
