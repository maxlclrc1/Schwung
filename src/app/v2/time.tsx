import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { TimeQuestion } from '../../components/TimeQuestion';
import { Screen } from '../../components/ui';
import { OnboardingBackdrop } from '../../components/World';
import { DEV_CLEARED } from '../../core/v2/gate';
import { pendingTimeQuestion, type TimeAnswers } from '../../core/v2/program';
import type { ProfileV2 } from '../../core/v2/types';
import { v2ForNewPrograms } from '../../lib/flags';
import { haptic } from '../../lib/haptics';
import { useApp } from '../../store/useApp';
import { space, useTheme } from '../../theme';

/** W1 and W2: asked once each, only when the plan has a habit that needs them (spec D.7). */
export default function TimeV2() {
  const { c } = useTheme();
  const profile = useApp((s) => s.profile);
  const started = useApp((s) => s.startedAt !== null);
  const enabled = v2ForNewPrograms();
  // Opened from the plan's choice step: the choices (including the one that needs a time) come along.
  const params = useLocalSearchParams<{ with?: string }>();
  const extra = params.with ? params.with.split(',').filter(Boolean) : [];
  const fromChoice = extra.length > 0;
  const question = profile ? pendingTimeQuestion(profile, DEV_CLEARED, extra) : null;

  useEffect(() => {
    // Nothing (left) to ask for a choice: go back to the plan underneath, which adds it.
    if (fromChoice && profile && !question && router.canGoBack()) router.back();
  }, [fromChoice, profile, question]);

  if (started) return <Redirect href="/today" />;
  if (!enabled || !profile) return <Redirect href="/welcome" />;
  if (!question) return fromChoice ? null : <Redirect href="/v2/plan" />;

  const answer = (a: TimeAnswers) => {
    haptic.tap();
    const next: ProfileV2 = { ...profile, ...a };
    useApp.getState().setProfile(next);
    // From a choice, the effect above returns to the plan once nothing is left to ask.
    if (!fromChoice && !pendingTimeQuestion(next, DEV_CLEARED, extra)) router.replace('/v2/plan');
  };

  return (
    <Screen backdrop={<OnboardingBackdrop />}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            haptic.tap();
            router.back();
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
      </View>
      <View style={styles.wrap}>
        <TimeQuestion key={question} question={question} onAnswer={answer} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingTop: space.sm },
  back: { width: 32, height: 44, justifyContent: 'center' },
  wrap: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.xl },
});
