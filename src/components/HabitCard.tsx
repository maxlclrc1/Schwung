import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { habitIcon, habitTitle, isCustom, LEVEL_NAME, LEVELS, shownTaskAt } from '../core/habits';
import type { PlanHabit } from '../core/types';
import { haptic } from '../lib/haptics';
import { radius, space, useTheme } from '../theme';
import { blendToken, useThemeProgress } from '../theme/transition';
import { habitArt } from './habitArt';
import { LevelPips, T } from './ui';

type Props = {
  habit: PlanHabit;
  done: boolean;
  readOnly?: boolean;
  onToggle: (habitId: string) => void;
  onLongPress?: (habitId: string) => void;
};

const SPRING = { damping: 14, stiffness: 420, mass: 0.6 };

/** The illustration's square, and the card's height when it has one (SCHWUNG_HABIT_CARD_ARTWORK_SPEC.md). */
const ART = 104;
/** How strongly a done card takes the accent: an opaque tint, so the world behind never shows through. */
const DONE_TINT = 0.12;

/*
 * A habit card (testing builds; the public release keeps HabitRow): the completion control, the habit's name and today's target with a small level indicator, and
 * on the right its illustration (or, until it has one, its icon). The card is always opaque, so it reads the
 * same over any part of the world behind it, done or not.
 *
 * Nothing that contains the checkmark (or any text) is ever scaled. iOS draws text and icons into a
 * bitmap and stretches that bitmap while a layer is scaled, which reads as "pixelated, then sharp".
 * Feedback comes from color, a ripple ring behind the circle (a separate view), and haptics instead.
 */

function HabitCardImpl({ habit, done, readOnly, onToggle, onLongPress }: Props) {
  const { c } = useTheme();
  const progress = useSharedValue(done ? 1 : 0);
  const ripple = useSharedValue(1);
  const theme = useThemeProgress();
  const pressed = useSharedValue(0);

  // Source of truth is the store; this keeps the animation in sync with it
  // (e.g. after a re-hydrate) without fighting the optimistic start in onPress.
  useEffect(() => {
    progress.set(withSpring(done ? 1 : 0, SPRING));
  }, [done, progress]);

  const handlePress = () => {
    if (readOnly) return;
    const next = !done;
    // Start the animation on the UI thread before React even re-renders.
    progress.set(withSpring(next ? 1 : 0, SPRING));
    if (next) {
      ripple.set(0);
      ripple.set(withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
      haptic.check();
    } else {
      haptic.uncheck();
    }
    onToggle(habit.habitId);
  };

  // Three blends at once: checked/unchecked (progress), dark/light (theme) and pressed, all opaque colours.
  const rowStyle = useAnimatedStyle(() => {
    const t = theme.value;
    const surface = blendToken(t, 'surface');
    const done = interpolateColor(DONE_TINT, [0, 1], [surface, blendToken(t, 'accent')]);
    const base = interpolateColor(progress.value, [0, 1], [surface, done]);
    return { backgroundColor: interpolateColor(pressed.value * 0.7, [0, 1], [base, blendToken(t, 'surfaceHigh')]) };
  });
  const boxStyle = useAnimatedStyle(() => {
    const t = theme.value;
    const accent = blendToken(t, 'accent');
    return {
      backgroundColor: interpolateColor(progress.value, [0, 1], ['rgba(0,0,0,0)', accent]),
      borderColor: interpolateColor(progress.value, [0, 1], [blendToken(t, 'textFaint'), accent]),
    };
  });
  // A plain ring with no content, so scaling it is safe.
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: ripple.value >= 1 ? 0 : 0.7 * (1 - ripple.value),
    transform: [{ scale: 1 + ripple.value * 0.9 }],
  }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, progress.value)) }));
  const textStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1], [1, 0.6]) }));
  const artStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1], [1, 0.5]) }));

  const title = habitTitle(habit);
  // A target that only repeats the title ("Make your bed") isn't shown twice.
  const target = shownTaskAt(habit);
  const task = target === title ? undefined : target;
  const level = isCustom(habit) ? '' : `. ${LEVEL_NAME[habit.level]}, level ${LEVELS.indexOf(habit.level) + 1} of 3`;
  const art = isCustom(habit) ? undefined : habitArt(habit.habitId);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => !readOnly && pressed.set(withTiming(1, { duration: 80 }))}
      onPressOut={() => pressed.set(withTiming(0, { duration: 150 }))}
      onLongPress={onLongPress ? () => (haptic.heavy(), onLongPress(habit.habitId)) : undefined}
      delayLongPress={380}
      role="checkbox"
      aria-checked={done}
      aria-disabled={readOnly}
      accessibilityLabel={`${title}${task ? `. ${task}` : ''}${level}`}
      accessibilityHint={onLongPress ? 'Long press for details' : undefined}
      // VoiceOver and TalkBack reach the same details from the actions menu, without the long-press gesture.
      accessibilityActions={
        onLongPress ? [{ name: 'longpress' }, { name: 'details', label: 'Edit, swap or remove' }] : undefined
      }
      onAccessibilityAction={
        onLongPress
          ? (e) => {
              if (e.nativeEvent.actionName === 'longpress' || e.nativeEvent.actionName === 'details') {
                onLongPress(habit.habitId);
              }
            }
          : undefined
      }
      hitSlop={4}
    >
      <Animated.View style={[styles.card, art ? styles.withArt : styles.withIcon, rowStyle]}>
        <View style={styles.boxWrap}>
          <Animated.View pointerEvents="none" style={[styles.ripple, { borderColor: c.accent }, rippleStyle]} />
          <Animated.View style={[styles.box, boxStyle]}>
            <Animated.View style={checkStyle}>
              <Ionicons name="checkmark" size={20} color={c.onAccent} />
            </Animated.View>
          </Animated.View>
        </View>
        <Animated.View style={[styles.text, textStyle]}>
          <T v="bodyStrong" numberOfLines={2} style={styles.title}>
            {title}
          </T>
          {task ? (
            <T v="caption" color={c.textDim} numberOfLines={3}>
              {task}
            </T>
          ) : null}
          {isCustom(habit) ? null : (
            <View style={styles.level}>
              <LevelPips level={habit.level} />
            </View>
          )}
        </Animated.View>
        {art ? (
          <Animated.View style={[styles.art, artStyle]}>
            {/* Fills the square from the centre; on a taller card (larger text) the sides are cropped. */}
            <Image source={art} resizeMode="cover" style={styles.artImage} accessibilityIgnoresInvertColors />
          </Animated.View>
        ) : (
          <Animated.View style={[styles.glyph, artStyle]}>
            <Ionicons name={habitIcon(habit) as keyof typeof Ionicons.glyphMap} size={24} color={c.textFaint} />
          </Animated.View>
        )}
      </Animated.View>
    </Pressable>
  );
}

export const HabitCard = memo(HabitCardImpl);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  // With an illustration: the square sits flush with the card's right, top and bottom edges.
  withArt: { minHeight: ART, paddingRight: 0 },
  withIcon: { minHeight: 84, paddingRight: space.lg },
  boxWrap: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  ripple: { position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 2 },
  box: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2, paddingVertical: space.md },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  level: { marginTop: 6 },
  art: { width: ART, alignSelf: 'stretch' },
  artImage: { width: '100%', height: '100%' },
  glyph: { width: 28, alignItems: 'center' },
});
