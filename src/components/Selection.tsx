import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { useSelectColors, useSelectedOpacity } from '../theme/select';

/*
 * Shared selection marks (theme/select.ts): they ease with a choice's `selected` value (useSelected), so every
 * segmented control and list draws its selection the same way.
 */

/** The violet underline under a chosen segment, fading in and out in place. `style` positions it, as before. */
export function Underline({ v, style }: { v: SharedValue<number>; style: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const ink = useSelectColors(v, { backgroundColor: [null, c.accent] });
  return <Animated.View style={[style, ink]} pointerEvents="none" />;
}

/** An icon whose colour eases with selection: the two inks crossfade on one glyph's footprint. */
export function InkIcon({
  v,
  name,
  size,
  color,
  selectedColor,
  selectedName,
}: {
  v: SharedValue<number>;
  name: ComponentProps<typeof Ionicons>['name'];
  size: number;
  color: string;
  selectedColor: string;
  /** A different glyph when chosen (e.g. a tick); it crossfades too. */
  selectedName?: ComponentProps<typeof Ionicons>['name'];
}) {
  const off = useAnimatedStyle(() => ({ opacity: 1 - v.value }));
  const on = useSelectedOpacity(v);
  return (
    <View>
      <Animated.View style={off}>
        <Ionicons name={name} size={size} color={color} />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, styles.mid, on]}>
        <Ionicons name={selectedName ?? name} size={size} color={selectedColor} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({ mid: { alignItems: 'center', justifyContent: 'center' } });
