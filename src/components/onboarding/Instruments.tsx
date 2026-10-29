import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  interpolateColor,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { haptic } from '../../lib/haptics';
import { radius, space, useTheme } from '../../theme';
import { T } from '../ui';
import { Press } from './Choices';
import { rise, settle, useDrawingDrag, useTints, type Tint } from './kit';
import { StepRound } from './Tape';

/*
 * Illustrated answers: a phone that fills with the hours it takes, a trail up a mountain, and a dial for the time a
 * day. They share one hand: soft painted shapes in the five tints, a single ease-out curve (never a spring), a tick
 * per step, drags that belong to the drawing until the finger lifts, and one adjustable control for screen readers.
 */

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const sys = ReduceMotion.System;

/** Adjustable for screen readers: the value, and one stop up or down. */
function adjustable(label: string, value: string, step: (d: 1 | -1) => void) {
  return {
    accessible: true,
    accessibilityRole: 'adjustable' as const,
    accessibilityLabel: label,
    accessibilityValue: { text: value },
    accessibilityActions: [{ name: 'increment' }, { name: 'decrement' }],
    onAccessibilityAction: (e: { nativeEvent: { actionName: string } }) =>
      step(e.nativeEvent.actionName === 'increment' ? 1 : -1),
  };
}

/** Stop changes: ticks, and reports only a real change. */
function useStops(count: number, index: number | null, onChange: (i: number) => void) {
  const set = (i: number) => {
    const n = clamp(i, 0, count - 1);
    if (n === index) return;
    haptic.tap();
    onChange(n);
  };
  const step = (d: 1 | -1) => set(index === null ? 0 : index + d);
  return { set, step };
}

/** A value shown large, rising softly into place whenever it changes. */
function Readout({ text, faint, size = 44 }: { text: string; faint?: boolean; size?: number }) {
  const { c } = useTheme();
  return (
    <Animated.View key={text} entering={rise(0)}>
      <T
        v="display"
        color={faint ? c.textFaint : c.text}
        style={{ fontSize: size, lineHeight: size + 4, textAlign: 'center' }}
      >
        {text}
      </T>
    </Animated.View>
  );
}

// --- The phone ---

const PHONE_W = 150;
const PHONE_H = 290;
const BEZEL = 7;
const SCREEN_H = PHONE_H - BEZEL * 2;
const SCREEN_W = PHONE_W - BEZEL * 2;

/**
 * A phone whose screen fills from the bottom with the time it takes, under a soft wave; its apps collect
 * notification dots as the hours grow. Drag up or down on it, tap it, or tap a mark on the scale beside it.
 */
