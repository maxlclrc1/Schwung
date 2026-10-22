import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Screen, T } from '../components/ui';
import { buildPlan } from '../core/plan';
import { haptic } from '../lib/haptics';
import { useApp } from '../store/useApp';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

export default function Reveal() {
  const { c } = useTheme();
  const answers = useApp((s) => s.answers);
  const startProgram = useApp((s) => s.startProgram);
  const picks = useMemo(() => (answers ? buildPlan(answers) : []), [answers]);

  const begin = () => {
    startProgram();
    haptic.success();
    router.replace('/reminder');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.duration(400)} style={{ gap: space.sm }}>
          <T v="overline" color={c.accentInk}>
            Your plan
          </T>
          <T v="title">{picks.length} habits. Starting where you are.</T>
          <T color={c.textDim}>Each one levels up as you do. You can swap, edit, or add your own anytime.</T>
        </Animated.View>

        <View style={styles.list}>
          {picks.map(({ habit: h, level, reason }, i) => (
            <Animated.View
              key={h.id}
              entering={FadeInDown.delay(150 + i * 90).duration(400)}
              style={[styles.item, { backgroundColor: c.surface }]}
            >
              <ThemedView style={[styles.num, { backgroundColor: c.accentSoft }]}>
                <Ionicons name={h.icon as keyof typeof Ionicons.glyphMap} size={20} color={c.accentInk} />
              </ThemedView>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{h.levels[level]}</T>
                <T v="caption" color={c.textDim}>
                  {reason}
                </T>
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <Button label="Begin Day 1" onPress={begin} disabled={!picks.length} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.xl, gap: space.xl },
  list: { gap: space.md },
  item: { flexDirection: 'row', gap: space.lg, padding: space.lg, borderRadius: radius.lg, alignItems: 'flex-start' },
  num: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.md, paddingTop: space.sm },
});
