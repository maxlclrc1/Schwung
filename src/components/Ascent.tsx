import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useMemo } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ASCENT_ASPECT, ASCENT_PHASES, AscentDay, describeDay, LANDMARKS, phaseFor, trailDots } from '../core/ascent';
import { PROGRAM_DAYS } from '../core/dates';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { T } from './ui';

const DOTS = trailDots(3);

/** Where each phase label sits on the art (normalized), clear of the trail. */
const PHASE_LABEL_AT: Record<1 | 2 | 3, { x: number; y: number }> = {
  1: { x: 0.03, y: 0.755 },
  2: { x: 0.79, y: 0.555 },
  3: { x: 0.03, y: 0.36 },
};

type SceneProps = {
  days: AscentDay[];
  today: number;
  /** Full screen width: the painting behind (WorldBackdrop) spans it at 3:2. */
  width: number;
  /** A past or future day picked on the trail, or null. */
  selected: number | null;
  /** True once today counts as a successful day: the last trail segment lights up. */
  todayDone: boolean;
};

/*
 * Everything drawn on the mountain: the trail, day markers, today's orb, landmarks, phase names and the
 * current day. The painting itself is the WorldBackdrop behind, placed so its 3:2 painting matches this
 * view exactly. Every element is a plain view or an icon at its natural size: nothing containing text or
 * icons is ever scaled (iOS stretches a bitmap while scaling, which looks pixelated). Ignores touches;
 * the screen maps taps to days with `nearestDay`.
 */
function AscentSceneImpl({ days, today, width, selected, todayDone }: SceneProps) {
  const { c, isDark } = useTheme();
  const reduceMotion = useReducedMotion();
  const height = Math.round(width / ASCENT_ASPECT);
  const maintenance = today > PROGRAM_DAYS;

  const tone = useMemo(
    () => ({
      // Climbed in sage (complete days), today in indigo, milestones in peach.
      lit: c.sage,
      walked: isDark ? 'rgba(143,176,140,0.4)' : 'rgba(85,122,88,0.34)',
      ahead: isDark ? 'rgba(245,243,255,0.22)' : 'rgba(25,22,33,0.18)',
      halo: isDark ? 'rgba(143,176,140,0.24)' : 'rgba(85,122,88,0.18)',
      today: isDark ? 'rgba(127,125,208,0.32)' : 'rgba(79,77,154,0.22)',
      badge: isDark ? 'rgba(28,27,37,0.92)' : 'rgba(255,255,255,0.94)',
    }),
    [c.sage, isDark],
  );

  const status = (day: number) => days[day - 1]?.status;
  const px = (x: number) => x * width;
  const py = (y: number) => y * height;
  const selectedDay = selected ? days[selected - 1] : null;

  return (
    <View pointerEvents="none" style={{ width, height }}>
      {/* No darkening gradient: the painting's top-left sky is calm enough for the day text in both themes. */}
      {/* Trail: lit where the day it leads to was a successful day, dimmer where it was missed. */}
      {DOTS.map((d, i) => {
        const s = status(d.between);
        const color =
          s === 'done' || (s === 'today' && todayDone)
            ? tone.lit
            : s === 'missed' || s === 'rest' || s === 'today'
              ? tone.walked
              : tone.ahead;
        return (
          <View key={i} style={[styles.dot, { left: px(d.x) - 1.25, top: py(d.y) - 1.25, backgroundColor: color }]} />
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
        // Every day not completed is an empty circle (ahead, or walked past on a rest day); only a completed day
        // fills in.
        return (
          <View
            key={d.day}
            style={[
              styles.marker,
              styles.hollow,
              d.status === 'rest' && styles.small,
              d.status === 'rest'
                ? { left: x - 2.5, top: y - 2.5, borderColor: tone.walked }
                : { left: x - 3.5, top: y - 3.5, borderColor: tone.ahead },
            ]}
          />
        );
      })}

      {/* Today's orb sits under the landmark badges, so on a landmark day (like 66) the badge
                stays visible inside today's rings and the summit still reads as the destination. */}
      {!maintenance ? (
        <TodayOrb
          x={px(days[today - 1].point.x)}
          y={py(days[today - 1].point.y)}
          color={c.indigo}
          halo={tone.today}
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
          const color = summit ? c.gold : reached ? c.peach : c.textDim;
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
                  borderColor: summit ? c.gold : reached ? c.peach : tone.ahead,
                },
              ]}
            >
              <Ionicons name={LANDMARKS[d.day].icon} size={summit ? 14 : 11} color={color} />
            </View>
          );
        })}

      {/* Selected day: an outline ring, clearly different from today's filled orb. */}
      {selectedDay ? (
        <ThemedView
          style={[
            styles.selected,
            { left: px(selectedDay.point.x) - 10, top: py(selectedDay.point.y) - 10, borderColor: c.text },
          ]}
        />
      ) : null}
    </View>
  );
}

export const AscentScene = memo(AscentSceneImpl);

/**
 * The words on the mountain: phase names and "Phase n of 3 / Day n". They're part of the page, not the
 * world, so on Today they scroll with the other text instead of staying on the still mountain (where the
 * page's text would slide over them). Placed in the same 3:2 box as the scene, so at the top of the page
 * they sit exactly where they always have. Ignores touches, so taps go through to the trail.
 */
