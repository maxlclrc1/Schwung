import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ascentLabel, AscentLabels, AscentScene, tapPoint } from '../../components/Ascent';
import { IconButton, SettingsButton } from '../../components/HeaderButton';
import { JourneyView } from '../../components/JourneyView';
import { Screen, T } from '../../components/ui';
import { WorldBackdrop } from '../../components/World';
import { ascentDays, nearestDay, phaseFor, type AscentDay } from '../../core/ascent';
import { PROGRAM_DAYS } from '../../core/dates';
import { getHabit, habitTitle } from '../../core/habits';
import { bestStreak, currentStreak, dayQualifies, daysCompleted, logForDay } from '../../core/progression';
import type { DayLog } from '../../core/types';
import { BY_ID } from '../../core/v2/library';
import { worldFrame } from '../../core/world';
import { tabs } from '../../lib/flags';
import { haptic } from '../../lib/haptics';
import { currentDay, useApp } from '../../store/useApp';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

/**
 * The Journey tab (testing builds): the Ascent fills the screen, with the stats in one small line above it, the
 * full 66-day calendar a tap away, and any day's details below. The public release keeps the mountain on Today
 * and the journey as a sheet.
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

function Header({ onCalendar }: { onCalendar?: () => void }) {
  return (
    <View style={styles.header}>
      <T v="heading" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>
        Your journey
      </T>
      {onCalendar ? (
        <IconButton name="calendar-outline" label="Your 66 days, as a calendar" onPress={onCalendar} />
      ) : null}
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
  const [zoneTop, setZoneTop] = useState(insets.top + 100);
  const { zoneHeight } = worldFrame(width, zoneTop);
  // The day shown below the mountain: today until another is picked (on the trail or in the calendar).
  const [chosen, setChosen] = useState<number | null>(picked);
  // Its habits stay folded away until asked for, so the valley below the mountain stays in view.
  const [expanded, setExpanded] = useState(picked !== null);
  const [calendar, setCalendar] = useState(false);
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
  const pick = (day: number) => setChosen(day === lastDay ? null : day);
  const summary = daySummary(days[shownDay - 1], logForDay(logs, start, shownDay), shownDay === today);

  return (
    <>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.sm }]}
        showsVerticalScrollIndicator={false}
      >
        {/* The world behind the whole page; its painting starts where the trail area is measured. */}
        <View style={StyleSheet.absoluteFill}>
          <WorldBackdrop zoneTop={zoneTop} fadeTop />
        </View>

        <View style={styles.pad}>
          <Header onCalendar={() => setCalendar(true)} />
          <ThemedView
            style={[styles.statsPill, { backgroundColor: c.surface }]}
            accessible
            accessibilityLabel={`${stats.done} days done, ${stats.streak} day streak, best ${stats.best}`}
          >
            <Stat n={stats.done} label="days done" />
            <T v="caption" color={c.textFaint}>
              ·
            </T>
            <Stat n={stats.streak} label="streak" />
            <T v="caption" color={c.textFaint}>
              ·
            </T>
            <Stat n={stats.best} label="best" />
          </ThemedView>
        </View>

        {/* The Ascent. Tap a marker to see that day. */}
        <Pressable
          onLayout={(e) => setZoneTop(e.nativeEvent.layout.y)}
          onPress={(e) => {
            const day = nearestDay(tapPoint(e), width, zoneHeight, 16);
            if (day === null || day > PROGRAM_DAYS) return;
            haptic.tap();
            setChosen(day === chosen || day === lastDay ? null : day);
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
          {/* The day in a line; tap it for that day's habits. */}
          <View style={styles.captionRow}>
            <Pressable
              onPress={() => setExpanded((e) => !e)}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={`${summary.kicker}: ${summary.full}. ${expanded ? 'Hide' : 'Show'} that day’s habits`}
              style={({ pressed }) => ({ flexShrink: 1, opacity: pressed ? 0.7 : 1 })}
            >
              <ThemedView style={[styles.caption, { backgroundColor: c.surface }]}>
                <T v="caption" color={c.accentInk} style={styles.captionKicker} maxFontSizeMultiplier={1.3}>
                  {summary.kicker}
                </T>
                <T v="caption" numberOfLines={1} style={styles.captionText} maxFontSizeMultiplier={1.3}>
                  {summary.label}
                </T>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={c.textDim} />
              </ThemedView>
            </Pressable>
            {chosen !== null ? (
              <Pressable onPress={() => setChosen(null)} accessibilityRole="button" style={styles.back} hitSlop={8}>
                <Ionicons name="return-down-back" size={16} color={c.accentInk} />
                <T v="caption" color={c.accentInk} style={{ fontWeight: '700' }}>
                  {today > PROGRAM_DAYS ? 'Summit' : 'Today'}
                </T>
              </Pressable>
            ) : null}
          </View>
          {expanded ? (
            <DayDetail
              day={shownDay}
              logs={logs}
              start={start}
              plan={plan}
              when={shownDay === today ? 'today' : shownDay > today ? 'ahead' : 'past'}
            />
          ) : null}
        </View>
      </ScrollView>

      {/* The full 66 days, on demand: pick a day to see it on the mountain and its habits below. */}
      <Modal
        visible={calendar}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCalendar(false)}
      >
        <ThemedView
          style={[styles.sheet, { backgroundColor: c.bg, paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}
        >
          <View style={styles.sheetHeader}>
            <ThemedView style={[styles.grabber, { backgroundColor: c.border }]} />
            <View style={styles.sheetTitleRow}>
              <T v="heading" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>
                Your 66 days
              </T>
              <Pressable onPress={() => setCalendar(false)} hitSlop={12} accessibilityRole="button">
                <T v="bodyStrong" color={c.accentInk}>
                  Done
                </T>
              </Pressable>
            </View>
            <T v="caption" color={c.textDim}>
              Tap a day to see it on the mountain.
            </T>
          </View>
          <JourneyView
            picked={chosen}
            onSelect={(day) => {
              pick(day);
              setExpanded(true);
              setCalendar(false);
            }}
            bottomInset={insets.bottom}
          />
        </ThemedView>
      </Modal>
    </>
  );
}

/** A number and its label, e.g. "7 days done". */
function Stat({ n, label }: { n: number; label: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.stat}>
      <T v="caption" style={[styles.tabular, { fontWeight: '700' }]} maxFontSizeMultiplier={1.3}>
        {n}
      </T>
      <T v="caption" color={c.textDim} maxFontSizeMultiplier={1.3}>
        {label}
      </T>
    </View>
  );
}