export function PhoneMeter({
  stops,
  index,
  onChange,
  label,
  app,
}: {
  /** Lowest first. */
  stops: string[];
  index: number | null;
  onChange: (i: number) => void;
  label: string;
  /** One app's time: that app sits large on the screen. */
  app?: boolean;
}) {
  const { c, isDark } = useTheme();
  const t = useTints();
  const { set, step } = useStops(stops.length, index, onChange);
  const share = index === null ? 0 : (index + 1) / stops.length;
  const level = useSharedValue(share);
  useEffect(() => {
    level.set(settle(share, 460));
  }, [share, level]);
  const fill = share > 0.66 ? t.peach.fill : share > 0.34 ? t.lavender.fill : t.mist.fill;
  const rise_ = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - level.value) * (SCREEN_H + 14) }] }));
  const drag = useDrawingDrag((_, y) => set(Math.ceil(clamp(1 - y / PHONE_H, 0.001, 1) * stops.length) - 1));
  const icons = [t.lavender, t.peach, t.sage, t.mist, t.indigo, t.peach, t.sage, t.lavender, t.mist];
  const pings = index === null ? 0 : Math.round((index / (stops.length - 1)) * 6);

  return (
    <View style={styles.phoneRow}>
      <GestureDetector gesture={drag}>
        <View
          {...adjustable(label, index === null ? 'Not chosen' : stops[index], step)}
          style={[styles.phone, { backgroundColor: isDark ? '#2C2B4A' : t.indigo.fill }]}
        >
          <View pointerEvents="none" style={[styles.screen, { backgroundColor: c.surface }]}>
            <View style={styles.status}>
              <T v="caption" color={c.textDim} style={styles.statusText}>
                9:41
              </T>
              <View style={[styles.battery, { borderColor: c.textDim }]}>
                <View style={[styles.batteryLevel, { backgroundColor: c.textDim, width: `${90 - share * 70}%` }]} />
              </View>
            </View>
            {app ? (
              <View style={styles.bigApp}>
                <View style={[styles.appIconLarge, { backgroundColor: t.peach.fill }]}>
                  <Ionicons name="play" size={24} color={t.peach.on} />
                </View>
                {index !== null ? (
                  <Animated.View
                    entering={ZoomIn.duration(200).reduceMotion(sys)}
                    style={[styles.ping, styles.pingLarge, { borderColor: c.surface }]}
                  >
                    <T v="caption" color="#FFFFFF" style={styles.pingText}>
                      {index + 1}
                    </T>
                  </Animated.View>
                ) : null}
              </View>
            ) : (
              <View style={styles.grid}>
                {icons.map((tint, i) => (
                  <View key={i} style={[styles.appIcon, { backgroundColor: tint.soft }]}>
                    {i < pings ? (
                      <Animated.View
                        entering={ZoomIn.duration(180).reduceMotion(sys)}
                        exiting={FadeOut.duration(140).reduceMotion(sys)}
                        style={[styles.ping, { borderColor: c.surface }]}
                      />
                    ) : null}
                  </View>
                ))}
              </View>
            )}
            <Animated.View style={[styles.liquid, rise_]}>
              <Svg width={SCREEN_W} height={16} style={styles.wave}>
                <Path
                  d={`M0 10 C ${SCREEN_W * 0.25} 2, ${SCREEN_W * 0.45} 16, ${SCREEN_W * 0.7} 8 C ${SCREEN_W * 0.85} 3, ${SCREEN_W * 0.95} 6, ${SCREEN_W} 8 L ${SCREEN_W} 16 L 0 16 Z`}
                  fill={fill}
                  fillOpacity={0.5}
                />
              </Svg>
              <View style={[styles.liquidBody, { backgroundColor: fill, opacity: 0.5 }]} />
            </Animated.View>
            <View style={styles.screenText}>
              <Readout text={index === null ? '—' : stops[index]} faint={index === null} size={34} />
              <T v="caption" color={c.textDim} style={{ textAlign: 'center' }}>
                {index === null ? 'Drag up or down' : app ? 'on that app' : 'a day'}
              </T>
            </View>
          </View>
        </View>
      </GestureDetector>
      <View style={styles.ruler}>
        {stops
          .map((s, i) => ({ s, i }))
          .reverse()
          .map(({ s, i }) => {
            const on = index !== null && i <= index;
            return (
              <Press key={s} onPress={() => set(i)} accessibilityLabel={s} accessibilityRole="button">
                <View style={styles.mark}>
                  <View
                    style={[styles.markLine, { backgroundColor: on ? fill : c.border, width: i === index ? 22 : 12 }]}
                  />
                  <T
                    v="caption"
                    color={i === index ? c.text : c.textDim}
                    style={{ fontWeight: i === index ? '700' : '500' }}
                  >
                    {s}
                  </T>
                </View>
              </Press>
            );
          })}
      </View>
    </View>
  );
}

// --- The trail ---

/*
 * The mountain, its trail and the milestones live in one coordinate system (VIEW_W × VIEW_H), drawn by the SVG's
 * viewBox and placed for touch by the same scale, so the trail always follows the slope and every milestone sits
 * exactly on it, at any width.
 */
const VIEW_W = 320;
const VIEW_H = 240;
type Pt = [number, number];
/** The trail: base camp, two switchbacks up the face, the summit. Each leg is a cubic curve between milestones. */
const LEGS: [Pt, Pt, Pt, Pt][] = [
  [
    [62, 222],
    [112, 214],
    [196, 206],
    [236, 182],
  ],
  [
    [236, 182],
    [222, 162],
    [178, 150],
    [148, 130],
  ],
  [
    [148, 130],
    [170, 108],
    [196, 76],
    [198, 38],
  ],
];
const MOUNTAIN =
  'M0 240 L0 206 C 34 194, 76 160, 114 128 C 142 104, 172 56, 198 30 C 216 50, 238 92, 266 124 C 288 148, 306 166, 320 172 L320 240 Z';
