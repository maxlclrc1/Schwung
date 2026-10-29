import { Ionicons } from '@expo/vector-icons';
import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { haptic } from '../../lib/haptics';
import { radius, space, useTheme } from '../../theme';
import { T } from '../ui';
import { settle, type Tint } from './kit';

type Icon = ComponentProps<typeof Ionicons>['name'];

/** A pressable that dims under the finger (text is never scaled: it blurs on iOS) and ticks. */
export function Press({
  onPress,
  children,
  style,
  disabled,
  ...a11y
}: {
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
} & Pick<
  ComponentProps<typeof Pressable>,
  | 'accessibilityRole'
  | 'accessibilityState'
  | 'accessibilityLabel'
  | 'accessibilityHint'
  | 'accessibilityElementsHidden'
  | 'importantForAccessibility'
>) {
  const down = useSharedValue(0);
  const dim = useAnimatedStyle(() => ({ opacity: 1 - down.value * 0.28 }));
  return (
    <Pressable
      {...a11y}
      disabled={disabled}
      onPressIn={() => down.set(withTiming(1, { duration: 60 }))}
      onPressOut={() => down.set(withTiming(0, { duration: 200 }))}
      onPress={() => {
        onPress();
        haptic.select();
      }}
      style={style}
    >
      <Animated.View style={dim}>{children}</Animated.View>
    </Pressable>
  );
}

/** 0 → 1 as `on` turns true, on the shared curve. */
function useOn(on: boolean) {
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    v.set(settle(on ? 1 : 0));
  }, [on, v]);
  return v;
}

/**
 * A round token with an icon and a few words (things to keep in mind). Chosen, it takes the tint and its icon
 * turns into a check with a small quarter turn.
 */
export function Token({
  label,
  icon,
  on,
  tint,
  onPress,
  multi = true,
}: {
  label: string;
  icon: Icon;
  on: boolean;
  tint: Tint;
  onPress: () => void;
  multi?: boolean;
}) {
  const { c } = useTheme();
  const t = useOn(on);
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [c.surface, tint.soft]),
  }));
  const bubble = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [tint.soft, tint.fill]),
  }));
  const before = useAnimatedStyle(() => ({
    opacity: 1 - t.value,
    transform: [{ rotate: `${t.value * 90}deg` }],
  }));
  const after = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ rotate: `${(t.value - 1) * 90}deg` }],
  }));
  return (
    <Press
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.token, box]}>
        <Animated.View style={[styles.bubble, bubble]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.mid, before]}>
            <Ionicons name={icon} size={18} color={tint.ink} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.mid, after]}>
            <Ionicons name="checkmark" size={18} color={tint.on} />
          </Animated.View>
        </Animated.View>
        <T v="bodyStrong" color={on ? tint.ink : c.text} style={styles.tokenText}>
          {label}
        </T>
      </Animated.View>
    </Press>
  );
}

/** Icon badges in a centred grid (which skill): the badge fills and its icon tilts in when chosen. */
export function IconTiles<K extends string>({
  items,
  value,
  onPick,
  tint,
}: {
  items: { id: K; label: string; icon: Icon }[];
  value: K | undefined;
  onPick: (id: K) => void;
  tint: Tint;
}) {
  return (
    <View style={styles.tiles} accessibilityRole="radiogroup">
      {items.map((x) => (
        <IconTile
          key={x.id}
          label={x.label}
          icon={x.icon}
          on={value === x.id}
          tint={tint}
          onPress={() => onPick(x.id)}
        />
      ))}
    </View>
  );
}

