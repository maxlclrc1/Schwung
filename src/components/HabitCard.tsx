import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef, type ReactNode } from 'react';
import { type GestureResponderEvent, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { habitTitle, isCustom, LEVEL_NAME, LEVELS, shownTaskAt } from '../core/habits';
import { swipeOutcome, SWIPE_THRESHOLD, touchIntent } from '../core/swipe';
import type { PlanHabit } from '../core/types';
import { haptic } from '../lib/haptics';
import { space, useTheme } from '../theme';
import { useThemeProgress } from '../theme/transition';
import { habitScene, placeholderCrop } from './habitArt';
import { ThemedImage } from './ThemedImage';
import { TILE_HEIGHT, TILES, type Theme } from './worldTiles';

type Props = {
  habit: PlanHabit;
  done: boolean;
  readOnly?: boolean;
  onToggle: (habitId: string) => void;
  onLongPress?: (habitId: string) => void;
  /** A swipe has taken (true) or let go of (false) the touch: the page holds its scroll meanwhile. */
  onSwipe?: (active: boolean) => void;
};

/*
 * A habit as a window into the Schwung world (testing builds; the public release keeps HabitRow): the whole card is
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
 * Card height: a window onto the scene, 240 pt on a 375pt iPhone and up to 250 on larger ones, tall enough that the
 * top ~45% of the scene (where its subject is painted) stays clear of the text; it grows if larger text needs more.
 */
export function cardHeight(width: number): number {
  return Math.max(220, Math.min(250, Math.round(width * 0.7)));
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

/** The habit's scene: its own art once it exists, otherwise a crop of the world panorama. */
function Scene({ habitId, width, height }: { habitId: string; width: number; height: number }) {
  const dark = habitScene(habitId, 'dark');
  const light = habitScene(habitId, 'light');
  // An explicit size (not just absoluteFill): the web otherwise draws the image at its natural size.
  if (dark && light)
    return (
      <ThemedImage
        sources={{ dark, light }}
        resizeMode="cover"
        style={{ position: 'absolute', left: 0, top: 0, width, height }}
      />
    );
  const crop = placeholderCrop(habitId);
  const tile = TILES.dark[crop.tile];
  const k = width / crop.width;
  const regionHeight = height / k;
  return (
    <ThemedImage
      sources={{ dark: tile.source, light: TILES.light[crop.tile].source }}
      resizeMode="stretch"
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
  return (
    <Animated.Text style={[style, color]} numberOfLines={lines} maxFontSizeMultiplier={1.5}>
      {children}
    </Animated.Text>
  );
}

/**
 * A small button on the card, on the responder system like the card itself (so a swipe that starts on it is still
 * the card's, and a drag never ends in a press). Not separately accessible: the card's own actions cover it.
 */
function CardButton({ onPress, style, children }: { onPress: () => void; style: object; children: ReactNode }) {
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

function HabitCardImpl({ habit, done, readOnly, onToggle, onLongPress, onSwipe }: Props) {
  const { c, isDark } = useTheme();
  const theme: Theme = isDark ? 'dark' : 'light';
  const ink = INK[theme];
  const reduceMotion = useReducedMotion();
  const { width: screen } = useWindowDimensions();
  const width = Math.min(screen, 520) - space.lg * 2;
  const height = cardHeight(width);
  const reach = width * SWIPE_THRESHOLD;

  // The card's horizontal offset while dragged (pt), and the done look (0..1), which eases in and out.
  const tx = useSharedValue(0);
  const doneP = useSharedValue(done ? 1 : 0);
  useEffect(() => {
    doneP.set(reduceMotion ? (done ? 1 : 0) : withTiming(done ? 1 : 0, { duration: 220 }));
  }, [done, doneP, reduceMotion]);

  const settle = () => tx.set(reduceMotion ? withTiming(0, { duration: SETTLE_MS }) : withSpring(0, SPRING));

  const toggle = () => {
    if (readOnly) return;
    if (done) haptic.uncheck();
    else haptic.check();
    onToggle(habit.habitId);
  };

  // The card's touches, all on the responder system (so a swipe cleanly cancels a press or a long-press):
  // - a still press held for LONG_PRESS_MS opens the details;
  // - the first clear direction decides the touch (touchIntent): a vertical one is the page's scroll for the rest of
  //   the touch, and the card never takes it; a clearly sideways one becomes a swipe, and from then on the page
  //   holds still and the card keeps the touch until it's released.
  const gesture = useRef({
    x0: 0,
    y0: 0,
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
  /** Where the card sits for a drag of dx: with the finger toward a toggle, held back the other way. */
  const offsetFor = (dx: number) => {
    const d = done ? -dx : dx;
    // Past the threshold the card keeps following, more slowly; the wrong way it barely moves.
    const shown = d < 0 ? d * 0.12 : d <= reach ? d : reach + (d - reach) * 0.35;
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
    while (s.length > 2 && t - s[0].t > 80) s.shift();
  };
  const beginSwipe = () => {
    clearTimer();
    const g = gesture.current;
    g.mode = 'swipe';
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
        beginSwipe();
        // Android: keeps native views (the page's scroll) from taking the touch from the swipe.
        return true;
      }
      gesture.current.mode = 'press';
      if (onLongPress) {
        gesture.current.timer = setTimeout(() => {
          gesture.current.mode = 'used';
          haptic.heavy();
          onLongPress(habit.habitId);
        }, LONG_PRESS_MS);
      }
      return false;
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const g = gesture.current;
      sample(e);
      if (g.mode === 'press') {
        const intent = readIntent(e);
        if (intent === 'swipe' && !readOnly) beginSwipe();
        // Any real movement ends the long-press; a vertical one is left to the page.
        else if (Math.hypot(dxOf(e), dyOf(e)) > 8) {
          clearTimer();
          if (intent === 'scroll') g.mode = 'used';
        }
      }
      if (g.mode !== 'swipe') return;
      const dx = dxOf(e);
      tx.set(offsetFor(dx));
      const past = (done ? -dx : dx) >= reach;
      if (past !== g.crossed) {
        g.crossed = past;
        if (past) haptic.tap();
      }
    },
    onResponderRelease: (e: GestureResponderEvent) => {
      clearTimer();
      const g = gesture.current;
      if (g.mode !== 'swipe') {
        g.mode = 'idle';
        return;
      }
      endSwipe();
      if (swipeOutcome(dxOf(e), velocity(), width, done) === 'toggle') toggle();
      settle();
    },
    // While swiping, the swipe keeps the touch; otherwise the page may take it to scroll.
    onResponderTerminationRequest: () => gesture.current.mode !== 'swipe',
    onResponderTerminate: () => {
      clearTimer();
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
    const d = done ? -tx.get() : tx.get();
    const k = interpolate(d, [12, reach], [0, 1], 'clamp');
    return { opacity: k, transform: [{ scale: 0.8 + 0.2 * k }] };
  });
  const markFill = useAnimatedStyle(() => ({
    opacity: interpolate(done ? -tx.get() : tx.get(), [reach * 0.85, reach], [0, 1], 'clamp'),
  }));
  // Done: a soft violet wash over the scene, which stays visible, deepening a little as a swipe nears the threshold.
  const washStyle = useAnimatedStyle(() => {
    const k = interpolate(done ? 0 : tx.get(), [0, reach], [0, 0.5], 'clamp');
    return { opacity: Math.max(doneP.get(), k) * (isDark ? 0.24 : 0.16) };
  });
  const doneRow = useAnimatedStyle(() => ({ opacity: doneP.get() }));
  const todoRow = useAnimatedStyle(() => ({ opacity: 1 - doneP.get() }));
  const badge = useAnimatedStyle(() => ({ opacity: doneP.get(), transform: [{ scale: 0.7 + 0.3 * doneP.get() }] }));

  const title = habitTitle(habit);
  const target = shownTaskAt(habit);
  const task = target === title ? undefined : target;
  const levelText = isCustom(habit)
    ? ''
    : `. ${LEVEL_NAME[habit.level]}, level ${LEVELS.indexOf(habit.level) + 1} of 3`;
  const levelIndex = LEVELS.indexOf(habit.level);

  return (
    <Animated.View
      {...touches}
      role="checkbox"
      aria-checked={done}
      aria-disabled={readOnly}
      accessible
      accessibilityLabel={`${title}${task ? `. ${task}` : ''}${levelText}`}
      accessibilityHint={
        readOnly ? undefined : done ? 'Double-tap to undo.' : 'Double-tap, or swipe the card to the right, to complete.'
      }
      accessibilityActions={[
        { name: 'activate' },
        ...(onLongPress ? [{ name: 'longpress' }, { name: 'details', label: 'Edit, swap or remove' }] : []),
      ]}
      onAccessibilityAction={(e) => {
        const name = e.nativeEvent.actionName;
        if (name === 'activate') toggle();
        else if ((name === 'longpress' || name === 'details') && onLongPress) onLongPress(habit.habitId);
      }}
      style={[styles.card, WEB_TOUCH, { minHeight: height, backgroundColor: c.surface }, cardStyle]}
    >
      <Scene habitId={isCustom(habit) ? 'custom' : habit.habitId} width={width} height={height} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.accent }, washStyle]} />
      <Veil pick="veil" locations={[0.35, 0.62, 1]} style={StyleSheet.absoluteFill} />
      {/* A faint veil at the top, for the level label over the sky. */}
      <Veil pick="top" style={styles.topVeil} />

      {/* The level, quietly in the top-left corner, so the scene's window stays clear. */}
      {isCustom(habit) ? null : (
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
            {LEVEL_NAME[habit.level]}
          </Ink>
        </View>
      )}
      {/* Done: a check in the top-right corner. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.badge, { backgroundColor: c.accent }, badge]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <Ionicons name="checkmark" size={18} color={c.onAccent} />
      </Animated.View>

      {/* What a swipe will do, appearing as the card moves: a check (complete) or an undo arrow. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.mark, done ? styles.markUndo : styles.markDone, markStyle]}
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        <View style={[styles.markCircle, { borderColor: c.accent, backgroundColor: ink.chip }]}>
          <Ionicons name={done ? 'arrow-undo' : 'checkmark'} size={28} color={isDark ? c.text : c.accentInk} />
          {/* Fills in as the drag reaches the threshold. */}
          <Animated.View style={[StyleSheet.absoluteFill, styles.markSolid, { backgroundColor: c.accent }, markFill]}>
            <Ionicons name={done ? 'arrow-undo' : 'checkmark'} size={28} color={c.onAccent} />
          </Animated.View>
        </View>
      </Animated.View>

      <View style={styles.body}>
        <Ink pick="title" style={styles.title} lines={2}>
          {title}
        </Ink>
        {task ? (
          <Ink pick="target" style={styles.target} lines={2}>
            {task}
          </Ink>
        ) : null}

        {/* The status row: how to complete, or done with an undo. */}
        <View style={styles.status} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
          <Animated.View style={[styles.statusSide, todoRow]} pointerEvents={done ? 'none' : 'auto'}>
            <View style={styles.hint}>
              <Ionicons name="chevron-forward" size={16} color={ink.target} />
              <Ink pick="target" style={styles.hintText}>
                {readOnly ? 'Not done' : 'Swipe right to complete'}
              </Ink>
            </View>
            {readOnly ? null : (
              <CardButton onPress={toggle} style={[styles.check, { backgroundColor: ink.chip, borderColor: ink.edge }]}>
                <Ionicons name="checkmark" size={22} color={isDark ? c.text : c.accentInk} />
              </CardButton>
            )}
          </Animated.View>
          <Animated.View style={[styles.statusSide, styles.statusOver, doneRow]} pointerEvents={done ? 'auto' : 'none'}>
            <View style={[styles.donePill, { backgroundColor: c.accent }]}>
              <Ionicons name="checkmark" size={16} color={c.onAccent} />
              <Animated.Text style={[styles.doneText, { color: c.onAccent }]} maxFontSizeMultiplier={1.3}>
                Done for today
              </Animated.Text>
            </View>
            {readOnly ? null : (
              <CardButton onPress={toggle} style={[styles.undo, { backgroundColor: ink.chip, borderColor: ink.edge }]}>
                <Ionicons name="arrow-undo" size={15} color={ink.title} />
                <Ink pick="title" style={styles.undoText}>
                  Undo
                </Ink>
              </CardButton>
            )}
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
}

export const HabitCard = memo(HabitCardImpl);

const MARK = 60;
const styles = StyleSheet.create({
  card: { borderRadius: RADIUS, overflow: 'hidden', justifyContent: 'flex-end' },
  fill: { flex: 1 },
  body: { padding: PAD, gap: 4 },
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
  mark: { position: 'absolute', top: 44 },
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
  title: { fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.3 },
  target: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  status: { marginTop: 10, minHeight: 44, justifyContent: 'center' },
  statusSide: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  statusOver: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  hintText: { fontSize: 14, lineHeight: 19, fontWeight: '600', letterSpacing: 0.2 },
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
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
  },
  doneText: { fontSize: 14, fontWeight: '700' },
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
