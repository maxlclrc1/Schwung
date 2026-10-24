import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOutLeft, LayoutAnimationConfig } from 'react-native-reanimated';
import { IconOrb } from '../components/Art';
import { TrailProgress } from '../components/TrailProgress';
import { Button, Screen, T } from '../components/ui';
import { OnboardingBackdrop } from '../components/World';
import { ANSWER_LABEL, GOAL_DETAIL } from '../core/answers';
import { ANSWER_VALUES, type Answers } from '../core/types';
import { haptic } from '../lib/haptics';
import { useScreenReader } from '../lib/useScreenReader';
import { v2ForNewPrograms } from '../lib/flags';
import { useApp } from '../store/useApp';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

type IconName = keyof typeof Ionicons.glyphMap;

type Question<K extends keyof Answers = keyof Answers> = {
  key: K;
  icon: IconName;
  section: string;
  title: string;
  hint: string;
  options: { value: Answers[K]; label: string; sub?: string; icon?: IconName }[];
};

const options = <K extends keyof Answers>(key: K) =>
  (Object.keys(ANSWER_LABEL[key]) as Answers[K][]).map((value) => ({
    value,
    label: (ANSWER_LABEL[key] as Record<string, string>)[value],
  }));

const NOW = 'Where you are now';

// The goal comes first, so every other answer is given with it in mind.
const QUESTIONS: Question[] = [
  {
    key: 'goal',
    icon: 'flag',
    section: 'Where you’re headed',
    title: 'What do you want most right now?',
    hint: 'Pick one. Your plan is built around it.',
    options: ANSWER_VALUES.goal.map((value) => ({
      value,
      label: ANSWER_LABEL.goal[value],
      sub: GOAL_DETAIL[value].sub,
      icon: GOAL_DETAIL[value].icon as IconName,
    })),
  },
  {
    key: 'sleep',
    icon: 'moon',
    section: NOW,
    title: 'How much do you sleep most nights?',
    hint: 'Most nights, not your best ones.',
    options: options('sleep'),
  },
  {
    key: 'screen',
    icon: 'phone-portrait',
    section: NOW,
    title: 'How much screen time do you have a day?',
    hint: 'Screen Time in your phone’s Settings has the real number.',
    options: options('screen'),
  },
  {
    key: 'exercise',
    icon: 'barbell',
    section: NOW,
    title: 'How often do you work out or play sports?',
    hint: 'Walks count if they get your heart going.',
    options: options('exercise'),
  },
  {
    key: 'water',
    icon: 'water',
    section: NOW,
    title: 'How much water do you drink a day?',
    hint: 'A normal glass is about 250 ml.',
    options: options('water'),
  },
  {
    key: 'mind',
    icon: 'book',
    section: NOW,
    title: 'How often do you read, meditate, or journal?',
    hint: 'Any of the three counts.',
    options: options('mind'),
  },
];

export default function Quiz() {
  const { c } = useTheme();
  const setAnswers = useApp((s) => s.setAnswers);
  const started = useApp((s) => s.startedAt !== null);
  const screenReader = useScreenReader();
  const [step, setStep] = useState(0);
  const [answers, setLocal] = useState<Partial<Answers>>(() => useApp.getState().answers ?? {});
  const advancing = useRef(false);
  const q = QUESTIONS[step];

  // A running program is never re-onboarded (e.g. by navigating back); Settings → Restart is the way.
  if (started) return <Redirect href="/today" />;
  // A channel that starts new programs on V2 never shows the V1 onboarding (lib/flags).
  if (v2ForNewPrograms()) return <Redirect href="/v2/quiz" />;

  const advance = (next: Partial<Answers>) => {
    if (step < QUESTIONS.length - 1) setStep(step + 1);
    else {
      setAnswers(next as Answers);
      router.push('/start');
    }
  };

  const choose = (value: string) => {
    if (advancing.current) return;
    haptic.tap();
    const next = { ...answers, [q.key]: value };
    setLocal(next);
    // With a screen reader on, moving on by itself would pull focus away mid-announcement;
    // the selection is read out and a Continue button takes them on.
    if (screenReader) return;
    advancing.current = true;
    // A beat to see the selection land before moving on.
    setTimeout(() => {
      advancing.current = false;
      advance(next);
    }, 220);
  };

  const back = () => {
    haptic.tap();
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  const answered = answers[q.key] !== undefined;

  return (
    <Screen backdrop={<OnboardingBackdrop />}>
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <TrailProgress step={step} total={QUESTIONS.length} />
        </View>
        <View style={styles.back} />
      </View>

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
              <T v="overline" color={c.accentInk} maxFontSizeMultiplier={1.3}>
                {q.section}
              </T>
              <T v="title" accessibilityRole="header">
                {q.title}
              </T>
              <T color={c.textDim}>{q.hint}</T>
            </View>
            <View style={styles.options} accessibilityRole="radiogroup">
              {q.options.map((o) => {
                const selected = answers[q.key] === o.value;
                return (
                  <Pressable
                    key={o.value}
                    onPress={() => choose(o.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    accessibilityLabel={o.sub ? `${o.label}. ${o.sub}` : o.label}
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
                      <View style={styles.optionText}>
                        <T v="bodyStrong">{o.label}</T>
                        {o.sub ? (
                          <T v="caption" color={c.textDim}>
                            {o.sub}
                          </T>
                        ) : null}
                      </View>
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
      {screenReader ? (
        <View style={styles.footer}>
          <Button
            label={step < QUESTIONS.length - 1 ? 'Continue' : 'See where I’m starting'}
            disabled={!answered}
            onPress={() => advance(answers)}
          />
        </View>
      ) : null}
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
  clip: { flex: 1, overflow: 'hidden' },
  scroll: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xxl },
  body: { gap: space.xl },
  art: { alignItems: 'flex-start', marginLeft: -space.lg, marginBottom: -space.md },
  options: { gap: space.sm },
  optionText: { flex: 1, gap: 2, paddingVertical: space.sm },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.md, paddingTop: space.sm },
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
