import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

/** A five-point star in a 32-unit box, centred a touch low so it sits optically centred. */
const STAR =
  'M16.00,5.40 L18.65,12.96 L26.65,13.14 L20.28,17.99 L22.58,25.66 L16.00,21.10 L9.42,25.66 L11.72,17.99 L5.35,13.14 L13.35,12.96 Z';

/** Star and glow sizes (pt); the glow is drawn around the star, centred on the summit point. */
const STAR_SIZE = 26;
const GLOW_SIZE = 64;
/** The idle motion: a 1.5 pt drift and a slight breath of the glow, over a slow 3.6 s. */
const DRIFT = 1.5;
const IDLE_MS = 3600;

const TONES = {
  // Dark: a richer amber with a restrained warm glow.
  dark: { top: '#FFE3A6', mid: '#F2B84B', base: '#B5741A', edge: 'rgba(92,52,6,0.4)', glow: '#F2B84B', glowA: 0.34 },
  // Light: a softer gold, a lighter glow and a fine warm edge so it holds against the pale snow.
  light: { top: '#FFEBC0', mid: '#E9AE45', base: '#A86E10', edge: 'rgba(120,72,8,0.45)', glow: '#F0B75A', glowA: 0.3 },
};

/**
 * The summit marker: a small gold star with soft shading and a low warm glow, set into the painting at the top of
 * the climb. Almost still: it drifts a point or two and its glow breathes slowly. With Reduce Motion it is still.
 * Decorative: the Ascent's own label describes the climb.
 */
export function SummitStar({ x, y, dark, animate }: { x: number; y: number; dark: boolean; animate: boolean }) {
  const tone = dark ? TONES.dark : TONES.light;
  const idle = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      idle.set(0);
      return;
    }
    idle.set(withRepeat(withTiming(1, { duration: IDLE_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [animate, idle]);

  const float = useAnimatedStyle(() => ({ transform: [{ translateY: -DRIFT * idle.get() }] }));
  const breathe = useAnimatedStyle(() => ({ opacity: 0.8 + 0.2 * idle.get() }));

  const id = dark ? 'd' : 'l';
  return (
    <View pointerEvents="none" style={[styles.abs, { left: x - GLOW_SIZE / 2, top: y - GLOW_SIZE / 2 }]}>
      <Animated.View style={[styles.abs, breathe]}>
        <Svg width={GLOW_SIZE} height={GLOW_SIZE}>
          <Defs>
            <RadialGradient id={`glow-${id}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={tone.glow} stopOpacity={tone.glowA} />
              <Stop offset="0.45" stopColor={tone.glow} stopOpacity={tone.glowA * 0.4} />
              <Stop offset="1" stopColor={tone.glow} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 2} fill={`url(#glow-${id})`} />
        </Svg>
      </Animated.View>
      <Animated.View
        style={[styles.abs, { left: (GLOW_SIZE - STAR_SIZE) / 2, top: (GLOW_SIZE - STAR_SIZE) / 2 }, float]}
      >
        <Svg width={STAR_SIZE} height={STAR_SIZE} viewBox="0 0 32 32">
          <Defs>
            {/* Lit from the upper left, like the painting's sky: light to deep amber across the star. */}
            <LinearGradient id={`body-${id}`} x1="0.2" y1="0.1" x2="0.8" y2="0.95">
              <Stop offset="0" stopColor={tone.top} />
              <Stop offset="0.5" stopColor={tone.mid} />
              <Stop offset="1" stopColor={tone.base} />
            </LinearGradient>
            {/* A soft highlight, not a bevel: rounds the star's face a little. */}
            <RadialGradient id={`sheen-${id}`} cx="40%" cy="36%" r="45%">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
              <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          {/* A faint contact shade under the star, so it sits in the scene rather than on it. */}
          <Path d={STAR} fill="#000000" fillOpacity={dark ? 0.28 : 0.16} transform="translate(0.6,1.1)" />
          <Path d={STAR} fill={`url(#body-${id})`} stroke={tone.edge} strokeWidth={0.9} strokeLinejoin="round" />
          <Path d={STAR} fill={`url(#sheen-${id})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: 'absolute' },
});
