import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { LayoutAnimationConfig } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { canEditYesterday } from '../../core/dates';
import * as P from '../../core/reset/pilot';
import { PARTIAL_XP, recoveryNote, SESSION_TYPES } from '../../core/reset/tracking';
import { completionHaptic, haptic } from '../../lib/haptics';
import { pilotNow, pilotToday, useResetPilot } from '../../store/resetPilot';
import { space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { conceal, reflow, reveal } from '../../theme/motion';
import { Scene } from '../HabitCard';
import { SheetHeader } from '../SheetHeader';
import { Button, Screen, T } from '../ui';
import { useT } from '../../i18n/react';
import { IS_RTL } from '../../i18n/direction';
import { Tap } from '../Tap';

/** The shared reveal, conceal and reflow (theme/motion.ts). */
const REVEAL = reveal();
const CONCEAL = conceal();
const REFLOW = reflow();

/**
 * A Life Reset habit's details (app/life-reset/[id].tsx), as a page of the journal: the habit's own painting, its
 * name and target; then Today (its state, the one filled action, partial progress, a counter or minutes, and
 * yesterday's correction until noon), a weekly habit's week, a strength session's details, difficulty, and removal
 * last. Nothing here is needed to complete a habit: a swipe on the card is enough.
 */
export function PilotHabit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const t = useT();
  const { width } = useWindowDimensions();
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
  const counter = P.counterTarget(program, id, today);
  const pending = P.pendingText(program, id, today);
  const fb = program.progression[id].feedback;
  // Feedback about the current target only (as readiness reads it).
  const since = program.progression[id].eras.filter((e) => e.fromDay <= today).pop()?.fromDay ?? 1;
  const recentFeedback = fb && fb.day >= since ? fb.kind : null;
  // Partial progress: minutes logged (older saves may hold minutes noted before progress existed).
  const progress = P.progressKind(program, id, today);
  const logged = track.progress?.value ?? (track.progress ? null : (track.amount?.value ?? null));
  const canLog = P.progressOpen(program, id, today);
  const showMinutes = canLog && progress.kind === 'minutes';
  // The partial-progress rule, said once: by the partial action, or by the counter.
  const showHint = !done && (canLog || counter !== null);
  const logProgress = (value: number | null) => {
    haptic.select();
    s().setProgress(id, value);
  };
  const heroHeight = Math.round(Math.min(width, 520) * 0.5);

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

  const state = done
    ? strength
      ? t('today.habit.sessionLogged')
      : t('today.habit.done')
    : track.skipped
      ? t('today.habit.skipped')
      : track.progress
        ? t('today.habit.partial')
        : strength
          ? t('today.habit.noSession')
          : t('today.habit.notYet');

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Contents ease in and out as they change (docs/INTERACTION_AUDIT.md, finding D); nothing animates as the
            sheet opens or closes. */}
        <LayoutAnimationConfig skipEntering skipExiting>
          {/* The habit's painting, fading into the page; the sheet's grabber and Done sit on it. */}
          <View style={{ height: heroHeight }} accessible={false} importantForAccessibility="no-hide-descendants">
            <View style={[StyleSheet.absoluteFill, styles.clip]}>
              <Scene habitId={id} scene={own?.scene} width={Math.min(width, 520)} height={heroHeight} />
            </View>
            <LinearGradient colors={['rgba(20,16,40,0.32)', 'rgba(20,16,40,0)']} style={styles.shade} />
            <LinearGradient colors={[`${c.bg}00`, c.bg]} locations={[0, 0.92]} style={styles.fade} />
            <View style={styles.grabber} />
          </View>
          <Tap
            onPress={() => {
              router.back();
              haptic.select();
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={t('nav.done')}
            style={styles.done}
          >
            <T v="bodyStrong" color="#FFFFFF" style={styles.doneText}>
              {t('nav.done')}
            </T>
          </Tap>

          <View style={styles.page}>
            <View style={styles.head}>
              <T v="overline" color={c.textDim} style={styles.level}>
                {P.levelLineFor(program, id, today)}
              </T>
              <T v="title" accessibilityRole="header">
                {name}
              </T>
              <T style={styles.target}>{P.targetText(program, id, today)}</T>
              <T v="caption" color={c.textDim} style={styles.freq}>
                {P.frequencyText(program, id, today)}
              </T>
              {pending ? (
                <Animated.View key={pending} entering={REVEAL} exiting={CONCEAL} layout={REFLOW}>
                  <T v="caption" color={c.accentInk} style={styles.freq}>
                    {t('today.habit.comingUp', { pending })}
                  </T>
                </Animated.View>
              ) : null}
            </View>

            {week ? (
              <Animated.View layout={REFLOW}>
                <Section title={t('today.habit.thisWeek')} />
                <View style={styles.week}>
                  {week.goal > 0 ? (
                    <View style={styles.weekDots} accessible={false} importantForAccessibility="no-hide-descendants">
                      {Array.from({ length: week.goal }, (_, i) => (
                        <ThemedView
                          key={i}
                          style={[
                            styles.weekDot,
                            i < week.credited
                              ? { backgroundColor: c.sage, borderColor: c.sage }
                              : { borderColor: c.textFaint },
                          ]}
                        />
                      ))}
                    </View>
                  ) : null}
                  <T style={styles.weekText}>
                    {week.goal === 0
                      ? t('today.habit.shortWeek')
                      : t(week.credited >= week.goal ? 'today.habit.weekMet' : 'today.habit.week', {
                          done: week.credited,
                          goal: week.goal,
                        })}
                  </T>
                </View>
                {week.goal > week.credited ? (
                  <T v="caption" color={c.textDim} style={styles.note}>
                    {t('today.habit.anyDays')}
                  </T>
                ) : null}
              </Animated.View>
            ) : null}

            <Animated.View layout={REFLOW}>
              <Section title={t('today.habit.today')} note={t('common.day', { day: today })} />
              <View style={styles.state} accessible accessibilityLiveRegion="polite">
                {/* The tick fades in beside the state; the words themselves change at once, so the line is never
                    blank. */}
                {done ? (
                  <Animated.View entering={REVEAL} style={styles.checkWrap}>
                    <Check color={c.sage} />
                  </Animated.View>
                ) : null}
                <T style={styles.stateText}>{state}</T>
                {track.progress && !done && logged ? (
                  <Animated.View entering={REVEAL}>
                    <T color={c.textDim} style={styles.stateSub}>
                      {t('today.habit.min', { minutes: logged })}
                    </T>
                  </Animated.View>
                ) : null}
              </View>
            </Animated.View>

            {counter !== null ? (
              <Animated.View layout={REFLOW} style={styles.rows}>
                <Ledger label={t('today.habit.of', { done: Math.min(track.count ?? 0, counter), goal: counter })} big>
                  <Stepper
                    minus={() => completionHaptic(s().count(id, -1))}
                    plus={() => completionHaptic(s().count(id, 1))}
                    step="1"
                  />
                </Ledger>
              </Animated.View>
            ) : null}

            {/* Mark done and Undo trade places: the one going leaves at once, the one coming fades in, and what's below
                glides to its new place (one movement, nothing sliding over content that is still fading). */}
            {done ? (
              <Animated.View key="undo" entering={REVEAL} layout={REFLOW}>
                <TextLink
                  label={strength ? t('today.habit.undoSession') : t('today.habit.undo')}
                  onPress={() => completionHaptic(s().toggle(id))}
                  align="start"
                />
              </Animated.View>
            ) : (
              <Animated.View key="mark" entering={REVEAL} layout={REFLOW}>
                <Button
                  label={strength ? t('today.habit.logSession') : t('today.habit.markDone')}
                  onPress={() => completionHaptic(s().toggle(id))}
                  style={styles.primary}
                />
                {canLog ? (
                  // Same place, new words: a crossfade.
                  <Animated.View key={track.progress ? 'remove' : 'add'} entering={REVEAL} exiting={CONCEAL}>
                    <TextLink
                      label={track.progress ? t('today.habit.removePartial') : t('today.habit.effort')}
                      onPress={() => {
                        haptic.select();
                        s().setPartial(id, !track.progress);
                      }}
                    />
                  </Animated.View>
                ) : null}
              </Animated.View>
            )}
            {showHint ? (
              <Animated.View entering={REVEAL} layout={REFLOW}>
                <T v="caption" color={c.textDim} style={styles.hint}>
                  {t('today.habit.progressHint', { xp: PARTIAL_XP })}
                </T>
              </Animated.View>
            ) : null}

            {/* The minutes row and yesterday's row, each moving on its own (no reflow inside a reflow). */}
            {showMinutes ? (
              <Animated.View entering={REVEAL} layout={REFLOW} style={styles.rows}>
                <Ledger label={t('today.habit.partialMinutes')}>
                  <Stepper
                    minus={() => logProgress(logged && logged > 5 ? logged - 5 : null)}
                    plus={() => logProgress((logged ?? 0) + 5)}
                    value={logged ? t('today.habit.min', { minutes: logged }) : '—'}
                    step="5"
                  />
                </Ledger>
              </Animated.View>
            ) : null}
            {yesterday !== null ? (
              <Animated.View layout={REFLOW} style={showMinutes ? null : styles.rows}>
                <Ledger
                  label={
                    P.isDone(program, id, yesterday)
                      ? t('today.habit.yesterdayDone')
                      : t('today.habit.yesterdayNotDone')
                  }
                  small
                >
                  <TextLink
                    label={
                      P.isDone(program, id, yesterday) ? t('today.habit.undoYesterday') : t('today.habit.doneYesterday')
                    }
                    onPress={() => completionHaptic(s().toggle(id, yesterday))}
                    accent
                  />
                </Ledger>
              </Animated.View>
            ) : null}

            {strength ? (
              <Animated.View layout={REFLOW}>
                <Section title={t('today.habit.session')} />
                <T v="caption" color={c.textDim} style={styles.note}>
                  {t('today.habit.sessionHint')}
                </T>
                <View style={styles.options}>
                  {SESSION_TYPES.map((type) => (
                    <Option
                      key={type}
                      label={P.sessionName(type)}
                      on={track.session?.type === type}
                      onPress={() => s().setSession({ type })}
                    />
                  ))}
                </View>
                <View style={styles.rows}>
                  <Ledger>
                    <Stepper
                      minus={() => s().setSession({ minutes: Math.max(5, (track.session?.minutes ?? 30) - 5) })}
                      plus={() => s().setSession({ minutes: (track.session?.minutes ?? 25) + 5 })}
                      value={track.session?.minutes ? t('today.habit.min', { minutes: track.session.minutes }) : '—'}
                      step="5"
                    />
                  </Ledger>
                </View>
                {done && recoveryNote(program.logs, program.startedAt, today, id) ? (
                  <Animated.View entering={REVEAL} exiting={CONCEAL}>
                    <T v="caption" color={c.textDim} style={styles.note}>
                      {t('today.habit.recovery')}
                    </T>
                  </Animated.View>
                ) : null}
              </Animated.View>
            ) : null}

            {own ? null : (
              <Animated.View layout={REFLOW}>
                <Section title={t('today.habit.difficulty')} />
                <T v="caption" color={c.textDim} style={styles.note}>
                  {week ? t('today.habit.difficultyHintWeek') : t('today.habit.difficultyHintDay')}
                </T>
                <ThemedView style={[styles.pair, { borderColor: c.border }]}>
                  <PairHalf
                    label={t('today.habit.easier')}
                    arrow={IS_RTL ? '›' : '‹'}
                    onPress={() => change(() => s().easier(id))}
                  />
                  <ThemedView style={[styles.pairRule, { backgroundColor: c.border }]} />
                  <PairHalf
                    label={t('today.habit.harder')}
                    arrow={IS_RTL ? '‹' : '›'}
                    end
                    onPress={() => change(() => s().harder(id))}
                  />
                </ThemedView>
                <View style={styles.feel}>
                  <T color={c.textDim} style={styles.feelQ}>
                    {t('today.habit.feel')}
                  </T>
                  <View style={styles.feelOpts}>
                    <Option
                      label={t('today.habit.tooEasy')}
                      on={recentFeedback === 'too-easy'}
                      onPress={() => s().feedback(id, 'too-easy')}
                    />
                    <Option
                      label={t('today.habit.tooHard')}
                      on={recentFeedback === 'too-hard'}
                      onPress={() => s().feedback(id, 'too-hard')}
                    />
                  </View>
                </View>
                {/* Each new message fades in in place of the last. */}
                {message ? (
                  <Animated.View key={message} entering={REVEAL} exiting={CONCEAL}>
                    <T v="caption" style={styles.note} accessibilityLiveRegion="polite">
                      {message}
                    </T>
                  </Animated.View>
                ) : null}
                {P.habitNotes(id, program.answers).map((n) => (
                  <Animated.View key={n} layout={REFLOW}>
                    <ThemedView style={[styles.tip, { borderColor: c.border }]}>
                      <T v="caption" color={c.textDim}>
                        {n}
                      </T>
                    </ThemedView>
                  </Animated.View>
                ))}
              </Animated.View>
            )}

            <Animated.View layout={REFLOW}>
              <ThemedView style={[styles.remove, { borderColor: c.border }]}>
                {removing ? (
                  // The confirmation opens in place of the link (and the link returns in its place); the note below
                  // glides to make room.
                  <Animated.View key="confirm" entering={REVEAL} style={styles.confirm}>
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
                  </Animated.View>
                ) : (
                  <Animated.View key="ask" entering={REVEAL}>
                    <TextLink label={t('today.habit.remove')} onPress={() => setRemoving(true)} danger align="start" />
                  </Animated.View>
                )}
                <Animated.View layout={REFLOW}>
                  <T v="caption" color={c.textDim}>
                    {done ? t('today.habit.leavesTomorrow') : t('today.habit.leavesToday')}
                    {own ? t('today.habit.pastStays') : t('today.habit.pastStaysAdd')}
                  </T>
                </Animated.View>
                {removeError ? (
                  <Animated.View key={removeError} entering={REVEAL} exiting={CONCEAL} layout={REFLOW}>
                    <T v="caption" color={c.danger} accessibilityLiveRegion="polite">
                      {removeError}
                    </T>
                  </Animated.View>
                ) : null}
              </ThemedView>
            </Animated.View>
          </View>
        </LayoutAnimationConfig>
      </ScrollView>
    </Screen>
  );
}

