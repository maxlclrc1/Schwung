import { useNavigation } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import {
  AccessibilityInfo,
  AppState,
  BackHandler,
  Platform,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { language } from '../i18n';
import { effectiveLanguage } from '../i18n/device';
import { IS_RTL, isRTLLanguage } from '../i18n/direction';
import type { LanguageCode } from '../i18n/languages';
import { LanguageOverride } from '../i18n/react';
import { usePreferences, type LanguagePreference } from '../store/preferences';
import { useTheme } from '../theme';
import { LanguagePicker } from './LanguagePicker';

/*
 * Settings → Language (app/language.tsx): the language list (LanguagePicker), where a change of language spreads
 * from the tapped row as a circle: inside it the screen is already in the new language, outside it is still in the
 * old one, until the circle has passed the furthest corner.
 *
 * Two live layers, no screenshots:
 * - beneath, the screen itself, still in the old language for the whole ripple;
 * - above, a second Language screen drawn in the new language (i18n LanguageOverride), the same size, place and
 *   scroll position, seen only through a circle: a view with overflow hidden and a corner radius of half its size,
 *   the screen inside it moved by the opposite amount so it stays still while the circle grows.
 *
 * Nothing waits after the tap. The new-language layer is built while the finger is down (press in), so by the time
 * the tap registers it is already on screen, zero-sized. The tap only starts the circle growing, on the UI thread
 * (no screenshot, no render in between). A tap that arrives with no press in before it (a VoiceOver activation)
 * builds the layer in the same React update that starts the circle, so its first frame already holds the real new
 * language. When the circle has passed every corner, the language is changed for real (saved, applied everywhere)
 * beneath the fully covering layer, and the layer is removed two frames later, when the screen beneath has redrawn
 * as the same picture.
 *
 * While it runs, one state (`running`) locks the screen: a cover takes every touch (rows, scrolling, Done), no swipe
 * to dismiss, no Android Back, and further choices are ignored (not queued). It always ends: when the circle is
 * complete, when the app leaves the foreground, when the screen goes, or after RUN_LIMIT_MS at the latest; the
 * language is applied in every case. Reduce Motion: no ripple, the language changes at once. The new-language layer
 * is hidden from assistive technology; the live screen keeps its accessibility.
 */

type ViewRef = ComponentRef<typeof View>;

/** The ripple itself. */
const RIPPLE_MS = 600;
/**
 * The house curve's soft settle (theme/motion EASE) with a steadier start: EASE alone covers three quarters of the
 * radius in the first 150 ms, which reads as a flash; this spreads at an even pace (half the radius at about 170 ms)
 * and slows into the corners, as a ripple on still water does.
 */
const RIPPLE_EASE = Easing.bezierFn(0.3, 0.35, 0.3, 1);
/**
 * One display frame. The circle's clock starts this far in, so the first frame after the tap already shows the
 * circle as it is 16.7 ms into the ripple (a timing animation's own first frame always holds its starting value,
 * which would leave that frame empty). The ripple still ends RIPPLE_MS after the tap.
 */
const FRAME_MS = 1000 / 60;
/** The boundary: a hairline of peach, barely there, fading out as the circle nears the corners. */
const RING_WIDTH = 1.5;
const RING_OPACITY = 0.45;
/** Whatever happens, the lock never outlasts this. */
const RUN_LIMIT_MS = 3000;

/** The language a choice shows, and whether it leaves this launch's layout direction behind (restart note). */
function shows(l: LanguagePreference): { code: LanguageCode; restart: boolean } {
  const code = effectiveLanguage(l);
  return { code, restart: Platform.OS !== 'web' && isRTLLanguage(code) !== IS_RTL };
}

/**
 * Whole points, on every screen's pixel grid. The circle's position is laid out (and snapped by the layout engine)
 * while the screen inside it is moved back by a transform (not snapped): unless both are whole points the inside
 * sits a pixel off, shimmering as the circle grows and stepping when the layer is removed. (Rounding to device pixels
 * was not enough on the web, which snaps layout to whole points.) The circle grows by several points a frame, so the
 * steps don't show.
 */
const px = (v: number) => {
  'worklet';
  return Math.round(v);
};

const nextFrame = () => new Promise<void>((ok) => requestAnimationFrame(() => ok()));

export function LanguageRipple() {
  const { c } = useTheme();
  const host = useRef<ViewRef>(null);
  const liveScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const copyScroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollY = useRef(0);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  // The language the upper layer is drawn in (built on press in, kept until the next one or the end of a run).
  const [layer, setLayerState] = useState<{ l: LanguagePreference; y: number } | null>(null);
  const setLayer = useCallback(
    (l: LanguagePreference | null) => setLayerState(l === null ? null : { l, y: scrollY.current }),
    [],
  );
  const [running, setRunning] = useState(false);
  // Mirrors `running` for the synchronous checks (a second tap in the same frame).
  const busy = useRef(false);
  // The language chosen and not yet applied (applied however the run ends).
  const pending = useRef<LanguagePreference | null>(null);
  // The row the circle starts from, measured on press in; null until measured.
  const origin = useRef<{ l: LanguagePreference; ok: boolean } | null>(null);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The list's scroll position when the run began (the upper layer is drawn there).
  const runY = useRef(0);
  const reduceMotion = useRef(false);
  // Circle geometry and progress, read on the UI thread.
  const cx = useSharedValue(0);
  const cy = useSharedValue(0);
  const radius = useSharedValue(0);
  // The ripple's clock, 0 to 1 at an even pace; `progress` is it on the curve.
  const time = useSharedValue(0);
  const progress = useDerivedValue(() => (time.value <= 0 ? 0 : RIPPLE_EASE(Math.min(1, time.value))));

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduceMotion.current = v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => (reduceMotion.current = v));
    return () => sub.remove();
  }, []);

  const willRipple = useCallback(
    (l: LanguagePreference) =>
      !busy.current &&
      !reduceMotion.current &&
      l !== usePreferences.getState().language &&
      effectiveLanguage(l) !== language(),
    [],
  );

  /** The tapped row's centre, and the distance to the furthest corner (ring included), into the shared values. */
  const measure = useCallback(
    (l: LanguagePreference, row: ViewRef | null) => {
      const view = host.current;
      if (!row || !view || !size) return;
      const mark = { l, ok: false };
      origin.current = mark;
      view.measureInWindow((hx, hy) =>
        row.measureInWindow((rx, ry, rw, rh) => {
          const x = rx + rw / 2 - hx;
          const y = ry + rh / 2 - hy;
          const { w, h } = size;
          cx.set(px(x));
          cy.set(px(y));
          radius.set(
            Math.max(Math.hypot(x, y), Math.hypot(w - x, y), Math.hypot(x, h - y), Math.hypot(w - x, h - y)) +
              2 * RING_WIDTH,
          );
          mark.ok = true;
        }),
      );
    },
    [cx, cy, radius, size],
  );

  // A finger on a row: build that language's layer now, unseen, so a tap has nothing left to prepare.
  const prepare = useCallback(
    (l: LanguagePreference, row: ViewRef | null) => {
      if (!willRipple(l)) return;
      measure(l, row);
      setLayer(l);
    },
    [measure, setLayer, willRipple],
  );

  // The upper layer at the live screen's scroll position (also when it was built before a scroll).
  const alignCopy = useCallback(() => {
    copyScroll.current?.scrollTo({ y: scrollY.current, animated: false });
  }, []);
  useLayoutEffect(alignCopy, [layer, alignCopy]);

  /** Tears the run down at once (interruptions): the language applied, the layer gone, the screen unlocked. */
  const end = useCallback(() => {
    if (!busy.current) return;
    cancelAnimation(time);
    const l = pending.current;
    pending.current = null;
    if (l !== null) usePreferences.getState().setLanguage(l);
    if (limit.current) clearTimeout(limit.current);
    limit.current = null;
    busy.current = false;
    setRunning(false);
    setLayer(null);
    time.set(0);
  }, [time, setLayer]);

  /** The circle has passed every corner: the language for real beneath it, then the layer away once redrawn. */
  const complete = useCallback(async () => {
    const l = pending.current;
    pending.current = null;
    if (l !== null) usePreferences.getState().setLanguage(l);
    // Once redrawn, the list where the upper layer shows it: a browser keeps the rows in place as the text above them
    // grows, moving the scroll position; iOS keeps the offset, so there this changes nothing.
    await nextFrame();
    liveScroll.current?.scrollTo({ y: runY.current, animated: false });
    await nextFrame();
    await nextFrame();
    end();
  }, [end]);

  // Only starts the clock on the UI thread: nothing is rendered, captured or measured here.
  const start = useCallback(() => {
    time.set(FRAME_MS / RIPPLE_MS);
    time.set(
      withTiming(
        1,
        { duration: RIPPLE_MS - FRAME_MS, easing: Easing.linear, reduceMotion: ReduceMotion.System },
        (done) => {
          if (done) scheduleOnRN(complete);
        },
      ),
    );
  }, [complete, time]);

  const choose = useCallback(
    (l: LanguagePreference, row: ViewRef | null) => {
      if (busy.current) return; // Ignored, not queued.
      if (l === usePreferences.getState().language) return;
      if (!willRipple(l) || !row || !size) {
        // Reduce Motion, or the words wouldn't change ("Follow device" while showing the phone's language).
        usePreferences.getState().setLanguage(l);
        return;
      }
      busy.current = true;
      pending.current = l;
      runY.current = scrollY.current;
      limit.current = setTimeout(end, RUN_LIMIT_MS);
      if (origin.current?.l === l && origin.current.ok) {
        // Prepared while the finger was down: the circle starts on the next UI frame. The cover (a small render of
        // this component alone; both screens are memoized) follows; until it is up, `busy` already refuses choices.
        alignCopy();
        start();
        setRunning(true);
      } else {
        setRunning(true);
        // No press in (VoiceOver), or not measured yet: build and measure now; the layer and the circle appear
        // together, so the first visible frame already holds the new language.
        setLayer(l);
        measure(l, row);
        requestAnimationFrame(() => (busy.current && pending.current === l ? start() : undefined));
      }
    },
    [alignCopy, end, measure, setLayer, size, start, willRipple],
  );

  // Interruptions end the run (language applied): leaving the foreground, the screen going. Android Back held off.
  useEffect(() => {
    const app = AppState.addEventListener('change', (s) => s !== 'active' && end());
    const back = BackHandler.addEventListener('hardwareBackPress', () => busy.current);
    return () => {
      app.remove();
      back.remove();
      end();
    };
  }, [end]);

  const clip = useAnimatedStyle(() => {
    const d = px(progress.value * radius.value);
    return { left: cx.value - d, top: cy.value - d, width: 2 * d, height: 2 * d, borderRadius: d };
  });
  const inside = useAnimatedStyle(() => {
    const d = px(progress.value * radius.value);
    return { transform: [{ translateX: d - cx.value }, { translateY: d - cy.value }] };
  });
  const ring = useAnimatedStyle(() => {
    const p = progress.value;
    const d = px(p * radius.value) + RING_WIDTH;
    return {
      left: cx.value - d,
      top: cy.value - d,
      width: 2 * d,
      height: 2 * d,
      borderRadius: d,
      opacity: p === 0 ? 0 : RING_OPACITY * Math.min(1, p * 8) * Math.min(1, (1 - p) / 0.35),
    };
  });

  // The sheet's swipe to dismiss, held while running (after the frame, never in the way of the circle).
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({ gestureEnabled: !running });
  }, [navigation, running]);

  // Both screens memoized: starting and ending a run re-renders neither.
  const liveScrollProps = useMemo(
    () => ({
      ref: liveScroll,
      scrollEventThrottle: 16,
      onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
      },
    }),
    [],
  );
  const live = useMemo(
    () => <LanguagePicker onPrepare={prepare} onChoose={choose} scrollProps={liveScrollProps} />,
    [prepare, choose, liveScrollProps],
  );
  const upper = useMemo(() => {
    if (layer === null || !size) return null;
    const view = shows(layer.l);
    return (
      <Animated.View style={[styles.copy, { width: size.w, height: size.h }, inside]}>
        <LanguageOverride value={view.code}>
          <LanguagePicker
            preview={{ pref: layer.l, restart: view.restart }}
            scrollProps={{ ref: copyScroll, scrollEnabled: false, contentOffset: { x: 0, y: layer.y } }}
          />
        </LanguageOverride>
      </Animated.View>
    );
  }, [layer, size, inside]);

  return (
    <View
      ref={host}
      style={styles.fill}
      collapsable={false}
      onLayout={(e: LayoutChangeEvent) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      {live}
      {/* The new language, through the circle. Never touchable, hidden from assistive technology. */}
      {upper ? (
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Animated.View style={[styles.clip, clip]} testID="ripple-clip">
            {upper}
          </Animated.View>
          <Animated.View style={[styles.ring, { borderColor: c.peach }, ring]} />
        </View>
      ) : null}
      {running ? (
        // The cover: takes every touch until the run ends.
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents="auto"
          accessible={false}
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="ripple-cover"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  clip: { position: 'absolute', overflow: 'hidden', width: 0, height: 0 },
  copy: { position: 'absolute', left: 0, top: 0 },
  ring: { position: 'absolute', borderWidth: RING_WIDTH, width: 0, height: 0, opacity: 0 },
});
