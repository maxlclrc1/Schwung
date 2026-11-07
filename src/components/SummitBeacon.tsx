import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

/** The beacon's sizes (pt): a small bright point, a close glow, and a wide, very faint halo. */
const CORE = 5;
const GLOW = 16;
const HALO = 46;
/** One slow breath every 7 s, about 12% in the light's intensity. The point itself never moves. */
const BREATH_MS = 3500;
const BREATH = 0.12;

const TONES = {
  // Dark: a warm amber lantern against the twilight.
  dark: { hot: '#FFF2D2', amber: '#F2B84B', haloA: 0.2, glowA: 0.55, ring: null },
  // Light: a deeper amber so the point holds on the pale snow, with a gentler halo.
  light: { hot: '#FFEBC2', amber: '#DE9530', haloA: 0.16, glowA: 0.45, ring: 'rgba(140,82,10,0.35)' },
};

/**
 * The summit's marker: a single amber point of light with an extremely subtle halo, like a distant lantern seen
 * from below. Its light breathes almost imperceptibly (one cycle every 7 s); with Reduce Motion it is still.
 * Decorative: the Ascent's own label describes the climb.
 */
export function SummitBeacon({ x, y, dark, animate }: { x: number; y: number; dark: boolean; animate: boolean }) {
  const tone = dark ? TONES.dark : TONES.light;
  const breath = useSharedValue(0);

  useEffect(() => {
    if (!animate) {
      breath.set(0);
      return;
    }
    breath.set(withRepeat(withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [animate, breath]);

  const light = useAnimatedStyle(() => ({ opacity: 1 - BREATH * breath.get() }));

  const id = dark ? 'd' : 'l';
  const c = HALO / 2;
  return (
    <View pointerEvents="none" style={[styles.box, { left: x - c, top: y - c }]}>
      <Animated.View style={[StyleSheet.absoluteFill, light]}>
        <Svg width={HALO} height={HALO}>
          <Defs>
            <RadialGradient id={`halo-${id}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={tone.amber} stopOpacity={tone.haloA} />
              <Stop offset="0.35" stopColor={tone.amber} stopOpacity={tone.haloA * 0.45} />
              <Stop offset="1" stopColor={tone.amber} stopOpacity={0} />
            </RadialGradient>
            <RadialGradient id={`glow-${id}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={tone.amber} stopOpacity={tone.glowA} />
              <Stop offset="1" stopColor={tone.amber} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={c} cy={c} r={c} fill={`url(#halo-${id})`} />
          <Circle cx={c} cy={c} r={GLOW / 2} fill={`url(#glow-${id})`} />
        </Svg>
      </Animated.View>
      <Svg width={HALO} height={HALO} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id={`core-${id}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={tone.hot} />
            <Stop offset="0.55" stopColor={tone.amber} />
            <Stop offset="1" stopColor={tone.amber} stopOpacity={0.85} />
          </RadialGradient>
        </Defs>
        {tone.ring ? <Circle cx={c} cy={c} r={CORE / 2 + 0.6} fill={tone.ring} /> : null}
        <Circle cx={c} cy={c} r={CORE / 2} fill={`url(#core-${id})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', width: HALO, height: HALO },
});
