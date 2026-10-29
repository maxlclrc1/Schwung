import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  FadeInDown,
  FadeOutUp,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import { haptic } from '../../lib/haptics';
import { radius, useTheme } from '../../theme';
import { T } from '../ui';
import { Press } from './Choices';
import { useDragLock, type Tint } from './kit';

/*
 * A measuring tape you slide under a fixed needle: precise (it follows the finger exactly, a step at a time),
 * calm (no momentum, no bounce: it settles onto the nearest step in a blink when let go), and the one control that
 * owns a sideways drag until the finger lifts. A wrapping tape (a day) has no ends at all.
 */

const ease = Easing.bezier(0.22, 1, 0.36, 1);
const TAPE_H = 72;

export function Tape({
  min,
  max,
  wrap = false,
  step,
  unitPx,
  minorEvery,
  majorEvery,
  labelEvery,
  format,
  value,
  rest,
  onChange,
  tickEvery = step,
  tint,
  pos: shared,
}: {
  min: number;
  /** The last value (a wrapping tape: one period after `min`, never shown itself). */
  max: number;
  wrap?: boolean;
  step: number;
  /** Points per unit of value. */
  unitPx: number;
  minorEvery: number;
  majorEvery: number;
  labelEvery: number;
  format: (v: number) => string;
  value: number | null;
  /** Where it rests before anything is chosen. */
  rest: number;
  onChange: (v: number) => void;
  /** Haptic ticks only on these steps (a day ticks each quarter hour). */
  tickEvery?: number;
  tint: Tint;
  /** The live position, for drawings that follow the tape as it moves. */
  pos?: SharedValue<number>;
}) {
  const { c } = useTheme();
  const lock = useDragLock();
  const [w, setW] = useState(0);
  const own = useSharedValue(value ?? rest);
  const pos = shared ?? own;
  const period = max - min;
  const first = wrap ? min - period : min;
  const last = wrap ? max + period : max;

  const norm = useCallback(
    (v: number) => (wrap ? ((((v - min) % period) + period) % period) + min : v),
    [wrap, min, period],
  );
  // The latest value and handler, for the gesture's callbacks (created once).
  const latest = useRef({ value, onChange, norm });
  useEffect(() => {
    latest.current = { value, onChange, norm };
  });
  const emit = useCallback(
    (q: number) => {
      const { value: v, onChange: change, norm: n } = latest.current;
      const next = n(q);
      if (next === v) return;
      if (next % tickEvery === 0) haptic.tap();
      change(next);
    },
    [tickEvery],
  );

  const dragging = useSharedValue(false);
  const start = useSharedValue(0);
  const config = useMemo(
    () => ({
      // Clearly sideways: the tape's. Clearly vertical first: the page's scroll.
      activeOffsetX: [-4, 4] as [number, number],
      failOffsetY: [-14, 14] as [number, number],
      onActivate: () => {
        'worklet';
        cancelAnimation(pos);
        dragging.set(true);
        start.set(pos.get());
        scheduleOnRN(lock, true);
      },
      onUpdate: (e: { translationX: number }) => {
        'worklet';
        let v = start.get() - e.translationX / unitPx;
        if (!wrap) v = Math.max(min, Math.min(max, v));
        const before = Math.round(pos.get() / step) * step;
        pos.set(v);
        const q = Math.round(v / step) * step;
        if (q !== before) scheduleOnRN(emit, q);
      },
      onDeactivate: () => {
        'worklet';
        const q = Math.round(pos.get() / step) * step;
        pos.set(withTiming(q, { duration: 160, easing: ease, reduceMotion: ReduceMotion.System }));
        dragging.set(false);
        scheduleOnRN(emit, q);
      },
      onFinalize: () => {
        'worklet';
        dragging.set(false);
        scheduleOnRN(lock, false);
      },
    }),
    [pos, dragging, start, lock, unitPx, wrap, min, max, step, emit],
  );
  const pan = usePanGesture(config);

  // A value set elsewhere (− and +, a screen reader): glide there, the short way round on a day.
  useEffect(() => {
    if (value === null || dragging.get()) return;
    const at = pos.get();
    let to = value;
    if (wrap) to = value + Math.round((at - value) / period) * period;
    if (Math.abs(to - at) < step / 2) return;
    pos.set(withTiming(to, { duration: 260, easing: ease, reduceMotion: ReduceMotion.System }));
  }, [value, wrap, period, step, pos, dragging]);

  const strip = useAnimatedStyle(() => {
    const v = wrap ? ((((pos.value - min) % period) + period) % period) + min : pos.value;
    return { transform: [{ translateX: w / 2 - (v - first) * unitPx }] };
  });

  const { minor, major, labels, width } = useMemo(() => {
    let mi = '';
    let ma = '';
    const ls: { v: number; x: number }[] = [];
    for (let v = first; v <= last + 1e-6; v += minorEvery) {
      const x = (v - first) * unitPx;
      const isMajor = Math.abs((v % majorEvery) + majorEvery) % majorEvery < 1e-6;
      if (isMajor) ma += `M${x} 10 V30 `;
      else mi += `M${x} 16 V26 `;
      if (Math.abs((v % labelEvery) + labelEvery) % labelEvery < 1e-6) ls.push({ v, x });
    }
    return { minor: mi, major: ma, labels: ls, width: (last - first) * unitPx };
  }, [first, last, minorEvery, majorEvery, labelEvery, unitPx]);

  return (
    <GestureDetector gesture={pan}>
      <View
        style={[styles.tape, { backgroundColor: c.surface }]}
        onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      >
        <Animated.View pointerEvents="none" style={[styles.strip, { width }, strip]}>
          <Svg width={width} height={TAPE_H}>
            <Path d={minor} stroke={c.textFaint} strokeOpacity={0.55} strokeWidth={1.5} strokeLinecap="round" />
            <Path d={major} stroke={c.textDim} strokeWidth={2} strokeLinecap="round" />
          </Svg>
          {labels.map((l) => (
            <View key={l.v} style={[styles.label, { left: l.x - 30 }]}>
              <T v="caption" color={c.textDim} style={styles.labelText}>
                {format(norm(l.v))}
              </T>
            </View>
          ))}
        </Animated.View>
        <LinearGradient
          pointerEvents="none"
          colors={[c.surface, `${c.surface}00`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, { left: 0 }]}
        />
        <LinearGradient
          pointerEvents="none"
          colors={[`${c.surface}00`, c.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fade, { right: 0 }]}
        />
        <View pointerEvents="none" style={styles.needleWrap}>
          <View style={[styles.needle, { backgroundColor: tint.fill }]} />
          <View style={[styles.needleCap, { backgroundColor: tint.fill }]} />
        </View>
      </View>
    </GestureDetector>
  );
}

