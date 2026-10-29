import { useEffect, type ReactNode } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { SettingsButton } from './HeaderButton';
import { ThemeToggle } from './ThemeToggle';
import { T } from './ui';
import { SCREEN_PX, worldAnchor } from './WorldLayer';
import { LAKESIDE_BAND_TOP, TILE_HEIGHT } from './worldTiles';

/*
 * Insights (the third tab, at the lakeside camp of the shared world): the main numbers at a glance, then each habit,
 * quietly. Everything comes from saved days (reset/pilot.ts, reset/charts.ts); nothing is estimated.
 * A window near the top shows the lakeside band; like Habits, the world stays still while the page scrolls (so the
 * painting's lower edge stays hidden behind the tab bar).
 */

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
        <ThemeToggle />
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
              ? { backgroundColor: c.sage }
              : d.state === 'missed' || d.state === 'skipped'
                ? { borderWidth: 1.5, borderColor: c.textFaint }
                : d.state === 'today'
                  ? { borderWidth: 1.5, borderColor: c.mistInk }
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
                {
                  backgroundColor: w.credited >= w.goal ? c.sage : c.mist,
                  height: `${Math.min(1, w.credited / w.goal) * 100}%`,
                },
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

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.lg, paddingBottom: space.xxxl, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  strip: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  mark: { width: 12, height: 12, borderRadius: 6 },
  bars: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  barCol: { alignItems: 'center', gap: 4 },
  bar: { width: 14, height: 40, borderRadius: 4, overflow: 'hidden', justifyContent: 'flex-end' },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 10, lineHeight: 12, fontVariant: ['tabular-nums'] },
});
