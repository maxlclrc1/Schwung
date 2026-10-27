import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Screen, T } from '../ui';
import { INTENSITIES, type Intensity } from '../../core/reset/habits';
import * as P from '../../core/reset/pilot';
import type { AgeBand, Precaution } from '../../core/v2/types';
import { haptic } from '../../lib/haptics';
import { useFieldNotes } from '../../store/fieldNotes';
import { useResetPilot } from '../../store/resetPilot';
import { useApp } from '../../store/useApp';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

const AGES: { id: AgeBand; label: string }[] = [
  { id: 'u16', label: 'Under 16' },
  { id: '16_17', label: '16–17' },
  { id: '18_29', label: '18–29' },
  { id: '30_49', label: '30–49' },
  { id: '50_64', label: '50–64' },
  { id: '65p', label: '65+' },
];

// The existing precautions question, unchanged.
const HEALTH: { id: Precaution; label: string }[] = [
  { id: 'joint', label: 'Joint, back or injury pain' },
  { id: 'walkingDifficult', label: 'Walking or standing for long is difficult for me' },
  { id: 'heart', label: 'Heart or blood-pressure condition' },
  { id: 'pregnancy', label: 'Pregnant or recently gave birth' },
  { id: 'fluidLimit', label: 'A clinician told me to limit fluids' },
  { id: 'sleepCondition', label: 'Diagnosed sleep condition' },
];

const STARTS: { id: P.StrengthStart; label: string }[] = [
  { id: 'new', label: 'New to it' },
  { id: 'sometimes', label: 'Sometimes' },
  { id: 'regular', label: 'Regularly' },
];

