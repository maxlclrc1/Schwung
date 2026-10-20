import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { ProgressBar, Screen, T } from '../components/ui';
import type { Answers } from '../core/types';
import { haptic } from '../lib/haptics';
import { useApp } from '../store/useApp';
import { radius, space, useTheme } from '../theme';

type Question<K extends keyof Answers = keyof Answers> = {
  key: K;
  title: string;
  options: { value: Answers[K]; label: string }[];
};

const QUESTIONS: Question[] = [
  {
    key: 'sleep',
    title: 'How much do you sleep most nights?',
    options: [
      { value: '<6h', label: 'Less than 6 hours' },
      { value: '6-7h', label: '6–7 hours' },
      { value: '8h+', label: '8 hours or more' },
    ],
  },
  {
    key: 'screen',
    title: 'How much screen time do you have a day?',
    options: [
      { value: '<3h', label: 'Under 3 hours' },
      { value: '3-6h', label: '3–6 hours' },
      { value: '6h+', label: 'Over 6 hours' },
    ],
  },
  {
    key: 'exercise',
    title: 'How often do you exercise?',
    options: [
      { value: 'never', label: 'Rarely or never' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'regularly', label: 'Regularly' },
    ],
  },
  {
    key: 'water',
    title: 'How much water do you drink a day?',
    options: [
      { value: '<1L', label: 'Less than 1 liter' },
      { value: '1-2L', label: '1–2 liters' },
      { value: '2L+', label: 'More than 2 liters' },
    ],
  },
  {
    key: 'mind',
    title: 'Do you read, meditate, or journal?',
    options: [
      { value: 'never', label: 'Rarely or never' },
      { value: 'sometimes', label: 'Sometimes' },
      { value: 'regularly', label: 'Regularly' },
    ],
  },
  {
    key: 'goal',
    title: 'What do you want most right now?',
    options: [
      { value: 'energy', label: 'More energy' },
      { value: 'focus', label: 'Better focus' },
      { value: 'discipline', label: 'More discipline' },
      { value: 'confidence', label: 'More confidence' },
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
    }, 180);
  };

  const back = () => {
    haptic.tap();
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ProgressBar value={(step + 1) / QUESTIONS.length} />
        </View>
        <T v="caption" color={c.textDim} style={styles.count}>
          {step + 1}/{QUESTIONS.length}
        </T>
      </View>

      <Animated.View
        key={step}
        entering={SlideInRight.duration(220)}
        exiting={SlideOutLeft.duration(160)}
        style={styles.body}
      >
        <T v="title">{q.title}</T>
        <View style={styles.options}>
          {q.options.map((o) => {
            const selected = answers[q.key] === o.value;
            return (
              <Pressable
                key={o.value}
                onPress={() => choose(o.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: selected ? c.accentSoft : c.surface,
                    borderColor: selected ? c.accentInk : 'transparent',
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                <T v="bodyStrong">{o.label}</T>
                {selected ? (
                  <Animated.View entering={FadeIn.duration(120)}>
                    <Ionicons name="checkmark-circle" size={24} color={c.accentInk} />
                  </Animated.View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Animated.View>
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
  },
  back: { width: 32, height: 44, justifyContent: 'center' },
  count: { width: 32, textAlign: 'right', fontVariant: ['tabular-nums'] },
  body: { flex: 1, paddingHorizontal: space.xl, paddingTop: space.xxl, gap: space.xxl },
  options: { gap: space.md },
  option: {
    minHeight: 64,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
