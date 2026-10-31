import { reloadAppAsync } from 'expo';
import { router } from 'expo-router';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FlipInXUp,
  FlipOutXDown,
  interpolate,
  Extrapolation,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, T } from '../components/ui';
import { WorldBackdrop } from '../components/World';
import { deviceLanguage, isDirectionPending, subscribeDirection } from '../i18n/device';
import { physical } from '../i18n/direction';
import { READY_LANGUAGES, type Language } from '../i18n/languages';
import { useLanguage, useT } from '../i18n/react';
import { haptic } from '../lib/haptics';
import { APP_NAME } from '../lib/constants';
import { usePreferences } from '../store/preferences';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

/*
 * The first screen after installing (and after a Life Reset is ended or the data deleted): which language Schwung
 * speaks. "Choose your language" runs around the frame in all twenty languages, like a ticker band around a
 * building, flowing clockwise; the chosen one lights up in it. Inside, the languages turn on a wheel, each in its
 * own name; settling on one switches every word at once, flips the title over to it and sends a ring out from the
 * wheel. Continue leads to the mountain welcome. Between a left-to-right and a right-to-left language the layout
 * turns with a restart, offered here.
 */

const BAND = 30; // the ticker band around the frame
const ROW = 58; // one language on the wheel
const SEP = '   ·   ';

