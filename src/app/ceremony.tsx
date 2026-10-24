import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { StatusBar } from 'expo-status-bar';
import { Confetti } from '../components/Art';
import { FinaleStats, ShareCard } from '../components/ShareCard';
import { T } from '../components/ui';
import { PROGRAM_DAYS } from '../core/dates';
import { GOAL_LABEL } from '../core/plan';
import { bestStreak, daysCompleted } from '../core/progression';
import { haptic } from '../lib/haptics';
import { currentDay, useApp } from '../store/useApp';
import { ceremonyColors as c, radius, space } from '../theme';
import { PinnedDark } from '../theme/transition';

type Copy = { overline: string; title: string; body: string; cta: string };

const COPY: Record<number, Copy> = {
  1: {
    overline: 'Day 1',
    title: 'Your reset begins.',
    body: 'A few small habits, every day, leveling up as you do. Today, just start.',
    cta: 'Let’s go',
  },
  7: {
    overline: 'Day 7',
    title: 'Week one. Done.',
    body: 'Seven days of showing up. The hardest part of any habit is the start, and you’re past it.',
    cta: 'Keep going',
  },
  21: {
    overline: 'Phase 1 complete',
    title: 'Phase 2 unlocks tomorrow.',
    body: '21 days in. Tomorrow every habit levels up one step. You’ve built the base for it.',
    cta: 'Bring it on',
  },
  44: {
    overline: 'Phase 2 complete',
    title: 'The final phase is next.',
    body: 'Two thirds of the way. Tomorrow your habits reach their hardest level. This is where it sticks.',
    cta: 'Let’s finish this',
  },
};

export default function Ceremony() {
  const { m } = useLocalSearchParams<{ m: string }>();
  const milestone = Number(m) || 1;

  useEffect(() => {
    useApp.getState().markCeremonySeen(milestone);
    haptic.heavy();
    const t = setTimeout(haptic.success, 450);
    return () => clearTimeout(t);
  }, [milestone]);

  return (
    // Ceremonies are always dark and never follow a theme change, even mid-ceremony.
    <PinnedDark>
      <View style={{ flex: 1, backgroundColor: c.bg }}>
        <StatusBar style="light" />
        {milestone === PROGRAM_DAYS ? <Finale /> : <Milestone milestone={milestone} />}
      </View>
    </PinnedDark>
  );
}

/** Concentric rings that breathe outwards behind the number. */
function Rings({ size }: { size: number }) {
  return (
    <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
      {[0, 1, 2].map((i) => (
        <Ring key={i} size={size} index={i} />
      ))}
    </View>
  );
}

function Ring({ size, index }: { size: number; index: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(
      withDelay(index * 700, withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false)),
    );
  }, [index, t]);
  const style = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - t.value),
    transform: [{ scale: 0.6 + t.value * 0.9 }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: c.accent,
        },
        style,
      ]}
    />
  );
}

function BigNumber({ value }: { value: number }) {
  // Rise and fade in, never scale: iOS draws scaled text from a stretched bitmap, which looks soft.
  const rise = useSharedValue(24);
  const opacity = useSharedValue(0);
  useEffect(() => {
    opacity.set(withTiming(1, { duration: 300 }));
    rise.set(withTiming(0, { duration: 500, easing: Easing.out(Easing.cubic) }));
  }, [opacity, rise]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ translateY: rise.value }] }));
  return (
    <Animated.Text
      style={[
        style,
        {
          color: c.accent,
          fontSize: 160,
          fontWeight: '900',
          // No letterSpacing (iOS applies it after the last glyph, shifting a single digit off-center),
          // no tabular figures (they give "1" a wide box), and the font's natural line height so the
          // digits sit at the optical center of the rings.
          textAlign: 'center',
          includeFontPadding: false,
        },
      ]}
    >
      {value}
    </Animated.Text>
  );
}

/** Fires as the number lands. */
function DelayedConfetti() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setOn(true), 350);
    return () => clearTimeout(t);
  }, []);
  return on ? <Confetti spread={190} colors={[c.accent, c.accentLight, c.gold, c.text]} /> : null;
}

function Milestone({ milestone }: { milestone: number }) {
  const copy = COPY[milestone] ?? COPY[1];
  const goal = useApp((s) => s.answers?.goal ?? s.profile?.goal);
  const { width } = useWindowDimensions();
  return (
    <SafeAreaView style={styles.fill}>
      <View style={[styles.fill, styles.center]}>
        <Rings size={Math.min(width * 0.8, 340)} />
        <BigNumber value={milestone} />
        <DelayedConfetti />
      </View>
      <View style={styles.bottom}>
        <Animated.View entering={FadeInDown.delay(500).duration(500)}>
          <T v="overline" color={c.accent}>
            {copy.overline}
          </T>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(650).duration(500)}>
          <T v="display" color={c.text}>
            {copy.title}
          </T>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(800).duration(500)} style={{ gap: space.sm }}>
          <T color={c.textDim}>{copy.body}</T>
          {milestone === 1 && goal ? (
            <T v="caption" color={c.accent}>
              Built for {GOAL_LABEL[goal]}.
            </T>
          ) : null}
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(1100).duration(400)} style={{ marginTop: space.lg }}>
          <CeremonyButton label={copy.cta} onPress={() => router.back()} />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

