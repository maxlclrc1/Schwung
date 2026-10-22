import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo } from 'react';
import { GestureResponderEvent, Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import {
  ASCENT_ASPECT,
  ASCENT_PHASES,
  AscentDay,
  describeDay,
  LANDMARKS,
  nearestDay,
  phaseFor,
  trailDots,
} from '../core/ascent';
import { PROGRAM_DAYS } from '../core/dates';
import { haptic } from '../lib/haptics';
import { radius, space, useTheme } from '../theme';
import { T } from './ui';

const ART = {
  dark: require('../../assets/ascent-dark.jpg'),
  light: require('../../assets/ascent-light.jpg'),
};

const DOTS = trailDots(3);

/** Where each phase label sits on the art (normalized), clear of the trail. */
const PHASE_LABEL_AT: Record<1 | 2 | 3, { x: number; y: number }> = {
  1: { x: 0.03, y: 0.755 },
  2: { x: 0.79, y: 0.555 },
  3: { x: 0.03, y: 0.36 },
};

type Props = {
  days: AscentDay[];
  today: number;
  width: number;
  /** A past or future day picked on the trail, or null. */
  selected: number | null;
  onSelect: (day: number | null) => void;
  onOpenJourney: (day?: number) => void;
  /** True once today counts as a successful day: the last trail segment lights up. */
  todayDone: boolean;
};

/*
 * Everything drawn here is a plain view or an icon at its natural size: nothing containing text or
 * icons is ever scaled (iOS stretches a bitmap while scaling, which looks pixelated).
 * All overlays ignore touches; the root Pressable maps a tap to the nearest day marker.
 */
function AscentImpl({ days, today, width, selected, onSelect, onOpenJourney, todayDone }: Props) {
  const { c, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const height = Math.round(width / ASCENT_ASPECT);
  const maintenance = today > PROGRAM_DAYS;
  const done = days.filter((d) => d.status === 'done').length;
  const phase = phaseFor(Math.min(today, PROGRAM_DAYS));

  const tone = useMemo(
    () => ({
      lit: c.accent,
      walked: isDark ? 'rgba(167,139,250,0.38)' : 'rgba(116,81,200,0.32)',
      ahead: isDark ? 'rgba(245,243,255,0.22)' : 'rgba(25,22,33,0.18)',
      halo: isDark ? 'rgba(167,139,250,0.22)' : 'rgba(116,81,200,0.16)',
      pill: isDark ? 'rgba(17,17,22,0.62)' : 'rgba(255,255,255,0.78)',
      badge: isDark ? 'rgba(28,27,37,0.92)' : 'rgba(255,255,255,0.94)',
      scrim: isDark
        ? (['rgba(17,17,22,0.6)', 'rgba(17,17,22,0)'] as const)
        : (['rgba(247,246,251,0.8)', 'rgba(247,246,251,0)'] as const),
    }),
    [c.accent, isDark],
  );

  const status = (day: number) => days[day - 1]?.status;
  const px = (x: number) => x * width;
  const py = (y: number) => y * height;

  const onPress = (e: GestureResponderEvent) => {
    const day = nearestDay(tapPoint(e), width, height, 16);
    if (day === null || day === selected) {
      onSelect(null);
      return;
    }
    haptic.tap();
    onSelect(day === today ? null : day);
  };

  const selectedDay = selected ? days[selected - 1] : null;
  const label = maintenance
    ? `The Schwung Ascent. Summit reached. ${done} of ${PROGRAM_DAYS} days completed.`
    : `The Schwung Ascent. Day ${today} of ${PROGRAM_DAYS}, ${phase.name} phase. ${done} days completed so far.`;

  return (
    <View style={{ width, gap: space.sm }}>
      <View style={[styles.frame, { width, height, backgroundColor: c.surface }]}>
        <Pressable
          onPress={onPress}
          accessible
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint="Opens your journey"
          accessibilityActions={[{ name: 'activate', label: 'Open journey' }]}
          onAccessibilityAction={() => onOpenJourney()}
          style={StyleSheet.absoluteFill}
        >
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {/* Explicit size: some platforms size an Image from its file, not from absoluteFill. */}
            <Image
              source={isDark ? ART.dark : ART.light}
              style={{ position: 'absolute', left: 0, top: 0, width, height }}
              resizeMode="cover"
            />
            <LinearGradient
              colors={tone.scrim}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.45, y: 0.4 }}
              style={StyleSheet.absoluteFill}
            />

            {/* Trail: lit where the day it leads to was a successful day, dimmer where it was missed. */}
            {DOTS.map((d, i) => {
              const s = status(d.between);
              const color =
                s === 'done' || (s === 'today' && todayDone)
                  ? tone.lit
                  : s === 'missed' || s === 'today'
                    ? tone.walked
                    : tone.ahead;
              return (
                <View
                  key={i}
                  style={[styles.dot, { left: px(d.x) - 1.25, top: py(d.y) - 1.25, backgroundColor: color }]}
                />
              );
            })}

            {/* Day markers. */}
            {days.map((d) => {
              if (d.landmark || d.status === 'today') return null;
              const x = px(d.point.x);
              const y = py(d.point.y);
              if (d.status === 'done')
                return (
                  <View key={d.day} style={[styles.abs, { left: x - 6.5, top: y - 6.5 }]}>
                    <View style={[styles.halo, { backgroundColor: tone.halo }]} />
                    <View style={[styles.marker, { backgroundColor: tone.lit, left: 3, top: 3 }]} />
                  </View>
                );
              if (d.status === 'missed')
                return (
                  <View
                    key={d.day}
                    style={[styles.marker, styles.hollow, { left: x - 3.5, top: y - 3.5, borderColor: tone.walked }]}
                  />
                );
              return (
                <View
                  key={d.day}
                  style={[styles.marker, styles.small, { left: x - 2.5, top: y - 2.5, backgroundColor: tone.ahead }]}
                />
              );
            })}

            {/* Today's orb sits under the landmark badges, so on a landmark day (like 66) the badge
                stays visible inside today's rings and the summit still reads as the destination. */}
            {!maintenance ? (
              <TodayOrb
                x={px(days[today - 1].point.x)}
                y={py(days[today - 1].point.y)}
                color={c.accent}
                halo={tone.halo}
                animate={!reduceMotion}
                todayDone={todayDone}
                landmark={days[today - 1].landmark}
              />
            ) : null}

            {/* Landmarks at 7, 21, 44 and the summit. */}
            {days
              .filter((d) => d.landmark)
              .map((d) => {
                const summit = d.day === PROGRAM_DAYS;
                const reached = d.status === 'done' || d.status === 'today';
                const size = summit ? 26 : 20;
                const color = summit ? c.gold : reached ? c.accent : c.textDim;
                return (
                  <View
                    key={d.day}
                    style={[
                      styles.badge,
                      {
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        left: px(d.point.x) - size / 2,
                        top: py(d.point.y) - size / 2,
                        backgroundColor: tone.badge,
                        borderColor: summit ? c.gold : reached ? c.accent : tone.ahead,
                      },
                    ]}
                  >
                    <Ionicons name={LANDMARKS[d.day].icon} size={summit ? 14 : 11} color={color} />
                  </View>
                );
              })}

            {/* Phase names, the current one emphasized. */}
            {ASCENT_PHASES.map((p) => {
              const at = PHASE_LABEL_AT[p.n];
              const current = !maintenance && p.n === phase.n;
              return (
                <View key={p.n} style={[styles.phase, { left: px(at.x), top: py(at.y), backgroundColor: tone.pill }]}>
                  <T
                    v="overline"
                    maxFontSizeMultiplier={1.2}
                    color={current ? c.accentInk : c.textDim}
                    style={styles.phaseText}
                  >
                    {p.name}
                  </T>
                </View>
              );
            })}

            {/* Selected day: an outline ring, clearly different from today's filled orb. */}
            {selectedDay ? (
              <View
                style={[
                  styles.selected,
                  { left: px(selectedDay.point.x) - 10, top: py(selectedDay.point.y) - 10, borderColor: c.text },
                ]}
              />
            ) : null}

            {/* Where you are: kept to the top-left corner, clear of the upper switchbacks. */}
            <View style={[styles.where, { maxWidth: width * 0.4 }]}>
              <T v="overline" maxFontSizeMultiplier={1.15} color={c.accentInk} numberOfLines={1}>
                {maintenance ? 'Summit reached' : `Phase ${phase.n} of 3`}
              </T>
              <View style={styles.dayLine}>
                <T
                  v="heading"
                  maxFontSizeMultiplier={1.15}
                  style={[styles.tabular, styles.dayText, maintenance && styles.dayTextSmall]}
                  numberOfLines={1}
                >
                  {maintenance ? 'Maintenance' : `Day ${today}`}
                </T>
                {!maintenance ? (
                  <T v="caption" maxFontSizeMultiplier={1.15} color={c.textDim} style={styles.tabular}>
                    {' '}
                    / {PROGRAM_DAYS}
                  </T>
                ) : null}
              </View>
            </View>
          </View>
        </Pressable>
      </View>

      {/* Below the art, so it never covers a marker: the selected day (or a hint) and the way into Journey. */}
      <View style={styles.bottomRow}>
        {selectedDay ? (
          <Pressable
            onPress={() => onOpenJourney(selectedDay.day)}
            accessibilityRole="button"
            accessibilityLabel={`${describeDay(selectedDay)}. Open in journey`}
            style={({ pressed }) => [styles.caption, { backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={[styles.captionDot, { borderColor: c.text }]} />
            <T v="caption" maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ flexShrink: 1, fontWeight: '600' }}>
              {describeDay(selectedDay)}
            </T>
            <Ionicons name="chevron-forward" size={14} color={c.textDim} />
          </Pressable>
        ) : (
          <T v="caption" maxFontSizeMultiplier={1.3} color={c.textFaint} numberOfLines={1} style={{ flexShrink: 1 }}>
            {done} of {PROGRAM_DAYS} days climbed · tap a day
          </T>
        )}
        {/* While a day is selected, its caption is the way into Journey, so it gets the whole row. */}
        {selectedDay ? null : (
          <Pressable
            onPress={() => onOpenJourney()}
            accessibilityRole="button"
            accessibilityLabel="Open your journey"
            hitSlop={6}
            style={({ pressed }) => [styles.caption, { backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}
          >
            <Ionicons name="map-outline" size={14} color={c.accentInk} />
            <T v="caption" maxFontSizeMultiplier={1.3} color={c.accentInk} style={{ fontWeight: '700' }}>
              Journey
            </T>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * Tap position inside the art. iOS/Android provide locationX/Y relative to the pressed view (all
 * overlays ignore touches, so that's the art itself); react-native-web passes the DOM event, whose
 * offsetX/Y are the equivalent.
 */
function tapPoint(e: GestureResponderEvent): { x: number; y: number } {
  const ne = e.nativeEvent as GestureResponderEvent['nativeEvent'] & { offsetX?: number; offsetY?: number };
  const x = typeof ne.locationX === 'number' ? ne.locationX : (ne.offsetX ?? -1);
  const y = typeof ne.locationY === 'number' ? ne.locationY : (ne.offsetY ?? -1);
  return { x, y };
}

/** Today's glowing orb. A slow breathing ring (off with Reduce Motion) and a ripple when today counts. */
function TodayOrb({
  x,
  y,
  color,
  halo,
  animate,
  todayDone,
  landmark,
}: {
  x: number;
  y: number;
  color: string;
  halo: string;
  animate: boolean;
  todayDone: boolean;
  /** On a landmark day the badge sits in the middle, so only the rings are drawn. */
  landmark: boolean;
}) {
  const breathe = useSharedValue(0);
  const ripple = useSharedValue(1);

  useEffect(() => {
    if (!animate) {
      breathe.set(0);
      return;
    }
    breathe.set(withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [animate, breathe]);

  useEffect(() => {
    if (!todayDone || !animate) return;
    ripple.set(0);
    ripple.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [todayDone, animate, ripple]);

  // Only plain rings are scaled; the orb itself never is.
  const breatheStyle = useAnimatedStyle(() => ({
    opacity: 0.55 - breathe.value * 0.3,
    transform: [{ scale: 1 + breathe.value * 0.35 }],
  }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: ripple.value >= 1 ? 0 : 0.8 * (1 - ripple.value),
    transform: [{ scale: 1 + ripple.value * 1.6 }],
  }));

  return (
    <View style={[styles.abs, { left: x - 15, top: y - 15, width: 30, height: 30 }]}>
      <Animated.View style={[styles.orbRing, { borderColor: color }, breatheStyle]} />
      <Animated.View style={[styles.orbRing, { borderColor: color }, rippleStyle]} />
      {landmark ? null : <View style={[styles.orbHalo, { backgroundColor: halo }]} />}
      {landmark ? null : <View style={[styles.orb, { backgroundColor: color }]} />}
    </View>
  );
}

export const Ascent = memo(AscentImpl);

const styles = StyleSheet.create({
  frame: { borderRadius: radius.lg, overflow: 'hidden' },
  abs: { position: 'absolute' },
  dot: { position: 'absolute', width: 2.5, height: 2.5, borderRadius: 1.25 },
  marker: { position: 'absolute', width: 7, height: 7, borderRadius: 3.5 },
  small: { width: 5, height: 5, borderRadius: 2.5 },
  hollow: { borderWidth: 1.5, backgroundColor: 'transparent' },
  halo: { position: 'absolute', width: 13, height: 13, borderRadius: 6.5 },
  badge: { position: 'absolute', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  phase: { position: 'absolute', paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.pill },
  phaseText: { fontSize: 9, lineHeight: 12, letterSpacing: 1 },
  selected: { position: 'absolute', width: 20, height: 20, borderRadius: 10, borderWidth: 2 },
  orbRing: { position: 'absolute', width: 30, height: 30, borderRadius: 15, borderWidth: 1.5 },
  orbHalo: { position: 'absolute', left: 4, top: 4, width: 22, height: 22, borderRadius: 11 },
  orb: { position: 'absolute', left: 8, top: 8, width: 14, height: 14, borderRadius: 7 },
  where: { position: 'absolute', left: space.lg, top: space.md, gap: 0 },
  dayLine: { flexDirection: 'row', alignItems: 'baseline' },
  dayText: { fontSize: 22, lineHeight: 26, fontWeight: '800' },
  dayTextSmall: { fontSize: 18, lineHeight: 24 },
  tabular: { fontVariant: ['tabular-nums'] },
  captionDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1.5 },
  bottomRow: {
    minHeight: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: space.sm,
  },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    flexShrink: 1,
  },
});
