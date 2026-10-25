import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { ASCENT_ASPECT, DAY_POINTS, trailDots } from '../core/ascent';
import { OBSERVATION } from '../core/fieldnotes/catalog';
import { CAMPS, campReached, dayRecord, FN_DAYS, trailFraction, type CampKey } from '../core/fieldnotes/journey';
import type { FnGoal, FnRun, Rating } from '../core/fieldnotes/types';
import { haptic } from '../lib/haptics';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { T } from './ui';

/** The trail day (1..66 on the painting) where a Field Notes day sits. */
const trailDay = (day: number) => Math.round(trailFraction(day) * (DAY_POINTS.length - 1)) + 1;
const DOTS = trailDots(3);

/**
 * The Ascent painting as a journey of five camps: each a real moment of the experiment (the question, the
 * starting point, a first look, the discovery, the field note). The trail is walked up to today; camps light up
 * when reached. Drawn over the WorldBackdrop, which the screen places behind it (like Today).
 */
export function FieldTrail({
  run,
  today,
  width,
  selected,
  onSelect,
}: {
  run: FnRun;
  today: number;
  width: number;
  selected: CampKey | null;
  onSelect: (k: CampKey) => void;
}) {
  const { c, isDark } = useTheme();
  const height = Math.round(width / ASCENT_ASPECT);
  const here = trailDay(today);
  const walked = isDark ? 'rgba(167,139,250,0.75)' : 'rgba(116,81,200,0.7)';
  const ahead = isDark ? 'rgba(245,243,255,0.22)' : 'rgba(25,22,33,0.18)';
  const badgeBg = isDark ? 'rgba(28,27,37,0.92)' : 'rgba(255,255,255,0.94)';
  return (
    <View style={{ width, height }}>
      {DOTS.map((d, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={[
            styles.dot,
            { left: d.x * width - 1.25, top: d.y * height - 1.25, backgroundColor: d.between <= here ? walked : ahead },
          ]}
        />
      ))}
      {CAMPS.map((camp) => {
        const p = DAY_POINTS[trailDay(camp.day) - 1];
        const reached = campReached(camp, today, run);
        const isSelected = selected === camp.key;
        const size = isSelected ? 38 : 32;
        return (
          <Pressable
            key={camp.key}
            onPress={() => {
              haptic.tap();
              onSelect(camp.key);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: !reached }}
            accessibilityLabel={`${camp.name}, ${reached ? 'reached' : `day ${camp.day}, not reached yet`}`}
            hitSlop={8}
            style={[
              styles.camp,
              { left: p.x * width - size / 2, top: p.y * height - size / 2, width: size, height: size },
            ]}
          >
            <View
              style={[
                styles.badge,
                {
                  borderRadius: size / 2,
                  backgroundColor: reached ? c.accent : badgeBg,
                  borderColor: reached ? c.accent : isSelected ? c.accent : ahead,
                  borderWidth: isSelected && !reached ? 2 : 1.5,
                },
              ]}
            >
              <Ionicons name={camp.icon} size={isSelected ? 18 : 15} color={reached ? c.onAccent : c.textDim} />
            </View>
          </Pressable>
        );
      })}
      {/* Today, between the camps: a small marker where the walked trail ends (a camp day shows its camp). */}
      {today <= FN_DAYS && !CAMPS.some((camp) => camp.day === today) ? (
        <View
          pointerEvents="none"
          style={[
            styles.here,
            {
              left: DAY_POINTS[here - 1].x * width - 6,
              top: DAY_POINTS[here - 1].y * height - 6,
              backgroundColor: c.accentLight,
              borderColor: c.accent,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

/** The day's one observation: a labelled 1–5 scale. Optional; clearing it leaves the day without a note. */
export function Observation({
  goal,
  value,
  onPick,
  onClear,
}: {
  goal: FnGoal;
  value?: Rating;
  onPick: (r: Rating) => void;
  onClear: () => void;
}) {
  const { c } = useTheme();
  const o = OBSERVATION[goal];
  return (
    <View style={{ gap: space.sm }}>
      <T v="bodyStrong" accessibilityRole="header">
        {o.question}
      </T>
      <View style={styles.scale} accessibilityRole="radiogroup" accessibilityLabel={o.question}>
        {([1, 2, 3, 4, 5] as Rating[]).map((r) => {
          const on = value === r;
          const label = r === 1 ? `1, ${o.low}` : r === 5 ? `5, ${o.high}` : String(r);
          return (
            <Pressable
              key={r}
              onPress={() => {
                haptic.tap();
                onPick(r);
              }}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={label}
              style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.75 : 1 }]}
            >
              <ThemedView
                style={[
                  styles.step,
                  {
                    backgroundColor: on ? c.accent : c.surfaceHigh,
                    borderColor: on ? c.accent : 'transparent',
                  },
                ]}
              >
                <T v="bodyStrong" color={on ? c.onAccent : c.text}>
                  {r}
                </T>
              </ThemedView>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.ends} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <T v="caption" color={c.textDim}>
          {o.low}
        </T>
        <T v="caption" color={c.textDim}>
          {o.high}
        </T>
      </View>
      {value !== undefined ? (
        <Pressable onPress={onClear} accessibilityRole="button" hitSlop={10} style={{ alignSelf: 'flex-start' }}>
          <T v="caption" color={c.textDim}>
            Clear today’s note
          </T>
        </Pressable>
      ) : (
        <T v="caption" color={c.textFaint}>
          Optional. Skipping is fine; a skipped day just has no note.
        </T>
      )}
    </View>
  );
}

/**
 * The 14 days at a glance: a bar for each note (1–5), an empty outline where there's none (never drawn as zero),
 * a dot under days it was tried and a ring under days it wasn't. Starting days are set apart.
 */
export function DayStrip({ run, today }: { run: Pick<FnRun, 'startedAt' | 'days' | 'goal'>; today: number }) {
  const { c } = useTheme();
  const noun = OBSERVATION[run.goal].noun;
  const cols = Array.from({ length: FN_DAYS }, (_, i) => {
    const day = i + 1;
    return { day, r: day <= today ? dayRecord(run, day) : undefined, future: day > today };
  });
  const label = cols
    .filter((x) => !x.future)
    .map(
      (x) =>
        `Day ${x.day}: ${x.r?.rating !== undefined ? `${noun} ${x.r.rating}` : 'no note'}${
          x.r?.tried === true ? ', tried' : x.r?.tried === false ? ', not tried' : ''
        }`,
    )
    .join('. ');
  return (
    <View accessible accessibilityLabel={label || 'No days yet.'} style={{ gap: space.xs }}>
      <View style={styles.strip}>
        {cols.map(({ day, r, future }) => {
          const base = day <= 3;
          const h = r?.rating !== undefined ? 8 + r.rating * 10 : 0;
          return (
            <View key={day} style={styles.col}>
              <View style={styles.barArea}>
                {r?.rating !== undefined ? (
                  <ThemedView style={[styles.bar, { height: h, backgroundColor: base ? c.textFaint : c.accent }]} />
                ) : (
                  <ThemedView
                    style={[
                      styles.empty,
                      { borderColor: future ? c.surfaceHigh : c.border, opacity: future ? 0.6 : 1 },
                    ]}
                  />
                )}
              </View>
              <View
                style={[
                  styles.mark,
                  r?.tried === true
                    ? { backgroundColor: c.accent }
                    : r?.tried === false
                      ? { borderWidth: 1.5, borderColor: c.textFaint }
                      : null,
                ]}
              />
              <T
                v="caption"
                color={day === today ? c.accentInk : c.textFaint}
                style={styles.num}
                maxFontSizeMultiplier={1.2}
              >
                {day}
              </T>
            </View>
          );
        })}
      </View>
      <View style={styles.legend} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={[styles.mark, { backgroundColor: c.accent }]} />
        <T v="caption" color={c.textDim}>
          tried
        </T>
        <View style={[styles.mark, { borderWidth: 1.5, borderColor: c.textFaint, marginLeft: space.sm }]} />
        <T v="caption" color={c.textDim}>
          not today
        </T>
        <ThemedView style={[styles.legendBar, { backgroundColor: c.textFaint, marginLeft: space.sm }]} />
        <T v="caption" color={c.textDim}>
          starting days
        </T>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { position: 'absolute', width: 2.5, height: 2.5, borderRadius: 1.25 },
  camp: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  badge: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  here: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  scale: { flexDirection: 'row', gap: space.sm },
  step: { minHeight: 48, borderRadius: radius.md, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  strip: { flexDirection: 'row', justifyContent: 'space-between' },
  col: { alignItems: 'center', gap: 4, flex: 1 },
  barArea: { height: 60, justifyContent: 'flex-end' },
  bar: { width: 12, borderRadius: 4 },
  empty: { width: 12, height: 18, borderRadius: 4, borderWidth: 1.5, borderStyle: 'dashed' },
  mark: { width: 7, height: 7, borderRadius: 3.5 },
  num: { fontSize: 10, lineHeight: 12 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' },
  legendBar: { width: 8, height: 10, borderRadius: 2 },
});
