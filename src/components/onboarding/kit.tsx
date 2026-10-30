import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { usePanGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useState } from 'react';
import { space, useTheme } from '../../theme';
import { T } from '../ui';
import { t as tr, type TKey } from '../../i18n';

/*
 * The set-up's shared language: five soft tints from the world (lavender sky, sage meadow, misty blue valley,
 * peach dawn, indigo night), one easing, and the pieces every question uses.
 *
 * Motion: everything glides on the same ease-out curve with small travel (a few points, never a bounce), and
 * Reduce Motion turns movement into an instant change.
 */

export type TintName = 'lavender' | 'sage' | 'mist' | 'peach' | 'indigo';
export type Tint = {
  /** Tinted surfaces behind a chosen answer. */
  soft: string;
  /** Text and icons on the background or a soft surface. */
  ink: string;
  /** Solid fills: chosen markers, drawn lines. */
  fill: string;
  /** Icons on a fill. */
  on: string;
};

const LIGHT: Record<TintName, Tint> = {
  lavender: { soft: '#ECE6F8', ink: '#5E3FB0', fill: '#7451C8', on: '#FFFFFF' },
  sage: { soft: '#E3ECDF', ink: '#4A664B', fill: '#6E9470', on: '#FFFFFF' },
  mist: { soft: '#E1E8F2', ink: '#44607F', fill: '#6F8BB0', on: '#FFFFFF' },
  peach: { soft: '#F6E4D8', ink: '#8E5236', fill: '#C9835E', on: '#FFFFFF' },
  indigo: { soft: '#E2E1F0', ink: '#3B3A78', fill: '#4F4D9A', on: '#FFFFFF' },
};
const DARK: Record<TintName, Tint> = {
  lavender: { soft: 'rgba(167,139,250,0.16)', ink: '#C4B2FC', fill: '#A78BFA', on: '#16112B' },
  sage: { soft: 'rgba(143,176,140,0.17)', ink: '#B2D0AF', fill: '#8FB08C', on: '#111A12' },
  mist: { soft: 'rgba(142,166,198,0.17)', ink: '#B6C8E2', fill: '#8EA6C6', on: '#10161F' },
  peach: { soft: 'rgba(226,169,136,0.17)', ink: '#F2C4A8', fill: '#E2A988', on: '#24140C' },
  indigo: { soft: 'rgba(130,128,214,0.2)', ink: '#BDBCF0', fill: '#7F7DD0', on: '#12112A' },
};

export function useTints() {
  const { isDark } = useTheme();
  return isDark ? DARK : LIGHT;
}

export const DURATION = { tick: 160, move: 280, scene: 520 } as const;

/** The one easing curve: a quick start that settles softly. */
export const settle = (to: number, duration: number = DURATION.move) => {
  'worklet';
  return withTiming(to, { duration, easing: Easing.bezier(0.22, 1, 0.36, 1), reduceMotion: ReduceMotion.System });
};

/** Content rising a few points into place, after `delay` ms. */
export const rise = (delay = 0) =>
  FadeInDown.duration(DURATION.scene)
    .delay(delay)
    .easing(Easing.bezier(0.22, 1, 0.36, 1))
    .withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] })
    .reduceMotion(ReduceMotion.System);
export const appear = (delay = 0) => FadeIn.duration(DURATION.scene).delay(delay).reduceMotion(ReduceMotion.System);

/**
 * A drag inside a scrolling question holds the page still until it ends, so the scroll never takes the finger
 * from a dial or a scale.
 */
export const DragLock = createContext<(dragging: boolean) => void>(() => {});
export const useDragLock = () => useContext(DragLock);

/**
 * A drawing's own drag (phone, dial): a gesture-handler pan that takes the touch the moment it lands, so neither
 * the page's scroll nor any navigation gesture can have it until the finger lifts. Reports the touch point in the
 * drawing's coordinates, on touch down (a tap chooses too) and as it moves.
 */
export function useDrawingDrag(onPoint: (x: number, y: number) => void) {
  const lock = useDragLock();
  const latest = useRef(onPoint);
  useEffect(() => {
    latest.current = onPoint;
  });
  const point = useCallback((x: number, y: number) => latest.current(x, y), []);
  // Created once: a config that changed every render would be re-sent to the native handler each time.
  const config = useMemo(
    () => ({
      minDistance: 0,
      onBegin: (e: { x: number; y: number }) => {
        'worklet';
        scheduleOnRN(lock, true);
        scheduleOnRN(point, e.x, e.y);
      },
      onUpdate: (e: { x: number; y: number }) => {
        'worklet';
        scheduleOnRN(point, e.x, e.y);
      },
      onFinalize: () => {
        'worklet';
        scheduleOnRN(lock, false);
      },
    }),
    [lock, point],
  );
  return usePanGesture(config);
}

