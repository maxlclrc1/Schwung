import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library/legacy';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import { adoptTemp, removeTemp, shareTemp } from '../../lib/appFiles';
import { DAY_POINTS } from '../../core/ascent';
import { PROGRAM_DAYS } from '../../core/dates';
import { storyFacts } from '../../core/reset/story';
import { WORLD } from '../../core/world';
import { haptic } from '../../lib/haptics';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { radius, space, useTheme } from '../../theme';
import { rise } from '../onboarding/kit';
import { ART_IMAGE } from '../ThemedImage';
import { Button, T } from '../ui';
import { WORLD_ART } from '../World';

/*
 * The 66-Day Story (app/life-reset/story.tsx): a keepsake made at the summit, a portrait poster of Schwung's own
 * mountain with the real 66-day trail (a sage light on every completed day), editorial type and four numbers
 * from the saved days, plus one highlight the record supports. No habit names, ever. The poster on screen is the
 * preview: Save and Share capture exactly it, at the screen's full resolution, once its reveal has finished.
 * Nothing leaves the phone unless the person shares it.
 */

const sys = ReduceMotion.System;
const SETTLE = Easing.bezier(0.22, 1, 0.36, 1);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const short = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

export function StoryKeepsake() {
  const { c, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const poster = useRef<ComponentRef<typeof View>>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const today = program ? pilotToday({ program, devDayOffset: offset }) : 0;
  const facts = useMemo(() => (program ? storyFacts(program, today) : null), [program, today]);

  // The poster: portrait 9:16, as wide as the screen allows.
  const W = Math.min(width - space.lg * 2, 430);
  const H = Math.round((W * 16) / 9);
  const k = W / WORLD.width;
  const zoneTop = H * 0.14;
  const zoneH = W / 1.5;
  const imageTop = zoneTop - WORLD.paintingTop * k;
  const pts = DAY_POINTS.map((p) => ({ x: p.x * W, y: zoneTop + p.y * zoneH }));
  let length = 0;
  for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // The reveal: the mountain settles in, the trail draws itself up, the words follow; then Save and Share.
  const shown = useSharedValue(reduce ? 1 : 0);
  const drawn = useSharedValue(reduce ? 1 : 0);
  useEffect(() => {
    if (!reduce) {
      shown.set(withTiming(1, { duration: 900, easing: SETTLE, reduceMotion: sys }));
      drawn.set(
        withDelay(500, withTiming(1, { duration: 1500, easing: Easing.bezier(0.45, 0, 0.2, 1), reduceMotion: sys })),
      );
    }
    const t = setTimeout(() => setReady(true), reduce ? 200 : 2300);
    return () => clearTimeout(t);
  }, [reduce, shown, drawn]);
  const art = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ scale: 1.05 - shown.value * 0.05 }] }));
  const trail = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.value) }));
  const lights = useAnimatedStyle(() => ({ opacity: drawn.value }));

  if (!program || !facts) return null;

  // Captured at full quality, then kept in Schwung's managed temporary folder (lib/appFiles.ts) until it's done.
  const capture = async () =>
    adoptTemp('story', await captureRef(poster, { format: 'png', quality: 1, result: 'tmpfile' }));
  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const p = await MediaLibrary.requestPermissionsAsync(true);
      if (!p.granted) {
        haptic.warning();
        setStatus('Photos access is off for Schwung. You can still share it, or allow it in Settings.');
        return;
      }
      const image = await capture();
      try {
        // Photos keeps its own copy; the temporary one goes at once.
        await MediaLibrary.saveToLibraryAsync(image.uri);
      } finally {
        removeTemp(image);
      }
      haptic.confirm();
      setStatus('Saved to your Photos.');
    } catch {
      setStatus('It couldn’t be saved just now. Please try again.');
    } finally {
      setBusy(false);
    }
  };
  const share = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await shareTemp(await capture(), {
        mimeType: 'image/png',
        UTI: 'public.png',
        dialogTitle: 'My 66-day story',
      });
    } catch {
      setStatus('Sharing isn’t available just now.');
    } finally {
      setBusy(false);
    }
  };

  const stats = [
    { value: `${facts.daysCompleted}`, unit: `of ${PROGRAM_DAYS}`, label: 'days completed', color: c.sageInk },
    {
      value: `${facts.totalDone}`,
      unit: '',
      label: facts.totalDone === 1 ? 'habit done' : 'habits done',
      color: c.mistInk,
    },
    {
      value: `${facts.longestStreak}`,
      unit: '',
      label: facts.longestStreak === 1 ? 'day, longest streak' : 'days, longest streak',
      color: c.peachInk,
    },
    {
      value: `${facts.habits}`,
      unit: '',
      label: facts.habits === 1 ? 'habit practised' : 'habits practised',
      color: c.indigoInk,
    },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: c.bg, paddingTop: insets.top + space.sm }]}>
      <View style={styles.bar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
          <View style={[styles.close, { backgroundColor: c.surface }]}>
            <Ionicons name="close" size={20} color={c.text} />
          </View>
        </Pressable>
        <T v="caption" color={c.textDim} style={{ fontWeight: '700' }}>
          Your 66-day story
        </T>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* The poster itself: exactly what Save and Share capture. */}
        <View
          ref={poster}
          collapsable={false}
          style={[styles.poster, { width: W, height: H, backgroundColor: c.bg }]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={`Your 66-day story, ${short(facts.from)} to ${short(facts.to)}. ${facts.daysCompleted} of ${PROGRAM_DAYS} days completed, ${facts.totalDone} habits done, longest streak ${facts.longestStreak} days, ${facts.habits} habits practised.${facts.highlight ? ` ${facts.highlight}.` : ''}`}
        >
          <Animated.View style={[StyleSheet.absoluteFill, art]}>
            <Image
              {...ART_IMAGE}
              source={isDark ? WORLD_ART.dark : WORLD_ART.light}
              style={{ position: 'absolute', left: 0, top: imageTop, width: W, height: WORLD.height * k }}
            />
            <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
              <Path
                d={d}
                stroke="#FFFFFF"
                strokeOpacity={0.35}
                strokeWidth={1.2}
                strokeDasharray="1 4"
                strokeLinecap="round"
                fill="none"
              />
              <AnimatedPath
                d={d}
                stroke="#FFFFFF"
                strokeOpacity={0.85}
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={[length, length]}
                animatedProps={trail}
              />
            </Svg>
            <Animated.View style={[StyleSheet.absoluteFill, lights]}>
              <Svg width={W} height={H}>
                {facts.complete.map((day) => (
                  <Circle
                    key={day}
                    cx={pts[day - 1].x}
                    cy={pts[day - 1].y}
                    r={2.6}
                    fill={c.sage}
                    stroke="#FFFFFF"
                    strokeWidth={0.8}
                  />
                ))}
                <Circle
                  cx={pts[PROGRAM_DAYS - 1].x}
                  cy={pts[PROGRAM_DAYS - 1].y}
                  r={4.5}
                  fill={c.gold}
                  stroke="#FFFFFF"
                  strokeWidth={1.2}
                />
              </Svg>
            </Animated.View>
          </Animated.View>
          <LinearGradient
            colors={[`${c.bg}00`, `${c.bg}F2`, c.bg]}
            locations={[0, 0.42, 0.6]}
            style={[styles.ground, { top: H * 0.42 }]}
          />

          <View style={styles.head}>
            <Text style={[styles.brand, { color: c.text }]}>SCHWUNG · LIFE RESET</Text>
            <Text style={[styles.dates, { color: c.textDim }]}>
              {short(facts.from)} – {short(facts.to)}
            </Text>
          </View>

          <View style={styles.foot}>
            <Animated.View entering={rise(reduce ? 0 : 900)}>
              <Text style={[styles.headline, { color: c.text }]}>66 days.{'\n'}One journey.</Text>
            </Animated.View>
            <Animated.View entering={rise(reduce ? 0 : 1150)}>
              <Text style={[styles.message, { color: c.textDim }]}>Look how far you’ve come.</Text>
            </Animated.View>
            <View style={styles.stats}>
              {stats.map((s, i) => (
                <Animated.View key={s.label} entering={rise(reduce ? 0 : 1350 + i * 110)} style={styles.stat}>
                  <Text style={[styles.value, { color: s.color }]}>
                    {s.value}
                    {s.unit ? <Text style={[styles.unit, { color: c.textDim }]}> {s.unit}</Text> : null}
                  </Text>
                  <Text style={[styles.label, { color: c.textDim }]}>{s.label}</Text>
                </Animated.View>
              ))}
            </View>
            {facts.highlight ? (
              <Animated.View
                entering={FadeIn.delay(reduce ? 0 : 1900)
                  .duration(400)
                  .reduceMotion(sys)}
                style={styles.highlight}
              >
                <View style={[styles.dot, { backgroundColor: c.peach }]} />
                <Text style={[styles.highlightText, { color: c.peachInk }]}>{facts.highlight}</Text>
              </Animated.View>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          {ready ? (
            <Animated.View entering={rise(0)} style={{ gap: space.sm }}>
              <View style={styles.buttons}>
                <Button
                  label="Save image"
                  icon={<Ionicons name="download-outline" size={18} color={c.onAccent} />}
                  onPress={() => void save()}
                  disabled={busy}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Share"
                  kind="secondary"
                  icon={<Ionicons name="share-outline" size={18} color={c.text} />}
                  onPress={() => void share()}
                  disabled={busy}
                  style={{ flex: 1 }}
                />
              </View>
              {status ? (
                <T v="caption" color={c.textDim} style={styles.center} accessibilityLiveRegion="polite">
                  {status}
                </T>
              ) : (
                <T v="caption" color={c.textFaint} style={styles.center}>
                  Saved and shared exactly as you see it. No habit names, and nothing leaves your phone unless you share
                  it.
                </T>
              )}
            </Animated.View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.sm,
  },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scroll: { alignItems: 'center', gap: space.lg, paddingTop: space.sm },
  poster: { borderRadius: radius.lg, overflow: 'hidden' },
  ground: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  head: { position: 'absolute', top: 18, left: 20, right: 20, gap: 2 },
  brand: { fontSize: 10, fontWeight: '800', letterSpacing: 2.6 },
  dates: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  foot: { position: 'absolute', left: 22, right: 22, bottom: 24, gap: 10 },
  headline: { fontSize: 34, lineHeight: 37, fontWeight: '800', letterSpacing: -1 },
  message: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
  stats: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, marginTop: 6 },
  stat: { width: '50%', gap: 1 },
  value: { fontSize: 26, lineHeight: 30, fontWeight: '800', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 13, fontWeight: '600', letterSpacing: 0 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  highlightText: { fontSize: 12, fontWeight: '700', flexShrink: 1 },
  actions: { width: '100%', maxWidth: 430, paddingHorizontal: space.lg, minHeight: 100 },
  buttons: { flexDirection: 'row', gap: space.sm },
  center: { textAlign: 'center' },
});
