import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TimePicker } from '../../components/TimePicker';
import { Button, Screen, T } from '../../components/ui';
import { OnboardingBackdrop } from '../../components/World';
import { formatTime } from '../../core/dates';
import { DEV_CLEARED } from '../../core/v2/gate';
import { pendingTimeQuestion } from '../../core/v2/program';
import type { ProfileV2 } from '../../core/v2/types';
import { v2PreviewEnabled } from '../../lib/flags';
import { haptic } from '../../lib/haptics';
import { useApp } from '../../store/useApp';
import { space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

/** W1 and W2: asked once each, only when the plan has a habit that needs them (spec D.7). */
export default function TimeV2() {
  const { c } = useTheme();
  const profile = useApp((s) => s.profile);
  const started = useApp((s) => s.startedAt !== null);
  const enabled = useApp((s) => v2PreviewEnabled(s.devV2Preview));
  // Opened from the plan's choice step: the choices (including the one that needs a time) come along.
  const params = useLocalSearchParams<{ with?: string }>();
  const extra = params.with ? params.with.split(',').filter(Boolean) : [];
  const fromChoice = extra.length > 0;
  const question = profile ? pendingTimeQuestion(profile, DEV_CLEARED, extra) : null;
  const [time, setTime] = useState(question === 'bed' ? '23:00' : '07:00');

  useEffect(() => {
    // Nothing (left) to ask for a choice: go back to the plan underneath, which adds it.
    if (fromChoice && profile && !question && router.canGoBack()) router.back();
  }, [fromChoice, profile, question]);

  if (started) return <Redirect href="/today" />;
  if (!enabled || !profile) return <Redirect href="/welcome" />;
  if (!question) return fromChoice ? null : <Redirect href="/v2/plan" />;

  const answer = (next: ProfileV2) => {
    haptic.tap();
    useApp.getState().setProfile(next);
    const then = pendingTimeQuestion(next, DEV_CLEARED, extra);
    if (then === 'bed') setTime('23:00');
    // From a choice, the effect above returns to the plan once nothing is left to ask.
    else if (!fromChoice) router.replace('/v2/plan');
  };

  const wake = question === 'wake';

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
        <Animated.View key={question} entering={FadeInDown.duration(400)} style={{ gap: space.md }}>
          <ThemedView style={[styles.icon, { backgroundColor: c.accentSoft }]}>
            <Ionicons name={wake ? 'alarm' : 'bed'} size={26} color={c.accentInk} />
          </ThemedView>
          <T v="overline" color={c.textDim}>
            One more thing
          </T>
          <T v="title" accessibilityRole="header">
            {wake
              ? 'What time do you usually get up on school or work days?'
              : 'What time do you usually get into bed on those nights?'}
          </T>
          <T color={c.textDim}>Your plan uses it to set targets around your own day.</T>
        </Animated.View>
        <View style={styles.picker}>
          <TimePicker value={time} onChange={setTime} />
        </View>
        <View style={{ gap: space.sm }}>
          <Button
            label={`${wake ? 'Usually up at' : 'Usually in bed by'} ${formatTime(time)}`}
            onPress={() => answer(wake ? { ...profile, wake: { kind: 'time', time } } : { ...profile, inBed: time })}
          />
          {wake ? (
            <>
              <Button
                label="It changes a lot"
                kind="secondary"
                onPress={() => answer({ ...profile, wake: { kind: 'varies' } })}
              />
              <Button
                label="I work shifts or nights"
                kind="ghost"
                onPress={() => answer({ ...profile, wake: { kind: 'shift' } })}
              />
            </>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingTop: space.sm },
  back: { width: 32, height: 44, justifyContent: 'center' },
  wrap: { flex: 1, paddingHorizontal: space.xl, paddingBottom: space.xl, justifyContent: 'space-between' },
  icon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  picker: { alignItems: 'center' },
});
