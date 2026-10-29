import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import type { Collectible } from '../../core/reset/collection';
import { haptic } from '../../lib/haptics';
import { space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { rise } from '../onboarding/kit';
import { Button, T } from '../ui';
import { CollectibleArt } from './Collectible';

const sys = ReduceMotion.System;
const SETTLE = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * An object joins the collection: over Habits, a soft light gathers and the object rises into it, with its name,
 * the title that comes with it and its reflection. One quiet success haptic as it lands. Tap outside or Lovely to
 * close; See collection opens it. Reduce Motion shows it at once.
 */
export function UnlockMoment({ item, more, onClose }: { item: Collectible; more: number; onClose: () => void }) {
  const { c } = useTheme();
  const reduce = useReducedMotion();
  const glow = useSharedValue(reduce ? 1 : 0);
  const lift = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) {
      glow.set(withTiming(1, { duration: 900, easing: SETTLE, reduceMotion: sys }));
      lift.set(withDelay(200, withTiming(1, { duration: 800, easing: SETTLE, reduceMotion: sys })));
    }
    const t = setTimeout(() => haptic.success(), reduce ? 0 : 600);
    return () => clearTimeout(t);
  }, [reduce, glow, lift]);
  const halo = useAnimatedStyle(() => ({ opacity: glow.value * 0.9, transform: [{ scale: 0.6 + glow.value * 0.4 }] }));
  const object = useAnimatedStyle(() => ({ opacity: lift.value, transform: [{ translateY: (1 - lift.value) * 18 }] }));

  return (
    <Animated.View
      entering={FadeIn.duration(260).reduceMotion(sys)}
      exiting={FadeOut.duration(200).reduceMotion(sys)}
      style={[StyleSheet.absoluteFill, styles.wrap]}
      accessibilityViewIsModal
    >
      <Pressable
        style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(10,10,16,0.45)' }]}
        onPress={onClose}
        accessibilityLabel="Close"
      />
      <ThemedView style={[styles.card, { backgroundColor: c.surface }]} accessibilityLiveRegion="polite">
        <View style={styles.stage}>
          <Animated.View style={[styles.halo, { backgroundColor: c.peachSoft }, halo]}>
            <View style={[styles.haloInner, { backgroundColor: c.peachSoft }]} />
          </Animated.View>
          <Animated.View style={object}>
            <CollectibleArt id={item.id} size={128} locked={false} />
          </Animated.View>
        </View>
        <Animated.View entering={rise(reduce ? 0 : 500)} style={{ gap: 4, alignItems: 'center' }}>
          <T v="overline" color={c.peachInk}>
            New in your collection
          </T>
          <T v="heading" accessibilityRole="header" style={styles.center}>
            {item.name}
          </T>
          <T v="caption" color={c.textDim} style={{ fontWeight: '700' }}>
            You’re now {/^[AEIOU]/.test(item.title) ? 'an' : 'a'} {item.title}
          </T>
        </Animated.View>
        <Animated.View entering={rise(reduce ? 0 : 700)}>
          <T color={c.textDim} style={styles.center}>
            {item.reflection}
          </T>
          {more ? (
            <T v="caption" color={c.textFaint} style={[styles.center, { marginTop: space.xs }]}>
              And {more} more waiting in your collection.
            </T>
          ) : null}
        </Animated.View>
        <Animated.View entering={rise(reduce ? 0 : 850)} style={styles.buttons}>
          <Button label="Lovely" kind="secondary" onPress={onClose} style={{ flex: 1 }} />
          <Button
            label="See collection"
            onPress={() => {
              onClose();
              router.push('/life-reset/collection');
            }}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: space.xl },
  card: { width: '100%', maxWidth: 400, borderRadius: 28, padding: space.xl, gap: space.md, alignItems: 'center' },
  stage: { width: 180, height: 160, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  haloInner: { width: 120, height: 120, borderRadius: 60 },
  center: { textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: space.sm, alignSelf: 'stretch', marginTop: space.xs },
});
