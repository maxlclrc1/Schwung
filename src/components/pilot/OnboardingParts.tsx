import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { INTENSITIES, type Intensity } from '../../core/reset/habits';
import * as P from '../../core/reset/pilot';
import { haptic } from '../../lib/haptics';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { habitScene } from '../habitArt';
import { ThemedImage } from '../ThemedImage';
import { T } from '../ui';
import { WorldBackdrop } from '../World';

/*
 * The set-up's own controls: one question a screen, answered with quiet cards, a scale or the habits' own scenes.
 * Press feedback dims rather than scales (scaled text is drawn from a stretched bitmap on iOS); every movement
 * follows Reduce Motion.
 */

const sys = ReduceMotion.System;

/** Dims while pressed. */
function usePressDim() {
  const pressed = useSharedValue(0);
  const style = useAnimatedStyle(() => ({ opacity: 1 - pressed.value * 0.3 }));
  return {
    style,
    onPressIn: () => pressed.set(withTiming(1, { duration: 70 })),
    onPressOut: () => pressed.set(withTiming(0, { duration: 180 })),
  };
}

/** A screen's one question: a small label, the question itself, and a line of context. */
export function Question({
  eyebrow,
  title,
  hint,
  children,
}: {
  eyebrow?: string;
  title: string;
  hint?: string;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  return (
    <View style={styles.question}>
      <View style={{ gap: space.sm }}>
        {eyebrow ? (
          <T v="overline" color={c.accentInk}>
            {eyebrow}
          </T>
        ) : null}
        <T v="title" style={styles.big} accessibilityRole="header">
          {title}
        </T>
        {hint ? <T color={c.textDim}>{hint}</T> : null}
      </View>
      {children}
    </View>
  );
}

/** The thin bar under the back button: how far through set-up, easing along as it fills. */
export function Rail({ value }: { value: number }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const at = useSharedValue(value);
  useEffect(() => {
    at.set(reduce ? value : withTiming(value, { duration: 450 }));
  }, [value, at, reduce]);
  const fill = useAnimatedStyle(() => ({ width: `${Math.max(0.04, Math.min(1, at.value)) * 100}%` }));
  return (
    <ThemedView style={[styles.rail, { backgroundColor: c.surfaceHigh }]}>
      <Animated.View style={[styles.railFill, { backgroundColor: c.accent }, fill]} />
    </ThemedView>
  );
}

/** One answer: a calm card, tinted with a mark when chosen. Single choices show a dot, multiple choices a check. */
export function ChoiceCard({
  label,
  detail,
  selected,
  onPress,
  multi,
  disabled,
  large,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
  multi?: boolean;
  disabled?: boolean;
  large?: boolean;
}) {
  const { c } = useTheme();
  const press = usePressDim();
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={disabled}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected, disabled }}
      accessibilityLabel={detail ? `${label}. ${detail}` : label}
      style={disabled && { opacity: 0.4 }}
    >
      <Animated.View style={press.style}>
        <ThemedView
          style={[
            styles.card,
            large && styles.cardLarge,
            {
              backgroundColor: selected ? c.accentSoft : c.surface,
              borderColor: selected ? c.accentInk : 'transparent',
            },
          ]}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <T v={large ? 'heading' : 'bodyStrong'}>{label}</T>
            {detail ? (
              <T v="caption" color={c.textDim}>
                {detail}
              </T>
            ) : null}
          </View>
          <Mark on={selected} multi={multi} />
        </ThemedView>
      </Animated.View>
    </Pressable>
  );
}

function Mark({ on, multi }: { on: boolean; multi?: boolean }) {
  const { c } = useTheme();
  return (
    <ThemedView
      style={[
        multi ? styles.markSquare : styles.mark,
        { borderColor: on ? c.accent : c.border, backgroundColor: on ? c.accent : 'transparent' },
      ]}
    >
      {on ? (
        <Animated.View entering={ZoomIn.duration(180).reduceMotion(sys)}>
          <Ionicons name="checkmark" size={15} color={c.onAccent} />
        </Animated.View>
      ) : null}
    </ThemedView>
  );
}

/** A row of short answers side by side (e.g. active days), each a tall tile with a big label. */
export function TileRow<K extends string>({
  items,
  value,
  onPick,
}: {
  items: { id: K; label: string; detail?: string }[];
  value: K | undefined;
  onPick: (id: K) => void;
}) {
  return (
    <View style={styles.tileRow}>
      {items.map((x) => (
        <NumberTile key={x.id} label={x.label} detail={x.detail} on={value === x.id} onPress={() => onPick(x.id)} />
      ))}
    </View>
  );
}

