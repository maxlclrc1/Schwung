import { memo } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Mask, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ASCENT_PHASES, LANDMARKS } from '../../core/ascent';
import { cellSummary, shortDate, type DayCell } from '../../core/charts';
import { FOUNDATION_DAYS, TRAIL_DAYS, TRAIL_H, TRAIL_LENGTH, TRAIL_PATH, TRAIL_W } from '../../core/foundationTrail';
import { haptic } from '../../lib/haptics';
import { space, useTheme, type Colors } from '../../theme';
import { T } from '../ui';
import { formatNumber, t as tr } from '../../i18n';
import { useT } from '../../i18n/react';
import { flipX } from '../../i18n/direction';
import { FOUNDATION_CONTOURS } from './foundationContours';

/*
 * Foundation on Journey: Days 1–21 as a trail across a contour map (the approved design, 5c42dd8). The route, the
 * terrain and the day positions are fixed in trail units (core/foundationTrail.ts) and scaled to the screen's width,
 * so the trail keeps its shape on every iPhone. The walked part is solid sage up to today; ahead it is a fine line.
 * Each day is its own button; the selected day's entry sits under the trail.
 */

const sys = ReduceMotion.System;
const MILESTONES = Object.keys(LANDMARKS).map(Number);
/** Contours run past the trail's top and bottom, fading out, so the map has no hard edge. */
const OVER_TOP = 120;
const OVER_BOTTOM = 120;
const HIT = 44;

type Look = 'today' | 'milestone' | 'full' | 'partial' | 'missed' | 'rest' | 'future';

function look(cell: DayCell | undefined, day: number, today: number): Look {
  if (day === today) return 'today';
  if (MILESTONES.includes(day)) return 'milestone';
  switch (cell?.state) {
    case 'full':
      return 'full';
    case 'partial':
      return 'partial';
    case 'missed':
    case 'unrecorded':
      return 'missed';
    case 'rest':
    case 'skipped':
      return 'rest';
    default:
      return 'future';
  }
}

function inks(c: Colors, dark: boolean) {
  return {
    contour: dark ? 'rgba(220,214,255,0.12)' : 'rgba(60,52,90,0.2)',
    ahead: dark ? 'rgba(245,243,255,0.3)' : 'rgba(25,22,33,0.3)',
    walked: dark ? c.sage : '#6F9A72',
  };
}

/** The map: contour lines, quieter around every marker and number, fading out at the top and bottom. Static. */
const Terrain = memo(function Terrain({
  scale,
  width,
  color,
  today,
}: {
  scale: number;
  width: number;
  color: string;
  /** Today is numbered inside its marker, so its label spot needs no quiet patch. */
  today: number;
}) {
  const x0 = -space.lg / scale;
  const w = width / scale;
  const top = -OVER_TOP;
  const h = TRAIL_H + OVER_TOP + OVER_BOTTOM;
  return (
    <Svg
      width={width}
      height={h * scale}
      viewBox={`${x0} ${top} ${w} ${h}`}
      style={{ position: 'absolute', left: -space.lg, top: top * scale }}
      pointerEvents="none"
    >
      <Defs>
        <RadialGradient id="hole">
          <Stop offset="0" stopColor="#000" stopOpacity={0.85} />
          <Stop offset="0.6" stopColor="#000" stopOpacity={0.6} />
          <Stop offset="1" stopColor="#000" stopOpacity={0} />
        </RadialGradient>
        <LinearGradient id="edges" x1="0" y1={top} x2="0" y2={top + h} gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#fff" stopOpacity={0} />
          <Stop offset="0.12" stopColor="#fff" stopOpacity={1} />
          <Stop offset="0.92" stopColor="#fff" stopOpacity={1} />
          <Stop offset="1" stopColor="#fff" stopOpacity={0} />
        </LinearGradient>
        <Mask id="quiet" maskUnits="userSpaceOnUse" x={x0} y={top} width={w} height={h}>
          <Rect x={x0} y={top} width={w} height={h} fill="url(#edges)" />
          {TRAIL_DAYS.map((d) => (
            <Circle key={`m${d.day}`} cx={d.x} cy={d.y} r={20} fill="url(#hole)" />
          ))}
          {TRAIL_DAYS.filter((d) => d.day !== today).map((d) => (
            <Circle key={`l${d.day}`} cx={d.label.x} cy={d.label.y} r={15} fill="url(#hole)" />
          ))}
        </Mask>
      </Defs>
      <G mask="url(#quiet)" fill="none" stroke={color} strokeLinejoin="round">
        {FOUNDATION_CONTOURS.map((d, i) => (
          <Path key={i} d={d.slice(1)} strokeWidth={d[0] === '1' ? 1.15 : 0.75} />
        ))}
      </G>
    </Svg>
  );
});

