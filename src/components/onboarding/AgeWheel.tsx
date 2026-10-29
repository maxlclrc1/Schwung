import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { haptic } from '../../lib/haptics';
import { radius, space, useTheme } from '../../theme';
import { T } from '../ui';
import { settle, useTints } from './kit';

const ROW = 56;
const SHOWN = 5;

/**
 * A vertical wheel of answers: scroll or tap, and the one in the band is the answer. Rows fade with their
 * distance from the band, each passing row ticks, and the band fills once something is chosen. Nothing counts as
 * chosen until it has been touched. Adjustable for screen readers.
 */
export function AgeWheel<K extends string>({
  items,
  value,
  onChange,
  start,
  label,
}: {
  items: { id: K; label: string }[];
  value: K | null;
  onChange: (id: K) => void;
  /** Where the wheel rests before anything is chosen. */
  start: number;
  label: string;
}) {
  const { c } = useTheme();
  const tint = useTints().lavender;
  const ref = useAnimatedRef<Animated.ScrollView>();
  const index = value === null ? -1 : items.findIndex((x) => x.id === value);
  // Where it first rests; later changes scroll it there instead.
  const [initial] = useState(() => (index >= 0 ? index : start) * ROW);
  const y = useSharedValue(initial);
  const passed = useSharedValue(Math.round(initial / ROW));
  const chosen = useSharedValue(index >= 0 ? 1 : 0);
  useEffect(() => {
    chosen.set(settle(index >= 0 ? 1 : 0));
  }, [index, chosen]);

  const pick = (i: number) => {
    const n = Math.max(0, Math.min(items.length - 1, i));
    if (items[n].id !== value) onChange(items[n].id);
  };
  const tick = () => haptic.tap();
  const scroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      y.set(e.contentOffset.y);
      const i = Math.round(e.contentOffset.y / ROW);
      if (i !== passed.get()) {
        passed.set(i);
        scheduleOnRN(tick);
      }
    },
    onMomentumEnd: (e) => {
      scheduleOnRN(pick, Math.round(e.contentOffset.y / ROW));
    },
    onEndDrag: (e) => {
      // A slow drag that stops without momentum settles here.
      if (Math.abs(e.velocity?.y ?? 0) < 0.05) scheduleOnRN(pick, Math.round(e.contentOffset.y / ROW));
    },
  });
  const goTo = (i: number) => {
    const n = Math.max(0, Math.min(items.length - 1, i));
    ref.current?.scrollTo({ y: n * ROW, animated: true });
    pick(n);
  };

  const band = useAnimatedStyle(() => ({
    backgroundColor: tint.soft,
    opacity: 0.45 + chosen.value * 0.55,
  }));
  const check = useAnimatedStyle(() => ({
    opacity: chosen.value,
    transform: [{ translateX: (1 - chosen.value) * -6 }],
  }));

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ text: index >= 0 ? items[index].label : 'Not chosen' }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const step = e.nativeEvent.actionName === 'increment' ? 1 : -1;
        // The first adjustment chooses the row the wheel rests on.
        goTo(index >= 0 ? index + step : start);
      }}
    >
      <Animated.View pointerEvents="none" style={[styles.band, band]}>
        <Animated.View style={[styles.check, { backgroundColor: tint.fill }, check]}>
          <Ionicons name="checkmark" size={16} color={tint.on} />
        </Animated.View>
      </Animated.View>
      <Animated.ScrollView
        ref={ref}
        onScroll={scroll}
        scrollEventThrottle={16}
        snapToInterval={ROW}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        contentOffset={{ x: 0, y: initial }}
        contentContainerStyle={{ paddingVertical: ROW * Math.floor(SHOWN / 2) }}
        // The web has no contentOffset: start there once laid out.
        onLayout={Platform.OS === 'web' ? () => ref.current?.scrollTo({ y: initial, animated: false }) : undefined}
      >
        {items.map((x, i) => (
          <Row key={x.id} i={i} y={y} label={x.label} on={i === index} onPress={() => goTo(i)} />
        ))}
      </Animated.ScrollView>
      <LinearGradient pointerEvents="none" colors={[c.bg, `${c.bg}00`]} style={[styles.fade, { top: 0 }]} />
      <LinearGradient pointerEvents="none" colors={[`${c.bg}00`, c.bg]} style={[styles.fade, { bottom: 0 }]} />
    </View>
  );
}

function Row({
  i,
  y,
  label,
  on,
  onPress,
}: {
  i: number;
  y: SharedValue<number>;
  label: string;
  on: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const tint = useTints().lavender;
  const style = useAnimatedStyle(() => {
    const d = Math.abs(y.value / ROW - i);
    return {
      opacity: interpolate(d, [0, 1, 2], [1, 0.42, 0.16], 'clamp'),
      transform: [{ translateY: interpolate(y.value / ROW - i, [-2, 0, 2], [6, 0, -6], 'clamp') }],
    };
  });
  return (
    <Pressable onPress={onPress} accessible={false} style={styles.row}>
      <Animated.View style={style}>
        <T v="title" color={on ? tint.ink : c.text} style={styles.rowText}>
          {label}
        </T>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { height: ROW * SHOWN, justifyContent: 'center', alignSelf: 'stretch' },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ROW * Math.floor(SHOWN / 2),
    height: ROW,
    borderRadius: radius.pill,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: space.md,
  },
  check: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  row: { height: ROW, alignItems: 'center', justifyContent: 'center' },
  rowText: { fontSize: 28, lineHeight: 34, textAlign: 'center' },
  fade: { position: 'absolute', left: 0, right: 0, height: ROW * 1.4 },
});
