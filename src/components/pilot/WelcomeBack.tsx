import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, FadeInDown, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { comebackText } from '../../core/reset/comeback';
import { WORLD } from '../../core/world';
import { usePreferences } from '../../store/preferences';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Press } from '../onboarding/Choices';
import { ThemedImage } from '../ThemedImage';
import { Button, T } from '../ui';
import { WORLD_ART } from '../World';

const BANNER = 120;
/** The painting row the window opens at: the summit and the upper switchbacks. */
const FROM_ROW = 860;

/**
 * The welcome back on Habits: a window onto the mountain, a few kind words, and one way on. It changes nothing
 * about the program; every past day, the streak and XP stay exactly as they are. Dismissed with the button or the
 * close mark; "Don't show these" turns it off for good (Settings-free: it's the person's own choice, right here).
 */
export function WelcomeBack({
  start,
  completeDays,
  onClose,
}: {
  start: number;
  completeDays: number;
  onClose: () => void;
}) {
  const { c, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const setComebacks = usePreferences((s) => s.setComebacks);
  const [gone, setGone] = useState(false);
  const w = Math.min(width, 520) - space.lg * 2;
  const k = w / WORLD.width;
  const words = comebackText(start);
  const veil = isDark ? ['rgba(28,27,37,0)', 'rgba(28,27,37,1)'] : ['rgba(255,255,255,0)', 'rgba(255,255,255,1)'];
  if (gone) return null;
  const close = () => {
    setGone(true);
    onClose();
  };
  return (
    <Animated.View
      entering={FadeInDown.duration(520)
        .easing(Easing.bezier(0.22, 1, 0.36, 1))
        .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] })
        .reduceMotion(ReduceMotion.System)}
      exiting={FadeOut.duration(200).reduceMotion(ReduceMotion.System)}
      accessibilityLiveRegion="polite"
    >
      <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
        <View
          style={{ height: BANNER, overflow: 'hidden' }}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <ThemedImage
            sources={WORLD_ART}
            contentFit="cover"
            style={{ position: 'absolute', left: 0, top: -FROM_ROW * k, width: w, height: WORLD.height * k }}
          />
          <LinearGradient colors={veil as [string, string]} locations={[0.45, 1]} style={StyleSheet.absoluteFill} />
          <View style={[styles.mark, { backgroundColor: c.sage, borderColor: c.surface }]} />
        </View>
        <Press onPress={close} style={styles.close} accessibilityRole="button" accessibilityLabel="Dismiss">
          <View style={[styles.closeDisc, { backgroundColor: c.surface }]}>
            <Ionicons name="close" size={16} color={c.textDim} />
          </View>
        </Press>
        <View style={styles.body}>
          <T v="overline" color={c.sageInk}>
            Welcome back
          </T>
          <T v="heading" accessibilityRole="header">
            {words.title}
          </T>
          <T color={c.textDim}>{words.body}</T>
          {completeDays > 0 ? (
            <T v="caption" color={c.textDim}>
              Your {completeDays} complete day{completeDays === 1 ? ' is' : 's are'} still on the mountain.
            </T>
          ) : null}
          <Button label="Continue my journey" onPress={close} style={{ marginTop: space.sm }} />
          <Press
            onPress={() => {
              setComebacks(false);
              close();
            }}
            style={styles.off}
            accessibilityRole="button"
            accessibilityLabel="Don't show welcome-back messages again"
          >
            <T v="caption" color={c.textFaint}>
              Don’t show these again
            </T>
          </Press>
        </View>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, overflow: 'hidden' },
  mark: { position: 'absolute', left: '58%', top: 26, width: 12, height: 12, borderRadius: 6, borderWidth: 2.5 },
  close: { position: 'absolute', top: space.sm, right: space.sm },
  closeDisc: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: 0.92 },
  body: { padding: space.lg, paddingTop: space.xs, gap: space.xs },
  off: { alignSelf: 'center', paddingVertical: space.sm, paddingHorizontal: space.md },
});
