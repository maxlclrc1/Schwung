import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ascentLabel, AscentLabels, AscentScene, tapPoint } from '../../components/Ascent';
import { SettingsButton } from '../../components/HeaderButton';
import { JourneyCalendar } from '../../components/JourneyCalendar';
import { Screen, T } from '../../components/ui';
import { WorldBackdrop } from '../../components/World';
import { ascentDays, describeDay, nearestDay, phaseFor } from '../../core/ascent';
import { PROGRAM_DAYS } from '../../core/dates';
import { getHabit, habitTitle } from '../../core/habits';
import { bestStreak, currentStreak, dayQualifies, daysCompleted, logForDay } from '../../core/progression';
import { BY_ID } from '../../core/v2/library';
import { worldFrame } from '../../core/world';
import { tabs } from '../../lib/flags';
import { haptic } from '../../lib/haptics';
import { currentDay, useApp } from '../../store/useApp';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

/**
 * The Journey tab (testing builds): the Ascent as the centre of the screen, the 66 days at a glance above it,
 * and any day's details below. The public release keeps the mountain on Today and the journey as a sheet.
 */
export default function JourneyTab() {
  const insets = useSafeAreaInsets();
  const started = useApp((s) => s.startedAt !== null);
  // Opened with a day (e.g. from a link): start with that day selected.
  const picked = Number(useLocalSearchParams<{ day?: string }>().day) || null;
  if (!tabs()) return <Redirect href="/journey" />;
  return (
    <Screen edges={[]}>
      {started ? (
        <Ascent picked={picked} />
      ) : (
        <View style={[styles.empty, { paddingTop: insets.top + space.sm }]}>
          <Header />
          <View style={styles.emptyBody}>
            <T>Your 66 days will show here once you start a habit plan.</T>
          </View>
        </View>
      )}
    </Screen>
  );
}

function Header() {
  return (
    <View style={styles.header}>
      <T v="heading" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>
        Your journey
      </T>
      <SettingsButton />
    </View>
  );
}

