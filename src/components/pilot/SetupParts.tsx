import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { INTENSITIES, PULL_MINUTES_OPTIONS, SKILLS, type Intensity } from '../../core/reset/habits';
import * as P from '../../core/reset/pilot';
import type { ActiveDays, AgeBand, PhoneHours, Precaution } from '../../core/reset/profile';
import { haptic } from '../../lib/haptics';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { T } from '../ui';

/*
 * The pieces set-up and "Add a habit" share: the answer chips, the questions a habit needs, and a habit's intensity.
 */

export const AGES: { id: AgeBand; label: string }[] = [
  { id: 'u16', label: 'Under 16' },
  { id: '16_17', label: '16–17' },
  { id: '18_29', label: '18–29' },
  { id: '30_49', label: '30–49' },
  { id: '50_64', label: '50–64' },
  { id: '65p', label: '65+' },
];
export const HEALTH: { id: Precaution; label: string }[] = [
  { id: 'joint', label: 'Joint, back or injury pain' },
  { id: 'walkingDifficult', label: 'Walking or standing for long is difficult for me' },
  { id: 'heart', label: 'Heart or blood-pressure condition' },
  { id: 'pregnancy', label: 'Pregnant or recently gave birth' },
  { id: 'fluidLimit', label: 'A clinician told me to limit fluids' },
  { id: 'sleepCondition', label: 'Diagnosed sleep condition' },
];
export const PHONE: { id: PhoneHours; label: string }[] = [
  { id: 'lt1', label: 'Under 1 h' },
  { id: '1_2', label: '1–2 h' },
  { id: '2_4', label: '2–4 h' },
  { id: '4_6', label: '4–6 h' },
  { id: '6p', label: '6 h+' },
  { id: 'unknown', label: 'Not sure' },
];
export const ACTIVE: { id: ActiveDays; label: string }[] = [
  { id: '0', label: '0' },
  { id: '1_2', label: '1–2' },
  { id: '3_4', label: '3–4' },
  { id: '5p', label: '5+' },
];
export const STARTS: { id: P.StrengthStart; label: string }[] = [
  { id: 'new', label: 'New to it' },
  { id: 'sometimes', label: 'Sometimes' },
  { id: 'regular', label: 'Regularly' },
];
export const WAKE_TIMES = ['05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30'];

