import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { habitTask, habitTitle, isCustom } from '../core/habits';
import type { PlanHabit } from '../core/types';
import { haptic } from '../lib/haptics';
import { radius, space, useTheme } from '../theme';
import { LevelPips, T } from './ui';

type Props = {
  habit: PlanHabit;
  done: boolean;
  readOnly?: boolean;
  onToggle: (habitId: string) => void;
  onLongPress?: (habitId: string) => void;
};

const SPRING = { damping: 14, stiffness: 420, mass: 0.6 };

function HabitRowImpl({ habit, done, readOnly, onToggle, onLongPress }: Props) {
  const { c } = useTheme();
  const progress = useSharedValue(done ? 1 : 0);
  const pop = useSharedValue(1);
  const press = useSharedValue(1);

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
      pop.set(withSequence(withTiming(1.22, { duration: 90 }), withSpring(1, SPRING)));
      haptic.check();
    } else {
      haptic.uncheck();
    }
    onToggle(habit.habitId);
  };

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
    backgroundColor: interpolateColor(progress.value, [0, 1], [c.surface, c.accentSoft]),
  }));
  const boxStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.value }],
    backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', c.accent]),
    borderColor: interpolateColor(progress.value, [0, 1], [c.textFaint, c.accent]),
  }));
  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.4, 1], Extrapolation.CLAMP) }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1], [1, 0.55]) }));

  const task = habitTask(habit);
  const title = habitTitle(habit);

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={() => !readOnly && press.set(withTiming(0.98, { duration: 80 }))}
      onPressOut={() => press.set(withSpring(1, SPRING))}
      onLongPress={onLongPress ? () => (haptic.heavy(), onLongPress(habit.habitId)) : undefined}
      delayLongPress={380}
      role="checkbox"
      aria-checked={done}
      aria-disabled={readOnly}
      accessibilityLabel={`${title}${task ? `. ${task}` : ''}`}
      accessibilityHint={onLongPress ? 'Long press for details' : undefined}
      hitSlop={4}
    >
      <Animated.View style={[styles.row, rowStyle]}>
        <Animated.View style={[styles.box, boxStyle]}>
          <Animated.View style={[styles.check, checkStyle]}>
            {/* Drawn from two solid bars, not an icon-font glyph: iOS rasterizes text, so a
                glyph blurs while the box pops above 100%; plain views stay sharp at any scale. */}
            <View style={[styles.checkShort, { backgroundColor: c.onAccent }]} />
            <View style={[styles.checkLong, { backgroundColor: c.onAccent }]} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.text, textStyle]}>
          <T v="bodyStrong" numberOfLines={1}>
            {title}
          </T>
          {task ? (
            <T v="caption" color={c.textDim} numberOfLines={2}>
              {task}
            </T>
          ) : null}
        </Animated.View>
        <View style={styles.badge}>{isCustom(habit) ? null : <LevelPips level={habit.level} />}</View>
      </Animated.View>
    </Pressable>
  );
}

export const HabitRow = memo(HabitRowImpl);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingVertical: space.lg,
    paddingHorizontal: space.lg,
    borderRadius: radius.lg,
    minHeight: 76,
  },
  box: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, gap: 2 },
  badge: { width: 18, alignItems: 'flex-end' },
  // Checkmark through (1.5,8) → (6,12.5) → (14.5,4) in a 16×16 box, 3pt strokes.
  check: { width: 16, height: 16 },
  checkShort: {
    position: 'absolute',
    left: 2.25,
    top: 6.3,
    width: 3,
    height: 7.9,
    borderRadius: 1.5,
    transform: [{ rotate: '-45deg' }],
  },
  checkLong: {
    position: 'absolute',
    left: 8.75,
    top: 1.5,
    width: 3,
    height: 13.5,
    borderRadius: 1.5,
    transform: [{ rotate: '45deg' }],
  },
});
