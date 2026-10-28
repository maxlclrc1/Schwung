import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PROGRAM_DAYS } from '../core/dates';
import { habitTitle } from '../core/habits';
import {
  programHabitTally,
  programRecent,
  programStreak,
  programTally,
  programTotal,
  programCells,
  programRecords,
  programTrend,
  programWeekTally,
  type Tally,
} from '../core/insights';
import { haptic } from '../lib/haptics';
import { currentDay, useApp } from '../store/useApp';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { SettingsButton } from './HeaderButton';
import { Heatmap, PersonalRecords, useShownOnce, useWhileFocused, WeeklyTrend } from './InsightCharts';
import { ProgressBar, T } from './ui';
import { SCREEN_PX, worldAnchor } from './WorldLayer';
import { TILE_HEIGHT } from './worldTiles';
import { LAKESIDE_BAND_TOP } from '../core/fieldnotes/route';

/*
 * Insights (testing builds' third tab, at the lakeside camp of the shared world): the main numbers at a glance, then
 * each habit, quietly. Everything comes from saved days (core/insights.ts, reset/pilot.ts); nothing is estimated.
 * A window near the top shows the lakeside band; like Habits, the world stays still while the page scrolls (so the
 * painting's lower edge stays hidden behind the tab bar).
 */

export const pct = (t: Tally) => (t.eligible ? Math.round((t.done / t.eligible) * 100) : null);

export function InsightsPage({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  // The lakeside band is near the bottom of the panorama: placed so the painting ends at the screen's bottom edge,
  // the camp and the lake fill the page and no edge of the painting ever shows.
  useEffect(() => {
    worldAnchor[2].set(height - (TILE_HEIGHT - LAKESIDE_BAND_TOP) * (width / SCREEN_PX));
  }, [width, height]);
  return (
    <Animated.ScrollView
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.sm }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <T v="heading" accessibilityRole="header" style={{ flex: 1 }}>
          Insights
        </T>
        <SettingsButton />
      </View>
      {/* A narrow window onto the lakeside, between the title and the numbers. */}
      <View
        accessible={false}
        importantForAccessibility="no-hide-descendants"
        style={{ height: Math.round(width * 0.12), marginHorizontal: -space.lg }}
      />
      {children}
    </Animated.ScrollView>
  );
}

/** The four numbers that matter, at a glance; this week underneath. */
export function Overview({
  overall,
  total,
  streak,
  day,
  week,
}: {
  overall: Tally;
  total: number;
  streak: number;
  day: number;
  week: Tally;
}) {
  const { c } = useTheme();
  const p = pct(overall);
  const shownDay = Math.min(day, PROGRAM_DAYS);
  return (
    <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
      <View
        style={styles.big}
        accessible
        accessibilityLabel={
          p === null
            ? 'Consistency shows after your first day'
            : `${p} percent consistency: ${overall.done} of ${overall.eligible} habit opportunities done`
        }
      >
        <T v="title" style={styles.tabular}>
          {p === null ? '—' : `${p}%`}
        </T>
        <T v="caption" color={c.textDim} style={{ flex: 1 }}>
          {p === null
            ? 'Consistency shows after your first day.'
            : `consistency · ${overall.done} of ${overall.eligible} opportunities done`}
        </T>
      </View>
      <View style={styles.stats}>
        <Stat n={`${total}`} label="habits done" />
        <Stat n={`${streak}`} label="day streak" />
        <Stat n={`${shownDay}/${PROGRAM_DAYS}`} label="days" />
      </View>
      <View style={{ gap: 6 }} accessible accessibilityLabel={`Day ${shownDay} of ${PROGRAM_DAYS}`}>
        <ProgressBar value={shownDay / PROGRAM_DAYS} height={4} />
      </View>
      <T
        v="caption"
        color={c.textDim}
        accessibilityLabel={`This week: ${week.done} of ${week.eligible} habit opportunities done`}
      >
        This week: <T v="caption">{week.done}</T> of {week.eligible} done
      </T>
    </ThemedView>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.stat}>
      <T v="bodyStrong" style={styles.tabular}>
        {n}
      </T>
      <T v="caption" color={c.textDim}>
        {label}
      </T>
    </View>
  );
}

export type StripState = 'done' | 'skipped' | 'missed' | 'rest' | 'today';

/** The last days as small marks: filled done, hollow missed, faint rest; today outlined. */
export function DayStrip({ days }: { days: { day: number; state: StripState }[] }) {
  const { c } = useTheme();
  const done = days.filter((d) => d.state === 'done').length;
  return (
    <View style={styles.strip} accessible accessibilityLabel={`Last ${days.length} days: ${done} done`}>
      {days.map((d) => (
        <View
          key={d.day}
          style={[
            styles.mark,
            d.state === 'done'
              ? { backgroundColor: c.accent }
              : d.state === 'missed' || d.state === 'skipped'
                ? { borderWidth: 1.5, borderColor: c.textFaint }
                : d.state === 'today'
                  ? { borderWidth: 1.5, borderColor: c.accentInk }
                  : { backgroundColor: c.border, transform: [{ scale: 0.5 }] },
          ]}
        />
      ))}
    </View>
  );
}