const SNOW =
  'M182 48 C 188 40, 194 34, 198 30 C 203 35, 209 42, 216 50 C 210 52, 206 48, 202 52 C 198 48, 192 54, 188 50 C 186 52, 184 50, 182 48 Z';
const FAR = 'M0 240 L0 150 C 30 132, 60 120, 86 126 C 110 132, 120 112, 140 104 L 320 104 L320 240 Z';
const MEADOW = 'M0 240 L0 226 C 60 212, 120 232, 180 224 C 240 216, 290 222, 320 214 L320 240 Z';
const PINES: Pt[] = [
  [24, 214],
  [38, 220],
  [282, 200],
  [298, 206],
];

function bezier([a, b, c, d]: [Pt, Pt, Pt, Pt], t: number): Pt {
  const u = 1 - t;
  return [
    u * u * u * a[0] + 3 * u * u * t * b[0] + 3 * u * t * t * c[0] + t * t * t * d[0],
    u * u * u * a[1] + 3 * u * u * t * b[1] + 3 * u * t * t * c[1] + t * t * t * d[1],
  ];
}

/** The trail sampled along its length: points, the distance to each, and each milestone's distance. */
function sampleTrail() {
  const xs: number[] = [];
  const ys: number[] = [];
  const ds: number[] = [];
  const at: number[] = [0];
  let d = 0;
  let prev: Pt | null = null;
  for (const leg of LEGS) {
    for (let i = prev ? 1 : 0; i <= 24; i++) {
      const p = bezier(leg, i / 24);
      if (prev) d += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      xs.push(p[0]);
      ys.push(p[1]);
      ds.push(d);
      prev = p;
    }
    at.push(d);
  }
  return { xs, ys, ds, at, total: d };
}
const TRAIL = sampleTrail();
const TRAIL_D = LEGS.map(
  ([a, b, c, d], i) => `${i ? '' : `M${a[0]} ${a[1]} `}C ${b[0]} ${b[1]}, ${c[0]} ${c[1]}, ${d[0]} ${d[1]}`,
).join(' ');
const MILESTONE_PTS: Pt[] = [LEGS[0][0], LEGS[0][3], LEGS[1][3], LEGS[2][3]];
/** Where each milestone's words sit, beside it, in the same coordinates. */
const LABEL_SIDE: ('left' | 'right')[] = ['right', 'left', 'left', 'left'];

/**
 * A trail up a small mountain with a milestone for each answer, base camp to summit. Choosing one walks a hiker up
 * the trail to it, drawing the path behind them, and the milestones on the way light as they're passed.
 */
