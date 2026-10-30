import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import * as P from '../../core/reset/pilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { useTints } from '../onboarding/kit';
import { ProgressBar, T } from '../ui';

/**
 * Insights with Keep My Momentum: how the last four weeks went, above the 66-day climb's own charts (which stay as
 * they were, so the original achievements are always there).
 */
export function RecentInsights({ program, today }: { program: P.PilotProgram; today: number }) {
  const { c } = useTheme();
  const t = useTints();
  const recent = useMemo(() => P.recentDays80(program, today), [program, today]);
  const since = useMemo(() => P.sinceSummit(program, today), [program, today]);
  const share = recent.judged ? recent.counted / recent.judged : 0;
  return (
    <ThemedView
      style={[styles.panel, { backgroundColor: c.surface }]}
      accessible
      accessibilityLabel={`Lately, the last four weeks: ${recent.counted} of ${recent.judged} days counted. Since the summit: ${since.counted} days counted and ${since.xp} XP.`}
    >
      <T v="overline" color={t.sage.ink}>
        Lately · the last four weeks
      </T>
      <View style={styles.row}>
        <T v="display" color={c.text}>
          {recent.counted}
        </T>
        <T color={c.textDim} style={{ flex: 1 }}>
          of {recent.judged} {recent.judged === 1 ? 'day' : 'days'} counted
        </T>
      </View>
      <ProgressBar value={share} height={6} color={t.sage.fill} />
      <T v="caption" color={c.textDim}>
        Since the summit: {since.counted} {since.counted === 1 ? 'day' : 'days'} counted · best run {since.best} ·{' '}
        {since.xp} XP. The charts below are your 66-day climb.
      </T>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
});
