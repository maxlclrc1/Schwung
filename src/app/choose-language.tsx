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
 * speaks. The twenty languages, each in its own name, travel clockwise around the frame as one unbroken ring, like a
 * ticker band around a building; the chosen one lights up in it. Inside, the languages turn on a wheel, each in its
 * own name; settling on one switches every word at once, flips the title over to it and sends a ring out from the
 * wheel. Continue leads to the mountain welcome. Between a left-to-right and a right-to-left language the layout
 * turns with a restart, offered here.
 */

const BAND = 30; // the ticker band around the frame
const ROW = 58; // one language on the wheel
const CORNER = radius.lg + 6; // the frame's corner
const MIN_GAP = 28; // the least space between two names on the ring

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

  // Keep the wheel on the chosen language whenever its height changes: at the start (contentOffset alone isn't
  // applied on Android or the web), and when the restart note appears below it for a right-to-left language.
  useEffect(() => {
    if (wheelH > 0) scroll.current?.scrollTo({ y: current.current * ROW, animated: false });
  }, [wheelH, scroll]);

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
      burst.set(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }));
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

  // A soft halo eases out from the chosen language and fades: no flash, nothing darkened.
  const ring = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 0.25, 1], [0, 0.5, 0], Extrapolation.CLAMP),
    transform: [
      { scaleX: interpolate(burst.value, [0, 1], [1, 1.06]) },
      { scaleY: interpolate(burst.value, [0, 1], [1, 1.5]) },
    ],
  }));
  const glow = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(burst.value, [0, 0.35, 1], [1, 1.03, 1], Extrapolation.CLAMP) }],
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
            <Ring w={box.w} h={box.h} shown={shown} reduce={reduce} />
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
                entering={reduce ? undefined : FlipInXUp.duration(760).easing(Easing.out(Easing.cubic))}
                exiting={reduce ? undefined : FlipOutXDown.duration(420)}
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
      opacity: interpolate(a, [0, 1, 3], [1, 0.72, 0.4], Extrapolation.CLAMP),
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

/** The ring's centre line: a rounded rectangle just outside the frame, walked clockwise from the top-left. */
type Track = { x0: number; y0: number; x1: number; y1: number; r: number; length: number };

function trackOf(w: number, h: number): Track {
  const x0 = BAND / 2;
  const y0 = BAND / 2;
  const x1 = w - BAND / 2;
  const y1 = h - BAND / 2;
  const r = CORNER + BAND / 2;
  const length = 2 * (x1 - x0 - 2 * r) + 2 * (y1 - y0 - 2 * r) + 2 * Math.PI * r;
  return { x0, y0, x1, y1, r, length };
}

/** Where along the track `s` points lie, and which way the text there faces (degrees, 0 along the top). */
function pointAt(t: Track, s: number) {
  'worklet';
  const { x0, y0, x1, y1, r } = t;
  const arc = (Math.PI * r) / 2;
  const top = x1 - x0 - 2 * r;
  const side = y1 - y0 - 2 * r;
  const corner = (cx: number, cy: number, from: number, u: number) => {
    const a = ((from + 90 * u) * Math.PI) / 180;
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), angle: from + 90 + 90 * u };
  };
  let d = ((s % t.length) + t.length) % t.length;
  if (d < top) return { x: x0 + r + d, y: y0, angle: 0 };
  d -= top;
  if (d < arc) return corner(x1 - r, y0 + r, -90, d / arc);
  d -= arc;
  if (d < side) return { x: x1, y: y0 + r + d, angle: 90 };
  d -= side;
  if (d < arc) return corner(x1 - r, y1 - r, 0, d / arc);
  d -= arc;
  if (d < top) return { x: x1 - r - d, y: y1, angle: 180 };
  d -= top;
  if (d < arc) return corner(x0 + r, y1 - r, 90, d / arc);
  d -= arc;
  if (d < side) return { x: x0, y: y1 - r - d, angle: 270 };
  d -= side;
  return corner(x0 + r, y0 + r, 180, d / arc);
}

