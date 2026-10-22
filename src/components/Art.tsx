import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

type IconName = keyof typeof Ionicons.glyphMap;

/**
 * Illustrations are drawn in code (views + icons) rather than shipped as images:
 * crisp at any size, theme-aware, and nothing to download or decode.
 */

/** A glowing orb with an icon that gently floats and pulses. */
export function IconOrb({ icon, size = 96, color }: { icon: IconName; size?: number; color?: string }) {
  const { c } = useTheme();
  const accent = color ?? c.accent;
  const float = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    float.set(withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true));
    pulse.set(withRepeat(withTiming(1, { duration: 2200, easing: Easing.out(Easing.quad) }), -1, false));
  }, [float, pulse]);

  const floatStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -4 + float.value * 8 }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - pulse.value),
    transform: [{ scale: 1 + pulse.value * 0.45 }],
  }));

  const core = size * 0.66;
  return (
    <View style={{ width: size * 1.5, height: size * 1.5, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          styles.abs,
          { width: size, height: size, borderRadius: size / 2, borderWidth: 1.5, borderColor: accent },
          ringStyle,
        ]}
      />
      <Animated.View style={[styles.center, floatStyle]}>
        <ThemedView
          style={[styles.center, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.accentSoft }]}
        >
          <ThemedView
            style={[
              styles.center,
              {
                width: core,
                height: core,
                borderRadius: core / 2,
                backgroundColor: accent,
                shadowColor: accent,
                shadowOpacity: 0.6,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 0 },
              },
            ]}
          >
            <Ionicons name={icon} size={core * 0.5} color={c.onAccent} />
          </ThemedView>
        </ThemedView>
      </Animated.View>
    </View>
  );
}

const PARTICLES = 26;

/** Deterministic 0..1 noise, so the burst looks random but renders purely. */
function noise(i: number, k: number): number {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function Particle({
  angle,
  distance,
  color,
  size,
  delay,
  square,
}: {
  angle: number;
  distance: number;
  color: string;
  size: number;
  delay: number;
  square: boolean;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withDelay(delay, withTiming(1, { duration: 1100, easing: Easing.out(Easing.cubic) })));
  }, [t, delay]);
  const style = useAnimatedStyle(() => {
    const p = t.value;
    return {
      opacity: p === 0 ? 0 : 1 - p * p,
      transform: [
        { translateX: Math.cos(angle) * distance * p },
        { translateY: Math.sin(angle) * distance * p + 90 * p * p }, // a little gravity
        { rotate: `${p * 540}deg` },
        { scale: 1 - p * 0.4 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.abs,
        {
          width: size,
          height: square ? size : size * 0.45,
          borderRadius: square ? size / 2 : 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/** One-shot burst. Re-mount (change `key`) to fire again. */
export function Confetti({ colors, spread = 160 }: { colors?: string[]; spread?: number }) {
  const { c } = useTheme();
  // Everyday celebrations stay on-brand; gold is passed in only for milestones.
  const palette = colors ?? [c.accent, c.accentInk, c.accentLight, c.text];
  const parts = Array.from({ length: PARTICLES }, (_, i) => ({
    angle: (i / PARTICLES) * Math.PI * 2 + noise(i, 1) * 0.4,
    distance: spread * (0.55 + noise(i, 2) * 0.6),
    size: 6 + noise(i, 3) * 6,
    delay: noise(i, 4) * 80,
    square: noise(i, 5) > 0.5,
    color: palette[i % palette.length],
  }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
      {parts.map((p, i) => (
        <Particle key={i} {...p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
  center: { alignItems: 'center', justifyContent: 'center' },
});
