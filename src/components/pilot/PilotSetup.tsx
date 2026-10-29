import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { INTENSITIES, PULL_MINUTES_OPTIONS, SKILLS, type Intensity } from '../../core/reset/habits';
import * as P from '../../core/reset/pilot';
import type { ActiveDays, AgeBand, PhoneHours, Precaution } from '../../core/v2/types';
import { haptic } from '../../lib/haptics';
import { useFieldNotes } from '../../store/fieldNotes';
import { useResetPilot } from '../../store/resetPilot';
import { useApp } from '../../store/useApp';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Button, Screen, T } from '../ui';

// The existing questions' answers, with their existing wording.
const AGES: { id: AgeBand; label: string }[] = [
  { id: 'u16', label: 'Under 16' },
  { id: '16_17', label: '16–17' },
  { id: '18_29', label: '18–29' },
  { id: '30_49', label: '30–49' },
  { id: '50_64', label: '50–64' },
  { id: '65p', label: '65+' },
];
const HEALTH: { id: Precaution; label: string }[] = [
  { id: 'joint', label: 'Joint, back or injury pain' },
  { id: 'walkingDifficult', label: 'Walking or standing for long is difficult for me' },
  { id: 'heart', label: 'Heart or blood-pressure condition' },
  { id: 'pregnancy', label: 'Pregnant or recently gave birth' },
  { id: 'fluidLimit', label: 'A clinician told me to limit fluids' },
  { id: 'sleepCondition', label: 'Diagnosed sleep condition' },
];
const PHONE: { id: PhoneHours; label: string }[] = [
  { id: 'lt1', label: 'Under 1 h' },
  { id: '1_2', label: '1–2 h' },
  { id: '2_4', label: '2–4 h' },
  { id: '4_6', label: '4–6 h' },
  { id: '6p', label: '6 h+' },
  { id: 'unknown', label: 'Not sure' },
];
const ACTIVE: { id: ActiveDays; label: string }[] = [
  { id: '0', label: '0' },
  { id: '1_2', label: '1–2' },
  { id: '3_4', label: '3–4' },
  { id: '5p', label: '5+' },
];
const STARTS: { id: P.StrengthStart; label: string }[] = [
  { id: 'new', label: 'New to it' },
  { id: 'sometimes', label: 'Sometimes' },
  { id: 'regular', label: 'Regularly' },
];
const WAKE_TIMES = ['05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30'];