/**
 * Text whose characters each roll softly into place when they change (a digit slides up a few points as the old
 * one leaves), so a number being dialled reads as one moving thing. Fixed-width slots: nothing around it shifts.
 */
export function RollingText({
  text,
  size,
  color,
  charWidth,
}: {
  text: string;
  size: number;
  color: string;
  /** The width of one character slot (narrow characters such as ":" take half). */
  charWidth: number;
}) {
  return (
    <View style={styles.rolling} accessible accessibilityLabel={text}>
      {text.split('').map((ch, i) => {
        const narrow = ch === ':' || ch === '–' || ch === '+';
        return (
          <View
            key={i}
            style={{ width: narrow ? charWidth * 0.5 : charWidth, height: size * 1.12, overflow: 'hidden' }}
          >
            <Animated.Text
              key={ch}
              entering={ROLL_IN}
              exiting={ROLL_OUT}
              style={[
                styles.rollChar,
                { fontSize: size, lineHeight: size * 1.12, color, width: narrow ? charWidth * 0.5 : charWidth },
              ]}
            >
              {ch}
            </Animated.Text>
          </View>
        );
      })}
    </View>
  );
}

const ROLL_IN = FadeInDown.duration(220)
  .easing(ease)
  .withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })
  .reduceMotion(ReduceMotion.System);
const ROLL_OUT = FadeOutUp.duration(160).reduceMotion(ReduceMotion.System);

/** Round − and + buttons, for one exact step. */
export function StepRound({
  icon,
  label,
  disabled,
  onPress,
}: {
  icon: 'add' | 'remove';
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Press
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={disabled ? { opacity: 0.3 } : undefined}
    >
      <View style={[styles.round, { backgroundColor: c.surface }]}>
        <Ionicons name={icon} size={22} color={c.text} />
      </View>
    </Press>
  );
}

const styles = StyleSheet.create({
  tape: { height: TAPE_H, borderRadius: radius.lg, overflow: 'hidden' },
  strip: { position: 'absolute', left: 0, top: 0, height: TAPE_H },
  label: { position: 'absolute', top: 36, width: 60, alignItems: 'center' },
  labelText: { fontVariant: ['tabular-nums'], fontSize: 12 },
  fade: { position: 'absolute', top: 0, bottom: 0, width: 56 },
  needleWrap: { position: 'absolute', top: 0, bottom: 0, left: '50%', marginLeft: -1.5, alignItems: 'center' },
  needle: { width: 3, height: 40, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  needleCap: { width: 9, height: 9, borderRadius: 5, marginTop: -4 },
  rolling: { flexDirection: 'row', justifyContent: 'center' },
  rollChar: { position: 'absolute', left: 0, top: 0, fontWeight: '800', textAlign: 'center', letterSpacing: -1 },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