function Ascent({ picked }: { picked: number | null }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const logs = useApp((s) => s.logs);
  const plan = useApp((s) => s.plan);
  const startedAt = useApp((s) => s.startedAt);
  const offset = useApp((s) => s.devDayOffset);
  const today = currentDay({ startedAt, devDayOffset: offset });
  const start = startedAt ?? '';
  const [zoneTop, setZoneTop] = useState(insets.top + 260);
  const { zoneHeight } = worldFrame(width, zoneTop);
  // The day shown below the mountain: today until another is picked (on the trail or in the calendar).
  const [chosen, setChosen] = useState<number | null>(picked);
  const lastDay = Math.min(today, PROGRAM_DAYS);
  const shownDay = chosen ?? lastDay;

  const days = useMemo(() => ascentDays(logs, start, today), [logs, start, today]);
  const todayDone = dayQualifies(logForDay(logs, start, today));
  const stats = useMemo(
    () => ({
      done: daysCompleted(logs, start, today),
      streak: currentStreak(logs, start, today),
      best: bestStreak(logs, start, today),
    }),
    [logs, start, today],
  );
  const select = (day: number) => setChosen(day === chosen || day === lastDay ? null : day);

  return (
    <ScrollView
      contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.sm }]}
      showsVerticalScrollIndicator={false}
    >
      {/* The world behind the whole page; its painting starts where the trail area is measured. */}
      <View style={StyleSheet.absoluteFill}>
        <WorldBackdrop zoneTop={zoneTop} fadeTop />
      </View>

      <View style={styles.pad}>
        <Header />
        <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
          <View style={styles.stats}>
            <Stat n={stats.done} label="days done" />
            <Stat n={stats.streak} label="streak" />
            <Stat n={stats.best} label="best" />
          </View>
          <JourneyCalendar
            logs={logs}
            start={start}
            today={today}
            selected={chosen}
            onSelect={select}
            inset={space.lg * 2 + space.md * 2}
          />
        </ThemedView>
      </View>

      {/* The Ascent. Tap a marker to see that day. */}
      <Pressable
        onLayout={(e) => setZoneTop(e.nativeEvent.layout.y)}
        onPress={(e) => {
          const day = nearestDay(tapPoint(e), width, zoneHeight, 16);
          if (day === null || day > PROGRAM_DAYS) return;
          haptic.tap();
          select(day);
        }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={ascentLabel(days, today)}
        style={{ width, height: zoneHeight }}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <AscentScene
            days={days}
            today={today}
            width={width}
            selected={chosen !== null && chosen !== today ? chosen : null}
            todayDone={todayDone}
          />
        </View>
        <AscentLabels today={today} width={width} />
      </Pressable>

      <View style={styles.pad}>
        <DayDetail day={shownDay} days={days} logs={logs} start={start} plan={plan} isToday={shownDay === today} />
        {chosen !== null ? (
          <Pressable onPress={() => setChosen(null)} accessibilityRole="button" style={styles.back} hitSlop={8}>
            <Ionicons name="return-down-back" size={16} color={c.accentInk} />
            <T v="caption" color={c.accentInk} style={{ fontWeight: '700' }}>
              Back to {today > PROGRAM_DAYS ? 'the summit' : 'today'}
            </T>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

/** A number and its label on one line, e.g. "7 days done". */
function Stat({ n, label }: { n: number; label: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${n} ${label}`}>
      <T v="bodyStrong" style={styles.tabular} maxFontSizeMultiplier={1.4}>
        {n}
      </T>
      <T v="caption" color={c.textDim} maxFontSizeMultiplier={1.4}>
        {label}
      </T>
    </View>
  );
}

/** One day: how it went and which habits were done, from that day's own record. */
function DayDetail({
  day,
  days,
  logs,
  start,
  plan,
  isToday,
}: {
  day: number;
  days: ReturnType<typeof ascentDays>;
  logs: Parameters<typeof logForDay>[0];
  start: string;
  plan: ReturnType<typeof useApp.getState>['plan'];
  isToday: boolean;
}) {
  const { c } = useTheme();
  const d = days[day - 1];
  const log = logForDay(logs, start, day);
  const title = (id: string) => {
    const h = plan.find((p) => p.habitId === id);
    return h ? habitTitle(h) : (getHabit(id)?.title ?? BY_ID[id]?.title ?? id);
  };
  const past = d && d.status !== 'future';
  return (
    <ThemedView style={[styles.card, { backgroundColor: c.surface }]} accessibilityLiveRegion="polite">
      <T v="overline" color={c.accentInk} maxFontSizeMultiplier={1.3}>
        {isToday ? 'Today' : d?.status === 'future' ? 'Still ahead' : 'Looking back'}
      </T>
      <T v="bodyStrong" maxFontSizeMultiplier={1.4}>
        {isToday && d && log
          ? `Day ${day} · ${phaseFor(day).name} · ${d.done} of ${d.planned} done so far`
          : d
            ? describeDay(d)
            : `Day ${day}`}
      </T>
      {past && log && log.planned.length ? (
        <View style={styles.habits}>
          {log.planned.map((id) => {
            const done = log.completed.includes(id);
            return (
              <View
                key={id}
                style={styles.habit}
                accessible
                accessibilityLabel={`${title(id)}, ${done ? 'done' : 'not done'}`}
              >
                <Ionicons
                  name={done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={done ? c.accentInk : c.textFaint}
                />
                <T v="caption" color={done ? c.text : c.textDim} style={{ flex: 1 }} maxFontSizeMultiplier={1.4}>
                  {title(id)}
                </T>
              </View>
            );
          })}
          {(log.rested ?? []).map((id) => (
            <View key={`rest-${id}`} style={styles.habit} accessible accessibilityLabel={`${title(id)}, rest day`}>
              <Ionicons name="bed-outline" size={18} color={c.textDim} />
              <T v="caption" color={c.textDim} style={{ flex: 1 }} maxFontSizeMultiplier={1.4}>
                {title(id)} · rest day
              </T>
            </View>
          ))}
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xxxl, gap: space.md },
  pad: { paddingHorizontal: space.lg, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  card: { borderRadius: radius.lg, padding: space.md, gap: space.md },
  stats: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.sm },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  tabular: { fontVariant: ['tabular-nums'] },
  habits: { gap: 6 },
  habit: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  empty: { flex: 1, paddingHorizontal: space.lg },
  emptyBody: { flex: 1, justifyContent: 'center' },
});
