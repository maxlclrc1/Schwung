import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedScrollHandler,
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
import { milestoneLine, summitWords } from '../../core/reset/moments';
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
import { formatList, formatNumber, t as tr, type TKey } from '../../i18n';
import { useLanguage, useT } from '../../i18n/react';
import { physical } from '../../i18n/direction';
import { pushOnce } from '../../lib/navigation';

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
  // A program started under 18 isn't used (pilot.ts ageRestricted): no ceremonies over its notice.
  const program = useResetPilot((s) => (s.program && !P.ageRestricted(s.program) ? s.program : null));
  const offset = useResetPilot((s) => s.devDayOffset);
  const today = program ? pilotToday({ program, devDayOffset: offset }) : 0;
  const seen = program?.ceremonies ?? {};
  const [active, setActive] = useState<'day1' | 'summit' | 'milestone' | null>(null);
  const [milestoneDay, setMilestoneDay] = useState<number | null>(null);

  const day1 = !!program && !seen.day1 && !shared.finaleUp && (shared.day1FromFinale || today === 1);
  const summit = !!program && !shared.finaleUp && !day1 && P.summitDue(program, today);
  // A milestone never interrupts the finale, a ceremony or the welcome back (it waits until they're done).
  const milestone =
    program && !shared.finaleUp && !day1 && !summit && !shared.welcomeUp ? P.milestoneDue(program, today) : null;

  // Day 1 starts at once (adjusting state while rendering, React's pattern for following a condition).
  if (!active && day1) setActive('day1');
  // Others (the welcome back) wait while a ceremony is up.
  useEffect(() => setCeremonyState({ ceremonyUp: !!active }), [active]);
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
    if (milestone) {
      const t = setTimeout(() => {
        ceremonyCover.set(withTiming(1, { duration: 600, reduceMotion: sys }));
        setMilestoneDay(milestone);
        setActive('milestone');
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [active, day1, summit, milestone]);

  const fade = useAnimatedStyle(() => ({ opacity: ceremonyCover.value }));
  if (!active || !program) return null;

  /** Seen through or skipped: saved at once, then the ceremony fades into the app. */
  const finish = (kind: 'day1' | 'summit' | 'milestone', fast: boolean, then?: () => void) => {
    if (kind === 'milestone') useResetPilot.getState().markMilestone(milestoneDay ?? 0);
    else useResetPilot.getState().markCeremony(kind);
    void flushStorage().catch(() => {});
    const done = () => {
      setActive(null);
      setCeremonyState({ day1FromFinale: false });
      then?.();
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
      ) : active === 'milestone' && milestoneDay ? (
        <MilestoneMoment
          program={program}
          today={today}
          day={milestoneDay}
          onDone={(fast) => finish('milestone', fast)}
        />
      ) : (
        <SummitCeremony
          program={program}
          today={today}
          onSeen={() => useResetPilot.getState().markCeremony('summit')}
          // Then the 66-Day Story if chosen, and "What's next?" after it (or straight away), never over either.
          onDone={(fast, story) =>
            finish('summit', fast, () => pushOnce(story ? '/life-reset/story?from=summit' : '/life-reset/next'))
          }
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
  ahead,
}: {
  stage: Stage;
  trailTo: number;
  /** A faint dotted way on from the end of the trail to this day (the approach to the summit). */
  ahead?: number;
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
  // The way ahead shows once the trail has arrived.
  const aheadProps = useAnimatedProps(() => ({
    strokeOpacity: interpolate(stage.trail.value, [0.9, 1], [0, 0.55], 'clamp'),
  }));
  const fog = isDark
    ? (['rgba(17,17,22,0)', 'rgba(17,17,22,0.78)', 'rgba(17,17,22,0)'] as const)
    : (['rgba(247,246,251,0)', 'rgba(247,246,251,0.82)', 'rgba(247,246,251,0)'] as const);

  return (
    // Clipped to the screen: the drifting fog bands are wider than it (and the camera scales the stage up), which
    // otherwise made the whole page scroll sideways on web.
    <View
      style={[StyleSheet.absoluteFill, physical, styles.clip]}
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
          {ahead ? (
            <AnimatedPath
              d={DAY_POINTS.slice(trailTo - 1, ahead)
                .map((p, i) => `${i ? 'L' : 'M'}${(p.x * W).toFixed(1)} ${(zoneTop + p.y * zoneHeight).toFixed(1)}`)
                .join(' ')}
              stroke="#FFFFFF"
              strokeWidth={2}
              strokeLinecap="round"
              strokeDasharray="1 7"
              fill="none"
              animatedProps={aheadProps}
            />
          ) : null}
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
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <Press
      onPress={onPress}
      style={[styles.skip, { top: insets.top + space.sm }]}
      accessibilityRole="button"
      accessibilityLabel={t('ceremony.skip')}
    >
      <View style={[styles.skipPill, { backgroundColor: c.surface }]}>
        <T v="caption" color={c.textDim} style={{ fontWeight: '700' }}>
          {t('ceremony.skip')}
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
  const t = useT();
  // A New Ascent's Day 1 says which ascent it is.
  const ascent = useResetPilot((s) => (s.program ? P.ascentOf(s.program) : 1));
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
    const soft = setTimeout(() => haptic.land(), reduce ? 300 : 1400);
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
            {ascent > 1
              ? t('ceremony.day1.kickerAscent', { ascent, total: PROGRAM_DAYS })
              : t('ceremony.day1.kicker', { total: PROGRAM_DAYS })}
          </T>
        </Animated.View>
        <Animated.View entering={rise(reduce ? 100 : 1700)}>
          <T style={[styles.headline, { color: c.text }]} accessibilityRole="header">
            {t('ceremony.day1.headline')}
          </T>
        </Animated.View>
        <Animated.View entering={rise(reduce ? 200 : 2500)}>
          <T style={[styles.sub, { color: c.textDim }]}>{t('ceremony.day1.sub')}</T>
        </Animated.View>
        <View style={styles.cta}>
          {ready ? (
            <Animated.View entering={rise(0)}>
              <Button label={t('ceremony.day1.begin')} onPress={() => done(false)} />
            </Animated.View>
          ) : null}
        </View>
      </Words>
      <SkipButton onPress={() => done(true)} />
    </View>
  );
}

// --- Days 7, 21 and 44: milestone moments ---

/**
 * Three chapters of the same climb, each picking up where the last left off: the trail is already lit to the previous
 * milestone, the new stretch draws on to this one, the camera starts a little higher each time, and the light at
 * the end is the chapter's own: a sage foothold, a peach base camp, then the way to the summit opening ahead.
 */
type Chapter = {
  from: number;
  overline: string;
  title: string;
  tint: 'sage' | 'peach' | 'indigo';
  cameraY: number;
};
/** A milestone's chapter; its words are read in the current language each time they're shown. */
const milestone = (day: 7 | 21 | 44, from: number, tint: Chapter['tint'], cameraY: number): Chapter => ({
  from,
  tint,
  cameraY,
  get overline() {
    return tr(`ceremony.milestone.${day}.overline`);
  },
  get title() {
    return tr(`ceremony.milestone.${day}.title`);
  },
});
const CHAPTERS: Record<number, Chapter> = {
  7: milestone(7, 1, 'sage', 40),
  21: milestone(21, 7, 'peach', 20),
  44: milestone(44, 21, 'indigo', 0),
};

function MilestoneMoment({
  program,
  today,
  day,
  onDone,
}: {
  program: P.PilotProgram;
  today: number;
  day: number;
  onDone: (fast: boolean) => void;
}) {
  const { c } = useTheme();
  const t = useT();
  const reduce = useReducedMotion();
  const stage = useStage();
  const ch = CHAPTERS[day] ?? CHAPTERS[7];
  // Its line says only what happened: the calendar for everyone, activity only where it was recorded (moments.ts).
  const said = milestoneLine(program, day, today);
  const line = t(`ceremony.milestone.${day}.${said.key}` as TKey, { count: said.count });
  const tint = ch.tint === 'sage' ? c.sage : ch.tint === 'peach' ? c.peach : c.indigo;
  const ink = ch.tint === 'sage' ? c.sageInk : ch.tint === 'peach' ? c.peachInk : c.indigoInk;
  // Where the trail already stood before this chapter (days are evenly spaced along it).
  const lit = (ch.from - 1) / (day - 1);
  const finished = useRef(false);
  const [ready, setReady] = useState(false);
  const done = (fast: boolean) => {
    if (finished.current) return;
    finished.current = true;
    onDone(fast);
  };
  useEffect(() => {
    stage.trail.set(reduce ? 1 : lit);
    if (reduce) {
      tl(stage.mist, 0, 0, 400);
      stage.camera.set(1);
      tl(stage.light, 1, 0, 400);
    } else {
      tl(stage.mist, 0, 0, 1100, Easing.out(Easing.quad));
      tl(stage.camera, 1, 0, 2600, Easing.bezier(0.33, 0, 0.2, 1));
      tl(stage.trail, 1, 250, 1100, Easing.bezier(0.45, 0, 0.2, 1));
      tl(stage.light, 1, 1000, 900);
    }
    const land = setTimeout(() => haptic.success(), reduce ? 200 : 1250);
    const t = setTimeout(() => setReady(true), reduce ? 400 : 1500);
    return () => {
      clearTimeout(land);
      clearTimeout(t);
    };
  }, [reduce, lit, stage.mist, stage.camera, stage.light, stage.trail]);

  const earlier = [7, 21, 44].filter((m) => m < day);
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}>
      <MountainStage
        stage={stage}
        trailTo={day}
        ahead={day === 44 ? PROGRAM_DAYS : undefined}
        lights={[...earlier.map((m) => ({ day: m, color: m === 7 ? c.sage : c.peach })), { day, color: tint }]}
        glowDay={day}
        glowColor={tint}
        camera={{ from: { scale: 1.1, y: ch.cameraY + 30 }, to: { scale: 1.02, y: ch.cameraY } }}
      />
      <Words>
        <Animated.View entering={rise(reduce ? 0 : 600)}>
          <T v="overline" color={ink} style={{ letterSpacing: 2 }}>
            {ch.overline}
          </T>
        </Animated.View>
        <Animated.View entering={rise(reduce ? 50 : 750)}>
          <T style={[styles.headline, { color: c.text }]} accessibilityRole="header">
            {ch.title}
          </T>
        </Animated.View>
        <Animated.View entering={rise(reduce ? 100 : 1100)}>
          <T style={[styles.sub, { color: c.textDim }]}>{line}</T>
        </Animated.View>
        <View style={styles.cta}>
          {ready ? (
            <Animated.View entering={rise(0)}>
              <Button label={t('ceremony.milestone.continue')} onPress={() => done(false)} />
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
  /** `story`: on to the 66-Day Story as the ceremony fades. */
  onDone: (fast: boolean, story?: boolean) => void;
}) {
  const { c } = useTheme();
  const t = useT();
  const reduce = useReducedMotion();
  const stage = useStage();
  const insets = useSafeAreaInsets();
  const { height, fontScale } = useWindowDimensions();
  const [phase, setPhase] = useState<'rise' | 'summary'>('rise');
  const finished = useRef(false);
  const done = (fast: boolean, story?: boolean) => {
    if (finished.current) return;
    finished.current = true;
    onDone(fast, story);
  };

  // Everything from the saved days (the landmarks' names follow the language).
  const lang = useLanguage();
  const summary = useMemo(() => {
    void lang; // the landmarks' names are words: read again when the language changes
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
  }, [program, today, c.sage, lang]);
  // The summit is everyone's; its headline and message only claim the climb when most days had activity (moments.ts).
  const words = useMemo(() => summitWords(program), [program]);

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
    const sunrise = setTimeout(() => haptic.success(), reduce ? 300 : 3000);
    const t = setTimeout(() => setPhase('summary'), reduce ? 600 : 3600);
    return () => {
      clearTimeout(sunrise);
      clearTimeout(t);
    };
  }, [reduce, stage.mist, stage.camera, stage.light, stage.trail]);

  useEffect(() => {
    if (phase === 'summary') onSeen();
  }, [phase, onSeen]);

  const rows: { value: string; label: string }[] = [
    { value: formatNumber(summary.complete), label: t('ceremony.summit.daysCompleted', { total: PROGRAM_DAYS }) },
    { value: formatNumber(summary.total), label: t('ceremony.summit.completed', { count: summary.total }) },
    { value: formatNumber(summary.best), label: t('ceremony.summit.streak', { count: summary.best }) },
    {
      value: formatNumber(summary.habits.length),
      label: t('ceremony.summit.practised', { count: summary.habits.length, list: formatList(summary.habits) }),
    },
  ];

  // The words begin below the trail's lowest point, in the mist; the painting scrolls with them (one page).
  const start = Math.round(height * SUMMIT_WORDS_AT);
  // A short screen lets the actions follow the words; otherwise they stay at the bottom, always in reach.
  const pinned = height >= 700;
  // Larger text: one figure a row.
  const stacked = fontScale > 1.2;
  const [footHeight, setFootHeight] = useState(126 + insets.bottom);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });
  const follow = useAnimatedStyle(() => ({ transform: [{ translateY: -Math.max(0, scrollY.value) }] }));

  const appear = FadeIn.delay(reduce ? 0 : 1500)
    .duration(400)
    .reduceMotion(sys);
  const actions = (
    <View style={styles.summitActions}>
      <Button label={t('ceremony.summit.journey')} onPress={() => done(false, true)} />
      <Button label={t('ceremony.summit.return')} kind="ghost" onPress={() => done(false)} />
    </View>
  );
  const stat = (r: { value: string; label: string }, i: number, own?: boolean) => (
    <Animated.View
      key={r.label}
      entering={rise(reduce ? 0 : 200 + i * 160)}
      style={[
        own || stacked ? styles.statRow : styles.statCell,
        !own && !stacked && i > 0 && { borderStartWidth: StyleSheet.hairlineWidth, borderColor: c.border },
        !own && !stacked && i === 0 && styles.statFirst,
        (own || stacked) && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
      ]}
      accessible
      accessibilityLabel={t('ceremony.summit.rowA11y', { value: r.value, label: r.label })}
    >
      <T style={[styles.statValue, (own || stacked) && { minWidth: stacked ? 66 : 28 }, { color: c.text }]}>
        {r.value}
      </T>
      <T color={c.textDim} style={own || stacked ? styles.statLabelRow : styles.statLabel}>
        {r.label}
      </T>
    </Animated.View>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}>
      <Animated.View style={[StyleSheet.absoluteFill, follow]}>
        <MountainStage
          stage={stage}
          trailTo={PROGRAM_DAYS}
          lights={summary.lights}
          glowDay={PROGRAM_DAYS}
          glowColor={c.gold}
          camera={{ from: { scale: 1.12, y: -40 }, to: { scale: 1.0, y: 26 } }}
        />
      </Animated.View>
      <Animated.ScrollView
        style={StyleSheet.absoluteFill}
        contentContainerStyle={{
          paddingTop: start,
          paddingBottom: pinned ? footHeight + 28 : insets.bottom + space.lg,
        }}
        scrollEnabled={phase === 'summary'}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* The page's own colour rising out of the mist behind the words: no card, the painting stays above. */}
        <View style={[styles.paper, { top: start - 64 }]} pointerEvents="none">
          <LinearGradient
            colors={[`${c.bg}00`, `${c.bg}CC`, `${c.bg}ED`, c.bg]}
            locations={[0, 0.37, 0.67, 1]}
            style={styles.paperFade}
          />
          <View style={[styles.paperRest, { backgroundColor: c.bg }]} />
        </View>
        <View style={styles.summitWords}>
          <Animated.View entering={rise(reduce ? 0 : 2900)}>
            <T v="overline" color={c.peachInk} style={{ letterSpacing: 2.4 }}>
              {t('ceremony.summit.kicker', { total: PROGRAM_DAYS })}
            </T>
          </Animated.View>
          <Animated.View entering={rise(reduce ? 100 : 3100)}>
            <T style={[styles.summitHeadline, { color: c.text }]} accessibilityRole="header">
              {t(`ceremony.summit.${words.headline}`)}
            </T>
          </Animated.View>
          {phase === 'summary' ? (
            <>
              {/* The record: three figures side by side between hairlines, then the habits practised. */}
              <View style={[styles.record, { borderColor: c.border }]}>
                <View
                  style={[
                    stacked ? null : styles.three,
                    !stacked && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
                  ]}
                >
                  {rows.slice(0, 3).map((r, i) => stat(r, i))}
                </View>
                {stat(rows[3], 3, true)}
              </View>
              {summary.earned.length ? (
                <Animated.View entering={rise(reduce ? 0 : 200 + rows.length * 160)}>
                  <T color={c.peachInk} style={styles.milestones}>
                    {t('ceremony.summit.milestones', { list: summary.earned.join(' · ') })}
                  </T>
                </Animated.View>
              ) : null}
              <Animated.View entering={rise(reduce ? 0 : 1100)}>
                <T style={[styles.summitMessage, { color: c.text }]}>{t(`ceremony.summit.${words.message}`)}</T>
              </Animated.View>
              {pinned ? null : <Animated.View entering={appear}>{actions}</Animated.View>}
            </>
          ) : null}
        </View>
      </Animated.ScrollView>
      {phase === 'summary' && pinned ? (
        <Animated.View
          entering={appear}
          style={[styles.summitFoot, { paddingBottom: insets.bottom + space.md, backgroundColor: c.bg }]}
          onLayout={(e) => setFootHeight(Math.round(e.nativeEvent.layout.height))}
        >
          <LinearGradient colors={[`${c.bg}00`, c.bg]} style={styles.summitFootFade} pointerEvents="none" />
          {actions}
        </Animated.View>
      ) : null}
      <SkipButton onPress={() => done(true)} />
    </View>
  );
}

