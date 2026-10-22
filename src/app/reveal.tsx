import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Screen, T } from '../components/ui';
import { LANDMARKS } from '../core/ascent';
import { GROWTH_NOTES, phasePreview } from '../core/onboarding';
import { buildPlan, GOAL_LABEL } from '../core/plan';
import { haptic } from '../lib/haptics';
import { useApp } from '../store/useApp';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

export default function Reveal() {
  const { c } = useTheme();
  const answers = useApp((s) => s.answers);
  const startProgram = useApp((s) => s.startProgram);
  // Exactly the plan startProgram creates: both come from buildPlan on the same saved answers.
  const picks = useMemo(() => (answers ? buildPlan(answers) : []), [answers]);
  const growth = useMemo(() => (picks.length ? phasePreview(picks) : null), [picks]);

  const begin = () => {
    // A program that's already running is never replaced from here; just carry on to it.
    if (!startProgram()) {
      if (router.canDismiss()) router.dismissAll();
      router.replace('/today');
      return;
    }
    haptic.success();
    router.replace('/reminder');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.duration(400)} style={{ gap: space.sm }}>
          <T v="overline" color={c.accentInk}>
            {answers ? `Your plan · Built for ${GOAL_LABEL[answers.goal]}` : 'Your plan'}
          </T>
          <T v="title" accessibilityRole="header">
            {picks.length} habits. Starting where you are.
          </T>
          <T color={c.textDim}>
            Each one starts at your level and grows with you. Swap, edit, or add habits anytime from Today.
          </T>
        </Animated.View>

        <View style={styles.list}>
          {picks.map(({ habit: h, level, reason, forGoal }, i) => (
            <Animated.View
              key={h.id}
              entering={FadeInDown.delay(150 + i * 90).duration(400)}
              style={[styles.item, { backgroundColor: c.surface }]}
              accessible
              accessibilityLabel={`${h.levels[level]}.${forGoal ? ' For your goal.' : ''} ${reason}`}
            >
              <ThemedView style={[styles.num, { backgroundColor: c.accentSoft }]}>
                <Ionicons name={h.icon as keyof typeof Ionicons.glyphMap} size={20} color={c.accentInk} />
              </ThemedView>
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{h.levels[level]}</T>
                <T v="caption" color={c.textDim}>
                  {reason}
                </T>
                {forGoal ? (
                  <ThemedView style={[styles.tag, { backgroundColor: c.accentSoft }]}>
                    <T v="caption" color={c.accentInk} style={styles.tagText} maxFontSizeMultiplier={1.3}>
                      For your goal
                    </T>
                  </ThemedView>
                ) : null}
              </View>
            </Animated.View>
          ))}
        </View>

        {growth ? (
          <Animated.View entering={FadeInDown.delay(250 + picks.length * 90).duration(400)} style={styles.growth}>
            <View style={{ gap: space.xs }}>
              <T v="overline" color={c.textDim}>
                How it grows
              </T>
              <T v="heading" accessibilityRole="header">
                Three phases, one level at a time.
              </T>
              <T v="caption" color={c.textDim}>
                For example, {growth.habitTitle.toLowerCase()}:
              </T>
            </View>
            <ThemedView style={[styles.phases, { backgroundColor: c.surface }]}>
              {growth.steps.map((p, i) => {
                const mark = LANDMARKS[p.to];
                const summit = i === growth.steps.length - 1;
                return (
                  <View
                    key={p.name}
                    style={styles.phase}
                    accessible
                    accessibilityLabel={`${p.name}, days ${p.from} to ${p.to}. ${p.text}. ${p.about}`}
                  >
                    <View style={styles.phaseRail}>
                      <ThemedView
                        style={[styles.badge, { borderColor: summit ? c.gold : c.accentInk, backgroundColor: c.bg }]}
                      >
                        <Ionicons name={mark.icon} size={13} color={summit ? c.gold : c.accentInk} />
                      </ThemedView>
                      {summit ? null : <ThemedView style={[styles.rail, { backgroundColor: c.border }]} />}
                    </View>
                    <View style={[styles.phaseText, summit && styles.phaseTextLast]}>
                      <T v="overline" color={c.accentInk} maxFontSizeMultiplier={1.3}>
                        {p.name} · Days {p.from}–{p.to}
                      </T>
                      <T v="bodyStrong">{p.text}</T>
                      <T v="caption" color={c.textDim}>
                        {p.about}
                      </T>
                    </View>
                  </View>
                );
              })}
            </ThemedView>
            <View style={{ gap: space.xs }}>
              {GROWTH_NOTES.map((n) => (
                <T key={n} v="caption" color={c.textDim}>
                  {n}
                </T>
              ))}
            </View>
          </Animated.View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button label="Begin with this plan" onPress={begin} disabled={!picks.length} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.xl, gap: space.xl },
  list: { gap: space.md },
  item: { flexDirection: 'row', gap: space.lg, padding: space.lg, borderRadius: radius.lg, alignItems: 'flex-start' },
  num: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  tagText: { fontWeight: '700' },
  growth: { gap: space.md },
  phases: { borderRadius: radius.lg, padding: space.lg },
  phase: { flexDirection: 'row', gap: space.md },
  phaseRail: { alignItems: 'center', width: 26 },
  badge: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  rail: { width: 2, flex: 1, minHeight: space.md, marginVertical: 4, borderRadius: 1 },
  phaseText: { flex: 1, gap: 2, paddingBottom: space.lg },
  phaseTextLast: { paddingBottom: 0 },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.md, paddingTop: space.sm },
});
