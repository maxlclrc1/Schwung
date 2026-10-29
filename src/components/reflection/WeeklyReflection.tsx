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
  useAnimatedStyle,
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
import { radius, space, useTheme, type Colors } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Press } from '../onboarding/Choices';
import { rise } from '../onboarding/kit';
import { SheetHeader } from '../SheetHeader';
import { Button, Screen, T } from '../ui';

/*
 * A week's reflection (app/life-reset/reflect.tsx): one question, three answers drawn as the shape of the climb
 * (a gentle hill, a steady mountain, a steep peak), a short honest response, and, when it helps, a look at a
 * habit's easier or harder target. Nothing changes unless the person confirms it; a change goes through the
 * existing rules (pilot.ts easier/harder: from tomorrow or next Monday, eligible levels only), so every past day,
 * XP and streak stays exactly as it was. Habits of the person's own keep their own model and are never offered.
 * The answer is saved the moment it's chosen.
 */

const sys = ReduceMotion.System;
const SETTLE = Easing.bezier(0.22, 1, 0.36, 1);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const OPTIONS: { id: ReflectionAnswer; label: string; shape: string }[] = [
  { id: 'easier', label: 'Easier than expected', shape: 'M4 50 C 22 36, 36 30, 48 30 C 60 30, 74 36, 92 50 Z' },
  { id: 'right', label: 'About right', shape: 'M4 50 L 30 26 L 38 31 L 50 14 L 92 50 Z' },
  { id: 'harder', label: 'Harder than expected', shape: 'M4 50 L 26 34 L 34 37 L 50 4 L 66 30 L 74 26 L 92 50 Z' },
];

const tintOf = (c: Colors, a: ReflectionAnswer) =>
  a === 'easier'
    ? { fill: c.sage, soft: c.sageSoft, ink: c.sageInk }
    : a === 'right'
      ? { fill: c.mist, soft: c.mistSoft, ink: c.mistInk }
      : { fill: c.peach, soft: c.peachSoft, ink: c.peachInk };

const RESPONSE: Record<ReflectionAnswer, string> = {
  easier: 'Lovely. When the steps feel light, you could take a slightly bigger one, only if you want to.',
  right: 'That’s the sweet spot. Keep climbing at this pace.',
  harder: 'Thank you for being honest. Harder weeks happen, and a lighter step still counts.',
};

export function WeeklyReflection({ week, initial }: { week: number; initial: ReflectionAnswer | null }) {
  const { c } = useTheme();
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
    haptic.tap();
    setAnswer(a);
    setReview(false);
    useResetPilot.getState().reflect(week, a);
  };
  const adjustable = program.habits.filter((id) => !program.custom?.[id]);
  const direction = answer === 'easier' ? 'harder' : answer === 'harder' ? 'easier' : null;

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={`Week ${week}`} action="Close" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={rise(0)} style={{ gap: space.sm }}>
          <T v="overline" color={c.accentInk}>
            Days {from}–{to} · a quick check-in
          </T>
          <T style={[styles.question, { color: c.text }]} accessibilityRole="header">
            How did your habits feel this week?
          </T>
          {stats && stats.planned ? (
            <T color={c.textDim}>
              You did {stats.done} of {stats.planned} habit check-ins
              {stats.full ? `, with ${stats.full} complete day${stats.full === 1 ? '' : 's'}` : ''}.
            </T>
          ) : null}
        </Animated.View>

        <Animated.View entering={rise(100)} style={styles.options} accessibilityRole="radiogroup">
          {OPTIONS.map((o) => (
            <Option key={o.id} option={o} on={answer === o.id} onPress={() => choose(o.id)} />
          ))}
        </Animated.View>

        {answer ? (
          <Animated.View
            key={answer}
            entering={rise(0)}
            layout={LinearTransition.duration(220).reduceMotion(sys)}
            style={{ gap: space.lg }}
          >
            <ThemedView
              style={[styles.response, { backgroundColor: tintOf(c, answer).soft }]}
              accessibilityLiveRegion="polite"
            >
              <T style={{ fontSize: 18, lineHeight: 25 }}>{RESPONSE[answer]}</T>
            </ThemedView>

            {adjustable.length && (direction || review) ? (
              <View style={{ gap: space.sm }}>
                <T v="bodyStrong">
                  {direction === 'harder'
                    ? 'Want a slightly bigger step for one habit?'
                    : direction === 'easier'
                      ? 'Want a lighter step for one habit?'
                      : 'Your targets'}
                </T>
                <T v="caption" color={c.textDim}>
                  Nothing changes unless you confirm. Changes start from tomorrow (weekly habits from next Monday); your
                  past days stay exactly as they are.
                </T>
                {adjustable.map((id) => (
                  <Adjust key={id} program={program} id={id} today={today} way={direction} week={week} />
                ))}
              </View>
            ) : adjustable.length && answer === 'right' ? (
              <Press
                onPress={() => setReview(true)}
                accessibilityRole="button"
                accessibilityLabel="Review my targets anyway"
              >
                <T v="bodyStrong" color={c.accentInk}>
                  Review my targets anyway
                </T>
              </Press>
            ) : null}
            {program.habits.some((id) => program.custom?.[id]) ? (
              <T v="caption" color={c.textFaint}>
                Your own habits stay just as you set them.
              </T>
            ) : null}

            <Button label="Done" onPress={() => router.back()} />
          </Animated.View>
        ) : (
          <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
            There’s no wrong answer. It only helps you choose what comes next.
          </T>
        )}
      </ScrollView>
    </Screen>
  );
}

