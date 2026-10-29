import { Ionicons } from '@expo/vector-icons';
import { useShownProgram } from '../../components/shownProgram';
import { router, useLocalSearchParams } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedScrollHandler } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ascentLabel, AscentLabels, AscentScene, tapPoint } from '../../components/Ascent';
import { SettingsButton } from '../../components/HeaderButton';
import { ThemeToggle } from '../../components/ThemeToggle';
import { ExpeditionCalendar, JourneySummary } from '../../components/Expedition';
import { ReflectionHistory } from '../../components/reflection/ReflectionHistory';
import { storyAvailable } from '../../core/reset/story';
import { useJourneySource, type JourneySource } from '../../components/journeySource';
import { Screen, T } from '../../components/ui';
import { useOnPainting, worldAnchor, worldScroll } from '../../components/WorldLayer';
import { ascentDays, nearestDay, phaseFor, type AscentDay } from '../../core/ascent';
import { PROGRAM_DAYS } from '../../core/dates';
import { dayQualifies, logForDay } from '../../core/progression';
import type { DayLog } from '../../core/types';
import * as C from '../../core/reset/charts';
import { worldFrame } from '../../core/world';
import { haptic } from '../../lib/haptics';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

/**
 * The Journey tab: the Ascent fills the screen, with the stats in one small line above it, the full 66-day calendar
 * a tap away, and any day's details below.
 * Memoized, so a tab change doesn't re-render the page before the slide can start.
 */
export default function JourneyTab() {
  return <JourneyPage />;
}

const JourneyPage = memo(function JourneyPage() {
  const insets = useSafeAreaInsets();
  const source = useJourneySource();
  const started = source.started;
  // Opened with a day (e.g. from a link): start with that day selected.
  const picked = Number(useLocalSearchParams<{ day?: string }>().day) || null;
  return (
    <Screen edges={[]} transparent>
      {started ? (
        <Ascent picked={picked} source={source} />
      ) : (
        <View style={[styles.empty, { paddingTop: insets.top + space.sm }]}>
          <Header />
          <View style={styles.emptyBody}>
            <T>Your 66 days will show here once you start your Life Reset.</T>
          </View>
        </View>
      )}
    </Screen>
  );
});

function Header() {
  return (
    <View style={styles.header}>
      <T v="heading" accessibilityRole="header" numberOfLines={1} style={{ flex: 1 }}>
        Your journey
      </T>
      <ThemeToggle />
      <SettingsButton />
    </View>
  );
}

function Ascent({ picked, source }: { picked: number | null; source: JourneySource }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { logs, today, start, title } = source;
  const [zoneTop, setZoneTop] = useState(insets.top + 100);
  const { zoneHeight } = worldFrame(width, zoneTop);
  // The day shown below the mountain: today until another is picked (on the trail or in the calendar).
  const [chosen, setChosen] = useState<number | null>(picked);
  // Its habits stay folded away until asked for, so the valley below the mountain stays in view.
  const [expanded, setExpanded] = useState(picked !== null);
  // Every program day, judged on the habits it actually had (reset/charts.ts), for the summary and the calendar.
  const program = useShownProgram();
  const cells = useMemo(() => (program ? C.dayCells(program, today) : []), [program, today]);
  const completed = cells.filter((d) => d.state === 'full').length;
  const lastDay = Math.min(today, PROGRAM_DAYS);
  const shownDay = chosen ?? lastDay;

  const days = useMemo(() => ascentDays(logs, start, today, source.rest), [logs, start, today, source.rest]);
  const todayDone = dayQualifies(logForDay(logs, start, today));
  // This page's scroll moves the shared world (the trail must stay on the painting), and the trail and labels stay
  // on the mountain as the pages slide, and fade in as the camera arrives (useOnPainting).
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
        <View style={styles.pad}>
          <Header />
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
            haptic.select();
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
                <T v="caption" color={c.indigoInk} style={styles.captionKicker} maxFontSizeMultiplier={1.3}>
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
                <Ionicons name="return-down-back" size={16} color={c.indigoInk} />
                <T v="caption" color={c.indigoInk} style={{ fontWeight: '700' }}>
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

        {cells.length ? (
          <View style={styles.pad}>
            <JourneySummary today={today} completed={completed} cells={cells} />
            {program && storyAvailable(program, today) ? (
              <Pressable
                onPress={() => {
                  haptic.select();
                  router.push('/life-reset/story');
                }}
                accessibilityRole="button"
                accessibilityLabel="Your 66-day story. Open it to save or share"
              >
                {({ pressed }) => (
                  <ThemedView style={[styles.story, { backgroundColor: c.surface, opacity: pressed ? 0.75 : 1 }]}>
                    <View style={[styles.storyIcon, { backgroundColor: c.peachSoft }]}>
                      <Ionicons name="image-outline" size={18} color={c.peachInk} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T v="bodyStrong">Your 66-day story</T>
                      <T v="caption" color={c.textDim}>
                        A keepsake of the whole climb, to save or share.
                      </T>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
                  </ThemedView>
                )}
              </Pressable>
            ) : null}
            <View style={styles.expedition}>
              <T v="overline" color={c.textDim}>
                The expedition
              </T>
              <ExpeditionCalendar
                cells={cells}
                today={Math.min(today, PROGRAM_DAYS)}
                selected={shownDay}
                onSelect={(day) => setChosen(day === lastDay ? null : day)}
                name={title}
              />
            </View>
            {program ? <ReflectionHistory program={program} today={today} /> : null}
          </View>
        ) : null}
      </Animated.ScrollView>
    </>
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
      {log && log.planned.length ? (
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
                  color={done ? c.sage : c.textFaint}
                />
                <T v="caption" color={done ? c.text : c.textDim} style={{ flex: 1 }} maxFontSizeMultiplier={1.4}>
                  {title(id)}
                </T>
              </View>
            );
          })}
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
  expedition: { gap: space.md, marginTop: space.lg },
  story: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg },
  storyIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  card: { borderRadius: radius.lg, padding: space.md, gap: space.md },
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
  habits: { gap: 6 },
  habit: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  empty: { flex: 1, paddingHorizontal: space.lg },
  emptyBody: { flex: 1, justifyContent: 'center' },
});
