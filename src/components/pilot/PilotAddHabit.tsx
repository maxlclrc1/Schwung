import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInLeft, FadeInRight, ReduceMotion } from 'react-native-reanimated';
import type { Intensity } from '../../core/reset/habits';
import * as P from '../../core/reset/pilot';
import type { ActiveDays, PhoneHours } from '../../core/reset/profile';
import { haptic } from '../../lib/haptics';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { CROP_COUNT } from '../habitArt';
import { HabitCard } from '../HabitCard';
import { Press, Stepper } from '../onboarding/Choices';
import { HabitTile, StartCard } from '../onboarding/Habits';
import { Question, useTints } from '../onboarding/kit';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { SheetHeader } from '../SheetHeader';
import { Button, ProgressBar, Screen, T } from '../ui';
import { BaselineQuestions, Chips, duration } from './SetupParts';
import { t as tr } from '../../i18n';
import { useT } from '../../i18n/react';

/*
 * Add a habit to the running Life Reset (app/life-reset/add.tsx), as a short set-up of its own, one question a
 * screen: which habit (one of the 11 not in it yet, or one of your own), then only what it needs (for one of
 * yours: its name, what counts and how often; for a catalog habit: any question it hasn't been asked, how hard it
 * starts, and more time a day if it wouldn't fit), then a look before adding. It joins from today at Foundation;
 * the set-up's rules apply (eligibility, at most MAX_HABITS habits, the time check with every habit at today's
 * level). Every answer is kept going back.
 */

type Step = 'pick' | 'name' | 'note' | 'often' | `need:${P.Baseline}` | 'level' | 'time' | 'review';
const OWN = 'own';
const sys = ReduceMotion.System;
const OFTEN = [7, 6, 5, 4, 3, 2, 1].map((n) => ({
  n,
  get label() {
    return n === 7 ? tr('add.everyDay') : tr('add.often', { count: n });
  },
}));
const needTitle = (b: P.Baseline) => tr(`add.need.${b}`);

