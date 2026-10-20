import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Screen, T } from '../components/ui';
import { space, useTheme } from '../theme';

const POINTS = ['6 quick questions', 'A daily plan made for you', 'Small habits that level up over 66 days'];

export default function Welcome() {
  const { c } = useTheme();
  return (
    <Screen>
      <View style={styles.wrap}>
        <View style={styles.top}>
          <Animated.View entering={FadeInDown.duration(500)}>
            <T style={styles.big} color={c.accentInk}>
              66
            </T>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(120).duration(500)}>
            <T v="display">Reset your life in 66 days.</T>
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
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.xl, justifyContent: 'space-between' },
  top: { flex: 1, justifyContent: 'center', gap: space.lg },
  big: { fontSize: 120, lineHeight: 124, fontWeight: '900', letterSpacing: -6 },
  pill: { alignSelf: 'flex-start' },
  points: { gap: space.sm, marginTop: space.md },
  point: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
