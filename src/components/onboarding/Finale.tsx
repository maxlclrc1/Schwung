import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { DAY_POINTS } from '../../core/ascent';
import { worldFrame } from '../../core/world';
import { space, useTheme } from '../../theme';
import { Button, T } from '../ui';
import { WorldBackdrop } from '../World';
import { Press } from './Choices';
import { HabitArt } from './Habits';
import { cover } from './cover';
import { rise, useTints, type Tint } from './kit';

/*
 * "Your journey is taking shape": the short scene between confirming the Life Reset and Day 1 (not the Day 1
 * ceremony). The world clears from the mist, a light for each chosen habit wakes along the real trail as a fine
 * path draws up it to the summit, the summit warms, and the reset is named. About three and a half seconds,
 * skippable from the first frame; with Reduce Motion it's a calm crossfade of about a second.
 *
 * Honest about the save: the program is already created when this starts (set-up's start(), which refuses a
 * second one); the way in is offered only once it's on disk. If the app closes during it, the saved program
 * opens on Day 1 next time and this scene never plays again.
 */

const AnimatedPath = Animated.createAnimatedComponent(Path);
const ease = Easing.bezier(0.45, 0, 0.2, 1);
const sys = ReduceMotion.System;

export function Finale({
  habits,
  saved,
  entering,
  onEnter,
}: {
  habits: string[];
  saved: boolean;
  /** Begin or Skip was pressed: the app is coming up beneath. */
  entering: boolean;
  onEnter: (kind: 'begin' | 'skip') => void;
}) {
  const { c, isDark } = useTheme();
  const t = useTints();
  const insets = useSafeAreaInsets();
  const { width: W } = useWindowDimensions();
  const reduce = useReducedMotion();
  const zoneTop = insets.top + space.xxl;
  const { zoneHeight } = worldFrame(W, zoneTop);

  // The trail on the painting, day 1 at the foot to day 66 at the summit, in screen points.
  const pts = DAY_POINTS.map((p) => ({ x: p.x * W, y: zoneTop + p.y * zoneHeight }));
  let length = 0;
  const along = [0];
  for (let i = 1; i < pts.length; i++) {
    length += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    along.push(length);
  }
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  // Each habit's light, spread up the trail; it wakes as the path reaches it.
  const lights = habits.map((id, i) => {
    const day = Math.round(((i + 1) / (habits.length + 1)) * (pts.length - 1));
    return { id, ...pts[day], at: along[day] / length };
  });
  const summit = pts[pts.length - 1];
  const palette = [t.lavender, t.peach, t.sage, t.mist, t.indigo, t.peach];

  const mist = useSharedValue(1);
  const drawn = useSharedValue(reduce ? 1 : 0);
  const glow = useSharedValue(0);
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduce) {
      mist.set(withTiming(0.12, { duration: 700 }));
      glow.set(withTiming(1, { duration: 700 }));
      return;
    }
    mist.set(withTiming(0.12, { duration: 1100, easing: Easing.out(Easing.quad) }));
    drawn.set(withDelay(450, withTiming(1, { duration: 1800, easing: ease })));
    glow.set(withDelay(2000, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) })));
    // The air keeps moving, slowly, for as long as the scene is up.
    drift.set(withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [reduce, mist, drawn, glow, drift]);

  // The way in appears once the scene has played (or at once after Skip) and the save is on disk.
  const [played, setPlayed] = useState(false);
  const [skipped, setSkipped] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setPlayed(true), reduce ? 900 : 2900);
    return () => clearTimeout(timer);
  }, [reduce]);
  useEffect(() => {
    if (skipped && saved) onEnter('skip');
  }, [skipped, saved, onEnter]);

  const veil = useAnimatedStyle(() => ({ opacity: mist.value }));
  // On the way in, the words and controls go first; the mountain stays longest, melting into the panorama.
  const words = useAnimatedStyle(() => ({ opacity: interpolate(cover.value, [0.55, 0.95], [0, 1], 'clamp') }));
  const world = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + mist.value * 0.04 }, { translateY: mist.value * 10 }],
  }));
  const path = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.value) }));
  const fogA = useAnimatedStyle(() => ({
    opacity: 0.25 + mist.value * 0.6,
    transform: [{ translateX: -W * 0.3 + drift.value * 28 }],
  }));
  const fogB = useAnimatedStyle(() => ({
    opacity: 0.2 + mist.value * 0.5,
    transform: [{ translateX: -W * 0.3 - drift.value * 22 }],
  }));
  const summitGlow = useAnimatedStyle(() => ({
    opacity: glow.value * (0.75 + drift.value * 0.25),
    transform: [{ scale: 0.85 + glow.value * 0.15 }],
  }));
  const fog = isDark
    ? ['rgba(17,17,22,0)', 'rgba(17,17,22,0.75)', 'rgba(17,17,22,0)']
    : ['rgba(247,246,251,0)', 'rgba(247,246,251,0.8)', 'rgba(247,246,251,0)'];

  return (
    <Animated.View
      entering={FadeIn.duration(260).reduceMotion(sys)}
      style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}
      accessibilityViewIsModal
    >
      <Animated.View style={[StyleSheet.absoluteFill, world]} pointerEvents="none">
        <WorldBackdrop zoneTop={zoneTop} />
      </Animated.View>

      <View
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <Animated.View style={[styles.summitGlow, { left: summit.x - 70, top: summit.y - 70 }, summitGlow]}>
          <View
            style={[
              styles.glowRing,
              { width: 140, height: 140, borderRadius: 70, backgroundColor: t.peach.fill, opacity: 0.1 },
            ]}
          />
          <View
            style={[
              styles.glowRing,
              { width: 84, height: 84, borderRadius: 42, backgroundColor: t.peach.fill, opacity: 0.16 },
            ]}
          />
          <View
            style={[
              styles.glowRing,
              { width: 36, height: 36, borderRadius: 18, backgroundColor: t.peach.fill, opacity: 0.3 },
            ]}
          />
        </Animated.View>
        <Svg width={W} height={zoneTop + zoneHeight + 20} style={StyleSheet.absoluteFill}>
          <AnimatedPath
            d={d}
            stroke={t.peach.fill}
            strokeOpacity={0.35}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={[length, length]}
            animatedProps={path}
          />
          <AnimatedPathLine d={d} length={length} drawn={drawn} />
        </Svg>
        <Light x={pts[0].x} y={pts[0].y} at={0} drawn={drawn} tint={t.lavender} start />
        {lights.map((l, i) => (
          <Light key={l.id} x={l.x} y={l.y} at={l.at} drawn={drawn} tint={palette[i % palette.length]} />
        ))}
        <Animated.View style={[styles.fog, { top: zoneTop + zoneHeight * 0.45, width: W * 1.6 }, fogA]}>
          <LinearGradient colors={fog as [string, string, string]} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[styles.fog, { top: zoneTop + zoneHeight * 0.8, width: W * 1.6, height: 120 }, fogB]}>
          <LinearGradient colors={fog as [string, string, string]} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }, veil]} />
      </View>

      <Animated.View style={[StyleSheet.absoluteFill, words]} pointerEvents={entering ? 'none' : 'box-none'}>
        <Press
          onPress={() => setSkipped(true)}
          style={[styles.skip, { top: insets.top + space.sm }]}
          accessibilityRole="button"
          accessibilityLabel="Skip to Day 1"
        >
          <View style={[styles.skipPill, { backgroundColor: c.surface }]}>
            <T v="caption" color={c.textDim} style={{ fontWeight: '700' }}>
              {skipped && !saved ? 'Saving…' : 'Skip'}
            </T>
          </View>
        </Press>

        <View style={[styles.words, { paddingBottom: insets.bottom + space.lg }]}>
          <Animated.View entering={rise(reduce ? 0 : 250)}>
            <T v="overline" color={t.lavender.ink} style={{ letterSpacing: 2.4 }}>
              Your journey is taking shape
            </T>
          </Animated.View>
          <Animated.View entering={rise(reduce ? 200 : 2050)}>
            <T v="display" style={styles.title} accessibilityRole="header">
              Your 66-day reset starts here.
            </T>
          </Animated.View>
          <Animated.View entering={rise(reduce ? 300 : 2350)} style={styles.habits}>
            {habits.map((id) => (
              <View key={id} style={[styles.thumb, { borderColor: c.bg }]}>
                <HabitArt id={id} width={36} height={36} />
              </View>
            ))}
          </Animated.View>
          <View style={styles.cta}>
            {played && saved ? (
              <Animated.View entering={rise(0)}>
                <Shine disabled={reduce}>
                  <Button label="Begin Day 1" onPress={() => onEnter('begin')} />
                </Shine>
              </Animated.View>
            ) : played ? (
              // Only if the save is slow: say so plainly, and offer the way in the moment it's done.
              <T v="caption" color={c.textDim} style={styles.center}>
                Saving your reset on this phone…
              </T>
            ) : null}
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