/** A section of the page: its name in small capitals, a hairline, and an optional note at the end. */
function Section({ title, note }: { title: string; note?: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.section} accessible accessibilityRole="header">
      <T v="overline" color={c.textDim} style={styles.sectionTitle} maxFontSizeMultiplier={1.5}>
        {title}
      </T>
      <ThemedView style={[styles.sectionRule, { backgroundColor: c.border }]} />
      {note ? (
        <T v="caption" color={c.textDim} maxFontSizeMultiplier={1.5}>
          {note}
        </T>
      ) : null}
    </View>
  );
}

/** One row of the ledger: what it is, and its control at the end; a hairline above. */
function Ledger({
  label,
  children,
  big,
  small,
}: {
  label?: string;
  children: ReactNode;
  big?: boolean;
  small?: boolean;
}) {
  const { c } = useTheme();
  return (
    <ThemedView style={[styles.ledger, { borderColor: c.border }]}>
      {label === undefined ? null : (
        <T
          v={small ? 'caption' : 'body'}
          style={[styles.ledgerLabel, big && styles.ledgerBig, small && styles.ledgerSmall]}
          color={small ? c.textDim : c.text}
        >
          {label}
        </T>
      )}
      {children}
    </ThemedView>
  );
}

/** − value +, in small round buttons (44 pt to touch). */
function Stepper({ minus, plus, value, step }: { minus: () => void; plus: () => void; value?: string; step: string }) {
  return (
    <View style={styles.stepper}>
      <Round label="−" a11y={`−${step}`} onPress={minus} />
      {value !== undefined ? (
        <T style={styles.stepValue} accessibilityLiveRegion="polite">
          {value}
        </T>
      ) : null}
      <Round label="+" a11y={`+${step}`} onPress={plus} />
    </View>
  );
}

