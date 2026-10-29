import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
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
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import { DAY_POINTS, LANDMARKS } from '../../core/ascent';
import { PROGRAM_DAYS } from '../../core/dates';
import * as C from '../../core/reset/charts';
import * as P from '../../core/reset/pilot';
import { worldFrame } from '../../core/world';
import { haptic } from '../../lib/haptics';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { flushStorage } from '../../store/storage';
import { space, useTheme } from '../../theme';
import { rise } from '../onboarding/kit';
import { Press } from '../onboarding/Choices';
import { Button, T } from '../ui';
import { WorldBackdrop } from '../World';
import { ceremonyCover, setCeremonyState, useCeremonyState } from './state';

/*
 * The two ceremonies, two chapters of one story on Schwung's own mountain painting: Day 1, the first step at the
 * foot of the trail at first light; and the summit, looking back over all 66 days at sunrise. Each is a full-screen
 * scene above the app (the root layout's <CeremonyHost />), shown once per Life Reset (program.ceremonies), with
 * Skip from the first frame. The app's Habits page is beneath while it plays, so leaving is a crossfade.
 *
 * Motion runs on the UI thread on one ease-out curve: a slow camera rise, mist clearing, light arriving, the trail
 * drawing. With Reduce Motion, everything is simply shown, with short fades. Haptics: one soft touch when the light
 * arrives, a success on the way in.
 */

const sys = ReduceMotion.System;
const SETTLE = Easing.bezier(0.22, 1, 0.36, 1);
const AnimatedPath = Animated.createAnimatedComponent(Path);
type Ease = typeof SETTLE | ReturnType<typeof Easing.out>;
const tl = (v: SharedValue<number>, to: number, delay: number, duration: number, easing: Ease = SETTLE) => {
  v.set(withDelay(delay, withTiming(to, { duration, easing, reduceMotion: sys })));
};

// --- When ---

/** Re-renders on return to the app and every minute, so a new day (Day 66's end) is noticed. */
function useMinuteClock() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 60_000);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && setTick((n) => n + 1));
    return () => {
      clearInterval(t);
      sub.remove();
    };
  }, []);
}

/**
 * Above the navigator (under the onboarding finale): Day 1 when the finale's Begin Day 1 asks for it, or on Day 1
 * itself if it was never seen through (the app closed midway); the summit once it's due (pilot.ts summitDue). Each is
 * marked seen when it's completed or skipped, so a re-render, a restart or a second tap never shows it twice.
 */
