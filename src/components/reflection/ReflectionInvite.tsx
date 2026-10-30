import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import * as P from '../../core/reset/pilot';
import { dueReflection, type ReflectionAnswer } from '../../core/reset/reflections';
import { useResetPilot } from '../../store/resetPilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Press } from '../onboarding/Choices';
import { T } from '../ui';
import { useT } from '../../i18n/react';

const sys = ReduceMotion.System;
const ANSWERS: ReflectionAnswer[] = ['easier', 'right', 'harder'];

/**
 * On Habits, after a program week ends: a small invitation to reflect, never in the way of the cards. One tap
 * answers (and opens the short check-in); "Not now" puts it away for good (it can be opened from Journey). Only the
 * latest finished week is ever offered.
 */
export function ReflectionInvite({ program, today }: { program: P.PilotProgram; today: number }) {
  const { c } = useTheme();
  const t = useT();
  const week = dueReflection(program.reflections, today);
  if (!week) return null;
  return (
    <Animated.View entering={FadeIn.duration(300).reduceMotion(sys)} exiting={FadeOut.duration(180).reduceMotion(sys)}>
      <ThemedView style={[styles.card, { backgroundColor: c.surface, borderLeftColor: c.accent }]}>
        <T v="overline" color={c.accentInk}>
          {t('reflection.invite.behind', { week })}
        </T>
        <T v="heading" accessibilityRole="header">
          {t('reflection.invite.question')}
        </T>
        <View style={styles.row}>
          {ANSWERS.map((a) => (
            <Press
              key={a}
              onPress={() => router.push(`/life-reset/reflect?week=${week}&answer=${a}`)}
              style={{ flex: 1 }}
              accessibilityRole="button"
              accessibilityLabel={
                a === 'right'
                  ? t('reflection.invite.right')
                  : t(a === 'easier' ? 'reflection.invite.easierA11y' : 'reflection.invite.harderA11y')
              }
            >
              <ThemedView style={[styles.answer, { backgroundColor: c.accentSoft }]}>
                <T v="caption" color={c.accentInk} style={{ fontWeight: '700' }} numberOfLines={2}>
                  {t(`reflection.invite.${a}`)}
                </T>
              </ThemedView>
            </Press>
          ))}
        </View>
        <Press
          onPress={() => useResetPilot.getState().reflect(week)}
          style={styles.later}
          accessibilityRole="button"
          accessibilityLabel={t('reflection.invite.notNowA11y')}
        >
          <T v="caption" color={c.textDim} style={{ fontWeight: '600' }}>
            {t('reflection.invite.notNow')}
          </T>
        </Press>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.sm, borderLeftWidth: 3 },
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
  answer: {
    minHeight: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.sm,
  },
  later: { alignSelf: 'center', paddingVertical: space.xs, paddingHorizontal: space.md },
});
