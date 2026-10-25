import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Screen, T } from '../../components/ui';
import { OnboardingBackdrop } from '../../components/World';
import { experimentOptions, GOALS, goalNeedsHealthAnswers, OBSERVATION } from '../../core/fieldnotes/catalog';
import type { FnGoal, FnProfile } from '../../core/fieldnotes/types';
import { UNDER_16_MESSAGE } from '../../core/v2/engine';
import type { AgeBand, Precaution } from '../../core/v2/types';
import { haptic } from '../../lib/haptics';
import { requestPermission, rescheduleReminders } from '../../lib/notifications';
import { fieldNotesAvailable, useFieldNotes } from '../../store/fieldNotes';
import { useApp } from '../../store/useApp';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

type Step = 'intro' | 'age' | 'goal' | 'health' | 'experiment' | 'plan';

const AGES: { id: AgeBand; label: string }[] = [
  { id: 'u16', label: 'Under 16' },
  { id: '16_17', label: '16–17' },
  { id: '18_29', label: '18–29' },
  { id: '30_49', label: '30–49' },
  { id: '50_64', label: '50–64' },
  { id: '65p', label: '65 or older' },
];

const HEALTH: { id: Precaution; label: string }[] = [
  { id: 'heart', label: 'A heart or blood-pressure condition' },
  { id: 'pregnancy', label: 'Pregnant or recently gave birth' },
  { id: 'walkingDifficult', label: 'Walking or standing for long is difficult for me' },
];

/** Field Notes set-up: development and internal-testing builds only. */
export default function FieldNotesSetup() {
  // A literal check first, so a production bundle drops the rest of this screen.
  if (!(__DEV__ || process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL === 'internal') || !fieldNotesAvailable()) {
    return <Redirect href="/" />;
  }
  return <Setup />;
}

