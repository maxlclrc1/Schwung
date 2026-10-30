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

const STRIP = 28;

/**
 * Journey, with Keep My Momentum: the days since the summit, compact, below the 66-day climb (which stays as it
 * was). Days counted, the streak, the best run and XP since the summit, and the last four weeks as a strip of dots.
 */
export function SinceSummit({ program, today }: { program: P.PilotProgram; today: number }) {
  const { c } = useTheme();
  const t = useTints();
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
      accessibilityLabel={`Since the summit: ${s.days} ${s.days === 1 ? 'day' : 'days'}, ${s.counted} counted, a ${streak}-day streak, best run ${s.best}, ${s.xp} XP.`}
    >
      <View style={styles.head}>
        <Ionicons name="trending-up-outline" size={18} color={t.sage.ink} />
        <T v="overline" color={t.sage.ink} style={{ flex: 1 }}>
          Since the summit · Keep My Momentum
        </T>
      </View>
      <View style={styles.stats}>
        <Stat value={`${s.counted}`} label={`of ${s.judged || s.days} days counted`} color={t.sage.ink} />
        <Stat value={`${streak}`} label="day streak" color={t.peach.ink} />
        <Stat value={`${s.best}`} label="best run" color={t.mist.ink} />
        <Stat value={`${s.xp}`} label="XP" color={t.lavender.ink} />
      </View>
      {strip.length > 1 ? (
        <View style={styles.strip}>
          {strip.map((r, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                r === 'counted'
                  ? { backgroundColor: t.sage.fill }
                  : r === 'missed'
                    ? { backgroundColor: c.border }
                    : { borderWidth: 1.5, borderColor: r === 'today' ? t.sage.fill : c.border },
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
  const t = useTints();
  const n = useJourneys((s) => s.journeys.length);
  if (!n) return null;
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        router.push('/life-reset/journeys');
      }}
      accessibilityRole="button"
      accessibilityLabel={`Past journeys, ${n}. Their climbs and stories`}
    >
      {({ pressed }) => (
        <ThemedView style={[styles.link, { backgroundColor: c.surface, opacity: pressed ? 0.75 : 1 }]}>
          <View style={[styles.icon, { backgroundColor: t.indigo.soft }]}>
            <Ionicons name="albums-outline" size={18} color={t.indigo.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">Past journeys</T>
            <T v="caption" color={c.textDim}>
              {n === 1 ? 'Your first ascent, kept as it was.' : `${n} ascents, each kept as it was.`}
            </T>
          </View>
          <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
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
