import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Screen, T } from '../components/ui';
import { OnboardingBackdrop } from '../components/World';
import { ANSWER_LABEL, GOAL_DETAIL } from '../core/answers';
import { AREA_ICON, startingPoint } from '../core/onboarding';
import { buildPlan, GOAL_LABEL } from '../core/plan';
import { haptic } from '../lib/haptics';
import { v2ForNewPrograms } from '../lib/flags';
import { useApp } from '../store/useApp';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

type IconName = keyof typeof Ionicons.glyphMap;

/** Where the user is starting from: their goal, the area with most room to grow, and what already works. */
export default function Start() {
  const { c } = useTheme();
  const answers = useApp((s) => s.answers);
  const started = useApp((s) => s.startedAt !== null);
  const point = useMemo(() => (answers ? startingPoint(answers, buildPlan(answers)) : null), [answers]);

  if (started) return <Redirect href="/today" />;
  // A channel that starts new programs on V2 never shows the V1 onboarding (lib/flags).
  if (v2ForNewPrograms()) return <Redirect href="/v2/quiz" />;
  if (!answers || !point) return <Redirect href="/quiz" />;
  const { lever, working } = point;
  const enter = (i: number) => FadeInDown.delay(80 + i * 110).duration(420);

  return (
    <Screen backdrop={<OnboardingBackdrop />}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            haptic.tap();
            router.back();
          }}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.back}
        >
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View entering={enter(0)} style={{ gap: space.sm }}>
          <T v="overline" color={c.accentInk} maxFontSizeMultiplier={1.3}>
            Your starting point
          </T>
          <T v="title" accessibilityRole="header">
            Here’s where you’re starting.
          </T>
        </Animated.View>

        <Animated.View entering={enter(1)}>
          <Block
            icon={GOAL_DETAIL[answers.goal].icon as IconName}
            label="Your goal"
            title={ANSWER_LABEL.goal[answers.goal]}
            body="Every habit in your plan has a reason, and at least one is there just for this."
          />
        </Animated.View>

        <Animated.View entering={enter(2)}>
          {lever ? (
            <Block
              icon={AREA_ICON[lever.area] as IconName}
              label="Most room to grow"
              title={lever.title}
              body={`You answered “${lever.answer}”. In your plan: ${lever.task}.`}
              highlight
            />
          ) : (
            <Block
              icon="sparkles"
              label="Most room to grow"
              title="Your basics are strong."
              body={`So this plan is all about ${GOAL_LABEL[answers.goal]}.`}
              highlight
            />
          )}
        </Animated.View>

        {working.length ? (
          <Animated.View entering={enter(3)}>
            <ThemedView
              style={[styles.block, { backgroundColor: c.surface }]}
              accessible
              accessibilityLabel={`Already working: ${working.map((w) => w.text).join(', ')}.`}
            >
              <T v="overline" color={c.textDim} maxFontSizeMultiplier={1.3}>
                Already working
              </T>
              <View style={{ gap: space.sm, marginTop: space.xs }}>
                {working.map((w) => (
                  <View key={w.area} style={styles.workingRow}>
                    <Ionicons name="checkmark-circle" size={20} color={c.accentInk} />
                    <T style={{ flex: 1 }}>{w.text}</T>
                  </View>
                ))}
              </View>
            </ThemedView>
          </Animated.View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button label="See my plan" onPress={() => router.push('/reveal')} />
      </View>
    </Screen>
  );
}

function Block({
  icon,
  label,
  title,
  body,
  highlight,
}: {
  icon: IconName;
  label: string;
  title: string;
  body: string;
  highlight?: boolean;
}) {
  const { c } = useTheme();
  return (
    <ThemedView
      style={[
        styles.block,
        styles.blockRow,
        { backgroundColor: c.surface, borderColor: highlight ? c.accentInk : 'transparent' },
      ]}
      accessible
      accessibilityLabel={`${label}: ${title}. ${body}`}
    >
      <ThemedView style={[styles.orb, { backgroundColor: c.accentSoft }]}>
        <Ionicons name={icon} size={22} color={c.accentInk} />
      </ThemedView>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="overline" color={c.textDim} maxFontSizeMultiplier={1.3}>
          {label}
        </T>
        <T v="heading">{title}</T>
        <T v="caption" color={c.textDim}>
          {body}
        </T>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingTop: space.sm },
  back: { width: 32, height: 44, justifyContent: 'center' },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xl, gap: space.lg },
  block: { borderRadius: radius.lg, padding: space.lg, borderWidth: 1.5, borderColor: 'transparent' },
  blockRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  orb: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  workingRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.md, paddingTop: space.sm },
});
