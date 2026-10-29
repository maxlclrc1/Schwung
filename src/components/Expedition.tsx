import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  LinearTransition,
  ReduceMotion,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
  ZoomIn,
} from 'react-native-reanimated';
import { ASCENT_PHASES, LANDMARKS, type AscentPhase } from '../core/ascent';
import { cellSummary, shortDate, type DayCell } from '../core/charts';
import { PROGRAM_DAYS } from '../core/dates';
import { haptic } from '../lib/haptics';
import { radius, space, useTheme, type Colors } from '../theme';
import { ThemedView } from '../theme/transition';
import { T } from './ui';

/*
 * Below the mountain on Journey: the climb in numbers (the day, the days completed, the next milestone, and a
 * ridge-line bar of all 66 days), then the 66 days as an expedition calendar, one stage per phase. Every mark comes
 * from the program's own saved days (reset/charts.ts dayCells: each day judged on the habits it actually had,
 * weekly schedules and habits added or removed included). Nothing here is estimated.
 */

const sys = ReduceMotion.System;
const SETTLE = Easing.bezier(0.22, 1, 0.36, 1);
const MILESTONES = Object.keys(LANDMARKS).map(Number);

/** What each stage of the climb is for, in the program's own terms (targets open by phase: reset/readiness.ts). */
const PHASE_MEANING: Record<1 | 2 | 3, string> = {
  1: 'Showing up. Every habit starts at its Foundation targets, small enough to keep.',
  2: 'Momentum targets open from here, offered when you’ve been consistent. Taking them is always your choice.',
  3: 'The last stretch to the summit. Mastery targets open, and the habits are becoming yours.',
};

const phaseTint = (c: Colors, n: 1 | 2 | 3) =>
  n === 1
    ? { fill: c.sage, ink: c.sageInk, soft: c.sageSoft }
    : n === 2
      ? { fill: c.mist, ink: c.mistInk, soft: c.mistSoft }
      : { fill: c.indigo, ink: c.indigoInk, soft: c.indigoSoft };

/** The climb at a glance: three numbers that matter and the whole route as one bar. */
export const JourneySummary = memo(function JourneySummary({
  today,
  completed,
  cells,
}: {
  today: number;
  /** Complete days so far (the journey's own count). */
  completed: number;
  cells: DayCell[];
}) {
  const { c } = useTheme();
  const summit = today > PROGRAM_DAYS;
  const next = MILESTONES.find((d) => d > today);
  const nextName = next ? LANDMARKS[next].name : null;
  return (
    <ThemedView style={[styles.summary, { backgroundColor: c.surface }]}>
      <View style={styles.figures}>
        <Figure
          value={summit ? '66' : `${today}`}
          unit={summit ? 'days climbed' : `day of ${PROGRAM_DAYS}`}
          color={c.indigoInk}
        />
        <ThemedView style={[styles.rule, { backgroundColor: c.border }]} />
        <Figure value={`${completed}`} unit={completed === 1 ? 'day complete' : 'days complete'} color={c.sageInk} />
        <ThemedView style={[styles.rule, { backgroundColor: c.border }]} />
        <Figure
          value={next ? `${next - today}` : '—'}
          unit={next ? `days to ${nextName}` : 'summit reached'}
          color={c.peachInk}
        />
      </View>
      <Ridge cells={cells} today={today} />
    </ThemedView>
  );
});

function Figure({ value, unit, color }: { value: string; unit: string; color: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.figure} accessible accessibilityLabel={`${value} ${unit}`}>
      <Animated.View key={value} entering={FadeIn.duration(260).reduceMotion(sys)}>
        <T style={[styles.figureValue, { color }]} maxFontSizeMultiplier={1.2}>
          {value}
        </T>
      </Animated.View>
      <T v="caption" color={c.textDim} numberOfLines={2} style={styles.figureUnit} maxFontSizeMultiplier={1.2}>
        {unit}
      </T>
    </View>
  );
}