/** The fine bright line itself, over its soft warm underglow. */
function AnimatedPathLine({ d, length, drawn }: { d: string; length: number; drawn: SharedValue<number> }) {
  const props = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.value) }));
  return (
    <AnimatedPath
      d={d}
      stroke="#FFFFFF"
      strokeOpacity={0.9}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      strokeDasharray={[length, length]}
      animatedProps={props}
    />
  );
}

/** A habit's light on the trail: it wakes, softly, as the path reaches it. */
function Light({
  x,
  y,
  at,
  drawn,
  tint,
  start,
}: {
  x: number;
  y: number;
  at: number;
  drawn: SharedValue<number>;
  tint: Tint;
  start?: boolean;
}) {
  const style = useAnimatedStyle(() => {
    const on = interpolate(drawn.value, [at - 0.015, at + 0.04], [0, 1], 'clamp');
    return { opacity: on, transform: [{ scale: 0.7 + on * 0.3 }] };
  });
  const size = start ? 14 : 11;
  return (
    <Animated.View style={[styles.light, { left: x - 18, top: y - 18 }, style]}>
      <View style={[styles.halo, { backgroundColor: tint.fill }]} />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: '#FFFFFF',
          borderWidth: 2.5,
          borderColor: tint.fill,
        }}
      />
    </Animated.View>
  );
}

