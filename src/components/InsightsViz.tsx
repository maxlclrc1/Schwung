import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  LinearTransition,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { judgedWeeks, type Records, type Tally, type WeekPoint } from '../core/charts';
import { PROGRAM_DAYS } from '../core/dates';
import type { Observation } from '../core/reset/observations';
import { haptic } from '../lib/haptics';
import { space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { T } from './ui';
import { formatNumber, formatPercent, t as tr } from '../i18n';
import { useLanguage, useT } from '../i18n/react';
import { useOnArt } from './onArt';
import { isRTLLanguage, physical } from '../i18n/direction';
import { Tap } from './Tap';

/*
 * Insights as an alpine field journal, drawn by hand (no chart library): five chapters set as type on the lakeside
 * painting and then on the page, with no cards. I · Consistency (one large figure and a line of facts), II · Week by
 * week (a fine line across the misty valley), III · By habit (a ledger, each habit on a quiet scale), IV · Personal
 * records (four figures in a hairline grid), V · Patterns (short notes). Every number is passed in from
 * reset/charts.ts and reset/pilot.ts; nothing here estimates. Lines settle in once when first shown; Reduce Motion
 * shows them at once.
 */

const sys = ReduceMotion.System;
const SETTLE = Easing.bezier(0.22, 1, 0.36, 1);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const pctText = (share: number | null) => (share === null ? '—' : formatPercent(Math.round(share * 100) / 100));
const ROMAN = ['I', 'II', 'III', 'IV', 'V'] as const;

/** 0 → 1 once on mount (a short delay, on the shared curve): the charts' one entrance. */
function useEntrance(delay = 0, duration = 760) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withDelay(delay, withTiming(1, { duration, easing: SETTLE, reduceMotion: sys })));
  }, [v, delay, duration]);
  return v;
}

// --- Figures in text ---

const D = '[0-9٠-٩۰-۹०-९০-৯๐-๙]';
const NUM = `${D}(?:[.,٫٬]?${D})*`;
const PCT = `(?:[%٪]\\s?${NUM}|${NUM}\\s?[%٪])`;
/** "27 of 37", "9 von 11": two figures joined by one short word. */
const RATIO = `${NUM}\\s[^\\s0-9]{1,5}\\s${NUM}`;
const FIGURES = new RegExp(`(${PCT}|${RATIO})`, 'g');
const ANY_FIGURE = new RegExp(`(${PCT}|${RATIO}|${NUM})`, 'g');

/** Text with its meaningful figures (percentages and "x of y") set in the main ink and semibold. */
function Figures({ text, pattern = FIGURES }: { text: string; pattern?: RegExp }) {
  const { c } = useTheme();
  return (
    <>
      {text.split(pattern).map((part, i) =>
        i % 2 ? (
          <T key={i} style={styles.figure} color={c.text}>
            {part}
          </T>
        ) : (
          part
        ),
      )}
    </>
  );
}

/** A percentage split around its number, so the sign can be set smaller ("73" "%", "%" "73", "73" " %"). */
function splitPercent(text: string): [string, string, string] {
  const m = new RegExp(`^(.*?)(${NUM})(.*)$`).exec(text);
  return m ? [m[1], m[2], m[3]] : ['', text, ''];
}

/** A large light figure; a percentage's sign set smaller and raised beside it. */
function BigFigure({ text, size, color }: { text: string; size: number; color?: string }) {
  const { c } = useTheme();
  const [pre, num, post] = splitPercent(text);
  const ink = color ?? c.text;
  const sign = [styles.sign, { fontSize: Math.round(size * 0.42), lineHeight: Math.round(size * 0.5), color: ink, marginTop: Math.round(size * 0.1) }];
  return (
    <View style={styles.bigRow}>
      {pre.trim() ? (
        <T style={sign} maxFontSizeMultiplier={1}>
          {pre.trim()}
        </T>
      ) : null}
      <T style={[styles.big, { fontSize: size, lineHeight: Math.round(size * 1.02), color: ink }]} maxFontSizeMultiplier={1}>
        {num}
      </T>
      {post.trim() ? (
        <T style={sign} maxFontSizeMultiplier={1}>
          {post.trim()}
        </T>
      ) : null}
    </View>
  );
}

/** A hairline in the page's divider colour. */
function Rule({ style }: { style?: object }) {
  const { c } = useTheme();
  return <ThemedView style={[styles.rule, { backgroundColor: c.border }, style]} />;
}

