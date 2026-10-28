import { useIsFocused } from 'expo-router';
import { memo, type ReactNode, useEffect, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import {
  cellSummary,
  type CellState,
  type DayCell,
  heatmapColumns,
  judgedWeeks,
  type Records,
  shortDate,
  type WeekPoint,
} from '../core/charts';
import { PROGRAM_DAYS } from '../core/dates';
import { haptic } from '../lib/haptics';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { T } from './ui';

/*
 * The Insights charts (testing builds): the weekly consistency trend, the 66-day heatmap and the personal records,
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
                        ? { height: h, borderWidth: 1.5, borderBottomWidth: 0, borderColor: c.accent }
                        : { height: h, backgroundColor: c.accent },
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

// --- The 66-day heatmap ---

const ROWS = ['M', '', 'W', '', 'F', '', 'S'];

function Cell({
  cell,
  size,
  selected,
  onPress,
  label,
}: {
  cell: DayCell;
  size: number;
  selected: boolean;
  onPress: () => void;
  label: string;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[
        styles.cellHit,
        { width: size, height: size, borderRadius: 5, borderColor: selected ? c.text : 'transparent' },
      ]}
    >
      <CellMark state={cell.state} partial={cell.planned.length ? cell.done.length / cell.planned.length : 0} />
    </Pressable>
  );
}

/** A day's mark: solid done, lighter partial, ring missed, faint fill skipped, small dot rest, dashed unrecorded. */
function CellMark({ state, partial }: { state: CellState; partial: number }) {
  const { c } = useTheme();
  const base = styles.cellMark;
  switch (state) {
    case 'full':
      return <View style={[base, { backgroundColor: c.accent }]} />;
    case 'partial':
      return <View style={[base, { backgroundColor: c.accent, opacity: 0.25 + 0.35 * partial }]} />;
    case 'missed':
      return <View style={[base, styles.ring, { borderColor: c.textFaint }]} />;
    case 'skipped':
      return <View style={[base, { backgroundColor: c.textFaint, opacity: 0.35 }]} />;
    case 'rest':
      return <View style={[styles.restDot, { backgroundColor: c.textFaint }]} />;
    case 'unrecorded':
      return <View style={[base, styles.ring, { borderColor: c.border, borderStyle: 'dashed' }]} />;
    case 'today':
      return (
        <View style={[base, styles.ring, { borderColor: c.accentInk, overflow: 'hidden' }]}>
          {partial > 0 ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: c.accent, opacity: 0.25 + 0.35 * partial }]} />
          ) : null}
        </View>
      );
    case 'future':
      return <View style={[base, { backgroundColor: c.surfaceHigh, opacity: 0.6 }]} />;
  }
}

const LEGEND: { state: CellState; label: string }[] = [
  { state: 'full', label: 'All done' },
  { state: 'partial', label: 'Some' },
  { state: 'missed', label: 'None done' },
  { state: 'skipped', label: 'Skipped' },
  { state: 'rest', label: 'Rest' },
  { state: 'unrecorded', label: 'No record' },
];

/** The program's 66 days in calendar weeks (Monday on top): tap a day to see what was recorded. */
export const Heatmap = memo(function Heatmap({
  cells,
  today,
  name,
}: {
  cells: DayCell[];
  today: number;
  name: (id: string) => string;
}) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const cols = heatmapColumns(cells);
  const [picked, setPicked] = useState<number | null>(null);
  const selected = cells[(picked ?? Math.min(today, PROGRAM_DAYS)) - 1];
  // Page and card padding on both sides, the weekday labels, and 3pt between cells.
  const inner = Math.min(width, 520) - space.lg * 4 - 16;
  const size = Math.max(14, Math.min(26, Math.floor((inner - 3 * (cols.length - 1)) / Math.max(1, cols.length))));
  const words = (cell: DayCell) => `${shortDate(cell.date)}, Day ${cell.day}. ${cellSummary(cell, name)}`;
  return (
    <ChartCard title={`${PROGRAM_DAYS} days`}>
      <View style={styles.heat}>
        <View style={styles.heatRows}>
          {ROWS.map((r, i) => (
            <T key={i} v="caption" color={c.textFaint} style={[styles.axisLabel, { height: size, lineHeight: size }]}>
              {r}
            </T>
          ))}
        </View>
        {cols.map((col, i) => (
          <View key={i} style={styles.heatCol}>
            {col.map((cell, j) =>
              cell ? (
                <Cell
                  key={j}
                  cell={cell}
                  size={size}
                  selected={cell.day === selected?.day}
                  label={words(cell)}
                  onPress={() => {
                    haptic.tap();
                    setPicked(cell.day);
                  }}
                />
              ) : (
                <View key={j} style={{ width: size, height: size }} />
              ),
            )}
          </View>
        ))}
      </View>
      {selected ? (
        <View style={{ gap: 2 }} accessibilityLiveRegion="polite">
          <T v="caption">
            {shortDate(selected.date)} · Day {selected.day}
          </T>
          <T v="caption" color={c.textDim}>
            {cellSummary(selected, name)}
          </T>
        </View>
      ) : null}
      <View style={styles.legend} accessible accessibilityLabel={LEGEND.map((l) => l.label).join(', ')}>
        {LEGEND.map((l) => (
          <View key={l.state} style={styles.legendItem}>
            <View style={styles.legendSwatch}>
              <CellMark state={l.state} partial={0.5} />
            </View>
            <T v="caption" color={c.textDim} style={styles.legendText}>
              {l.label}
            </T>
          </View>
        ))}
      </View>
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
  heat: { flexDirection: 'row', gap: 3 },
  heatRows: { gap: 3, width: 13 },
  heatCol: { gap: 3 },
  cellHit: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, padding: 1 },
  cellMark: { width: '100%', height: '100%', borderRadius: 4 },
  ring: { borderWidth: 1.5 },
  restDot: { width: 4, height: 4, borderRadius: 2, opacity: 0.6 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md, rowGap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendSwatch: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center' },
  legendText: { fontSize: 11, lineHeight: 14 },
  records: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.md },
  record: { width: '50%', gap: 2, paddingRight: space.sm },
});
