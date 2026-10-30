import { Ionicons } from '@expo/vector-icons';
import { useShownProgram } from '../shownProgram';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PROGRAM_DAYS } from '../../core/dates';
import * as C from '../../core/reset/charts';
import * as O from '../../core/reset/observations';
import * as P from '../../core/reset/pilot';
import { weekOf } from '../../core/reset/weekly';
import { haptic } from '../../lib/haptics';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { useShownOnce, useWhileFocused } from '../InsightCharts';
import { DayStrip, WeekBars } from '../Insights';
import {
  Chapter,
  ConsistencyRing,
  HabitBoard,
  type HabitRow,
  Observations,
  RecordMedals,
  ScreenTimeHistory,
  TrendLine,
} from '../InsightsViz';
import { RecentInsights } from '../beyond/RecentInsights';
import { Button, T } from '../ui';
import { useLanguage, useT } from '../../i18n/react';

/**
 * Insights for the Life Reset, as three questions. How am I doing? The consistency ring and the weeks as a line.
 * What's working? The habits side by side (tap one for its history, target and difficulty) and the personal records.
 * What can I learn? Observations the saved days support, and Less Scrolling's optional weekly Screen Time check.
 * The 66 days themselves are on Journey. Numbers come from the saved days only (reset/pilot.ts, reset/charts.ts,
 * reset/observations.ts).
 */
export function PilotInsights() {
  const { c } = useTheme();
  const t = useT();
  const program = useShownProgram()!;
  const offset = useResetPilot((s) => s.devDayOffset);
  const today = pilotToday({ program, devDayOffset: offset });
  const lang = useLanguage();
  const data = useMemo(
    () => ({
      overall: P.overallTally(program, today),
      streak: P.pilotStreak(program, today),
      week: P.weekTally(program, today),
    }),
    [program, today],
  );
  // The charts mount once Insights is first shown, and follow the saved days while it's shown (InsightCharts).
  const shown = useShownOnce();
  const frozen = useWhileFocused(program);
  const frozenToday = useWhileFocused(today);
  const charts = useMemo(() => {
    if (!shown) return null;
    const trend = C.weeklyTrend(frozen, frozenToday);
    const records = C.records(frozen, frozenToday, trend);
    const bars = C.habitBars(frozen, frozenToday);
    const name = (id: string) => P.nameOf(frozen, id);
    void lang; // the observations are words: made again when the language changes
    const observations = [
      O.weekChange(trend),
      O.streakNote(P.pilotStreak(frozen, frozenToday), records.bestStreak),
      O.strongestHabit(bars.map((b) => ({ name: name(b.id), tally: b.tally }))),
      O.bestWeekday(C.dayCells(frozen, frozenToday)),
      ...O.weeklyGoals(
        bars
          .filter((b) => b.kind === 'weekly')
          .map((b) => ({ name: name(b.id), met: b.weeksMet, judged: b.weeksJudged })),
      ),
    ].filter((o): o is NonNullable<typeof o> => o !== null);
    return { trend, records, observations };
  }, [frozen, frozenToday, shown, lang]);

  const rows: HabitRow[] = program.habits.map((id) => {
    const week = P.weekProgress(program, id, today);
    const line = P.levelLineFor(program, id, today);
    const kind = week
      ? week.goal === 0
        ? t('insights.kind.shortWeek', { line })
        : t('insights.kind.week', { line, done: week.credited, goal: week.goal })
      : t('insights.kind.daily', { line });
    return {
      id,
      name: P.nameOf(program, id),
      tally: P.habitTally(program, id, today),
      kind,
      details: (
        <>
          {week ? (
            <WeekBars weeks={P.habitWeeks(program, id, today)} />
          ) : (
            <DayStrip days={P.recentDays(program, id, today)} />
          )}
          <T v="caption">{P.targetText(program, id, today)}</T>
          {id === 'strength_log' ? <StrengthWeeks program={program} today={today} /> : null}
          <Button label={t('insights.details')} kind="secondary" onPress={() => router.push(`/life-reset/${id}`)} />
        </>
      ),
    };
  });

  return (
    <>
      <Chapter n="01" title={t('insights.chapter.doing')} tint={c.mist} />
      {program.after ? <RecentInsights program={program} today={today} /> : null}
      <ConsistencyRing {...data} day={today} />
      {charts ? <TrendLine points={charts.trend} /> : null}

      <Chapter n="02" title={t('insights.chapter.working')} tint={c.sage} />
      <HabitBoard rows={rows} />
      {charts ? <RecordMedals records={charts.records} /> : null}

      <Chapter n="03" title={t('insights.chapter.learn')} tint={c.accent} />
      {charts ? <Observations items={charts.observations} day={today} /> : null}
      {program.habits.includes('screen_app_limit') ? <ScreenTimeCheck program={program} today={today} /> : null}
    </>
  );
}

/** Strength Training: sessions logged each week, against the week's target. */
function StrengthWeeks({ program, today }: { program: P.PilotProgram; today: number }) {
  const { c } = useTheme();
  const t = useT();
  const weeks = P.habitWeeks(program, 'strength_log', today);
  return (
    <View style={{ gap: 2 }}>
      {weeks
        .slice(-6)
        .reverse()
        .map((w) => (
          <T key={w.week} v="caption" color={c.textDim}>
            {t('insights.strengthWeek', { week: w.week, count: w.credited + w.extra })}
            {w.goal ? t('insights.strengthTarget', { goal: w.goal }) : ''}
          </T>
        ))}
    </View>
  );
}

/** Less Scrolling's optional weekly check: the person's own Screen Time reading, never checked by Schwung. */
function ScreenTimeCheck({ program, today }: { program: P.PilotProgram; today: number }) {
  const { c } = useTheme();
  const t = useT();
  const saved = P.screenTimeFor(program, today);
  const [value, setValue] = useState(saved?.minutesPerDay ?? program.answers.pullMinutes ?? 60);
  const limit = P.scrollLimitFor(program, P.levelFor(program, 'screen_app_limit', today));
  const readings = Object.values(program.measures?.screen_app_limit ?? {})
    .map((m) => ({ week: m.week, minutes: m.minutesPerDay }))
    .sort((a, b) => a.week - b.week);
  const thisWeek = weekOf(program.startedAt, Math.min(today, PROGRAM_DAYS)).week;
  return (
    <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
      <View style={styles.screenHead}>
        <View style={[styles.screenIcon, { backgroundColor: c.mistSoft }]}>
          <Ionicons name="phone-portrait-outline" size={16} color={c.mistInk} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="bodyStrong">{t('insights.screen.title')}</T>
          <T v="caption" color={c.textDim}>
            {t('insights.screen.limit', { limit })}
          </T>
        </View>
      </View>
      <ScreenTimeHistory readings={readings} limit={limit} thisWeek={thisWeek} />
      <T v="caption" color={c.textDim}>
        {t('insights.screen.how')}
      </T>
      <View style={styles.stepper}>
        <Button label="−15" kind="secondary" style={styles.step} onPress={() => setValue((v) => Math.max(0, v - 15))} />
        <T v="heading" style={styles.value}>
          {t('insights.screen.min', { minutes: value })}
        </T>
        <Button
          label="+15"
          kind="secondary"
          style={styles.step}
          onPress={() => setValue((v) => Math.min(1440, v + 15))}
        />
      </View>
      <Button
        label={saved ? t('insights.screen.update', { minutes: saved.minutesPerDay }) : t('insights.screen.save')}
        onPress={() => {
          useResetPilot.getState().setScreenTime(value);
          haptic.confirm();
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  screenHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  screenIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  step: { width: 72 },
  value: { flex: 1, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