/** A chapter of the journal: its Roman numeral and name in small capitals, a hairline, and an optional note. */
export function Chapter({
  n,
  title,
  note,
  gap = space.xl,
}: {
  n: number;
  title: string;
  note?: string;
  /** Space above the chapter. */
  gap?: number;
}) {
  const { c } = useTheme();
  const onArt = useOnArt();
  // Arabic and Urdu: a right-to-left mark first, so the heading reads right to left from its Latin numeral.
  const rtl = isRTLLanguage(useLanguage());
  const ink = onArt.ink ?? c.textDim;
  return (
    <View style={[styles.chapter, { marginTop: gap }]} accessible accessibilityRole="header">
      <T v="overline" color={ink} style={[styles.chapterTitle, onArt.style]} maxFontSizeMultiplier={1.5}>
        {rtl ? '‏' : null}
        <T v="overline" color={c.textDim} style={styles.numeral}>
          {ROMAN[n - 1]}
        </T>
        {'   '}
        {title}
      </T>
      <View style={[styles.chapterRule, { backgroundColor: ink }]} />
      {note ? (
        <T v="caption" color={ink} style={[styles.chapterNote, onArt.style]} maxFontSizeMultiplier={1.5}>
          {note}
        </T>
      ) : null}
    </View>
  );
}

// --- I · Consistency ---

const FACT_GAP = 10;

