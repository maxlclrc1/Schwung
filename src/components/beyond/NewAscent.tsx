import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { toDateKey } from '../../core/dates';
import type { Intensity } from '../../core/reset/habits';
import * as P from '../../core/reset/pilot';
import type { AgeBand, Precaution } from '../../core/reset/profile';
import { haptic } from '../../lib/haptics';
import { startNewAscent } from '../../store/ascent';
import { pilotNow, pilotToday, useResetPilot } from '../../store/resetPilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { CROP_COUNT } from '../habitArt';
import { rise, useTints } from '../onboarding/kit';
import { AGES, Chip, Chips, HEALTH, IntensityCard, Section, setupStyles } from '../pilot/SetupParts';
import { SheetHeader } from '../SheetHeader';
import { Button, Screen, T } from '../ui';

/**
 * Begin a New Ascent: a short set-up from where the last one ended. The person reconfirms their age band and health
 * precautions (they drive the safety rules and may have changed), keeps or drops each habit, and sets its level
 * (pre-selected at the one reached). The finished Life Reset joins Past journeys in the same save as the new one
 * begins (store/ascent.ts); then Day 1's ceremony.
 */
export function NewAscent() {
  const { c } = useTheme();
  const t = useTints();
  const prev = useResetPilot((s) => s.program)!;
  const offset = useResetPilot((s) => s.devDayOffset);
  const today = pilotToday({ program: prev, devDayOffset: offset });
  const defaults = useMemo(() => P.ascentDefaults(prev, today), [prev, today]);
  const next = P.ascentOf(prev) + 1;

  const [age, setAge] = useState<AgeBand | null>(prev.answers.age);
  const [health, setHealth] = useState<Precaution[] | 'unknown'>(prev.answers.precautions);
  const [confirmed, setConfirmed] = useState(false);
  const [levels, setLevels] = useState<Record<string, Intensity | null>>(() =>
    Object.fromEntries(defaults.choices.map((ch) => [ch.habitId, ch.intensity])),
  );
  const [custom, setCustom] = useState<string[]>(defaults.custom);
  const [own, setOwn] = useState(prev.answers.ownSessions ?? 3);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const answers: P.PilotAnswers = {
    ...prev.answers,
    age: age ?? prev.answers.age,
    precautions: health,
    ...(levels.strength_log === 'challenge' ? { ownSessions: own } : {}),
  };
  const choices: P.PilotChoice[] = Object.entries(levels)
    .filter((e): e is [P.PilotHabitId, Intensity] => e[1] !== null && P.isPilotHabit(e[0]))
    .map(([habitId, intensity]) => ({ habitId, intensity }));
  const problems = age === 'u16' ? ['Schwung is made for people 16 and older.'] : P.setupProblems(answers, choices);
  const ready = confirmed && !!age && choices.length > 0 && problems.length === 0;

  const toggleHealth = (id: Precaution) => {
    setConfirmed(true);
    setHealth((h) => {
      const list = h === 'unknown' ? [] : h;
      return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    });
  };

  const begin = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setNote(null);
    const program = P.beginAscent(prev, answers, choices, custom, toDateKey(pilotNow(offset)), today, CROP_COUNT);
    if (!program) {
      setBusy(false);
      setNote('That set-up can’t start as it is. Check the habits marked above.');
      return;
    }
    const r = await startNewAscent(program);
    setBusy(false);
    if (!r.ok) {
      haptic.warning();
      setNote(
        r.reason === 'held'
          ? 'Some saved data is waiting to be recovered, so nothing was changed.'
          : 'The new ascent couldn’t be saved just now. Nothing was changed; please try again.',
      );
      return;
    }
    haptic.success();
    // Day 1's ceremony comes up over Habits by itself (it's Day 1, not yet seen).
    if (router.canDismiss()) router.dismissAll();
    router.replace('/today');
  };

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Begin a New Ascent" action="Cancel" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View entering={rise(0)} style={{ gap: space.sm }}>
          <T v="overline" color={t.lavender.ink}>
            Ascent {next} · 66 days from today
          </T>
          <T color={c.textDim}>
            Your journey so far is kept in Past journeys, with its story. Your lifetime XP and collection come with you.
          </T>
        </Animated.View>

        <ThemedView style={[styles.panel, { backgroundColor: c.surface }]}>
          <Section title="Still right?" hint="These keep your targets safe. Change anything that has changed.">
            <T v="caption" color={c.textDim} style={{ fontWeight: '700' }}>
              Your age
            </T>
            <Chips
              items={AGES}
              selected={(id) => age === id}
              onPress={(id) => {
                setAge(id);
                setConfirmed(true);
              }}
            />
            <T v="caption" color={c.textDim} style={{ fontWeight: '700', marginTop: space.sm }}>
              Anything to keep in mind?
            </T>
            <View style={setupStyles.chips}>
              {HEALTH.map((h) => (
                <Chip
                  key={h.id}
                  label={h.label}
                  on={health !== 'unknown' && health.includes(h.id)}
                  onPress={() => toggleHealth(h.id)}
                />
              ))}
              <Chip
                label="Prefer not to say"
                on={health === 'unknown'}
                onPress={() => {
                  setConfirmed(true);
                  setHealth('unknown');
                }}
              />
            </View>
          </Section>
          <Chip
            label={confirmed ? 'Confirmed' : 'Yes, these are still right'}
            on={confirmed}
            onPress={() => {
              haptic.select();
              setConfirmed(true);
            }}
          />
        </ThemedView>

        <Section title="Your habits" hint="Each starts at the level it reached. Change a level, or leave a habit out.">
          {defaults.choices.map(({ habitId }) => {
            const on = levels[habitId] !== null;
            return (
              <View key={habitId} style={{ gap: space.xs }}>
                {on ? (
                  <IntensityCard
                    id={habitId}
                    answers={answers}
                    chosen={levels[habitId] ?? null}
                    onChoose={(i) => setLevels((l) => ({ ...l, [habitId]: i }))}
                    own={own}
                    setOwn={setOwn}
                    onRemove={() => setLevels((l) => ({ ...l, [habitId]: null }))}
                  />
                ) : null}
                <HabitToggle
                  label={on ? `Leave out ${P.habitName(habitId)}` : `Keep ${P.habitName(habitId)}`}
                  on={on}
                  onPress={() =>
                    setLevels((l) => ({
                      ...l,
                      [habitId]: on
                        ? null
                        : (defaults.choices.find((ch) => ch.habitId === habitId)?.intensity ?? 'starter'),
                    }))
                  }
                />
              </View>
            );
          })}
          {defaults.custom.map((id) => (
            <ThemedView key={id} style={[styles.custom, { backgroundColor: c.surface }]}>
              <View style={{ flex: 1 }}>
                <T v="bodyStrong">{P.nameOf(prev, id)}</T>
                <T v="caption" color={c.textDim}>
                  Your habit
                </T>
              </View>
              <Chip
                label={custom.includes(id) ? 'Kept' : 'Left out'}
                on={custom.includes(id)}
                onPress={() => setCustom((k) => (k.includes(id) ? k.filter((x) => x !== id) : [...k, id]))}
              />
            </ThemedView>
          ))}
          <T v="caption" color={c.textFaint}>
            You can add more habits once you’ve begun.
          </T>
        </Section>

        {problems.length && confirmed ? (
          <View style={{ gap: 4 }}>
            {problems.map((p) => (
              <T key={p} v="caption" color={c.danger}>
                {p}
              </T>
            ))}
          </View>
        ) : null}

        <Button
          label={busy ? 'Beginning…' : `Begin Ascent ${next}`}
          onPress={() => void begin()}
          disabled={!ready || busy}
        />
        {!confirmed ? (
          <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
            Confirm your answers above to begin.
          </T>
        ) : null}
        {note ? (
          <T v="caption" color={c.textDim} accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
            {note}
          </T>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

/** Keep or leave out one of the previous habits (left out, it shows as a single "Keep" chip). */
function HabitToggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: on ? 'flex-end' : 'flex-start' }}>
      <Chip
        label={label}
        on={!on}
        onPress={() => {
          haptic.select();
          onPress();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  panel: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  custom: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg },
});
