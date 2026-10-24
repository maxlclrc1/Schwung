import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, FadeOutLeft, LayoutAnimationConfig } from 'react-native-reanimated';
import { IconOrb } from '../../components/Art';
import { TrailProgress } from '../../components/TrailProgress';
import { Button, Screen, T } from '../../components/ui';
import { OnboardingBackdrop } from '../../components/World';
import { UNDER_16_MESSAGE } from '../../core/v2/engine';
import { pendingTimeQuestion } from '../../core/v2/program';
import { isAnswered, toProfile, visibleQuestions, type Draft, type QuestionV2 } from '../../core/v2/quiz';
import { v2PreviewEnabled } from '../../lib/flags';
import { haptic } from '../../lib/haptics';
import { useScreenReader } from '../../lib/useScreenReader';
import { useApp } from '../../store/useApp';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

type IconName = keyof typeof Ionicons.glyphMap;

/** Habit Science V2 quiz (development preview only). Same look as the V1 quiz. */
export default function QuizV2() {
  const { c } = useTheme();
  const started = useApp((s) => s.startedAt !== null);
  const enabled = useApp((s) => v2PreviewEnabled(s.devV2Preview));
  const screenReader = useScreenReader();
  const [draft, setDraft] = useState<Draft>(() => useApp.getState().profile ?? {});
  const [step, setStep] = useState(0);
  const advancing = useRef(false);
  const questions = visibleQuestions(draft);
  const q = questions[Math.min(step, questions.length - 1)];

  if (started) return <Redirect href="/today" />;
  if (!enabled) return <Redirect href="/welcome" />;

  // Under 16: a stop screen, and nothing is saved.
  if (draft.age === 'u16') {
    return (
      <Screen backdrop={<OnboardingBackdrop />}>
        <View style={styles.stop}>
          <View style={{ gap: space.md }}>
            <IconOrb icon="hand-left" size={76} />
            <T v="title" accessibilityRole="header">
              Not yet, but soon.
            </T>
            <T color={c.textDim}>{UNDER_16_MESSAGE}</T>
            <T v="caption" color={c.textFaint}>
              Nothing you answered has been saved.
            </T>
          </View>
          <View style={{ gap: space.sm }}>
            <Button
              label="Back to the start"
              onPress={() => {
                useApp.getState().setProfile(null);
                router.back();
              }}
            />
            <Button
              label="I chose the wrong age"
              kind="ghost"
              onPress={() => {
                setDraft({});
                setStep(0);
              }}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const finish = (d: Draft) => {
    const profile = toProfile(d);
    if (!profile) return;
    useApp.getState().setProfile(profile);
    router.push(pendingTimeQuestion(profile) ? '/v2/time' : '/v2/plan');
  };

  const advance = (d: Draft) => {
    const next = visibleQuestions(d);
    const at = next.findIndex((x) => x.key === q.key);
    if (d.age === 'u16') return; // the stop screen takes over
    if (at < next.length - 1) setStep(at + 1);
    else finish(d);
  };

  const later = (d: Draft) => {
    // With a screen reader on, moving on by itself would pull focus away mid-announcement.
    if (screenReader) return;
    advancing.current = true;
    setTimeout(() => {
      advancing.current = false;
      advance(d);
    }, 220);
  };

  const chooseSingle = (value: string) => {
    if (advancing.current) return;
    haptic.tap();
    const next = { ...draft, [q.key]: value } as Draft;
    setDraft(next);
    if (value === 'u16') {
      // Nothing is kept for under-16s, including an earlier unfinished draft.
      useApp.getState().setProfile(null);
      return;
    }
    later(next);
  };

  const toggleMulti = (value: string) => {
    if (q.kind !== 'multi') return;
    haptic.tap();
    const current = draft[q.key];
    const list = Array.isArray(current) ? (current as string[]) : [];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    setDraft({ ...draft, [q.key]: next } as Draft);
  };

  const back = () => {
    haptic.tap();
    if (step > 0) setStep(step - 1);
    else router.back();
  };

  return (
    <Screen backdrop={<OnboardingBackdrop />}>
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <TrailProgress step={step} total={questions.length} />
        </View>
        <View style={styles.back} />
      </View>

      <ScrollView style={styles.clip} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <LayoutAnimationConfig skipEntering>
          <Animated.View
            key={q.key}
            entering={FadeInRight.duration(240)}
            exiting={FadeOutLeft.duration(140)}
            style={styles.body}
          >
            <View style={styles.art}>
              <IconOrb icon={q.icon as IconName} size={76} />
            </View>
            <View style={{ gap: space.sm }}>
              <T v="overline" color={c.accentInk} maxFontSizeMultiplier={1.3}>
                {q.section}
              </T>
              <T v="title" accessibilityRole="header">
                {q.title}
              </T>
              {q.hint ? <T color={c.textDim}>{q.hint}</T> : null}
            </View>
            {q.kind === 'single' ? (
              <View style={styles.options} accessibilityRole="radiogroup">
                {q.options.map((o) => (
                  <Option
                    key={o.value}
                    label={o.label}
                    sub={o.sub}
                    icon={o.icon as IconName | undefined}
                    selected={draft[q.key] === o.value}
                    onPress={() => chooseSingle(o.value)}
                  />
                ))}
              </View>
            ) : (
              <MultiOptions q={q} draft={draft} toggle={toggleMulti} />
            )}
          </Animated.View>
        </LayoutAnimationConfig>
      </ScrollView>
      <Footer
        q={q}
        draft={draft}
        screenReader={screenReader}
        last={step >= questions.length - 1}
        onContinue={(d) => {
          setDraft(d);
          advance(d);
        }}
      />
    </Screen>
  );
}

function MultiOptions({ q, draft, toggle }: { q: QuestionV2; draft: Draft; toggle: (v: string) => void }) {
  if (q.kind !== 'multi') return null;
  const value = draft[q.key];
  const list = Array.isArray(value) ? (value as string[]) : [];
  return (
    <View style={styles.options}>
      {q.options.map((o) => (
        <Option key={o.value} label={o.label} selected={list.includes(o.value)} multi onPress={() => toggle(o.value)} />
      ))}
    </View>
  );
}

/** Continue for multi-select questions (and every question with a screen reader on). */
function Footer({
  q,
  draft,
  screenReader,
  last,
  onContinue,
}: {
  q: QuestionV2;
  draft: Draft;
  screenReader: boolean;
  last: boolean;
  onContinue: (d: Draft) => void;
}) {
  const { c } = useTheme();
  if (q.kind === 'single') {
    if (!screenReader) return null;
    return (
      <View style={styles.footer}>
        <Button
          label="Continue"
          disabled={!isAnswered(q, draft) || draft.age === 'u16'}
          onPress={() => onContinue(draft)}
        />
      </View>
    );
  }
  const value = draft[q.key];
  const list = Array.isArray(value) ? (value as string[]) : [];
  return (
    <View style={[styles.footer, { gap: space.sm }]}>
      <Button
        label={list.length ? (last ? 'See my plan' : 'Continue') : q.none}
        onPress={() => onContinue({ ...draft, [q.key]: list } as Draft)}
      />
      {q.skippable ? (
        <Button label="Skip" kind="ghost" onPress={() => onContinue({ ...draft, [q.key]: 'unknown' } as Draft)} />
      ) : null}
      {q.skippable ? (
        <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
          If you skip, we’ll keep your plan on the careful side.
        </T>
      ) : null}
    </View>
  );
}

function Option({
  label,
  sub,
  icon,
  selected,
  multi,
  onPress,
}: {
  label: string;
  sub?: string;
  icon?: IconName;
  selected: boolean;
  multi?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={multi ? { checked: selected } : { selected }}
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      <ThemedView
        style={[
          styles.option,
          { backgroundColor: selected ? c.accentSoft : c.surface, borderColor: selected ? c.accentInk : 'transparent' },
        ]}
      >
        {icon ? <Ionicons name={icon} size={22} color={selected ? c.accentInk : c.textDim} /> : null}
        <View style={styles.optionText}>
          <T v="bodyStrong">{label}</T>
          {sub ? (
            <T v="caption" color={c.textDim}>
              {sub}
            </T>
          ) : null}
        </View>
        {selected ? (
          <Animated.View entering={FadeIn.duration(120)}>
            <Ionicons name={multi ? 'checkbox' : 'checkmark-circle'} size={24} color={c.accentInk} />
          </Animated.View>
        ) : (
          <ThemedView style={[multi ? styles.box : styles.radio, { borderColor: c.border }]} />
        )}
      </ThemedView>
    </Pressable>
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
  box: { width: 22, height: 22, borderRadius: 6, borderWidth: 2 },
  stop: { flex: 1, padding: space.xl, justifyContent: 'space-between' },
});