/** A question: a short line that carries the story, the question itself, and a little context. */
export function Question({
  eyebrow,
  tint,
  title,
  hint,
  children,
  center,
}: {
  eyebrow: string;
  tint: TintName;
  title: string;
  hint?: string;
  children?: ReactNode;
  /** The answer sits in the middle of the space below (dials, illustrations). */
  center?: boolean;
}) {
  const { c } = useTheme();
  const tints = useTints();
  return (
    <View style={styles.question}>
      <Animated.View entering={rise(0)} style={{ gap: space.sm }}>
        <T v="overline" color={tints[tint].ink}>
          {eyebrow}
        </T>
        <T v="title" style={styles.big} accessibilityRole="header">
          {title}
        </T>
        {hint ? <T color={c.textDim}>{hint}</T> : null}
      </Animated.View>
      <Animated.View entering={rise(110)} style={[styles.answer, center && styles.center]}>
        {children}
      </Animated.View>
    </View>
  );
}

const chapter = (i: number, tint: TintName) => ({
  tint,
  get name() {
    return tr(`setup.chapters.${i}` as TKey);
  },
});
export const CHAPTERS: { name: string; tint: TintName }[] = [
  chapter(0, 'lavender'),
  chapter(1, 'peach'),
  chapter(2, 'mist'),
  chapter(3, 'sage'),
  chapter(4, 'indigo'),
];

/**
 * The way through set-up as a small trail: five waypoints, one a chapter of the story, joined by a line that
 * fills as the questions are answered and takes on each chapter's tint.
 */
export function TrailProgress({ at }: { at: number }) {
  const { c } = useTheme();
  const tints = useTints();
  const [w, setW] = useState(0);
  const pos = useSharedValue(at);
  useEffect(() => {
    pos.set(settle(at, DURATION.scene));
  }, [at, pos]);
  const last = CHAPTERS.length - 1;
  const fills = CHAPTERS.map((ch) => tints[ch.tint].fill);
  const stops = CHAPTERS.map((_, i) => i);
  const line = useAnimatedStyle(() => ({
    width: interpolate(pos.value, [0, last], [0, Math.max(0, w - DOT)]),
    backgroundColor: interpolateColor(pos.value, stops, fills),
  }));
  const chapter = Math.min(last, Math.floor(at + 0.001));
  return (
    <View
      style={styles.trail}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={tr('setup.chapterA11y', {
        name: CHAPTERS[chapter].name,
        n: chapter + 1,
        total: CHAPTERS.length,
      })}
    >
      <View style={[styles.trailBase, { backgroundColor: c.border }]} />
      <Animated.View style={[styles.trailLine, line]} />
      {CHAPTERS.map((ch, i) => (
        <Waypoint key={ch.name} i={i} pos={pos} x={(i / last) * Math.max(0, w - DOT)} color={tints[ch.tint].fill} />
      ))}
    </View>
  );
}

const DOT = 10;

function Waypoint({ i, pos, x, color }: { i: number; pos: SharedValue<number>; x: number; color: string }) {
  const { c } = useTheme();
  const dot = useAnimatedStyle(() => {
    const reached = interpolate(pos.value, [i - 0.6, i], [0, 1], 'clamp');
    const here = interpolate(Math.abs(pos.value - i), [0, 0.6], [1, 0], 'clamp');
    return {
      opacity: 0.35 + reached * 0.65,
      transform: [{ scale: 0.8 + here * 0.3 }],
    };
  });
  const halo = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(pos.value - i), [0, 0.5], [0.35, 0], 'clamp'),
  }));
  return (
    <View style={[styles.waypoint, { left: x }]}>
      <Animated.View style={[styles.halo, { backgroundColor: color }, halo]} />
      <Animated.View style={[styles.dot, { backgroundColor: color, borderColor: c.bg }, dot]} />
    </View>
  );
}

const styles = StyleSheet.create({
  question: { flexGrow: 1, gap: space.xl },
  big: { fontSize: 32, lineHeight: 38 },
  answer: { gap: space.lg },
  center: { flexGrow: 1, justifyContent: 'center' },
  trail: { flex: 1, height: 22, justifyContent: 'center' },
  trailBase: { position: 'absolute', left: DOT / 2, right: DOT / 2, height: 2, borderRadius: 1 },
  trailLine: { position: 'absolute', left: DOT / 2, height: 2, borderRadius: 1 },
  waypoint: { position: 'absolute', width: DOT, height: DOT, alignItems: 'center', justifyContent: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 2 },
  halo: { position: 'absolute', width: 22, height: 22, borderRadius: 11 },
});