/** Where the summit's words begin, as a share of the screen's height: just below the lit trail's lowest point. */
const SUMMIT_WORDS_AT = 0.383;

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
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
  // The summit's page: the record and its words (SummitCeremony).
  paper: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  paperFade: { height: 300 },
  paperRest: { flex: 1 },
  summitWords: { paddingHorizontal: space.xl },
  summitHeadline: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8, marginTop: 6 },
  record: { marginTop: 18, borderTopWidth: StyleSheet.hairlineWidth },
  three: { flexDirection: 'row' },
  statCell: { flex: 1, minWidth: 0, paddingVertical: 12, paddingHorizontal: 10 },
  statFirst: { paddingStart: 0 },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: 14, paddingVertical: 12 },
  statValue: { fontSize: 34, lineHeight: 40, fontWeight: '300', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 13.5, lineHeight: 18, marginTop: 2 },
  statLabelRow: { flex: 1, fontSize: 15, lineHeight: 21 },
  milestones: { marginTop: space.md, fontSize: 13.5, lineHeight: 19, fontWeight: '600' },
  summitMessage: { marginTop: space.lg, fontSize: 18, lineHeight: 26, fontWeight: '500' },
  summitActions: { gap: space.xs, marginTop: space.lg },
  summitFoot: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingTop: 6 },
  summitFootFade: { position: 'absolute', left: 0, right: 0, top: -22, height: 22 },
});
