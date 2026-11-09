import { useEffect, type ComponentRef, type ReactNode, type Ref } from 'react';
import { Pressable, StyleSheet, type GestureResponderEvent, type PressableProps, type StyleProp, type View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { PRESS_DIM, timing } from '../theme/motion';

type ViewRef = ComponentRef<typeof View>;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** The pressable's view (passed through, as for Pressable). */
  ref?: Ref<ViewRef>;
  /** Opacity while held. Rows, links and secondary controls use the shared PRESS_DIM. */
  dim?: number;
};

/**
 * The press feedback for rows, links and secondary controls (docs/INTERACTION_AUDIT.md, finding B): the control dims
 * as the finger lands (theme/motion press in) and eases back when it lifts or the touch is cancelled (press out).
 * It runs on the UI thread from a shared value, so a tap is never held up and nothing re-renders. Reduce Motion makes
 * the change instant; a disabled control stays still. The action, roles, labels, hit areas and long presses are the
 * Pressable's own, unchanged. Filled buttons keep their own feedback (ui.tsx Button).
 */
export function Tap({ dim = PRESS_DIM, style, disabled, onPressIn, onPressOut, children, ...rest }: Props) {
  const down = useSharedValue(0);
  // A static opacity of its own (a dimmed control) is kept and multiplied, never overridden.
  const base = StyleSheet.flatten(style)?.opacity ?? 1;
  const fade = useAnimatedStyle(() => ({ opacity: base * (1 - down.value * (1 - dim)) }));

  useEffect(() => {
    if (disabled) down.set(0);
  }, [disabled, down]);

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e: GestureResponderEvent) => {
        down.set(timing(1, 'pressIn'));
        onPressIn?.(e);
      }}
      onPressOut={(e: GestureResponderEvent) => {
        down.set(timing(0, 'pressOut'));
        onPressOut?.(e);
      }}
      style={[style, fade]}
    >
      {children}
    </AnimatedPressable>
  );
}