function Setup() {
  const { c } = useTheme();
  const running = useFieldNotes((s) => s.run !== null);
  // Schwung's own answers, read only: age and health answers are reused so nothing is asked twice.
  const schwung = useApp((s) => (s.profile && s.profile.age !== 'u16' ? s.profile : null));
  const [step, setStep] = useState<Step>('intro');
  const [age, setAge] = useState<AgeBand | null>(schwung?.age ?? null);
  const [goal, setGoal] = useState<FnGoal | null>(null);
  const [health, setHealth] = useState<Precaution[] | 'unknown' | null>(schwung ? schwung.precautions : null);
  const [picked, setPicked] = useState<string | null>(null);
  const [reminder, setReminder] = useState(false);

  if (running) return <Redirect href="/fieldnotes" />;

  const profile: FnProfile | null =
    age && age !== 'u16' ? { age, precautions: health ?? 'unknown', fromSchwung: !!schwung } : null;
  const options = goal && profile ? experimentOptions(goal, profile, schwung) : [];
  const chosen = options.find((o) => o.id === picked) ?? null;

  const go = (s: Step) => {
    haptic.tap();
    setStep(s);
  };
  const back = () => {
    const order: Step[] = ['intro', 'age', 'goal', 'health', 'experiment', 'plan'];
    let i = order.indexOf(step) - 1;
    // Skip the steps this person didn't see.
    while (i > 0 && ((order[i] === 'age' && schwung) || (order[i] === 'health' && !needsHealth))) i--;
    if (i < 0 || step === 'intro') leave();
    else go(order[i]);
  };
  const needsHealth = !!goal && !schwung && goalNeedsHealthAnswers(goal);
  const leave = () => {
    useFieldNotes.getState().setActive(false);
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const begin = async () => {
    if (!goal || !profile || !chosen) return;
    if (!useFieldNotes.getState().start(goal, profile, chosen.id, schwung)) return;
    if (reminder) {
      const granted = await requestPermission().catch(() => false);
      useFieldNotes.getState().setReminder(granted, useFieldNotes.getState().reminder.time);
    }
    void rescheduleReminders().catch(() => {});
    haptic.success();
    router.replace('/fieldnotes');
  };

  const option = (key: string, label: string, sub: string | undefined, on: boolean, onPress: () => void) => (
    <Pressable
      key={key}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: on }}
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      <ThemedView
        style={[
          styles.option,
          { backgroundColor: on ? c.accentSoft : c.surface, borderColor: on ? c.accentInk : 'transparent' },
        ]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <T v="bodyStrong">{label}</T>
          {sub ? (
            <T v="caption" color={c.textDim}>
              {sub}
            </T>
          ) : null}
        </View>
        <Ionicons name={on ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={on ? c.accentInk : c.textFaint} />
      </ThemedView>
    </Pressable>
  );

  return (
    <Screen backdrop={<OnboardingBackdrop />}>
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View key={step} entering={FadeInDown.duration(350)} style={{ gap: space.lg }}>
          {step === 'intro' ? (
            <>
              <T v="overline" color={c.accentInk}>
                Field Notes · 14 days
              </T>
              <T v="display" accessibilityRole="header">
                Discover what actually works for you.
              </T>
              <T color={c.textDim}>
                Try one small thing and notice what happens. Three days to see where you’re starting, then your
                experiment, then what you found.
              </T>
              <View style={{ gap: space.sm }}>
                {[
                  ['help', 'Pick a question about your own days'],
                  ['create', 'Five seconds each evening to note how it went'],
                  ['bulb', 'On day 11, see what your notes show'],
                ].map(([icon, text]) => (
                  <View key={text} style={styles.point}>
                    <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color={c.accentInk} />
                    <T style={{ flex: 1 }}>{text}</T>
                  </View>
                ))}
              </View>
              <T v="caption" color={c.textFaint}>
                Separate from your Schwung plan: nothing there changes. Everything stays on this phone.
              </T>
            </>
          ) : null}

          {step === 'age' ? (
            <>
              <T v="title" accessibilityRole="header">
                How old are you?
              </T>
              <View style={styles.list} accessibilityRole="radiogroup">
                {AGES.map((a) => option(a.id, a.label, undefined, age === a.id, () => setAge(a.id)))}
              </View>
              {age === 'u16' ? (
                <T color={c.textDim} accessibilityLiveRegion="polite">
                  {UNDER_16_MESSAGE}
                </T>
              ) : null}
            </>
          ) : null}

          {step === 'goal' ? (
            <>
              <T v="title" accessibilityRole="header">
                What would you like to understand better?
              </T>
              {schwung ? (
                <T v="caption" color={c.textDim}>
                  Using your age and health answers from Schwung.
                </T>
              ) : null}
              <View style={styles.list} accessibilityRole="radiogroup">
                {GOALS.map((g) =>
                  option(g.id, g.title, g.sub, goal === g.id, () => {
                    setGoal(g.id);
                    setPicked(null);
                  }),
                )}
              </View>
            </>
          ) : null}

          {step === 'health' ? (
            <>
              <T v="title" accessibilityRole="header">
                Do any of these apply to you?
              </T>
              <T color={c.textDim}>So Schwung only suggests experiments that suit you. It stays on this phone.</T>
              <View style={styles.list}>
                {HEALTH.map((h) => {
                  const list = Array.isArray(health) ? health : [];
                  const on = list.includes(h.id);
                  return (
                    <Pressable
                      key={h.id}
                      onPress={() => setHealth(on ? list.filter((x) => x !== h.id) : [...list, h.id])}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: on }}
                      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                    >
                      <ThemedView
                        style={[
                          styles.option,
                          {
                            backgroundColor: on ? c.accentSoft : c.surface,
                            borderColor: on ? c.accentInk : 'transparent',
                          },
                        ]}
                      >
                        <T v="bodyStrong" style={{ flex: 1 }}>
                          {h.label}
                        </T>
                        <Ionicons
                          name={on ? 'checkbox' : 'square-outline'}
                          size={24}
                          color={on ? c.accentInk : c.textFaint}
                        />
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {step === 'experiment' && goal ? (
            <>
              <T v="title" accessibilityRole="header">
                Pick your experiment
              </T>
              <T color={c.textDim}>
                One small thing to try from day 4. Each evening you’ll note your {OBSERVATION[goal].noun}.
              </T>
              {options.length ? (
                <View style={styles.list} accessibilityRole="radiogroup">
                  {options.map((o, i) =>
                    option(o.id, o.question, `${i === 0 ? 'Suggested · ' : ''}Try: ${o.action}`, picked === o.id, () =>
                      setPicked(o.id),
                    ),
                  )}
                </View>
              ) : (
                <T color={c.textDim}>
                  None of the experiments for this question suit your answers yet. Try another question.
                </T>
              )}
              {chosen?.notes.map((n) => (
                <T key={n} v="caption" color={c.textDim}>
                  {n}
                </T>
              ))}
            </>
          ) : null}

          {step === 'plan' && goal && chosen ? (
            <>
              <T v="overline" color={c.accentInk}>
                Your question
              </T>
              <T v="title" accessibilityRole="header">
                {chosen.question}
              </T>
              <ThemedView style={[styles.timeline, { backgroundColor: c.surface }]}>
                {[
                  ['Days 1–3', `Just notice your ${OBSERVATION[goal].noun} each evening.`],
                  ['Days 4–14', `Try: ${chosen.action}.`],
                  ['Day 7', 'A first look at how it’s going.'],
                  ['Day 11', 'Your discovery: what your notes show, and what to do next.'],
                  ['Day 14', 'Your field note.'],
                ].map(([when, what]) => (
                  <View key={when} style={styles.row}>
                    <T v="caption" color={c.accentInk} style={styles.when}>
                      {when}
                    </T>
                    <T style={{ flex: 1 }}>{what}</T>
                  </View>
                ))}
              </ThemedView>
              <Pressable
                onPress={() => setReminder((v) => !v)}
                accessibilityRole="switch"
                accessibilityState={{ checked: reminder }}
                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              >
                <ThemedView style={[styles.option, { backgroundColor: c.surface, borderColor: 'transparent' }]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T v="bodyStrong">Evening reminder</T>
                    <T v="caption" color={c.textDim}>
                      One quiet note at 8:00 PM, none on days you’ve already noted. Change it anytime.
                    </T>
                  </View>
                  <Ionicons
                    name={reminder ? 'toggle' : 'toggle-outline'}
                    size={32}
                    color={reminder ? c.accentInk : c.textFaint}
                  />
                </ThemedView>
              </Pressable>
            </>
          ) : null}
        </Animated.View>
      </ScrollView>
      <View style={styles.footer}>
        {step === 'intro' ? (
          <>
            <Button label="Begin" onPress={() => go(schwung ? 'goal' : 'age')} />
            <Button label="Not now" kind="ghost" onPress={leave} />
          </>
        ) : step === 'age' ? (
          <Button label="Continue" disabled={!age || age === 'u16'} onPress={() => go('goal')} />
        ) : step === 'goal' ? (
          <Button label="Continue" disabled={!goal} onPress={() => go(needsHealth ? 'health' : 'experiment')} />
        ) : step === 'health' ? (
          <>
            <Button
              label={Array.isArray(health) && health.length ? 'Continue' : 'None of these'}
              onPress={() => {
                if (!Array.isArray(health)) setHealth([]);
                go('experiment');
              }}
            />
            <Button
              label="Prefer not to say"
              kind="ghost"
              onPress={() => {
                setHealth('unknown');
                go('experiment');
              }}
            />
          </>
        ) : step === 'experiment' ? (
          <Button label="Continue" disabled={!chosen} onPress={() => go('plan')} />
        ) : (
          <Button label="Start my 14 days" onPress={() => void begin()} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingTop: space.sm },
  back: { width: 32, height: 44, justifyContent: 'center' },
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, paddingTop: space.md },
  list: { gap: space.sm },
  option: {
    minHeight: 58,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  point: { flexDirection: 'row', gap: space.md, alignItems: 'center' },
  timeline: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  when: { width: 72, fontWeight: '700', paddingTop: 2 },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.md, paddingTop: space.sm, gap: space.sm },
});
