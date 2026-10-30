import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { INTENSITIES, PULL_MINUTES_OPTIONS, SKILLS, type Intensity } from '../../core/reset/habits';
import * as P from '../../core/reset/pilot';
import type { ActiveDays, AgeBand, PhoneHours, Precaution } from '../../core/reset/profile';
import { haptic } from '../../lib/haptics';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { T } from '../ui';
import { t, type TKey } from '../../i18n';
import { useT } from '../../i18n/react';

/*
 * The pieces set-up and "Add a habit" share: the answer chips, the questions a habit needs, and a habit's intensity.
 */

export const AGES: { id: AgeBand; label: string }[] = labelled('setup.age', [
  'u16',
  '16_17',
  '18_29',
  '30_49',
  '50_64',
  '65p',
]);
export const HEALTH: { id: Precaution; label: string }[] = labelled('setup.health', [
  'joint',
  'walkingDifficult',
  'heart',
  'pregnancy',
  'fluidLimit',
  'sleepCondition',
]);
export const PHONE: { id: PhoneHours; label: string }[] = labelled('setup.phone', [
  'lt1',
  '1_2',
  '2_4',
  '4_6',
  '6p',
  'unknown',
]);
export const ACTIVE: { id: ActiveDays; label: string }[] = labelled('setup.active', ['0', '1_2', '3_4', '5p']);
export const STARTS: { id: P.StrengthStart; label: string }[] = labelled('setup.start', [
  'new',
  'sometimes',
  'regular',
]);
/** Options whose labels are read in the current language each time they're shown. */
function labelled<K extends string>(ns: string, ids: K[]): { id: K; label: string }[] {
  return ids.map((id) => ({
    id,
    get label() {
      return t(`${ns}.${id}` as TKey);
    },
  }));
}

export const WAKE_TIMES = ['05:30', '06:00', '06:30', '07:00', '07:30', '08:00', '08:30', '09:00', '09:30'];

export const duration = (m: number) =>
  m < 60
    ? t('engine.duration.min', { m })
    : m % 60
      ? t('engine.duration.hoursMinutes', { h: Math.floor(m / 60), mm: m % 60 })
      : t('engine.duration.hours', { h: m / 60 });

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
  const tt = useT();
  const q = (title: string) => (bare ? '' : title);
  return (
    <>
      {needs.includes('phone') ? (
        <Section title={q(tt('setup.baseline.phone'))}>
          <Chips items={PHONE} selected={(x) => v.phone === x} onPress={v.setPhone} />
        </Section>
      ) : null}
      {needs.includes('pullMinutes') ? (
        <Section title={q(tt('setup.baseline.pull'))} hint={tt('setup.baseline.pullHint')}>
          <Chips
            items={PULL_MINUTES_OPTIONS.map((m) => ({
              id: m,
              label: m === 240 ? tt('setup.fourHoursPlus') : duration(m),
            }))}
            selected={(m) => v.pull === m}
            onPress={v.setPull}
          />
        </Section>
      ) : null}
      {needs.includes('wake') ? (
        <Section title={q(tt('setup.baseline.wake'))} hint={tt('setup.baseline.wakeHint')}>
          <Chips
            items={WAKE_TIMES.map((t) => ({ id: t, label: t }))}
            selected={(t) => v.wake?.kind === 'time' && v.wake.time === t}
            onPress={(t) => v.setWake({ kind: 'time', time: t })}
          />
          <View style={setupStyles.chips}>
            <Chip
              label={tt('setup.q.variesALot')}
              on={v.wake?.kind === 'varies'}
              onPress={() => v.setWake({ kind: 'varies' })}
            />
            <Chip
              label={tt('setup.q.workShifts')}
              on={v.wake?.kind === 'shift'}
              onPress={() => v.setWake({ kind: 'shift' })}
            />
          </View>
        </Section>
      ) : null}
      {needs.includes('activeDays') ? (
        <Section title={q(tt('setup.baseline.active'))}>
          <Chips items={ACTIVE} selected={(x) => v.active === x} onPress={v.setActive} />
        </Section>
      ) : null}
      {needs.includes('skill') ? (
        <Section title={q(tt('setup.baseline.skill'))}>
          <Chips
            items={SKILLS.map((x) => ({ id: x, label: P.skillName(x) }))}
            selected={(x) => v.skill === x}
            onPress={v.setSkill}
          />
        </Section>
      ) : null}
      {needs.includes('strengthStart') ? (
        <Section title={q(tt('setup.baseline.strength'))}>
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
  const tt = useT();
  const reason = P.habitExclusion(id, answers);
  const options = P.intensityOptions(id, answers);
  const preview = chosen && !reason ? P.previewTarget(id, chosen, answers) : null;
  return (
    <ThemedView style={[setupStyles.level, { backgroundColor: c.surface }]}>
      <T v="bodyStrong">{P.habitName(id)}</T>
      {reason ? (
        <>
          <T v="caption" color={c.danger}>
            {tt('setup.intensity.notAvailable', { reason })}
          </T>
          {onRemove ? <Chip label={tt('setup.intensity.removeIt')} on={false} onPress={onRemove} /> : null}
        </>
      ) : (
        <>
          <View style={setupStyles.chips}>
            {INTENSITIES.map((i) => {
              const blocked = options.find((o) => o.intensity === i)?.reason;
              return (
                <Chip
                  key={i}
                  label={P.intensityName(i)}
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
                {tt('setup.intensity.ownSessions')}
              </T>
              <Chip label="−" on={false} onPress={() => setOwn((n) => Math.max(2, n - 1))} />
              <T v="bodyStrong">{own}</T>
              <Chip label="+" on={false} onPress={() => setOwn((n) => Math.min(7, n + 1))} />
            </View>
          ) : null}
          {preview ? (
            <T v="caption" color={c.textDim}>
              {tt('setup.intensity.preview', preview)}
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
