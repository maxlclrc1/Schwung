import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { INTENSITIES, type Intensity } from '../../core/reset/habits';
import * as P from '../../core/reset/pilot';
import { radius, space, useTheme } from '../../theme';
import { habitScene } from '../habitArt';
import { ThemedImage } from '../ThemedImage';
import { T } from '../ui';
import { PeakPicker, Press } from './Choices';
import { rise, settle, useTints } from './kit';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const sys = ReduceMotion.System;
const ease = Easing.bezier(0.22, 1, 0.36, 1);

/** A habit's scene, cropped to fit. */
export function HabitArt({ id, width, height }: { id: string; width: number; height: number }) {
  const dark = habitScene(id, 'dark');
  const light = habitScene(id, 'light');
  if (!dark || !light) return null;
  return (
    <ThemedImage
      sources={{ dark, light }}
      resizeMode="cover"
      style={{ position: 'absolute', left: 0, top: 0, width, height }}
    />
  );
}

/** The veil at the foot of a scene, so its words read over the painting in either theme. */
function useVeil(): [string, string, string] {
  const { isDark } = useTheme();
  return isDark
    ? ['rgba(17,17,22,0)', 'rgba(17,17,22,0.72)', 'rgba(17,17,22,0.96)']
    : ['rgba(247,246,251,0)', 'rgba(247,246,251,0.74)', 'rgba(247,246,251,0.97)'];
}

/** A check that draws itself in a filled circle. */
function DrawnCheck({ on, fill, color }: { on: boolean; fill: string; color: string }) {
  const t = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    t.set(settle(on ? 1 : 0, 360));
  }, [on, t]);
  const disc = useAnimatedStyle(() => ({ opacity: Math.min(1, t.value * 2) }));
  const stroke = useAnimatedProps(() => ({ strokeDashoffset: 18 * (1 - t.value) }));
  return (
    <Animated.View style={[styles.tick, { backgroundColor: fill }, disc]}>
      <Svg width={24} height={24} viewBox="0 0 24 24">
        <AnimatedPath
          d="M6.5 12.5 L10.5 16.5 L18 8.5"
          stroke={color}
          strokeWidth={2.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          strokeDasharray={[18, 18]}
          animatedProps={stroke}
        />
      </Svg>
    </Animated.View>
  );
}

/**
 * A habit to choose, in its own scene: the gallery rises in one after another; choosing one slowly leans the
 * painting in, rings it and draws a check. One that isn't for this person is dimmed with why.
 */
export function HabitTile({
  id,
  order,
  width,
  selected,
  suggested,
  reason,
  full,
  onPress,
}: {
  id: string;
  /** Its place in the gallery, for the reveal. */
  order: number;
  width: number;
  selected: boolean;
  suggested: boolean;
  reason: string | null;
  /** Six chosen already: this one can't join until one leaves. */
  full: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const tint = useTints().lavender;
  const veil = useVeil();
  const height = Math.round(width * 1.18);
  const on = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    on.set(settle(selected ? 1 : 0, 520));
  }, [selected, on]);
  const art = useAnimatedStyle(() => ({ transform: [{ scale: 1 + on.value * 0.06 }] }));
  const ring = useAnimatedStyle(() => ({ opacity: on.value }));
  const off = !!reason;

  return (
    <Animated.View entering={rise(120 + order * 45)}>
      <Press
        onPress={onPress}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected, disabled: off || (full && !selected) }}
        accessibilityLabel={`${P.habitName(id)}. ${P.habitDescription(id)}${suggested && !off ? '. Suggested' : ''}`}
        accessibilityHint={off ? `Not available: ${reason}` : undefined}
      >
        <View style={{ width, height }}>
          <View style={[styles.tile, { opacity: off ? 0.38 : full && !selected ? 0.6 : 1 }]}>
            <Animated.View style={[StyleSheet.absoluteFill, art]}>
              <HabitArt id={id} width={width} height={height} />
            </Animated.View>
            <LinearGradient colors={veil} locations={[0.34, 0.7, 1]} style={StyleSheet.absoluteFill} />
            {suggested && !off ? (
              <View style={[styles.badge, { backgroundColor: c.bg }]}>
                <T v="overline" color={tint.ink} style={styles.badgeText}>
                  Suggested
                </T>
              </View>
            ) : null}
            <View style={styles.tileText}>
              <T v="bodyStrong" numberOfLines={2} style={{ lineHeight: 21 }}>
                {P.habitName(id)}
              </T>
              <T v="caption" color={c.textDim} numberOfLines={2} style={styles.small}>
                {off ? `Not for now: ${reason}` : P.habitDescription(id)}
              </T>
            </View>
          </View>
          <Animated.View pointerEvents="none" style={[styles.ring, { borderColor: tint.fill }, ring]} />
          <View style={styles.tickAt} pointerEvents="none">
            <DrawnCheck on={selected} fill={tint.fill} color={tint.on} />
          </View>
        </View>
      </Press>
    </Animated.View>
  );
}

