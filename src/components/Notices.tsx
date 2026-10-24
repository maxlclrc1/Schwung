import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { getHabit, habitTitle } from '../core/habits';
import type { Notice } from '../core/types';
import { haptic } from '../lib/haptics';
import { useApp } from '../store/useApp';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { T } from './ui';

function copy(n: Notice, title: (id: string) => string | undefined) {
  if (n.kind === 'phaseUp') {
    return {
      icon: 'trending-up' as const,
      head: n.phase === 2 ? 'Momentum begins' : 'Mastery begins',
      body:
        n.phase === 2
          ? 'Habits on the planned path stepped up one level today. Habits you added later or made yourself keep their own pace.'
          : 'Habits on the planned path took their next step today, toward their full version. Habits you added later or made yourself keep their own pace.',
    };
  }
  const names = n.habitIds.map(title).filter(Boolean) as string[];
  if (names.length > 1) {
    return {
      icon: 'leaf-outline' as const,
      head: 'Let’s ease in.',
      body: `${names.join(', ')} stepped down a level for now. Find your rhythm, then level them up again.`,
    };
  }
  return {
    icon: 'leaf-outline' as const,
    head: 'Let’s make this one easier for now.',
    body: `${names[0] ?? 'A habit'} stepped down a level. Build the rhythm back, then level it up again.`,
  };
}

export function Notices() {
  const { c } = useTheme();
  const notices = useApp((s) => s.notices);
  const plan = useApp((s) => s.plan);
  const dismiss = useApp((s) => s.dismissNotice);
  const title = (id: string) => {
    const h = plan.find((p) => p.habitId === id);
    return h ? habitTitle(h) : getHabit(id)?.title;
  };

  if (!notices.length) return null;
  return (
    <View style={{ gap: space.sm }}>
      {notices.map((n) => {
        const { icon, head, body } = copy(n, title);
        return (
          <ThemedView
            key={n.id}
            entering={FadeInDown}
            exiting={FadeOut}
            layout={LinearTransition}
            style={[styles.card, { backgroundColor: c.surface }]}
          >
            <Ionicons name={icon} size={22} color={c.accentInk} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <T v="bodyStrong">{head}</T>
              <T v="caption" color={c.textDim}>
                {body}
              </T>
            </View>
            <Pressable
              onPress={() => {
                haptic.tap();
                dismiss(n.id);
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Dismiss"
            >
              <Ionicons name="close" size={20} color={c.textFaint} />
            </Pressable>
          </ThemedView>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: space.md, padding: space.lg, borderRadius: radius.lg, alignItems: 'flex-start' },
});