function Round({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} hitSlop={4} style={styles.roundHit}>
      <ThemedView style={[styles.round, { borderColor: c.border }]}>
        <T style={styles.roundText} color={c.text}>
          {label}
        </T>
      </ThemedView>
    </Tap>
  );
}

/** A secondary action as words: underlined by a hairline, red for removal, violet for a correction. */
function TextLink({
  label,
  onPress,
  align = 'center',
  danger,
  accent,
}: {
  label: string;
  onPress: () => void;
  align?: 'center' | 'start';
  danger?: boolean;
  accent?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Tap
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      style={[styles.link, { alignSelf: align === 'center' ? 'center' : 'flex-start' }]}
    >
      <T
        style={[
          styles.linkText,
          !danger && !accent && { textDecorationLine: 'underline', textDecorationColor: `${c.text}40` },
        ]}
        color={danger ? c.danger : accent ? c.accentInk : c.text}
      >
        {label}
      </T>
    </Tap>
  );
}

/** Half of the divided easier / harder row. */
function PairHalf({
  label,
  arrow,
  end,
  onPress,
}: {
  label: string;
  arrow: string;
  end?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.half}>
      {end ? null : <T color={c.textFaint}>{arrow}</T>}
      <T style={styles.halfText}>{label}</T>
      {end ? <T color={c.textFaint}>{arrow}</T> : null}
    </Tap>
  );
}