export function TrailPicker<K extends string>({
  items,
  value,
  onPick,
  label,
}: {
  items: { id: K; label: string; detail: string }[];
  value: K | undefined;
  onPick: (id: K) => void;
  label: string;
}) {
  const { c, isDark } = useTheme();
  const t = useTints();
  const [w, setW] = useState(0);
  const k = w / VIEW_W;
  const index = value === undefined ? null : items.findIndex((x) => x.id === value);

  // Distance walked along the trail, in view units: the walk takes longer the further it goes.
  const walked = useSharedValue(index === null ? 0 : TRAIL.at[index]);
  const any = useSharedValue(index === null ? 0 : 1);
  useEffect(() => {
    any.set(settle(index === null ? 0 : 1));
    if (index === null) return;
    const to = TRAIL.at[index];
    const span = Math.abs(to - walked.get()) / TRAIL.total;
    walked.set(
      withTiming(to, { duration: 380 + span * 700, easing: Easing.bezier(0.33, 0, 0.2, 1), reduceMotion: sys }),
    );
  }, [index, walked, any]);

  const drawn = useAnimatedProps(() => ({ strokeDashoffset: TRAIL.total - walked.value * any.value }));
  const hiker = useAnimatedStyle(() => ({
    opacity: any.value,
    transform: [
      { translateX: interpolate(walked.value, TRAIL.ds, TRAIL.xs) * k - 15 },
      { translateY: interpolate(walked.value, TRAIL.ds, TRAIL.ys) * k - 34 },
    ],
  }));
  const pick = (i: number) => {
    if (i !== index) haptic.tap();
    onPick(items[i].id);
  };
  const ridge = isDark ? 0.42 : 0.5;

  return (
    <View
      style={{ height: VIEW_H * (k || 1) }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {w ? (
        <>
          <Svg
            width={w}
            height={VIEW_H * k}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          >
            <Path d={FAR} fill={t.mist.fill} fillOpacity={0.22} />
            <Path d={MOUNTAIN} fill={t.sage.fill} fillOpacity={ridge} />
            <Path d={SNOW} fill="#FFFFFF" fillOpacity={isDark ? 0.8 : 0.95} />
            <Path d={MEADOW} fill={t.sage.fill} fillOpacity={0.75} />
            {PINES.map(([x, y], i) => (
              <Path
                key={i}
                d={`M${x} ${y - 16} L${x + 6} ${y} L${x - 6} ${y} Z`}
                fill={t.sage.ink}
                fillOpacity={0.55}
              />
            ))}
            <Path
              d={TRAIL_D}
              stroke={c.surface}
              strokeWidth={6}
              strokeLinecap="round"
              fill="none"
              strokeOpacity={0.9}
            />
            <Path
              d={TRAIL_D}
              stroke={c.textFaint}
              strokeWidth={2}
              strokeDasharray="0.5 6"
              strokeLinecap="round"
              fill="none"
            />
            <AnimatedPath
              d={TRAIL_D}
              stroke={t.peach.fill}
              strokeWidth={3.5}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={[TRAIL.total, TRAIL.total]}
              animatedProps={drawn}
            />
          </Svg>
          {items.map((x, i) => (
            <Milestone
              key={x.id}
              i={i}
              x={MILESTONE_PTS[i][0] * k}
              y={MILESTONE_PTS[i][1] * k}
              label={x.label}
              detail={x.detail}
              on={index === i}
              walked={walked}
              any={any}
              tint={t.peach}
              side={LABEL_SIDE[i]}
              summit={i === items.length - 1}
              onPress={() => pick(i)}
            />
          ))}
          <Animated.View pointerEvents="none" style={[styles.hiker, hiker]}>
            <View style={[styles.hikerBadge, { backgroundColor: t.indigo.fill, borderColor: c.surface }]}>
              <Ionicons name="walk" size={16} color={t.indigo.on} />
            </View>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

function Milestone({
  i,
  x,
  y,
  label,
  detail,
  on,
  walked,
  any,
  tint,
  side,
  summit,
  onPress,
}: {
  i: number;
  x: number;
  y: number;
  label: string;
  detail: string;
  on: boolean;
  walked: SharedValue<number>;
  any: SharedValue<number>;
  tint: Tint;
  side: 'left' | 'right';
  summit: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const at = TRAIL.at[i];
  const reached = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      interpolate(walked.value, [at - 6, at], [0, 1], 'clamp') * any.value,
      [0, 1],
      [c.surface, tint.fill],
    ),
  }));
  return (
    <>
      <Press
        onPress={onPress}
        style={[styles.milestone, { left: x - 22, top: y - 22 }]}
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        accessibilityLabel={`${label}. ${detail}`}
      >
        <View style={styles.milestoneHit}>
          <Animated.View style={[styles.milestoneDot, { borderColor: tint.fill }, reached]} />
          {summit ? (
            <View style={styles.flag}>
              <Ionicons name="flag" size={16} color={tint.ink} />
            </View>
          ) : null}
        </View>
      </Press>
      <Press
        onPress={onPress}
        style={[
          styles.milestoneLabel,
          { top: y - 20 },
          side === 'right' ? { left: x + 20 } : { left: x - 20 - 124, alignItems: 'flex-end' },
        ]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={[styles.labelPill, on && { backgroundColor: tint.soft }]}>
          <T
            v="bodyStrong"
            color={on ? tint.ink : c.text}
            numberOfLines={1}
            style={{ textAlign: side === 'left' ? 'right' : 'left' }}
          >
            {label}
          </T>
          <T v="caption" color={c.textDim} numberOfLines={1} style={{ textAlign: side === 'left' ? 'right' : 'left' }}>
            {detail}
          </T>
        </View>
      </Press>
    </>
  );
}

// --- The dial ---

const SWEEP = 300;
const START = 120;

/**
 * A dial for the time a day: drag around the ring or use − and +. The part of the ring your habits need is shaded
 * peach; the ring fills sage once the time covers it, with a small word on whether it fits.
 */
export function TimeDial({
  stops,
  values,
  index,
  onChange,
  need,
  label,
}: {
  stops: string[];
  /** The minutes behind each stop, for placing what's needed. */
  values: readonly number[];
  index: number | null;
  onChange: (i: number) => void;
  /** Minutes the chosen habits take on a day they all fall on. */
  need: number;
  label: string;
}) {
  const { c } = useTheme();
  const t = useTints();
  const { set, step } = useStops(stops.length, index, onChange);
  const last = stops.length - 1;
  const size = 252;
  const r = size / 2 - 30;
  const mid = size / 2;
  const circ = 2 * Math.PI * r;
  const arcLen = (circ * SWEEP) / 360;
  const f = useSharedValue(index === null ? 0 : index / last);
  useEffect(() => {
    f.set(settle(index === null ? 0 : index / last, 420));
  }, [index, last, f]);
  const fits = index !== null && values[index] >= need;

  const shareOf = (m: number) => {
    if (m <= values[0]) return 0;
    for (let i = 0; i < last; i++)
      if (m <= values[i + 1]) return (i + (m - values[i]) / (values[i + 1] - values[i])) / last;
    return 1;
  };
  const point = (share: number, rad = r) => {
    const a = ((START + SWEEP * share) * Math.PI) / 180;
    return { x: mid + rad * Math.cos(a), y: mid + rad * Math.sin(a) };
  };
  const needShare = shareOf(need);

  const arc = useAnimatedProps(() => ({ strokeDashoffset: arcLen * (1 - f.value) }));
  const knob = useAnimatedStyle(() => {
    const a = ((START + SWEEP * f.value) * Math.PI) / 180;
    return {
      opacity: index === null ? 0 : 1,
      transform: [{ translateX: mid + r * Math.cos(a) - 16 }, { translateY: mid + r * Math.sin(a) - 16 }],
    };
  });
  const drag = useDrawingDrag((x, y) => {
    const deg = ((Math.atan2(y - mid, x - mid) * 180) / Math.PI + 360) % 360;
    let rel = (deg - START + 360) % 360;
    // In the gap at the bottom: whichever end is nearer.
    if (rel > SWEEP) rel = rel > SWEEP + (360 - SWEEP) / 2 ? 0 : SWEEP;
    set(Math.round((rel / SWEEP) * last));
  });
  const ring = index === null ? c.border : fits ? t.sage.fill : t.peach.fill;
  const marks = useMemo(() => [0, Math.floor(last / 2), last], [last]);

  return (
    <View style={styles.dialWrap}>
      <GestureDetector gesture={drag}>
        <View
          {...adjustable(label, index === null ? 'Not chosen' : stops[index], step)}
          style={{ width: size, height: size }}
        >
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Svg width={size} height={size}>
              <Circle
                cx={mid}
                cy={mid}
                r={r}
                stroke={c.surface}
                strokeWidth={22}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={[arcLen, circ]}
                rotation={START}
                origin={`${mid}, ${mid}`}
              />
              <Circle
                cx={mid}
                cy={mid}
                r={r}
                stroke={t.peach.fill}
                strokeOpacity={0.28}
                strokeWidth={22}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={[arcLen * Math.max(0.001, needShare), circ]}
                rotation={START}
                origin={`${mid}, ${mid}`}
              />
              <AnimatedCircle
                cx={mid}
                cy={mid}
                r={r}
                stroke={ring}
                strokeWidth={12}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={[arcLen, circ]}
                rotation={START}
                origin={`${mid}, ${mid}`}
                animatedProps={arc}
              />
              {stops.map((s, i) => {
                const a = point(i / last, r + 20);
                const b = point(i / last, r + 25);
                return (
                  <Path
                    key={s}
                    d={`M${a.x} ${a.y} L${b.x} ${b.y}`}
                    stroke={c.textFaint}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                );
              })}
            </Svg>
            {marks.map((i) => {
              const p = point(i / last, r + 30);
              return (
                <View key={i} style={[styles.dialMark, { left: p.x - 24, top: p.y - 9 }]}>
                  <T v="caption" color={c.textFaint} style={styles.dialMarkText}>
                    {stops[i]}
                  </T>
                </View>
              );
            })}
            <Animated.View style={[styles.knob, { backgroundColor: c.surface, borderColor: ring }, knob]}>
              <View style={[styles.knobDot, { backgroundColor: ring }]} />
            </Animated.View>
            <View style={styles.dialCenter}>
              <Readout text={index === null ? '—' : stops[index]} faint={index === null} size={40} />
              <View style={styles.fitRow}>
                {index === null ? (
                  <T v="caption" color={c.textDim}>
                    Turn the dial
                  </T>
                ) : (
                  <Animated.View key={fits ? 'fits' : 'short'} entering={FadeIn.duration(200).reduceMotion(sys)}>
                    <View style={[styles.fit, { backgroundColor: fits ? t.sage.soft : t.peach.soft }]}>
                      <Ionicons
                        name={fits ? 'checkmark' : 'time-outline'}
                        size={14}
                        color={fits ? t.sage.ink : t.peach.ink}
                      />
                      <T v="caption" color={fits ? t.sage.ink : t.peach.ink} style={{ fontWeight: '700' }}>
                        {fits ? 'Your habits fit' : 'A little short'}
                      </T>
                    </View>
                  </Animated.View>
                )}
              </View>
            </View>
          </View>
        </View>
      </GestureDetector>
      <View style={styles.dialFoot}>
        <StepRound icon="remove" label="Less time" disabled={index === 0} onPress={() => step(-1)} />
        <View style={styles.needRow}>
          <View style={[styles.needDot, { backgroundColor: t.peach.fill, opacity: 0.5 }]} />
          <T v="caption" color={c.textDim}>
            Your habits need about {need} min
          </T>
        </View>
        <StepRound
          icon="add"
          label="More time"
          disabled={index === last}
          onPress={() => (index === null ? set(Math.floor(last / 2)) : step(1))}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xl },
  phone: { width: PHONE_W, height: PHONE_H, borderRadius: 38, padding: BEZEL },
  screen: { flex: 1, borderRadius: 31, overflow: 'hidden' },
  status: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  battery: { width: 20, height: 10, borderRadius: 3, borderWidth: 1, padding: 1 },
  batteryLevel: { height: '100%', borderRadius: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 18, paddingTop: 14 },
  appIcon: { width: 28, height: 28, borderRadius: 9 },
  bigApp: { alignSelf: 'center', marginTop: 18 },
  appIconLarge: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ping: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: '#E5675A',
  },
  pingLarge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    top: -7,
    right: -7,
  },
  pingText: { fontSize: 11, lineHeight: 13, fontWeight: '800' },
  liquid: { position: 'absolute', left: 0, right: 0, top: -14, height: SCREEN_H + 14 },
  wave: { position: 'absolute', top: 0, left: 0 },
  liquidBody: { position: 'absolute', top: 15, left: 0, right: 0, bottom: 0 },
  screenText: { position: 'absolute', left: 0, right: 0, top: '44%', alignItems: 'center' },
  ruler: { height: PHONE_H - 24, justifyContent: 'space-between' },
  mark: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36 },
  markLine: { height: 3, borderRadius: 2 },
  hiker: { position: 'absolute', left: 0, top: 0 },
  hikerBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestone: { position: 'absolute', width: 44, height: 44 },
  milestoneHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  milestoneDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 3 },
  flag: { position: 'absolute', top: -12, left: 22 },
  milestoneLabel: { position: 'absolute', width: 124 },
  labelPill: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.sm },
  dialWrap: { alignItems: 'center', gap: space.md },
  knob: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  knobDot: { width: 8, height: 8, borderRadius: 4 },
  dialMark: { position: 'absolute', width: 48, alignItems: 'center' },
  dialMarkText: { fontSize: 11 },
  dialCenter: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fitRow: { minHeight: 28, justifyContent: 'center' },
  fit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  dialFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  needRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexShrink: 1 },
  needDot: { width: 9, height: 9, borderRadius: 5 },
});
