import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeToggle } from '../components/ThemeToggle';
import { TrailHero } from '../components/TrailHero';
import { Button, Screen, T } from '../components/ui';
import { WorldBackdrop } from '../components/World';
import { worldFrame } from '../core/world';
import { APP_NAME } from '../lib/constants';
import { v2ForNewPrograms } from '../lib/flags';
import { pilot } from '../store/pilotGate';
import { useApp } from '../store/useApp';
import { space, useTheme } from '../theme';

export default function Welcome() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Which onboarding a new program uses is the build channel's (lib/flags), never the person's.
  const v2 = v2ForNewPrograms();
  // Answers saved but no program yet: they left during onboarding, so offer to pick it back up.
  const resumable = useApp((s) => (v2 ? s.profile : s.answers) !== null && s.startedAt === null);
  // The world scrolls with the page here (short phones may scroll), so the trailhead and painting never drift.
  const [zoneTop, setZoneTop] = useState(insets.top + space.sm);
  const { zoneHeight } = worldFrame(width, zoneTop);
  const started = useApp((s) => s.startedAt !== null);

  // A running program never sees the start screen again (Settings → Restart is the way to start over).
  if (started) return <Redirect href="/today" />;

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingTop: insets.top + space.sm }]}
        bounces={false}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeIn.duration(700)} style={StyleSheet.absoluteFill}>
          <WorldBackdrop zoneTop={zoneTop} />
        </Animated.View>
        {/* The mountain, full width, with the brand and theme toggle over its calm sky. */}
        <View onLayout={(e) => setZoneTop(e.nativeEvent.layout.y)} style={[styles.zone, { width, height: zoneHeight }]}>
          <Animated.View entering={FadeIn.delay(300).duration(700)}>
            <TrailHero width={width} />
          </Animated.View>
          <View style={styles.header}>
            <T v="overline" color={c.accentInk} style={styles.brand}>
              {APP_NAME}
            </T>
            <ThemeToggle />
          </View>
        </View>
        <View style={styles.text}>
          <Animated.View entering={FadeInDown.delay(150).duration(500)} style={{ gap: space.sm }}>
            <T v="display" accessibilityRole="header">
              Get your momentum back.
            </T>
            <T color={c.textDim}>A few small habits a day, built around your life. They grow as you do.</T>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(260).duration(500)}>
            <T v="bodyStrong">Free. No account. No paywall.</T>
          </Animated.View>
        </View>
        <Animated.View entering={FadeInDown.delay(380).duration(500)} style={{ gap: space.sm }}>
          <Button label="Start my reset" onPress={() => router.push(v2 ? '/v2/quiz' : '/quiz')} />
          {resumable ? (
            <Button
              label="Pick up where you left off"
              kind="ghost"
              onPress={() => router.push(v2 ? '/v2/plan' : '/start')}
            />
          ) : null}
          <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
            About two minutes. Everything stays on your phone.
          </T>
          {/* Testing builds only: the 66-day Life Reset, as a separate choice (store/pilotGate.ts). */}
          {(__DEV__ || process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL === 'internal') &&
          pilot &&
          pilot.store.resetPilotAvailable() ? (
            <Button
              label="Or start the 66-day Life Reset"
              kind="secondary"
              style={{ marginTop: space.sm }}
              onPress={() => router.push('/pilot/setup')}
            />
          ) : null}
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, paddingHorizontal: space.xl, paddingBottom: space.xl, gap: space.lg },
  // Full-bleed: the page has side padding, the mountain doesn't.
  zone: { marginHorizontal: -space.xl },
  header: {
    position: 'absolute',
    top: 0,
    left: space.xl,
    right: space.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  brand: { letterSpacing: 3 },
  // Pushes the CTA to the bottom; the fog shows between the mountain and the words.
  text: { flex: 1, justifyContent: 'flex-end', gap: space.lg },
});
