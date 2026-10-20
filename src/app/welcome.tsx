import { router } from 'expo-router';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { MomentumHero } from '../components/Art';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button, Screen, T } from '../components/ui';
import { APP_NAME } from '../lib/constants';
import { space, useTheme } from '../theme';

const POINTS = ['6 quick questions', 'A daily plan made for you', 'Small habits that level up as you do'];

export default function Welcome() {
  const { c } = useTheme();
  const { height } = useWindowDimensions();
  // Smaller art on short phones (SE) so everything fits without scrolling.
  const heroSize = height < 740 ? 100 : 200;
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.wrap} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <ThemeToggle />
        </View>
        <View style={styles.top}>
          <Animated.View entering={FadeIn.duration(800)} style={styles.hero}>
            <MomentumHero size={heroSize} />
          </Animated.View>
          <Animated.View entering={FadeInDown.duration(500)}>
            <T style={styles.big} color={c.accentInk}>
              {APP_NAME}
            </T>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <T v="display">Get your momentum back.</T>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(220).duration(500)} style={styles.pill}>
            <T v="bodyStrong" color={c.text}>
              Free. No account. No paywall.
            </T>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(320).duration(500)} style={styles.points}>
            {POINTS.map((p) => (
              <View key={p} style={styles.point}>
                <View style={[styles.dot, { backgroundColor: c.accentInk }]} />
                <T color={c.textDim}>{p}</T>
              </View>
            ))}
          </Animated.View>
        </View>
        <Animated.View entering={FadeInDown.delay(450).duration(500)} style={{ gap: space.md }}>
          <Button label="Start my reset" onPress={() => router.push('/quiz')} />
          <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
            Everything stays on your phone. Takes under a minute.
          </T>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, padding: space.xl, gap: space.xl, justifyContent: 'space-between' },
  top: { flex: 1, justifyContent: 'center', gap: space.md },
  big: { fontSize: 22, lineHeight: 28, fontWeight: '900', letterSpacing: 4, textTransform: 'uppercase' },
  header: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: -space.md },
  hero: { alignItems: 'center', marginBottom: space.sm },
  pill: { alignSelf: 'flex-start' },
  points: { gap: space.sm, marginTop: space.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