export default function ChooseLanguage() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const reduce = useReducedMotion();
  const shown = useLanguage();
  const setLanguage = usePreferences((s) => s.setLanguage);
  const confirmLanguage = usePreferences((s) => s.confirmLanguage);
  const chosen = usePreferences((s) => s.languageChosen === true);
  const restart = useSyncExternalStore(subscribeDirection, isDirectionPending);

  const [box, setBox] = useState({ w: 0, h: 0 });
  const [wheelH, setWheelH] = useState(0);
  // Where the wheel starts: the language shown when the screen opened (kept, while the wheel moves on).
  const [startIndex] = useState(() =>
    Math.max(
      0,
      READY_LANGUAGES.findIndex((l) => l.code === shown),
    ),
  );
  const current = useRef(startIndex);
  const scroll = useAnimatedRef<Animated.ScrollView>();
  const y = useSharedValue(startIndex * ROW);
  const burst = useSharedValue(1);

  // Start on the shown language (contentOffset alone isn't applied on Android or the web).
  useEffect(() => {
    if (wheelH > 0) scroll.current?.scrollTo({ y: startIndex * ROW, animated: false });
  }, [wheelH, startIndex, scroll]);

  const onScroll = useAnimatedScrollHandler((e) => {
    y.set(e.contentOffset.y);
  });

  const select = (i: number) => {
    const l = READY_LANGUAGES[i];
    if (!l || i === current.current) return;
    current.current = i;
    haptic.select();
    // The phone's own language stays "Follow device", so a later change of the phone's language carries over.
    setLanguage(l.code === deviceLanguage() ? 'system' : l.code);
    if (!reduce) {
      burst.set(0);
      burst.set(withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) }));
    }
  };
  const settle = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    select(Math.round(e.nativeEvent.contentOffset.y / ROW));
  const tap = (i: number) => {
    scroll.current?.scrollTo({ y: i * ROW, animated: !reduce });
    select(i);
  };

  const go = () => {
    confirmLanguage();
    router.replace('/welcome');
  };

  const ring = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.15, 1], [0, 0.7, 0]),
    transform: [
      { scaleX: interpolate(burst.value, [0, 1], [1, 1.35]) },
      { scaleY: interpolate(burst.value, [0, 1], [1, 2.4]) },
    ],
  }));
  const glow = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(burst.value, [0, 0.2, 1], [1, 1.06, 1], Extrapolation.CLAMP) }],
  }));

  const phrase = READY_LANGUAGES.find((l) => l.code === shown)?.choose ?? READY_LANGUAGES[0].choose;
  const onBox = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ w: width, h: height });
  };

  return (
    <View style={[styles.fill, { backgroundColor: c.bg }]}>
      <Animated.View entering={FadeIn.duration(800)} style={StyleSheet.absoluteFill} pointerEvents="none">
        <WorldBackdrop zoneTop={insets.top + BAND} />
        <ThemedView style={[StyleSheet.absoluteFill, styles.veil, { backgroundColor: c.bg }]} />
      </Animated.View>

      <View style={[styles.fill, physical, { marginTop: insets.top, marginBottom: insets.bottom }]} onLayout={onBox}>
        {box.w > 0 ? (
          <View
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          >
            {/* Clockwise: along the top to the right, down the right side, along the bottom to the left, up the left. */}
            <Band
              x={box.w / 2}
              y={BAND / 2}
              length={box.w}
              rotate={0}
              flow={1}
              shown={shown}
              reduce={reduce}
              delay={0}
            />
            <Band
              x={box.w - BAND / 2}
              y={box.h / 2}
              length={box.h - 2 * BAND}
              rotate={90}
              flow={1}
              shown={shown}
              reduce={reduce}
              delay={7}
            />
            <Band
              x={box.w / 2}
              y={box.h - BAND / 2}
              length={box.w}
              rotate={0}
              flow={-1}
              shown={shown}
              reduce={reduce}
              delay={3}
            />
            <Band
              x={BAND / 2}
              y={box.h / 2}
              length={box.h - 2 * BAND}
              rotate={-90}
              flow={1}
              shown={shown}
              reduce={reduce}
              delay={11}
            />
          </View>
        ) : null}

        <Animated.View
          entering={reduce ? undefined : FadeInDown.delay(200).duration(600)}
          style={[styles.frame, { borderColor: c.accent }]}
        >
          <ThemedView style={[StyleSheet.absoluteFill, styles.frameFill, { backgroundColor: c.surface }]} />
          <View style={styles.head}>
            <T v="overline" color={c.accentInk} style={styles.brand}>
              {APP_NAME}
            </T>
            {/* A split-flap turn to the chosen language, like a departures board. */}
            <View style={styles.titleBox}>
              <Animated.View
                key={shown}
                entering={reduce ? undefined : FlipInXUp.duration(420)}
                exiting={reduce ? undefined : FlipOutXDown.duration(260)}
              >
                <T
                  v="title"
                  accessibilityRole="header"
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.3}
                  style={styles.title}
                >
                  {phrase}
                </T>
              </Animated.View>
            </View>
          </View>

          <View style={styles.wheel} onLayout={(e) => setWheelH(e.nativeEvent.layout.height)}>
            {wheelH > 0 ? (
              <>
                <View pointerEvents="none" style={[styles.bandBox, { top: wheelH / 2 - ROW / 2 }]}>
                  <Animated.View style={[StyleSheet.absoluteFill, styles.ring, { borderColor: c.accent }, ring]} />
                  <Animated.View style={[StyleSheet.absoluteFill, glow]}>
                    <ThemedView style={[StyleSheet.absoluteFill, styles.pill, { backgroundColor: c.accentSoft }]} />
                  </Animated.View>
                </View>
                <Animated.ScrollView
                  ref={scroll}
                  onScroll={onScroll}
                  scrollEventThrottle={16}
                  snapToInterval={ROW}
                  decelerationRate="fast"
                  showsVerticalScrollIndicator={false}
                  contentOffset={{ x: 0, y: startIndex * ROW }}
                  onMomentumScrollEnd={settle}
                  contentContainerStyle={{ paddingVertical: wheelH / 2 - ROW / 2 }}
                  accessibilityRole="radiogroup"
                >
                  {READY_LANGUAGES.map((l, i) => (
                    <WheelItem key={l.code} l={l} i={i} y={y} on={l.code === shown} onPress={() => tap(i)} />
                  ))}
                </Animated.ScrollView>
              </>
            ) : null}
          </View>

          <View style={styles.foot}>
            {restart && chosen ? (
              <Animated.View entering={FadeInDown.duration(300)} style={{ gap: space.sm }}>
                <T v="caption" color={c.textDim} style={styles.center}>
                  {t('settings.language.restartBody')}
                </T>
                <Button
                  label={t('settings.language.restartNow')}
                  onPress={() => {
                    confirmLanguage();
                    void reloadAppAsync();
                  }}
                />
                <Button label={t('common.continue')} kind="ghost" onPress={go} />
              </Animated.View>
            ) : (
              <Button label={t('common.continue')} onPress={go} />
            )}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

