import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { ExerciseGuide, SelfCheckToggle } from '../../components/Exercise';
import { SheetHeader } from '../../components/SheetHeader';
import { Button, Card, LEVEL_LABEL, Screen, T } from '../../components/ui';
import { habitTask } from '../../core/habits';
import { scheduleLabel, WEEKDAY_LONG, WEEKDAY_SHORT, WEEKDAYS, weekdayOfDay } from '../../core/schedule';
import type { Weekday } from '../../core/types';
import {
  CHECK_BLOCKED_MESSAGE,
  CHECK_FOR,
  CHECK_QUESTIONS,
  EXCLUSIONS,
  EXERCISE_CONTENT,
  EXERCISE_LADDERS,
  SUGGESTED_DAYS,
  validExerciseDays,
  type ExerciseId,
} from '../../core/v2/exercise';
import {
  accept,
  canStart,
  changeDays,
  decline,
  exercisePreview,
  goTo,
  logToday,
  PERSONAS,
  simDue,
  simHabit,
  simOffered,
  simRun,
  startSim,
  type Sim,
} from '../../core/v2/exercisePreview';
import type { CheckAnswer, ExerciseCheck, ExerciseCheckKey } from '../../core/v2/types';
import { BY_ID } from '../../core/v2/library';
import { radius, space, useTheme } from '../../theme';

/**
 * Developer → Exercise Preview. Development builds only: synthetic profiles, the four exercise prototypes and a
 * mock program running the real scheduling and progression logic. It never reads or writes the saved program,
 * and the preview gate only lifts the prototype hold: every eligibility rule and safety check still applies.
 */
export default function ExercisePreview() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Preview />;
}

const STATUS = (excluded: string | null, check: string) =>
  excluded
    ? `Not offered: ${excluded}`
    : check === 'needed'
      ? 'Needs the safety check'
      : check === 'blocked'
        ? 'Ruled out by the safety check'
        : 'Eligible';

function Preview() {
  const { c } = useTheme();
  const [persona, setPersona] = useState(0);
  const [checks, setChecks] = useState<ExerciseCheck>({});
  const [selected, setSelected] = useState<ExerciseId>('move_strength_prep');
  const profile = useMemo(() => ({ ...PERSONAS[persona].profile, exerciseCheck: checks }), [persona, checks]);
  const { plan, exercises } = useMemo(() => exercisePreview(profile), [profile]);
  const [days, setDays] = useState<Weekday[]>(SUGGESTED_DAYS.move_strength_prep!);
  const [sim, setSim] = useState<Sim | null>(null);

  const select = (id: ExerciseId) => {
    setSelected(id);
    setDays(SUGGESTED_DAYS[id] ?? []);
    setSim(null);
  };
  const start = canStart(selected, profile);

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Exercise preview" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <T v="caption" color={c.textDim}>
          Development only. Synthetic profiles and a mock program: nothing here touches your real program. The four
          exercise habits are prototypes, not clinically reviewed, and are never offered in normal plans.
        </T>

        <Section title="Profile">
          <Chips
            items={PERSONAS.map((p) => p.name)}
            selected={[persona]}
            onPress={(i) => {
              setPersona(i);
              setSim(null);
            }}
          />
        </Section>

        <Section title="What the engine offers (prototypes unlocked)">
          {plan.status !== 'ok' ? (
            <T>Not eligible.</T>
          ) : (
            <Card style={{ gap: space.xs }}>
              {plan.picks.map((x) => (
                <T key={x.id} v="caption">
                  • {x.title}: {x.targets.easy}
                  {BY_ID[x.id].release === 'prototype' ? ' (prototype)' : ''}
                </T>
              ))}
              {plan.choice ? (
                <T v="caption" color={c.textDim}>
                  {plan.choice.required ? `Choose ${plan.choice.required} more` : 'Optional choice'}:{' '}
                  {plan.options.map((o) => o.title).join(', ')}
                </T>
              ) : null}
              {plan.planNotes.map((n) => (
                <T key={n} v="caption" color={c.textDim}>
                  {n}
                </T>
              ))}
            </Card>
          )}
        </Section>

        <Section title="Exercise habits">
          {exercises.map((e) => (
            <Pressable
              key={e.id}
              onPress={() => select(e.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: selected === e.id }}
              accessibilityLabel={`${e.title}. ${STATUS(e.excluded, e.check)}`}
              style={[
                styles.row,
                {
                  backgroundColor: selected === e.id ? c.accentSoft : c.surface,
                  borderColor: selected === e.id ? c.accentInk : 'transparent',
                },
              ]}
            >
              <T v="bodyStrong">{e.title}</T>
              <T v="caption" color={e.excluded || e.check === 'blocked' ? c.textDim : c.accentInk}>
                {STATUS(e.excluded, e.check)}
              </T>
            </Pressable>
          ))}
        </Section>

        <Section title={BY_ID[selected].title}>
          <T color={c.textDim}>{EXERCISE_CONTENT[selected].forWhom}</T>
          <Card style={{ gap: space.xs }}>
            {(['easy', 'medium', 'hard'] as const).map((l, i) => (
              <T key={l} v="caption">
                <T v="caption" style={{ fontWeight: '800' }}>
                  {LEVEL_LABEL[l]}{' '}
                </T>
                {EXERCISE_LADDERS[selected][i]}
              </T>
            ))}
          </Card>
          <ExerciseGuide id={selected} />
          <T v="overline" color={c.textDim}>
            Never offered when
          </T>
          {EXCLUSIONS[selected].map((x) => (
            <T key={x} v="caption" color={c.textDim}>
              • {x}
            </T>
          ))}
        </Section>

        {CHECK_FOR[selected].length ? (
          <Section title="Safety check">
            {CHECK_FOR[selected].map((k) => (
              <CheckQuestion
                key={k}
                k={k}
                value={checks[k]}
                onChange={(v) => {
                  setChecks({ ...checks, [k]: v });
                  setSim(null);
                }}
              />
            ))}
            {exercises.find((e) => e.id === selected)!.check === 'blocked' ? (
              <Card>
                <T v="caption">{CHECK_BLOCKED_MESSAGE}</T>
              </Card>
            ) : null}
          </Section>
        ) : null}

        <Section title="Mock program">
          {selected !== 'move_seated' ? (
            // Keyed by habit so switching habits starts from that habit's suggested days.
            <DayPicker key={selected} id={selected} days={days} onChange={setDays} />
          ) : (
            <T v="caption" color={c.textDim}>
              Daily, with rest whenever needed.
            </T>
          )}
          <Button
            label="Start a mock program"
            disabled={!start.ok || (selected !== 'move_seated' && !validExerciseDays(selected, days))}
            onPress={() => setSim(startSim(selected, profile, selected === 'move_seated' ? undefined : days))}
          />
          {!start.ok ? (
            <T v="caption" color={c.textDim}>
              {start.reason}
            </T>
          ) : null}
          {sim ? <Simulation sim={sim} onChange={setSim} /> : null}
        </Section>
      </ScrollView>
    </Screen>
  );
}