function IconTile({
  label,
  icon,
  on,
  tint,
  onPress,
}: {
  label: string;
  icon: Icon;
  on: boolean;
  tint: Tint;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const t = useOn(on);
  const disc = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [tint.soft, tint.fill]),
    transform: [{ rotate: `${interpolate(t.value, [0, 1], [0, -8])}deg` }],
  }));
  const dim = useAnimatedStyle(() => ({ opacity: 1 - t.value }));
  const lit = useAnimatedStyle(() => ({ opacity: t.value }));
  return (
    <Press
      onPress={onPress}
      style={styles.tile}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={label}
    >
      <View style={styles.tileInner}>
        <Animated.View style={[styles.disc, disc]}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.mid, dim]}>
            <Ionicons name={icon} size={26} color={tint.ink} />
          </Animated.View>
          <Animated.View style={[StyleSheet.absoluteFill, styles.mid, lit]}>
            <Ionicons name={icon} size={26} color={tint.on} />
          </Animated.View>
        </Animated.View>
        <T v="caption" color={on ? tint.ink : c.text} style={styles.tileText}>
          {label}
        </T>
      </View>
    </Press>
  );
}

/**
 * Three steps of a staircase, each higher than the last (where you're starting from). The chosen step fills, and
 * a marker settles on top of it.
 */
export function Stairs<K extends string>({
  items,
  value,
  onPick,
  tint,
}: {
  items: { id: K; label: string; detail: string }[];
  value: K | undefined;
  onPick: (id: K) => void;
  tint: Tint;
}) {
  return (
    <View style={styles.stairs} accessibilityRole="radiogroup">
      {items.map((x, i) => (
        <Stair
          key={x.id}
          height={64 + i * 44}
          label={x.label}
          detail={x.detail}
          on={value === x.id}
          tint={tint}
          onPress={() => onPick(x.id)}
        />
      ))}
    </View>
  );
}

function Stair({
  height,
  label,
  detail,
  on,
  tint,
  onPress,
}: {
  height: number;
  label: string;
  detail: string;
  on: boolean;
  tint: Tint;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const t = useOn(on);
  const block = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(t.value, [0, 1], [tint.soft, tint.fill]),
  }));
  const marker = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: (1 - t.value) * -8 }],
  }));
  return (
    <Press
      onPress={onPress}
      style={{ flex: 1 }}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      accessibilityLabel={`${label}. ${detail}`}
    >
      <View style={styles.stair}>
        <Animated.View style={[styles.marker, { backgroundColor: tint.fill, borderColor: c.bg }, marker]} />
        <Animated.View style={[styles.block, { height }, block]} />
        <T v="bodyStrong" color={on ? tint.ink : c.text} style={styles.center}>
          {label}
        </T>
        <T v="caption" color={c.textDim} style={styles.center}>
          {detail}
        </T>
      </View>
    </Press>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** A peak for each intensity: a hill, a mountain, a high summit with snow. */
const PEAKS = [
  { ridge: 'M2 46 C 18 30, 30 24, 41 24 C 52 24, 64 30, 80 46 Z', snow: null },
  { ridge: 'M2 46 L 28 22 L 36 27 L 47 12 L 80 46 Z', snow: 'M41 18 L 47 12 L 52 17 L 48 19 L 45 17 Z' },
  {
    ridge: 'M2 46 L 22 30 L 30 33 L 46 3 L 62 28 L 70 24 L 80 46 Z',
    snow: 'M40 14 L 46 3 L 52 14 L 48 12 L 45 16 L 43 13 Z',
  },
];

/**
 * One habit's starting intensity, drawn as three peaks of rising height rather than a switch: the chosen one fills
 * with colour, the others stay as outlines; one the rules don't allow is faint and can't be chosen.
 */
export function PeakPicker<K extends string>({
  options,
  value,
  onPick,
  tints,
}: {
  options: { id: K; label: string; blocked: string | null }[];
  value: K | null;
  onPick: (id: K) => void;
  tints: Tint[];
}) {
  return (
    <View style={styles.peaks} accessibilityRole="radiogroup">
      {options.map((o, i) => (
        <Peak
          key={o.id}
          shape={PEAKS[i]}
          label={o.label}
          blocked={o.blocked}
          on={value === o.id}
          tint={tints[i]}
          onPress={() => onPick(o.id)}
        />
      ))}
    </View>
  );
}

function Peak({
  shape,
  label,
  blocked,
  on,
  tint,
  onPress,
}: {
  shape: (typeof PEAKS)[number];
  label: string;
  blocked: string | null;
  on: boolean;
  tint: Tint;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const t = useOn(on);
  const fill = useAnimatedProps(() => ({ fillOpacity: t.value }));
  const snow = useAnimatedProps(() => ({ fillOpacity: t.value * 0.9 }));
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: -3 * t.value }] }));
  return (
    <Press
      onPress={onPress}
      disabled={!!blocked}
      style={[{ flex: 1 }, blocked ? { opacity: 0.35 } : null]}
      accessibilityRole="radio"
      accessibilityState={{ checked: on, disabled: !!blocked }}
      accessibilityLabel={label}
      accessibilityHint={blocked ? `Not available: ${blocked}` : undefined}
    >
      <View style={[styles.peak, { backgroundColor: on ? tint.soft : 'transparent' }]}>
        <Animated.View style={lift}>
          <Svg width={82} height={48} viewBox="0 0 82 48">
            <AnimatedPath
              d={shape.ridge}
              fill={tint.fill}
              animatedProps={fill}
              stroke={on ? tint.fill : c.textFaint}
              strokeWidth={1.5}
              strokeLinejoin="round"
              strokeDasharray={blocked ? '3 3' : undefined}
            />
            {shape.snow ? <AnimatedPath d={shape.snow} fill="#FFFFFF" animatedProps={snow} /> : null}
          </Svg>
        </Animated.View>
        <T v="caption" color={on ? tint.ink : c.textDim} style={{ fontWeight: on ? '700' : '600' }}>
          {label}
        </T>
      </View>
    </Press>
  );
}

