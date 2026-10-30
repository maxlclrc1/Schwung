import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOutUp,
  ReduceMotion,
  useAnimatedProps,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { PROGRAM_DAYS } from '../../core/dates';
import { growth } from '../../core/reset/collection';
import { haptic } from '../../lib/haptics';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { SettingsButton } from '../HeaderButton';
import { RollingText } from '../RollingText';
import { ThemeToggle } from '../ThemeToggle';
import { ProgressBar, T } from '../ui';
import { useT } from '../../i18n/react';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SETTLE = Easing.bezier(0.22, 1, 0.36, 1);
const sys = ReduceMotion.System;

/**
 * The top of the Habits tab: the day, large; then today at a glance as one warm panel: a sage ring that fills as
 * habits are done, what's left, and the streak (peach) and level (lavender) beside it, XP rolling up with a brief
 * "+XP" the moment a habit earns it. The header controls sit where they do on every tab.
 */
export function TodayHero({
  today,
  done,
  total,
  full,
  streak,
  xp,
  phase,
  label,
  momentum = false,
  ascent = 1,
}: {
  today: number;
  done: number;
  total: number;
  full: boolean;
  streak: number;
  xp: number;
  /** The phase line under the day ("Foundation", "Momentum targets are open…"). */
  phase: string;
  /** What a screen reader says for today's progress. */
  label: string;
  /** Keep My Momentum: the days go on past 66. */
  momentum?: boolean;
  /** Which ascent this is (shown from the second). */
  ascent?: number;
}) {
  const { c } = useTheme();
  const t = useT();
  const left = Math.max(0, total - done);
  const summit = today > PROGRAM_DAYS && !momentum;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={{ flexShrink: 1 }}>
          <T v="overline" color={c.indigoInk} maxFontSizeMultiplier={1.3}>
            {ascent > 1 ? t('today.hero.lifeResetAscent', { ascent }) : t('today.hero.lifeReset')}
          </T>
          <Text
            style={[styles.day, { color: c.text }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
            accessibilityRole="header"
          >
            {summit ? t('today.hero.summit') : t('today.hero.day', { day: today })}
            {summit ? null : (
              <Text style={[styles.of, { color: c.textDim }]}>
                {today > PROGRAM_DAYS ? t('beyond.beyondSummit') : t('today.hero.of', { total: PROGRAM_DAYS })}
              </Text>
            )}
          </Text>
          <T v="caption" color={c.textDim} maxFontSizeMultiplier={1.4}>
            {phase}
          </T>
        </View>
        <View style={styles.icons}>
          <ThemeToggle />
          <SettingsButton />
        </View>
      </View>

      <ThemedView style={[styles.panel, { backgroundColor: c.surface }]}>
        <View style={styles.top} accessible accessibilityLabel={label}>
          <Ring done={done} total={total} full={full} />
          <View style={styles.status}>
            <Animated.View
              key={full ? 'full' : done ? 'some' : 'none'}
              entering={FadeIn.duration(220).reduceMotion(sys)}
            >
              <T v="heading" color={full ? c.sageInk : c.text} maxFontSizeMultiplier={1.3}>
                {full ? t('today.hero.complete') : done ? t('today.hero.toGo', { count: left }) : t('today.hero.fresh')}
              </T>
            </Animated.View>
            <T v="caption" color={c.textDim} maxFontSizeMultiplier={1.4}>
              {full ? t('today.hero.completeBody') : t('today.hero.body')}
            </T>
          </View>
        </View>
        <View style={styles.chips}>
          <ThemedView
            style={[styles.chip, styles.shrink, { backgroundColor: streak > 0 ? c.peachSoft : c.surfaceHigh }]}
            accessible
            accessibilityLabel={t('today.hero.streakA11y', { count: streak })}
          >
            <Ionicons name="flame" size={15} color={streak > 0 ? c.peach : c.textFaint} />
            <T
              v="caption"
              color={streak > 0 ? c.peachInk : c.textDim}
              style={[styles.chipText, styles.shrink]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {streak > 0 ? t('today.hero.streak', { count: streak }) : t('today.hero.noStreak')}
            </T>
          </ThemedView>
          <Level xp={xp} />
        </View>
      </ThemedView>
    </View>
  );
}

/** Today's ring: fills in sage as habits are done, turning into a check when the day is complete. */
function Ring({ done, total, full }: { done: number; total: number; full: boolean }) {
  const { c } = useTheme();
  const size = 76;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const share = full ? 1 : done / Math.max(1, total);
  const fill = useSharedValue(share);
  useEffect(() => {
    fill.set(withTiming(share, { duration: 620, easing: SETTLE, reduceMotion: sys }));
  }, [share, fill]);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - fill.value) }));
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.sageSoft} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={c.sage}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={[circ, circ]}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
          animatedProps={arc}
        />
      </Svg>
      <View style={styles.ringCenter}>
        {full ? (
          <Animated.View entering={ZoomIn.duration(220).reduceMotion(sys)}>
            <Ionicons name="checkmark" size={30} color={c.sage} />
          </Animated.View>
        ) : (
          <View style={styles.count}>
            <RollingText text={`${done}`} size={22} charWidth={14} weight="800" color={c.text} />
            <Text style={[styles.total, { color: c.textDim }]}>/{total}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

/** The level chip: level, how far to the next, and XP rolling up, with a brief "+XP" when some is earned. */
function Level({ xp }: { xp: number }) {
  const { c } = useTheme();
  const t = useT();
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null);
  const last = useRef(xp);
  useEffect(() => {
    const d = xp - last.current;
    last.current = xp;
    if (d <= 0) return;
    setGain({ n: d, key: Date.now() });
    const t = setTimeout(() => setGain(null), 1100);
    return () => clearTimeout(t);
  }, [xp]);
  const g = growth(xp);
  return (
    <View style={{ flexShrink: 1, maxWidth: '62%' }}>
      {/* The title XP has earned, and the way to the next object; tap for the collection. */}
      <Pressable
        onPress={() => {
          haptic.select();
          router.push('/life-reset/collection');
        }}
        accessibilityRole="button"
        accessibilityLabel={t('today.hero.levelA11y', { title: g.title, xp })}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <ThemedView style={[styles.chip, { backgroundColor: c.accentSoft }]}>
          <Ionicons name="diamond-outline" size={13} color={c.accentInk} />
          <T
            v="caption"
            color={c.accentInk}
            style={[styles.chipText, styles.shrink]}
            numberOfLines={1}
            maxFontSizeMultiplier={1.3}
          >
            {g.title}
          </T>
          <View style={{ width: 28 }}>
            <ProgressBar value={g.progress} height={4} color={c.accent} />
          </View>
          <RollingText text={`${xp}`} size={13} charWidth={8} weight="700" color={c.accentInk} />
          <T v="caption" color={c.accentInk} style={styles.chipText} maxFontSizeMultiplier={1.3}>
            {t('today.hero.xp')}
          </T>
        </ThemedView>
      </Pressable>
      {gain ? (
        <Animated.View
          key={gain.key}
          entering={FadeIn.duration(160).reduceMotion(sys)}
          exiting={FadeOutUp.duration(380).reduceMotion(sys)}
          style={[styles.gain, { backgroundColor: c.peach }]}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
        >
          <T v="caption" color={c.onTint} style={styles.chipText}>
            {t('today.hero.gain', { xp: gain.n })}
          </T>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  icons: { flexDirection: 'row', gap: space.sm },
  day: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8 },
  of: { fontSize: 20, fontWeight: '600', letterSpacing: -0.2 },
  panel: { borderRadius: 28, padding: space.lg, gap: space.lg },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  status: { flex: 1, gap: 4 },
  ringCenter: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { flexDirection: 'row', alignItems: 'baseline' },
  total: { fontSize: 13, fontWeight: '700' },
  // Streak and level side by side: the streak gives way (ellipsis) before the level ever wraps below it.
  chips: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 34,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
  },
  chipText: { fontWeight: '700' },
  shrink: { flexShrink: 1 },
  gain: {
    position: 'absolute',
    right: 0,
    top: -30,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
});
