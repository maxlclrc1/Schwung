import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
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

/*
 * Nothing that contains the checkmark (or any text) is ever scaled. iOS draws text and icons into a
 * bitmap and stretches that bitmap while a layer is scaled, which reads as "pixelated, then sharp".
 * Feedback comes from color, a ripple ring behind the circle (a separate view), and haptics instead.
 */

function HabitRowImpl({ habit, done, readOnly, onToggle, onLongPress }: Props) {
  const { c } = useTheme();
  const progress = useSharedValue(done ? 1 : 0);
  const ripple = useSharedValue(1);
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

  const rowStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [c.surface, c.accentSoft]),
    opacity: 1 - pressed.value * 0.15,
  }));
  const boxStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], ['transparent', c.accent]),
    borderColor: interpolateColor(progress.value, [0, 1], [c.textFaint, c.accent]),
  }));
  // A plain ring with no content, so scaling it is safe.
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: ripple.value >= 1 ? 0 : 0.7 * (1 - ripple.value),
    transform: [{ scale: 1 + ripple.value * 0.9 }],
  }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, progress.value)) }));
  const textStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0, 1], [1, 0.55]) }));

  const task = habitTask(habit);
  const title = habitTitle(habit);

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
      accessibilityLabel={`${title}${task ? `. ${task}` : ''}`}
      accessibilityHint={onLongPress ? 'Long press for details' : undefined}
      hitSlop={4}
    >
      <Animated.View style={[styles.row, rowStyle]}>
        <View style={styles.boxWrap}>
          <Animated.View pointerEvents="none" style={[styles.ripple, { borderColor: c.accent }, rippleStyle]} />
          <Animated.View style={[styles.box, boxStyle]}>
            <Animated.View style={checkStyle}>
              <Ionicons name="checkmark" size={20} color={c.onAccent} />
            </Animated.View>
          </Animated.View>
        </View>
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
  text: { flex: 1, gap: 2 },
  badge: { width: 18, alignItems: 'flex-end' },
});