/** Overall consistency as one large figure, the opportunities beside it, and a line of facts below. */
export const Consistency = memo(function Consistency({
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
  const onArt = useOnArt();
  const t = useT();
  const { width } = useWindowDimensions();
  // The facts on one line with fine separators while they fit, else one to a line (large text, long words).
  const [box, setBox] = useState(0);
  const lang = useLanguage();
  const factKey = `${week.done}/${week.eligible}/${streak}/${day}/${lang}`;
  // Widths measured for these words (measured again when the facts or the language change).
  const [measured, setMeasured] = useState<{ key: string; w: number[] }>({ key: '', w: [] });
  const widths = measured.key === factKey ? measured.w : [];
  const measure = (i: number, w: number) =>
    setMeasured((m) => {
      const base = m.key === factKey ? m.w : [];
      if (base[i] === w) return m;
      const next = [...base];
      next[i] = w;
      return { key: factKey, w: next };
    });
  const share = overall.eligible ? overall.done / overall.eligible : null;
  const size = Math.round(Math.min(116, (Math.min(width, 520) - space.lg * 2) * 0.32));
  const facts = [
    week.eligible ? t('insights.facts.week', { done: week.done, eligible: week.eligible }) : null,
    t('insights.facts.streak', { count: streak }),
    day > PROGRAM_DAYS
      ? t('beyond.pastSummit', { day })
      : t('insights.facts.day', { day, total: PROGRAM_DAYS }),
  ].filter((f): f is string => f !== null);
  const needed = facts.reduce((sum, _, i) => sum + (widths[i] ?? 0), 0) + FACT_GAP * 2 * (facts.length - 1);
  const stacked = box > 0 && widths.length === facts.length && needed > box + 0.5;
  return (
    <View style={styles.consistency}>
      <View
        style={styles.hero}
        accessible
        accessibilityLabel={
          share === null
            ? t('insights.ring.a11yNone')
            : t('insights.ring.a11y', { pct: pctText(share), done: overall.done, eligible: overall.eligible })
        }
      >
        <BigFigure text={pctText(share)} size={size} color={share === null ? c.textFaint : c.text} />
        <T color={onArt.ink ?? c.textDim} style={[styles.lede, onArt.style]} maxFontSizeMultiplier={1.5}>
          {share === null ? (
            t('insights.ring.first')
          ) : (
            <Figures text={t('insights.ring.done', { done: overall.done, eligible: overall.eligible })} />
          )}
        </T>
      </View>
      <Rule style={{ opacity: 0.9 }} />
      {stacked ? (
        <T color={onArt.ink ?? c.textDim} style={[styles.factText, onArt.style]} maxFontSizeMultiplier={1.5}>
          <Figures text={facts.map((f) => f.replace(/ /g, '\u00A0')).join('  ·  ')} pattern={ANY_FIGURE} />
        </T>
      ) : (
        <View style={styles.facts} onLayout={(e) => setBox(e.nativeEvent.layout.width)}>
          {facts.map((f, i) => (
            <View key={i} style={i > 0 ? [styles.factSep, { borderColor: c.textFaint }] : null}>
              <T
                color={onArt.ink ?? c.textDim}
                style={[styles.factText, onArt.style]}
                maxFontSizeMultiplier={1.5}
                onLayout={(e) => measure(i, e.nativeEvent.layout.width)}
              >
                <Figures text={f} pattern={ANY_FIGURE} />
              </T>
            </View>
          ))}
        </View>
      )}
    </View>
  );
});

// --- II · Week by week ---

function weekWords(p: WeekPoint): string {
  const range = p.days < 7 ? tr('insights.week.range', { count: p.days }) : '';
  const base = { week: p.week, range, done: p.done, eligible: p.eligible };
  switch (p.state) {
    case 'closed':
      return tr('insights.week.closed', { ...base, pct: pctText(p.share) });
    case 'current':
      return p.eligible ? tr('insights.week.current', base) : tr('insights.week.currentNone', base);
    case 'unrecorded':
      return tr('insights.week.unrecorded', base);
    case 'none':
      return tr('insights.week.none', base);
  }
}

/** The chapter's note: how many weeks are finished. */
export function weekNote(points: WeekPoint[]): string {
  const judged = judgedWeeks(points);
  return judged ? tr('insights.week.judged', { count: judged }) : tr('insights.week.first');
}

const CHART_H = 88;
const TOP = 22; // room for the value above a full week
const PAD = 14; // the first and last weeks' points stay clear of the page's edges

/**
 * The weeks as a fine line drawn into the valley: finished weeks as small filled points joined by the line, with a
 * thin stem down to the baseline; this week (so far) a hollow point on a dotted step; a week without records a break
 * in the line, never a zero. One dotted 50% level. Tap a week for its numbers.
 */
export const TrendLine = memo(function TrendLine({ points }: { points: WeekPoint[] }) {
  const { c, isDark } = useTheme();
  const onArt = useOnArt();
  const t = useT();
  const { width } = useWindowDimensions();
  const w = Math.min(width, 520) - space.lg * 2;
  const n = points.length;
  const x = (i: number) => (n === 1 ? w / 2 : PAD + (i / (n - 1)) * (w - PAD * 2));
  const y = (share: number) => TOP + (1 - share) * (CHART_H - TOP - 4);
  const base = CHART_H;
  const lastClosed = [...points].reverse().find((p) => p.state === 'closed') ?? points[n - 1];
  const [picked, setPicked] = useState<number | null>(null);
  const selected = points.find((p) => p.week === picked) ?? lastClosed;
  const ink = c.mistInk;
  // On the light painting the line keeps a soft edge of the page's own light, like the words around it.
  const halo = isDark ? null : c.bg;

  const { line, length, current } = useMemo(() => {
    const runs: { i: number; s: number }[][] = [[]];
    points.forEach((p, i) => {
      if (p.state === 'closed' && p.share !== null) runs[runs.length - 1].push({ i, s: p.share });
      else if (runs[runs.length - 1].length) runs.push([]);
    });
    let l = '';
    let len = 0;
    for (const run of runs.filter((r) => r.length)) {
      run.forEach((pt, k) => {
        l += `${k ? 'L' : 'M'}${x(pt.i)} ${y(pt.s)} `;
        if (k) len += Math.hypot(x(pt.i) - x(run[k - 1].i), y(pt.s) - y(run[k - 1].s));
      });
    }
    const ci = points.findIndex((p) => p.state === 'current');
    return { line: l, length: Math.max(1, len), current: ci >= 0 ? ci : null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, w]);

  const drawn = useEntrance(200, 900);
  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - drawn.value) }));
  const prevIdx =
    current !== null ? [...points.slice(0, current)].reverse().findIndex((p) => p.state === 'closed') : -1;
  const prev = current !== null && prevIdx >= 0 ? current - 1 - prevIdx : null;
  const cur = current !== null ? points[current] : null;

  return (
    <View style={styles.trend}>
      <View style={[physical, { width: w, height: CHART_H }]}>
        <Svg width={w} height={CHART_H} pointerEvents="none">
          <Line x1={0} x2={w} y1={y(0.5)} y2={y(0.5)} stroke={ink} strokeOpacity={0.45} strokeDasharray="1 4" />
          <Line x1={0} x2={w} y1={base} y2={base} stroke={ink} strokeOpacity={0.35} strokeWidth={StyleSheet.hairlineWidth} />
          {points.map((p, i) =>
            p.share !== null && p.state === 'closed' ? (
              <Line
                key={p.week}
                x1={x(i)}
                x2={x(i)}
                y1={y(p.share)}
                y2={base}
                stroke={ink}
                strokeOpacity={p.week === selected?.week ? 0.55 : 0.3}
                strokeWidth={1}
              />
            ) : null,
          )}
          {selected && selected.share !== null ? (
            <Line
              x1={x(points.indexOf(selected)) + 8}
              x2={w - PAD}
              y1={y(selected.share)}
              y2={y(selected.share)}
              stroke={ink}
              strokeOpacity={0.4}
              strokeDasharray="1 5"
              strokeLinecap="round"
            />
          ) : null}
          {halo && line ? (
            <Path d={line} stroke={halo} strokeOpacity={0.7} strokeWidth={5} strokeLinecap="round" fill="none" />
          ) : null}
          {line ? (
            <AnimatedPath
              d={line}
              stroke={ink}
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray={[length, length]}
              animatedProps={lineProps}
            />
          ) : null}
          {cur && cur.share !== null && prev !== null && points[prev].share !== null ? (
            <Line
              x1={x(prev)}
              y1={y(points[prev].share!)}
              x2={x(current!)}
              y2={y(cur.share)}
              stroke={ink}
              strokeOpacity={0.6}
              strokeWidth={1}
              strokeDasharray="1 4"
              strokeLinecap="round"
            />
          ) : null}
          {points.map((p, i) => {
            if (p.state === 'current')
              return (
                <Circle
                  key={p.week}
                  cx={x(i)}
                  cy={p.share !== null ? y(p.share) : base}
                  r={3.5}
                  fill={c.bg}
                  stroke={ink}
                  strokeWidth={1.25}
                />
              );
            if (p.share === null)
              return p.state === 'unrecorded' ? (
                <Circle key={p.week} cx={x(i)} cy={base} r={3} stroke={ink} strokeOpacity={0.6} strokeDasharray="2 2" fill="none" />
              ) : null;
            const sel = p.week === selected?.week;
            return (
              <Circle
                key={p.week}
                cx={x(i)}
                cy={y(p.share)}
                r={sel ? 4.5 : 3.5}
                fill={sel ? ink : (halo ?? c.bg)}
                stroke={ink}
                strokeWidth={sel ? 0 : 1.5}
              />
            );
          })}
        </Svg>
        {/* The 50% level, named once at the margin. */}
        <T style={[styles.level, { top: y(0.5) - 15, color: onArt.ink ?? c.textDim }, onArt.style]} maxFontSizeMultiplier={1.2}>
          {formatPercent(0.5)}
        </T>
        {/* Each finished week's value above its point. */}
        {points.map((p, i) =>
          p.share !== null && p.state === 'closed' ? (
            <T
              key={p.week}
              style={[
                styles.value,
                { left: x(i) - 30, top: y(p.share) - 20, color: onArt.ink ?? c.textDim },
                p.week === selected?.week && { fontWeight: '700', color: c.text },
                onArt.style,
              ]}
              maxFontSizeMultiplier={1.2}
            >
              {pctText(p.share)}
            </T>
          ) : null,
        )}
        {/* Tap targets, one per week. */}
        {points.map((p, i) => (
          <Pressable
            key={p.week}
            onPress={() => {
              haptic.select();
              setPicked(p.week);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: p.week === selected?.week }}
            accessibilityLabel={weekWords(p)}
            style={[styles.weekHit, { left: x(i) - 22 }]}
          />
        ))}
      </View>
      <View style={[physical, styles.weeks, { width: w }]}>
        {points.map((p, i) => (
          <T
            key={p.week}
            color={p.week === selected?.week ? c.text : (onArt.ink ?? c.textDim)}
            style={[styles.weekLabel, { left: x(i) - 20 }, p.week === selected?.week && { fontWeight: '700' }, onArt.style]}
            maxFontSizeMultiplier={1.2}
          >
            W{p.week}
          </T>
        ))}
      </View>
      {selected ? (
        <Animated.View key={selected.week} entering={FadeIn.duration(180).reduceMotion(sys)}>
          <T color={onArt.ink ?? c.textDim} style={[styles.caption, onArt.style]} accessibilityLiveRegion="polite">
            {weekWords(selected)}
          </T>
        </Animated.View>
      ) : null}
      {judgedWeeks(points) === 0 ? (
        <T color={onArt.ink ?? c.textDim} style={[styles.caption, onArt.style]}>
          {t('insights.week.note')}
        </T>
      ) : null}
    </View>
  );
});