/** A weekly habit's weeks: how much of each week's goal was met (the current week still open). */
export function WeekBars({ weeks }: { weeks: { week: number; credited: number; goal: number }[] }) {
  const { c } = useTheme();
  const shown = weeks.filter((w) => w.goal > 0).slice(-8);
  return (
    <View
      style={styles.bars}
      accessible
      accessibilityLabel={shown.map((w) => `Week ${w.week}: ${w.credited} of ${w.goal}`).join('. ')}
    >
      {shown.map((w) => (
        <View key={w.week} style={styles.barCol}>
          <ThemedView style={[styles.bar, { backgroundColor: c.surfaceHigh }]}>
            <ThemedView
              style={[
                styles.barFill,
                { backgroundColor: c.accent, height: `${Math.min(1, w.credited / w.goal) * 100}%` },
              ]}
            />
          </ThemedView>
          <T v="caption" color={c.textFaint} style={styles.barLabel}>
            {w.credited}/{w.goal}
          </T>
        </View>
      ))}
    </View>
  );
}

/** One habit as a compact bar: its name and consistency; tap for its history (and more, when given). */
export function HabitInsight({
  title,
  subtitle,
  tally,
  history,
  children,
}: {
  title: string;
  subtitle: string;
  tally: Tally;
  history: ReactNode;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const p = pct(tally);
  return (
    <ThemedView style={[styles.card, styles.habit, { backgroundColor: c.surface }]}>
      <Pressable
        onPress={() => {
          haptic.tap();
          setOpen((o) => !o);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint="Shows its history"
        accessibilityLabel={`${title}. ${p === null ? 'No days yet' : `${p} percent, ${tally.done} of ${tally.eligible}`}. ${subtitle}`}
        style={{ gap: 6 }}
      >
        <View style={styles.rowTop}>
          <T v="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
            {title}
          </T>
          <T v="bodyStrong" color={p === null ? c.textFaint : c.accentInk} style={styles.tabular}>
            {p === null ? '—' : `${p}%`}
          </T>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={c.textDim} />
        </View>
        <ProgressBar value={p === null ? 0 : p / 100} height={6} />
        <T v="caption" color={c.textDim}>
          {subtitle}
        </T>
      </Pressable>
      {open ? (
        <View style={{ gap: space.sm }}>
          {history}
          {children}
        </View>
      ) : null}
    </ThemedView>
  );
}

export function SectionTitle({ children }: { children: string }) {
  const { c } = useTheme();
  return (
    <T v="overline" color={c.textDim} style={{ marginTop: space.sm }}>
      {children}
    </T>
  );
}

/** Insights for the existing V1/V2 program. */
export function ProgramInsights() {
  const { c } = useTheme();
  const plan = useApp((s) => s.plan);
  const logs = useApp((s) => s.logs);
  const startedAt = useApp((s) => s.startedAt);
  const offset = useApp((s) => s.devDayOffset);
  const today = currentDay({ startedAt, devDayOffset: offset });
  const start = startedAt ?? '';
  const data = useMemo(
    () =>
      startedAt
        ? {
            overall: programTally(plan, logs, start, today),
            total: programTotal(logs),
            streak: programStreak(logs, start, today),
            week: programWeekTally(plan, logs, start, today),
          }
        : null,
    [plan, logs, start, startedAt, today],
  );
  const shown = useShownOnce();
  // The charts follow the saved days only while Insights is shown (see useWhileFocused).
  const pl = useWhileFocused(plan);
  const lg = useWhileFocused(logs);
  const td = useWhileFocused(today);
  const charts = useMemo(() => {
    if (!startedAt || !shown) return null;
    const trend = programTrend(pl, lg, start, td);
    const names = new Map(pl.map((h) => [h.habitId, habitTitle(h)]));
    return {
      trend,
      cells: programCells(pl, lg, start, td),
      records: programRecords(pl, lg, start, td, trend),
      name: (id: string) => names.get(id) ?? id,
    };
  }, [pl, lg, td, start, startedAt, shown]);
  if (!data)
    return (
      <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
        <T color={c.textDim}>Your numbers show here once you start a program.</T>
      </ThemedView>
    );
  return (
    <>
      <Overview {...data} day={today} />
      {charts ? <WeeklyTrend points={charts.trend} /> : null}
      <SectionTitle>Your habits</SectionTitle>
      {plan.map((h) => (
        <HabitInsight
          key={h.habitId}
          title={habitTitle(h)}
          subtitle={h.schedule ? 'On its scheduled days' : 'Every day'}
          tally={programHabitTally(h, logs, start, today)}
          history={<DayStrip days={programRecent(h, logs, start, today)} />}
        />
      ))}
      {charts ? (
        <>
          <Heatmap cells={charts.cells} today={today} name={charts.name} />
          <PersonalRecords records={charts.records} />
        </>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  habit: { paddingVertical: space.md },
  big: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  stats: { flexDirection: 'row', gap: space.md },
  stat: { flex: 1, gap: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  strip: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  mark: { width: 12, height: 12, borderRadius: 6 },
  bars: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  barCol: { alignItems: 'center', gap: 4 },
  bar: { width: 14, height: 40, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 10, lineHeight: 12, fontVariant: ['tabular-nums'] },
});
