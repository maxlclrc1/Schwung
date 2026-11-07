import { useShownProgram } from '../shownProgram';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as C from '../../core/reset/charts';
import * as O from '../../core/reset/observations';
import * as P from '../../core/reset/pilot';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { space, useTheme } from '../../theme';
import { useShownOnce, useWhileFocused } from '../InsightCharts';
import { DayStrip, WeekBars } from '../Insights';
import {
  ArtFade,
  Chapter,
  Consistency,
  DetailsLink,
  HabitBoard,
  type HabitRow,
  Observations,
  Paper,
  RecordGrid,
  TrendLine,
  weekNote,
} from '../InsightsViz';
import { RecentInsights } from '../beyond/RecentInsights';
import { T } from '../ui';
import { useLanguage, useT } from '../../i18n/react';

/**
 * Insights for the Life Reset, as a field journal in five chapters. On the painting: I · Consistency and II · Week by
 * week, with the camp and the lake left open below. On the page: III · By habit (tap one for its history, target and
 * difficulty), IV · Personal records and V · Patterns.
 * The 66 days themselves are on Journey. Numbers come from the saved days only (reset/pilot.ts, reset/charts.ts,
 * reset/observations.ts).
 */
export function PilotInsights() {
  const t = useT();
  const program = useShownProgram()!;
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // The first two chapters and the open lake fill the first screen: the page begins at the tab bar.
  const [top, setTop] = useState(0);
  const plate = height - (56 + insets.bottom) - top;
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
          <DetailsLink label={t('insights.details')} onPress={() => router.push(`/life-reset/${id}`)} />
        </>
      ),
    };
  });

  return (
    <>
      <View style={[styles.plate, { minHeight: plate }]} onLayout={(e) => setTop(e.nativeEvent.layout.y)}>
        {program.after ? <RecentInsights program={program} today={today} /> : null}
        <Chapter n={1} title={t('insights.chapter.doing')} gap={space.sm} />
        <Consistency {...data} day={today} />
        {charts ? (
          <>
            <Chapter n={2} title={t('insights.week.title')} note={weekNote(charts.trend)} gap={space.sm} />
            <TrendLine points={charts.trend} />
          </>
        ) : null}
        <ArtFade />
      </View>

      <Paper>
        <Chapter n={3} title={t('insights.chapter.working')} />
        <HabitBoard rows={rows} />
        {charts ? (
          <>
            <Chapter n={4} title={t('insights.records.title')} />
            <RecordGrid records={charts.records} />
            <Chapter n={5} title={t('insights.chapter.learn')} />
            <Observations items={charts.observations} day={today} />
          </>
        ) : null}
      </Paper>
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

const styles = StyleSheet.create({
  plate: { gap: space.md },
});