export function CeremonyHost() {
  useMinuteClock();
  const shared = useCeremonyState();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const today = program ? pilotToday({ program, devDayOffset: offset }) : 0;
  const seen = program?.ceremonies ?? {};
  const [active, setActive] = useState<'day1' | 'summit' | null>(null);

  const day1 = !!program && !seen.day1 && !shared.finaleUp && (shared.day1FromFinale || today === 1);
  const summit = !!program && !shared.finaleUp && !day1 && P.summitDue(program, today);

  // Day 1 starts at once (adjusting state while rendering, React's pattern for following a condition).
  if (!active && day1) setActive('day1');
  const fromFinale = shared.day1FromFinale;
  useEffect(() => {
    // From the finale the ceremony is already covered by it; on its own it fades in.
    if (active === 'day1' && !fromFinale) ceremonyCover.set(withTiming(1, { duration: 500, reduceMotion: sys }));
    // Only when it starts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
  useEffect(() => {
    if (active || day1) return;
    if (summit) {
      // A moment after the day is completed, so the completion itself lands first.
      const t = setTimeout(() => {
        ceremonyCover.set(withTiming(1, { duration: 700, reduceMotion: sys }));
        setActive('summit');
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [active, day1, summit]);

  const fade = useAnimatedStyle(() => ({ opacity: ceremonyCover.value }));
  if (!active || !program) return null;

  /** Seen through or skipped: saved at once, then the ceremony fades into the app. */
  const finish = (kind: 'day1' | 'summit', fast: boolean) => {
    useResetPilot.getState().markCeremony(kind);
    void flushStorage().catch(() => {});
    haptic.success();
    const done = () => {
      setActive(null);
      setCeremonyState({ day1FromFinale: false });
    };
    ceremonyCover.set(
      withTiming(0, { duration: fast ? 450 : 850, easing: Easing.out(Easing.quad), reduceMotion: sys }, (f) => {
        if (f) scheduleOnRN(done);
      }),
    );
  };

  return (
    <Animated.View style={[StyleSheet.absoluteFill, fade]} accessibilityViewIsModal>
      {active === 'day1' ? (
        <DayOneCeremony onDone={(fast) => finish('day1', fast)} />
      ) : (
        <SummitCeremony
          program={program}
          today={today}
          onSeen={() => useResetPilot.getState().markCeremony('summit')}
          onDone={(fast) => finish('summit', fast)}
        />
      )}
    </Animated.View>
  );
}

// --- The stage both ceremonies share ---

type Stage = {
  /** 1 → 0: the mist over the world. */
  mist: SharedValue<number>;
  /** 0 → 1: the camera's rise. */
  camera: SharedValue<number>;
  /** 0 → 1: the warm light. */
  light: SharedValue<number>;
  /** 0 → 1: how much of the trail (to `trailTo`) is drawn. */
  trail: SharedValue<number>;
};

function useStage(): Stage {
  return {
    mist: useSharedValue(1),
    camera: useSharedValue(0),
    light: useSharedValue(0),
    trail: useSharedValue(0),
  };
}

/**
 * The mountain painting with its real trail, under mist and a slow camera: everything inside the camera moves as
 * one, so the trail stays on the painting. `lights` are points on the trail (by day) that wake as the trail
 * reaches them; `glowAt` is where the warm light gathers.
 */
function MountainStage({
  stage,
  trailTo,
  lights,
  glowDay,
  glowColor,
  camera,
}: {
  stage: Stage;
  trailTo: number;
  lights: { day: number; color: string }[];
  glowDay: number;
  glowColor: string;
  camera: { from: { scale: number; y: number }; to: { scale: number; y: number } };
}) {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const zoneTop = insets.top + Math.max(space.xl, H * 0.06);
  const { zoneHeight } = worldFrame(W, zoneTop);
  const pts = useMemo(
    () => DAY_POINTS.slice(0, trailTo).map((p) => ({ x: p.x * W, y: zoneTop + p.y * zoneHeight })),
    [trailTo, W, zoneTop, zoneHeight],
  );
  const { d, along, length } = useMemo(() => {
    let len = 0;
    const a = [0];
    for (let i = 1; i < pts.length; i++) {
      len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      a.push(len);
    }
    return {
      d: pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' '),
      along: a,
      length: Math.max(1, len),
    };
  }, [pts]);
  const glow = DAY_POINTS[glowDay - 1];
  const gx = glow.x * W;
  const gy = zoneTop + glow.y * zoneHeight;

  const cam = useAnimatedStyle(() => {
    const k = stage.camera.value;
    return {
      transform: [
        { translateY: camera.from.y + (camera.to.y - camera.from.y) * k },
        { scale: camera.from.scale + (camera.to.scale - camera.from.scale) * k },
      ],
    };
  });
  const veil = useAnimatedStyle(() => ({ opacity: 0.12 + stage.mist.value * 0.85 }));
  const fogA = useAnimatedStyle(() => ({
    opacity: 0.2 + stage.mist.value * 0.6,
    transform: [{ translateX: -W * 0.3 + stage.camera.value * 26 }],
  }));
  const fogB = useAnimatedStyle(() => ({
    opacity: 0.15 + stage.mist.value * 0.55,
    transform: [{ translateX: -W * 0.3 - stage.camera.value * 20 }],
  }));
  const dawn = useAnimatedStyle(() => ({ opacity: stage.light.value * (isDark ? 0.5 : 0.4) }));
  const sun = useAnimatedStyle(() => ({
    opacity: stage.light.value,
    transform: [{ scale: 0.8 + stage.light.value * 0.2 }],
  }));
  const path = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - stage.trail.value) }));
  const fog = isDark
    ? (['rgba(17,17,22,0)', 'rgba(17,17,22,0.78)', 'rgba(17,17,22,0)'] as const)
    : (['rgba(247,246,251,0)', 'rgba(247,246,251,0.82)', 'rgba(247,246,251,0)'] as const);

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[StyleSheet.absoluteFill, cam]}>
        <WorldBackdrop zoneTop={zoneTop} />
        {/* First light: a warm band low over the ridges, and the glow where it gathers. */}
        <Animated.View style={[styles.dawn, { top: zoneTop + zoneHeight * 0.05, height: zoneHeight * 0.5 }, dawn]}>
          <LinearGradient
            colors={['rgba(0,0,0,0)', `${glowColor}55`, 'rgba(0,0,0,0)']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View style={[styles.sun, { left: gx - 90, top: gy - 90 }, sun]}>
          <View
            style={[
              styles.ring,
              { width: 180, height: 180, borderRadius: 90, backgroundColor: glowColor, opacity: 0.08 },
            ]}
          />
          <View
            style={[
              styles.ring,
              { width: 110, height: 110, borderRadius: 55, backgroundColor: glowColor, opacity: 0.14 },
            ]}
          />
          <View
            style={[
              styles.ring,
              { width: 48, height: 48, borderRadius: 24, backgroundColor: glowColor, opacity: 0.28 },
            ]}
          />
        </Animated.View>
        <Svg width={W} height={zoneTop + zoneHeight + 40} style={StyleSheet.absoluteFill}>
          <AnimatedPath
            d={d}
            stroke={glowColor}
            strokeOpacity={0.4}
            strokeWidth={6}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={[length, length]}
            animatedProps={path}
          />
          <AnimatedPath
            d={d}
            stroke="#FFFFFF"
            strokeOpacity={0.92}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={[length, length]}
            animatedProps={path}
          />
        </Svg>
        {lights.map((l) => {
          const i = Math.min(l.day, trailTo) - 1;
          return (
            <Light key={l.day} x={pts[i].x} y={pts[i].y} at={along[i] / length} trail={stage.trail} color={l.color} />
          );
        })}
        <Animated.View style={[styles.fog, { top: zoneTop + zoneHeight * 0.5, width: W * 1.6 }, fogA]}>
          <LinearGradient colors={fog} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View style={[styles.fog, { top: zoneTop + zoneHeight * 0.85, width: W * 1.6, height: 130 }, fogB]}>
          <LinearGradient colors={fog} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }, veil]} />
      {/* The ground the words stand on: the page's colour rising from the bottom. */}
      <LinearGradient
        colors={[`${c.bg}00`, `${c.bg}E6`, c.bg]}
        locations={[0, 0.55, 1]}
        style={[styles.ground, { height: H * 0.55 }]}
      />
    </View>
  );
}

