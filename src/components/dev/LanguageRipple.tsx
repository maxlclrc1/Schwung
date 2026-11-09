import { Stack } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  AccessibilityInfo,
  AppState,
  BackHandler,
  Image,
  Platform,
  StyleSheet,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { captureRef, releaseCapture } from 'react-native-view-shot';
import { scheduleOnRN } from 'react-native-worklets';
import { language } from '../../i18n';
import { effectiveLanguage } from '../../i18n/device';
import { usePreferences, type LanguagePreference } from '../../store/preferences';
import { useTheme } from '../../theme';
import { MOTION } from '../../theme/motion';
import { LanguagePicker } from '../LanguagePicker';

/*
 * PROTOTYPE, development builds only (Settings → "Language ripple (prototype)"). Not the production Language screen.
 *
 * Changing the language here spreads from the tapped row as a circle: inside it the screen is already in the new
 * language, outside it is still in the old one, until the circle has passed the furthest corner.
 *
 * How: two still images of this screen and one circular clip.
 * 1. Capture the screen as it is (old language) and lay that image over it, exactly in place.
 * 2. Change the language for real (saved and applied as usual). The live screen beneath re-renders in it, hidden.
 * 3. Capture the screen again (new language). The capture is of the screen's own view, so the cover doesn't get in it.
 * 4. Show that second image through a circle centred on the tapped row: a view with overflow hidden and a corner
 *    radius of half its size, so it clips to a circle, with the image counter-positioned so it stays in place. The
 *    circle grows on the UI thread until it passes the furthest corner.
 * 5. Remove both images. The live screen beneath is the same picture as the second image, so nothing changes.
 *
 * While it runs, one state (`run`) locks the screen: a cover that takes every touch (rows, scrolling, Done), no swipe
 * to dismiss, no Android Back, and further choices ignored (not queued). It always ends: when the circle is complete,
 * on any failure, when the app leaves the foreground, when the screen goes, or after RUN_LIMIT_MS at the latest. The
 * language is applied in every case; only the animation can be skipped. Reduce Motion: no ripple, the language changes
 * at once. The images are hidden from assistive technology; the live screen keeps its accessibility.
 */

type ViewRef = ComponentRef<typeof View>;

/** The ripple itself. */
const RIPPLE_MS = 600;
/**
 * The house curve's soft settle (theme/motion EASE) with a steadier start: EASE alone covers three quarters of the
 * radius in the first 150 ms, which reads as a flash; this spreads at an even pace (half the radius at about 170 ms)
 * and slows into the corners, as a ripple on still water does.
 */
const RIPPLE_EASE = Easing.bezier(0.3, 0.35, 0.3, 1);
/** The boundary: a hairline of peach, barely there, fading out as the circle nears the corners. */
const RING_WIDTH = 1.5;
const RING_OPACITY = 0.45;
/** Whatever happens, the lock never outlasts this. */
const RUN_LIMIT_MS = 3000;

type Run =
  | { phase: 'locked' }
  | { phase: 'cover'; old: string; w: number; h: number }
  | { phase: 'ripple'; old: string; next: string; w: number; h: number; x: number; y: number; r: number };

const nextFrame = () => new Promise<void>((ok) => requestAnimationFrame(() => ok()));
const wait = (ms: number) => new Promise<void>((ok) => setTimeout(ok, ms));

/** A view's frame in the window. */
const frameOf = (v: ViewRef) =>
  new Promise<{ x: number; y: number; w: number; h: number }>((ok) =>
    v.measureInWindow((x, y, w, h) => ok({ x, y, w, h })),
  );

/**
 * A still of the screen. On iOS and Android, react-native-view-shot (already used for the story keepsake). The web
 * build has no capture of its own (view-shot needs a library Schwung doesn't ship), so the browser QA harness may
 * provide one (`__schwungQaCapture`, a Playwright screenshot of the same rectangle); without it the web falls back to
 * an instant change.
 */