export const duration = (m: number) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}`);

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={setupStyles.section}>
      {title ? (
        <T v="bodyStrong" accessibilityRole="header">
          {title}
        </T>
      ) : null}
      {hint ? (
        <T v="caption" color={c.textDim}>
          {hint}
        </T>
      ) : null}
      {children}
    </View>
  );
}

export function Chips<K extends string | number>({
  items,
  selected,
  onPress,
}: {
  items: { id: K; label: string }[];
  selected: (id: K) => boolean;
  onPress: (id: K) => void;
}) {
  return (
    <View style={setupStyles.chips}>
      {items.map((x) => (
        <Chip
          key={String(x.id)}
          label={x.label}
          on={selected(x.id)}
          onPress={() => {
            haptic.select();
            onPress(x.id);
          }}
        />
      ))}
    </View>
  );
}

export function Chip({
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
          setupStyles.chip,
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

/** The answers the baseline questions fill in, each with its setter. */
export type BaselineAnswers = {
  phone?: PhoneHours;
  setPhone: (v: PhoneHours) => void;
  pull?: number;
  setPull: (v: number) => void;
  wake?: P.PilotAnswers['wake'];
  setWake: (v: P.PilotAnswers['wake']) => void;
  active?: ActiveDays;
  setActive: (v: ActiveDays) => void;
  skill?: string;
  setSkill: (v: string) => void;
  start?: P.StrengthStart;
  setStart: (v: P.StrengthStart) => void;
};

/** Only the questions the chosen habits need. */
export function BaselineQuestions({
  needs,
  values: v,
  answers,
  bare,
}: {
  needs: P.Baseline[];
  values: BaselineAnswers;
  answers: P.PilotAnswers;
  /** Without each question's own title (the screen asks it). */
  bare?: boolean;
}) {
  const { c } = useTheme();
  const q = (title: string) => (bare ? '' : title);
  return (
    <>
      {needs.includes('phone') ? (
        <Section title={q('Less Scrolling: how long are you on your phone a day?')}>
          <Chips items={PHONE} selected={(x) => v.phone === x} onPress={v.setPhone} />
        </Section>
      ) : null}
      {needs.includes('pullMinutes') ? (
        <Section
          title={q('And on your main app (the one that pulls you in most)?')}
          hint="Settings → Screen Time shows it, if you want the real number."
        >
          <Chips
            items={PULL_MINUTES_OPTIONS.map((m) => ({ id: m, label: m === 240 ? '4 h+' : duration(m) }))}
            selected={(m) => v.pull === m}
            onPress={v.setPull}
          />
        </Section>
      ) : null}
      {needs.includes('wake') ? (
        <Section
          title={q('Sleep Routine: when do you usually get up?')}
          hint="Your own time is the anchor; never earlier."
        >
          <Chips
            items={WAKE_TIMES.map((t) => ({ id: t, label: t }))}
            selected={(t) => v.wake?.kind === 'time' && v.wake.time === t}
            onPress={(t) => v.setWake({ kind: 'time', time: t })}
          />
          <View style={setupStyles.chips}>
            <Chip
              label="It varies a lot"
              on={v.wake?.kind === 'varies'}
              onPress={() => v.setWake({ kind: 'varies' })}
            />
            <Chip label="I work shifts" on={v.wake?.kind === 'shift'} onPress={() => v.setWake({ kind: 'shift' })} />
          </View>
        </Section>
      ) : null}
      {needs.includes('activeDays') ? (
        <Section title={q('Daily Movement: on how many days a week are you active now?')}>
          <Chips items={ACTIVE} selected={(x) => v.active === x} onPress={v.setActive} />
        </Section>
      ) : null}
      {needs.includes('skill') ? (
        <Section title={q('Practice a Skill: which skill?')}>
          <Chips
            items={SKILLS.map((x) => ({ id: x, label: x }))}
            selected={(x) => v.skill === x}
            onPress={v.setSkill}
          />
        </Section>
      ) : null}
      {needs.includes('strengthStart') ? (
        <Section title={q('Strength Training: where are you starting from?')}>
          <Chips items={STARTS} selected={(x) => v.start === x} onPress={v.setStart} />
          {P.habitNotes('strength_log', answers).map((n) => (
            <T key={n} v="caption" color={c.textFaint}>
              {n}
            </T>
          ))}
        </Section>
      ) : null}
    </>
  );
}

/** A habit's intensity choice (with why one isn't available), its own sessions for Strength at Challenge, and a preview. */
export function IntensityCard({
  id,
  answers,
  chosen,
  onChoose,
  own,
  setOwn,
  onRemove,
}: {
  id: string;
  answers: P.PilotAnswers;
  chosen: Intensity | null;
  onChoose: (i: Intensity) => void;
  own: number;
  setOwn: (f: (n: number) => number) => void;
  /** Set-up only: take a habit that turned out unavailable back out. */
  onRemove?: () => void;
}) {
  const { c } = useTheme();
  const reason = P.habitExclusion(id, answers);
  const options = P.intensityOptions(id, answers);
  const preview = chosen && !reason ? P.previewTarget(id, chosen, answers) : null;
  return (
    <ThemedView style={[setupStyles.level, { backgroundColor: c.surface }]}>
      <T v="bodyStrong">{P.habitName(id)}</T>
      {reason ? (
        <>
          <T v="caption" color={c.danger}>
            Not available: {reason}.
          </T>
          {onRemove ? <Chip label="Remove it" on={false} onPress={onRemove} /> : null}
        </>
      ) : (
        <>
          <View style={setupStyles.chips}>
            {INTENSITIES.map((i) => {
              const blocked = options.find((o) => o.intensity === i)?.reason;
              return (
                <Chip
                  key={i}
                  label={P.INTENSITY_NAME[i]}
                  on={chosen === i}
                  disabled={!!blocked}
                  onPress={() => onChoose(i)}
                />
              );
            })}
          </View>
          {id === 'strength_log' && chosen === 'challenge' ? (
            <View style={setupStyles.row}>
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
}

export const setupStyles = StyleSheet.create({
  section: { gap: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  level: { borderRadius: radius.lg, padding: space.md, gap: space.sm },
  habit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.md,
  },
});