function Light({
  x,
  y,
  at,
  trail,
  color,
}: {
  x: number;
  y: number;
  at: number;
  trail: SharedValue<number>;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const on = interpolate(trail.value, [at - 0.02, at + 0.04], [0, 1], 'clamp');
    return { opacity: on, transform: [{ scale: 0.7 + on * 0.3 }] };
  });
  return (
    <Animated.View style={[styles.light, { left: x - 14, top: y - 14 }, style]}>
      <View style={[styles.halo, { backgroundColor: color }]} />
      <View style={[styles.dot, { borderColor: color }]} />
    </Animated.View>
  );
}

function SkipButton({ onPress }: { onPress: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Press
      onPress={onPress}
      style={[styles.skip, { top: insets.top + space.sm }]}
      accessibilityRole="button"
      accessibilityLabel="Skip"
    >
      <View style={[styles.skipPill, { backgroundColor: c.surface }]}>
        <T v="caption" color={c.textDim} style={{ fontWeight: '700' }}>
          Skip
        </T>
      </View>
    </Press>
  );
}

/** The words, at the foot of the screen over the ground. */
function Words({ children, scroll }: { children: ReactNode; scroll?: boolean }) {
  const insets = useSafeAreaInsets();
  const body = <View style={[styles.words, { paddingBottom: insets.bottom + space.lg }]}>{children}</View>;
  return scroll ? (
    <ScrollView
      style={StyleSheet.absoluteFill}
      contentContainerStyle={styles.wordsScroll}
      showsVerticalScrollIndicator={false}
    >
      {body}
    </ScrollView>
  ) : (
    <View style={[StyleSheet.absoluteFill, styles.wordsScroll]} pointerEvents="box-none">
      {body}
    </View>
  );
}

// --- Day 1: the first step ---

