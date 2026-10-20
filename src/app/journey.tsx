import { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SheetHeader } from '../components/SheetHeader';
import { Card, Screen, T } from '../components/ui';
import { PROGRAM_DAYS } from '../core/dates';
import {
  bestStreak,
  currentStreak,
  dayQualifies,
  dayRatio,
  daysCompleted,
  isFullDay,
  logForDay,
  PHASE_START,
} from '../core/progression';
import { currentDay, useApp } from '../store/useApp';
import { radius, space, useTheme } from '../theme';

const COLS = 7;
const PHASES = [
  { n: 1, from: 1, to: PHASE_START[2] - 1 },
  { n: 2, from: PHASE_START[2], to: PHASE_START[3] - 1 },
  { n: 3, from: PHASE_START[3], to: PROGRAM_DAYS },
];

export default function Journey() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const logs = useApp((s) => s.logs);
  const startedAt = useApp((s) => s.startedAt);
  const offset = useApp((s) => s.devDayOffset);
  const today = currentDay({ startedAt, devDayOffset: offset });
  const start = startedAt ?? '';

  const stats = useMemo(
    () => [
      { n: daysCompleted(logs, start, today), label: 'days done' },
      { n: currentStreak(logs, start, today), label: 'streak' },
      { n: bestStreak(logs, start, today), label: 'best' },
    ],
    [logs, start, today],
  );

  const gap = 6;
  const cell = Math.floor((Math.min(width, 520) - space.xl * 2 - gap * (COLS - 1)) / COLS);

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Your 66 days" />
      <ScrollView contentContainerStyle={styles.scroll}>
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
                const full = isFullDay(log);
                const ok = dayQualifies(log);
                const ratio = dayRatio(log);
                const bg = future ? 'transparent' : full ? c.accent : ok ? c.accentSoft : c.surface;
                const fg = full ? c.onAccent : future ? c.textFaint : ok ? c.accentInk : c.textDim;
                return (
                  <View
                    key={day}
                    accessibilityLabel={`Day ${day}${future ? '' : `, ${Math.round(ratio * 100)}% done`}`}
                    style={[
                      styles.cell,
                      {
                        width: cell,
                        height: cell,
                        backgroundColor: bg,
                        borderColor: isToday ? c.accentInk : future ? c.border : 'transparent',
                        borderWidth: isToday ? 2 : 1,
                      },
                    ]}
                  >
                    <T v="caption" color={fg} style={{ fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                      {day}
                    </T>
                    {!future && !ok && ratio > 0 ? (
                      <View style={[styles.partial, { backgroundColor: c.accentInk, width: `${ratio * 70}%` }]} />
                    ) : null}
                  </View>
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
    </Screen>
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
