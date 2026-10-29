import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useMemo, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  LinearTransition,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { judgedWeeks, type Records, type Tally, type WeekPoint } from '../core/charts';
import { PROGRAM_DAYS } from '../core/dates';
import type { Observation } from '../core/reset/observations';
import { haptic } from '../lib/haptics';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { T } from './ui';

/*
 * Insights 2.0, drawn by hand (no chart library): a page in three questions. How am I doing? (a consistency ring and
 * the weeks as a line), What's working? (the habits side by side, and the records as peach medallions), What can I
 * learn? (observations the saved days support, and the optional Screen Time readings). Misty blue for data, sage for
 * consistency, peach for records, lavender for reflection. Every number is passed in from reset/charts.ts and
 * reset/pilot.ts; nothing here estimates. Charts settle in once when first shown; Reduce Motion shows them at once.
 */

const sys = ReduceMotion.System;
const SETTLE = Easing.bezier(0.22, 1, 0.36, 1);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
type Icon = ComponentProps<typeof Ionicons>['name'];
const pctText = (share: number | null) => (share === null ? '—' : `${Math.round(share * 100)}%`);

/** 0 → 1 once on mount (a short delay, on the shared curve): the charts' one entrance. */
function useEntrance(delay = 0, duration = 760) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withDelay(delay, withTiming(1, { duration, easing: SETTLE, reduceMotion: sys })));
  }, [v, delay, duration]);
  return v;
}

/** A chapter of the page: its number in the chapter's colour, then the question itself. */
export function Chapter({ n, title, tint }: { n: string; title: string; tint: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.chapter} accessibilityRole="header">
      <View style={[styles.chapterRule, { backgroundColor: tint }]} />
      <T v="overline" color={c.textDim} style={{ letterSpacing: 2 }}>
        {n}
      </T>
      <T v="title" style={styles.chapterTitle}>
        {title}
      </T>
    </View>
  );
}

// --- How am I doing? ---

/** Overall consistency as a misty-blue ring, with the week and the day beside it. */
export const ConsistencyRing = memo(function ConsistencyRing({
  overall,
  week,
  day,
  streak,
}: {
  overall: Tally;
  week: Tally;
  day: number;
  streak: number;
}) {
  const { c } = useTheme();
  const share = overall.eligible ? overall.done / overall.eligible : null;
  const size = 132;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const shown = useEntrance(120, 900);
  const arc = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - (share ?? 0) * shown.value) }));
  const shownDay = Math.min(day, PROGRAM_DAYS);
  return (
    <ThemedView style={[styles.hero, { backgroundColor: c.surface }]}>
      <View
        style={{ width: size, height: size }}
        accessible
        accessibilityLabel={
          share === null
            ? 'Consistency shows after your first day'
            : `${pctText(share)} consistency: ${overall.done} of ${overall.eligible} habit opportunities done`
        }
      >
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={c.mistSoft} strokeWidth={stroke} fill="none" />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={c.mist}
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
          <T style={[styles.ringValue, { color: share === null ? c.textFaint : c.text }]} maxFontSizeMultiplier={1.2}>
            {pctText(share)}
          </T>
          <T v="caption" color={c.textDim} maxFontSizeMultiplier={1.2}>
            consistency
          </T>
        </View>
      </View>
      <View style={styles.heroText}>
        <T v="bodyStrong" maxFontSizeMultiplier={1.3}>
          {share === null
            ? 'Your consistency starts with your first day.'
            : `${overall.done} of ${overall.eligible} habit opportunities done`}
        </T>
        <Fact dot={c.sage} label="This week" value={week.eligible ? `${week.done} of ${week.eligible}` : '—'} />
        <Fact dot={c.peach} label="Streak" value={`${streak} day${streak === 1 ? '' : 's'}`} />
        <Fact dot={c.indigo} label="Day" value={`${shownDay} of ${PROGRAM_DAYS}`} />
      </View>
    </ThemedView>
  );
});

function Fact({ dot, label, value }: { dot: string; label: string; value: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.fact} accessible accessibilityLabel={`${label}: ${value}`}>
      <View style={[styles.factDot, { backgroundColor: dot }]} />
      <T v="caption" color={c.textDim} style={{ flex: 1 }} maxFontSizeMultiplier={1.3}>
        {label}
      </T>
      <T v="caption" style={styles.factValue} maxFontSizeMultiplier={1.3}>
        {value}
      </T>
    </View>
  );
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

const CHART_H = 128;

/**
 * The weeks as a line over a soft misty area: finished weeks joined, this week (so far) a hollow point on a dashed
 * step, a week without records a break in the line, never a zero. Tap a week for its numbers.
 */