function DayOneCeremony({ onDone }: { onDone: (fast: boolean) => void }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const stage = useStage();
  const [ready, setReady] = useState(false);
  const finished = useRef(false);
  const done = (fast: boolean) => {
    if (finished.current) return;
    finished.current = true;
    onDone(fast);
  };
  useEffect(() => {
    if (reduce) {
      tl(stage.mist, 0, 0, 500);
      stage.camera.set(1);
      tl(stage.light, 1, 0, 500);
      stage.trail.set(1);
    } else {
      tl(stage.mist, 0, 150, 2200, Easing.out(Easing.quad));
      tl(stage.camera, 1, 0, 4200, Easing.bezier(0.33, 0, 0.2, 1));
      tl(stage.light, 1, 700, 2000);
      tl(stage.trail, 1, 1300, 1900, Easing.bezier(0.45, 0, 0.2, 1));
    }
    const soft = setTimeout(() => haptic.uncheck(), reduce ? 300 : 1400);
    const t = setTimeout(() => setReady(true), reduce ? 700 : 3100);
    return () => {
      clearTimeout(soft);
      clearTimeout(t);
    };
  }, [reduce, stage.mist, stage.camera, stage.light, stage.trail]);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}>
      <MountainStage
        stage={stage}
        trailTo={9}
        lights={[{ day: 1, color: c.peach }]}
        glowDay={1}
        glowColor={c.peach}
        camera={{ from: { scale: 1.16, y: 46 }, to: { scale: 1.04, y: 0 } }}
      />
      <Words>
        <Animated.View entering={rise(reduce ? 0 : 1500)}>
          <T v="overline" color={c.peachInk} style={{ letterSpacing: 2.4 }}>
            Day 1 of {PROGRAM_DAYS}
          </T>
        </Animated.View>
        <Animated.View entering={rise(reduce ? 100 : 1700)}>
          <T style={[styles.headline, { color: c.text }]} accessibilityRole="header">
            Every ascent begins with a single step.
          </T>
        </Animated.View>
        <Animated.View entering={rise(reduce ? 200 : 2500)}>
          <T style={[styles.sub, { color: c.textDim }]}>Today, you take yours.</T>
        </Animated.View>
        <View style={styles.cta}>
          {ready ? (
            <Animated.View entering={rise(0)}>
              <Button label="Take my first step" onPress={() => done(false)} />
            </Animated.View>
          ) : null}
        </View>
      </Words>
      <SkipButton onPress={() => done(true)} />
    </View>
  );
}

// --- Day 66: the summit ---

