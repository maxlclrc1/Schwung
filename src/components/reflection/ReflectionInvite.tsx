import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import * as P from '../../core/reset/pilot';
import { dueReflection } from '../../core/reset/reflections';
import { flipX } from '../../i18n/direction';
import { useT } from '../../i18n/react';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Press } from '../onboarding/Choices';
import { T } from '../ui';
import { pushOnce } from '../../lib/navigation';

const sys = ReduceMotion.System;

/**
 * On Habits, after a program week ends: one quiet row inviting a reflection, never in the way of the cards. Reflect
 * opens the check-in sheet with its three answers and a "Not now" that puts the invitation away for good (it can be
 * opened from Journey). Closing the sheet without either keeps the invitation. Only the latest finished week is
 * ever offered.
 */
export function ReflectionInvite({ program, today }: { program: P.PilotProgram; today: number }) {
  const { c } = useTheme();
  const t = useT();
  // On a narrow screen or with large text the question keeps its room: the action shows as its arrow alone (the whole
  // row is the button).
  const { width, fontScale } = useWindowDimensions();
  const action = t('reflection.history.reflect');
  // A long word for Reflect ("Zurückblicken") would squeeze the question onto a third line: the arrow says it.
  const compact = (width - 2 * space.lg) / Math.min(Math.max(fontScale, 1), 1.3) < 300 || action.length > 10;
  const week = dueReflection(program.reflections, today);
  if (!week) return null;
  const title = t('reflection.invite.title', { week });
  const question = t('reflection.invite.short');
  return (
    <Animated.View entering={FadeIn.duration(300).reduceMotion(sys)} exiting={FadeOut.duration(180).reduceMotion(sys)}>
      <Press
        onPress={() => pushOnce(`/life-reset/reflect?week=${week}&from=invite`)}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${question}`}
        accessibilityHint={action}
      >
        <ThemedView style={[styles.row, { backgroundColor: c.surface }]}>
          <View style={styles.words}>
            <T v="overline" color={c.accentInk} maxFontSizeMultiplier={1.3}>
              {title}
            </T>
            <T v="bodyStrong" maxFontSizeMultiplier={1.3}>
              {question}
            </T>
          </View>
          <View style={styles.action}>
            {compact ? null : (
              <T v="label" color={c.accentInk} maxFontSizeMultiplier={1.3}>
                {action}
              </T>
            )}
            <Ionicons name="chevron-forward" size={14} color={c.accentInk} style={flipX} />
          </View>
        </ThemedView>
      </Press>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 64,
    borderRadius: radius.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
  },
  words: { flex: 1, gap: 2 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 2 },
});
