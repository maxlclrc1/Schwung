import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef, type ReactNode } from 'react';
import { type GestureResponderEvent, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { dragOffset, swipeOutcome, SWIPE_THRESHOLD, touchIntent } from '../core/swipe';
import { haptic } from '../lib/haptics';
import { space, useTheme } from '../theme';
import { useDepth } from '../theme/depth';
import { useThemeProgress } from '../theme/transition';
import { cropAt, habitScene, placeholderCrop } from './habitArt';
import { useCardBlock } from './TabPager';
import { GestureDetector } from 'react-native-gesture-handler';
import { ThemedImage } from './ThemedImage';
import { TILE_HEIGHT, TILES, type Theme } from './worldTiles';
import { useT } from '../i18n/react';
import { flipX, physical } from '../i18n/direction';
import { useScriptAdjust } from '../i18n/script';

type Props = {
  habitId: string;
  done: boolean;
  readOnly?: boolean;
  onToggle: (habitId: string) => void;
  onLongPress?: (habitId: string) => void;
  /** A swipe has taken (true) or let go of (false) the touch: the page holds its scroll meanwhile. */
  onSwipe?: (active: boolean) => void;
  /** The card's title, target, level and words. */
  display: CardDisplay;
  /** A habit of the person's own: which part of the panorama it shows (habitArt.ts cropAt). */
  scene?: number;
  /** A small row under the target (weekly progress, an optional timer). Its buttons are CardButtons. */
  accessory?: ReactNode;
  /** Extra VoiceOver actions (the accessory's buttons, which aren't separately accessible). */
  actions?: { name: string; label: string; run: () => void }[];
};

export type CardDisplay = {
  title: string;
  task?: string;
  /** 0–2: how many of the three level bars are lit. */
  levelIndex: number;
  levelLabel: string;
  /** Read after the title and target by VoiceOver (e.g. "2 of 4 this week"). */
  summary?: string;
  /** The hint in the to-do row ("Swipe right to complete" by default). */
  hint?: string;
  /** The done pill ("Done for today" by default). */
  doneText?: string;
  /** Shows the swipe hint. The list gives it to one card only, so the instruction isn't repeated on every card. */
  showHint?: boolean;
};

/*
 * A habit as a window into the Schwung world: the whole card is
 * the habit's scene, with its name and today's target written over it.
 *
 * Completing is a swipe of the whole card: drag it to the right and it follows the finger, tilting slightly, while a
 * check appears; let go past the threshold (or flick) and the habit is done, and the card settles back in place with
 * its done look. A done card swiped to the left is undone the same way. Short of the threshold it springs back.
 * The check button, Undo, and VoiceOver's double-tap do the same without a swipe; long-press opens the details.
 *
 * Vertical scrolling stays the page's: the card only takes a touch once it's clearly sideways (see `touches`).
 */

const PAD = 16;
const RADIUS = 26;
/** The most the card tilts, at the threshold (degrees). */
const TILT = 3;
const SPRING = { damping: 20, stiffness: 260, mass: 0.8 };
const SETTLE_MS = 180;
const LONG_PRESS_MS = 380;
/**
 * The web's stand-ins for what iOS does natively: the browser keeps vertical pans (pan-y) and hands sideways ones to
 * the card; and a drag across the card's text mustn't start a text selection, which would end the touch mid-swipe.
 */
const WEB_TOUCH = Platform.OS === 'web' ? ({ userSelect: 'none', touchAction: 'pan-y' } as object) : null;

/**
 * Card height: a window onto the scene, ~175 pt on a typical iPhone (160–180), so two whole cards fit under the
 * Today header. The scene is anchored to its top, where its subject is painted, and the words sit low with the
 * complete button beside them; the card grows if larger text needs more.
 */
export function cardHeight(width: number): number {
  return Math.max(160, Math.min(180, Math.round(width * 0.49)));
}

const INK: Record<Theme, { veil: string[]; top: string[]; title: string; target: string; chip: string; edge: string }> =
  {
    dark: {
      veil: ['rgba(13,12,22,0)', 'rgba(13,12,22,0.5)', 'rgba(13,12,22,0.86)'],
      top: ['rgba(13,12,22,0.45)', 'rgba(13,12,22,0)'],
      title: '#F7F5FF',
      target: 'rgba(240,237,255,0.82)',
      chip: 'rgba(28,27,37,0.62)',
      edge: 'rgba(255,255,255,0.14)',
    },
    light: {
      veil: ['rgba(247,246,251,0)', 'rgba(247,246,251,0.62)', 'rgba(247,246,251,0.94)'],
      top: ['rgba(247,246,251,0.6)', 'rgba(247,246,251,0)'],
      title: '#1B1830',
      target: 'rgba(27,24,48,0.72)',
      chip: 'rgba(255,255,255,0.72)',
      edge: 'rgba(27,24,48,0.12)',
    },
  };

/**
 * The habit's scene: its own art, or a part of the world panorama (the one given to a habit of the person's own, or
 * one picked by id).
 */
function Scene({ habitId, scene, width, height }: { habitId: string; scene?: number; width: number; height: number }) {
  const dark = habitScene(habitId, 'dark');
  const light = habitScene(habitId, 'light');
  // An explicit size (not just absoluteFill): the web otherwise draws the image at its natural size.
  if (dark && light)
    return (
      <ThemedImage
        sources={{ dark, light }}
        contentFit="cover"
        contentPosition="top"
        style={{ position: 'absolute', left: 0, top: 0, width, height }}
      />
    );
  const crop = scene !== undefined ? cropAt(scene) : placeholderCrop(habitId);
  const tile = TILES.dark[crop.tile];
  const k = width / crop.width;
  const regionHeight = height / k;
  return (
    <ThemedImage
      sources={{ dark: tile.source, light: TILES.light[crop.tile].source }}
      contentFit="fill"
      style={{
        position: 'absolute',
        width: tile.width * k,
        height: TILE_HEIGHT * k,
        left: -(crop.cx - crop.width / 2) * k,
        top: -(crop.cy - regionHeight / 2) * k,
      }}
    />
  );
}

/** A veil in both themes: the light one fades in over the dark one with the theme. */
function Veil({
  pick,
  locations,
  style,
}: {
  pick: 'veil' | 'top';
  locations?: [number, number, ...number[]];
  style: object;
}) {
  const progress = useThemeProgress();
  const light = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const dark = useAnimatedStyle(() => ({ opacity: 1 - progress.get() }));
  return (
    <>
      <Animated.View pointerEvents="none" style={[style, dark]}>
        <LinearGradient colors={INK.dark[pick] as [string, string]} locations={locations} style={styles.fill} />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[style, light]}>
        <LinearGradient colors={INK.light[pick] as [string, string]} locations={locations} style={styles.fill} />
      </Animated.View>
    </>
  );
}

