import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { haptic } from '../../lib/haptics';
import { radius, space, useTheme } from '../../theme';
import { T } from '../ui';
import { Press } from './Choices';
import { rise, settle, useDragLock, useTints, type Tint } from './kit';

/*
 * Illustrated answers: a phone that fills with the hours it takes, a sun that rises along the morning, a trail up a
 * mountain, and a dial for the time a day. Each moves to a set of stops on the shared curve (never a spring), can be
 * dragged or tapped, ticks once per stop, and is a single adjustable control for screen readers.
 */

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Touches on a drawing: every point while the finger is down, with the page's scroll held still. */
function useDrag(onPoint: (x: number, y: number) => void) {
  const lock = useDragLock();
  const at = (e: GestureResponderEvent) => onPoint(e.nativeEvent.locationX, e.nativeEvent.locationY);
  return {
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => {
      lock(true);
      at(e);
    },
    onResponderMove: at,
    onResponderRelease: () => lock(false),
    onResponderTerminate: () => lock(false),
  };
}

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

const PHONE_W = 148;
const PHONE_H = 286;
const BEZEL = 7;

/**
 * A phone whose screen fills from the bottom with the time it takes (misty blue rising toward peach). Drag up or
 * down on it, or tap a mark on the scale beside it.
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
  /** One app's time: an app sits on the screen. */
  app?: boolean;
}) {
  const { c } = useTheme();
  const t = useTints();
  const { set, step } = useStops(stops.length, index, onChange);
  const level = useSharedValue(index === null ? 0 : (index + 1) / stops.length);
  useEffect(() => {
    level.set(settle(index === null ? 0 : (index + 1) / stops.length, 420));
  }, [index, stops.length, level]);
  const screenH = PHONE_H - BEZEL * 2;
  const fill = useAnimatedStyle(() => ({
    height: level.value * screenH,
    backgroundColor: interpolateColor(level.value, [0, 0.5, 1], [t.mist.fill, t.lavender.fill, t.peach.fill]),
  }));
  const drag = useDrag((_, y) => set(Math.ceil(clamp(1 - y / PHONE_H, 0.001, 1) * stops.length) - 1));

  return (
    <View style={styles.phoneRow}>
      <View
        {...drag}
        {...adjustable(label, index === null ? 'Not chosen' : stops[index], step)}
        style={[styles.phone, { backgroundColor: t.indigo.fill }]}
      >
        <View pointerEvents="none" style={[styles.screen, { backgroundColor: c.surface }]}>
          <Animated.View style={[styles.screenFill, fill]} />
          <View style={[styles.notch, { backgroundColor: t.indigo.fill }]} />
          {app ? (
            <View style={[styles.app, { backgroundColor: t.peach.soft }]}>
              <Ionicons name="play" size={18} color={t.peach.ink} />
            </View>
          ) : null}
          <View style={styles.screenText}>
            <Readout text={index === null ? '—' : stops[index]} faint={index === null} size={34} />
            <T v="caption" color={c.textDim} style={{ textAlign: 'center' }}>
              {index === null ? 'Drag up or down' : app ? 'on that app' : 'a day'}
            </T>
          </View>
        </View>
      </View>
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
                    style={[
                      styles.markLine,
                      { backgroundColor: on ? t.lavender.fill : c.border, width: i === index ? 22 : 12 },
                    ]}
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

// --- The sunrise ---

const SKY_H = 196;

/**
 * The morning as an arc over the hills: a moon low on the left becomes the sun as it climbs to the right. Drag
 * along it; the sky warms with the hour.
 */
export function SunriseArc({
  stops,
  index,
  onChange,
  label,
  muted,
}: {
  stops: string[];
  index: number | null;
  onChange: (i: number) => void;
  label: string;
  /** Another answer was chosen ("it varies"): the sky rests. */
  muted?: string;
}) {
  const { c } = useTheme();
  const t = useTints();
  const [w, setW] = useState(0);
  const { set, step } = useStops(stops.length, index, onChange);
  const last = stops.length - 1;
  const pos = useSharedValue(index === null ? 0.5 : index / last);
  const shown = useSharedValue(index === null || muted ? 0 : 1);
  useEffect(() => {
    if (index !== null) pos.set(settle(index / last, 420));
    shown.set(settle(index === null || muted ? 0 : 1));
  }, [index, last, muted, pos, shown]);

  const hy = SKY_H - 34;
  const rx = Math.max(10, (w - 56) / 2);
  const ry = SKY_H - 70;
  const cx = w / 2;
  const half = (Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)))) / 2;
  const arc = `M ${cx - rx} ${hy} A ${rx} ${ry} 0 0 1 ${cx + rx} ${hy}`;

  const sky = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pos.value, [0, 0.5, 1], [t.indigo.soft, t.lavender.soft, t.peach.soft]),
  }));
  const travelled = useAnimatedProps(() => ({ strokeDashoffset: half * (1 - pos.value * shown.value) }));
  const body = useAnimatedStyle(() => {
    const a = Math.PI * (1 - pos.value);
    return {
      opacity: 0.4 + shown.value * 0.6,
      transform: [{ translateX: cx + rx * Math.cos(a) - 22 }, { translateY: hy - ry * Math.sin(a) - 22 }],
    };
  });
  const sun = useAnimatedStyle(() => ({ opacity: interpolate(pos.value, [0.25, 0.6], [0, 1], 'clamp') }));
  const moon = useAnimatedStyle(() => ({ opacity: interpolate(pos.value, [0.25, 0.6], [1, 0], 'clamp') }));
  const glow = useAnimatedStyle(() => ({
    opacity: interpolate(pos.value, [0.3, 1], [0, 0.55], 'clamp') * shown.value,
  }));
  const drag = useDrag((x) => set(Math.round(clamp((x - (cx - rx)) / (2 * rx), 0, 1) * last)));

  return (
    <View style={{ gap: space.lg }}>
      <View
        {...drag}
        {...adjustable(label, muted ?? (index === null ? 'Not chosen' : stops[index]), step)}
        onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
        style={styles.sky}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.skyRound, sky]} />
          {w ? (
            <Svg width={w} height={SKY_H} style={StyleSheet.absoluteFill}>
              <Path
                d={arc}
                stroke={c.textFaint}
                strokeOpacity={0.5}
                strokeWidth={2}
                strokeDasharray="2 7"
                strokeLinecap="round"
                fill="none"
              />
              <AnimatedPath
                d={arc}
                stroke={t.peach.fill}
                strokeWidth={3}
                strokeLinecap="round"
                fill="none"
                strokeDasharray={[half, half]}
                animatedProps={travelled}
              />
              <Path
                d={`M 0 ${hy + 6} C ${w * 0.2} ${hy - 18}, ${w * 0.35} ${hy - 4}, ${w * 0.5} ${hy + 2} C ${w * 0.68} ${hy + 8}, ${w * 0.8} ${hy - 22}, ${w} ${hy - 2} L ${w} ${SKY_H} L 0 ${SKY_H} Z`}
                fill={t.sage.fill}
                fillOpacity={0.35}
              />
              <Path
                d={`M 0 ${hy + 22} C ${w * 0.3} ${hy + 4}, ${w * 0.55} ${hy + 26}, ${w} ${hy + 12} L ${w} ${SKY_H} L 0 ${SKY_H} Z`}
                fill={t.sage.fill}
                fillOpacity={0.55}
              />
            </Svg>
          ) : null}
          {w ? (
            <Animated.View style={[styles.body, body]}>
              <Animated.View style={[styles.glow, { backgroundColor: t.peach.fill }, glow]} />
              <Animated.View style={[styles.orb, { backgroundColor: t.indigo.fill }, moon]}>
                <Ionicons name="moon" size={18} color={t.indigo.on} />
              </Animated.View>
              <Animated.View style={[styles.orb, { backgroundColor: t.peach.fill }, sun]}>
                <Ionicons name="sunny" size={20} color={t.peach.on} />
              </Animated.View>
            </Animated.View>
          ) : null}
        </View>
      </View>
      <View style={styles.readoutRow} pointerEvents="none">
        <T v="caption" color={c.textFaint}>
          {stops[0]}
        </T>
        <Readout text={muted ?? (index === null ? '—' : stops[index])} faint={index === null && !muted} size={40} />
        <T v="caption" color={c.textFaint}>
          {stops[last]}
        </T>
      </View>
    </View>
  );
}