/** An answer as the shape of the climb: it fills with its colour when chosen. */
function Option({ option, on, onPress }: { option: (typeof OPTIONS)[number]; on: boolean; onPress: () => void }) {
  const { c } = useTheme();
  const tint = tintOf(c, option.id);
  const t = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    t.set(withTiming(on ? 1 : 0, { duration: 320, easing: SETTLE, reduceMotion: sys }));
  }, [on, t]);
  const fill = useAnimatedProps(() => ({ fillOpacity: 0.15 + t.value * 0.85 }));
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [c.surface, tint.soft]),
    transform: [{ translateY: -3 * t.value }],
  }));
  return (
    <Press
      onPress={onPress}
      style={{ flex: 1 }}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={option.label}
    >
      <Animated.View style={[styles.option, box]}>
        <Svg width={72} height={42} viewBox="0 0 96 54">
          <AnimatedPath
            d={option.shape}
            fill={tint.fill}
            animatedProps={fill}
            stroke={tint.fill}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </Svg>
        <T v="caption" color={on ? tint.ink : c.text} style={styles.optionText} maxFontSizeMultiplier={1.3}>
          {option.label}
        </T>
      </Animated.View>
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
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const ways: ('easier' | 'harder')[] = way ? [way] : ['easier', 'harder'];
  const pending = P.pendingText(program, id, today);
  return (
    <ThemedView style={[styles.adjust, { backgroundColor: c.surface }]}>
      <Press
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${P.nameOf(program, id)}, ${P.levelLineFor(program, id, today)}. Review`}
      >
        <View style={styles.adjustHead}>
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">{P.nameOf(program, id)}</T>
            <T v="caption" color={c.textDim}>
              {P.levelLineFor(program, id, today)} · {P.targetText(program, id, today)}
            </T>
          </View>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={c.textDim} />
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
              Already changing: {pending}.
            </T>
          ) : (
            ways.map((w) => {
              const r = w === 'easier' ? P.easier(program, id, today) : P.harder(program, id, today);
              if ('blocked' in r)
                return (
                  <T key={w} v="caption" color={c.textDim}>
                    {w === 'easier' ? 'Easier' : 'Harder'}: not available ({r.blocked}).
                  </T>
                );
              const preview = P.pendingText(r.program, id, today);
              return (
                <View key={w} style={{ gap: space.xs }}>
                  <T v="caption">{preview}</T>
                  <Button
                    label={w === 'easier' ? 'Make it easier' : 'Make it harder'}
                    kind="secondary"
                    onPress={() => {
                      const s = useResetPilot.getState();
                      const blocked = w === 'easier' ? s.easier(id) : s.harder(id);
                      if (blocked) return;
                      haptic.success();
                      s.reflect(week, undefined, [id]);
                      setDone(`Done. ${preview ?? ''}`.trim());
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
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  question: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  options: { flexDirection: 'row', gap: space.sm },
  option: {
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    gap: space.sm,
    minHeight: 128,
  },
  optionText: { textAlign: 'center', fontWeight: '700' },
  response: { borderRadius: radius.lg, padding: space.lg },
  adjust: { borderRadius: radius.md, padding: space.md, gap: space.sm },
  adjustHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
