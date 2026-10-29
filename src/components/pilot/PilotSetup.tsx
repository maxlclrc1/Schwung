import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { Intensity } from '../../core/reset/habits';
import * as P from '../../core/reset/pilot';
import type { ActiveDays, AgeBand, PhoneHours, Precaution } from '../../core/reset/profile';
import { haptic } from '../../lib/haptics';
import { useResetPilot } from '../../store/resetPilot';
import { space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Button, Screen, T } from '../ui';
import {
  AGES,
  BaselineQuestions,
  Chip,
  Chips,
  duration,
  HEALTH,
  IntensityCard,
  Section,
  setupStyles,
} from './SetupParts';

type Step = 'about' | 'habits' | 'details' | 'levels' | 'review';

/**
 * The Life Reset set-up, how every program starts (app/life-reset/setup.tsx): about you, the
 * habits you want, only the questions those habits need, how hard each starts and the time you have, then a review.
 * Nothing is pre-selected; a manageable first set is suggested.
 */
export function PilotSetup() {
  const { c } = useTheme();
  // One Life Reset at a time: with one saved, set-up never runs again (it would never replace it either: start()).
  const running = useResetPilot((s) => s.program !== null);
  const [step, setStep] = useState<Step>('about');
  const [age, setAge] = useState<AgeBand | null>(null);
  const [health, setHealth] = useState<Precaution[] | 'unknown' | null>(null);
  const [picked, setPicked] = useState<P.PilotHabitId[]>([]);
  const [levels, setLevels] = useState<Partial<Record<string, Intensity>>>({});
  const [minutes, setMinutes] = useState<number | null>(null);
  const [phone, setPhone] = useState<PhoneHours | undefined>(undefined);
  const [pull, setPull] = useState<number | undefined>(undefined);
  const [wake, setWake] = useState<P.PilotAnswers['wake']>(undefined);
  const [active, setActive] = useState<ActiveDays | undefined>(undefined);
  const [skill, setSkill] = useState<string | undefined>(undefined);
  const [start, setStart] = useState<P.StrengthStart | undefined>(undefined);
  const [own, setOwn] = useState(2);

  if (running) return <Redirect href="/" />;

  const answers: P.PilotAnswers = {
    age: age ?? '18_29',
    precautions: health ?? 'unknown',
    minutesPerDay: minutes ?? 0,
    ...(phone ? { phone } : {}),
    ...(pull !== undefined ? { pullMinutes: pull } : {}),
    ...(wake ? { wake } : {}),
    ...(active ? { activeDays: active } : {}),
    ...(skill ? { skill } : {}),
    ...(start ? { strengthStart: start } : {}),
    ...(levels.strength_log === 'challenge' ? { ownSessions: own } : {}),
  };
  const intensityOf = (id: string): Intensity | null => {
    const l = levels[id];
    const allowed = P.intensityOptions(id, answers).filter((o) => !o.reason);
    if (l && allowed.some((o) => o.intensity === l)) return l;
    return P.suggestedIntensity(id, answers);
  };
  const choices: P.PilotChoice[] = picked
    .map((id) => ({ habitId: id, intensity: intensityOf(id) }))
    .filter((x): x is P.PilotChoice => x.intensity !== null);
  const baselines = P.baselinesFor(picked);
  const problems = P.setupProblems(answers, choices);
  const excludedPicked = picked.filter((id) => P.habitExclusion(id, answers));
  const total = P.busiestDayMinutes(
    choices.map((x) => ({ habitId: x.habitId, level: { intensity: x.intensity, phase: 'foundation' } })),
  );

  const order: Step[] = ['about', 'habits', ...(baselines.length ? (['details'] as Step[]) : []), 'levels', 'review'];
  const go = (dir: 1 | -1) => {
    haptic.tap();
    const i = order.indexOf(step) + dir;
    if (i < 0) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
      return;
    }
    setStep(order[Math.min(i, order.length - 1)]);
  };
  const togglePick = (id: string) => {
    haptic.tap();
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= P.MAX_HABITS ? p : [...p, id]));
  };
  const begin = () => {
    if (!useResetPilot.getState().start(answers, choices)) return;
    haptic.success();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/today');
  };

  const canContinue =
    step === 'about'
      ? age !== null && age !== 'u16' && health !== null
      : step === 'habits'
        ? picked.length > 0
        : step === 'details'
          ? baselines.every((b) =>
              b === 'phone'
                ? !!phone
                : b === 'pullMinutes'
                  ? pull !== undefined
                  : b === 'wake'
                    ? !!wake
                    : b === 'activeDays'
                      ? !!active
                      : b === 'skill'
                        ? !!skill
                        : !!start,
            )
          : step === 'levels'
            ? minutes !== null && excludedPicked.length === 0
            : problems.length === 0;

  return (
    <Screen>
      <View style={styles.top}>
        <Pressable onPress={() => go(-1)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={26} color={c.text} />
        </Pressable>
        <View style={styles.dots} accessibilityLabel={`Step ${order.indexOf(step) + 1} of ${order.length}`}>
          {order.map((s) => (
            <ThemedView key={s} style={[styles.dot, { backgroundColor: s === step ? c.accentInk : c.border }]} />
          ))}
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {step === 'about' ? (
          <>
            <T v="overline" color={c.accentInk}>
              The 66-day Life Reset
            </T>
            <T v="title" accessibilityRole="header">
              A few things first
            </T>
            <T color={c.textDim}>66 days, a few habits you choose, each growing with you. It takes about a minute.</T>
            <Section title="How old are you?">
              <Chips items={AGES} selected={(id) => age === id} onPress={setAge} />
              {age === 'u16' ? <T color={c.danger}>Schwung is made for people 16 and older.</T> : null}
            </Section>
            <Section title="Anything we should keep in mind?" hint="Optional. It stays on your phone.">
              <Chips
                items={HEALTH}
                selected={(id) => Array.isArray(health) && health.includes(id)}
                onPress={(id) =>
                  setHealth((h) => {
                    const list = Array.isArray(h) ? h : [];
                    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
                  })
                }
              />
              <View style={setupStyles.chips}>
                <Chip
                  label="None of these"
                  on={Array.isArray(health) && health.length === 0}
                  onPress={() => setHealth([])}
                />
                <Chip label="Skip" on={health === 'unknown'} onPress={() => setHealth('unknown')} />
              </View>
            </Section>
          </>
        ) : null}

        {step === 'habits' ? (
          <>
            <T v="title" accessibilityRole="header">
              Which habits do you want?
            </T>
            <T color={c.textDim}>
              Two to four is a good start; up to {P.MAX_HABITS}. You can make each one easier or harder later.
            </T>
            <Button
              label="Start with a suggested three"
              kind="secondary"
              onPress={() => {
                haptic.tap();
                setPicked(P.SUGGESTED_START.filter((id) => !P.habitExclusion(id, answers)));
              }}
            />
            {P.PILOT_HABITS.map((id) => {
              const on = picked.includes(id);
              const reason = P.habitExclusion(id, answers);
              const full = !on && picked.length >= P.MAX_HABITS;
              return (
                <Pressable
                  key={id}
                  onPress={() => !reason && !full && togglePick(id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on, disabled: !!reason || full }}
                  accessibilityHint={reason ? `Not available: ${reason}` : undefined}
                >
                  <ThemedView
                    style={[
                      setupStyles.habit,
                      {
                        backgroundColor: c.surface,
                        borderColor: on ? c.accentInk : c.border,
                        opacity: reason || full ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={c.accentInk} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={setupStyles.row}>
                        <T v="bodyStrong" style={{ flexShrink: 1 }}>
                          {P.habitName(id)}
                        </T>
                        {(P.SUGGESTED_START as readonly string[]).includes(id) && !reason ? (
                          <T v="caption" color={c.accentInk} style={styles.tag}>
                            Suggested
                          </T>
                        ) : null}
                      </View>
                      <T v="caption" color={c.textDim}>
                        {reason ? `Not available: ${reason}.` : P.habitDescription(id)}
                      </T>
                    </View>
                  </ThemedView>
                </Pressable>
              );
            })}
          </>
        ) : null}

        {step === 'details' ? (
          <>
            <T v="title" accessibilityRole="header">
              Just what your habits need
            </T>
            <BaselineQuestions
              needs={baselines}
              answers={answers}
              values={{
                phone,
                setPhone,
                pull,
                setPull,
                wake,
                setWake,
                active,
                setActive,
                skill,
                setSkill,
                start,
                setStart,
              }}
            />
          </>
        ) : null}

        {step === 'levels' ? (
          <>
            <T v="title" accessibilityRole="header">
              How hard to start
            </T>
            <T color={c.textDim}>Starter is a manageable beginning. Every habit starts at its Foundation level.</T>
            {picked.map((id) => (
              <IntensityCard
                key={id}
                id={id}
                answers={answers}
                chosen={intensityOf(id)}
                onChoose={(i) => setLevels((l) => ({ ...l, [id]: i }))}
                own={own}
                setOwn={setOwn}
                onRemove={() => setPicked((p) => p.filter((x) => x !== id))}
              />
            ))}
            <Section
              title="On a day all your habits fall on, how much time do you have?"
              hint="Your habits have to fit."
            >
              <Chips
                items={P.PILOT_TIME_OPTIONS.map((m) => ({ id: m, label: duration(m) }))}
                selected={(m) => minutes === m}
                onPress={setMinutes}
              />
            </Section>
          </>
        ) : null}

        {step === 'review' ? (
          <>
            <T v="title" accessibilityRole="header">
              Your Life Reset
            </T>
            {choices.map((x) => {
              const p = P.previewTarget(x.habitId, x.intensity, answers);
              return (
                <ThemedView key={x.habitId} style={[setupStyles.level, { backgroundColor: c.surface }]}>
                  <T v="bodyStrong">
                    {P.habitName(x.habitId)} · {P.INTENSITY_NAME[x.intensity]}
                  </T>
                  <T>{p.target}</T>
                  <T v="caption" color={c.textDim}>
                    {p.frequency}
                  </T>
                </ThemedView>
              );
            })}
            <T v="caption" color={c.textDim}>
              About {total} min on a day they all fall on{minutes ? `, of the ${duration(minutes)} you have` : ''}.
              Targets only change when you choose: offers come when you’ve been consistent. A swipe marks a habit done.
            </T>
          </>
        ) : null}

        {(step === 'levels' || step === 'review') && minutes !== null
          ? problems
              .filter((p) => step === 'review' || p.startsWith('These take'))
              .map((p) => (
                <T key={p} v="caption" color={c.danger}>
                  {p}
                </T>
              ))
          : null}

        <Button
          label={step === 'review' ? 'Begin Day 1' : 'Continue'}
          disabled={!canContinue}
          onPress={step === 'review' ? begin : () => go(1)}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  tag: { fontWeight: '700' },
});