function NumberTile({
  label,
  detail,
  on,
  onPress,
}: {
  label: string;
  detail?: string;
  on: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const press = usePressDim();
  return (
    <Pressable
      style={{ flex: 1 }}
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={detail ? `${label} ${detail}` : label}
    >
      <Animated.View style={press.style}>
        <ThemedView
          style={[
            styles.numberTile,
            { backgroundColor: on ? c.accent : c.surface, borderColor: on ? c.accent : 'transparent' },
          ]}
        >
          <T v="title" color={on ? c.onAccent : c.text}>
            {label}
          </T>
          {detail ? (
            <T v="caption" color={on ? c.onAccent : c.textDim}>
              {detail}
            </T>
          ) : null}
        </ThemedView>
      </Animated.View>
    </Pressable>
  );
}

/**
 * A scale of set stops (time a day, a wake-up time): the chosen value large above a track; tap or drag along it,
 * or use the buttons. Nothing is chosen until the person chooses. Adjustable for screen readers.
 */
export function StopScale({
  stops,
  index,
  onChange,
  label,
  empty = '—',
}: {
  stops: string[];
  index: number | null;
  onChange: (i: number) => void;
  /** What it measures, for screen readers. */
  label: string;
  empty?: string;
}) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  const last = stops.length - 1;
  useEffect(() => {
    if (index === null || !w) return;
    const to = (index / last) * w;
    x.set(reduce ? to : withSpring(to, { damping: 20, stiffness: 220 }));
  }, [index, w, last, x, reduce]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const fill = useAnimatedStyle(() => ({ width: x.value }));

  const set = (i: number) => {
    const n = Math.max(0, Math.min(last, i));
    if (n === index) return;
    haptic.tap();
    onChange(n);
  };
  const at = (px: number) => set(Math.round((Math.max(0, Math.min(w, px)) / (w || 1)) * last));

  return (
    <View style={{ gap: space.xl }}>
      <View style={styles.scaleTop}>
        <StepButton icon="remove" label="Less" disabled={index === 0} onPress={() => set((index ?? 1) - 1)} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Animated.View key={index ?? -1} entering={FadeIn.duration(160).reduceMotion(sys)}>
            <T v="display" color={index === null ? c.textFaint : c.text} style={{ textAlign: 'center' }}>
              {index === null ? empty : stops[index]}
            </T>
          </Animated.View>
        </View>
        <StepButton
          icon="add"
          label="More"
          disabled={index === last}
          onPress={() => set(index === null ? Math.floor(last / 2) : index + 1)}
        />
      </View>
      <View
        style={styles.track}
        onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => at(e.nativeEvent.locationX)}
        onResponderMove={(e) => at(e.nativeEvent.locationX)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ text: index === null ? 'Not chosen' : stops[index] }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) =>
          e.nativeEvent.actionName === 'increment'
            ? set(index === null ? 0 : index + 1)
            : set(index === null ? 0 : index - 1)
        }
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <ThemedView style={[styles.trackLine, { backgroundColor: c.surfaceHigh }]} />
          {index !== null ? <Animated.View style={[styles.trackLine, { backgroundColor: c.accent }, fill]} /> : null}
          {stops.map((s, i) => (
            <ThemedView
              key={s}
              style={[
                styles.stop,
                {
                  left: (i / last) * w - 3,
                  backgroundColor: index !== null && i <= index ? c.accent : c.border,
                },
              ]}
            />
          ))}
          {index !== null ? (
            <Animated.View style={[styles.thumbWrap, thumb]}>
              <ThemedView style={[styles.thumb, { backgroundColor: c.accent, borderColor: c.bg }]} />
            </Animated.View>
          ) : null}
        </View>
      </View>
      <View style={styles.scaleEnds} pointerEvents="none">
        <T v="caption" color={c.textFaint}>
          {stops[0]}
        </T>
        <T v="caption" color={c.textFaint}>
          {stops[last]}
        </T>
      </View>
    </View>
  );
}

function StepButton({
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
  const press = usePressDim();
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      style={disabled && { opacity: 0.3 }}
    >
      <Animated.View style={press.style}>
        <ThemedView style={[styles.round, { backgroundColor: c.surface }]}>
          <Ionicons name={icon} size={22} color={c.text} />
        </ThemedView>
      </Animated.View>
    </Pressable>
  );
}

