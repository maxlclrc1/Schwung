import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOutUp,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { PROGRAM_DAYS } from '../../core/dates';
import { growth } from '../../core/reset/collection';
import { haptic } from '../../lib/haptics';
import { radius, space, useTheme } from '../../theme';
import { useDepth } from '../../theme/depth';
import { SettingsButton } from '../HeaderButton';
import { RollingText } from '../RollingText';
import { ThemeToggle } from '../ThemeToggle';
import { T } from '../ui';
import { formatNumber } from '../../i18n';
import { flipX } from '../../i18n/direction';
import { useT } from '../../i18n/react';
import { useOnArt } from '../onArt';
import { useScriptAdjust } from '../../i18n/script';
import { pushOnce } from '../../lib/navigation';
import { Tap } from '../Tap';

const SETTLE = Easing.bezier(0.22, 1, 0.36, 1);
const sys = ReduceMotion.System;

/**
 * The top of the Habits tab, set straight on the landscape like a field journal: the day, large; a hairline; today's
 * count with one thin segment per habit; then one quiet line with the streak and the level, XP rolling up with a brief
 * "+XP" the moment a habit earns it. The header controls sit where they do on every tab.
 */
export function TodayHero({
  today,
  done,
  total,
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
  const { c, isDark: dark } = useTheme();
  const onArt = useOnArt();
  const dayScript = useScriptAdjust(styles.day);
  const depth = useDepth();
  const t = useT();
  // "{done} of {total} done today", with the number set larger wherever the language puts it.
  const MARK = '\u0000';
  const [before = '', after = ''] = t('today.hero.doneToday', { done: MARK, total }).split(MARK);
  const summit = today > PROGRAM_DAYS && !momentum;
  // The streak and level share one line when the screen has room for them at this text size, else take a line each.
  // Decided by the screen alone (never by the words), so completing a habit can't move the cards.
  const { width, fontScale } = useWindowDimensions();
  const stacked = (width - 2 * space.lg) / Math.min(Math.max(fontScale, 1), 1.3) < 300;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={{ flexShrink: 1 }}>
          <T v="overline" color={c.indigoInk} maxFontSizeMultiplier={1.3}>
            {ascent > 1 ? t('today.hero.lifeResetAscent', { ascent }) : t('today.hero.lifeReset')}
          </T>
          <Text
            style={[styles.day, depth.hero, dayScript, { color: c.text }]}
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
          <T v="caption" color={onArt.ink ?? c.textDim} maxFontSizeMultiplier={1.4} style={onArt.style}>
            {phase}
          </T>
        </View>
        <View style={styles.icons}>
          <ThemeToggle />
          <SettingsButton />
        </View>
      </View>

      {/* Today's progress, straight on the landscape: a hairline, the count, one segment per habit, then the quieter
          streak and level. */}
      <View style={styles.journal}>
        <View style={[styles.rule, { backgroundColor: dark ? 'rgba(245,243,255,0.14)' : 'rgba(25,22,33,0.14)' }]} />
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={label}
          accessibilityValue={{ min: 0, max: total, now: Math.min(done, total) }}
          style={styles.progress}
        >
          <Text style={[styles.count, onArt.style, { color: c.text }]} maxFontSizeMultiplier={1.3}>
            {before}
            <Text style={[styles.countNumber, { color: c.text }]}>{formatNumber(done)}</Text>
            {after}
          </Text>
          <View style={styles.segments}>
            {Array.from({ length: Math.max(1, total) }, (_, i) => (
              <Segment key={i} on={i < done} track={dark ? 'rgba(245,243,255,0.16)' : 'rgba(25,22,33,0.13)'} />
            ))}
          </View>
        </View>
        <View style={stacked ? styles.metaStacked : styles.meta}>
          <View
            style={[styles.metaItem, styles.shrink]}
            accessible
            accessibilityLabel={t('today.hero.streakA11y', { count: streak })}
          >
            <Ionicons name="flame" size={13} color={streak > 0 ? c.peach : c.textFaint} />
            <T
              v="small"
              color={c.textDim}
              style={[styles.shrink, onArt.style]}
              numberOfLines={1}
              maxFontSizeMultiplier={1.3}
            >
              {streak > 0 ? t('today.hero.streak', { count: streak }) : t('today.hero.noStreak')}
            </T>
          </View>
          {stacked ? null : <View style={[styles.dot, { backgroundColor: c.textFaint }]} />}
          <Level xp={xp} />
        </View>
      </View>
    </View>
  );
}