function SummitCeremony({
  program,
  today,
  onSeen,
  onDone,
}: {
  program: P.PilotProgram;
  today: number;
  /** The summary is on screen: from here it counts as seen, even if the app closes. */
  onSeen: () => void;
  onDone: (fast: boolean) => void;
}) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const stage = useStage();
  const [phase, setPhase] = useState<'rise' | 'summary'>('rise');
  const finished = useRef(false);
  const done = (fast: boolean) => {
    if (finished.current) return;
    finished.current = true;
    onDone(fast);
  };

  // Everything from the saved days.
  const summary = useMemo(() => {
    const cells = C.dayCells(program, Math.max(today, PROGRAM_DAYS));
    const complete = cells.filter((d) => d.state === 'full').length;
    const stats = P.journeyStats(program, Math.max(today, PROGRAM_DAYS));
    const habits = P.allHabits(program).map((id) => P.nameOf(program, id));
    const earned = Object.keys(LANDMARKS)
      .map(Number)
      .filter((d) => cells[d - 1]?.state === 'full')
      .map((d) => LANDMARKS[d].name);
    const lights = cells.filter((d) => d.state === 'full').map((d) => ({ day: d.day, color: c.sage }));
    return { complete, total: P.totalCompleted(program), best: stats.best, habits, earned, lights };
  }, [program, today, c.sage]);

  useEffect(() => {
    if (reduce) {
      tl(stage.mist, 0, 0, 500);
      stage.camera.set(1);
      stage.trail.set(1);
      tl(stage.light, 1, 0, 500);
    } else {
      tl(stage.mist, 0, 200, 2400, Easing.out(Easing.quad));
      tl(stage.camera, 1, 0, 5200, Easing.bezier(0.33, 0, 0.2, 1));
      tl(stage.trail, 1, 900, 2600, Easing.bezier(0.45, 0, 0.2, 1));
      // Sunrise on the summit, then its warmth breathes, very slowly, while the summary is read.
      stage.light.set(
        withDelay(
          2600,
          withSequence(
            withTiming(1, { duration: 1800, easing: SETTLE, reduceMotion: sys }),
            withRepeat(
              withTiming(0.82, { duration: 3200, easing: Easing.inOut(Easing.sin), reduceMotion: sys }),
              -1,
              true,
            ),
          ),
        ),
      );
    }
    const sunrise = setTimeout(() => haptic.uncheck(), reduce ? 300 : 3000);
    const t = setTimeout(() => setPhase('summary'), reduce ? 600 : 3600);
    return () => {
      clearTimeout(sunrise);
      clearTimeout(t);
    };
  }, [reduce, stage.mist, stage.camera, stage.light, stage.trail]);

  useEffect(() => {
    if (phase === 'summary') onSeen();
  }, [phase, onSeen]);

  const rows: { value: string; label: string; color: string }[] = [
    { value: `${summary.complete}`, label: `of ${PROGRAM_DAYS} days completed`, color: c.sageInk },
    {
      value: `${summary.total}`,
      label: summary.total === 1 ? 'habit completed in all' : 'habits completed in all',
      color: c.mistInk,
    },
    {
      value: `${summary.best}`,
      label: summary.best === 1 ? 'day, your longest streak' : 'days, your longest streak',
      color: c.peachInk,
    },
    {
      value: `${summary.habits.length}`,
      label: `${summary.habits.length === 1 ? 'habit' : 'habits'} practised: ${summary.habits.join(', ')}`,
      color: c.indigoInk,
    },
  ];

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}>
      <MountainStage
        stage={stage}
        trailTo={PROGRAM_DAYS}
        lights={summary.lights}
        glowDay={PROGRAM_DAYS}
        glowColor={c.gold}
        camera={{ from: { scale: 1.12, y: -40 }, to: { scale: 1.0, y: 26 } }}
      />
      <Words scroll={phase === 'summary'}>
        <Animated.View entering={rise(reduce ? 0 : 2900)}>
          <T v="overline" color={c.peachInk} style={{ letterSpacing: 2.4 }}>
            The summit · Day {PROGRAM_DAYS}
          </T>
        </Animated.View>
        <Animated.View entering={rise(reduce ? 100 : 3100)}>
          <T style={[styles.headline, { color: c.text }]} accessibilityRole="header">
            Look how far you’ve come.
          </T>
        </Animated.View>
        {phase === 'summary' ? (
          <>
            <View style={styles.summary}>
              {rows.map((r, i) => (
                <Animated.View
                  key={r.label}
                  entering={rise(reduce ? 0 : 200 + i * 160)}
                  style={styles.row}
                  accessible
                  accessibilityLabel={`${r.value} ${r.label}`}
                >
                  <T style={[styles.rowValue, { color: r.color }]}>{r.value}</T>
                  <T color={c.textDim} style={{ flex: 1 }}>
                    {r.label}
                  </T>
                </Animated.View>
              ))}
              {summary.earned.length ? (
                <Animated.View entering={rise(reduce ? 0 : 200 + rows.length * 160)}>
                  <T v="caption" color={c.peachInk} style={{ fontWeight: '700' }}>
                    Milestone days completed: {summary.earned.join(' · ')}
                  </T>
                </Animated.View>
              ) : null}
            </View>
            <Animated.View entering={rise(reduce ? 0 : 1100)}>
              <T style={[styles.sub, { color: c.textDim }]}>
                Sixty-six days ago you chose to begin. Not every day went to plan, and you kept climbing anyway. These
                habits are yours now.
              </T>
            </Animated.View>
            <Animated.View
              entering={FadeIn.delay(reduce ? 0 : 1500)
                .duration(400)
                .reduceMotion(sys)}
              style={styles.cta}
            >
              <Button label="Return to Schwung" onPress={() => done(false)} />
            </Animated.View>
          </>
        ) : null}
      </Words>
      <SkipButton onPress={() => done(true)} />
    </View>
  );
}

const styles = StyleSheet.create({
  dawn: { position: 'absolute', left: 0, right: 0 },
  sun: { position: 'absolute', width: 180, height: 180, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute' },
  fog: { position: 'absolute', left: 0, height: 150 },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  light: { position: 'absolute', width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 24, height: 24, borderRadius: 12, opacity: 0.32 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FFFFFF', borderWidth: 2.5 },
  skip: { position: 'absolute', right: space.lg },
  skipPill: { minHeight: 36, paddingHorizontal: space.md, borderRadius: 18, justifyContent: 'center', opacity: 0.92 },
  wordsScroll: { flexGrow: 1, justifyContent: 'flex-end' },
  words: { paddingHorizontal: space.xl, gap: space.md },
  headline: { fontSize: 36, lineHeight: 42, fontWeight: '800', letterSpacing: -0.8 },
  sub: { fontSize: 19, lineHeight: 27, fontWeight: '500' },
  cta: { minHeight: 64, justifyContent: 'center', marginTop: space.sm },
  summary: { gap: space.sm, marginTop: space.xs },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  rowValue: { fontSize: 28, lineHeight: 32, fontWeight: '800', minWidth: 52, fontVariant: ['tabular-nums'] },
});