/** Text in the card's ink, fading with the theme like the rest of the UI. */
function Ink({
  pick,
  style,
  children,
  lines,
}: {
  pick: 'title' | 'target';
  style: object;
  children: ReactNode;
  lines?: number;
}) {
  const progress = useThemeProgress();
  const color = useAnimatedStyle(() => ({
    color: interpolateColor(progress.get(), [0, 1], [INK.dark[pick], INK.light[pick]]),
  }));
  const script = useScriptAdjust(style);
  return (
    <Animated.Text style={[style, script, color]} numberOfLines={lines} maxFontSizeMultiplier={1.5}>
      {children}
    </Animated.Text>
  );
}

/**
 * A small button on the card, on the responder system like the card itself (so a swipe that starts on it is still
 * the card's, and a drag never ends in a press). Not separately accessible: the card's own actions cover it.
 */
export function CardButton({ onPress, style, children }: { onPress: () => void; style: object; children: ReactNode }) {
  const start = useRef({ x: 0, y: 0 });
  return (
    <View
      hitSlop={8}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(e) => {
        start.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
      }}
      onResponderRelease={(e) => {
        const moved = Math.hypot(e.nativeEvent.pageX - start.current.x, e.nativeEvent.pageY - start.current.y);
        if (moved < 10) onPress();
      }}
      style={style}
    >
      {children}
    </View>
  );
}

