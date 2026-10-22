import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOutLeft, LayoutAnimationConfig } from 'react-native-reanimated';
import { IconOrb } from '../components/Art';
import { ProgressBar, Screen, T } from '../components/ui';
import type { Answers } from '../core/types';
import { haptic } from '../lib/haptics';
import { useApp } from '../store/useApp';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

type IconName = keyof typeof Ionicons.glyphMap;

type Question<K extends keyof Answers = keyof Answers> = {
  key: K;
  icon: IconName;
  title: string;
  hint: string;
  options: { value: Answers[K]; label: string; icon?: IconName }[];
};

const QUESTIONS: Question[] = [
  {
    key: 'sleep',
    icon: 'moon',
    title: 'How much do you sleep most nights?',
    hint: 'Be honest. Nobody’s checking.',
    options: [
      { value: '<5h', label: 'Less than 5 hours' },
      { value: '5-6h', label: '5–6 hours' },
      { value: '6-7h', label: '6–7 hours' },
      { value: '7-8h', label: '7–8 hours' },
      { value: '8h+', label: '8 hours or more' },
    ],
  },
  {
    key: 'screen',
    icon: 'phone-portrait',
    title: 'How much screen time do you have a day?',
    hint: 'Your phone’s Screen Time settings know the real number.',
    options: [
      { value: '<2h', label: 'Under 2 hours' },
      { value: '2-4h', label: '2–4 hours' },
      { value: '4-6h', label: '4–6 hours' },
      { value: '6-8h', label: '6–8 hours' },
      { value: '8h+', label: 'More than 8 hours' },
    ],
  },
  {
    key: 'exercise',
    icon: 'barbell',
    title: 'How often do you work out or play sports?',
    hint: 'Walks count if they get your heart going.',
    options: [
      { value: 'never', label: 'Never' },
      { value: 'rarely', label: 'A few times a month' },
      { value: '1-2x', label: '1–2 times a week' },
      { value: '3-4x', label: '3–4 times a week' },
      { value: '5x+', label: '5+ times a week' },
    ],
  },
  {
    key: 'water',
    icon: 'water',
    title: 'How much water do you drink a day?',
    hint: 'A normal glass is about 0.25 liters.',
    options: [
      { value: '<0.5L', label: 'Less than 2 glasses' },
      { value: '0.5-1L', label: '2–4 glasses' },
      { value: '1-2L', label: '4–8 glasses' },
      { value: '2-3L', label: '8–12 glasses' },
      { value: '3L+', label: 'More than 12 glasses' },
    ],
  },
  {
    key: 'mind',
    icon: 'book',
    title: 'How often do you read, meditate, or journal?',
    hint: 'Any of the three counts.',
    options: [
      { value: 'never', label: 'Never' },
      { value: 'rarely', label: 'Rarely' },
      { value: 'weekly', label: 'About once a week' },
      { value: 'most-days', label: 'Most days' },
      { value: 'daily', label: 'Every day' },
    ],
  },
  {
    key: 'goal',
    icon: 'flag',
    title: 'What do you want most right now?',
    hint: 'Pick one. Your plan gets a habit built around it.',
    options: [
      { value: 'energy', label: 'More energy', icon: 'battery-charging' },
      { value: 'focus', label: 'Better focus', icon: 'locate' },
      { value: 'discipline', label: 'More discipline', icon: 'shield-checkmark' },
      { value: 'confidence', label: 'More confidence', icon: 'happy' },
      { value: 'calm', label: 'Less stress', icon: 'leaf' },
      { value: 'fitness', label: 'Get in shape', icon: 'fitness' },
    ],
  },
];

export default function Quiz() {
  const { c } = useTheme();
  const setAnswers = useApp((s) => s.setAnswers);
  const [step, setStep] = useState(0);
  const [answers, setLocal] = useState<Partial<Answers>>(() => useApp.getState().answers ?? {});
  const advancing = useRef(false);
  const q = QUESTIONS[step];

  const choose = (value: string) => {
    if (advancing.current) return;
    advancing.current = true;
    haptic.tap();
    const next = { ...answers, [q.key]: value };
    setLocal(next);
    // A beat to see the selection land before moving on.
    setTimeout(() => {
      advancing.current = false;
      if (step < QUESTIONS.length - 1) setStep(step + 1);
      else {
        setAnswers(next as Answers);
        router.push('/reveal');
      }
    }, 220);
  };

  const back = () => {
    haptic.tap();
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  return (
    <Screen>
      <ThemedView style={[styles.header, { backgroundColor: c.bg }]}>
        <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={(step + 1) / QUESTIONS.length} />
        </View>
        <T v="caption" color={c.textDim} style={styles.count}>
          {step + 1}/{QUESTIONS.length}
        </T>
      </ThemedView>

      <ScrollView style={styles.clip} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* The first question appears with the screen itself; only later ones animate in. */}
        <LayoutAnimationConfig skipEntering>
          <Animated.View
            key={step}
            entering={FadeInRight.duration(240)}
            exiting={FadeOutLeft.duration(140)}
            style={styles.body}
          >
            <View style={styles.art}>
              <IconOrb icon={q.icon} size={76} />
            </View>
            <View style={{ gap: space.sm }}>
              <T v="title">{q.title}</T>
              <T color={c.textDim}>{q.hint}</T>
            </View>
            <View style={styles.options}>
              {q.options.map((o) => {
                const selected = answers[q.key] === o.value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => choose(o.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                  >
                    <ThemedView
                      style={[
                        styles.option,
                        {
                          backgroundColor: selected ? c.accentSoft : c.surface,
                          borderColor: selected ? c.accentInk : 'transparent',
                        },
                      ]}
                    >
                      {o.icon ? <Ionicons name={o.icon} size={22} color={selected ? c.accentInk : c.textDim} /> : null}
                      <T v="bodyStrong" style={{ flex: 1 }}>
                        {o.label}
                      </T>
                      {selected ? (
                        <Animated.View entering={FadeIn.duration(120)}>
                          <Ionicons name="checkmark-circle" size={24} color={c.accentInk} />
                        </Animated.View>
                      ) : (
                        <ThemedView style={[styles.radio, { borderColor: c.border }]} />
                      )}
                    </ThemedView>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        </LayoutAnimationConfig>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    zIndex: 1,
  },
  back: { width: 32, height: 44, justifyContent: 'center' },
  count: { width: 32, textAlign: 'right', fontVariant: ['tabular-nums'] },
  clip: { flex: 1, overflow: 'hidden' },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xxl },
  body: { gap: space.xl },
  art: { alignItems: 'flex-start', marginLeft: -space.lg, marginBottom: -space.md },
  options: { gap: space.sm },
  option: {
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
});