const duration = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}`);

type Step = 'about' | 'habits' | 'details' | 'levels' | 'review';

/**
 * The Life Reset set-up (development and internal builds, where it's how every new program starts: see
 * app/life-reset/setup.tsx): about you, the
 * habits you want, only the questions those habits need, how hard each starts and the time you have, then a review.
 * Nothing is pre-selected; a manageable first set is suggested.
 */
export function PilotSetup() {
  const { c } = useTheme();
  // One Life Reset at a time: with one saved, set-up never runs again (it would never replace it either: start()).
  const running = useResetPilot((s) => s.program !== null);
  const previous = useApp((s) => s.startedAt !== null);
  // The program's own answers, read only, so nothing is asked twice. Never changed here.
  const known = useApp((s) => (s.profile && s.profile.age !== 'u16' ? s.profile : null));
  const [step, setStep] = useState<Step>('about');
  const [age, setAge] = useState<AgeBand | null>(known?.age ?? null);
  const [health, setHealth] = useState<Precaution[] | 'unknown' | null>(known ? known.precautions : null);
  const [picked, setPicked] = useState<P.PilotHabitId[]>([]);
  const [levels, setLevels] = useState<Partial<Record<string, Intensity>>>({});
  const [minutes, setMinutes] = useState<number | null>(null);
  const [phone, setPhone] = useState<PhoneHours | undefined>(known?.phone);
  const [pull, setPull] = useState<number | undefined>(undefined);
  const [wake, setWake] = useState<P.PilotAnswers['wake']>(known?.wake);
  const [active, setActive] = useState<ActiveDays | undefined>(known?.activeDays);
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
    // Open into the Life Reset (Field Notes is retired; its data stays where it was).
    useFieldNotes.getState().setActive(false);
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
            {previous ? (
              <T color={c.textDim}>
                Your current program stays saved, with all its history. You can switch back to it any time in Settings.
              </T>
            ) : (
              <T color={c.textDim}>66 days, a few habits you choose, each growing with you. It takes about a minute.</T>
            )}
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
              <View style={styles.chips}>
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
                      styles.habit,
                      {
                        backgroundColor: c.surface,
                        borderColor: on ? c.accentInk : c.border,
                        opacity: reason || full ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={c.accentInk} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={styles.row}>
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
            {baselines.includes('phone') ? (
              <Section title="Less Scrolling: how long are you on your phone a day?">
                <Chips items={PHONE} selected={(x) => phone === x} onPress={setPhone} />
              </Section>
            ) : null}
            {baselines.includes('pullMinutes') ? (
              <Section
                title="And on your main app (the one that pulls you in most)?"
                hint="Settings → Screen Time shows it, if you want the real number."
              >
                <Chips
                  items={PULL_MINUTES_OPTIONS.map((m) => ({ id: m, label: m === 240 ? '4 h+' : duration(m) }))}
                  selected={(m) => pull === m}
                  onPress={setPull}
                />
              </Section>
            ) : null}
            {baselines.includes('wake') ? (
              <Section
                title="Sleep Routine: when do you usually get up?"
                hint="Your own time is the anchor; never earlier."
              >
                <Chips
                  items={WAKE_TIMES.map((t) => ({ id: t, label: t }))}
                  selected={(t) => wake?.kind === 'time' && wake.time === t}
                  onPress={(t) => setWake({ kind: 'time', time: t })}
                />
                <View style={styles.chips}>
                  <Chip
                    label="It varies a lot"
                    on={wake?.kind === 'varies'}
                    onPress={() => setWake({ kind: 'varies' })}
                  />
                  <Chip label="I work shifts" on={wake?.kind === 'shift'} onPress={() => setWake({ kind: 'shift' })} />
                </View>
              </Section>
            ) : null}
            {baselines.includes('activeDays') ? (
              <Section title="Daily Movement: on how many days a week are you active now?">
                <Chips items={ACTIVE} selected={(x) => active === x} onPress={setActive} />
              </Section>
            ) : null}
            {baselines.includes('skill') ? (
              <Section title="Practice a Skill: which skill?">
                <Chips
                  items={SKILLS.map((x) => ({ id: x, label: x }))}
                  selected={(x) => skill === x}
                  onPress={setSkill}
                />
              </Section>
            ) : null}
            {baselines.includes('strengthStart') ? (
              <Section title="Strength Training: where are you starting from?">
                <Chips items={STARTS} selected={(x) => start === x} onPress={setStart} />
                {P.habitNotes('strength_log', answers).map((n) => (
                  <T key={n} v="caption" color={c.textFaint}>
                    {n}
                  </T>
                ))}
              </Section>
            ) : null}
          </>
        ) : null}

        {step === 'levels' ? (
          <>
            <T v="title" accessibilityRole="header">
              How hard to start
            </T>
            <T color={c.textDim}>Starter is a manageable beginning. Every habit starts at its Foundation level.</T>
            {picked.map((id) => {
              const reason = P.habitExclusion(id, answers);
              const options = P.intensityOptions(id, answers);
              const chosen = intensityOf(id);
              const preview = chosen && !reason ? P.previewTarget(id, chosen, answers) : null;
              return (
                <ThemedView key={id} style={[styles.level, { backgroundColor: c.surface }]}>
                  <T v="bodyStrong">{P.habitName(id)}</T>
                  {reason ? (
                    <>
                      <T v="caption" color={c.danger}>
                        Not available: {reason}.
                      </T>
                      <Chip label="Remove it" on={false} onPress={() => setPicked((p) => p.filter((x) => x !== id))} />
                    </>
                  ) : (
                    <>
                      <View style={styles.chips}>
                        {INTENSITIES.map((i) => {
                          const blocked = options.find((o) => o.intensity === i)?.reason;
                          return (
                            <Chip
                              key={i}
                              label={P.INTENSITY_NAME[i]}
                              on={chosen === i}
                              disabled={!!blocked}
                              onPress={() => setLevels((l) => ({ ...l, [id]: i }))}
                            />
                          );
                        })}
                      </View>
                      {id === 'strength_log' && chosen === 'challenge' ? (
                        <View style={styles.row}>
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
                          {preview.target} · {preview.frequency}
                        </T>
                      ) : null}
                    </>
                  )}
                </ThemedView>
              );
            })}
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
                <ThemedView key={x.habitId} style={[styles.level, { backgroundColor: c.surface }]}>
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

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
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
        <Chip
          key={String(x.id)}
          label={x.label}
          on={selected(x.id)}
          onPress={() => {
            haptic.tap();
            onPress(x.id);
          }}
        />
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
  section: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tag: { fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  habit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
  },
  level: { borderRadius: radius.lg, padding: space.md, gap: space.sm },
});
