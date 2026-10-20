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
        <View
          style={[styles.center, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.accentSoft }]}
        >
          <View
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
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

function Orbit({
  size,
  duration,
  dot,
  reverse,
  delay = 0,
}: {
  size: number;
  duration: number;
  dot: number;
  reverse?: boolean;
  delay?: number;
}) {
  const { c } = useTheme();
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.set(withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false)));
  }, [spin, duration, delay]);
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(reverse ? -1 : 1) * spin.value * 360}deg` }],
  }));
  return (
    <Animated.View
      style={[
        styles.abs,
        { width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: c.border },
        style,
      ]}
    >
      <View
        style={{
          position: 'absolute',
          top: -dot / 2,
          left: size / 2 - dot / 2,
          width: dot,
          height: dot,
          borderRadius: dot / 2,
          backgroundColor: c.accent,
        }}
      />
    </Animated.View>
  );
}

/** Welcome illustration: a glowing core with habits orbiting it. Momentum, literally. */
export function MomentumHero({ size = 220 }: { size?: number }) {
  const { c } = useTheme();
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.set(withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [breathe]);
  const glow = useAnimatedStyle(() => ({
    opacity: 0.35 + breathe.value * 0.35,
    transform: [{ scale: 0.9 + breathe.value * 0.15 }],
  }));
  const core = size * 0.26;
  return (
    <View style={[styles.center, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.abs,
          { width: core * 2.2, height: core * 2.2, borderRadius: core * 1.1, backgroundColor: c.accentSoft },
          glow,
        ]}
      />
      <Orbit size={size} duration={14000} dot={8} />
      <Orbit size={size * 0.72} duration={9000} dot={10} reverse delay={200} />
      <Orbit size={size * 0.46} duration={6000} dot={7} delay={400} />
      <View
        style={{
          width: core,
          height: core,
          borderRadius: core / 2,
          backgroundColor: c.accent,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: c.accent,
          shadowOpacity: 0.8,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 0 },
        }}
      >
        <Ionicons name="trending-up" size={core * 0.5} color={c.onAccent} />
      </View>
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
  const palette = colors ?? [c.accent, c.accentInk, c.warm, c.text];
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
