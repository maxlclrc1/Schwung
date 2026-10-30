import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import * as P from '../../core/reset/pilot';
import { haptic } from '../../lib/haptics';
import { useJourneys } from '../../store/journeys';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { useTints } from '../onboarding/kit';
import { T } from '../ui';
import { useT } from '../../i18n/react';
import { formatNumber } from '../../i18n';
import { flipX } from '../../i18n/direction';

const STRIP = 28;

/**
 * Journey, with Keep My Momentum: the days since the summit, compact, below the 66-day climb (which stays as it
 * was). Days counted, the streak, the best run and XP since the summit, and the last four weeks as a strip of dots.
 */
export function SinceSummit({ program, today }: { program: P.PilotProgram; today: number }) {
  const { c } = useTheme();
  const tint = useTints();
  const t = useT();
  const s = useMemo(() => P.sinceSummit(program, today), [program, today]);
  const streak = useMemo(() => P.pilotStreak(program, today), [program, today]);
  const from = program.after?.since ?? today;
  const strip = useMemo(() => {
    const out: ('counted' | 'missed' | 'rest' | 'today')[] = [];
    for (let d = Math.max(from, today - STRIP + 1); d <= today; d++) {
      const r = P.dayResult(program, d);
      out.push(d === today && r !== 'counted' ? 'today' : r);
    }
    return out;
  }, [program, today, from]);

  return (
    <ThemedView
      style={[styles.panel, { backgroundColor: c.surface }]}
      accessible
      accessibilityLabel={t('beyond.since.a11y', {
        days: s.days,
        counted: s.counted,
        streak,
        best: s.best,
        xp: s.xp,
      })}
    >
      <View style={styles.head}>
        <Ionicons name="trending-up-outline" size={18} color={tint.sage.ink} />
        <T v="overline" color={tint.sage.ink} style={{ flex: 1 }}>
          {t('beyond.since.title')}
        </T>
      </View>
      <View style={styles.stats}>
        <Stat
          value={formatNumber(s.counted)}
          label={t('beyond.since.counted', { count: s.judged || s.days })}
          color={tint.sage.ink}
        />
        <Stat value={formatNumber(streak)} label={t('beyond.since.streak')} color={tint.peach.ink} />
        <Stat value={formatNumber(s.best)} label={t('beyond.since.best')} color={tint.mist.ink} />
        <Stat value={formatNumber(s.xp)} label={t('beyond.since.xp')} color={tint.lavender.ink} />
      </View>
      {strip.length > 1 ? (
        <View style={styles.strip}>
          {strip.map((r, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                r === 'counted'
                  ? { backgroundColor: tint.sage.fill }
                  : r === 'missed'
                    ? { backgroundColor: c.border }
                    : { borderWidth: 1.5, borderColor: r === 'today' ? tint.sage.fill : c.border },
              ]}
            />
          ))}
        </View>
      ) : null}
    </ThemedView>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <T v="heading" color={color}>
        {value}
      </T>
      <T v="caption" color={c.textDim} numberOfLines={2}>
        {label}
      </T>
    </View>
  );
}

/** Journey → Past journeys (only once there is one). */
export function PastJourneysLink() {
  const { c } = useTheme();
  const tint = useTints();
  const t = useT();
  const n = useJourneys((s) => s.journeys.length);
  if (!n) return null;
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        router.push('/life-reset/journeys');
      }}
      accessibilityRole="button"
      accessibilityLabel={t('beyond.pastLink.a11y', { count: n })}
    >
      {({ pressed }) => (
        <ThemedView style={[styles.link, { backgroundColor: c.surface, opacity: pressed ? 0.75 : 1 }]}>
          <View style={[styles.icon, { backgroundColor: tint.indigo.soft }]}>
            <Ionicons name="albums-outline" size={18} color={tint.indigo.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">{t('beyond.pastLink.title')}</T>
            <T v="caption" color={c.textDim}>
              {n === 1 ? t('beyond.pastLink.one') : t('beyond.pastLink.many', { count: n })}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={16} color={c.textFaint} style={flipX} />
        </ThemedView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stats: { flexDirection: 'row', gap: space.sm },
  strip: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  link: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