function HabitCardImpl({
  habitId,
  scene,
  done,
  readOnly,
  onToggle,
  onLongPress,
  onSwipe,
  display,
  accessory,
  actions,
}: Props) {
  const { c, isDark } = useTheme();
  const depth = useDepth();
  const t = useT();
  const theme: Theme = isDark ? 'dark' : 'light';
  const ink = INK[theme];
  const reduceMotion = useReducedMotion();
  const { width: screen } = useWindowDimensions();
  const width = Math.min(screen, 520) - space.lg * 2;
  const height = cardHeight(width);
  const reach = width * SWIPE_THRESHOLD;

  // The card's horizontal offset while dragged (pt), and the done look (0..1), which eases in and out.
  const tx = useSharedValue(0);
  // How far the finger itself has gone toward a toggle (pt): the marks read it, so they track the threshold exactly
  // while the card eases off near it.
  const pull = useSharedValue(0);
  // A toggle waiting for the program to catch up (it updates a frame later): a second swipe in that moment would
  // read the old state and toggle back, so it's ignored until the card's state changes (or a moment passes).
  const pending = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(pending.current);
    pending.current = undefined;
  }, [done]);
  useEffect(() => () => clearTimeout(pending.current), []);
  const doneP = useSharedValue(done ? 1 : 0);
  // Completing (never on open or a re-render): one soft sage ring breathes out from the check, and the check
  // itself lands with a small overshoot-free pop.
  const ring = useSharedValue(0);
  // A finger resting on the card: a faint shade (the card itself is never scaled, so nothing blurs).
  const held = useSharedValue(0);
  const hold = (on: boolean) => held.set(withTiming(on ? 1 : 0, { duration: on ? 80 : 200 }));
  const pop = useSharedValue(0);
  const wasDone = useRef(done);
  useEffect(() => {
    doneP.set(
      reduceMotion
        ? done
          ? 1
          : 0
        : withTiming(done ? 1 : 0, { duration: 300, easing: Easing.bezier(0.22, 1, 0.36, 1) }),
    );
    const completed = done && !wasDone.current;
    wasDone.current = done;
    if (!completed || reduceMotion) return;
    ring.set(0);
    ring.set(withTiming(1, { duration: 620, easing: Easing.out(Easing.cubic) }));
    pop.set(
      withSequence(
        withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 260, easing: Easing.inOut(Easing.quad) }),
      ),
    );
  }, [done, doneP, reduceMotion, ring, pop]);

  /** Back to rest: a spring that picks up the finger's speed (pt/ms) as it lets go, or a plain ease (Reduce Motion). */
  const settle = (velocity = 0) => {
    if (reduceMotion) {
      tx.set(withTiming(0, { duration: SETTLE_MS }));
      pull.set(withTiming(0, { duration: SETTLE_MS }));
      return;
    }
    const v = Math.max(-2500, Math.min(2500, velocity * 1000));
    tx.set(withSpring(0, { ...SPRING, velocity: v }));
    pull.set(withSpring(0, SPRING));
  };

  const toggle = () => {
    if (readOnly || pending.current) return;
    pending.current = setTimeout(() => (pending.current = undefined), 600);
    if (done) haptic.undo();
    else haptic.complete();
    // The card answers at once, on the UI thread; the program (and everything that follows it: XP, the day, the
    // other tabs) updates a frame later, so that work never holds the animation's first frame.
    doneP.set(
      reduceMotion
        ? done
          ? 0
          : 1
        : withTiming(done ? 0 : 1, { duration: 300, easing: Easing.bezier(0.22, 1, 0.36, 1) }),
    );
    requestAnimationFrame(() => onToggle(habitId));
  };

  // The card's touches, all on the responder system (so a swipe cleanly cancels a press or a long-press):
  // - a still press held for LONG_PRESS_MS opens the details;
  // - the first clear direction decides the touch (touchIntent): a vertical one is the page's scroll for the rest of
  //   the touch, and the card never takes it; a clearly sideways one becomes a swipe, and from then on the page
  //   holds still and the card keeps the touch until it's released.
  const gesture = useRef({
    x0: 0,
    y0: 0,
    /** Where the swipe took over: the card moves from here, so it doesn't jump by the distance that decided it. */
    x1: 0,
    intent: 'undecided' as 'undecided' | 'swipe' | 'scroll',
    mode: 'idle' as 'idle' | 'press' | 'swipe' | 'used',
    crossed: false,
    samples: [] as { x: number; t: number }[],
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  });
  const clearTimer = () => {
    if (gesture.current.timer) clearTimeout(gesture.current.timer);
    gesture.current.timer = undefined;
  };
  const dxOf = (e: GestureResponderEvent) => e.nativeEvent.pageX - gesture.current.x0;
  const dyOf = (e: GestureResponderEvent) => e.nativeEvent.pageY - gesture.current.y0;
  // Reads the direction once it's clear and keeps it for the rest of the touch.
  const readIntent = (e: GestureResponderEvent) => {
    const g = gesture.current;
    if (g.intent === 'undecided') g.intent = touchIntent(dxOf(e), dyOf(e));
    return g.intent;
  };
  /** The swipe's own distance: from where it took over. */
  const swipeDx = (e: GestureResponderEvent) => e.nativeEvent.pageX - gesture.current.x1;
  /** Where the card sits for a drag of dx: 1:1 with the finger, easing off near the threshold (dragOffset). */
  const offsetFor = (dx: number) => {
    const shown = dragOffset(done ? -dx : dx, reach);
    return done ? -shown : shown;
  };
  const velocity = () => {
    const s = gesture.current.samples;
    if (s.length < 2) return 0;
    const a = s[0];
    const b = s[s.length - 1];
    return b.t > a.t ? (b.x - a.x) / (b.t - a.t) : 0;
  };
  const sample = (e: GestureResponderEvent) => {
    const s = gesture.current.samples;
    const t = e.nativeEvent.timestamp ?? Date.now();
    s.push({ x: e.nativeEvent.pageX, t });
    // The finger's recent speed (the last ~50 ms), so a late change of direction reads as one.
    while (s.length > 2 && t - s[0].t > 50) s.shift();
  };
  const beginSwipe = (e: GestureResponderEvent) => {
    clearTimer();
    hold(false);
    const g = gesture.current;
    g.mode = 'swipe';
    g.x1 = e.nativeEvent.pageX;
    g.crossed = false;
    onSwipe?.(true);
  };
  const endSwipe = () => {
    gesture.current.mode = 'idle';
    onSwipe?.(false);
  };

  const touches = {
    onStartShouldSetResponderCapture: (e: GestureResponderEvent) => {
      const g = gesture.current;
      g.x0 = e.nativeEvent.pageX;
      g.y0 = e.nativeEvent.pageY;
      g.intent = 'undecided';
      g.mode = 'idle';
      g.samples = [];
      return false;
    },
    // Takes the touch from a button inside (or from nothing) once it's clearly sideways. When the card already has
    // the touch (a press), its own move handler turns it into a swipe instead.
    onMoveShouldSetResponderCapture: (e: GestureResponderEvent) =>
      !readOnly && gesture.current.mode === 'idle' && readIntent(e) === 'swipe',
    onStartShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => {
      sample(e);
      if (gesture.current.intent === 'swipe') {
        beginSwipe(e);
        // Android: keeps native views (the page's scroll) from taking the touch from the swipe.
        return true;
      }
      gesture.current.mode = 'press';
      hold(true);
      if (onLongPress) {
        gesture.current.timer = setTimeout(() => {
          gesture.current.mode = 'used';
          haptic.press();
          onLongPress(habitId);
        }, LONG_PRESS_MS);
      }
      return false;
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const g = gesture.current;
      sample(e);
      if (g.mode === 'press') {
        const intent = readIntent(e);
        if (intent === 'swipe' && !readOnly) beginSwipe(e);
        // Any real movement ends the long-press; a vertical one is left to the page.
        else if (Math.hypot(dxOf(e), dyOf(e)) > 8) {
          clearTimer();
          hold(false);
          if (intent === 'scroll') g.mode = 'used';
        }
      }
      if (g.mode !== 'swipe') return;
      const dx = swipeDx(e);
      tx.set(offsetFor(dx));
      pull.set(Math.max(0, done ? -dx : dx));
      const past = (done ? -dx : dx) >= reach;
      if (past !== g.crossed) {
        g.crossed = past;
        if (past) haptic.tick();
      }
    },
    onResponderRelease: (e: GestureResponderEvent) => {
      clearTimer();
      hold(false);
      const g = gesture.current;
      if (g.mode !== 'swipe') {
        g.mode = 'idle';
        return;
      }
      endSwipe();
      const toggled = !pending.current && swipeOutcome(swipeDx(e), velocity(), width, done) === 'toggle';
      if (toggled) toggle();
      // A cancelled swipe carries the finger's speed back into the spring; a toggle settles from rest.
      settle(toggled ? 0 : velocity());
    },
    // While swiping, the swipe keeps the touch; otherwise the page may take it to scroll.
    onResponderTerminationRequest: () => gesture.current.mode !== 'swipe',
    onResponderTerminate: () => {
      clearTimer();
      hold(false);
      if (gesture.current.mode === 'swipe') endSwipe();
      gesture.current.mode = 'idle';
      settle();
    },
  };

  const cardStyle = useAnimatedStyle(() => {
    const x = tx.get();
    return {
      transform: [
        { translateX: x },
        { rotate: `${reduceMotion ? 0 : interpolate(x, [-reach, reach], [-TILT, TILT])}deg` },
      ],
    };
  });
  // How close the drag is to counting (0..1), for the check (or undo) that appears as the card moves.
  const markStyle = useAnimatedStyle(() => {
    const k = interpolate(pull.get(), [12, reach], [0, 1], 'clamp');
    return { opacity: k, transform: [{ scale: 0.8 + 0.2 * k }] };
  });
  const markFill = useAnimatedStyle(() => ({
    opacity: interpolate(pull.get(), [reach * 0.85, reach], [0, 1], 'clamp'),
  }));
  // Done: a soft violet wash over the scene, which stays visible, deepening a little as a swipe nears the threshold.
  const washStyle = useAnimatedStyle(() => {
    const k = interpolate(done ? 0 : pull.get(), [0, reach], [0, 0.5], 'clamp');
    return { opacity: Math.max(doneP.get(), k) * (isDark ? 0.24 : 0.16) };
  });
  const doneRow = useAnimatedStyle(() => ({
    opacity: doneP.get(),
    transform: [{ translateY: (1 - doneP.get()) * 6 }],
  }));
  const todoRow = useAnimatedStyle(() => ({ opacity: 1 - doneP.get() }));
  const badge = useAnimatedStyle(() => ({
    opacity: doneP.get(),
    transform: [{ scale: 0.6 + 0.4 * doneP.get() + 0.14 * pop.get() }],
  }));
  const heldStyle = useAnimatedStyle(() => ({ opacity: held.get() * (isDark ? 0.16 : 0.08) }));
  // Done: a fine sage edge around the card.
  const edgeStyle = useAnimatedStyle(() => ({ opacity: doneP.get() * 0.95 }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ring.get() > 0 && ring.get() < 1 ? 0.55 * (1 - ring.get()) : 0,
    transform: [{ scale: 1 + ring.get() * 1.6 }],
  }));

  const title = display.title;
  const target = display.task;
  const task = target === title ? undefined : target;
  const levelText = `. ${display.levelLabel}${display.summary ? `. ${display.summary}` : ''}`;
  const levelIndex = display.levelIndex;
  const levelName = display.levelLabel;
  const block = useCardBlock();

  const card = (
    <Animated.View
      {...touches}
      role="checkbox"
      aria-checked={done}
      aria-disabled={readOnly}
      accessible
      accessibilityLabel={`${title}${task ? `. ${task}` : ''}${levelText}`}
      accessibilityHint={readOnly ? undefined : done ? t('today.card.hintUndo') : t('today.card.hintDo')}
      accessibilityActions={[
        { name: 'activate' },
        ...(onLongPress ? [{ name: 'longpress' }, { name: 'details', label: t('today.card.details') }] : []),
        ...(actions ?? []).map((a) => ({ name: a.name, label: a.label })),
      ]}
      onAccessibilityAction={(e) => {
        const name = e.nativeEvent.actionName;
        if (name === 'activate') toggle();
        else if ((name === 'longpress' || name === 'details') && onLongPress) onLongPress(habitId);
        else actions?.find((a) => a.name === name)?.run();
      }}
      style={[styles.card, depth.card, WEB_TOUCH, { minHeight: height, backgroundColor: c.surface }, cardStyle]}
    >
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, physical]}>
        <Scene habitId={habitId} scene={scene} width={width} height={height} />
      </View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.sage }, washStyle]} />
      {/* Starts higher than on the old, taller card: the words now sit at about mid-height. */}
      <Veil pick="veil" locations={[0.22, 0.52, 0.92]} style={StyleSheet.absoluteFill} />
      {/* A faint veil at the top, for the level label over the sky. */}
      <Veil pick="top" style={styles.topVeil} />

      {/* The level, quietly in the top-left corner, so the scene's window stays clear. */}
      <View
        style={[styles.levelRow, styles.levelTop]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.levelBar,
              { backgroundColor: i <= levelIndex ? ink.title : ink.edge, opacity: i <= levelIndex ? 0.9 : 1 },
            ]}
          />
        ))}
        <Ink pick="target" style={styles.levelText}>
          {levelName}
        </Ink>
      </View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.held, heldStyle]} />
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.edge, { borderColor: c.sage }, edgeStyle]}
      />
      {/* Done: a check in the top-right corner, with the ring that breathes out from it on completing. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.badge, styles.ring, { borderColor: c.sage }, ringStyle]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.badge, { backgroundColor: c.sage }, badge]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Ionicons name="checkmark" size={18} color={c.onTint} />
      </Animated.View>

      {/* What a swipe will do, appearing as the card moves: a check (complete) or an undo arrow. */}
      {/* The swipe is physical (right completes), so its marks keep their sides in a right-to-left layout. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, physical]}>
        <Animated.View
          pointerEvents="none"
          style={[styles.mark, done ? styles.markUndo : styles.markDone, markStyle]}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <View style={[styles.markCircle, { borderColor: c.sage, backgroundColor: ink.chip }]}>
            <Ionicons name={done ? 'arrow-undo' : 'checkmark'} size={28} color={isDark ? c.text : c.sageInk} />
            {/* Fills in as the drag reaches the threshold. */}
            <Animated.View style={[StyleSheet.absoluteFill, styles.markSolid, { backgroundColor: c.sage }, markFill]}>
              <Ionicons name={done ? 'arrow-undo' : 'checkmark'} size={28} color={c.onTint} />
            </Animated.View>
          </View>
        </Animated.View>
      </View>

      <View style={styles.body}>
        <View style={styles.main}>
          <View style={styles.words}>
            {/* Three lines: the button beside the words narrows them, and a person's own habit can have a long name. */}
            <Ink pick="title" style={styles.title} lines={3}>
              {title}
            </Ink>
            {task ? (
              <Ink pick="target" style={styles.target} lines={2}>
                {task}
              </Ink>
            ) : null}
            {accessory ? (
              <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                {accessory}
              </View>
            ) : null}
          </View>
          {/* Complete, or undo once done, beside the words. */}
          {readOnly ? null : (
            <View style={styles.action} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
              <Animated.View style={[styles.actionSide, todoRow]} pointerEvents={done ? 'none' : 'auto'}>
                <CardButton
                  onPress={toggle}
                  style={[styles.check, { backgroundColor: ink.chip, borderColor: ink.edge }]}
                >
                  <Ionicons name="checkmark" size={22} color={isDark ? c.text : c.sageInk} />
                </CardButton>
              </Animated.View>
              <Animated.View
                style={[styles.actionSide, styles.actionOver, doneRow]}
                pointerEvents={done ? 'auto' : 'none'}
              >
                <CardButton
                  onPress={toggle}
                  style={[styles.undo, { backgroundColor: ink.chip, borderColor: ink.edge }]}
                >
                  <Ionicons name="arrow-undo" size={15} color={ink.title} />
                  <Ink pick="title" style={styles.undoText}>
                    {t('today.card.undo')}
                  </Ink>
                </CardButton>
              </Animated.View>
            </View>
          )}
        </View>

        {/* The status line: the swipe hint (on one card only), or done. */}
        <View style={styles.status} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Animated.View style={[styles.statusSide, todoRow]}>
            {readOnly || display.showHint ? (
              <View style={styles.hint}>
                <Ionicons name="chevron-forward" size={15} color={ink.target} style={flipX} />
                <Ink pick="target" style={styles.hintText}>
                  {readOnly ? t('today.card.notDone') : (display.hint ?? t('today.card.swipe'))}
                </Ink>
              </View>
            ) : null}
          </Animated.View>
          <Animated.View style={[styles.statusSide, styles.statusOver, doneRow]}>
            <View style={[styles.donePill, { backgroundColor: c.sage }]}>
              <Ionicons name="checkmark" size={14} color={c.onTint} />
              <Animated.Text style={[styles.doneText, { color: c.onTint }]} maxFontSizeMultiplier={1.3}>
                {display.doneText ?? t('today.card.doneToday')}
              </Animated.Text>
            </View>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
  // Inside the tab pager, a touch that starts on the card is the card's: it blocks the pager (TabPager).
  return block ? <GestureDetector gesture={block}>{card}</GestureDetector> : card;
}