/** The shown day in a few words (the phase is on the mountain), and in full for VoiceOver. */
function daySummary(d: AscentDay | undefined, log: DayLog | undefined, isToday: boolean) {
  const kicker = isToday ? 'Today' : d?.status === 'future' ? 'Ahead' : 'Past';
  if (!d) return { kicker, label: '', full: '' };
  const label =
    d.status === 'future'
      ? `Day ${d.day} · still ahead`
      : isToday
        ? log
          ? `Day ${d.day} · ${d.done} of ${d.planned} done so far`
          : `Day ${d.day} · nothing yet`
        : d.planned === 0
          ? `Day ${d.day} · nothing logged`
          : `Day ${d.day} · ${d.done} of ${d.planned} done`;
  return { kicker, label, full: `${label.replace(`Day ${d.day}`, `Day ${d.day}, ${phaseFor(d.day).name} phase,`)}` };
}

/** One day's habits, from that day's own record: done, not done, or rested. */
function DayDetail({
  day,
  logs,
  start,
  plan,
  when,
}: {
  day: number;
  logs: Parameters<typeof logForDay>[0];
  start: string;
  plan: ReturnType<typeof useApp.getState>['plan'];
  when: 'past' | 'today' | 'ahead';
}) {
  const { c } = useTheme();
  const log = logForDay(logs, start, day);
  const title = (id: string) => {
    const h = plan.find((p) => p.habitId === id);
    return h ? habitTitle(h) : (getHabit(id)?.title ?? BY_ID[id]?.title ?? id);
  };
  return (
    <ThemedView style={[styles.card, { backgroundColor: c.surface }]} accessibilityLiveRegion="polite">
      {log && (log.planned.length || log.rested?.length) ? (
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
      ) : (
        <T v="caption" color={c.textDim}>
          {when === 'ahead'
            ? 'Still ahead.'
            : when === 'today'
              ? 'Nothing checked off yet today.'
              : 'Nothing was logged this day.'}
        </T>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xxxl, gap: space.md },
  pad: { paddingHorizontal: space.lg, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  card: { borderRadius: radius.lg, padding: space.md, gap: space.md },
  statsPill: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  stat: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  captionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  caption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    flexShrink: 1,
  },
  captionKicker: { fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  captionText: { flexShrink: 1, fontWeight: '600' },
  sheet: { flex: 1 },
  sheetHeader: { paddingTop: space.sm, paddingHorizontal: space.xl, paddingBottom: space.lg, gap: 4 },
  grabber: { width: 36, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: space.md },
  sheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 44 },
  tabular: { fontVariant: ['tabular-nums'] },
  habits: { gap: 6 },
  habit: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  empty: { flex: 1, paddingHorizontal: space.lg },
  emptyBody: { flex: 1, justifyContent: 'center' },
});
