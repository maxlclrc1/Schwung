import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ASCENT_PHASES } from '../core/ascent';
import { dayQualifies, dayRatio, isFullDay, logForDay } from '../core/progression';
import type { DayLog } from '../core/types';
import { haptic } from '../lib/haptics';
import { space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { T } from './ui';

const GAP = 2;
/** The longest phase, so every row shares one cell width. */
const MAX_PER_ROW = Math.max(...ASCENT_PHASES.map((p) => p.to - p.from + 1));

/**
 * The 66 days at a glance, one row per phase: the journey's day grid, compact enough to sit above the mountain.
 * Same states and colors as the full grid: all done, 80%+ (keeps the streak), missed or partial, today, ahead.
 * Each day is a button that selects it.
 */
export function JourneyCalendar({
  logs,
  start,
  today,
  selected,
  onSelect,
  inset,
}: {
  logs: Record<string, DayLog>;
  start: string;
  today: number;
  selected: number | null;
  onSelect: (day: number) => void;
  /** Horizontal space taken around the calendar (screen padding plus card padding), for sizing the cells. */
  inset: number;
}) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const cell = Math.floor((Math.min(width, 520) - inset - GAP * (MAX_PER_ROW - 1)) / MAX_PER_ROW);

  return (
    <View style={styles.wrap}>
      {ASCENT_PHASES.map((p) => (
        <View key={p.n} style={styles.phase}>
          <T v="caption" color={c.textDim} maxFontSizeMultiplier={1.3} style={styles.phaseName}>
            {p.name} · {p.from}–{p.to}
          </T>
          <View style={[styles.row, { gap: GAP }]}>
            {Array.from({ length: p.to - p.from + 1 }, (_, i) => {
              const day = p.from + i;
              const log = logForDay(logs, start, day);
              const future = day > today;
              const isToday = day === today;
              const isSelected = day === selected && !isToday;
              const full = isFullDay(log);
              const ok = dayQualifies(log);
              const ratio = dayRatio(log);
              const bg = future ? 'transparent' : full ? c.accent : ok ? c.accentSoft : c.surfaceHigh;
              return (
                <Pressable
                  key={day}
                  onPress={() => {
                    haptic.tap();
                    onSelect(day);
                  }}
                  hitSlop={{ top: 4, bottom: 4 }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: day === selected }}
                  accessibilityLabel={`Day ${day}${future ? ', still ahead' : `, ${Math.round(ratio * 100)}% done`}${isToday ? ', today' : ''}`}
                >
                  <ThemedView
                    style={[
                      styles.cell,
                      {
                        width: cell,
                        backgroundColor: bg,
                        // 80%+ days get a thin accent edge, so they stay distinct from missed days in dark mode.
                        borderColor: isToday
                          ? c.accentInk
                          : isSelected
                            ? c.text
                            : future
                              ? c.border
                              : ok && !full
                                ? c.accentInk
                                : 'transparent',
                        borderWidth: isToday || isSelected ? 2 : 1,
                      },
                    ]}
                  >
                    {!future && !ok && ratio > 0 ? (
                      <View style={[styles.partial, { backgroundColor: c.accentInk, height: `${ratio * 70}%` }]} />
                    ) : null}
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <View style={styles.legend}>
        <Legend color={c.accent} label="All done" />
        <Legend color={c.accentSoft} edge={c.accentInk} label="80%+" />
        <Legend color={c.surfaceHigh} label="Missed / partial" />
      </View>
    </View>
  );
}

function Legend({ color, edge, label }: { color: string; edge?: string; label: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color, borderColor: edge ?? c.border }]} />
      <T v="caption" color={c.textDim} maxFontSizeMultiplier={1.3}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  phase: { gap: 3 },
  phaseName: { fontSize: 11, lineHeight: 14, fontWeight: '600' },
  row: { flexDirection: 'row' },
  cell: { height: 18, borderRadius: 4, justifyContent: 'flex-end', alignItems: 'center', overflow: 'hidden' },
  partial: { position: 'absolute', bottom: 2, width: 2, borderRadius: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  swatch: { width: 10, height: 10, borderRadius: 3, borderWidth: 1 },
});
