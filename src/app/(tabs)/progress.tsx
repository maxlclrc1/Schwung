import { Ionicons } from '@expo/vector-icons';
import { useShownProgram } from '../../components/shownProgram';
import { useLocalSearchParams } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedRef, useAnimatedScrollHandler, useReducedMotion } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ascentLabel, AscentLabels, AscentScene, tapPoint } from '../../components/Ascent';
import { SettingsButton } from '../../components/HeaderButton';
import { ThemeToggle } from '../../components/ThemeToggle';
import { ExpeditionCalendar, JourneyStats } from '../../components/Expedition';
import { PastJourneysLink, SinceSummit } from '../../components/beyond/SinceSummit';
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
import { summitReached } from '../../core/reset/pilot';
import { worldFrame } from '../../core/world';
import { haptic } from '../../lib/haptics';
import { radius, space, useTheme } from '../../theme';
import { useDepth } from '../../theme/depth';
import { ThemedView } from '../../theme/transition';
import { t as tr } from '../../i18n';
import { useT } from '../../i18n/react';
import { flipX } from '../../i18n/direction';
import { pushOnce } from '../../lib/navigation';

/**
 * The Journey tab: the Ascent fills the screen, with the stats in one small line above it, the full 66-day calendar
 * a tap away, and any day's details below.
 * Memoized, so a tab change doesn't re-render the page before the slide can start.
 */
export default function JourneyTab() {
  return <JourneyPage />;
}

const JourneyPage = memo(function JourneyPage() {
  const t = useT();
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
            <T>{t('journeyTab.empty')}</T>
            <PastJourneysLink />
          </View>
        </View>
      )}
    </Screen>
  );
});

function Header() {
  const t = useT();
  return (
    <View style={styles.header}>
      <T v="heading" accessibilityRole="header" numberOfLines={2} style={{ flex: 1 }}>
        {t('journeyTab.title')}
      </T>
      <ThemeToggle />
      <SettingsButton />
    </View>
  );
}

