import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type * as P from '../../core/reset/pilot';
import { ANSWER_WORDS, lastFinishedWeek, reflectionDays } from '../../core/reset/reflections';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Press } from '../onboarding/Choices';
import { T } from '../ui';
import { useT } from '../../i18n/react';

/** Journey: each finished week's reflection (tap to open it again), or the way to reflect on one not answered. */
export function ReflectionHistory({ program, today }: { program: P.PilotProgram; today: number }) {
  const { c } = useTheme();
  const t = useT();
  const weeks = Array.from({ length: lastFinishedWeek(today) }, (_, i) => i + 1);
  const color = { easier: c.sage, right: c.mist, harder: c.peach } as const;
  return (
    <View style={{ gap: space.sm }}>
      <T v="overline" color={c.textDim}>
        {t('reflection.history.title')}
      </T>
      <ThemedView style={[styles.panel, { backgroundColor: c.surface }]}>
        {weeks.length ? (
          weeks.map((w, i) => {
            const r = program.reflections?.[w];
            const { from, to } = reflectionDays(w);
            return (
              <Press
                key={w}
                onPress={() => router.push(`/life-reset/reflect?week=${w}`)}
                accessibilityRole="button"
                accessibilityLabel={`${t('reflection.history.row', {
                  week: w,
                  from,
                  to,
                  answer: r?.answer ? ANSWER_WORDS[r.answer] : t('reflection.history.notYet'),
                })}${r?.changed?.length ? t('reflection.history.rowChanged', { count: r.changed.length }) : ''}`}
              >
                <View
                  style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border }]}
                >
                  <View
                    style={[
                      styles.dot,
                      {
                        backgroundColor: r?.answer ? color[r.answer] : 'transparent',
                        borderColor: r?.answer ? color[r.answer] : c.border,
                      },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <T v="bodyStrong">{t('reflection.history.week', { week: w })}</T>
                    <T v="caption" color={c.textDim}>
                      {t('reflection.history.days', { from, to })}
                      {r?.changed?.length ? t('reflection.history.changed', { count: r.changed.length }) : ''}
                    </T>
                  </View>
                  <T v="caption" color={r?.answer ? c.text : c.accentInk} style={{ fontWeight: '700' }}>
                    {r?.answer ? ANSWER_WORDS[r.answer] : t('reflection.history.reflect')}
                  </T>
                  <Ionicons name="chevron-forward" size={14} color={c.textFaint} />
                </View>
              </Press>
            );
          })
        ) : (
          <T v="caption" color={c.textDim}>
            {t('reflection.history.first')}
          </T>
        )}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.sm },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
});