/** Life Reset pilot set-up (development and internal-testing builds only: see app/pilot/setup.tsx). */
export function PilotSetup() {
  const { c } = useTheme();
  const running = useResetPilot((s) => s.program !== null);
  // Schwung's own answers, read only, so nothing is asked twice. Never changed here.
  const known = useApp((s) => (s.profile && s.profile.age !== 'u16' ? s.profile : null));
  const [age, setAge] = useState<AgeBand | null>(known?.age ?? null);
  const [health, setHealth] = useState<Precaution[] | 'unknown' | null>(known ? known.precautions : null);
  const [minutes, setMinutes] = useState<number | null>(null);
  const [start, setStart] = useState<P.StrengthStart | undefined>(undefined);
  const [own, setOwn] = useState(2);
  const [picked, setPicked] = useState<Partial<Record<P.PilotHabitId, Intensity>>>({});

  if (running) return <Redirect href="/today" />;

  const answers: P.PilotAnswers = {
    age: age ?? '18_29',
    precautions: health ?? 'unknown',
    minutesPerDay: minutes ?? 0,
    ...(start ? { strengthStart: start } : {}),
    ...(picked.strength_log === 'challenge' ? { ownSessions: own } : {}),
  };
  const choices: P.PilotChoice[] = P.PILOT_HABITS.filter((id) => picked[id]).map((id) => ({
    habitId: id,
    intensity: picked[id]!,
  }));
  const ready = age !== null && health !== null && minutes !== null;
  const problems = ready ? P.setupProblems(answers, choices) : [];
  const total = P.busiestDayMinutes(
    choices.map((x) => ({ habitId: x.habitId, level: { intensity: x.intensity, phase: 'foundation' } })),
  );

  const toggleHabit = (id: P.PilotHabitId) => {
    haptic.tap();
    setPicked((p) => {
      if (p[id]) {
        const next = { ...p };
        delete next[id];
        return next;
      }
      const suggestion = P.suggestedIntensity(id, answers);
      return suggestion ? { ...p, [id]: suggestion } : p;
    });
  };
  const toggleHealth = (id: Precaution) => {
    haptic.tap();
    setHealth((h) => {
      const list = Array.isArray(h) ? h : [];
      return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    });
  };
  const begin = () => {
    if (!useResetPilot.getState().start(answers, choices)) return;
    haptic.success();
    // Open into the pilot (Field Notes, if it was on, is simply switched off; its data stays).
    useFieldNotes.getState().setActive(false);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/today');
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Ionicons name="chevron-back" size={26} color={c.text} />
          </Pressable>
          <T v="overline" color={c.accentInk}>
            Testing only
          </T>
        </View>
        <T v="title" accessibilityRole="header">
          Life Reset pilot
        </T>
        <T color={c.textDim}>
          A separate 66-day test with up to three new habits. Your current program stays exactly as it is, and you can
          switch back to it at any time.
        </T>

        <Section title="How old are you?">
          <Chips
            items={AGES}
            selected={(id) => age === id}
            onPress={(id) => {
              haptic.tap();
              setAge(id);
            }}
          />
          {age === 'u16' ? <T color={c.danger}>Schwung is made for people 16 and older.</T> : null}
        </Section>

        <Section title="Anything we should keep in mind?" hint="Optional. It stays on your phone.">
          <Chips
            items={HEALTH}
            selected={(id) => Array.isArray(health) && health.includes(id)}
            onPress={toggleHealth}
          />
          <View style={styles.chips}>
            <Chip
              label="None of these"
              on={Array.isArray(health) && health.length === 0}
              onPress={() => setHealth([])}
            />
            <Chip label="Skip" on={health === 'unknown'} onPress={() => setHealth('unknown')} />
          </View>
        </Section>

        <Section
          title="On a day all your habits fall on, how much time do you have?"
          hint="The habits you choose have to fit."
        >
          <Chips
            items={P.PILOT_TIME_OPTIONS.map((m) => ({
              id: m,
              label: m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}` : `${m} min`,
            }))}
            selected={(m) => minutes === m}
            onPress={(m) => {
              haptic.tap();
              setMinutes(m);
            }}
          />
        </Section>

        {age && age !== 'u16' && health !== null ? (
          <Section title="Choose your habits" hint="Pick any of the three, and how hard each starts.">
            {P.PILOT_HABITS.map((id) => {
              const on = !!picked[id];
              const options = P.intensityOptions(id, answers);
              const blocked = options.every((o) => o.reason);
              const preview = picked[id] ? P.previewTarget(id, picked[id]!, answers) : null;
              return (
                <ThemedView
                  key={id}
                  style={[styles.habit, { backgroundColor: c.surface, borderColor: on ? c.accentInk : c.border }]}
                >
                  <Pressable
                    onPress={() => !blocked && toggleHabit(id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on, disabled: blocked }}
                    style={styles.habitHead}
                  >
                    <Ionicons
                      name={on ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={blocked ? c.textFaint : c.accentInk}
                    />
                    <T v="bodyStrong" style={{ flex: 1 }}>
                      {P.habitName(id)}
                    </T>
                  </Pressable>
                  {blocked ? (
                    <T v="caption" color={c.textDim}>
                      Not available: {options[0].reason}.
                    </T>
                  ) : null}
                  {on && id === 'strength_log' ? (
                    <View style={{ gap: space.xs }}>
                      <T v="caption" color={c.textDim}>
                        Where are you starting from?
                      </T>
                      <Chips
                        items={STARTS}
                        selected={(s) => start === s}
                        onPress={(s) => {
                          haptic.tap();
                          setStart(s);
                          const suggestion = P.suggestedIntensity(id, { ...answers, strengthStart: s });
                          if (suggestion) setPicked((p) => ({ ...p, [id]: suggestion }));
                        }}
                      />
                    </View>
                  ) : null}
                  {on ? (
                    <View style={styles.chips}>
                      {INTENSITIES.map((i) => {
                        const reason = options.find((o) => o.intensity === i)?.reason;
                        return (
                          <Chip
                            key={i}
                            label={P.INTENSITY_NAME[i]}
                            on={picked[id] === i}
                            disabled={!!reason}
                            onPress={() => setPicked((p) => ({ ...p, [id]: i }))}
                          />
                        );
                      })}
                    </View>
                  ) : null}
                  {on && id === 'strength_log' && picked[id] === 'challenge' ? (
                    <View style={styles.stepper}>
                      <T v="caption" color={c.textDim} style={{ flex: 1 }}>
                        Sessions a week you already do
                      </T>
                      <Chip label="−" on={false} onPress={() => setOwn((n) => Math.max(2, n - 1))} />
                      <T v="bodyStrong">{own}</T>
                      <Chip label="+" on={false} onPress={() => setOwn((n) => Math.min(7, n + 1))} />
                    </View>
                  ) : null}
                  {preview ? (
                    <T v="caption" color={c.textDim}>
                      Starts at Foundation: {preview.target} · {preview.frequency}
                    </T>
                  ) : null}
                  {on && id === 'strength_log'
                    ? P.habitNotes(id, answers).map((n) => (
                        <T key={n} v="caption" color={c.textFaint}>
                          {n}
                        </T>
                      ))
                    : null}
                </ThemedView>
              );
            })}
          </Section>
        ) : null}

        {choices.length ? (
          <Section title="Review">
            {choices.map((x) => {
              const p = P.previewTarget(x.habitId, x.intensity, answers);
              return (
                <T key={x.habitId}>
                  <T v="bodyStrong">{P.habitName(x.habitId)}</T> · {P.INTENSITY_NAME[x.intensity]}: {p.target},{' '}
                  {p.frequency.toLowerCase()}
                </T>
              );
            })}
            <T v="caption" color={c.textDim}>
              About {total} min on a day they all fall on{minutes ? `, of the ${minutes} min you have` : ''}. Targets
              only change when you choose: readiness offers come when you’ve been consistent.
            </T>
          </Section>
        ) : null}

        {problems.map((p) => (
          <T key={p} v="caption" color={c.danger}>
            {p}
          </T>
        ))}
        <Button label="Begin the 66-day pilot" disabled={!ready || problems.length > 0} onPress={begin} />
      </ScrollView>
    </Screen>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={styles.section}>
      <T v="bodyStrong" accessibilityRole="header">
        {title}
      </T>
      {hint ? (
        <T v="caption" color={c.textDim}>
          {hint}
        </T>
      ) : null}
      {children}
    </View>
  );
}

function Chips<K extends string | number>({
  items,
  selected,
  onPress,
}: {
  items: { id: K; label: string }[];
  selected: (id: K) => boolean;
  onPress: (id: K) => void;
}) {
  return (
    <View style={styles.chips}>
      {items.map((x) => (
        <Chip key={String(x.id)} label={x.label} on={selected(x.id)} onPress={() => onPress(x.id)} />
      ))}
    </View>
  );
}

function Chip({
  label,
  on,
  disabled,
  onPress,
}: {
  label: string;
  on: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: on, disabled }}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <ThemedView
        style={[
          styles.chip,
          { backgroundColor: on ? c.accentSoft : c.surface, borderColor: on ? c.accentInk : c.border },
        ]}
      >
        <T v="caption" color={on ? c.accentInk : c.text} style={{ fontWeight: '600' }}>
          {label}
        </T>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.lg, gap: space.lg, paddingBottom: space.xxxl },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  section: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  habit: { borderWidth: 1, borderRadius: radius.lg, padding: space.md, gap: space.sm },
  habitHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