/** A quiet, rounded answer that isn't one of the main ones ("None of these", "I work shifts"). */
export function SoftChoice({
  label,
  icon,
  on,
  tint,
  onPress,
}: {
  label: string;
  icon?: Icon;
  on: boolean;
  tint: Tint;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Press onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={label}>
      <View style={[styles.soft, { backgroundColor: on ? tint.fill : c.surface }]}>
        {icon ? <Ionicons name={on ? 'checkmark' : icon} size={18} color={on ? tint.on : c.textDim} /> : null}
        <T v="bodyStrong" color={on ? tint.on : c.text}>
          {label}
        </T>
      </View>
    </Press>
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
  const set = (n: number) => onChange(Math.max(min, Math.min(max, n)));
  const button = (icon: 'add' | 'remove', to: number, off: boolean) => (
    <Press
      onPress={() => set(to)}
      disabled={off}
      accessibilityRole="button"
      accessibilityLabel={icon === 'add' ? 'More' : 'Fewer'}
      style={off ? { opacity: 0.3 } : undefined}
    >
      <View style={[styles.stepButton, { backgroundColor: c.surfaceHigh }]}>
        <Ionicons name={icon} size={20} color={c.text} />
      </View>
    </Press>
  );
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
      {button('remove', value - 1, value <= min)}
      <T v="heading" style={{ minWidth: 24, textAlign: 'center' }}>
        {value}
      </T>
      {button('add', value + 1, value >= max)}
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  mid: { alignItems: 'center', justifyContent: 'center' },
  token: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 56,
    paddingLeft: space.sm,
    paddingRight: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.pill,
  },
  bubble: { width: 40, height: 40, borderRadius: 20 },
  tokenText: { flexShrink: 1 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: space.lg },
  tile: { width: '33.3%' },
  tileInner: { alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  disc: { width: 68, height: 68, borderRadius: 24 },
  tileText: { textAlign: 'center' },
  stairs: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  stair: { alignItems: 'stretch', gap: space.xs },
  block: { borderRadius: radius.md, marginBottom: space.sm },
  marker: { alignSelf: 'center', width: 18, height: 18, borderRadius: 9, borderWidth: 3, marginBottom: space.sm },
  center: { textAlign: 'center' },
  peaks: { flexDirection: 'row', gap: space.xs },
  peak: { alignItems: 'center', gap: space.xs, paddingTop: space.sm, paddingBottom: space.sm, borderRadius: radius.md },
  soft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
  },
});