/** A small number with − and + (Strength's own sessions a week). */
export function Stepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const { c } = useTheme();
  const set = (n: number) => {
    haptic.tap();
    onChange(Math.max(min, Math.min(max, n)));
  };
  return (
    <View
      style={styles.stepper}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => set(e.nativeEvent.actionName === 'increment' ? value + 1 : value - 1)}
    >
      <T v="caption" color={c.textDim} style={{ flex: 1 }}>
        {label}
      </T>
      <StepButton icon="remove" label="Fewer" disabled={value <= min} onPress={() => set(value - 1)} />
      <T v="heading" style={{ minWidth: 24, textAlign: 'center' }}>
        {value}
      </T>
      <StepButton icon="add" label="More" disabled={value >= max} onPress={() => set(value + 1)} />
    </View>
  );
}

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
    ? ['rgba(17,17,22,0)', 'rgba(17,17,22,0.7)', 'rgba(17,17,22,0.95)']
    : ['rgba(247,246,251,0)', 'rgba(247,246,251,0.72)', 'rgba(247,246,251,0.96)'];
}

/** A habit to choose: its scene, its name over a veil, a check when chosen; dimmed with why when it isn't for you. */
export function HabitTile({
  id,
  width,
  selected,
  suggested,
  reason,
  full,
  onPress,
}: {
  id: string;
  width: number;
  selected: boolean;
  suggested: boolean;
  reason: string | null;
  /** Six chosen already: this one can't join until one leaves. */
  full: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const veil = useVeil();
  const press = usePressDim();
  const height = Math.round(width * 1.12);
  const ring = useSharedValue(selected ? 1 : 0);
  const reduce = useReducedMotion();
  useEffect(() => {
    ring.set(reduce ? (selected ? 1 : 0) : withTiming(selected ? 1 : 0, { duration: 200 }));
  }, [selected, ring, reduce]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: ring.value }));
  const off = !!reason;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: off || (full && !selected) }}
      accessibilityLabel={`${P.habitName(id)}. ${P.habitDescription(id)}${suggested && !off ? '. Suggested' : ''}`}
      accessibilityHint={off ? `Not available: ${reason}` : undefined}
    >
      <Animated.View style={[{ width, height }, press.style]}>
        <View style={[styles.tile, { opacity: off ? 0.38 : full && !selected ? 0.6 : 1 }]}>
          <HabitArt id={id} width={width} height={height} />
          <LinearGradient colors={veil} locations={[0.3, 0.68, 1]} style={StyleSheet.absoluteFill} />
          {suggested && !off ? (
            <View style={[styles.badge, { backgroundColor: c.bg }]}>
              <T v="overline" color={c.accentInk} style={{ fontSize: 10, letterSpacing: 0.8 }}>
                Suggested
              </T>
            </View>
          ) : null}
          <View style={styles.tileText}>
            <T v="bodyStrong" numberOfLines={2} style={{ lineHeight: 21 }}>
              {P.habitName(id)}
            </T>
            <T v="caption" color={c.textDim} numberOfLines={2} style={{ fontSize: 12, lineHeight: 16 }}>
              {off ? `Not for now: ${reason}` : P.habitDescription(id)}
            </T>
          </View>
        </View>
        <Animated.View pointerEvents="none" style={[styles.tileRing, { borderColor: c.accent }, ringStyle]} />
        {selected ? (
          <Animated.View
            entering={ZoomIn.springify().damping(14).reduceMotion(sys)}
            style={[styles.tick, { backgroundColor: c.accent }]}
          >
            <Ionicons name="checkmark" size={16} color={c.onAccent} />
          </Animated.View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/** One habit's starting intensity: its scene, the three intensities, and what that means each day. */
export function LevelRow({
  id,
  answers,
  chosen,
  onChoose,
  own,
  setOwn,
  onRemove,
}: {
  id: string;
  answers: P.PilotAnswers;
  chosen: Intensity | null;
  onChoose: (i: Intensity) => void;
  own: number;
  setOwn: (n: number) => void;
  onRemove: () => void;
}) {
  const { c } = useTheme();
  const reason = P.habitExclusion(id, answers);
  const options = P.intensityOptions(id, answers);
  const preview = chosen && !reason ? P.previewTarget(id, chosen, answers) : null;
  return (
    <ThemedView style={[styles.level, { backgroundColor: c.surface }]}>
      <View style={styles.levelHead}>
        <View style={styles.thumbArt}>
          <HabitArt id={id} width={56} height={56} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="bodyStrong">{P.habitName(id)}</T>
          {preview ? (
            <Animated.View key={chosen} entering={FadeIn.duration(200).reduceMotion(sys)}>
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
          <Pressable onPress={onRemove} accessibilityRole="button" hitSlop={8}>
            <T v="bodyStrong" color={c.accentInk}>
              Remove it
            </T>
          </Pressable>
        </View>
      ) : (
        <>
          <ThemedView style={[styles.segment, { backgroundColor: c.surfaceHigh }]} accessibilityRole="radiogroup">
            {INTENSITIES.map((i) => {
              const blocked = options.find((o) => o.intensity === i)?.reason;
              const on = chosen === i;
              return (
                <Pressable
                  key={i}
                  style={{ flex: 1 }}
                  disabled={!!blocked}
                  onPress={() => {
                    haptic.tap();
                    onChoose(i);
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, disabled: !!blocked }}
                  accessibilityHint={blocked ? `Not available: ${blocked}` : undefined}
                >
                  <ThemedView
                    style={[
                      styles.segmentItem,
                      { backgroundColor: on ? c.surface : 'transparent', opacity: blocked ? 0.35 : 1 },
                    ]}
                  >
                    <T v="caption" color={on ? c.text : c.textDim} style={{ fontWeight: on ? '700' : '600' }}>
                      {P.INTENSITY_NAME[i]}
                    </T>
                  </ThemedView>
                </Pressable>
              );
            })}
          </ThemedView>
          {id === 'strength_log' && chosen === 'challenge' ? (
            <Stepper label="Sessions a week you already do" value={own} min={2} max={7} onChange={setOwn} />
          ) : null}
        </>
      )}
    </ThemedView>
  );
}

/**
 * Into the app: the world clears, and Day 1 rises out of the fog with the habits it holds. Not the Day 1
 * ceremony: a moment, then the Habits tab. `onDone` runs once it has been seen.
 */
export function DayOneTransition({ habits, onDone }: { habits: string[]; onDone: () => void }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  useEffect(() => {
    const t = setTimeout(onDone, reduce ? 1200 : 2400);
    return () => clearTimeout(t);
  }, [onDone, reduce]);
  return (
    <Animated.View
      entering={FadeIn.duration(700).reduceMotion(sys)}
      style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}
      accessibilityViewIsModal
      accessibilityLiveRegion="polite"
    >
      <WorldBackdrop zoneTop={insets.top + space.xxxl} />
      <View style={[styles.dayOne, { paddingBottom: insets.bottom + space.xxxl }]}>
        <Animated.View entering={FadeInDown.delay(450).duration(700).reduceMotion(sys)} style={{ gap: space.xs }}>
          <T v="overline" color={c.accentInk} style={{ letterSpacing: 3 }}>
            Your Life Reset begins
          </T>
          <T v="display" style={{ fontSize: 64, lineHeight: 68 }} accessibilityRole="header">
            Day 1
          </T>
          <T color={c.textDim}>of 66. One small step at a time.</T>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(1000).duration(600).reduceMotion(sys)} style={styles.dayOneArt}>
          {habits.map((id) => (
            <View key={id} style={[styles.dayOneThumb, { borderColor: c.bg }]}>
              <HabitArt id={id} width={44} height={44} />
            </View>
          ))}
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  question: { gap: space.xl },
  big: { fontSize: 32, lineHeight: 38 },
  rail: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  railFill: { height: 4, borderRadius: 2 },
  card: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  cardLarge: { minHeight: 68 },
  mark: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  markSquare: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileRow: { flexDirection: 'row', gap: space.sm },
  numberTile: {
    minHeight: 96,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  scaleTop: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  round: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  track: { height: 36, marginHorizontal: space.md, justifyContent: 'center' },
  trackLine: { position: 'absolute', left: 0, top: 16, height: 4, borderRadius: 2, right: 0 },
  stop: { position: 'absolute', top: 15, width: 6, height: 6, borderRadius: 3 },
  thumbWrap: { position: 'absolute', left: -14, top: 4 },
  thumb: { width: 28, height: 28, borderRadius: 14, borderWidth: 3 },
  scaleEnds: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: space.xs },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  tile: { flex: 1, borderRadius: radius.lg, overflow: 'hidden' },
  tileRing: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, borderRadius: radius.lg, borderWidth: 2.5 },
  tileText: { position: 'absolute', left: space.md, right: space.md, bottom: space.md, gap: 2 },
  badge: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
    opacity: 0.88,
  },
  tick: {
    position: 'absolute',
    top: space.sm,
    right: space.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  level: { borderRadius: radius.lg, padding: space.md, gap: space.md },
  levelHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  thumbArt: { width: 56, height: 56, borderRadius: radius.sm, overflow: 'hidden' },
  segment: { flexDirection: 'row', borderRadius: radius.sm + 2, padding: 3 },
  segmentItem: { minHeight: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  dayOne: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: space.xl, gap: space.xl },
  dayOneArt: { flexDirection: 'row' },
  dayOneThumb: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, overflow: 'hidden', marginRight: -10 },
});