function AscentLabelsImpl({ today, width }: { today: number; width: number }) {
  const { c, isDark } = useTheme();
  const height = Math.round(width / ASCENT_ASPECT);
  const maintenance = today > PROGRAM_DAYS;
  const phase = phaseFor(Math.min(today, PROGRAM_DAYS));
  const pill = isDark ? 'rgba(17,17,22,0.62)' : 'rgba(255,255,255,0.78)';
  const px = (x: number) => x * width;
  const py = (y: number) => y * height;

  return (
    <View pointerEvents="none" style={{ width, height }}>
      {/* Phase names, the current one emphasized. */}
      {ASCENT_PHASES.map((p) => {
        const at = PHASE_LABEL_AT[p.n];
        const current = !maintenance && p.n === phase.n;
        // Each stage keeps its own colour (Foundation sage, Momentum misty blue, Mastery indigo), as in the
        // expedition calendar below; the current one is filled.
        const tint = p.n === 1 ? c.sage : p.n === 2 ? c.mist : c.indigo;
        const ink = p.n === 1 ? c.sageInk : p.n === 2 ? c.mistInk : c.indigoInk;
        return (
          <View
            key={p.n}
            style={[
              styles.phase,
              styles.phaseRow,
              { left: px(at.x), top: py(at.y), backgroundColor: current ? tint : pill },
            ]}
          >
            {current ? null : <View style={[styles.phaseDot, { backgroundColor: tint }]} />}
            <T v="overline" maxFontSizeMultiplier={1.2} color={current ? c.onTint : ink} style={styles.phaseText}>
              {p.name}
            </T>
          </View>
        );
      })}

      {/* Where you are: kept to the top-left corner, clear of the upper switchbacks. */}
      <View style={[styles.where, { maxWidth: width * 0.4 }]}>
        <T v="overline" maxFontSizeMultiplier={1.15} color={c.indigoInk} numberOfLines={1}>
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
  );
}

export const AscentLabels = memo(AscentLabelsImpl);

/** What VoiceOver reads for the trail (the screen's tap target over it). */
export function ascentLabel(days: AscentDay[], today: number): string {
  const done = days.filter((d) => d.status === 'done').length;
  if (today > PROGRAM_DAYS) return `The Schwung Ascent. Summit reached. ${done} of ${PROGRAM_DAYS} days completed.`;
  return `The Schwung Ascent. Day ${today} of ${PROGRAM_DAYS}, ${phaseFor(today).name} phase. ${done} days completed so far.`;
}

/** Below the mountain, so it never covers a marker: the selected day (or a hint) and the way into Journey. */
export function AscentCaption({
  days,
  selected,
  onOpenJourney,
}: {
  days: AscentDay[];
  selected: number | null;
  onOpenJourney: (day?: number) => void;
}) {
  const { c } = useTheme();
  const done = days.filter((d) => d.status === 'done').length;
  const selectedDay = selected ? days[selected - 1] : null;
  return (
    <View style={styles.bottomRow}>
      {selectedDay ? (
        <Pressable
          onPress={() => onOpenJourney(selectedDay.day)}
          accessibilityRole="button"
          accessibilityLabel={`${describeDay(selectedDay)}. Open in journey`}
          style={({ pressed }) => ({ flexShrink: 1, opacity: pressed ? 0.7 : 1 })}
        >
          <ThemedView style={[styles.caption, { backgroundColor: c.surface }]}>
            <ThemedView style={[styles.captionDot, { borderColor: c.text }]} />
            <T v="caption" maxFontSizeMultiplier={1.3} numberOfLines={1} style={{ flexShrink: 1, fontWeight: '600' }}>
              {describeDay(selectedDay)}
            </T>
            <Ionicons name="chevron-forward" size={14} color={c.textDim} />
          </ThemedView>
        </Pressable>
      ) : (
        <T v="caption" maxFontSizeMultiplier={1.3} color={c.textDim} numberOfLines={1} style={{ flexShrink: 1 }}>
          {done} of {PROGRAM_DAYS} days climbed · tap a day
        </T>
      )}
      {/* While a day is selected, its caption is the way into Journey, so it gets the whole row. */}
      {selectedDay ? null : (
        <Pressable
          onPress={() => onOpenJourney()}
          accessibilityRole="button"
          accessibilityLabel="Open your journey"
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        >
          <ThemedView style={[styles.caption, { backgroundColor: c.surface }]}>
            <Ionicons name="map-outline" size={14} color={c.accentInk} />
            <T v="caption" maxFontSizeMultiplier={1.3} color={c.accentInk} style={{ fontWeight: '700' }}>
              Journey
            </T>
          </ThemedView>
        </Pressable>
      )}
    </View>
  );
}

/**
 * Tap position inside the pressed view. iOS/Android provide locationX/Y relative to the pressed view (all
 * overlays ignore touches, so that's the art itself); react-native-web passes the DOM event, whose
 * offsetX/Y are the equivalent.
 */
export function tapPoint(e: GestureResponderEvent): { x: number; y: number } {
  const ne = e.nativeEvent as GestureResponderEvent['nativeEvent'] & { offsetX?: number; offsetY?: number };
  const x = typeof ne.locationX === 'number' ? ne.locationX : (ne.offsetX ?? -1);
  const y = typeof ne.locationY === 'number' ? ne.locationY : (ne.offsetY ?? -1);
  return { x, y };
}

/** Today's glowing orb. A slow breathing ring (off with Reduce Motion) and a ripple when today counts. */
export function TodayOrb({
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

const styles = StyleSheet.create({
  phaseRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  phaseDot: { width: 6, height: 6, borderRadius: 3 },
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