export const FoundationTrail = memo(function FoundationTrail({
  cells,
  today,
  selected,
  onSelect,
  onOpen,
  name,
}: {
  /** The program's days (charts.dayCells); the first 21 are drawn. */
  cells: DayCell[];
  /** The program day today (capped at 66). */
  today: number;
  selected: number;
  onSelect: (day: number) => void;
  /** Opens the selected day's full detail (its habits, by the mountain). */
  onOpen: (day: number) => void;
  name: (id: string) => string;
}) {
  const { c, isDark } = useTheme();
  const t = useT();
  const { width } = useWindowDimensions();
  const inner = Math.min(width, 520) - space.lg * 2;
  const s = inner / TRAIL_W;
  const ink = inks(c, isDark);
  const done = cells.slice(0, FOUNDATION_DAYS).filter((d) => d.state === 'full').length;
  const here = today <= FOUNDATION_DAYS;
  const walked = today >= FOUNDATION_DAYS ? TRAIL_LENGTH : (TRAIL_DAYS[today - 1]?.at ?? 0);

  // A tap goes to the nearest day, so neighbouring buttons never fight over a touch around a tight bend.
  const press = (own: number, left: number, top: number) => (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    let day = own;
    if (Number.isFinite(locationX) && Number.isFinite(locationY)) {
      const x = (left + locationX) / s;
      const y = (top + locationY) / s;
      let best = Infinity;
      for (const d of TRAIL_DAYS) {
        const dist = Math.hypot(d.x - x, d.y - y);
        if (dist < best) {
          best = dist;
          day = d.day;
        }
      }
    }
    haptic.select();
    onSelect(day);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head} accessible accessibilityRole="header">
        <View style={styles.titleRow}>
          <T style={styles.title} maxFontSizeMultiplier={1.4} numberOfLines={2}>
            <T style={[styles.title, styles.numeral, { color: c.textDim }]}>I · </T>
            {ASCENT_PHASES[0].name}
          </T>
          <T v="small" color={c.textDim} maxFontSizeMultiplier={1.4}>
            {t('journeyTab.stage.days', { from: 1, to: FOUNDATION_DAYS })}
          </T>
        </View>
        <T v="small" color={c.textDim} style={styles.sub} maxFontSizeMultiplier={1.4}>
          {t('journeyTab.stage.complete', { done, length: FOUNDATION_DAYS })}
          {here ? (
            <T v="small" color={c.indigoInk}>
              {' · '}
              {t('journeyTab.stage.here')}
            </T>
          ) : null}
        </T>
      </View>

      <View style={{ width: inner, height: TRAIL_H * s, marginTop: 30 }}>
        <Terrain scale={s} width={inner + space.lg * 2} color={ink.contour} today={today} />
        <Svg
          width={inner}
          height={TRAIL_H * s}
          viewBox={`0 0 ${TRAIL_W} ${TRAIL_H}`}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        >
          <Path d={TRAIL_PATH} fill="none" stroke={ink.ahead} strokeWidth={1.3} strokeLinecap="round" />
          <Path
            d={TRAIL_PATH}
            fill="none"
            stroke={ink.walked}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeDasharray={[walked, TRAIL_LENGTH + 10]}
          />
          {TRAIL_DAYS.map((d) => (
            <Marker
              key={d.day}
              x={d.x}
              y={d.y}
              look={look(cells[d.day - 1], d.day, today)}
              reached={d.day <= today}
              selected={d.day === selected && d.day !== today}
              c={c}
            />
          ))}
        </Svg>
        {TRAIL_DAYS.map((d) => {
          const lk = look(cells[d.day - 1], d.day, today);
          const sel = d.day === selected;
          const left = d.x * s - HIT / 2;
          const top = d.y * s - HIT / 2;
          return (
            <View key={d.day} pointerEvents="box-none" style={StyleSheet.absoluteFill}>
              {lk === 'today' ? (
                <T
                  style={[styles.todayNumber, { left: d.x * s - 20, top: d.y * s - 9, color: '#fff' }]}
                  maxFontSizeMultiplier={1}
                  accessible={false}
                >
                  {formatNumber(d.day)}
                </T>
              ) : (
                <T
                  style={[
                    styles.label,
                    {
                      left: d.label.x * s - 20,
                      top: d.label.y * s - 9,
                      color: sel ? c.text : lk === 'future' ? c.textFaint : c.textDim,
                      fontWeight: sel ? '700' : '600',
                    },
                  ]}
                  maxFontSizeMultiplier={1}
                  accessible={false}
                >
                  {formatNumber(d.day)}
                </T>
              )}
              <Pressable
                onPress={press(d.day, left, top)}
                accessibilityRole="button"
                accessibilityState={{ selected: sel }}
                accessibilityLabel={dayLabel(cells[d.day - 1], d.day, d.day === today)}
                style={[styles.hit, { left, top }]}
              />
            </View>
          );
        })}
      </View>

      {selected >= 1 && selected <= FOUNDATION_DAYS && cells[selected - 1] ? (
        <Entry cell={cells[selected - 1]} today={today} name={name} onOpen={onOpen} />
      ) : null}
    </View>
  );
});

