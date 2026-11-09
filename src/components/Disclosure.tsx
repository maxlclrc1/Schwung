import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { EASE, MOTION, timing } from '../theme/motion';

/**
 * Content that opens and closes in place (docs/INTERACTION_AUDIT.md, finding E). Its height eases between nothing
 * and its own measured height on the shared reflow timing, clipped, while it fades in (reveal) or out (conceal), so
 * what follows moves with it frame by frame: nothing overlaps, no gap opens, and no separate layout animation runs.
 * All on the UI thread; instant with Reduce Motion.
 *
 * Closing, it stops taking touches and leaves the accessibility tree at once, and is unmounted once fully closed.
 * Reopened mid-way, it reverses from wherever it got to. At rest, open, it is exactly its content's height, so the
 * layout is the same as content shown without it. `style` applies to the content (padding, gap).
 */
export function Disclosure({
  open,
  children,
  style,
}: {
  open: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  // Kept on screen while closing, then unmounted (set during render from the change in `open`, as React advises
  // for state derived from props).
  const [closing, setClosing] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    setClosing(!open);
  }
  const height = useSharedValue(0);
  const shown = useSharedValue(open ? 1 : 0);
  const fade = useSharedValue(open ? 1 : 0);

  useEffect(() => {
    if (open) {
      shown.set(timing(1, 'reflow'));
      fade.set(timing(1, 'reveal'));
    } else {
      fade.set(timing(0, 'conceal'));
      shown.set(
        withTiming(0, { duration: MOTION.reflow, easing: EASE, reduceMotion: ReduceMotion.System }, (finished) => {
          // Only once fully closed: a reopening mid-way cancels this (finished = false) and keeps it.
          if (finished) scheduleOnRN(setClosing, false);
        }),
      );
    }
  }, [open, shown, fade]);

  const clip = useAnimatedStyle(() => ({ height: height.value * shown.value, opacity: fade.value }));

  if (!open && !closing) return null;
  return (
    <Animated.View
      style={[styles.clip, clip]}
      pointerEvents={open ? 'auto' : 'none'}
      aria-hidden={!open}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? 'auto' : 'no-hide-descendants'}
    >
      <View style={style} onLayout={(e: LayoutChangeEvent) => height.set(e.nativeEvent.layout.height)}>
        {children}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden' } });