function Ascent({ picked, source }: { picked: number | null; source: JourneySource }) {
  const { c } = useTheme();
  const depth = useDepth();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const scroller = useAnimatedRef<Animated.ScrollView>();
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
        ref={scroller}
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
              accessibilityLabel={t(expanded ? 'journeyTab.captionA11yHide' : 'journeyTab.captionA11yShow', {
                kicker: summary.kicker,
                full: summary.full,
              })}
              style={({ pressed }) => ({ flexShrink: 1, opacity: pressed ? 0.7 : 1 })}
            >
              <ThemedView style={[styles.caption, depth.raised, { backgroundColor: c.surface }]}>
                <T v="caption" color={c.indigoInk} style={styles.captionKicker} maxFontSizeMultiplier={1.3}>
                  {summary.kicker}
                </T>
                <T v="caption" numberOfLines={2} style={styles.captionText} maxFontSizeMultiplier={1.3}>
                  {summary.label}
                </T>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={c.textDim} />
              </ThemedView>
            </Pressable>
            {chosen !== null ? (
              <Pressable onPress={() => setChosen(null)} accessibilityRole="button" style={styles.back} hitSlop={8}>
                <Ionicons name="return-down-back" size={16} color={c.indigoInk} />
                <T v="label" color={c.indigoInk}>
                  {today > PROGRAM_DAYS ? t('journeyTab.back.summit') : t('journeyTab.back.today')}
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
            {program && storyAvailable(program, today) ? (
              <Pressable
                onPress={() => {
                  haptic.select();
                  pushOnce('/life-reset/story');
                }}
                accessibilityRole="button"
                accessibilityLabel={t('journeyTab.storyA11y')}
              >
                {({ pressed }) => (
                  <ThemedView
                    style={[styles.story, depth.card, { backgroundColor: c.surface, opacity: pressed ? 0.75 : 1 }]}
                  >
                    <View style={[styles.storyIcon, { backgroundColor: c.peachSoft }]}>
                      <Ionicons name="image-outline" size={18} color={c.peachInk} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T v="bodyStrong">{t('journeyTab.story')}</T>
                      <T v="caption" color={c.textDim}>
                        {t('journeyTab.storyBody')}
                      </T>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={c.textFaint} style={flipX} />
                  </ThemedView>
                )}
              </Pressable>
            ) : null}
            {program?.after ? <SinceSummit program={program} today={today} /> : null}
            <PastJourneysLink />
            {/* The landscape settles into the page behind the stats and the Foundation trail. */}
            <View style={styles.expedition}>
              <Backdrop color={c.bg} />
              <JourneyStats
                today={Math.min(today, PROGRAM_DAYS)}
                completed={completed}
                summit={!!program && summitReached(program, today)}
              />
              <ExpeditionCalendar
                cells={cells}
                today={Math.min(today, PROGRAM_DAYS)}
                selected={shownDay}
                onSelect={(day) => setChosen(day === lastDay ? null : day)}
                onOpen={(day) => {
                  // The day's full detail sits by the mountain: open it and bring it into view.
                  setChosen(day === lastDay ? null : day);
                  setExpanded(true);
                  scroller.current?.scrollTo({
                    y: Math.max(0, zoneTop + zoneHeight - height * 0.3),
                    animated: !reduceMotion,
                  });
                }}
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

/** A wash from clear to the page's colour, so the painting above gives way to the map beneath. */
const Backdrop = memo(function Backdrop({ color }: { color: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height={260}>
        <Defs>
          <LinearGradient id="wash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0} />
            <Stop offset="0.27" stopColor={color} stopOpacity={0.55} />
            <Stop offset="0.65" stopColor={color} stopOpacity={0.9} />
            <Stop offset="1" stopColor={color} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#wash)" />
      </Svg>
      <View style={{ flex: 1, backgroundColor: color }} />
    </View>
  );
});

/** The shown day in a few words (the phase is on the mountain), and in full for VoiceOver. */
function daySummary(d: AscentDay | undefined, log: DayLog | undefined, isToday: boolean) {
  const kicker = tr(
    isToday ? 'journeyTab.kicker.today' : d?.status === 'future' ? 'journeyTab.kicker.ahead' : 'journeyTab.kicker.past',
  );
  if (!d) return { kicker, label: '', full: '' };
  const key =
    d.status === 'future'
      ? 'journeyTab.label.ahead'
      : isToday
        ? log
          ? 'journeyTab.label.soFar'
          : 'journeyTab.label.nothingYet'
        : d.planned === 0
          ? 'journeyTab.label.nothing'
          : 'journeyTab.label.done';
  const params = { done: d.done, planned: d.planned };
  const label = tr(key, { day: d.day, ...params });
  const full = tr('journeyTab.label.dayPhase', { label, phase: phaseFor(d.day).name });
  return { kicker, label, full };
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
  const depth = useDepth();
  const t = useT();
  const log = logForDay(logs, start, day);
  return (
    <ThemedView style={[styles.card, depth.card, { backgroundColor: c.surface }]} accessibilityLiveRegion="polite">
      {log && log.planned.length ? (
        <View style={styles.habits}>
          {log.planned.map((id) => {
            const done = log.completed.includes(id);
            return (
              <View
                key={id}
                style={styles.habit}
                accessible
                accessibilityLabel={t(done ? 'journeyTab.habitDone' : 'journeyTab.habitNotDone', { habit: title(id) })}
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
            ? t('journeyTab.stillAhead')
            : when === 'today'
              ? t('journeyTab.nothingToday')
              : rest
                ? t('journeyTab.rest')
                : t('journeyTab.nothingLogged')}
        </T>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xxxl, gap: space.md },
  pad: { paddingHorizontal: space.lg, gap: space.md },
  // Full-bleed, so the wash and the map run edge to edge; the stats and the trail keep the page's margins.
  expedition: { marginHorizontal: -space.lg, paddingHorizontal: space.lg, paddingTop: 6, marginTop: space.sm },
  // Panels pad like every other panel on the core screens (space.lg).
  story: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, borderRadius: radius.lg },
  storyIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 44 },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
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
  captionKicker: { fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  captionText: { flexShrink: 1, fontWeight: '600' },
  habits: { gap: 6 },
  habit: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  empty: { flex: 1, paddingHorizontal: space.lg },
  emptyBody: { flex: 1, justifyContent: 'center', gap: space.lg },
});
