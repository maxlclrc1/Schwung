import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

const BEACON = require('../../assets/summit-beacon.png');

/** The painted beacon's size (pt): its bright point sits at the centre, on the summit. */
const SIZE = 56;
/** One slow breath every 7 s, about 12% in the light's intensity. The light itself never moves. */
const BREATH_MS = 3500;
const BREATH = 0.12;

/**
 * The summit's marker: the painted warm beacon (design/artwork-candidates/Warm Golden Beacon Glow.png), a single
 * amber point of light in a soft halo, like a distant lantern seen from below. Its light breathes almost
 * imperceptibly; with Reduce Motion it is still. A little quieter on the pale light-mode sky.
 * Decorative: the Ascent's own label describes the climb.
 */
export function SummitBeacon({ x, y, dark, animate }: { x: number; y: number; dark: boolean; animate: boolean }) {
  const breath = useSharedValue(0);
  const base = dark ? 1 : 0.85;

  useEffect(() => {
    if (!animate) {
      breath.set(0);
      return;
    }
    breath.set(withRepeat(withTiming(1, { duration: BREATH_MS, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [animate, breath]);

  const light = useAnimatedStyle(() => ({ opacity: base * (1 - BREATH * breath.get()) }));

  return (
    <Animated.View pointerEvents="none" style={[styles.box, { left: x - SIZE / 2, top: y - SIZE / 2 }, light]}>
      <Image source={BEACON} style={styles.box} contentFit="contain" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', width: SIZE, height: SIZE },
});
