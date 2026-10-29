import { useIsFocused } from 'expo-router';
import { memo, type ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { judgedWeeks, type Records, type WeekPoint } from '../core/charts';
import { haptic } from '../lib/haptics';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { T } from './ui';

/*
 * The Insights charts: the weekly consistency trend and the personal records (the 66 days are on Journey),
 * as plain views (no chart library). Their numbers come from core/charts.ts (memoized by the screens); nothing here
 * computes per frame or animates beyond one quiet fade-in, and none of it mounts until Insights is first shown.
 */

const pctText = (share: number | null) => (share === null ? '—' : `${Math.round(share * 100)}%`);

/**
 * True once the page has been shown, a frame after it first came into focus, so the charts never mount during
 * the slide to the page (or at all, for someone who never opens Insights).
 */
export function useShownOnce(): boolean {
  const focused = useIsFocused();
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (!focused || shown) return;
    const f = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(f);
  }, [focused, shown]);
  return shown;
}

/**
 * The value as it was when the page was last in focus: a change made on another tab (a habit checked off on
 * Habits) is picked up when Insights is next shown, not recomputed behind the page meanwhile.
 */
export function useWhileFocused<V>(value: V): V {
  const focused = useIsFocused();
  const [kept, setKept] = useState(value);
  // Adjusting state while rendering (React's pattern for following a prop), only while shown.
  if (focused && kept !== value) setKept(value);
  return focused ? value : kept;
}

/** The charts' card, fading in once (instantly with Reduce Motion). */
export function ChartCard({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}>
      <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
        <T v="bodyStrong" accessibilityRole="header">
          {title}
        </T>
        {children}
        {note ? (
          <T v="caption" color={c.textDim}>
            {note}
          </T>
        ) : null}
      </ThemedView>
    </Animated.View>
  );
}

// --- Weekly consistency ---

const TREND_HEIGHT = 92;

function trendNote(points: WeekPoint[]): string | undefined {
  const judged = judgedWeeks(points);
  if (judged === 0) return 'Your first week’s consistency shows here once it ends (weeks run Monday to Sunday).';
  if (judged === 1) return 'A trend needs two finished weeks; here is your first.';
  return undefined;
}

function weekWords(p: WeekPoint): string {
  const range = p.days < 7 ? ` (${p.days} day${p.days === 1 ? '' : 's'})` : '';
  switch (p.state) {
    case 'closed':
      return `Week ${p.week}${range}: ${pctText(p.share)}, ${p.done} of ${p.eligible} done.`;
    case 'current':
      return p.eligible
        ? `Week ${p.week}, so far: ${p.done} of ${p.eligible} done. Today and open weekly goals aren’t counted yet.`
        : `Week ${p.week}, so far: nothing to count yet.`;
    case 'unrecorded':
      return `Week ${p.week}${range}: no days recorded.`;
    case 'none':
      return `Week ${p.week}${range}: nothing was due.`;
  }
}