/** Ceremonies are always dark, so they don't use the themed Button. */
function CeremonyButton({
  label,
  onPress,
  kind = 'primary',
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost';
}) {
  const primary = kind === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        primary && { backgroundColor: c.accent },
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <T v="bodyStrong" color={primary ? c.onAccent : c.textDim}>
        {label}
      </T>
    </Pressable>
  );
}

function Finale() {
  const { width } = useWindowDimensions();
  const [step, setStep] = useState<'stats' | 'season'>('stats');
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const [sharing, setSharing] = useState(false);

  const stats: FinaleStats = useMemo(() => {
    const s = useApp.getState();
    const start = s.startedAt!;
    const today = Math.min(currentDay(s), PROGRAM_DAYS);
    return {
      daysCompleted: daysCompleted(s.logs, start, today),
      bestStreak: bestStreak(s.logs, start, today),
      mastered: s.plan.filter((h) => !h.custom && h.level === 'hard').length,
      checks: Object.values(s.logs)
        .filter((l) => l.day <= PROGRAM_DAYS)
        .reduce((n, l) => n + l.completed.length, 0),
    };
  }, []);

  const share = async () => {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, {
        format: 'png',
        quality: 1,
        width: 1080,
        height: 1350,
        result: 'tmpfile',
      });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: 'Share your reset' });
    } catch {
      // Cancelled or unavailable; nothing to tell the user.
    } finally {
      setSharing(false);
    }
  };

  if (step === 'season') {
    return (
      <SafeAreaView style={[styles.fill, { padding: space.xl, justifyContent: 'space-between' }]}>
        <View style={[styles.fill, { justifyContent: 'center', gap: space.lg }]}>
          <Animated.View entering={FadeIn.duration(500)}>
            <T v="overline" color={c.accent}>
              Season 2
            </T>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <T v="display" color={c.text}>
              Coming soon.
            </T>
          </Animated.View>
          <Animated.View entering={FadeInDown.delay(250).duration(500)}>
            <T color={c.textDim}>
              New programs are on the way. Until then, keep the habits you built. Same checklist, no countdown.
            </T>
          </Animated.View>
        </View>
        <CeremonyButton label="Continue my habits" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const cardWidth = Math.min(width - space.xl * 2, 360);
  const items = [
    { n: stats.daysCompleted, label: `of ${PROGRAM_DAYS} days completed` },
    { n: stats.bestStreak, label: 'day best streak' },
    { n: stats.mastered, label: stats.mastered === 1 ? 'habit at max level' : 'habits at max level' },
  ];

  return (
    <SafeAreaView style={styles.fill}>
      <ScrollView contentContainerStyle={styles.finale} showsVerticalScrollIndicator={false}>
        <View style={[styles.center, { height: 220 }]}>
          <Rings size={220} />
          <BigNumber value={PROGRAM_DAYS} />
          <DelayedConfetti />
        </View>
        <Animated.View entering={FadeInDown.delay(500).duration(500)} style={{ gap: space.sm }}>
          <T v="overline" color={c.accent}>
            Day 66
          </T>
          <T v="display" color={c.text}>
            You did it.
          </T>
          <T color={c.textDim}>The whole program, done. Look what showing up built.</T>
        </Animated.View>

        <View style={{ gap: space.sm }}>
          {items.map((it, i) => (
            <Animated.View
              key={it.label}
              entering={FadeInDown.delay(750 + i * 120).duration(450)}
              style={[styles.statRow, { backgroundColor: c.surface }]}
            >
              <T v="title" color={c.text} style={{ fontVariant: ['tabular-nums'], minWidth: 56 }}>
                {it.n}
              </T>
              <T color={c.textDim}>{it.label}</T>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={FadeInUp.delay(1200).duration(500)} style={{ alignItems: 'center', gap: space.lg }}>
          <ShareCard ref={cardRef} stats={stats} width={cardWidth} />
          <View style={{ alignSelf: 'stretch', gap: space.sm }}>
            <CeremonyButton label={sharing ? 'Preparing…' : 'Share my reset'} onPress={share} />
            <CeremonyButton label="What’s next" kind="ghost" onPress={() => setStep('season')} />
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  bottom: { paddingHorizontal: space.xl, paddingBottom: space.lg, gap: space.md },
  finale: { padding: space.xl, gap: space.xl },
  button: { minHeight: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: radius.lg },
});
