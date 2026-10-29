import { ReactNode, useEffect } from 'react';
import { Pressable, StyleProp, StyleSheet, TextProps, View, ViewStyle } from 'react-native';
import Animated, { Easing, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { haptic } from '../lib/haptics';
import { radius, space, type, useTheme } from '../theme';
import { ThemedView, useThemedColors } from '../theme/transition';

type Variant = keyof typeof type;

export function T({ v = 'body', color, style, ...rest }: TextProps & { v?: Variant; color?: string }) {
  const { c } = useTheme();
  const col = color ?? c.text;
  // Palette colors fade with the theme; anything else (ceremony, overlays) is used as-is.
  const fade = useThemedColors({ color: col });
  return <Animated.Text {...rest} style={[type[v], { color: col }, style, fade]} />;
}

export function Screen({
  children,
  edges = ['top', 'bottom'],
  style,
  backdrop,
  transparent = false,
}: {
  children: ReactNode;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  /** Drawn behind everything, edge to edge (under the status bar too), e.g. the world. */
  backdrop?: ReactNode;
  /** No background of its own: something behind the screen (the tabs' shared world) shows through. */
  transparent?: boolean;
}) {
  const { c } = useTheme();
  return (
    <ThemedView style={{ flex: 1, backgroundColor: transparent ? 'transparent' : c.bg }}>
      {backdrop}
      <SafeAreaView edges={edges} style={[{ flex: 1 }, style]}>
        {children}
      </SafeAreaView>
    </ThemedView>
  );
}

type ButtonProps = {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: ReactNode;
};

export function Button({ label, onPress, kind = 'primary', disabled, style, icon }: ButtonProps) {
  const { c } = useTheme();
  // Press feedback: the button's shape gives a little and eases back; its label is never scaled (a transformed
  // text layer is redrawn as a blurry bitmap on iOS), it only dims a touch.
  const pressed = useSharedValue(0);
  const anim = useAnimatedStyle(() => ({ opacity: 1 - pressed.value * 0.1 }));
  const give = useAnimatedStyle(() => ({
    transform: [{ scaleX: 1 - pressed.value * 0.03 }, { scaleY: 1 - pressed.value * 0.06 }],
  }));
  const bg = kind === 'primary' ? c.accent : kind === 'secondary' ? c.surfaceHigh : 'transparent';
  const fg = kind === 'primary' ? c.onAccent : kind === 'danger' ? c.danger : kind === 'ghost' ? c.textDim : c.text;
  const fade = useThemedColors({ backgroundColor: bg });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={() => pressed.set(withTiming(1, { duration: 70, reduceMotion: ReduceMotion.System }))}
      onPressOut={() =>
        pressed.set(withTiming(0, { duration: 240, easing: PRESS_OUT, reduceMotion: ReduceMotion.System }))
      }
      onPress={() => {
        // The action first: if it confirms or succeeds, that haptic stands alone (lib/haptics).
        onPress();
        haptic.select();
      }}
      // The disabled dim sits on the Pressable: on the animated view it was overridden by the press opacity.
      style={[style, disabled && styles.disabled]}
    >
      <Animated.View style={[styles.button, kind === 'ghost' && { minHeight: 44 }, anim]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backing, { backgroundColor: bg }, give, fade]} />
        {icon}
        <T v="bodyStrong" color={fg}>
          {label}
        </T>
      </Animated.View>
    </Pressable>
  );
}

export function ProgressBar({ value, height = 6, color }: { value: number; height?: number; color?: string }) {
  const { c } = useTheme();
  const progress = useSharedValue(value);
  useEffect(() => {
    // Eases to its new value: a quick start that settles softly.
    progress.set(
      withTiming(Math.max(0, Math.min(1, value)), { duration: 520, easing: SETTLE, reduceMotion: ReduceMotion.System }),
    );
  }, [value, progress]);
  const anim = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  const fill = color ?? c.accent;
  const fillFade = useThemedColors({ backgroundColor: fill });
  return (
    <ThemedView style={{ height, borderRadius: height, backgroundColor: c.surfaceHigh, overflow: 'hidden' }}>
      <Animated.View style={[{ height, borderRadius: height, backgroundColor: fill }, anim, fillFade]} />
    </ThemedView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <ThemedView style={[{ backgroundColor: c.surface, borderRadius: radius.lg, padding: space.lg }, style]}>
      {children}
    </ThemedView>
  );
}

export function LevelPips({ level }: { level: 'easy' | 'medium' | 'hard' }) {
  const { c } = useTheme();
  const n = level === 'easy' ? 1 : level === 'medium' ? 2 : 3;
  return (
    <View style={styles.pips} accessibilityLabel={`Level ${level}`}>
      {[0, 1, 2].map((i) => (
        <ThemedView
          key={i}
          style={[styles.pip, { height: 6 + i * 3, backgroundColor: i < n ? c.accentInk : c.border }]}
        />
      ))}
    </View>
  );
}

export const LEVEL_LABEL = { easy: 'Lv 1', medium: 'Lv 2', hard: 'Lv 3' } as const;

const SETTLE = Easing.bezier(0.22, 1, 0.36, 1);
const PRESS_OUT = Easing.out(Easing.cubic);

const styles = StyleSheet.create({
  disabled: { opacity: 0.4 },
  backing: { borderRadius: radius.md },
  button: {
    minHeight: 56,
    borderRadius: radius.md,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  pips: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  pip: { width: 4, borderRadius: 2 },
});