export const TrendLine = memo(function TrendLine({ points }: { points: WeekPoint[] }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  const w = Math.min(width, 520) - space.lg * 4 - 30;
  const n = points.length;
  const x = (i: number) => (n === 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (share: number) => 6 + (1 - share) * (CHART_H - 12);
  const lastClosed = [...points].reverse().find((p) => p.state === 'closed') ?? points[n - 1];
  const [picked, setPicked] = useState<number | null>(null);
  const selected = points.find((p) => p.week === picked) ?? lastClosed;

  const { line, area, length, current } = useMemo(() => {
    // Finished weeks with a share, in runs broken by weeks without one.
    const runs: { i: number; s: number }[][] = [[]];
    points.forEach((p, i) => {
      if (p.state === 'closed' && p.share !== null) runs[runs.length - 1].push({ i, s: p.share });
      else if (runs[runs.length - 1].length) runs.push([]);
    });
    let l = '';
    let a = '';
    let len = 0;
    for (const run of runs.filter((r) => r.length)) {
      run.forEach((pt, k) => {
        l += `${k ? 'L' : 'M'}${x(pt.i)} ${y(pt.s)} `;
        if (k) len += Math.hypot(x(pt.i) - x(run[k - 1].i), y(pt.s) - y(run[k - 1].s));
      });
      if (run.length > 1)
        a += `M${x(run[0].i)} ${CHART_H} ${run.map((pt) => `L${x(pt.i)} ${y(pt.s)}`).join(' ')} L${x(run[run.length - 1].i)} ${CHART_H} Z `;
    }
    const ci = points.findIndex((p) => p.state === 'current' && p.share !== null);
    return { line: l, area: a, length: Math.max(1, len), current: ci >= 0 ? ci : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, w]);

  const drawn = useEntrance(200, 900);
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.value) }));
  const areaStyle = useAnimatedStyle(() => ({ opacity: reduce ? 1 : drawn.value }));
  const judged = judgedWeeks(points);
  const prevIdx =
    current !== null ? [...points.slice(0, current)].reverse().findIndex((p) => p.state === 'closed') : -1;
  const prev = current !== null && prevIdx >= 0 ? current - 1 - prevIdx : null;

  return (
    <ThemedView style={[styles.panel, { backgroundColor: c.surface }]}>
      <View style={styles.panelHead}>
        <T v="bodyStrong">Week by week</T>
        <T v="caption" color={c.mistInk} style={{ fontWeight: '700' }}>
          {judged ? `${judged} finished week${judged === 1 ? '' : 's'}` : 'Your first week is under way'}
        </T>
      </View>
      <View style={styles.chartRow}>
        <View style={{ width: w, height: CHART_H }}>
          <Svg width={w} height={CHART_H}>
            {[0, 0.5, 1].map((g) => (
              <Line
                key={g}
                x1={0}
                x2={w}
                y1={y(g)}
                y2={y(g)}
                stroke={c.border}
                strokeWidth={1}
                strokeDasharray={g === 0 ? undefined : '3 5'}
              />
            ))}
            {selected && selected.share !== null ? (
              <Line
                x1={x(points.indexOf(selected))}
                x2={x(points.indexOf(selected))}
                y1={y(selected.share)}
                y2={CHART_H}
                stroke={c.mist}
                strokeOpacity={0.5}
                strokeWidth={1.5}
              />
            ) : null}
          </Svg>
          <Animated.View style={[StyleSheet.absoluteFill, areaStyle]} pointerEvents="none">
            <Svg width={w} height={CHART_H}>
              {area ? <Path d={area} fill={c.mist} fillOpacity={0.16} /> : null}
            </Svg>
          </Animated.View>
          <Svg width={w} height={CHART_H} style={StyleSheet.absoluteFill} pointerEvents="none">
            {line ? (
              <AnimatedPath
                d={line}
                stroke={c.mist}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                strokeDasharray={[length, length]}
                animatedProps={lineProps}
              />
            ) : null}
            {current !== null && prev !== null && points[prev].share !== null ? (
              <Line
                x1={x(prev)}
                y1={y(points[prev].share!)}
                x2={x(current)}
                y2={y(points[current].share!)}
                stroke={c.mist}
                strokeWidth={1.5}
                strokeDasharray="3 4"
              />
            ) : null}
            {points.map((p, i) =>
              p.share === null ? (
                p.state === 'unrecorded' ? (
                  <Circle
                    key={p.week}
                    cx={x(i)}
                    cy={CHART_H - 6}
                    r={3}
                    stroke={c.textFaint}
                    strokeDasharray="2 2"
                    fill="none"
                  />
                ) : null
              ) : (
                <Circle
                  key={p.week}
                  cx={x(i)}
                  cy={y(p.share)}
                  r={p.week === selected?.week ? 6 : 4}
                  fill={p.state === 'current' ? c.surface : c.mist}
                  stroke={c.mist}
                  strokeWidth={2}
                />
              ),
            )}
          </Svg>
          {/* Tap targets, one per week. */}
          <View style={StyleSheet.absoluteFill}>
            {points.map((p, i) => (
              <Pressable
                key={p.week}
                onPress={() => {
                  haptic.tap();
                  setPicked(p.week);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: p.week === selected?.week }}
                accessibilityLabel={weekWords(p)}
                style={[styles.weekHit, { left: x(i) - 18 }]}
              />
            ))}
          </View>
        </View>
        <View style={styles.axis}>
          {['100%', '50%', '0%'].map((l) => (
            <T key={l} v="caption" color={c.textFaint} style={styles.axisText}>
              {l}
            </T>
          ))}
        </View>
      </View>
      <View style={[styles.weeks, { width: w }]}>
        {points.map((p, i) => (
          <T
            key={p.week}
            v="caption"
            color={p.week === selected?.week ? c.mistInk : c.textFaint}
            style={[styles.weekLabel, { left: x(i) - 16 }, p.week === selected?.week && { fontWeight: '800' }]}
          >
            W{p.week}
          </T>
        ))}
      </View>
      {selected ? (
        <Animated.View key={selected.week} entering={FadeIn.duration(180).reduceMotion(sys)}>
          <T v="caption" color={c.textDim} accessibilityLiveRegion="polite">
            {weekWords(selected)}
          </T>
        </Animated.View>
      ) : null}
      {judged === 0 ? (
        <T v="caption" color={c.textFaint}>
          Weeks run Monday to Sunday. Your first week’s line starts once it ends.
        </T>
      ) : null}
    </ThemedView>
  );
});