/** How many are chosen, as six small stones that fill in. */
export function Stones({ count, max }: { count: number; max: number }) {
  const { c } = useTheme();
  const t = useTints();
  const colors = [t.lavender, t.peach, t.sage, t.mist, t.indigo, t.lavender];
  return (
    <View style={styles.stones} accessible accessibilityLabel={`${count} of ${max} chosen`}>
      {Array.from({ length: max }, (_, i) => (
        <View
          key={i}
          style={[
            styles.stone,
            { backgroundColor: i < count ? colors[i].fill : c.border, opacity: i < count ? 1 : 0.6 },
          ]}
        />
      ))}
    </View>
  );
}

/** One habit's starting point: its scene and name, what that means each day, and three peaks to choose from. */
export function StartCard({
  id,
  answers,
  chosen,
  onChoose,
  children,
  onRemove,
}: {
  id: string;
  answers: P.PilotAnswers;
  chosen: Intensity | null;
  onChoose: (i: Intensity) => void;
  /** Anything this intensity needs to know more about (Strength's own sessions). */
  children?: React.ReactNode;
  onRemove: () => void;
}) {
  const { c } = useTheme();
  const t = useTints();
  const reason = P.habitExclusion(id, answers);
  const options = P.intensityOptions(id, answers);
  const preview = chosen && !reason ? P.previewTarget(id, chosen, answers) : null;
  return (
    <View style={[styles.start, { backgroundColor: c.surface }]}>
      <View style={styles.startHead}>
        <View style={styles.thumb}>
          <HabitArt id={id} width={52} height={52} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="bodyStrong">{P.habitName(id)}</T>
          {preview ? (
            <Animated.View key={chosen} entering={FadeIn.duration(240).reduceMotion(sys)}>
              <T v="caption" color={c.textDim}>
                {preview.target} · {preview.frequency}
              </T>
            </Animated.View>
          ) : null}
        </View>
      </View>
      {reason ? (
        <View style={{ gap: space.sm }}>
          <T v="caption" color={c.danger}>
            Not available: {reason}.
          </T>
          <Press onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Remove ${P.habitName(id)}`}>
            <T v="bodyStrong" color={t.lavender.ink}>
              Remove it
            </T>
          </Press>
        </View>
      ) : (
        <>
          <PeakPicker
            options={INTENSITIES.map((i) => ({
              id: i,
              label: P.INTENSITY_NAME[i],
              blocked: options.find((o) => o.intensity === i)?.reason ?? null,
            }))}
            value={chosen}
            onPick={onChoose}
            tints={[t.sage, t.mist, t.peach]}
          />
          {children}
        </>
      )}
    </View>
  );
}

/**
 * The reveal: the chosen habits' scenes fan out from one stack like a hand of cards, one after another, under the
 * number of days ahead.
 */
export function HabitFan({ ids, width }: { ids: string[]; width: number }) {
  const n = ids.length;
  const card = { w: 92, h: 124 };
  const gap = n > 1 ? Math.min(58, (width - card.w - 16) / (n - 1)) : 0;
  return (
    <View
      style={[styles.fan, { height: card.h + 28 }]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      {ids.map((id, i) => (
        <FanCard key={id} id={id} i={i} n={n} gap={gap} card={card} />
      ))}
    </View>
  );
}

function FanCard({
  id,
  i,
  n,
  gap,
  card,
}: {
  id: string;
  i: number;
  n: number;
  gap: number;
  card: { w: number; h: number };
}) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const k = i - (n - 1) / 2;
  const t = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (reduce) return;
    t.set(withDelay(260 + i * 90, withTiming(1, { duration: 760, easing: ease })));
  }, [i, t, reduce]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value * 1.6),
    transform: [
      { translateX: k * gap * t.value },
      { translateY: (Math.abs(k) * 7 + 14) * t.value + (1 - t.value) * 30 },
      { rotate: `${k * 6 * t.value}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        styles.fanCard,
        {
          width: card.w,
          height: card.h,
          marginLeft: -card.w / 2,
          borderColor: c.bg,
          zIndex: 10 - Math.round(Math.abs(k)),
        },
        style,
      ]}
    >
      <HabitArt id={id} width={card.w} height={card.h} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, borderRadius: radius.lg, overflow: 'hidden' },
  ring: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: radius.lg, borderWidth: 2.5 },
  tileText: { position: 'absolute', left: space.md, right: space.md, bottom: space.md, gap: 2 },
  small: { fontSize: 12, lineHeight: 16 },
  badge: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    opacity: 0.9,
  },
  badgeText: { fontSize: 10, letterSpacing: 0.8 },
  tickAt: { position: 'absolute', top: space.sm, right: space.sm },
  tick: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  stones: { flexDirection: 'row', gap: 6 },
  stone: { width: 10, height: 10, borderRadius: 5 },
  start: { borderRadius: radius.lg, padding: space.md, gap: space.md },
  startHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  thumb: { width: 52, height: 52, borderRadius: 14, overflow: 'hidden' },
  fan: { alignItems: 'center' },
  fanCard: { position: 'absolute', left: '50%', top: 0, borderRadius: 18, borderWidth: 3, overflow: 'hidden' },
});