/** A single soft sheen across the button as it arrives. */
function Shine({ children, disabled }: { children: React.ReactNode; disabled: boolean }) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!disabled && w) x.set(withDelay(250, withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })));
  }, [disabled, w, x]);
  const band = useAnimatedStyle(() => ({
    transform: [{ translateX: -120 + x.value * (w + 240) }],
    opacity: x.value < 1 ? 1 : 0,
  }));
  return (
    <View style={styles.shine} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {children}
      {!disabled ? (
        <Animated.View pointerEvents="none" style={[styles.band, band]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  summitGlow: { position: 'absolute', width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  glowRing: { position: 'absolute' },
  fog: { position: 'absolute', left: 0, height: 150 },
  light: { position: 'absolute', width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 30, height: 30, borderRadius: 15, opacity: 0.3 },
  skip: { position: 'absolute', right: space.lg },
  skipPill: { minHeight: 36, paddingHorizontal: space.md, borderRadius: 18, justifyContent: 'center', opacity: 0.92 },
  words: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: space.xl, gap: space.md },
  title: { fontSize: 40, lineHeight: 44 },
  habits: { flexDirection: 'row' },
  thumb: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, overflow: 'hidden', marginRight: -8 },
  cta: { minHeight: 64, justifyContent: 'center', marginTop: space.sm },
  center: { textAlign: 'center' },
  shine: { borderRadius: 16, overflow: 'hidden' },
  band: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 120 },
});