function Simulation({ sim, onChange }: { sim: Sim; onChange: (s: Sim) => void }) {
  const { c } = useTheme();
  const [selfCheck, setSelfCheck] = useState(false);
  const h = simHabit(sim);
  const due = simDue(sim);
  const log = sim.logs[Object.keys(sim.logs).find((k) => sim.logs[k].day === sim.day) ?? ''];
  const state = !due
    ? 'Rest day (not due)'
    : log?.rested?.includes(h.habitId)
      ? 'Resting today (never a miss)'
      : log?.completed.includes(h.habitId)
        ? 'Done today'
        : 'Due today';
  const offered = simOffered(sim);
  const unit = h.schedule ? 'sessions' : 'days';
  return (
    <Card style={{ gap: space.sm }}>
      <T v="bodyStrong" accessibilityRole="header">
        Day {sim.day} · {WEEKDAY_LONG[weekdayOfDay(sim.startKey, sim.day)]}
      </T>
      <T v="caption" color={c.textDim}>
        {state} · {LEVEL_LABEL[h.level]}: {habitTask(h)}
      </T>
      <T v="caption" color={c.textDim}>
        Run: {simRun(sim)} {unit} in a row{h.schedule ? ` · ${scheduleLabel(h.schedule)}` : ''}
        {h.schedule?.history?.length ? ` · ${h.schedule.history.length} earlier schedule(s) kept` : ''}
      </T>
      {due ? (
        <View style={styles.buttons}>
          <Button label="Done" style={styles.flex} onPress={() => onChange(logToday(sim, 'done'))} />
          <Button label="Rest" kind="secondary" style={styles.flex} onPress={() => onChange(logToday(sim, 'rest'))} />
          <Button label="Undone" kind="ghost" style={styles.flex} onPress={() => onChange(logToday(sim, 'undone'))} />
        </View>
      ) : null}
      <View style={styles.buttons}>
        <Button
          label="Next day"
          kind="secondary"
          style={styles.flex}
          onPress={() => onChange(goTo(sim, sim.day + 1))}
        />
        <Button
          label="+7 (not opened)"
          kind="secondary"
          style={styles.flex}
          onPress={() => onChange(goTo(sim, sim.day + 7))}
        />
      </View>
      <View style={styles.buttons}>
        <Button
          label="Day 22"
          kind="ghost"
          style={styles.flex}
          disabled={sim.day >= 22}
          onPress={() => onChange(goTo(sim, 22))}
        />
        <Button
          label="Day 45"
          kind="ghost"
          style={styles.flex}
          disabled={sim.day >= 45}
          onPress={() => onChange(goTo(sim, 45))}
        />
      </View>
      {offered ? (
        <Card style={{ gap: space.sm }}>
          <T v="bodyStrong">{h.schedule ? '7 sessions in a row' : '7 days in a row'}: level up?</T>
          <SelfCheckToggle checked={selfCheck} onChange={setSelfCheck} />
          <View style={styles.buttons}>
            <Button
              label="Level up"
              style={styles.flex}
              disabled={!selfCheck}
              onPress={() => {
                const next = accept(sim, selfCheck);
                if (next) onChange(next);
                setSelfCheck(false);
              }}
            />
            <Button label="Not yet" kind="secondary" style={styles.flex} onPress={() => onChange(decline(sim))} />
          </View>
        </Card>
      ) : null}
      {h.schedule ? (
        <DayPicker
          key={`${h.habitId}-${sim.startKey}`}
          id={h.habitId as ExerciseId}
          days={h.schedule.days}
          label="Change days (from today on)"
          onChange={(d) => {
            const next = changeDays(sim, d);
            if (next) onChange(next);
          }}
        />
      ) : null}
      {sim.events.length ? (
        <View style={{ gap: 2 }}>
          {sim.events.map((e, i) => (
            <T key={i} v="caption" color={c.textDim}>
              {e.kind === 'phaseUp'
                ? `Day ${e.day}: phase ${e.phase}. Exercise habits don’t rise automatically.`
                : `Day ${e.day}: stepped down after 3 missed sessions (never below Easy).`}
            </T>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

function DayPicker({
  id,
  days,
  onChange,
  label = 'Days',
}: {
  id: ExerciseId;
  days: Weekday[];
  onChange: (d: Weekday[]) => void;
  label?: string;
}) {
  const { c } = useTheme();
  const [draft, setDraft] = useState(days);
  const valid = validExerciseDays(id, draft);
  return (
    <View style={{ gap: space.xs }}>
      <T v="caption" color={c.textDim}>
        {label}
      </T>
      <View style={styles.days}>
        {WEEKDAYS.map((w) => {
          const on = draft.includes(w);
          return (
            <Pressable
              key={w}
              onPress={() => {
                const next = on ? draft.filter((d) => d !== w) : [...draft, w];
                setDraft(next);
                if (validExerciseDays(id, next) && next.length) onChange(next);
              }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={WEEKDAY_LONG[w]}
              style={[
                styles.day,
                { backgroundColor: on ? c.accentSoft : c.surface, borderColor: on ? c.accentInk : 'transparent' },
              ]}
            >
              <T v="caption" color={on ? c.accentInk : c.textDim} style={{ fontWeight: '700' }}>
                {WEEKDAY_SHORT[w]}
              </T>
            </Pressable>
          );
        })}
      </View>
      {!valid ? (
        <T v="caption" color={c.accentInk}>
          {id === 'move_balance' ? 'Choose 3 days.' : 'Choose 2 days that aren’t next to each other.'}
        </T>
      ) : null}
    </View>
  );
}

function CheckQuestion({
  k,
  value,
  onChange,
}: {
  k: ExerciseCheckKey;
  value?: CheckAnswer;
  onChange: (v: CheckAnswer) => void;
}) {
  const options: { v: CheckAnswer; label: string }[] = [
    { v: 'yes', label: 'Yes' },
    { v: 'no', label: 'No' },
    { v: 'unsure', label: 'Not sure' },
  ];
  return (
    <View style={{ gap: space.xs }} accessibilityRole="radiogroup" accessibilityLabel={CHECK_QUESTIONS[k].question}>
      <T v="bodyStrong">{CHECK_QUESTIONS[k].question}</T>
      <Chips
        items={options.map((o) => o.label)}
        selected={options.flatMap((o, i) => (o.v === value ? [i] : []))}
        onPress={(i) => onChange(options[i].v)}
      />
    </View>
  );
}

function Chips({ items, selected, onPress }: { items: string[]; selected: number[]; onPress: (i: number) => void }) {
  const { c } = useTheme();
  return (
    <View style={styles.chips}>
      {items.map((label, i) => {
        const on = selected.includes(i);
        return (
          <Pressable
            key={label}
            onPress={() => onPress(i)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={[
              styles.chip,
              { backgroundColor: on ? c.accentSoft : c.surface, borderColor: on ? c.accentInk : 'transparent' },
            ]}
          >
            <T v="caption" color={on ? c.accentInk : c.text} style={{ fontWeight: '700' }}>
              {label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <T v="overline" color={c.textDim} accessibilityRole="header">
        {title}
      </T>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  row: { padding: space.lg, borderRadius: radius.md, borderWidth: 1.5, gap: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 40,
    paddingHorizontal: space.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    justifyContent: 'center',
  },
  days: { flexDirection: 'row', gap: space.xs },
  day: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttons: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
});
