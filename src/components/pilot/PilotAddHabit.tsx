import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { Intensity } from '../../core/reset/habits';
import * as P from '../../core/reset/pilot';
import type { ActiveDays, PhoneHours } from '../../core/reset/profile';
import { haptic } from '../../lib/haptics';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { CROP_COUNT } from '../habitArt';
import { HabitCard } from '../HabitCard';
import { radius, space, useTheme } from '../../theme';
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
  // "Your own habit": its name, what counts, and how many days a week.
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [perWeek, setPerWeek] = useState(7);

  if (!program) {
    return (
      <Screen edges={['bottom']}>
        <SheetHeader title="Add a habit" />
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
  const choice = picked && intensity ? { habitId: picked, intensity } : null;
  const problems = choice ? P.addProblems(program, extra, choice, today) : [];
  const answeredAll = needs.every((b) => extra[b] !== undefined);
  const timeProblem = problems.some((p) => p.startsWith('With it, your habits take'));

  const pick = (id: string) => {
    haptic.select();
    setPicked(id);
    setLevel(null);
  };
  const ownProblems = mine ? P.customProblems(program, name, perWeek) : [];
  const addOwn = () => {
    if (!useResetPilot.getState().addCustomHabit({ name, note, perWeek })) return;
    haptic.confirm();
    router.back();
  };
  const add = () => {
    if (!choice || !useResetPilot.getState().addHabit(extra, choice)) return;
    haptic.confirm();
    router.back();
  };

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Add a habit" action="Cancel" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {full ? (
          <T color={c.textDim}>You have {P.MAX_HABITS} habits, the most for now. Remove one to make room.</T>
        ) : (
          <>
            <T color={c.textDim}>It joins from today. Your other habits stay as they are.</T>
            <Pressable onPress={() => pick(OWN)} accessibilityRole="radio" accessibilityState={{ checked: mine }}>
              <ThemedView
                style={[setupStyles.habit, { backgroundColor: c.surface, borderColor: mine ? c.accentInk : c.border }]}
              >
                <Ionicons name={mine ? 'radio-button-on' : 'create-outline'} size={22} color={c.accentInk} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T v="bodyStrong">Your own habit</T>
                  <T v="caption" color={c.textDim}>
                    Name it, say what counts, and choose how often.
                  </T>
                </View>
              </ThemedView>
            </Pressable>
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

        {mine ? (
          <>
            <Section title="What’s it called?">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Stretch, Cook dinner, Journal"
                placeholderTextColor={c.textFaint}
                maxLength={40}
                returnKeyType="next"
                accessibilityLabel="Habit name"
                style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
              />
            </Section>
            <Section title="What counts as done? (optional)" hint="Shown on the card, under the name.">
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="e.g. 10 minutes after work"
                placeholderTextColor={c.textFaint}
                maxLength={80}
                accessibilityLabel="What counts as done"
                style={[styles.input, { color: c.text, backgroundColor: c.surface, borderColor: c.border }]}
              />
            </Section>
            <Section
              title="How often?"
              hint="A few days a week counts by the week: any days you choose, and a day without it is never missed."
            >
              <Chips
                items={[7, 6, 5, 4, 3, 2, 1].map((n) => ({
                  id: n,
                  label: n === 7 ? 'Every day' : `${n} day${n === 1 ? '' : 's'} a week`,
                }))}
                selected={(n) => perWeek === n}
                onPress={setPerWeek}
              />
            </Section>
            <View pointerEvents="none">
              <HabitCard
                habitId="custom_preview"
                scene={P.nextScene(program, CROP_COUNT)}
                done={false}
                readOnly
                onToggle={() => {}}
                display={{
                  title: name.trim() || 'Your habit',
                  task: note.trim() || (perWeek === 7 ? 'Every day' : `Any ${perWeek} days a week`),
                  levelIndex: 0,
                  levelLabel: 'Your habit',
                }}
              />
            </View>
            <T v="caption" color={c.textDim}>
              Its card shows a part of the mountain world of its own.
            </T>
            {name.trim()
              ? ownProblems.map((p) => (
                  <T key={p} v="caption" color={c.danger}>
                    {p}
                  </T>
                ))
              : null}
            <Button
              label={name.trim() ? `Add ${name.trim()}` : 'Add your habit'}
              disabled={ownProblems.length > 0}
              onPress={addOwn}
            />
          </>
        ) : picked ? (
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
                  haptic.select();
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

/** The "Your own habit" choice (not a habit id). */
const OWN = 'own';

const styles = StyleSheet.create({
  scroll: { padding: space.lg, gap: space.md, paddingBottom: space.xxxl },
  input: { minHeight: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, fontSize: 17 },
});