// --- The page below the lake ---

/**
 * The painting fading into the page: fills whatever room the first chapters leave above the page (up to 180 pt), and
 * at least a short fade on a small screen, so it never lies over the chart's words.
 */
export function ArtFade() {
  const { c } = useTheme();
  return (
    <View style={styles.fadeRoom} pointerEvents="none">
      <LinearGradient colors={[`${c.bg}00`, `${c.bg}B3`, c.bg]} locations={[0, 0.55, 1]} style={styles.fade} />
    </View>
  );
}

/** The page itself, below the lake: plain, in the page's own colour. */
export function Paper({ children }: { children: ReactNode }) {
  const { c } = useTheme();
  return <ThemedView style={[styles.paper, { backgroundColor: c.bg }]}>{children}</ThemedView>;
}

// --- III · By habit ---

export type HabitRow = {
  id: string;
  name: string;
  tally: Tally;
  /** "Daily" or the weekly goal line. */
  kind: string;
  details: ReactNode;
};

/**
 * The habits as a ledger, most consistent first: each name with its share, a line of detail, and a quiet scale with
 * one mark. The strongest (with enough days to mean it) is named in its line. Tap one for its history, target and
 * difficulty.
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
    <View>
      {sorted.map((r, i) => (
        <HabitLine key={r.id} row={r} strongest={r.id === strongest} first={i === 0} order={i} />
      ))}
      <View style={[physical, styles.axis]} accessible={false} importantForAccessibility="no-hide-descendants">
        <T style={[styles.axisText, { color: c.textFaint }]}>{formatNumber(0)}</T>
        <T style={[styles.axisText, styles.axisMid, { color: c.textFaint }]}>{formatNumber(50)}</T>
        <T style={[styles.axisText, { color: c.textFaint }]}>{formatPercent(1)}</T>
      </View>
    </View>
  );
}

function HabitLine({
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
  const t = useT();
  const [open, setOpen] = useState(false);
  const share = row.tally.eligible ? row.tally.done / row.tally.eligible : null;
  const grow = useEntrance(150 + order * 70, 700);
  const fill = useAnimatedStyle(() => ({ width: `${(share ?? 0) * 100 * grow.value}%` }));
  const meta = `${row.tally.eligible ? `${t('insights.ring.weekValue', { done: row.tally.done, eligible: row.tally.eligible })} · ` : ''}${row.kind}`;
  return (
    <Animated.View layout={LinearTransition.duration(200).reduceMotion(sys)}>
      {first ? null : <Rule style={{ opacity: 0.7 }} />}
      <Tap
        onPress={() => {
          haptic.select();
          setOpen((o) => !o);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityHint={t('insights.habit.hint')}
        accessibilityLabel={t(strongest ? 'insights.habit.a11yStrongest' : 'insights.habit.a11y', {
          name: row.name,
          share:
            share === null
              ? t('insights.habit.noDays')
              : t('insights.habit.share', { pct: pctText(share), done: row.tally.done, eligible: row.tally.eligible }),
          kind: row.kind,
        })}
        style={styles.habit}
      >
        <View style={styles.habitTop}>
          <T style={styles.habitName} maxFontSizeMultiplier={1.6}>
            {row.name}
          </T>
          <SmallFigure text={pctText(share)} color={share === null ? c.textFaint : c.text} />
        </View>
        <T v="caption" color={c.textDim} style={styles.habitMeta} maxFontSizeMultiplier={1.6}>
          {strongest ? (
            <T v="caption" color={c.sageInk} style={{ fontWeight: '600' }}>
              {t('insights.habit.strongest')}
              {' · '}
            </T>
          ) : null}
          {meta}
        </T>
        <View style={[physical, styles.track]}>
          <ThemedView style={[styles.trackLine, { backgroundColor: c.border }]} />
          <View style={[styles.mid, { backgroundColor: c.textFaint }]} />
          <View style={styles.trackRow}>
            <Animated.View style={[styles.trackFill, { backgroundColor: c.sage }, fill]} />
            <View
              style={[
                styles.mark,
                share ? { backgroundColor: c.sage } : { borderWidth: 1.25, borderColor: c.textFaint, backgroundColor: c.bg },
              ]}
            />
          </View>
        </View>
      </Tap>
      {open ? (
        <Animated.View entering={FadeIn.duration(200).reduceMotion(sys)} style={styles.habitDetails}>
          {row.details}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

/** A habit's share: a light figure with its sign set small. */
function SmallFigure({ text, color }: { text: string; color: string }) {
  const [pre, num, post] = splitPercent(text);
  return (
    <T style={[styles.habitPct, { color }]} maxFontSizeMultiplier={1.3}>
      {pre ? <T style={styles.habitSign}>{pre}</T> : null}
      {num}
      {post ? <T style={styles.habitSign}>{post}</T> : null}
    </T>
  );
}