export const HabitCard = memo(HabitCardImpl);

const MARK = 60;
const styles = StyleSheet.create({
  card: { borderRadius: RADIUS, overflow: 'hidden', justifyContent: 'flex-end' },
  fill: { flex: 1 },
  // Clear of the level label in the top corner, however tall the words grow (long names, large text).
  body: { padding: PAD, paddingTop: 36, gap: 6 },
  main: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  words: { flex: 1, gap: 2 },
  action: { minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  actionSide: { alignItems: 'flex-end', justifyContent: 'center' },
  actionOver: { position: 'absolute', right: 0, top: 0, bottom: 0 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  levelTop: { position: 'absolute', top: 14, left: PAD },
  topVeil: { position: 'absolute', left: 0, right: 0, top: 0, height: 64 },
  levelBar: { width: 14, height: 3, borderRadius: 2 },
  levelText: { marginLeft: 6, fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.4 },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { backgroundColor: 'transparent', borderWidth: 2 },
  held: { backgroundColor: '#000000' },
  edge: { borderRadius: RADIUS, borderWidth: 2.5 },
  mark: { position: 'absolute', top: 30 },
  markDone: { left: 24 },
  markUndo: { right: 24 },
  markCircle: {
    width: MARK,
    height: MARK,
    borderRadius: MARK / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  markSolid: { borderRadius: MARK / 2, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 25, lineHeight: 30, fontWeight: '800', letterSpacing: -0.5 },
  target: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  status: { minHeight: 26, justifyContent: 'center' },
  statusSide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  statusOver: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  hintText: { fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.2 },
  check: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    height: 26,
    borderRadius: 13,
  },
  doneText: { fontSize: 13, fontWeight: '700' },
  undo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
  },
  undoText: { fontSize: 14, lineHeight: 19, fontWeight: '700' },
});