async function capture(view: ViewRef): Promise<string> {
  if (Platform.OS === 'web') {
    const qa = (globalThis as { __schwungQaCapture?: (r: object) => Promise<string> }).__schwungQaCapture;
    if (typeof qa !== 'function') throw new Error('no capture on the web');
    return qa(await frameOf(view));
  }
  return captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
}

const release = (uri: string | undefined) => {
  if (uri && Platform.OS !== 'web') {
    try {
      releaseCapture(uri);
    } catch {
      // A temporary file the system cleans up anyway.
    }
  }
};

export function LanguageRipple() {
  const { c } = useTheme();
  const host = useRef<ViewRef>(null);
  const screen = useRef<ViewRef>(null);
  const [run, setRun] = useState<Run | null>(null);
  // Mirrors `run` for the synchronous checks (a second tap in the same frame).
  const busy = useRef(false);
  // Bumped when a run ends; an older run's pending steps see it and stop.
  const generation = useRef(0);
  // The language chosen and not yet applied (applied however the run ends).
  const pending = useRef<LanguagePreference | null>(null);
  const shown = useRef<(() => void) | null>(null);
  const images = useRef<string[]>([]);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useRef(false);
  const progress = useSharedValue(0);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => (reduceMotion.current = v));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => (reduceMotion.current = v));
    return () => sub.remove();
  }, []);

  const apply = useCallback(() => {
    const l = pending.current;
    pending.current = null;
    if (l !== null) usePreferences.getState().setLanguage(l);
  }, []);

  /** Ends the run however far it got: the language applied, the images gone, the screen unlocked. */
  const finish = useCallback(() => {
    if (!busy.current) return;
    generation.current += 1;
    cancelAnimation(progress);
    apply();
    if (limit.current) clearTimeout(limit.current);
    limit.current = null;
    shown.current = null;
    busy.current = false;
    setRun(null);
    // Released once the images are off screen.
    const used = images.current;
    images.current = [];
    setTimeout(() => used.forEach(release), 250);
  }, [apply, progress]);

  const choose = useCallback(
    async (l: LanguagePreference, row: ViewRef | null) => {
      if (busy.current) return; // Ignored, not queued.
      const prev = usePreferences.getState().language;
      if (l === prev) return;
      // The words wouldn't change ("Follow device" while showing the phone's language): just the choice.
      if (effectiveLanguage(l) === language() || reduceMotion.current || !row || !host.current || !screen.current) {
        usePreferences.getState().setLanguage(l);
        return;
      }
      const tapped = Date.now();
      busy.current = true;
      pending.current = l;
      const gen = generation.current;
      const live = () => generation.current === gen;
      setRun({ phase: 'locked' });
      limit.current = setTimeout(finish, RUN_LIMIT_MS);
      try {
        const [hostFrame, rowFrame] = await Promise.all([frameOf(host.current), frameOf(row)]);
        const { w, h } = hostFrame;
        const x = rowFrame.x + rowFrame.w / 2 - hostFrame.x;
        const y = rowFrame.y + rowFrame.h / 2 - hostFrame.y;
        // Far enough to clear every corner, ring included.
        const r = Math.max(Math.hypot(x, y), Math.hypot(w - x, y), Math.hypot(x, h - y), Math.hypot(w - x, h - y)) + 2 * RING_WIDTH;

        // 1. The screen as it is, laid over itself.
        const old = await capture(screen.current);
        images.current.push(old);
        if (!live()) return;
        await new Promise<void>((ok) => {
          shown.current = ok;
          setRun({ phase: 'cover', old, w, h });
        });
        if (!live()) return;

        // 2. The language, for real, beneath the cover; then let the screen settle (the tapped row's press fade).
        apply();
        await wait(Math.max(0, tapped + MOTION.pressOut + 20 - Date.now()));
        await nextFrame();
        await nextFrame();
        if (!live() || !screen.current) return;

        // 3. The screen in the new language.
        const next = await capture(screen.current);
        images.current.push(next);
        if (!live()) return;
        await new Promise<void>((ok) => {
          shown.current = ok;
          progress.set(0);
          setRun({ phase: 'ripple', old, next, w, h, x, y, r });
        });
        if (!live()) return;

        // 4. The circle, on the UI thread; ends the run when complete.
        progress.set(
          withTiming(1, { duration: RIPPLE_MS, easing: RIPPLE_EASE, reduceMotion: ReduceMotion.System }, (done) => {
            if (done) scheduleOnRN(finish);
          }),
        );
      } catch (e) {
        if (__DEV__) console.warn('[language ripple] skipped:', e);
        if (live()) finish();
      }
    },
    [apply, finish, progress],
  );

  // An image is on screen: its load, then a frame for it to be drawn.
  const onShown = useCallback(() => {
    const ok = shown.current;
    shown.current = null;
    if (ok) requestAnimationFrame(() => ok());
  }, []);

  // Interruptions end the run (language applied): leaving the foreground, the screen going, Android Back held off.
  useEffect(() => {
    const app = AppState.addEventListener('change', (s) => s !== 'active' && finish());
    const back = BackHandler.addEventListener('hardwareBackPress', () => busy.current);
    return () => {
      app.remove();
      back.remove();
      finish();
    };
  }, [finish]);

  const clip = useAnimatedStyle(() => {
    if (run?.phase !== 'ripple') return {};
    const d = progress.value * run.r;
    return { left: run.x - d, top: run.y - d, width: 2 * d, height: 2 * d, borderRadius: d };
  });
  const inside = useAnimatedStyle(() => {
    if (run?.phase !== 'ripple') return {};
    const d = progress.value * run.r;
    return { left: d - run.x, top: d - run.y };
  });
  const ring = useAnimatedStyle(() => {
    if (run?.phase !== 'ripple') return {};
    const d = progress.value * run.r + RING_WIDTH;
    const p = progress.value;
    return {
      left: run.x - d,
      top: run.y - d,
      width: 2 * d,
      height: 2 * d,
      borderRadius: d,
      opacity: RING_OPACITY * Math.min(1, p * 8) * Math.min(1, (1 - p) / 0.35),
    };
  });

  return (
    <View ref={host} style={styles.fill} collapsable={false}>
      {/* The lock also holds the sheet's swipe to dismiss. */}
      <Stack.Screen options={{ gestureEnabled: run === null }} />
      <View ref={screen} style={styles.fill} collapsable={false}>
        <LanguagePicker onChoose={(l, row) => void choose(l, row)} />
      </View>
      {run ? (
        // The cover: takes every touch while the language changes; invisible to assistive technology.
        <View
          style={StyleSheet.absoluteFill}
          pointerEvents="auto"
          accessible={false}
          aria-hidden
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          testID="ripple-cover"
        >
          {run.phase !== 'locked' ? (
            <Image
              source={{ uri: run.old }}
              style={[styles.still, { width: run.w, height: run.h }]}
              fadeDuration={0}
              onLoad={run.phase === 'cover' ? onShown : undefined}
              testID="ripple-old"
            />
          ) : null}
          {run.phase === 'ripple' ? (
            <>
              <Animated.View style={[styles.clip, clip]} testID="ripple-clip">
                <Animated.Image
                  source={{ uri: run.next }}
                  style={[styles.still, { width: run.w, height: run.h }, inside]}
                  fadeDuration={0}
                  onLoad={onShown}
                />
              </Animated.View>
              <Animated.View style={[styles.ring, { borderColor: c.peach }, ring]} />
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  still: { position: 'absolute', left: 0, top: 0 },
  clip: { position: 'absolute', overflow: 'hidden', width: 0, height: 0 },
  ring: { position: 'absolute', borderWidth: RING_WIDTH, width: 0, height: 0 },
});