/** One language on the wheel: full size and bright at the centre, smaller, fainter and turned away above and below. */
function WheelItem({
  l,
  i,
  y,
  on,
  onPress,
}: {
  l: Language;
  i: number;
  y: SharedValue<number>;
  on: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const style = useAnimatedStyle(() => {
    const d = (y.value - i * ROW) / ROW;
    const a = Math.abs(d);
    return {
      opacity: interpolate(a, [0, 1, 3], [1, 0.62, 0.25], Extrapolation.CLAMP),
      transform: [
        { perspective: 700 },
        { rotateX: `${interpolate(d, [-3, 0, 3], [50, 0, -50], Extrapolation.CLAMP)}deg` },
        { scale: interpolate(a, [0, 1, 3], [1, 0.84, 0.7], Extrapolation.CLAMP) },
      ],
    };
  });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={l.native}
      accessibilityLanguage={l.code}
    >
      <Animated.View style={[styles.item, style]}>
        <T
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
          adjustsFontSizeToFit
          color={on ? c.accentInk : c.text}
          style={[styles.itemText, on && styles.itemOn]}
        >
          {l.native}
        </T>
      </Animated.View>
    </Pressable>
  );
}

/**
 * One side of the ticker band: "Choose your language" in every language, flowing without end; the chosen language's
 * line glows. Drawn as a horizontal strip, turned to run down or up the sides.
 */
function Band({
  x,
  y,
  length,
  rotate,
  flow,
  shown,
  reduce,
  delay,
}: {
  x: number;
  y: number;
  length: number;
  rotate: number;
  flow: 1 | -1;
  shown: string;
  reduce: boolean;
  /** Where in the sequence this side starts, so the four sides don't read the same words side by side. */
  delay: number;
}) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const offset = useSharedValue(0);
  useEffect(() => {
    if (!w || reduce) return;
    // About 34 points a second: calm enough to read, steady like a ticker.
    const ms = (w / 34) * 1000;
    offset.set(flow === 1 ? -w : 0);
    offset.set(withRepeat(withTiming(flow === 1 ? 0 : -w, { duration: ms, easing: Easing.linear }), -1, false));
    return () => cancelAnimation(offset);
  }, [w, flow, reduce, offset]);
  const move = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  const order = [...READY_LANGUAGES.slice(delay), ...READY_LANGUAGES.slice(0, delay)];
  const line = (
    <Text style={[styles.ticker, { color: c.textFaint }]} onLayout={(e) => !w && setW(e.nativeEvent.layout.width)}>
      {order.map((l) => (
        <Text key={l.code} style={l.code === shown ? { color: c.accentInk } : null}>
          {l.choose}
          {SEP}
        </Text>
      ))}
    </Text>
  );
  return (
    <View
      style={[
        styles.band,
        { width: length, left: x - length / 2, top: y - BAND / 2, transform: [{ rotate: `${rotate}deg` }] },
      ]}
    >
      <Animated.View style={[styles.strip, move]}>
        {line}
        {line}
        {line}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  veil: { opacity: 0.35 },
  frame: {
    position: 'absolute',
    top: BAND,
    bottom: BAND,
    left: BAND,
    right: BAND,
    borderRadius: radius.lg + 6,
    borderWidth: StyleSheet.hairlineWidth * 2,
    overflow: 'hidden',
    paddingTop: space.xl,
  },
  frameFill: { opacity: 0.86 },
  head: { paddingHorizontal: space.xl, gap: space.sm, alignItems: 'center' },
  brand: { letterSpacing: 3 },
  titleBox: { minHeight: 84, justifyContent: 'center' },
  title: { textAlign: 'center' },
  wheel: { flex: 1, minHeight: ROW * 3 },
  bandBox: { position: 'absolute', left: space.lg, right: space.lg, height: ROW },
  pill: { borderRadius: radius.pill },
  ring: { borderRadius: radius.pill, borderWidth: 1.5 },
  item: { height: ROW, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.xl },
  itemText: { fontSize: 22, lineHeight: 30, fontWeight: '600', textAlign: 'center' },
  itemOn: { fontWeight: '800' },
  foot: { padding: space.lg, paddingTop: space.sm },
  center: { textAlign: 'center' },
  band: { position: 'absolute', height: BAND, overflow: 'hidden', justifyContent: 'center' },
  strip: { flexDirection: 'row', width: 40000, alignItems: 'center' },
  ticker: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
});