/** The route as one thin bar: complete days in sage, today in indigo, milestones as peach notches, phases spaced. */
function Ridge({ cells, today }: { cells: DayCell[]; today: number }) {
  const { c } = useTheme();
  return (
    <View style={styles.ridge} accessible={false} importantForAccessibility="no-hide-descendants">
      {ASCENT_PHASES.map((p) => (
        <View key={p.n} style={[styles.ridgePhase, { flex: p.to - p.from + 1 }]}>
          {cells.slice(p.from - 1, p.to).map((cell) => (
            <View
              key={cell.day}
              style={[
                styles.ridgeDay,
                {
                  backgroundColor:
                    cell.state === 'full'
                      ? c.sage
                      : cell.day === today
                        ? c.indigo
                        : cell.state === 'partial'
                          ? c.sageSoft
                          : c.surfaceHigh,
                },
              ]}
            >
              {MILESTONES.includes(cell.day) ? <View style={[styles.notch, { backgroundColor: c.peach }]} /> : null}
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * The 66 days as an expedition: three stages (Foundation, Momentum, Mastery), each a header that opens to what
 * the stage is for and how far into it you are, over its days as stones. Sage: complete; soft sage: partly done;
 * indigo: today; peach ring: a milestone; faint: still ahead. Tap a stone for that day. A day that becomes complete
 * while Journey is open fills in softly; nothing animates on arrival.
 */
export const ExpeditionCalendar = memo(function ExpeditionCalendar({
  cells,
  today,
  selected,
  onSelect,
  name,
}: {
  cells: DayCell[];
  today: number;
  selected: number;
  onSelect: (day: number) => void;
  name: (id: string) => string;
}) {
  const { width } = useWindowDimensions();
  const inner = Math.min(width, 520) - space.lg * 2;
  const cols = 7;
  const gap = 8;
  const size = Math.floor((inner - gap * (cols - 1)) / cols);
  // Fills animate only for changes after the first frame (never for the days already complete on arrival).
  const settled = useRef(false);
  useEffect(() => {
    settled.current = true;
  }, []);
  const cell = cells[Math.min(selected, PROGRAM_DAYS) - 1];

  return (
    <View style={styles.calendar}>
      {ASCENT_PHASES.map((p) => (
        <Stage
          key={p.n}
          phase={p}
          cells={cells.slice(p.from - 1, p.to)}
          today={today}
          selected={selected}
          onSelect={onSelect}
          size={size}
          gap={gap}
          animate={settled}
        />
      ))}
      {cell ? <DayNote cell={cell} today={today} name={name} /> : null}
    </View>
  );
});

function Stage({
  phase,
  cells,
  today,
  selected,
  onSelect,
  size,
  gap,
  animate,
}: {
  phase: AscentPhase;
  cells: DayCell[];
  today: number;
  selected: number;
  onSelect: (day: number) => void;
  size: number;
  gap: number;
  animate: { current: boolean };
}) {
  const { c } = useTheme();
  const tint = phaseTint(c, phase.n);
  const [open, setOpen] = useState(false);
  const length = phase.to - phase.from + 1;
  const complete = cells.filter((d) => d.state === 'full').length;
  const current = today >= phase.from && today <= phase.to;
  const ahead = today < phase.from;
  const share = useSharedValue(complete / length);
  useEffect(() => {
    share.set(withTiming(complete / length, { duration: 520, easing: SETTLE, reduceMotion: sys }));
  }, [complete, length, share]);
  const bar = useAnimatedStyle(() => ({ width: `${share.value * 100}%` }));

  return (
    <Animated.View layout={LinearTransition.duration(220).reduceMotion(sys)} style={styles.stage}>
      <Pressable
        onPress={() => {
          haptic.tap();
          setOpen((o) => !o);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`${phase.name}, days ${phase.from} to ${phase.to}. ${complete} of ${length} complete.${current ? ' You are here.' : ''}`}
        accessibilityHint="Shows what this stage is for"
      >
        {({ pressed }) => (
          <View style={[styles.stageHead, { opacity: pressed ? 0.7 : 1 }]}>
            <View style={[styles.stageBadge, { backgroundColor: ahead ? c.surfaceHigh : tint.fill }]}>
              <T v="caption" color={ahead ? c.textDim : c.onTint} style={styles.stageNumber}>
                {phase.n}
              </T>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <View style={styles.stageTitleRow}>
                <T v="bodyStrong" color={ahead ? c.textDim : c.text}>
                  {phase.name}
                </T>
                {current ? (
                  <View style={[styles.here, { backgroundColor: c.indigoSoft }]}>
                    <T v="caption" color={c.indigoInk} style={styles.hereText}>
                      You are here
                    </T>
                  </View>
                ) : null}
                <T v="caption" color={c.textFaint} style={{ marginLeft: 'auto' }}>
                  Days {phase.from}–{phase.to}
                </T>
              </View>
              <View style={[styles.stageTrack, { backgroundColor: tint.soft }]}>
                <Animated.View style={[styles.stageFill, { backgroundColor: tint.fill }, bar]} />
              </View>
            </View>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={c.textDim} />
          </View>
        )}
      </Pressable>
      {open ? (
        <Animated.View
          entering={FadeIn.duration(200).reduceMotion(sys)}
          style={[styles.meaning, { backgroundColor: tint.soft }]}
        >
          <T v="caption" color={c.text}>
            {PHASE_MEANING[phase.n]}
          </T>
          <T v="caption" color={tint.ink} style={{ fontWeight: '700' }}>
            {complete} of {length} days complete
            {ahead ? ` · opens on day ${phase.from}` : current ? ` · day ${today - phase.from + 1} of ${length}` : ''}
          </T>
        </Animated.View>
      ) : null}
      <View style={[styles.stones, { gap }]}>
        {cells.map((d) => (
          <Stone
            key={d.day}
            cell={d}
            size={size}
            today={d.day === today}
            milestone={MILESTONES.includes(d.day)}
            selected={d.day === selected}
            animate={animate.current}
            onPress={() => {
              haptic.tap();
              onSelect(d.day);
            }}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const Stone = memo(function Stone({
  cell,
  size,
  today,
  milestone,
  selected,
  animate,
  onPress,
}: {
  cell: DayCell;
  size: number;
  today: boolean;
  milestone: boolean;
  selected: boolean;
  animate: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  const d = size - 8;
  const full = cell.state === 'full';
  const partial = cell.state === 'partial' || (cell.state === 'today' && cell.done.length > 0);
  const future = cell.state === 'future';
  const ring = today ? c.indigo : milestone ? c.peach : cell.state === 'missed' ? c.textFaint : 'transparent';
  const bg = full
    ? c.sage
    : partial
      ? c.sageSoft
      : future
        ? 'transparent'
        : cell.state === 'skipped'
          ? c.surfaceHigh
          : cell.state === 'rest'
            ? 'transparent'
            : c.surface;
  const fg = full ? c.onTint : today ? c.indigoInk : future ? c.textFaint : c.textDim;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={2}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`Day ${cell.day}${milestone ? `, ${LANDMARKS[cell.day].name}` : ''}. ${stateWords(cell, today)}`}
      style={[styles.stoneHit, { width: size, height: size }]}
    >
      {selected ? (
        <View style={[styles.selected, { width: size, height: size, borderRadius: size / 2, borderColor: c.text }]} />
      ) : null}
      <View
        style={[
          styles.stone,
          {
            width: d,
            height: d,
            borderRadius: d / 2,
            backgroundColor: future ? 'transparent' : c.surface,
            borderColor: ring,
            borderWidth: today ? 2.5 : milestone || cell.state === 'missed' ? 1.5 : 0,
            borderStyle: cell.state === 'unrecorded' ? 'dashed' : 'solid',
          },
          cell.state === 'unrecorded' && { borderColor: c.border, borderWidth: 1.5 },
          future && { borderColor: milestone ? c.peach : c.border, borderWidth: milestone ? 1.5 : 1 },
        ]}
      >
        {/* The fill, keyed by state: a day completed while you watch fills in softly. */}
        <Animated.View
          key={`${cell.state}-${partial}`}
          entering={animate && full ? ZoomIn.duration(280).reduceMotion(sys) : undefined}
          style={[StyleSheet.absoluteFill, { borderRadius: d / 2, backgroundColor: bg }]}
        />
        {cell.state === 'rest' ? (
          <View style={[styles.restDot, { backgroundColor: c.textFaint }]} />
        ) : (
          <T style={[styles.stoneText, { color: fg }]} maxFontSizeMultiplier={1.1}>
            {cell.day}
          </T>
        )}
        {milestone && !future ? <View style={[styles.flag, { backgroundColor: c.peach, borderColor: c.bg }]} /> : null}
      </View>
    </Pressable>
  );
});

function stateWords(cell: DayCell, today: boolean): string {
  if (today) return cell.state === 'full' ? 'Today, complete.' : 'Today.';
  switch (cell.state) {
    case 'full':
      return 'Complete.';
    case 'partial':
      return 'Partly done.';
    case 'missed':
      return 'Nothing done.';
    case 'skipped':
      return 'Skipped.';
    case 'rest':
      return 'A rest day.';
    case 'unrecorded':
      return 'No record.';
    case 'future':
      return 'Still ahead.';
    default:
      return '';
  }
}

/** The tapped day, from its own record. */
function DayNote({ cell, today, name }: { cell: DayCell; today: number; name: (id: string) => string }) {
  const { c } = useTheme();
  const milestone = LANDMARKS[cell.day];
  return (
    <Animated.View key={cell.day} entering={FadeIn.duration(180).reduceMotion(sys)} accessibilityLiveRegion="polite">
      <ThemedView style={[styles.note, { backgroundColor: c.surface }]}>
        <View style={styles.noteHead}>
          <T v="bodyStrong">
            Day {cell.day}
            {cell.day === today ? ' · Today' : ''}
          </T>
          <T v="caption" color={c.textDim}>
            {shortDate(cell.date)}
          </T>
        </View>
        {milestone ? (
          <T v="caption" color={c.peachInk} style={{ fontWeight: '700' }}>
            {milestone.name}
          </T>
        ) : null}
        <T v="caption" color={c.textDim}>
          {cell.state === 'future' ? 'Still ahead.' : cellSummary(cell, name)}
        </T>
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  summary: { borderRadius: 24, padding: space.lg, gap: space.lg },
  figures: { flexDirection: 'row', alignItems: 'flex-start' },
  figure: { flex: 1, gap: 2, alignItems: 'center' },
  figureValue: { fontSize: 30, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  figureUnit: { textAlign: 'center' },
  rule: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginHorizontal: space.xs },
  ridge: { flexDirection: 'row', gap: 4, height: 8 },
  ridgePhase: { flexDirection: 'row', gap: 1 },
  ridgeDay: { flex: 1, borderRadius: 1.5 },
  notch: { position: 'absolute', left: -1, right: -1, top: -4, height: 3, borderRadius: 1.5 },
  calendar: { gap: space.xl },
  stage: { gap: space.md },
  stageHead: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  stageBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  stageNumber: { fontWeight: '800' },
  stageTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  here: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill },
  hereText: { fontWeight: '700', fontSize: 12 },
  stageTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  stageFill: { height: 4, borderRadius: 2 },
  meaning: { borderRadius: radius.md, padding: space.md, gap: 4 },
  stones: { flexDirection: 'row', flexWrap: 'wrap' },
  stoneHit: { alignItems: 'center', justifyContent: 'center' },
  selected: { position: 'absolute', borderWidth: 1.5 },
  stone: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  stoneText: { fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  restDot: { width: 5, height: 5, borderRadius: 3 },
  flag: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  note: { borderRadius: radius.lg, padding: space.md, gap: 4 },
  noteHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
});