/** One day's mark, in trail units. */
function Marker({
  x,
  y,
  look: lk,
  reached,
  selected,
  c,
}: {
  x: number;
  y: number;
  look: Look;
  reached: boolean;
  selected: boolean;
  c: Colors;
}) {
  const paper = c.bg;
  return (
    <G>
      {selected ? <Circle cx={x} cy={y} r={11.5} fill={paper} stroke={c.text} strokeWidth={1.5} /> : null}
      {lk === 'today' ? (
        <Circle cx={x} cy={y} r={13} fill={c.indigo} />
      ) : lk === 'milestone' ? (
        <Rect
          x={x - 5.5}
          y={y - 5.5}
          width={11}
          height={11}
          rx={1.5}
          transform={`rotate(45 ${x} ${y})`}
          fill={reached ? c.peach : paper}
          stroke={c.peach}
          strokeWidth={1.6}
        />
      ) : lk === 'full' ? (
        <Circle cx={x} cy={y} r={6} fill={c.sage} stroke={paper} strokeWidth={1.5} />
      ) : lk === 'partial' ? (
        <Circle cx={x} cy={y} r={5.6} fill={paper} stroke={c.sage} strokeWidth={2} />
      ) : lk === 'missed' ? (
        <G>
          <Circle cx={x} cy={y} r={5.6} fill={paper} stroke={c.textDim} strokeWidth={1.4} />
          <Line x1={x - 3} y1={y} x2={x + 3} y2={y} stroke={c.textDim} strokeWidth={1.6} strokeLinecap="round" />
        </G>
      ) : lk === 'rest' ? (
        <Circle cx={x} cy={y} r={5.6} fill={paper} stroke={c.textDim} strokeWidth={1.4} />
      ) : (
        <Circle cx={x} cy={y} r={4} fill={paper} stroke={c.textFaint} strokeWidth={1.4} />
      )}
    </G>
  );
}

function dayLabel(cell: DayCell | undefined, day: number, isToday: boolean): string {
  const state = isToday
    ? tr(cell?.state === 'full' ? 'journeyTab.cell.todayComplete' : 'journeyTab.cell.today')
    : cell
      ? tr(`journeyTab.cell.${cell.state === 'today' ? 'future' : cell.state}`)
      : '';
  return LANDMARKS[day]
    ? tr('journeyTab.cell.a11yMilestone', { day, milestone: LANDMARKS[day].name, state })
    : tr('journeyTab.cell.a11y', { day, state });
}

/** The selected day's entry in the log: when it was, what happened, and the way into its full detail. */
function Entry({
  cell,
  today,
  name,
  onOpen,
}: {
  cell: DayCell;
  today: number;
  name: (id: string) => string;
  onOpen: (day: number) => void;
}) {
  const { c } = useTheme();
  const t = useT();
  const isToday = cell.day === today;
  const kicker = t(
    isToday ? 'journeyTab.kicker.today' : cell.day > today ? 'journeyTab.kicker.ahead' : 'journeyTab.kicker.past',
  );
  const milestone = LANDMARKS[cell.day];
  return (
    <Animated.View
      key={cell.day}
      entering={FadeIn.duration(180).reduceMotion(sys)}
      style={styles.entry}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.rule, { backgroundColor: isToday ? c.indigo : c.text, opacity: isToday ? 1 : 0.6 }]} />
      <T style={[styles.kicker, { color: isToday ? c.indigoInk : c.textDim }]} maxFontSizeMultiplier={1.4}>
        {kicker} · {shortDate(cell.date)}
      </T>
      <T style={styles.entryDay} accessibilityRole="header" maxFontSizeMultiplier={1.4}>
        {t('journeyTab.cell.day', { day: cell.day })}
      </T>
      {milestone ? (
        <T v="label" color={c.peachInk}>
          {milestone.name}
        </T>
      ) : null}
      <T style={styles.words} color={c.textDim}>
        {cellSummary(cell, name)}
      </T>
      <Pressable
        onPress={() => {
          haptic.select();
          onOpen(cell.day);
        }}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => [styles.open, { opacity: pressed ? 0.6 : 1 }]}
      >
        <T v="label" color={c.indigoInk}>
          {t('journeyTab.trail.open')}
        </T>
        <Ionicons name="chevron-forward" size={14} color={c.indigoInk} style={flipX} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: space.xl },
  head: { marginHorizontal: space.md },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.sm },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5, flexShrink: 1 },
  numeral: { fontWeight: '600' },
  sub: { marginTop: 4, fontWeight: '400' },
  label: {
    position: 'absolute',
    width: 40,
    textAlign: 'center',
    fontSize: 12.5,
    lineHeight: 18,
    fontVariant: ['tabular-nums'],
  },
  todayNumber: {
    position: 'absolute',
    width: 40,
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  hit: { position: 'absolute', width: HIT, height: HIT, borderRadius: HIT / 2 },
  entry: { marginTop: 26, marginHorizontal: space.md },
  rule: { width: 22, height: 2 },
  kicker: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  entryDay: { fontSize: 19, lineHeight: 24, fontWeight: '700', letterSpacing: -0.2, marginTop: 3 },
  words: { fontSize: 15, lineHeight: 21, marginTop: 4 },
  open: { marginTop: 8, alignSelf: 'flex-start', minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 2 },
});
