import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Comeback as ComebackState, comebackCopy, RESUMED_COPY } from '../core/comeback';
import { habitIcon, habitTask, habitTitle } from '../core/habits';
import type { PlanHabit } from '../core/types';
import { haptic } from '../lib/haptics';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { T } from './ui';

/** How long "You're back" stays before the card steps aside. */
const RESUMED_MS = 2600;

type Props = {
  comeback: ComebackState | null;
  plan: PlanHabit[];
  onStart: (habitId: string) => void;
};

/**
 * Today's welcome for someone returning after a pause. Offers one small first step (a shortcut to the
 * same check-off as the list below). Once anything is checked today it says so briefly, then leaves.
 */
export function Comeback({ comeback, plan, onStart }: Props) {
  const { c } = useTheme();
  const [dismissed, setDismissed] = useState(false);
  const returning = !!comeback && !comeback.resumed;
  const [wasReturning, setWasReturning] = useState(returning);
  const [settling, setSettling] = useState(false);

  // Only someone who saw the welcome gets the brief "You're back"; a later reopen shows nothing.
  if (returning !== wasReturning) {
    setWasReturning(returning);
    setSettling(!returning && !!comeback?.resumed);
  }
  useEffect(() => {
    if (!settling) return;
    const t = setTimeout(() => setSettling(false), RESUMED_MS);
    return () => clearTimeout(t);
  }, [settling]);

  if (dismissed || !(returning || settling)) return null;

  const step = returning ? plan.find((h) => h.habitId === comeback.suggestion) : undefined;
  const { head, body } = returning ? comebackCopy(comeback) : RESUMED_COPY;

  return (
    <ThemedView
      entering={FadeInDown.duration(380)}
      exiting={FadeOut.duration(320)}
      layout={LinearTransition}
      style={[styles.card, { backgroundColor: c.surface }]}
    >
      <Animated.View key={returning ? 'back' : 'resumed'} entering={FadeIn.duration(260)} style={styles.top}>
        <ThemedView style={[styles.orb, { backgroundColor: c.accentSoft }]}>
          <Ionicons name={returning ? 'leaf-outline' : 'checkmark'} size={20} color={c.accentInk} />
        </ThemedView>
        <View style={styles.text} accessible accessibilityLiveRegion="polite">
          <T v="bodyStrong">{head}</T>
          <T v="caption" color={c.textDim}>
            {body}
          </T>
        </View>
        {returning ? (
          <Pressable
            onPress={() => {
              haptic.tap();
              setDismissed(true);
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Dismiss"
          >
            <Ionicons name="close" size={20} color={c.textFaint} />
          </Pressable>
        ) : null}
      </Animated.View>

      {step ? (
        <Pressable
          onPress={() => {
            haptic.check();
            onStart(step.habitId);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Start with ${habitTitle(step)}. Marks it done for today.`}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <ThemedView style={[styles.step, { backgroundColor: c.bg, borderColor: c.border }]}>
            <Ionicons name={habitIcon(step) as keyof typeof Ionicons.glyphMap} size={20} color={c.accentInk} />
            <View style={styles.text}>
              <T v="overline" color={c.textDim} maxFontSizeMultiplier={1.3}>
                Start with
              </T>
              <T v="bodyStrong" numberOfLines={2}>
                {habitTask(step) ?? habitTitle(step)}
              </T>
            </View>
            <ThemedView style={[styles.check, { borderColor: c.accentInk }]} />
          </ThemedView>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  top: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  orb: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
});
