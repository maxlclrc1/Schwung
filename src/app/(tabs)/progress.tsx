import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ascentLabel, AscentLabels, AscentScene, tapPoint } from '../../components/Ascent';
import { IconButton, SettingsButton } from '../../components/HeaderButton';
import { JourneyView } from '../../components/JourneyView';
import { useJourneySource, type JourneySource } from '../../components/journeySource';
import { usePagerBlock } from '../../components/TabPager';
import { Screen, T } from '../../components/ui';
import { WorldBackdrop } from '../../components/World';
import { useOnPainting, useWorldLayer, worldAnchor, worldScroll } from '../../components/WorldLayer';
import { ascentDays, nearestDay, phaseFor, type AscentDay } from '../../core/ascent';
import { PROGRAM_DAYS } from '../../core/dates';
import { dayQualifies, logForDay } from '../../core/progression';
import type { DayLog } from '../../core/types';
import { worldFrame } from '../../core/world';
import { tabs } from '../../lib/flags';
import { haptic } from '../../lib/haptics';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

/**
 * The Journey tab (testing builds): the Ascent fills the screen, with the stats in one small line above it, the
 * full 66-day calendar a tap away, and any day's details below. The public release keeps the mountain on Today
 * and the journey as a sheet.
 * Memoized, so a tab change doesn't re-render the page before the slide can start.
 */
export default function JourneyTab() {
  return <JourneyPage />;
}

const JourneyPage = memo(function JourneyPage() {
  const insets = useSafeAreaInsets();
  // The Life Reset's days while it's on, otherwise the program's (never mixed).
  const source = useJourneySource();
  const started = source.started;
  // Opened with a day (e.g. from a link): start with that day selected.
  const picked = Number(useLocalSearchParams<{ day?: string }>().day) || null;
  const world = useWorldLayer();
  if (!tabs()) return <Redirect href="/journey" />;
  return (
    <Screen edges={[]} transparent={world}>
      {started ? (
        <Ascent picked={picked} source={source} />
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
});

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

function Ascent({ picked, source }: { picked: number | null; source: JourneySource }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { logs, today, start, stats, title } = source;
  const [zoneTop, setZoneTop] = useState(insets.top + 100);
  const { zoneHeight } = worldFrame(width, zoneTop);
  // The day shown below the mountain: today until another is picked (on the trail or in the calendar).
  const [chosen, setChosen] = useState<number | null>(picked);
  // Its habits stay folded away until asked for, so the valley below the mountain stays in view.
  const [expanded, setExpanded] = useState(picked !== null);
  const [calendar, setCalendar] = useState(false);
  // No swiping between tabs under the calendar sheet.
  usePagerBlock(calendar);
  const lastDay = Math.min(today, PROGRAM_DAYS);
  const shownDay = chosen ?? lastDay;

  const days = useMemo(() => ascentDays(logs, start, today, source.rest), [logs, start, today, source.rest]);
  const todayDone = dayQualifies(logForDay(logs, start, today));
  const pick = (day: number) => setChosen(day === lastDay ? null : day);
  // With the tabs' shared world, this page's scroll moves it (the trail must stay on the painting), and the
  // trail and labels stay on the mountain as the pages slide, and fade in as the camera arrives (useOnPainting).
  const world = useWorldLayer();
  const onScroll = useAnimatedScrollHandler((e) => {
    worldScroll[1].set(e.contentOffset.y);
  });
  const arrive = useOnPainting(1);
  const summary = daySummary(days[shownDay - 1], logForDay(logs, start, shownDay), shownDay === today);

  return (
    <>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.sm }]}
        showsVerticalScrollIndicator={false}
      >
        {/* The world behind the page, its painting starting where the trail area is measured: the tabs' shared
            world (moved with this page's scroll), or this screen's own. */}
        {world ? null : (
          <View style={StyleSheet.absoluteFill}>
            <WorldBackdrop zoneTop={zoneTop} fadeTop />
          </View>
        )}

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
          onLayout={(e) => {
            setZoneTop(e.nativeEvent.layout.y);
            worldAnchor[1].set(e.nativeEvent.layout.y);
          }}
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
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, arrive]}>
            <AscentScene
              days={days}
              today={today}
              width={width}
              selected={chosen !== null && chosen !== today ? chosen : null}
              todayDone={todayDone}
            />
          </Animated.View>
          <Animated.View pointerEvents="none" style={arrive}>
            <AscentLabels today={today} width={width} />
          </Animated.View>
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
              title={title}
              rest={source.rest?.(shownDay) ?? false}
              when={shownDay === today ? 'today' : shownDay > today ? 'ahead' : 'past'}
            />
          ) : null}
        </View>
      </Animated.ScrollView>

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
  title,
  rest,
  when,
}: {
  day: number;
  logs: Parameters<typeof logForDay>[0];
  start: string;
  title: (id: string) => string;
  rest: boolean;
  when: 'past' | 'today' | 'ahead';
}) {
  const { c } = useTheme();
  const log = logForDay(logs, start, day);
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
              : rest
                ? 'A rest day: nothing was due.'
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
