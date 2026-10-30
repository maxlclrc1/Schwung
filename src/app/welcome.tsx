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
import { useResetPilot } from '../store/resetPilot';
import { space, useTheme } from '../theme';
import { useT } from '../i18n/react';

export default function Welcome() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // The world scrolls with the page here (short phones may scroll), so the trailhead and painting never drift.
  const [zoneTop, setZoneTop] = useState(insets.top + space.sm);
  const { zoneHeight } = worldFrame(width, zoneTop);
  const started = useResetPilot((s) => s.program !== null);

  // A running program never sees the start screen again.
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
              {t('welcome.headline')}
            </T>
            <T color={c.textDim}>{t('welcome.body')}</T>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(260).duration(500)}>
            <T v="bodyStrong">{t('welcome.free')}</T>
          </Animated.View>
        </View>
        <Animated.View entering={FadeInDown.delay(380).duration(500)} style={{ gap: space.sm }}>
          <Button label={t('welcome.start')} onPress={() => router.push('/life-reset/setup')} />
          <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
            {t('welcome.time')}
          </T>
          <Button label={t('welcome.restore')} kind="ghost" onPress={() => router.push('/restore')} />
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
