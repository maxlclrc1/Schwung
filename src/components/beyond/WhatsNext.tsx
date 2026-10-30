import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PROGRAM_DAYS } from '../../core/dates';
import * as P from '../../core/reset/pilot';
import { haptic } from '../../lib/haptics';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Press } from '../onboarding/Choices';
import { rise, useTints, type Tint } from '../onboarding/kit';
import { Button, Screen, T } from '../ui';
import { WorldBackdrop } from '../World';

type Icon = ComponentProps<typeof Ionicons>['name'];

/**
 * "What's next?": after the summit ceremony and the 66-Day Story (never over them), the next chapter on the same
 * mountain. Keep My Momentum (the same habits go on), Begin a New Ascent (a fresh 66 days; this one is kept), or
 * decide later (a small card on Habits; habits and reminders rest meanwhile).
 */
export function WhatsNext() {
  const { c } = useTheme();
  const t = useTints();
  const insets = useSafeAreaInsets();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const [busy, setBusy] = useState(false);
  if (!program) return null;
  const today = pilotToday({ program, devDayOffset: offset });
  const stats = P.journeyStats(program, Math.max(today, PROGRAM_DAYS));
  // The summit day itself is still the first ascent's: a new one can begin from tomorrow.
  const ascentOpen = today > PROGRAM_DAYS;

  const close = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/today');
  };

  const keep = () => {
    if (busy) return;
    setBusy(true);
    useResetPilot.getState().keepMomentum();
    haptic.success();
    close();
  };

  return (
    <Screen edges={['bottom']}>
      <WorldBackdrop zoneTop={insets.top + space.xl} dim={0.72} fadeTop />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={rise(0)} style={{ gap: space.sm }}>
          <T v="overline" color={t.peach.ink}>
            {P.ascentOf(program) > 1 ? `Ascent ${P.ascentOf(program)} · ` : ''}The summit · Day {PROGRAM_DAYS}
          </T>
          <T v="display" accessibilityRole="header">
            What’s next?
          </T>
          <T color={c.textDim}>
            {stats.done} of {PROGRAM_DAYS} days climbed. Your journey and its story are yours to keep, whichever way you
            go.
          </T>
        </Animated.View>

        <View style={styles.options}>
          <Animated.View entering={rise(120)}>
            <Option
              tint={t.sage}
              icon="trending-up-outline"
              title="Keep My Momentum"
              body="Your habits carry on, day after day, with their targets as they are. Streak and XP keep growing."
              onPress={keep}
              disabled={busy}
            />
          </Animated.View>
          <Animated.View entering={rise(220)}>
            <Option
              tint={t.lavender}
              icon="flag-outline"
              title="Begin a New Ascent"
              body={
                ascentOpen
                  ? 'A fresh 66 days, starting from your habits and levels. This journey is kept, with its story.'
                  : 'A fresh 66 days from your habits and levels. It opens tomorrow, once your summit day is done.'
              }
              onPress={() => router.push('/life-reset/ascent')}
              disabled={busy || !ascentOpen}
            />
          </Animated.View>
        </View>

        <Animated.View entering={rise(320)} style={{ gap: space.xs }}>
          <Button label="Decide later" kind="ghost" onPress={close} disabled={busy} />
          <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
            Your habits and reminders rest until you choose. Nothing is missed.
          </T>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

function Option({
  tint,
  icon,
  title,
  body,
  onPress,
  disabled,
}: {
  tint: Tint;
  icon: Icon;
  title: string;
  body: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={`${title}. ${body}`}
    >
      <ThemedView style={[styles.option, { backgroundColor: c.surface, opacity: disabled ? 0.6 : 1 }]}>
        <View style={[styles.icon, { backgroundColor: tint.soft }]}>
          <Ionicons name={icon} size={22} color={tint.ink} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <T v="heading" color={tint.ink}>
            {title}
          </T>
          <T color={c.textDim}>{body}</T>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
      </ThemedView>
    </Press>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: space.xl,
    paddingBottom: space.xl,
    gap: space.xl,
  },
  options: { gap: space.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
  },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
