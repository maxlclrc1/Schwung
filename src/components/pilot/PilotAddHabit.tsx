import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { Intensity } from '../../core/reset/habits';
import * as P from '../../core/reset/pilot';
import type { ActiveDays, PhoneHours } from '../../core/reset/profile';
import { haptic } from '../../lib/haptics';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { SheetHeader } from '../SheetHeader';
import { Button, Screen, T } from '../ui';
import { BaselineQuestions, Chips, duration, IntensityCard, Section, setupStyles } from './SetupParts';

/**
 * Add a habit to the running Life Reset (app/life-reset/add.tsx): pick one of the 11 not in it yet, answer only
 * what it needs that hasn't been asked, choose its intensity, and it joins from today at Foundation. The set-up's
 * rules apply (eligibility, at most six habits, the time check with every habit at today's level).
 */
export function PilotAddHabit() {
  const { c } = useTheme();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
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

  if (!program) {
    return (
      <Screen edges={['bottom']}>
        <SheetHeader title="Add a habit" />
      </Screen>
    );
  }

  const today = pilotToday({ program, devDayOffset: offset });
  const full = program.habits.length >= P.MAX_HABITS;
  const needs = picked ? P.missingBaselines(program, picked) : [];
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
  const allowed = picked ? P.intensityOptions(picked, answers).filter((o) => !o.reason) : [];
  const intensity: Intensity | null =
    level && allowed.some((o) => o.intensity === level) ? level : picked ? P.suggestedIntensity(picked, answers) : null;
  const choice = picked && intensity ? { habitId: picked, intensity } : null;
  const problems = choice ? P.addProblems(program, extra, choice, today) : [];
  const answeredAll = needs.every((b) => extra[b] !== undefined);
  const timeProblem = problems.some((p) => p.startsWith('With it, your habits take'));

  const pick = (id: string) => {
    haptic.tap();
    setPicked(id);
    setLevel(null);
  };
  const add = () => {
    if (!choice || !useResetPilot.getState().addHabit(extra, choice)) return;
    haptic.success();
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Add a habit" action="Cancel" />
      <ScrollView contentContainerStyle={styles.scroll}>
        {full ? (
          <T color={c.textDim}>You have {P.MAX_HABITS} habits, the most for now.</T>
        ) : (
          <>
            <T color={c.textDim}>It joins from today, at its Foundation level. Your other habits stay as they are.</T>
            {P.addableHabits(program).map((id) => {
              const on = picked === id;
              const reason = P.habitExclusion(id, program.answers);
              return (
                <Pressable
                  key={id}
                  onPress={() => !reason && pick(id)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on, disabled: !!reason }}
                  accessibilityHint={reason ? `Not available: ${reason}` : undefined}
                >
                  <ThemedView
                    style={[
                      setupStyles.habit,
                      {
                        backgroundColor: c.surface,
                        borderColor: on ? c.accentInk : c.border,
                        opacity: reason ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={c.accentInk} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <T v="bodyStrong">{P.habitName(id)}</T>
                      <T v="caption" color={c.textDim}>
                        {reason ? `Not available: ${reason}.` : P.habitDescription(id)}
                      </T>
                    </View>
                  </ThemedView>
                </Pressable>
              );
            })}
          </>
        )}

        {picked ? (
          <>
            <BaselineQuestions
              needs={needs}
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
            {answeredAll ? (
              <IntensityCard
                id={picked}
                answers={answers}
                chosen={intensity}
                onChoose={(i) => {
                  haptic.tap();
                  setLevel(i);
                }}
                own={own}
                setOwn={setOwn}
              />
            ) : null}
            {answeredAll && (timeProblem || minutes) ? (
              <Section
                title="On a day all your habits fall on, how much time do you have?"
                hint={`You said ${duration(program.answers.minutesPerDay)} at set-up.`}
              >
                <Chips
                  items={P.PILOT_TIME_OPTIONS.map((m) => ({ id: m, label: duration(m) }))}
                  selected={(m) => (minutes ?? program.answers.minutesPerDay) === m}
                  onPress={setMinutes}
                />
              </Section>
            ) : null}
            {answeredAll
              ? problems.map((p) => (
                  <T key={p} v="caption" color={c.danger}>
                    {p}
                  </T>
                ))
              : null}
            <Button
              label={`Add ${P.habitName(picked)}`}
              disabled={!choice || !answeredAll || problems.length > 0}
              onPress={add}
            />
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
});