/** The link under an open habit to its own page (history, corrections and difficulty). */
export function DetailsLink({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  const rtl = isRTLLanguage(useLanguage());
  return (
    <Tap
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={styles.link}
    >
      <T style={[styles.linkText, { textDecorationColor: c.border }]} color={c.text}>
        {label}
      </T>
      <T color={c.textDim} style={styles.linkArrow}>
        {rtl ? '←' : '→'}
      </T>
    </Tap>
  );
}

// --- IV · Personal records ---

/** Personal records as large light figures in a hairline grid: counts of what was done (never minutes or hours). */
export const RecordGrid = memo(function RecordGrid({ records }: { records: Records }) {
  const { c } = useTheme();
  const t = useT();
  const items: { n: string; label: string }[] = [
    records.bestWeek
      ? { n: pctText(records.bestWeek.share), label: t('insights.records.bestWeek', { week: records.bestWeek.week }) }
      : { n: '—', label: t('insights.records.bestWeekLater') },
    { n: formatNumber(records.bestStreak), label: t('insights.records.streak', { count: records.bestStreak }) },
    { n: formatNumber(records.total), label: t('insights.records.done', { count: records.total }) },
    ...(records.readingDays !== null
      ? [{ n: formatNumber(records.readingDays), label: t('insights.records.reading', { count: records.readingDays }) }]
      : []),
    ...(records.strengthSessions !== null
      ? [
          {
            n: formatNumber(records.strengthSessions),
            label: t('insights.records.strength', { count: records.strengthSessions }),
          },
        ]
      : []),
  ];
  return (
    <View style={styles.grid}>
      {items.map((m, i) => (
        <ThemedView
          key={m.label}
          style={[
            styles.cell,
            i % 2 === 0 ? styles.cellStart : styles.cellEnd,
            i % 2 === 0 && i + 1 < items.length && [styles.cellDivide, { borderColor: c.border }],
            i >= 2 && [styles.cellTop, { borderColor: c.border }],
          ]}
          accessible
          accessibilityLabel={t('insights.records.a11y', { value: m.n, label: m.label })}
        >
          <BigFigure text={m.n} size={52} />
          <T v="caption" color={c.textDim} maxFontSizeMultiplier={1.6}>
            {m.label}
          </T>
        </ThemedView>
      ))}
    </View>
  );
});

// --- V · Patterns ---

/** What the saved days show, as short numbered notes; a quiet line until there's enough to say. */
export function Observations({ items, day }: { items: Observation[]; day: number }) {
  const { c } = useTheme();
  const t = useT();
  if (!items.length)
    return (
      <T color={c.textDim} style={styles.note} maxFontSizeMultiplier={1.6}>
        {day < 7 ? t('insights.observations.early') : t('insights.observations.none')}
      </T>
    );
  return (
    <View>
      {items.map((o, i) => (
        <View key={o.id}>
          {i ? <Rule style={styles.noteRule} /> : null}
          <View style={styles.noteRow}>
            <T style={[styles.noteNum, { color: c.textFaint }]} maxFontSizeMultiplier={1.3}>
              {formatNumber(i + 1)}
            </T>
            <T color={c.textDim} style={[styles.note, { flex: 1 }]} maxFontSizeMultiplier={1.6}>
              <Figures text={o.text} />
            </T>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rule: { height: StyleSheet.hairlineWidth },
  figure: { fontWeight: '600' },
  big: { fontWeight: '200', letterSpacing: -2, fontVariant: ['tabular-nums'] },
  bigRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 2 },
  sign: { fontWeight: '300' },
  chapter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chapterTitle: { flexShrink: 0, maxWidth: '68%', fontSize: 11.5, letterSpacing: 2 },
  numeral: { fontSize: 11.5, letterSpacing: 1 },
  chapterRule: { flex: 1, minWidth: 12, height: StyleSheet.hairlineWidth, opacity: 0.35 },
  chapterNote: { flexShrink: 1, maxWidth: '45%', fontSize: 13, lineHeight: 17, textAlign: 'right' },
  consistency: { gap: space.md },
  hero: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: space.lg },
  lede: { flex: 1, minWidth: 128, fontSize: 17, lineHeight: 23 },
  facts: { flexDirection: 'row', alignItems: 'center' },
  factSep: { borderStartWidth: StyleSheet.hairlineWidth, marginStart: FACT_GAP, paddingStart: FACT_GAP },
  factText: { fontSize: 15, lineHeight: 20 },
  trend: { gap: 6, marginTop: space.xs },
  level: { position: 'absolute', right: 0, fontSize: 11, lineHeight: 13 },
  value: { position: 'absolute', width: 60, textAlign: 'center', fontSize: 12.5, lineHeight: 16, fontVariant: ['tabular-nums'] },
  weekHit: { position: 'absolute', top: 0, bottom: -24, width: 44 },
  weeks: { height: 16 },
  weekLabel: { position: 'absolute', width: 40, textAlign: 'center', fontSize: 11, lineHeight: 14, fontVariant: ['tabular-nums'] },
  caption: { fontSize: 14, lineHeight: 19 },
  paper: { marginTop: -space.md, marginHorizontal: -space.lg, paddingHorizontal: space.lg, paddingBottom: 248, marginBottom: -248, gap: space.md },
  fadeRoom: { flexGrow: 1, minHeight: 48, justifyContent: 'flex-end', marginHorizontal: -space.lg },
  fade: { flex: 1, maxHeight: 180 },
  habit: { paddingVertical: 20, gap: 4 },
  habitTop: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  habitName: { flex: 1, fontSize: 16.5, lineHeight: 22, fontWeight: '600' },
  habitPct: { fontSize: 24, lineHeight: 28, fontWeight: '300', fontVariant: ['tabular-nums'] },
  habitSign: { fontSize: 13, fontWeight: '400' },
  habitMeta: { fontSize: 13, lineHeight: 18 },
  track: { height: 12, marginTop: 12, justifyContent: 'center' },
  trackLine: { position: 'absolute', left: 0, right: 0, top: 5.5, height: 1, opacity: 0.9 },
  mid: { position: 'absolute', left: '50%', marginLeft: -1.5, top: 4.5, width: 3, height: 3, borderRadius: 1.5, opacity: 0.6 },
  trackRow: { flexDirection: 'row', alignItems: 'center' },
  trackFill: { height: 1.5, opacity: 0.55 },
  mark: { width: 8, height: 8, borderRadius: 4, marginLeft: -4 },
  habitDetails: { gap: space.sm, paddingBottom: space.lg },
  axis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  axisText: { fontSize: 11, lineHeight: 14, fontVariant: ['tabular-nums'] },
  axisMid: { position: 'absolute', left: 0, right: 0, textAlign: 'center' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' },
  linkText: { fontSize: 15, lineHeight: 20, fontWeight: '500', textDecorationLine: 'underline', flexShrink: 1 },
  linkArrow: { fontSize: 15, lineHeight: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { flexBasis: '50%', flexGrow: 0, paddingVertical: 20, gap: 4 },
  cellStart: { paddingEnd: space.lg },
  cellEnd: { paddingStart: space.lg },
  cellDivide: { borderEndWidth: StyleSheet.hairlineWidth },
  cellTop: { borderTopWidth: StyleSheet.hairlineWidth },
  noteRow: { flexDirection: 'row', gap: 10 },
  noteNum: { width: 14, fontSize: 12, lineHeight: 26, fontVariant: ['tabular-nums'] },
  note: { fontSize: 17, lineHeight: 26 },
  noteRule: { width: 28, marginVertical: 20, marginStart: 24 },
});