/** Scripts whose letters join or stack (Arabic, Urdu, Devanagari, Bengali, Thai) travel as whole words. */
const WHOLE = new Set(['ar', 'ur', 'hi', 'bn', 'th']);
const glyphsOf = (l: Language) => (WHOLE.has(l.code) ? [l.native] : Array.from(l.native));

/**
 * The twenty languages, each in its own name, travelling clockwise around the frame as one unbroken ring, like a
 * ticker band around a building. Each letter follows the track on its own, so a name bends smoothly around the
 * rounded corners instead of turning as a block. Evenly spaced (repeated as often as the frame allows), the chosen
 * language lit; every letter is measured once, so names never overlap.
 */
function Ring({ w, h, shown, reduce }: { w: number; h: number; shown: string; reduce: boolean }) {
  const { c } = useTheme();
  const [widths, setWidths] = useState<Record<string, number>>({});
  const all = READY_LANGUAGES.flatMap((l) => glyphsOf(l).map((g, i) => ({ id: `${l.code}:${i}`, g })));
  const measured = all.every((u) => widths[u.id] !== undefined);
  const track = trackOf(w, h);
  const travel = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    // About 30 points a second: calm enough to read, steady like a ticker.
    travel.set(0);
    travel.set(
      withRepeat(withTiming(track.length, { duration: (track.length / 30) * 1000, easing: Easing.linear }), -1, false),
    );
    return () => cancelAnimation(travel);
  }, [track.length, reduce, travel]);

  // As many full rounds of all twenty as fit, the space between names shared out evenly.
  const glyphs: { key: string; g: string; code: string; width: number; at: number }[] = [];
  if (measured) {
    const nameWidth = (l: Language) => glyphsOf(l).reduce((sum, _, i) => sum + widths[`${l.code}:${i}`], 0);
    const names = READY_LANGUAGES.reduce((sum, l) => sum + nameWidth(l), 0);
    const rounds = Math.max(1, Math.floor(track.length / (names + READY_LANGUAGES.length * MIN_GAP)));
    const gap = (track.length - rounds * names) / (rounds * READY_LANGUAGES.length);
    let at = 0;
    for (let k = 0; k < rounds; k++)
      for (const l of READY_LANGUAGES) {
        glyphsOf(l).forEach((g, i) => {
          const width = widths[`${l.code}:${i}`];
          glyphs.push({ key: `${k}:${l.code}:${i}`, g, code: l.code, width, at: at + width / 2 });
          at += width;
        });
        at += gap;
      }
  }

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Measured once, unseen. */}
      {!measured ? (
        <View style={styles.measure}>
          {all.map((u) => (
            <Text
              key={u.id}
              style={styles.ticker}
              onLayout={(e) => {
                const width = e.nativeEvent.layout.width;
                setWidths((m) => (m[u.id] === width ? m : { ...m, [u.id]: width }));
              }}
            >
              {u.g}
            </Text>
          ))}
        </View>
      ) : null}
      {glyphs.map((it) => (
        <RingGlyph
          key={it.key}
          track={track}
          travel={travel}
          at={it.at}
          width={it.width}
          color={it.code === shown ? c.accentInk : c.textFaint}
        >
          {it.g}
        </RingGlyph>
      ))}
    </View>
  );
}

function RingGlyph({
  track,
  travel,
  at,
  width,
  color,
  children,
}: {
  track: Track;
  travel: SharedValue<number>;
  at: number;
  width: number;
  color: string;
  children: string;
}) {
  const style = useAnimatedStyle(() => {
    const p = pointAt(track, at + travel.value);
    return {
      transform: [{ translateX: p.x - width / 2 }, { translateY: p.y - BAND / 2 }, { rotate: `${p.angle}deg` }],
    };
  });
  return (
    <Animated.View style={[styles.ringName, { width: width + 2 }, style]}>
      <Text style={[styles.ticker, { color }]}>{children}</Text>
    </Animated.View>
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
    borderRadius: CORNER,
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
  measure: { position: 'absolute', opacity: 0, flexDirection: 'row', width: 4000, alignItems: 'flex-start' },
  ringName: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: BAND,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  ticker: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
});