export function PilotAddHabit() {
  const { c } = useTheme();
  const t = useT();
  const tn = useTints();
  const { width } = useWindowDimensions();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const [step, setStep] = useState<Step>('pick');
  const [dir, setDir] = useState<1 | -1>(1);
  const [picked, setPicked] = useState<string | null>(null);
  const [level, setLevel] = useState<Intensity | null>(null);
  const [phone, setPhone] = useState<PhoneHours | undefined>(undefined);
  const [pull, setPull] = useState<number | undefined>(undefined);
  const [wake, setWake] = useState<P.PilotAnswers['wake']>(undefined);
  const [active, setActive] = useState<ActiveDays | undefined>(undefined);
  const [skill, setSkill] = useState<string | undefined>(undefined);
  const [start, setStart] = useState<P.StrengthStart | undefined>(undefined);
  const [own, setOwn] = useState(2);
  const [minutes, setMinutes] = useState<number | null>(null);
  // Your own habit: its name, what counts, and how many days a week.
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [perWeek, setPerWeek] = useState(7);

  if (!program) {
    return (
      <Screen edges={['bottom']}>
        <SheetHeader title={t('add.title')} />
      </Screen>
    );
  }

  const today = pilotToday({ program, devDayOffset: offset });
  const mine = picked === OWN;
  const full = program.habits.length >= P.MAX_HABITS;
  const needs = picked && !mine ? P.missingBaselines(program, picked) : [];
  // Only the answers this habit's questions add (or more time a day); everything else is the program's own.
  const extra: Partial<P.PilotAnswers> = {
    ...(needs.includes('phone') && phone ? { phone } : {}),
    ...(needs.includes('pullMinutes') && pull !== undefined ? { pullMinutes: pull } : {}),
    ...(needs.includes('wake') && wake ? { wake } : {}),
    ...(needs.includes('activeDays') && active ? { activeDays: active } : {}),
    ...(needs.includes('skill') && skill ? { skill } : {}),
    ...(needs.includes('strengthStart') && start ? { strengthStart: start } : {}),
    ...(picked === 'strength_log' && level === 'challenge' ? { ownSessions: own } : {}),
    ...(minutes ? { minutesPerDay: minutes } : {}),
  };
  const answers = { ...program.answers, ...extra };
  const allowed = picked && !mine ? P.intensityOptions(picked, answers).filter((o) => !o.reason) : [];
  const intensity: Intensity | null =
    level && allowed.some((o) => o.intensity === level)
      ? level
      : picked && !mine
        ? P.suggestedIntensity(picked, answers)
        : null;
  const choice = picked && !mine && intensity ? { habitId: picked, intensity } : null;
  const problems = choice ? P.addProblems(program, extra, choice, today) : [];
  const timeProblem = choice ? (P.addTimeProblem(program, extra, choice, today) ?? undefined) : undefined;
  const ownProblems = mine ? P.customProblems(program, name, perWeek) : [];
  const atMost = t('engine.problems.atMost', { max: P.MAX_HABITS });

  // The questions this habit asks, in order (the time question only when it wouldn't fit, or was changed).
  const order: Step[] = !picked
    ? ['pick']
    : mine
      ? ['pick', 'name', 'note', 'often', 'review']
      : [
          'pick',
          ...needs.map((b) => `need:${b}` as Step),
          'level',
          ...(timeProblem || minutes ? (['time'] as Step[]) : []),
          'review',
        ];
  const index = Math.max(0, order.indexOf(step));
  const go = (d: 1 | -1) => {
    const i = index + d;
    if (i < 0) return router.back();
    setDir(d);
    setStep(order[Math.min(i, order.length - 1)]);
  };
  const pick = (id: string) => {
    if (id !== picked) {
      setPicked(id);
      setLevel(null);
    }
    setDir(1);
    setStep(id === OWN ? 'name' : (P.missingBaselines(program, id).map((b) => `need:${b}` as Step)[0] ?? 'level'));
  };

  const need = step.startsWith('need:') ? (step.slice(5) as P.Baseline) : null;
  const answered = (b: P.Baseline) => extra[b] !== undefined;
  const canContinue =
    step === 'name'
      ? name.trim().length > 0
      : step === 'note' || step === 'often'
        ? true
        : need
          ? answered(need)
          : step === 'level'
            ? !!intensity && !P.habitExclusion(picked ?? '', answers)
            : step === 'time'
              ? !timeProblem
              : false;

  const add = () => {
    if (mine) {
      if (!useResetPilot.getState().addCustomHabit({ name, note, perWeek })) return;
    } else if (!choice || !useResetPilot.getState().addHabit(extra, choice)) return;
    haptic.confirm();
    router.back();
  };

  const tile = Math.floor((Math.min(width, 520) - space.xl * 2 - space.md) / 2);
  const habitName = mine ? name.trim() || t('add.yourHabit') : picked ? P.habitName(picked) : '';

  const screen = (() => {
    if (step === 'pick')
      return full ? (
        <Question eyebrow={t('add.title')} tint="lavender" title={t('add.fullTitle')}>
          <T color={c.textDim}>{t('add.full', { max: P.MAX_HABITS })}</T>
        </Question>
      ) : (
        <Question eyebrow={t('add.title')} tint="peach" title={t('add.pickTitle')} hint={t('add.pickHint')}>
          <Press onPress={() => pick(OWN)} accessibilityRole="button" accessibilityLabel={t('add.ownA11y')}>
            <ThemedView
              style={[styles.own, { backgroundColor: c.surface, borderColor: mine ? tn.lavender.fill : 'transparent' }]}
            >
              <View style={[styles.ownIcon, { backgroundColor: tn.lavender.soft }]}>
                <Ionicons name="create-outline" size={20} color={tn.lavender.ink} />
              </View>
              <View style={{ flex: 1 }}>
                <T v="bodyStrong">{t('add.own')}</T>
                <T v="caption" color={c.textDim}>
                  {t('add.ownBody')}
                </T>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
            </ThemedView>
          </Press>
          <View style={styles.grid}>
            {P.addableHabits(program).map((id, i) => (
              <HabitTile
                key={id}
                id={id}
                order={i}
                width={tile}
                selected={picked === id}
                suggested={false}
                reason={P.habitExclusion(id, program.answers)}
                full={false}
                onPress={() => (P.habitExclusion(id, program.answers) ? haptic.warning() : pick(id))}
              />
            ))}
          </View>
        </Question>
      );
    if (step === 'name')
      return (
        <Question eyebrow={t('add.own')} tint="lavender" title={t('add.nameTitle')} hint={t('add.nameHint')}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t('add.namePlaceholder')}
            placeholderTextColor={c.textFaint}
            maxLength={40}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => canContinue && go(1)}
            accessibilityLabel={t('add.nameA11y')}
            style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
          />
          {name.trim() && ownProblems.some((p) => p !== atMost) ? (
            <T v="caption" color={c.danger}>
              {ownProblems.find((p) => p !== atMost)}
            </T>
          ) : null}
        </Question>
      );
    if (step === 'note')
      return (
        <Question eyebrow={habitName} tint="lavender" title={t('add.noteTitle')} hint={t('add.noteHint')}>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('add.notePlaceholder')}
            placeholderTextColor={c.textFaint}
            maxLength={80}
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => go(1)}
            accessibilityLabel={t('add.noteA11y')}
            style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
          />
        </Question>
      );
    if (step === 'often')
      return (
        <Question eyebrow={habitName} tint="sage" title={t('add.oftenTitle')} hint={t('add.oftenHint')}>
          <View style={styles.list} accessibilityRole="radiogroup">
            {OFTEN.map((o) => {
              const on = perWeek === o.n;
              return (
                <Press
                  key={o.n}
                  onPress={() => setPerWeek(o.n)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={o.label}
                >
                  <ThemedView style={[styles.option, { backgroundColor: on ? tn.sage.soft : c.surface }]}>
                    <T v="bodyStrong" color={on ? tn.sage.ink : c.text} style={{ flex: 1 }}>
                      {o.label}
                    </T>
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: on ? tn.sage.fill : c.border,
                          backgroundColor: on ? tn.sage.fill : 'transparent',
                        },
                      ]}
                    >
                      {on ? <Ionicons name="checkmark" size={14} color={tn.sage.on} /> : null}
                    </View>
                  </ThemedView>
                </Press>
              );
            })}
          </View>
        </Question>
      );
    if (need)
      return (
        <Question eyebrow={habitName} tint="mist" title={needTitle(need)}>
          <BaselineQuestions
            needs={[need]}
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
            bare
          />
        </Question>
      );
    if (step === 'level' && picked)
      return (
        <Question eyebrow={habitName} tint="sage" title={t('add.levelsTitle')} hint={t('add.levelsHint')}>
          <StartCard
            id={picked}
            answers={answers}
            chosen={intensity}
            onChoose={(l) => setLevel(l)}
            onRemove={() => {
              setPicked(null);
              setDir(-1);
              setStep('pick');
            }}
          >
            {picked === 'strength_log' && intensity === 'challenge' ? (
              <Stepper label={t('add.ownSessions')} value={own} min={2} max={7} onChange={setOwn} />
            ) : null}
          </StartCard>
        </Question>
      );
    if (step === 'time')
      return (
        <Question
          eyebrow={t('add.yourDay')}
          tint="sage"
          title={t('add.timeTitle')}
          hint={t('add.timeHint', { time: duration(program.answers.minutesPerDay) })}
        >
          <Chips
            items={P.PILOT_TIME_OPTIONS.map((m) => ({ id: m, label: duration(m) }))}
            selected={(m) => (minutes ?? program.answers.minutesPerDay) === m}
            onPress={setMinutes}
          />
          {timeProblem ? (
            <T v="caption" color={c.danger}>
              {timeProblem}
            </T>
          ) : null}
        </Question>
      );
    // The review: the card as it will look, then Add.
    const preview = choice ? P.previewTarget(choice.habitId, choice.intensity, answers) : null;
    const issues = mine ? ownProblems : problems;
    return (
      <Question
        eyebrow={t('add.ready')}
        tint="indigo"
        title={t('add.reviewTitle', { habit: habitName })}
        hint={t('add.reviewHint')}
      >
        <View pointerEvents="none">
          <HabitCard
            habitId={mine ? 'custom_preview' : (picked ?? '')}
            scene={mine ? P.nextScene(program, CROP_COUNT) : undefined}
            done={false}
            readOnly
            onToggle={() => {}}
            display={
              mine
                ? {
                    title: habitName,
                    task: note.trim() || (perWeek === 7 ? t('add.everyDay') : t('add.anyDays', { count: perWeek })),
                    levelIndex: 0,
                    levelLabel: t('add.yourHabit'),
                  }
                : {
                    title: habitName,
                    task: preview ? t('setup.intensity.preview', preview) : '',
                    levelIndex: 0,
                    levelLabel: intensity
                      ? t('add.foundationLevel', {
                          intensity: P.intensityName(intensity),
                          phase: P.phaseName('foundation'),
                        })
                      : '',
                  }
            }
          />
        </View>
        {issues.map((p) => (
          <T key={p} v="caption" color={c.danger}>
            {p}
          </T>
        ))}
      </Question>
    );
  })();

  const issues = mine ? ownProblems : problems;
  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={t('add.title')} action={t('common.cancel')} />
      {picked ? (
        <View style={styles.progress}>
          <ProgressBar value={(index + 1) / order.length} height={4} color={tn.lavender.fill} />
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View key={step} entering={(dir > 0 ? FadeInRight : FadeInLeft).duration(320).reduceMotion(sys)}>
          {screen}
        </Animated.View>
      </ScrollView>
      {step === 'pick' ? null : (
        <View style={styles.footer}>
          <Pressable
            onPress={() => {
              haptic.select();
              go(-1);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('add.back')}
          >
            {({ pressed }) => (
              <ThemedView style={[styles.back, { backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons name="chevron-back" size={22} color={c.text} />
              </ThemedView>
            )}
          </Pressable>
          {step === 'review' ? (
            <Button
              label={t('add.add', { habit: habitName })}
              disabled={issues.length > 0}
              onPress={add}
              style={{ flex: 1 }}
            />
          ) : (
            <Button
              label={step === 'note' && !note.trim() ? t('add.skip') : t('add.continue')}
              disabled={!canContinue}
              onPress={() => go(1)}
              style={{ flex: 1 }}
            />
          )}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingTop: space.md, paddingBottom: space.xxl },
  progress: { paddingHorizontal: space.xl, paddingBottom: space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  own: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  ownIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  input: { minHeight: 56, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: 19 },
  list: { gap: space.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
  },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  back: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
