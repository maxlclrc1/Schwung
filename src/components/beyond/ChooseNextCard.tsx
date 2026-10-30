import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Press } from '../onboarding/Choices';
import { useTints } from '../onboarding/kit';
import { T } from '../ui';

const sys = ReduceMotion.System;

/**
 * On Habits, past the summit while nothing is chosen yet ("Decide later"): a small, calm card back to "What's next?".
 * Habits and reminders rest meanwhile; nothing is missed.
 */
export function ChooseNextCard() {
  const { c } = useTheme();
  const t = useTints();
  return (
    <Animated.View entering={FadeIn.duration(300).reduceMotion(sys)} exiting={FadeOut.duration(180).reduceMotion(sys)}>
      <Press
        onPress={() => router.push('/life-reset/next')}
        accessibilityRole="button"
        accessibilityLabel="You reached the summit. Your habits are resting. Choose what's next."
      >
        <ThemedView style={[styles.card, { backgroundColor: c.surface, borderLeftColor: t.peach.fill }]}>
          <View style={[styles.icon, { backgroundColor: t.peach.soft }]}>
            <Ionicons name="flag-outline" size={20} color={t.peach.ink} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T v="overline" color={t.peach.ink}>
              Beyond the summit
            </T>
            <T v="bodyStrong">Choose what’s next</T>
            <T v="caption" color={c.textDim}>
              Your habits and reminders rest until you do.
            </T>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textFaint} />
        </ThemedView>
      </Press>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
    borderLeftWidth: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
