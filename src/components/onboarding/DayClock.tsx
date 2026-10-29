import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { radius, space, useTheme } from '../../theme';
import { T } from '../ui';
import { useTints } from './kit';
import { RollingText, StepRound, Tape } from './Tape';

const DAY = 1440;
const SKY_H = 188;
const STARS = [
  [0.08, 0.18],
  [0.2, 0.32],
  [0.31, 0.12],
  [0.44, 0.26],
  [0.56, 0.1],
  [0.67, 0.3],
  [0.78, 0.16],
  [0.9, 0.28],
  [0.14, 0.48],
  [0.83, 0.46],
];
/** The sky through the day: minutes after midnight, and its colour in each theme. */
const SKY_AT = [0, 300, 380, 480, 720, 990, 1110, 1200, 1440];
const SKY = {
  light: ['#C4C4E6', '#C4C4E6', '#F2D3C2', '#DCE6F3', '#E4ECF7', '#DCE6F3', '#F0CDBD', '#C4C4E6', '#C4C4E6'],
  dark: ['#14142C', '#14142C', '#3A2A3D', '#1E2A3E', '#22314A', '#1E2A3E', '#3A2833', '#14142C', '#14142C'],
};

export const hhmm = (m: number) =>
  `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const minutesOf = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** A word for the kind of morning, so the choice feels seen. */
function moodOf(m: number) {
  if (m >= 240 && m < 360) return 'An early riser';
  if (m >= 360 && m < 540) return 'A morning person';
  if (m >= 540 && m < 720) return 'Slow, easy mornings';
  if (m >= 720 && m < 1080) return 'Your day starts later';
  return 'A night-time schedule';
}

/**
 * When the day begins, anywhere in the 24 hours: a painted sky over the hills where the sun crosses by day and the
 * moon by night, setting behind the ridge, the sky warming and cooling with it. Slide the day underneath (it has no
 * ends: past midnight it simply carries on), five minutes at a time, or step a quarter hour with − and +.
 */
export function DayClock({
  minutes,
  onChange,
  muted,
}: {
  minutes: number | null;
  onChange: (m: number) => void;
  /** Another answer was chosen ("it varies"): shown instead of a time. */
  muted?: string;
}) {
  const { c, isDark } = useTheme();
  const t = useTints();
  const [w, setW] = useState(0);
  const rest = 7 * 60;
  const pos = useSharedValue(minutes ?? rest);
  const shown = minutes ?? rest;
  const sky = isDark ? SKY.dark : SKY.light;

  const hy = SKY_H - 40;
  const rx = Math.max(10, w / 2 - 26);
  const ry = SKY_H - 76;
  const cx = w / 2;

  const day = (v: number) => {
    'worklet';
    return ((v % DAY) + DAY) % DAY;
  };
  const bg = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(day(pos.value), SKY_AT, sky) }));
  const stars = useAnimatedStyle(() => ({
    opacity: interpolate(day(pos.value), [0, 300, 400, 1080, 1180, 1440], [1, 1, 0, 0, 1, 1]),
  }));
  /** A body on its half of the day (sun from 06:00, moon from 18:00): up from the left, down behind the right. */
  const place = (from: number) => {
    'worklet';
    let s = ((((day(pos.value) - from) % DAY) + DAY) % DAY) / 720;
    if (s > 1.5) s -= 2;
    s = Math.max(-0.08, Math.min(1.08, s));
    return {
      transform: [
        { translateX: cx - rx * Math.cos(Math.PI * s) - 20 },
        { translateY: hy - ry * Math.sin(Math.PI * s) - 20 },
      ],
    };
  };
  const sun = useAnimatedStyle(() => place(360));
  const moon = useAnimatedStyle(() => place(1080));
  const set = (m: number) => onChange(day(m));

  return (
    <View style={{ gap: space.lg }}>
      <View
        style={styles.sky}
        onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View style={[StyleSheet.absoluteFill, bg]} />
        {w ? (
          <>
            <Animated.View style={[StyleSheet.absoluteFill, stars]}>
              {STARS.map(([x, y], i) => (
                <View key={i} style={[styles.star, { left: x * w, top: y * SKY_H, opacity: i % 3 ? 0.6 : 1 }]} />
              ))}
            </Animated.View>
            <Animated.View style={[styles.body, sun]}>
              <View style={[styles.glow, { backgroundColor: t.peach.fill }]} />
              <View style={[styles.orb, { backgroundColor: t.peach.fill }]}>
                <Ionicons name="sunny" size={20} color={t.peach.on} />
              </View>
            </Animated.View>
            <Animated.View style={[styles.body, moon]}>
              <View style={[styles.orb, { backgroundColor: isDark ? '#E9E6F7' : '#FFFFFF' }]}>
                <Ionicons name="moon" size={17} color={t.indigo.fill} />
              </View>
            </Animated.View>
            <Svg width={w} height={SKY_H} style={StyleSheet.absoluteFill}>
              <Path
                d={`M0 ${hy + 8} C ${w * 0.16} ${hy - 26}, ${w * 0.3} ${hy - 10}, ${w * 0.42} ${hy - 2} C ${w * 0.56} ${hy + 6}, ${w * 0.72} ${hy - 34}, ${w} ${hy - 6} L ${w} ${SKY_H} L 0 ${SKY_H} Z`}
                fill={t.mist.fill}
                fillOpacity={isDark ? 0.55 : 0.5}
              />
              <Path
                d={`M0 ${hy + 24} C ${w * 0.22} ${hy + 6}, ${w * 0.46} ${hy + 30}, ${w * 0.7} ${hy + 14} C ${w * 0.84} ${hy + 6}, ${w * 0.94} ${hy + 10}, ${w} ${hy + 16} L ${w} ${SKY_H} L 0 ${SKY_H} Z`}
                fill={t.sage.fill}
                fillOpacity={isDark ? 0.75 : 0.8}
              />
            </Svg>
          </>
        ) : null}
      </View>

      <View style={styles.readout}>
        <StepRound icon="remove" label="15 minutes earlier" onPress={() => set(shown - 15)} />
        <View
          style={styles.time}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Usual wake-up time"
          accessibilityValue={{ text: muted ?? (minutes === null ? 'Not chosen' : hhmm(minutes)) }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(e) => set(shown + (e.nativeEvent.actionName === 'increment' ? 15 : -15))}
        >
          {muted ? (
            <T v="display" color={c.textDim} style={styles.mutedText}>
              {muted}
            </T>
          ) : (
            <RollingText text={hhmm(shown)} size={60} charWidth={38} color={minutes === null ? c.textFaint : c.text} />
          )}
          <T v="caption" color={minutes === null || muted ? c.textFaint : t.indigo.ink} style={styles.mood}>
            {muted ? 'No fixed time' : minutes === null ? 'Slide the day below' : moodOf(minutes)}
          </T>
        </View>
        <StepRound icon="add" label="15 minutes later" onPress={() => set(shown + 15)} />
      </View>

      <Tape
        wrap
        min={0}
        max={DAY}
        step={5}
        unitPx={68 / 60}
        minorEvery={15}
        majorEvery={60}
        labelEvery={180}
        format={hhmm}
        value={muted ? null : minutes}
        rest={rest}
        onChange={set}
        tickEvery={15}
        tint={t.indigo}
        pos={pos}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sky: { height: SKY_H, borderRadius: radius.lg, overflow: 'hidden' },
  star: { position: 'absolute', width: 3, height: 3, borderRadius: 2, backgroundColor: '#FFFFFF' },
  body: { position: 'absolute', left: 0, top: 0, width: 40, height: 40 },
  glow: { position: 'absolute', left: -12, top: -12, width: 64, height: 64, borderRadius: 32, opacity: 0.28 },
  orb: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  readout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  time: { flex: 1, alignItems: 'center', gap: 2 },
  mutedText: { fontSize: 34, lineHeight: 68 },
  mood: { fontWeight: '700' },
});
