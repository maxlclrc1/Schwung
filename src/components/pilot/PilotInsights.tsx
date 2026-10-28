import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as P from '../../core/reset/pilot';
import { haptic } from '../../lib/haptics';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { DayStrip, HabitInsight, Overview, SectionTitle, WeekBars } from '../Insights';
import { Button, T } from '../ui';

/**
 * Insights for the Life Reset (testing builds): the overview, then each habit with its consistency, its week and
 * its history, and, a tap away, its details and difficulty. Less Scrolling adds the optional weekly Screen Time
 * check. Numbers come from the saved days only (reset/pilot.ts: habitTally, weekTally, recentDays, habitWeeks).
 */
export function PilotInsights() {
  const program = useResetPilot((s) => s.program)!;
  const offset = useResetPilot((s) => s.devDayOffset);
  const today = pilotToday({ program, devDayOffset: offset });
  const data = useMemo(
    () => ({
      overall: P.overallTally(program, today),
      total: P.totalCompleted(program),
      streak: P.pilotStreak(program, today),
      week: P.weekTally(program, today),
    }),
    [program, today],
  );

  return (
    <>
      <Overview {...data} day={today} />
      <SectionTitle>Your habits</SectionTitle>
      {program.habits.map((id) => {
        const week = P.weekProgress(program, id, today);
        const level = P.levelFor(program, id, today);
        const subtitle = week
          ? week.goal === 0
            ? `${P.levelLabel(level)} · a short week, no goal`
            : `${P.levelLabel(level)} · ${week.credited} of ${week.goal} this week`
          : `${P.levelLabel(level)} · every day`;
        return (
          <HabitInsight
            key={id}
            title={P.habitName(id)}
            subtitle={subtitle}
            tally={P.habitTally(program, id, today)}
            history={
              week ? (
                <WeekBars weeks={P.habitWeeks(program, id, today)} />
              ) : (
                <DayStrip days={P.recentDays(program, id, today)} />
              )
            }
          >
            <T v="caption">{P.targetText(program, id, today)}</T>
            {id === 'strength_log' ? <StrengthWeeks program={program} today={today} /> : null}
            <Button
              label="Details, corrections & difficulty"
              kind="secondary"
              onPress={() => router.push(`/pilot/${id}`)}
            />
          </HabitInsight>
        );
      })}
      {program.habits.includes('screen_app_limit') ? <ScreenTimeCheck program={program} today={today} /> : null}
    </>
  );
}

/** Strength Training: sessions logged each week, against the week's target. */
function StrengthWeeks({ program, today }: { program: P.PilotProgram; today: number }) {
  const { c } = useTheme();
  const weeks = P.habitWeeks(program, 'strength_log', today);
  return (
    <View style={{ gap: 2 }}>
      {weeks
        .slice(-6)
        .reverse()
        .map((w) => (
          <T key={w.week} v="caption" color={c.textDim}>
            Week {w.week}: {w.credited + w.extra} session{w.credited + w.extra === 1 ? '' : 's'}
            {w.goal ? ` · target ${w.goal}` : ''}
          </T>
        ))}
    </View>
  );
}

/** Less Scrolling's optional weekly check: the person's own Screen Time reading, never checked by Schwung. */
function ScreenTimeCheck({ program, today }: { program: P.PilotProgram; today: number }) {
  const { c } = useTheme();
  const saved = P.screenTimeFor(program, today);
  const [value, setValue] = useState(saved?.minutesPerDay ?? program.answers.pullMinutes ?? 60);
  const limit = P.scrollLimitFor(program, P.levelFor(program, 'screen_app_limit', today));
  return (
    <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
      <T v="bodyStrong">This week’s Screen Time (optional)</T>
      <T v="caption" color={c.textDim}>
        Settings → Screen Time shows your daily average for your main app. Enter it if you like: it stays on your phone
        and never changes a day or your streak. Your limit is {limit} min a day.
      </T>
      <View style={styles.stepper}>
        <Button label="−15" kind="secondary" style={styles.step} onPress={() => setValue((v) => Math.max(0, v - 15))} />
        <T v="heading" style={styles.value}>
          {value} min
        </T>
        <Button
          label="+15"
          kind="secondary"
          style={styles.step}
          onPress={() => setValue((v) => Math.min(1440, v + 15))}
        />
      </View>
      <Button
        label={saved ? `Update (saved: ${saved.minutesPerDay} min)` : 'Save this week'}
        onPress={() => {
          useResetPilot.getState().setScreenTime(value);
          haptic.success();
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  step: { width: 72 },
  value: { flex: 1, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
