import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  interpolateColor,
  LinearTransition,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import * as C from '../../core/reset/charts';
import * as P from '../../core/reset/pilot';
import { reflectionDays, type ReflectionAnswer } from '../../core/reset/reflections';
import { haptic } from '../../lib/haptics';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Press } from '../onboarding/Choices';
import { rise } from '../onboarding/kit';
import { SheetHeader } from '../SheetHeader';
import { Button, Screen, T } from '../ui';
import { t as tr } from '../../i18n';
import { useT } from '../../i18n/react';

/*
 * A week's reflection (app/life-reset/reflect.tsx), as a page of the expedition journal: the week's days in small
 * capitals on a hairline, one question, and three answers as full-width rows between hairlines, each led by the shape
 * of the climb (a gentle hill, a steady mountain, a steep peak). The three are drawn alike (neutral outlines, regular
 * weight); the chosen one alone takes the violet and a semibold label, so none reads as the right answer. Then a short
 * honest response as a note, and, when it helps, a look at a
 * habit's easier or harder target. Nothing changes unless the person confirms it; a change goes through the
 * existing rules (pilot.ts easier/harder: from tomorrow or next Monday, eligible levels only), so every past day,
 * XP and streak stays exactly as it was. Habits of the person's own keep their own model and are never offered.
 * The answer is saved the moment it's chosen.
 */

const sys = ReduceMotion.System;
const SETTLE = Easing.bezier(0.22, 1, 0.36, 1);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const option = (id: ReflectionAnswer, shape: string) => ({
  id,
  shape,
  get label() {
    return tr(`weekly.options.${id}`);
  },
});
const OPTIONS: { id: ReflectionAnswer; label: string; shape: string }[] = [
  option('easier', 'M4 50 C 22 36, 36 30, 48 30 C 60 30, 74 36, 92 50 Z'),
  option('right', 'M4 50 L 30 26 L 38 31 L 50 14 L 92 50 Z'),
  option('harder', 'M4 50 L 26 34 L 34 37 L 50 4 L 66 30 L 74 26 L 92 50 Z'),
];

const response = (a: ReflectionAnswer) => tr(`weekly.response.${a}`);

