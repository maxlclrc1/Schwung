import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import type * as P from '../../core/reset/pilot';
import { ANSWER_WORDS, lastFinishedWeek, reflectionDays } from '../../core/reset/reflections';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Press } from '../onboarding/Choices';
import { T } from '../ui';

/** Journey: each finished week's reflection (tap to open it again), or the way to reflect on one not answered. */
export function ReflectionHistory({ program, today }: { program: P.PilotProgram; today: number }) {
  const { c } = useTheme();
  const weeks = Array.from({ length: lastFinishedWeek(today) }, (_, i) => i + 1);
  const color = { easier: c.sage, right: c.mist, harder: c.peach } as const;
  return (
    <View style={{ gap: space.sm }}>
      <T v="overline" color={c.textDim}>
        Weekly reflections
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
                accessibilityLabel={`Week ${w}, days ${from} to ${to}: ${r?.answer ? ANSWER_WORDS[r.answer] : 'not reflected on yet'}${r?.changed?.length ? `, ${r.changed.length} target changed` : ''}`}
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
                    <T v="bodyStrong">Week {w}</T>
                    <T v="caption" color={c.textDim}>
                      Days {from}–{to}
                      {r?.changed?.length
                        ? ` · ${r.changed.length} target${r.changed.length === 1 ? '' : 's'} changed`
                        : ''}
                    </T>
                  </View>
                  <T v="caption" color={r?.answer ? c.text : c.accentInk} style={{ fontWeight: '700' }}>
                    {r?.answer ? ANSWER_WORDS[r.answer] : 'Reflect'}
                  </T>
                  <Ionicons name="chevron-forward" size={14} color={c.textFaint} />
                </View>
              </Press>
            );
          })
        ) : (
          <T v="caption" color={c.textDim}>
            Your first reflection comes after Day 7: a quick check-in on how your habits felt.
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