/** One bar a week: finished weeks solid, this week outlined (so far), a week without records a dashed gap. */
export const WeeklyTrend = memo(function WeeklyTrend({ points }: { points: WeekPoint[] }) {
  const { c } = useTheme();
  const lastClosed = [...points].reverse().find((p) => p.state === 'closed') ?? points[points.length - 1];
  const [picked, setPicked] = useState<number | null>(null);
  const selected = points.find((p) => p.week === picked) ?? lastClosed;
  return (
    <ChartCard title="Weekly consistency" note={trendNote(points)}>
      <View style={styles.trend}>
        <View style={[styles.gridLine, { top: 0, backgroundColor: c.border }]} />
        <View style={[styles.gridLine, { top: TREND_HEIGHT / 2, backgroundColor: c.border }]} />
        <View style={[styles.gridLine, { top: TREND_HEIGHT, backgroundColor: c.border }]} />
        {points.map((p) => {
          const on = p.week === selected?.week;
          const h = p.share === null ? 0 : Math.max(3, Math.round(p.share * TREND_HEIGHT));
          return (
            <Pressable
              key={p.week}
              onPress={() => {
                haptic.tap();
                setPicked(p.week);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={weekWords(p)}
              style={styles.trendCol}
            >
              <T v="caption" color={on ? c.text : 'transparent'} style={styles.trendValue} numberOfLines={1}>
                {p.state === 'closed' || (p.state === 'current' && p.eligible) ? pctText(p.share) : ''}
              </T>
              <View style={[styles.trendPlot, { height: TREND_HEIGHT }]}>
                {p.state === 'unrecorded' ? (
                  <View style={[styles.trendGap, { borderColor: c.textFaint }]} />
                ) : p.state === 'none' || p.share === null ? (
                  <View style={[styles.trendDot, { backgroundColor: c.border }]} />
                ) : (
                  <View
                    style={[
                      styles.trendBar,
                      p.state === 'current'
                        ? { height: h, borderWidth: 1.5, borderBottomWidth: 0, borderColor: c.mist }
                        : { height: h, backgroundColor: c.mist },
                    ]}
                  />
                )}
              </View>
              <T v="caption" color={on ? c.text : c.textFaint} style={styles.axisLabel}>
                W{p.week}
              </T>
            </Pressable>
          );
        })}
      </View>
      {selected ? (
        <T v="caption" color={c.textDim} accessibilityLiveRegion="polite">
          {weekWords(selected)}
        </T>
      ) : null}
    </ChartCard>
  );
});

// --- Personal records ---

/** What was actually done, as counts: never minutes or hours. */
export const PersonalRecords = memo(function PersonalRecords({ records }: { records: Records }) {
  const tiles: { n: string; label: string }[] = [
    records.bestWeek
      ? { n: pctText(records.bestWeek.share), label: `best week (Week ${records.bestWeek.week})` }
      : { n: '—', label: 'best week, after your first full week' },
    { n: `${records.total}`, label: records.total === 1 ? 'habit action done' : 'habit actions done' },
    { n: `${records.bestStreak}`, label: records.bestStreak === 1 ? 'day, longest streak' : 'days, longest streak' },
    ...(records.readingDays !== null
      ? [{ n: `${records.readingDays}`, label: records.readingDays === 1 ? 'reading day' : 'reading days' }]
      : []),
    ...(records.strengthSessions !== null
      ? [
          {
            n: `${records.strengthSessions}`,
            label: records.strengthSessions === 1 ? 'strength session' : 'strength sessions',
          },
        ]
      : []),
  ];
  return (
    <ChartCard title="Personal records">
      <View style={styles.records}>
        {tiles.map((t) => (
          <RecordTile key={t.label} {...t} />
        ))}
      </View>
    </ChartCard>
  );
});

function RecordTile({ n, label }: { n: string; label: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.record} accessible accessibilityLabel={`${n} ${label}`}>
      <T v="heading" style={styles.tabular}>
        {n}
      </T>
      <T v="caption" color={c.textDim}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  tabular: { fontVariant: ['tabular-nums'] },
  axisLabel: { fontSize: 10, lineHeight: 12, textAlign: 'center', fontVariant: ['tabular-nums'] },
  trend: { flexDirection: 'row', gap: 4, paddingTop: 16 },
  gridLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth, marginTop: 16 + 14 },
  trendCol: { flex: 1, alignItems: 'center', gap: 2, maxWidth: 40 },
  trendValue: { fontSize: 10, lineHeight: 12, fontVariant: ['tabular-nums'] },
  trendPlot: { width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  trendBar: { width: '70%', maxWidth: 18, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  trendGap: { width: '70%', maxWidth: 18, height: 6, borderWidth: 1, borderStyle: 'dashed', borderRadius: 2 },
  trendDot: { width: 4, height: 4, borderRadius: 2 },
  records: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.md },
  record: { width: '50%', gap: 2, paddingRight: space.sm },
});
