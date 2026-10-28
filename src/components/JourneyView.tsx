import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { haptic } from '../lib/haptics';
import { Card, T } from './ui';
import { PROGRAM_DAYS } from '../core/dates';
import { dayQualifies, dayRatio, isFullDay, logForDay, PHASE_START } from '../core/progression';
import { useJourneySource } from './journeySource';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

const COLS = 7;
const PHASES = [
  { n: 1, from: 1, to: PHASE_START[2] - 1 },
  { n: 2, from: PHASE_START[2], to: PHASE_START[3] - 1 },
  { n: 3, from: PHASE_START[3], to: PROGRAM_DAYS },
];

/**
 * The 66 days, phase by phase, with the person's stats: the journey sheet, and the Journey tab's calendar. With
 * `onSelect`, each day is a button that picks it.
 */
export function JourneyView({
  picked,
  onSelect,
  bottomInset = 0,
}: {
  picked: number | null;
  onSelect?: (day: number) => void;
  bottomInset?: number;
}) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  // The shown program's days: the Life Reset's while it's on (testing builds), otherwise the program's.
  const source = useJourneySource();
  const { logs, start, today } = source;
  const stats = useMemo(
    () => [
      { n: source.stats.done, label: 'days done' },
      { n: source.stats.streak, label: 'streak' },
      { n: source.stats.best, label: 'best' },
    ],
    [source.stats],
  );

  const gap = 6;
  const cell = Math.floor((Math.min(width, 520) - space.xl * 2 - gap * (COLS - 1)) / COLS);

  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: space.xxl + bottomInset }]}>
      <Card style={styles.stats}>
        {stats.map((s) => (
          <View key={s.label} style={styles.stat}>
            <T v="title" style={{ fontVariant: ['tabular-nums'] }}>
              {s.n}
            </T>
            <T v="caption" color={c.textDim}>
              {s.label}
            </T>
          </View>
        ))}
      </Card>

      {PHASES.map((p) => (
        <View key={p.n} style={{ gap: space.sm }}>
          <T v="overline" color={c.textDim}>
            Phase {p.n} · Days {p.from}–{p.to}
          </T>
          <View style={[styles.grid, { gap }]}>
            {Array.from({ length: p.to - p.from + 1 }, (_, i) => {
              const day = p.from + i;
              const log = logForDay(logs, start, day);
              const future = day > today;
              const isToday = day === today;
              const isPicked = day === picked && !isToday;
              const full = isFullDay(log);
              const ok = dayQualifies(log);
              const ratio = dayRatio(log);
              const rest = !ok && !isToday && !future && !!source.rest?.(day);
              const bg = future || rest ? 'transparent' : full ? c.accent : ok ? c.accentSoft : c.surface;
              const fg = full ? c.onAccent : future ? c.textFaint : ok ? c.accentInk : c.textDim;
              const label = `Day ${day}${future ? '' : rest ? ', rest day' : `, ${Math.round(ratio * 100)}% done`}${isToday && onSelect ? ', today' : ''}${isPicked ? ', selected' : ''}`;
              const box = (
                <ThemedView
                  key={day}
                  accessibilityLabel={onSelect ? undefined : label}
                  style={[
                    styles.cell,
                    {
                      width: cell,
                      height: cell,
                      backgroundColor: bg,
                      borderColor: isToday
                        ? c.accentInk
                        : isPicked
                          ? c.text
                          : future || rest
                            ? c.border
                            : 'transparent',
                      borderWidth: isToday || isPicked ? 2 : 1,
                    },
                  ]}
                >
                  <T v="caption" color={fg} style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                    {day}
                  </T>
                  {!future && !ok && ratio > 0 ? (
                    <View style={[styles.partial, { backgroundColor: c.accentInk, width: `${ratio * 70}%` }]} />
                  ) : null}
                </ThemedView>
              );
              return onSelect ? (
                <Pressable
                  key={day}
                  onPress={() => {
                    haptic.tap();
                    onSelect(day);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: day === picked }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  {box}
                </Pressable>
              ) : (
                box
              );
            })}
          </View>
        </View>
      ))}

      <View style={styles.legend}>
        <Legend color={c.accent} label="All done" />
        <Legend color={c.accentSoft} label="80%+ (keeps streak)" />
        <Legend color={c.surface} label="Missed / partial" />
      </View>
    </ScrollView>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.legendItem}>
      <View
        style={{
          width: 12,
          height: 12,
          borderRadius: 4,
          backgroundColor: color,
          borderWidth: 1,
          borderColor: c.border,
        }}
      />
      <T v="caption" color={c.textDim}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  stats: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  partial: { position: 'absolute', bottom: 5, height: 2, borderRadius: 1 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
