import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { LANDMARKS } from '../core/ascent';
import type { DayCell } from '../core/charts';
import { space, useTheme } from '../theme';
import { T } from './ui';
import { formatNumber } from '../i18n';
import { useT } from '../i18n/react';
import { useOnArt } from './onArt';
import { CHAPTERS, ChapterTrail } from './journey/ChapterTrail';

/*
 * Below the mountain on Journey: the climb in one line (the days completed and the next milestone), then the 66 days
 * as one expedition: Foundation, Momentum and Mastery, each a trail on its own contour map (journey/ChapterTrail),
 * each leaving its map where the next one enters. Every mark comes from the program's own saved days
 * (reset/charts.ts dayCells: each day judged on the habits it actually had, weekly schedules and habits added or
 * removed included). Nothing here is estimated.
 */

const MILESTONES = Object.keys(LANDMARKS).map(Number);

/**
 * The climb in one quiet line above the trail: the complete days so far and the days to the next milestone, from the
 * journey's own count. On Day 66 it's summit day until the day is complete (summitReached), then the summit.
 */
export const JourneyStats = memo(function JourneyStats({
  today,
  completed,
  summit,
}: {
  today: number;
  completed: number;
  /** The 66 days are done (reset/pilot summitReached). */
  summit: boolean;
}) {
  const { c } = useTheme();
  const onArt = useOnArt();
  const t = useT();
  const next = MILESTONES.find((d) => d > today);
  const unit = t('journeyTab.summary.complete', { count: completed });
  const toNext = next
    ? t('journeyTab.summary.toNext', { name: LANDMARKS[next].name })
    : summit
      ? t('journeyTab.summary.reached')
      : t('journeyTab.summary.summitDay');
  return (
    <View style={styles.stats}>
      <Stat value={formatNumber(completed)} unit={unit} />
      {next ? (
        <Stat value={formatNumber(next - today)} unit={toNext} />
      ) : (
        <T v="label" color={onArt.ink ?? c.textDim} style={onArt.style}>
          {toNext}
        </T>
      )}
    </View>
  );
});

function Stat({ value, unit }: { value: string; unit: string }) {
  const { c } = useTheme();
  const onArt = useOnArt();
  const t = useT();
  return (
    <T
      v="label"
      color={onArt.ink ?? c.textDim}
      style={onArt.style}
      accessibilityLabel={t('journeyTab.summary.a11y', { value, unit })}
      maxFontSizeMultiplier={1.4}
    >
      <T style={[styles.statValue, { color: c.text }]}>{value}</T> {unit}
    </T>
  );
}

/** The 66 days, chapter by chapter. Tap a day for its entry under that chapter's trail. */
export const ExpeditionCalendar = memo(function ExpeditionCalendar({
  cells,
  today,
  selected,
  onSelect,
  onOpen,
  name,
}: {
  cells: DayCell[];
  today: number;
  selected: number;
  onSelect: (day: number) => void;
  /** Opens a day's full detail (from a trail's entry). */
  onOpen: (day: number) => void;
  name: (id: string) => string;
}) {
  return (
    <View style={styles.calendar}>
      {CHAPTERS.map((chapter) => (
        <ChapterTrail
          key={chapter.n}
          chapter={chapter}
          cells={cells}
          today={today}
          selected={selected}
          onSelect={onSelect}
          onOpen={onOpen}
          name={name}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 18, rowGap: 4 },
  statValue: { fontSize: 20, lineHeight: 24, fontWeight: '700', fontVariant: ['tabular-nums'] },
  calendar: { gap: space.xl },
});