// --- What's working? ---

export type HabitRow = {
  id: string;
  name: string;
  tally: Tally;
  /** "Daily" or the weekly goal line. */
  kind: string;
  details: ReactNode;
};

/**
 * The habits side by side, most consistent first: each a sage bar on one shared scale, the strongest marked in peach
 * (with enough days to mean it). Tap one for its history, target and difficulty.
 */
export function HabitBoard({ rows }: { rows: HabitRow[] }) {
  const { c } = useTheme();
  const share = (t: Tally) => (t.eligible ? t.done / t.eligible : -1);
  const sorted = [...rows].sort((a, b) => share(b.tally) - share(a.tally));
  const strongest =
    sorted.length > 1 && sorted[0].tally.eligible >= 5 && share(sorted[0].tally) > share(sorted[1].tally)
      ? sorted[0].id
      : null;
  return (
    <ThemedView style={[styles.panel, { backgroundColor: c.surface, paddingVertical: space.sm }]}>
      {sorted.map((r, i) => (
        <HabitBar key={r.id} row={r} strongest={r.id === strongest} first={i === 0} order={i} />
      ))}
    </ThemedView>
  );
}

function HabitBar({
  row,
  strongest,
  first,
  order,
}: {
  row: HabitRow;
  strongest: boolean;
  first: boolean;
  order: number;
}) {
  const { c } = useTheme();
  const [open, setOpen] = useState(false);
  const share = row.tally.eligible ? row.tally.done / row.tally.eligible : null;
  const grow = useEntrance(150 + order * 70, 700);
  const fill = useAnimatedStyle(() => ({ width: `${(share ?? 0) * 100 * grow.value}%` }));
  return (
    <Animated.View layout={LinearTransition.duration(200).reduceMotion(sys)}>
      {first ? null : <ThemedView style={[styles.divider, { backgroundColor: c.border }]} />}
      <Pressable
        onPress={() => {
          haptic.tap();
          setOpen((o) => !o);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint="Shows its history, target and difficulty"
        accessibilityLabel={`${row.name}${strongest ? ', your strongest habit' : ''}. ${
          share === null ? 'No days yet' : `${pctText(share)}, ${row.tally.done} of ${row.tally.eligible}`
        }. ${row.kind}`}
        style={({ pressed }) => [styles.habitRow, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={styles.habitTop}>
          <T v="bodyStrong" numberOfLines={1} style={{ flexShrink: 1 }}>
            {row.name}
          </T>
          {strongest ? (
            <View style={[styles.badge, { backgroundColor: c.peachSoft }]}>
              <Ionicons name="star" size={11} color={c.peach} />
              <T v="caption" color={c.peachInk} style={styles.badgeText}>
                Strongest
              </T>
            </View>
          ) : null}
          <T v="bodyStrong" color={share === null ? c.textFaint : c.sageInk} style={styles.habitPct}>
            {pctText(share)}
          </T>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={15} color={c.textFaint} />
        </View>
        <View style={[styles.track, { backgroundColor: c.sageSoft }]}>
          <Animated.View style={[styles.trackFill, { backgroundColor: c.sage }, fill]} />
        </View>
        <T v="caption" color={c.textDim} numberOfLines={2}>
          {row.tally.eligible ? `${row.tally.done} of ${row.tally.eligible} · ` : ''}
          {row.kind}
        </T>
      </Pressable>
      {open ? (
        <Animated.View entering={FadeIn.duration(200).reduceMotion(sys)} style={styles.habitDetails}>
          {row.details}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** Personal records as peach medallions: what was actually done, as counts (never minutes or hours). */
export const RecordMedals = memo(function RecordMedals({ records }: { records: Records }) {
  const { c } = useTheme();
  const medals: { icon: Icon; n: string; label: string }[] = [
    records.bestWeek
      ? { icon: 'trophy', n: pctText(records.bestWeek.share), label: `best week · Week ${records.bestWeek.week}` }
      : { icon: 'trophy-outline', n: '—', label: 'best week, after your first full week' },
    {
      icon: 'flame',
      n: `${records.bestStreak}`,
      label: records.bestStreak === 1 ? 'day, longest streak' : 'days, longest streak',
    },
    { icon: 'checkmark-done', n: `${records.total}`, label: records.total === 1 ? 'habit done' : 'habits done in all' },
    ...(records.readingDays !== null
      ? [
          {
            icon: 'book' as Icon,
            n: `${records.readingDays}`,
            label: records.readingDays === 1 ? 'reading day' : 'reading days',
          },
        ]
      : []),
    ...(records.strengthSessions !== null
      ? [
          {
            icon: 'barbell' as Icon,
            n: `${records.strengthSessions}`,
            label: records.strengthSessions === 1 ? 'strength session' : 'strength sessions',
          },
        ]
      : []),
  ];
  return (
    <ThemedView style={[styles.panel, { backgroundColor: c.surface }]}>
      <T v="bodyStrong">Personal records</T>
      <View style={styles.medals}>
        {medals.map((m, i) => (
          <Animated.View
            key={m.label}
            entering={FadeIn.delay(120 + i * 60)
              .duration(320)
              .reduceMotion(sys)}
            style={styles.medal}
            accessible
            accessibilityLabel={`${m.n} ${m.label}`}
          >
            <View style={[styles.medalDisc, { backgroundColor: c.peachSoft, borderColor: c.peach }]}>
              <Ionicons name={m.icon} size={18} color={c.peach} />
            </View>
            <View style={{ flex: 1 }}>
              <T style={[styles.medalValue, { color: c.text }]} maxFontSizeMultiplier={1.2}>
                {m.n}
              </T>
              <T v="caption" color={c.textDim} numberOfLines={2} maxFontSizeMultiplier={1.3}>
                {m.label}
              </T>
            </View>
          </Animated.View>
        ))}
      </View>
    </ThemedView>
  );
});

// --- What can I learn? ---

const TONE: Record<Observation['tone'], Icon> = {
  up: 'trending-up',
  steady: 'remove',
  down: 'trending-down',
  note: 'sparkles',
};

/** What the saved days show, one line each, in lavender; a quiet note until there's enough to say. */
export function Observations({ items, day }: { items: Observation[]; day: number }) {
  const { c } = useTheme();
  return (
    <ThemedView style={[styles.panel, styles.reflect, { backgroundColor: c.surface, borderLeftColor: c.accent }]}>
      {items.length ? (
        items.map((o, i) => (
          <Animated.View
            key={o.id}
            entering={FadeIn.delay(100 + i * 70)
              .duration(300)
              .reduceMotion(sys)}
            style={styles.observation}
          >
            <View style={[styles.obsIcon, { backgroundColor: c.accentSoft }]}>
              <Ionicons
                name={TONE[o.tone]}
                size={15}
                color={o.tone === 'up' ? c.sage : o.tone === 'down' ? c.peach : c.accentInk}
              />
            </View>
            <T style={{ flex: 1 }} maxFontSizeMultiplier={1.3}>
              {o.text}
            </T>
          </Animated.View>
        ))
      ) : (
        <View style={styles.observation}>
          <View style={[styles.obsIcon, { backgroundColor: c.accentSoft }]}>
            <Ionicons name="leaf-outline" size={15} color={c.accentInk} />
          </View>
          <T color={c.textDim} style={{ flex: 1 }} maxFontSizeMultiplier={1.3}>
            {day < 7
              ? 'Patterns show here once there are a couple of weeks to look at. For now, every day you mark is the beginning of one.'
              : 'Nothing stands out yet. Observations appear when your days show a clear pattern.'}
          </T>
        </View>
      )}
    </ThemedView>
  );
}

/** The optional weekly Screen Time readings (the person's own, never checked), against the limit. */
export function ScreenTimeHistory({
  readings,
  limit,
  thisWeek,
}: {
  readings: { week: number; minutes: number }[];
  limit: number;
  thisWeek: number;
}) {
  const { c } = useTheme();
  const shown = readings.slice(-8);
  if (!shown.length) return null;
  const top = Math.max(limit, ...shown.map((r) => r.minutes)) * 1.15 || 1;
  const H = 72;
  return (
    <View
      style={{ gap: space.sm }}
      accessible
      accessibilityLabel={
        shown.map((r) => `Week ${r.week}: ${r.minutes} minutes a day`).join('. ') + `. Limit ${limit} minutes.`
      }
    >
      <View style={[styles.screenBars, { height: H }]}>
        {limit > 0 ? (
          <View style={[styles.limit, { bottom: (limit / top) * H, borderColor: c.peach }]}>
            <T v="caption" color={c.peachInk} style={styles.limitText}>
              limit {limit} min
            </T>
          </View>
        ) : null}
        {shown.map((r) => (
          <View key={r.week} style={styles.screenCol}>
            <View
              style={[
                styles.screenBar,
                {
                  height: Math.max(3, (r.minutes / top) * H),
                  backgroundColor: limit && r.minutes <= limit ? c.sage : c.mist,
                  opacity: r.week === thisWeek ? 1 : 0.75,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.screenLabels}>
        {shown.map((r) => (
          <T key={r.week} v="caption" color={r.week === thisWeek ? c.mistInk : c.textFaint} style={styles.screenLabel}>
            W{r.week}
          </T>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chapter: { marginTop: space.xl, gap: 2 },
  chapterRule: { width: 28, height: 3, borderRadius: 2, marginBottom: space.sm },
  chapterTitle: { fontSize: 28, lineHeight: 34 },
  hero: { borderRadius: 28, padding: space.lg, flexDirection: 'row', alignItems: 'center', gap: space.lg },
  ringCenter: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringValue: { fontSize: 32, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8, fontVariant: ['tabular-nums'] },
  heroText: { flex: 1, gap: space.sm },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factDot: { width: 8, height: 8, borderRadius: 4 },
  factValue: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  panel: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  panelHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: space.sm },
  chartRow: { flexDirection: 'row', gap: 6 },
  axis: { height: CHART_H, justifyContent: 'space-between', paddingVertical: 0 },
  axisText: { fontSize: 10, lineHeight: 12, fontVariant: ['tabular-nums'] },
  weekHit: { position: 'absolute', top: 0, bottom: 0, width: 36 },
  weeks: { height: 16 },
  weekLabel: {
    position: 'absolute',
    width: 32,
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
    fontVariant: ['tabular-nums'],
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 0 },
  habitRow: { gap: 6, paddingVertical: space.md },
  habitTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  habitPct: { marginLeft: 'auto', fontVariant: ['tabular-nums'] },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  badgeText: { fontWeight: '700', fontSize: 11 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  trackFill: { height: 8, borderRadius: 4 },
  habitDetails: { gap: space.sm, paddingBottom: space.md },
  medals: { flexDirection: 'row', flexWrap: 'wrap', rowGap: space.lg },
  medal: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingRight: space.sm },
  medalDisc: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalValue: { fontSize: 22, lineHeight: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  reflect: { borderLeftWidth: 3 },
  observation: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  obsIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: -2 },
  screenBars: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  screenCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  screenBar: { width: '70%', borderRadius: 4 },
  limit: { position: 'absolute', left: 0, right: 0, borderTopWidth: 1.5, borderStyle: 'dashed' },
  limitText: { position: 'absolute', right: 0, top: -16, fontSize: 10, fontWeight: '700' },
  screenLabels: { flexDirection: 'row', gap: 10 },
  screenLabel: { flex: 1, textAlign: 'center', fontSize: 10 },
});
