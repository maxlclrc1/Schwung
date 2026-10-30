import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import * as P from '../../core/reset/pilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { useTints } from '../onboarding/kit';
import { ProgressBar, T } from '../ui';
import { useT } from '../../i18n/react';
import { formatNumber } from '../../i18n';

/**
 * Insights with Keep My Momentum: how the last four weeks went, above the 66-day climb's own charts (which stay as
 * they were, so the original achievements are always there).
 */
export function RecentInsights({ program, today }: { program: P.PilotProgram; today: number }) {
  const { c } = useTheme();
  const tint = useTints();
  const t = useT();
  const recent = useMemo(() => P.recentDays80(program, today), [program, today]);
  const since = useMemo(() => P.sinceSummit(program, today), [program, today]);
  const share = recent.judged ? recent.counted / recent.judged : 0;
  return (
    <ThemedView
      style={[styles.panel, { backgroundColor: c.surface }]}
      accessible
      accessibilityLabel={t('beyond.recent.a11y', {
        counted: recent.counted,
        judged: recent.judged,
        since: since.counted,
        xp: since.xp,
      })}
    >
      <T v="overline" color={tint.sage.ink}>
        {t('beyond.recent.title')}
      </T>
      <View style={styles.row}>
        <T v="display" color={c.text}>
          {formatNumber(recent.counted)}
        </T>
        <T color={c.textDim} style={{ flex: 1 }}>
          {t('beyond.recent.counted', { count: recent.judged })}
        </T>
      </View>
      <ProgressBar value={share} height={6} color={tint.sage.fill} />
      <T v="caption" color={c.textDim}>
        {t('beyond.recent.since', { counted: since.counted, best: since.best, xp: since.xp })}
      </T>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
});