/** One habit's share of today: a thin track that fills in sage when the habit is done. */
function Segment({ on, track }: { on: boolean; track: string }) {
  const { c } = useTheme();
  const fill = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    fill.set(withTiming(on ? 1 : 0, { duration: 260, easing: SETTLE, reduceMotion: sys }));
  }, [on, fill]);
  const look = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));
  return (
    <View style={[styles.segment, { backgroundColor: track }]}>
      <Animated.View style={[styles.segmentFill, { backgroundColor: c.sage }, look]} />
    </View>
  );
}

/** The rolling XP number's digit width. */
const XP_CHAR = 8;

/** The level: its title and XP rolling up, with a brief "+XP" when some is earned. Tap for the collection. */
function Level({ xp }: { xp: number }) {
  const { c } = useTheme();
  const onArt = useOnArt();
  const t = useT();
  const [gain, setGain] = useState<{ n: number; key: number } | null>(null);
  const last = useRef(xp);
  useEffect(() => {
    const d = xp - last.current;
    last.current = xp;
    if (d === 0) return;
    // XP taken back (an undo) also takes back the "+XP" still showing: changing XP cancelled its timer.
    if (d < 0) {
      setGain(null);
      return;
    }
    setGain({ n: d, key: Date.now() });
    const t = setTimeout(() => setGain(null), 1100);
    return () => clearTimeout(t);
  }, [xp]);
  const g = growth(xp);
  return (
    <View style={styles.shrink}>
      <Tap
        onPress={() => {
          haptic.select();
          pushOnce('/life-reset/collection');
        }}
        accessibilityRole="button"
        accessibilityLabel={t('today.hero.levelA11y', { title: g.title, xp })}
        hitSlop={{ top: 12, bottom: 12, left: 6, right: 6 }}
        style={styles.metaItem}
      >
        <Ionicons name="diamond-outline" size={12} color={c.accentInk} />
        <T
          v="small"
          color={c.textDim}
          style={[styles.shrink, onArt.style]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.3}
        >
          {g.title}
        </T>
        <T v="small" color={c.textFaint} style={onArt.style} maxFontSizeMultiplier={1.3}>
          ·
        </T>
        <RollingText text={`${xp}`} size={13} charWidth={XP_CHAR} weight="600" color={c.textDim} />
        <T v="small" color={c.textDim} style={onArt.style} maxFontSizeMultiplier={1.3}>
          {t('today.hero.xp')}
        </T>
        <Ionicons name="chevron-forward" size={11} color={c.textFaint} style={flipX} />
      </Tap>
      {gain ? (
        <Animated.View
          key={gain.key}
          entering={FadeIn.duration(160).reduceMotion(sys)}
          exiting={FadeOutUp.duration(380).reduceMotion(sys)}
          style={[styles.gain, { backgroundColor: c.peach }]}
          pointerEvents="none"
          accessibilityLiveRegion="polite"
        >
          <T v="caption" color={c.onTint} style={styles.gainText}>
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
  day: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.8 },
  of: { fontSize: 20, fontWeight: '600', letterSpacing: -0.2 },
  journal: { gap: space.md },
  rule: { height: 1, marginBottom: 2 },
  progress: { gap: 10 },
  count: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  countNumber: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  segments: { flexDirection: 'row', gap: space.xs },
  segment: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  segmentFill: { height: '100%', borderRadius: 2 },
  // Never wraps: the streak and level shrink (ellipsis) rather than move, so the header's height never changes.
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 24 },
  metaStacked: { alignItems: 'flex-start', gap: space.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 3, height: 3, borderRadius: 2 },
  shrink: { flexShrink: 1 },
  gain: {
    position: 'absolute',
    right: 0,
    top: -30,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  gainText: { fontWeight: '600' },
});
