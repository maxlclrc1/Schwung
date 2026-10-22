import { router } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { ThemeToggle } from '../components/ThemeToggle';
import { TrailHero } from '../components/TrailHero';
import { Button, Screen, T } from '../components/ui';
import { APP_NAME } from '../lib/constants';
import { useApp } from '../store/useApp';
import { space, useTheme } from '../theme';

export default function Welcome() {
  const { c } = useTheme();
  const { width, height } = useWindowDimensions();
  // Answers saved but no program yet: they left during onboarding, so offer to pick it back up.
  const resumable = useApp((s) => s.answers !== null && s.startedAt === null);
  // Shorter art on short phones (SE) so everything fits without scrolling.
  const heroWidth = Math.min(width - space.xl * 2, height < 620 ? 190 : height < 740 ? 270 : 420);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <T v="overline" color={c.accentInk} style={styles.brand}>
            {APP_NAME}
          </T>
          <ThemeToggle />
        </View>
        <View style={styles.top}>
          <Animated.View entering={FadeIn.duration(700)} style={styles.hero}>
            <TrailHero width={heroWidth} />
          </Animated.View>
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
          <Button label="Start my reset" onPress={() => router.push('/quiz')} />
          {resumable ? (
            <Button label="Pick up where you left off" kind="ghost" onPress={() => router.push('/start')} />
          ) : null}
          <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
            About two minutes. Everything stays on your phone.
          </T>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: space.xl, gap: space.xl, justifyContent: 'space-between' },
  top: { flex: 1, justifyContent: 'center', gap: space.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: -space.md },
  brand: { letterSpacing: 3 },
  hero: { alignItems: 'center' },
});