export function WeeklyReflection({
  week,
  initial,
  invite = false,
}: {
  week: number;
  initial: ReflectionAnswer | null;
  /** Opened from the invitation on Habits: offers "Not now", which puts the invitation away. */
  invite?: boolean;
}) {
  const { c } = useTheme();
  const t = useT();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const saved = program?.reflections?.[week]?.answer ?? null;
  const [answer, setAnswer] = useState<ReflectionAnswer | null>(initial ?? saved);
  const [review, setReview] = useState(false);

  // An answer chosen from the invitation is saved as soon as the sheet opens.
  useEffect(() => {
    if (initial && initial !== saved) useResetPilot.getState().reflect(week, initial);
    // Only on opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const today = program ? pilotToday({ program, devDayOffset: offset }) : 0;
  const { from, to } = reflectionDays(week);
  // The week in its own numbers, from the saved days.
  const stats = useMemo(() => {
    if (!program) return null;
    const days = C.dayCells(program, today).slice(from - 1, to);
    return {
      done: days.reduce((n, d) => n + d.done.length, 0),
      planned: days.reduce((n, d) => n + d.planned.length, 0),
      full: days.filter((d) => d.state === 'full').length,
    };
  }, [program, today, from, to]);

  if (!program) return null;
  const choose = (a: ReflectionAnswer) => {
    haptic.select();
    setAnswer(a);
    setReview(false);
    useResetPilot.getState().reflect(week, a);
  };
  const adjustable = program.habits.filter((id) => !program.custom?.[id]);
  const direction = answer === 'easier' ? 'harder' : answer === 'harder' ? 'easier' : null;

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={t('weekly.title', { week })} action={t('weekly.close')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={rise(0)}>
          {/* The week's days, in small capitals on a hairline. */}
          <View style={styles.kickerRow}>
            <T v="overline" color={c.textDim} style={styles.kicker}>
              {t('weekly.kicker', { from, to })}
            </T>
            <ThemedView style={[styles.kickerRule, { backgroundColor: c.border }]} />
          </View>
          <T style={[styles.question, { color: c.text }]} accessibilityRole="header">
            {t('weekly.question')}
          </T>
          {stats && stats.planned ? (
            <T color={c.textDim} style={styles.summary}>
              {stats.full
                ? t('weekly.didFull', { done: stats.done, planned: stats.planned, count: stats.full })
                : t('weekly.did', { done: stats.done, planned: stats.planned })}
            </T>
          ) : null}
        </Animated.View>

        <Animated.View
          entering={rise(100)}
          style={[styles.options, { borderTopColor: c.border }]}
          accessibilityRole="radiogroup"
        >
          {OPTIONS.map((o) => (
            <Option key={o.id} option={o} on={answer === o.id} onPress={() => choose(o.id)} />
          ))}
        </Animated.View>

        {answer ? (
          <Animated.View
            key={answer}
            entering={rise(0)}
            layout={LinearTransition.duration(220).reduceMotion(sys)}
            style={styles.answered}
          >
            {/* The response, as a note in the journal's margin. */}
            <ThemedView style={[styles.response, { borderColor: c.peach }]} accessibilityLiveRegion="polite">
              <T style={styles.responseText}>{response(answer)}</T>
            </ThemedView>

            {adjustable.length && (direction || review) ? (
              <View style={styles.targets}>
                <T style={styles.targetsTitle}>
                  {direction === 'harder'
                    ? t('weekly.bigger')
                    : direction === 'easier'
                      ? t('weekly.lighter')
                      : t('weekly.targets')}
                </T>
                <T color={c.textDim} style={styles.note}>
                  {t('weekly.nothingChanges')}
                </T>
                <ThemedView style={[styles.ledger, { borderTopColor: c.border }]}>
                  {adjustable.map((id) => (
                    <Adjust key={id} program={program} id={id} today={today} way={direction} week={week} />
                  ))}
                </ThemedView>
              </View>
            ) : adjustable.length && answer === 'right' ? (
              <Press
                onPress={() => setReview(true)}
                style={styles.link}
                accessibilityRole="button"
                accessibilityLabel={t('weekly.reviewA11y')}
              >
                <T style={[styles.linkText, { textDecorationColor: `${c.text}4D` }]}>{t('weekly.review')}</T>
              </Press>
            ) : null}
            {program.habits.some((id) => program.custom?.[id]) ? (
              <T color={c.textFaint} style={styles.note}>
                {t('weekly.ownStay')}
              </T>
            ) : null}

            <Button label={t('weekly.done')} onPress={() => router.back()} style={styles.done} />
          </Animated.View>
        ) : (
          <View style={styles.unanswered}>
            <T v="caption" color={c.textFaint} style={styles.noWrong}>
              {t('weekly.noWrong')}
            </T>
            {invite ? (
              <Press
                onPress={() => {
                  useResetPilot.getState().reflect(week);
                  router.back();
                }}
                style={styles.notNow}
                accessibilityRole="button"
                accessibilityLabel={t('reflection.invite.notNowA11y')}
              >
                <T style={[styles.linkText, { textDecorationColor: `${c.text}4D` }]}>{t('reflection.invite.notNow')}</T>
              </Press>
            ) : null}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

/**
 * An answer as a journal row: its climb's shape, then its words. Unchosen, every shape is the same neutral outline and
 * every label the same weight; the chosen one's shape fills with the violet and its label turns semibold.
 */
function Option({ option, on, onPress }: { option: (typeof OPTIONS)[number]; on: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const t = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    t.set(withTiming(on ? 1 : 0, { duration: 260, easing: SETTLE, reduceMotion: sys }));
  }, [on, t]);
  const shape = useAnimatedProps(() => ({
    stroke: interpolateColor(t.value, [0, 1], [c.textFaint, c.accent]),
    fillOpacity: t.value * 0.18,
    strokeWidth: 2.6 + t.value * 0.6,
  }));
  return (
    <Press
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      aria-checked={on}
      accessibilityLabel={option.label}
    >
      <ThemedView style={[styles.option, { borderBottomColor: c.border }]}>
        <Svg width={40} height={23} viewBox="0 0 96 54" style={styles.shape}>
          <AnimatedPath
            d={option.shape}
            fill={c.accent}
            animatedProps={shape}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </Svg>
        <T color={c.text} style={[styles.optionText, on && styles.optionOn]}>
          {option.label}
        </T>
      </ThemedView>
    </Press>
  );
}

/** One habit's easier or harder target, previewed, and changed only on confirmation. */
function Adjust({
  program,
  id,
  today,
  way,
  week,
}: {
  program: P.PilotProgram;
  id: string;
  today: number;
  /** null: both ways are offered (reviewing after "About right"). */
  way: 'easier' | 'harder' | null;
  week: number;
}) {
  const { c } = useTheme();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const ways: ('easier' | 'harder')[] = way ? [way] : ['easier', 'harder'];
  const pending = P.pendingText(program, id, today);
  return (
    <ThemedView style={[styles.adjust, { borderBottomColor: c.border }]}>
      <Press
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={t('weekly.adjustA11y', {
          habit: P.nameOf(program, id),
          level: P.levelLineFor(program, id, today),
        })}
      >
        <View style={styles.adjustHead}>
          <View style={{ flex: 1 }}>
            <T style={styles.habitName}>{P.nameOf(program, id)}</T>
            <T color={c.textDim} style={styles.note}>
              {t('weekly.levelTarget', {
                level: P.levelLineFor(program, id, today),
                target: P.targetText(program, id, today),
              })}
            </T>
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={c.textFaint} />
        </View>
      </Press>
      {open ? (
        <Animated.View entering={FadeIn.duration(180).reduceMotion(sys)} style={{ gap: space.sm }}>
          {done ? (
            <View style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={18} color={c.sage} />
              <T v="caption" style={{ flex: 1 }}>
                {done}
              </T>
            </View>
          ) : pending ? (
            <T v="caption" color={c.textDim}>
              {t('weekly.alreadyChanging', { pending })}
            </T>
          ) : (
            ways.map((w) => {
              const r = w === 'easier' ? P.easier(program, id, today) : P.harder(program, id, today);
              if ('blocked' in r)
                return (
                  <T key={w} v="caption" color={c.textDim}>
                    {t(w === 'easier' ? 'weekly.easierBlocked' : 'weekly.harderBlocked', { reason: r.blocked })}
                  </T>
                );
              const preview = P.pendingText(r.program, id, today);
              return (
                <View key={w} style={{ gap: space.xs }}>
                  <T v="caption">{preview}</T>
                  <Button
                    label={w === 'easier' ? t('weekly.makeEasier') : t('weekly.makeHarder')}
                    kind="secondary"
                    onPress={() => {
                      const s = useResetPilot.getState();
                      const blocked = w === 'easier' ? s.easier(id) : s.harder(id);
                      if (blocked) return;
                      haptic.confirm();
                      s.reflect(week, undefined, [id]);
                      setDone(preview ? t('weekly.changed', { pending: preview }) : t('weekly.changedPlain'));
                    }}
                  />
                </View>
              );
            })
          )}
        </Animated.View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.lg + 4, paddingTop: space.xs, paddingBottom: space.xxl, gap: space.xl },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  kicker: { flexShrink: 1 },
  kickerRule: { flex: 1, height: StyleSheet.hairlineWidth, minWidth: space.lg },
  question: { marginTop: space.sm + 2, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.5 },
  summary: { marginTop: space.sm, fontSize: 16, lineHeight: 22 },
  options: { borderTopWidth: StyleSheet.hairlineWidth },
  option: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingVertical: space.sm + 2,
    paddingHorizontal: 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shape: { overflow: 'visible' },
  optionText: { flex: 1, fontSize: 17, lineHeight: 22, fontWeight: '400' },
  optionOn: { fontWeight: '600' },
  response: { borderStartWidth: 2, paddingStart: space.md + 2, paddingVertical: 2 },
  responseText: { fontSize: 17, lineHeight: 24 },
  targets: { gap: 4 },
  targetsTitle: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
  note: { fontSize: 13.5, lineHeight: 18 },
  ledger: { marginTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth },
  adjust: {
    paddingVertical: space.sm + 2,
    paddingHorizontal: 2,
    gap: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  adjustHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 40 },
  habitName: { fontSize: 16, lineHeight: 21, fontWeight: '500' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { fontSize: 16, lineHeight: 21, fontWeight: '500', textDecorationLine: 'underline' },
  done: { marginTop: space.xs },
  answered: { gap: space.lg },
  unanswered: { gap: space.md },
  noWrong: { marginTop: -space.sm },
  notNow: { minHeight: 44, justifyContent: 'center', alignSelf: 'center', paddingHorizontal: space.lg },
});