/** A choice as a small radio mark and its words. */
function Option({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Tap
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      style={styles.option}
    >
      <ThemedView style={[styles.radio, { borderColor: on ? c.accent : c.textFaint }]}>
        {on ? <ThemedView style={[styles.radioDot, { backgroundColor: c.accent }]} /> : null}
      </ThemedView>
      <T style={styles.optionText}>{label}</T>
    </Tap>
  );
}

/** Done: a thin sage check in a ring. */
function Check({ color }: { color: string }) {
  return (
    <View style={[styles.check, { borderColor: color }]}>
      <Svg width={13} height={13} viewBox="0 0 13 13">
        <Path d="M2.5 6.8l2.8 2.7 5.2-6" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xxxl },
  clip: { overflow: 'hidden' },
  shade: { position: 'absolute', left: 0, right: 0, top: 0, height: 72 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 96 },
  grabber: {
    position: 'absolute',
    top: 7,
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  done: { position: 'absolute', top: 14, end: space.lg, minHeight: 32, justifyContent: 'center' },
  doneText: { textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 0 } },
  page: { paddingHorizontal: space.lg + 4, marginTop: -36 },
  head: { gap: 4 },
  level: { letterSpacing: 2, fontSize: 11.5 },
  target: { fontSize: 19, lineHeight: 26, marginTop: 2 },
  freq: { fontSize: 15, lineHeight: 20 },
  section: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: space.xxl },
  sectionTitle: { flexShrink: 1, maxWidth: '70%', fontSize: 11.5, letterSpacing: 2 },
  sectionRule: { flex: 1, minWidth: 12, height: StyleSheet.hairlineWidth },
  week: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.md, marginTop: space.lg },
  weekDots: { flexDirection: 'row', gap: 12 },
  weekDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.4 },
  weekText: { flexShrink: 1, fontSize: 15, lineHeight: 20 },
  note: { marginTop: space.md },
  state: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: space.md, marginTop: space.lg },
  stateText: { fontSize: 28, lineHeight: 34, fontWeight: '300', letterSpacing: -0.4, flexShrink: 1 },
  stateSub: { fontSize: 15, lineHeight: 20 },
  checkWrap: { alignSelf: 'center' },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  primary: { marginTop: space.xl },
  hint: { marginTop: space.xs, textAlign: 'center' },
  rows: { marginTop: space.lg },
  ledger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingVertical: space.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: -StyleSheet.hairlineWidth,
  },
  ledgerLabel: { flex: 1, fontSize: 16, lineHeight: 21 },
  ledgerSmall: { fontSize: 14, lineHeight: 19 },
  ledgerBig: { fontSize: 22, lineHeight: 28, fontWeight: '300', fontVariant: ['tabular-nums'] },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  stepValue: { minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] },
  roundHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  round: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundText: { fontSize: 20, lineHeight: 24, fontWeight: '300' },
  link: { minHeight: 44, justifyContent: 'center', paddingVertical: space.xs },
  linkText: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  options: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.xl, marginTop: space.xs },
  pair: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: space.lg,
  },
  pairRule: { width: StyleSheet.hairlineWidth },
  half: {
    flex: 1,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
  },
  halfText: { fontWeight: '500', textAlign: 'center', flexShrink: 1 },
  feel: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.md, marginTop: space.xs },
  feelQ: { flexGrow: 1, fontSize: 15, lineHeight: 20 },
  feelOpts: { flexDirection: 'row', columnGap: space.lg },
  optionText: { fontSize: 15, lineHeight: 20 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.3, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 9, height: 9, borderRadius: 4.5 },
  tip: { marginTop: space.lg, paddingStart: space.md, borderStartWidth: StyleSheet.hairlineWidth },
  remove: { marginTop: space.xxl, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: 2 },
  confirm: { gap: space.sm, marginVertical: space.sm },
});
