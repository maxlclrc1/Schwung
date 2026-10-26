import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef, useState } from 'react';
import {
  type GestureResponderEvent,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { habitTitle, isCustom, LEVEL_NAME, LEVELS, shownTaskAt } from '../core/habits';
import type { PlanHabit } from '../core/types';
import { haptic } from '../lib/haptics';
import { space, useTheme } from '../theme';
import { habitScene, placeholderCrop } from './habitArt';
import { T } from './ui';
import { TILE_HEIGHT, TILES, type Theme } from './worldTiles';

type Props = {
  habit: PlanHabit;
  done: boolean;
  readOnly?: boolean;
  onToggle: (habitId: string) => void;
  onLongPress?: (habitId: string) => void;
};

/*
 * A habit as a window into the Schwung world (testing builds; the public release keeps HabitRow): the whole card is
 * the habit's scene, with its name and today's target written over it and a track along the bottom. Swiping across
 * the card (or the track's handle) completes the habit; swiping a done card back undoes it. Tapping the handle, the
 * Undo button and VoiceOver's double-tap do the same without a swipe. Long-press opens the details, as before.
 */

const PAD = 16;
const TRACK = 52;
const KNOB = 44;
const RADIUS = 26;
/** How far across the swipe has to go to count. */
const THRESHOLD = 0.6;
const SPRING = { damping: 18, stiffness: 220, mass: 0.7 };
const LONG_PRESS_MS = 380;
/**
 * On the web, a drag across the card's text would start a text selection, which ends the touch mid-swipe; the
 * card's text isn't meant to be selected anyway. (iOS text isn't selectable unless asked.)
 */
const NO_SELECT = Platform.OS === 'web' ? ({ userSelect: 'none' } as object) : null;

/** Card height: a window onto the scene, 200–240 pt (213 on a 375pt iPhone); it grows if larger text needs more. */
export function cardHeight(width: number): number {
  return Math.max(200, Math.min(240, Math.round(width * 0.62)));
}

const INK: Record<Theme, { veil: string[]; title: string; target: string; track: string; edge: string }> = {
  dark: {
    veil: ['rgba(13,12,22,0)', 'rgba(13,12,22,0.5)', 'rgba(13,12,22,0.86)'],
    title: '#F7F5FF',
    target: 'rgba(240,237,255,0.82)',
    track: 'rgba(28,27,37,0.62)',
    edge: 'rgba(255,255,255,0.1)',
  },
  light: {
    veil: ['rgba(247,246,251,0)', 'rgba(247,246,251,0.62)', 'rgba(247,246,251,0.94)'],
    title: '#1B1830',
    target: 'rgba(27,24,48,0.72)',
    track: 'rgba(255,255,255,0.7)',
    edge: 'rgba(27,24,48,0.07)',
  },
};

/** The habit's scene: its own art once it exists, otherwise a crop of the world panorama. */
function Scene({ habitId, theme, width, height }: { habitId: string; theme: Theme; width: number; height: number }) {
  const art = habitScene(habitId, theme);
  if (art) return <Image source={art} resizeMode="cover" style={StyleSheet.absoluteFill} />;
  const crop = placeholderCrop(habitId);
  const tile = TILES[theme][crop.tile];
  const k = width / crop.width;
  const regionHeight = height / k;
  return (
    <Image
      source={tile.source}
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

function HabitCardImpl({ habit, done, readOnly, onToggle, onLongPress }: Props) {
  const { c, isDark } = useTheme();
  const theme: Theme = isDark ? 'dark' : 'light';
  const ink = INK[theme];
  const { width: screen } = useWindowDimensions();
  const width = Math.min(screen, 520) - space.lg * 2;
  const height = cardHeight(width);
  const travel = width - PAD * 2 - KNOB - 8;

  // 0 = not done (handle at the start), 1 = done (handle at the end); follows the finger while swiping.
  const p = useSharedValue(done ? 1 : 0);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    if (!dragging) p.set(withSpring(done ? 1 : 0, SPRING));
  }, [done, dragging, p]);

  const toggle = () => {
    if (readOnly) return;
    if (done) haptic.uncheck();
    else haptic.check();
    p.set(withSpring(done ? 0 : 1, SPRING));
    onToggle(habit.habitId);
  };

  // The card's touches, all through the responder system (so a swipe cleanly cancels a press or long-press):
  // - a still press held for LONG_PRESS_MS opens the details;
  // - a clearly sideways drag is a swipe: the handle follows the finger, and letting go past THRESHOLD completes
  //   the habit (or, on a done card, undoes it), with a tick as the finger crosses the threshold;
  // - a vertical drag is left to the page, which scrolls.
  const gesture = useRef({
    x0: 0,
    y0: 0,
    start: 0,
    crossed: false,
    mode: 'idle' as 'idle' | 'press' | 'swipe' | 'used',
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  });
  const valueAt = (pageX: number) =>
    Math.min(1, Math.max(0, gesture.current.start + (pageX - gesture.current.x0) / travel));
  const sideways = (e: GestureResponderEvent) => {
    const dx = e.nativeEvent.pageX - gesture.current.x0;
    const dy = e.nativeEvent.pageY - gesture.current.y0;
    return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5;
  };
  const clearTimer = () => {
    if (gesture.current.timer) clearTimeout(gesture.current.timer);
    gesture.current.timer = undefined;
  };
  const beginSwipe = () => {
    clearTimer();
    gesture.current.mode = 'swipe';
    gesture.current.start = done ? 1 : 0;
    gesture.current.crossed = false;
    setDragging(true);
  };
  const touches = {
    onStartShouldSetResponderCapture: (e: GestureResponderEvent) => {
      gesture.current.x0 = e.nativeEvent.pageX;
      gesture.current.y0 = e.nativeEvent.pageY;
      gesture.current.mode = 'idle';
      return false;
    },
    // Takes over from the handle (or anything inside) once a drag is clearly sideways. When the card already has
    // the touch (mode 'press'), its own move handler turns it into a swipe instead.
    onMoveShouldSetResponderCapture: (e: GestureResponderEvent) =>
      !readOnly && gesture.current.mode === 'idle' && sideways(e),
    onStartShouldSetResponder: () => true,
    onResponderGrant: (e: GestureResponderEvent) => {
      if (sideways(e)) {
        beginSwipe();
        return;
      }
      gesture.current.mode = 'press';
      if (onLongPress) {
        gesture.current.timer = setTimeout(() => {
          gesture.current.mode = 'used';
          haptic.heavy();
          onLongPress(habit.habitId);
        }, LONG_PRESS_MS);
      }
    },
    onResponderMove: (e: GestureResponderEvent) => {
      const g = gesture.current;
      if (g.mode === 'press') {
        if (!readOnly && sideways(e)) beginSwipe();
        else if (Math.abs(e.nativeEvent.pageY - g.y0) > 10) {
          clearTimer();
          g.mode = 'idle';
        }
      }
      if (g.mode !== 'swipe') return;
      const v = valueAt(e.nativeEvent.pageX);
      p.set(v);
      const past = g.start === 0 ? v >= THRESHOLD : v <= 1 - THRESHOLD;
      if (past !== g.crossed) {
        g.crossed = past;
        if (past) haptic.tap();
      }
    },
    onResponderRelease: (e: GestureResponderEvent) => {
      clearTimer();
      const g = gesture.current;
      const wasSwipe = g.mode === 'swipe';
      g.mode = 'idle';
      if (!wasSwipe) return;
      setDragging(false);
      const v = valueAt(e.nativeEvent.pageX);
      const complete = !done && v >= THRESHOLD;
      const undo = done && v <= 1 - THRESHOLD;
      if (complete || undo) {
        if (complete) haptic.check();
        else haptic.uncheck();
        p.set(withSpring(complete ? 1 : 0, SPRING));
        onToggle(habit.habitId);
      } else p.set(withSpring(done ? 1 : 0, SPRING));
    },
    // While swiping, the swipe keeps the touch; otherwise the page may take it to scroll.
    onResponderTerminationRequest: () => gesture.current.mode !== 'swipe',
    onResponderTerminate: () => {
      clearTimer();
      gesture.current.mode = 'idle';
      setDragging(false);
      p.set(withSpring(done ? 1 : 0, SPRING));
    },
  };
  // The handle: a tap on it completes (the fallback when a swipe is awkward); a sideways drag from it is a swipe.
  const handle = {
    onStartShouldSetResponder: () => !done && !readOnly,
    onResponderRelease: (e: GestureResponderEvent) => {
      if (Math.abs(e.nativeEvent.pageX - gesture.current.x0) < 8) toggle();
    },
  };

  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: p.get() * travel }] }));
  const fillStyle = useAnimatedStyle(() => ({ width: KNOB + 8 + p.get() * travel, opacity: 0.3 + p.get() * 0.45 }));
  const hintStyle = useAnimatedStyle(() => ({ opacity: Math.max(0, 1 - p.get() * 1.8) }));
  const doneStyle = useAnimatedStyle(() => ({ opacity: interpolate(p.get(), [0.7, 1], [0, 1], 'clamp') }));
  const checkStyle = useAnimatedStyle(() => ({ opacity: interpolate(p.get(), [0.5, 1], [0, 1], 'clamp') }));
  const arrowStyle = useAnimatedStyle(() => ({ opacity: interpolate(p.get(), [0, 0.5], [1, 0], 'clamp') }));
  // Done: a soft violet wash over the scene, which stays visible.
  const washStyle = useAnimatedStyle(() => ({ opacity: p.get() * (isDark ? 0.24 : 0.16) }));

  const title = habitTitle(habit);
  const target = shownTaskAt(habit);
  const task = target === title ? undefined : target;
  const levelText = isCustom(habit)
    ? ''
    : `. ${LEVEL_NAME[habit.level]}, level ${LEVELS.indexOf(habit.level) + 1} of 3`;
  const levelIndex = LEVELS.indexOf(habit.level);

  return (
    <View
      {...touches}
      role="checkbox"
      aria-checked={done}
      aria-disabled={readOnly}
      accessible
      accessibilityLabel={`${title}${task ? `. ${task}` : ''}${levelText}`}
      accessibilityHint={
        readOnly ? undefined : done ? 'Double-tap to undo.' : 'Swipe right across the card, or double-tap, to complete.'
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
      style={[styles.card, NO_SELECT, { minHeight: height, backgroundColor: c.surface }]}
    >
      <Scene habitId={isCustom(habit) ? 'custom' : habit.habitId} theme={theme} width={width} height={height} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: c.accent }, washStyle]} />
      <LinearGradient
        pointerEvents="none"
        colors={ink.veil as [string, string, string]}
        locations={[0.15, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.body}>
        {isCustom(habit) ? null : (
          <View style={styles.levelRow} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.levelBar,
                  { backgroundColor: i <= levelIndex ? ink.title : ink.edge, opacity: i <= levelIndex ? 0.9 : 1 },
                ]}
              />
            ))}
            <T v="caption" color={ink.target} style={styles.levelText} maxFontSizeMultiplier={1.3}>
              {LEVEL_NAME[habit.level]}
            </T>
          </View>
        )}
        <T color={ink.title} style={styles.title} numberOfLines={2} maxFontSizeMultiplier={1.5}>
          {title}
        </T>
        {task ? (
          <T color={ink.target} style={styles.target} numberOfLines={2} maxFontSizeMultiplier={1.5}>
            {task}
          </T>
        ) : null}

        {/* The swipe track. */}
        <View
          style={[styles.track, { backgroundColor: ink.track, borderColor: ink.edge }]}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          <Animated.View style={[styles.fill, { backgroundColor: c.accent }, fillStyle]} />
          <Animated.View style={[styles.trackLabel, hintStyle]} pointerEvents="none">
            <T v="caption" color={ink.target} style={styles.trackText} maxFontSizeMultiplier={1.3}>
              {readOnly ? 'Not done' : 'Swipe to complete'}
            </T>
          </Animated.View>
          <Animated.View style={[styles.trackLabel, styles.doneLabel, doneStyle]} pointerEvents="none">
            <T v="caption" color={c.onAccent} style={styles.trackText} maxFontSizeMultiplier={1.3}>
              Done for today
            </T>
          </Animated.View>
          {done && !readOnly ? (
            <Pressable onPress={toggle} hitSlop={10} style={styles.undo} accessible={false}>
              <Ionicons name="arrow-undo" size={14} color={c.onAccent} />
              <T v="caption" color={c.onAccent} style={styles.undoText} maxFontSizeMultiplier={1.3}>
                Undo
              </T>
            </Pressable>
          ) : null}
          <Animated.View style={[styles.knob, { backgroundColor: c.accent }, knobStyle]}>
            <View {...handle} style={styles.knobHit}>
              <Animated.View style={[styles.knobIcon, arrowStyle]}>
                <Ionicons name="chevron-forward" size={22} color={c.onAccent} />
              </Animated.View>
              <Animated.View style={[styles.knobIcon, checkStyle]}>
                <Ionicons name="checkmark" size={24} color={c.onAccent} />
              </Animated.View>
            </View>
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

export const HabitCard = memo(HabitCardImpl);

const styles = StyleSheet.create({
  card: { borderRadius: 26, overflow: 'hidden', justifyContent: 'flex-end' },
  body: { padding: PAD, gap: 4 },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginBottom: 2 },
  levelBar: { width: 14, height: 3, borderRadius: 2 },
  levelText: { marginLeft: 6, fontSize: 12, lineHeight: 15, fontWeight: '600', letterSpacing: 0.4 },
  title: { fontSize: 24, lineHeight: 29, fontWeight: '700', letterSpacing: -0.3 },
  target: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  track: {
    marginTop: 12,
    height: TRACK,
    borderRadius: RADIUS,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: RADIUS },
  trackLabel: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackText: { fontSize: 14, fontWeight: '600', letterSpacing: 0.2 },
  undo: {
    position: 'absolute',
    left: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  undoText: { fontWeight: '700' },
  // Room for Undo on the left and the handle on the right, so the label never runs into them.
  doneLabel: { paddingLeft: 92, paddingRight: KNOB + 12 },
  knob: { position: 'absolute', left: 4, width: KNOB, height: KNOB, borderRadius: KNOB / 2 },
  knobHit: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  knobIcon: { position: 'absolute' },
});