// --- The trail ---

const TRAIL_H = 252;
/** Milestones up the mountain: x as a share of the width, y in points (the summit last). */
const MILESTONES = [
  { x: 0.16, y: 224 },
  { x: 0.7, y: 170 },
  { x: 0.3, y: 112 },
  { x: 0.6, y: 44 },
];

/**
 * A trail up a small mountain with a milestone for each answer, base camp to summit. Choosing one draws the trail up
 * to it, and the milestones on the way fill in.
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
  const { c } = useTheme();
  const t = useTints();
  const [w, setW] = useState(0);
  const index = value === undefined ? null : items.findIndex((x) => x.id === value);
  const pts = MILESTONES.map((m) => ({ x: m.x * w, y: m.y }));
  const segs = pts.slice(1).map((p, i) => Math.hypot(p.x - pts[i].x, p.y - pts[i].y));
  const cum = segs.reduce<number[]>((a, s) => [...a, a[a.length - 1] + s], [0]);
  const total = cum[cum.length - 1] || 1;
  const trail = pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');

  const climbed = useSharedValue(index ?? 0);
  const any = useSharedValue(index === null ? 0 : 1);
  useEffect(() => {
    if (index !== null) climbed.set(settle(index, 620));
    any.set(settle(index === null ? 0 : 1));
  }, [index, climbed, any]);
  const drawn = useAnimatedProps(() => ({
    strokeDashoffset: total - interpolate(climbed.value, [0, 1, 2, 3], cum, 'clamp') * any.value,
  }));
  const pick = (i: number) => {
    if (i !== index) haptic.tap();
    onPick(items[i].id);
  };

  return (
    <View
      style={{ height: TRAIL_H }}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
    >
      {w ? (
        <Svg width={w} height={TRAIL_H} style={StyleSheet.absoluteFill} pointerEvents="none">
          <Path
            d={`M 0 ${TRAIL_H} L ${w * 0.17} 168 L ${w * 0.31} 190 L ${w * 0.6} 22 L ${w * 0.8} 118 L ${w * 0.9} 100 L ${w} ${TRAIL_H} Z`}
            fill={t.sage.fill}
            fillOpacity={0.22}
          />
          <Path
            d={`M ${w * 0.52} 68 L ${w * 0.6} 22 L ${w * 0.67} 58 L ${w * 0.62} 52 L ${w * 0.58} 62 L ${w * 0.55} 56 Z`}
            fill="#FFFFFF"
            fillOpacity={0.75}
          />
          <Path
            d={`M 0 ${TRAIL_H} L 0 214 C ${w * 0.25} 186, ${w * 0.5} 230, ${w * 0.78} 196 C ${w * 0.88} 186, ${w * 0.95} 190, ${w} 200 L ${w} ${TRAIL_H} Z`}
            fill={t.mist.fill}
            fillOpacity={0.22}
          />
          <Path
            d={trail}
            stroke={c.textFaint}
            strokeWidth={2.5}
            strokeDasharray="1 8"
            strokeLinecap="round"
            fill="none"
          />
          <AnimatedPath
            d={trail}
            stroke={t.sage.fill}
            strokeWidth={4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            strokeDasharray={[total, total]}
            animatedProps={drawn}
          />
        </Svg>
      ) : null}
      {w
        ? items.map((x, i) => (
            <Milestone
              key={x.id}
              i={i}
              x={pts[i].x}
              y={pts[i].y}
              label={x.label}
              detail={x.detail}
              on={index === i}
              climbed={climbed}
              any={any}
              tint={t.sage}
              left={MILESTONES[i].x > 0.5}
              summit={i === items.length - 1}
              onPress={() => pick(i)}
            />
          ))
        : null}
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
  climbed,
  any,
  tint,
  left,
  summit,
  onPress,
}: {
  i: number;
  x: number;
  y: number;
  label: string;
  detail: string;
  on: boolean;
  climbed: SharedValue<number>;
  any: SharedValue<number>;
  tint: Tint;
  /** The label sits on the left of the marker. */
  left: boolean;
  summit: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const reached = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      interpolate(climbed.value, [i - 0.4, i], [0, 1], 'clamp') * any.value,
      [0, 1],
      [c.surface, tint.fill],
    ),
  }));
  const halo = useAnimatedStyle(() => ({
    opacity: interpolate(Math.abs(climbed.value - i), [0, 0.5], [1, 0], 'clamp') * any.value,
  }));
  return (
    <Press
      onPress={onPress}
      style={[styles.milestone, { left: x - 22, top: y - 22 }]}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${label}. ${detail}`}
    >
      <View style={styles.milestoneHit}>
        <Animated.View style={[styles.milestoneHalo, { backgroundColor: tint.soft }, halo]} />
        <Animated.View style={[styles.milestoneDot, { borderColor: tint.fill }, reached]} />
        {summit ? (
          <View style={styles.flag}>
            <Ionicons name="flag" size={16} color={tint.ink} />
          </View>
        ) : null}
      </View>
      <View style={[styles.milestoneLabel, left ? { right: 46, alignItems: 'flex-end' } : { left: 46 }]}>
        <T v="bodyStrong" color={on ? tint.ink : c.text} numberOfLines={1}>
          {label}
        </T>
        <T v="caption" color={c.textDim} numberOfLines={1}>
          {detail}
        </T>
      </View>
    </Press>
  );
}

// --- The dial ---

const SWEEP = 300;
const START = 120;

/**
 * A dial for the time a day: drag around the ring or use − and +. A small peach mark on the ring shows what the
 * chosen habits need; the ring turns peach when the time chosen is short of it.
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
  /** The minutes behind each stop, for placing the mark of what's needed. */
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
  const size = 248;
  const r = size / 2 - 24;
  const mid = size / 2;
  const circ = 2 * Math.PI * r;
  const arcLen = (circ * SWEEP) / 360;
  const f = useSharedValue(index === null ? 0 : index / last);
  useEffect(() => {
    f.set(settle(index === null ? 0 : index / last, 420));
  }, [index, last, f]);
  const short = index !== null && values[index] < need;

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
  const needAt = point(shareOf(need), r + 17);

  const arc = useAnimatedProps(() => ({ strokeDashoffset: arcLen * (1 - f.value) }));
  const knob = useAnimatedStyle(() => {
    const a = ((START + SWEEP * f.value) * Math.PI) / 180;
    return {
      opacity: index === null ? 0 : 1,
      transform: [{ translateX: mid + r * Math.cos(a) - 15 }, { translateY: mid + r * Math.sin(a) - 15 }],
    };
  });
  const drag = useDrag((x, y) => {
    const deg = ((Math.atan2(y - mid, x - mid) * 180) / Math.PI + 360) % 360;
    let rel = (deg - START + 360) % 360;
    // In the gap at the bottom: whichever end is nearer.
    if (rel > SWEEP) rel = rel > SWEEP + (360 - SWEEP) / 2 ? 0 : SWEEP;
    set(Math.round((rel / SWEEP) * last));
  });
  const ring = short ? t.peach.fill : t.sage.fill;

  return (
    <View style={styles.dialWrap}>
      <View
        {...drag}
        {...adjustable(label, index === null ? 'Not chosen' : stops[index], step)}
        style={{ width: size, height: size }}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <Svg width={size} height={size}>
            <Circle
              cx={mid}
              cy={mid}
              r={r}
              stroke={c.surfaceHigh}
              strokeWidth={16}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={[arcLen, circ]}
              rotation={START}
              origin={`${mid}, ${mid}`}
            />
            <AnimatedCircle
              cx={mid}
              cy={mid}
              r={r}
              stroke={ring}
              strokeWidth={16}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={[arcLen, circ]}
              rotation={START}
              origin={`${mid}, ${mid}`}
              animatedProps={arc}
            />
            {stops.map((s, i) => {
              const p = point(i / last);
              return <Circle key={s} cx={p.x} cy={p.y} r={2} fill={c.bg} fillOpacity={0.7} />;
            })}
            <Circle cx={needAt.x} cy={needAt.y} r={4.5} fill={t.peach.fill} />
          </Svg>
          <Animated.View style={[styles.knob, { backgroundColor: c.surface, borderColor: ring }, knob]} />
          <View style={styles.dialCenter}>
            <Readout text={index === null ? '—' : stops[index]} faint={index === null} size={38} />
            <T v="caption" color={c.textDim}>
              {index === null ? 'Turn the dial' : 'on a busy day'}
            </T>
          </View>
        </View>
      </View>
      <View style={styles.dialFoot}>
        <Round icon="remove" label="Less time" disabled={index === 0} onPress={() => step(-1)} />
        <View style={styles.needRow}>
          <View style={[styles.needDot, { backgroundColor: t.peach.fill }]} />
          <T v="caption" color={c.textDim}>
            Your habits need about {need} min
          </T>
        </View>
        <Round
          icon="add"
          label="More time"
          disabled={index === last}
          onPress={() => (index === null ? set(Math.floor(last / 2)) : step(1))}
        />
      </View>
    </View>
  );
}

function Round({
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
  phoneRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xl },
  phone: { width: PHONE_W, height: PHONE_H, borderRadius: 36, padding: BEZEL },
  screen: { flex: 1, borderRadius: 29, overflow: 'hidden' },
  screenFill: { position: 'absolute', left: 0, right: 0, bottom: 0, opacity: 0.55 },
  notch: { alignSelf: 'center', marginTop: 8, width: 52, height: 16, borderRadius: 8 },
  app: {
    alignSelf: 'center',
    marginTop: space.lg,
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenText: { position: 'absolute', left: 0, right: 0, top: '38%', alignItems: 'center' },
  ruler: { height: PHONE_H - 24, justifyContent: 'space-between' },
  mark: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 36 },
  markLine: { height: 3, borderRadius: 2 },
  sky: { height: SKY_H },
  skyRound: { borderRadius: radius.lg, overflow: 'hidden' },
  body: { position: 'absolute', left: 0, top: 0, width: 44, height: 44 },
  glow: { position: 'absolute', left: -14, top: -14, width: 72, height: 72, borderRadius: 36 },
  orb: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  milestone: { position: 'absolute', width: 44, height: 44 },
  milestoneHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  milestoneHalo: { position: 'absolute', width: 44, height: 44, borderRadius: 22 },
  milestoneDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 3 },
  flag: { position: 'absolute', top: -14, left: 22 },
  milestoneLabel: { position: 'absolute', top: 2, width: 130 },
  dialWrap: { alignItems: 'center', gap: space.md },
  knob: { position: 'absolute', left: 0, top: 0, width: 30, height: 30, borderRadius: 15, borderWidth: 4 },
  dialCenter: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
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
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
});
