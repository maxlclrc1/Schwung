import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GestureResponderEvent, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { Confetti } from '../components/Art';
import { AscentCaption, ascentLabel, AscentLabels, AscentScene, tapPoint } from '../components/Ascent';
import { Comeback } from '../components/Comeback';
import { HabitRow } from '../components/HabitRow';
import { Notices } from '../components/Notices';
import { ThemeToggle } from '../components/ThemeToggle';
import { Button, ProgressBar, T } from '../components/ui';
import { WorldBackdrop } from '../components/World';
import { ascentDays, nearestDay, phaseFor } from '../core/ascent';
import { comebackFor } from '../core/comeback';
import { dueOn, isDueOn, nextSessionLabel, wasDueOn } from '../core/schedule';
import { isExercise } from '../core/v2/exercise';
import { SelfCheckToggle } from '../components/Exercise';
import type { DayLog } from '../core/types';

import { PARALLAX, trailPoint, worldFrame } from '../core/world';
import { dateForDay, PROGRAM_DAYS } from '../core/dates';
import { habitTaskAt, habitTitle, levelUp } from '../core/habits';
import {
  currentStreak,
  dayQualifies,
  isFullDay,
  levelProgress,
  levelUpOffers,
  pendingCeremony,
  playerLevel,
  STREAK_THRESHOLD,
  totalXp,
  XP_FULL_DAY_BONUS,
} from '../core/progression';
import { haptic } from '../lib/haptics';
import { rescheduleSoon } from '../lib/notifications';
import { useClock } from '../lib/useClock';
import { appNow, currentDay, useApp } from '../store/useApp';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

const todayLogRested = (logs: Record<string, DayLog>, start: string, day: number) =>
  logs[dateForDay(start, day)]?.rested ?? [];

export default function Today() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { todayKey, yesterdayEditable } = useClock();
  const startedAt = useApp((s) => s.startedAt);
  const plan = useApp((s) => s.plan);
  const logs = useApp((s) => s.logs);
  const seen = useApp((s) => s.seenCeremonies);
  const offset = useApp((s) => s.devDayOffset);
  const toggleHabit = useApp((s) => s.toggleHabit);

  // Recomputed every render; useClock re-renders us when the date rolls over.
  const today = currentDay({ startedAt, devDayOffset: offset });
  const [tab, setTab] = useState<'today' | 'yesterday'>('today');
  const canFixYesterday = yesterdayEditable && today > 1;
  const viewing = tab === 'yesterday' && canFixYesterday ? 'yesterday' : 'today';
  const viewDay = viewing === 'yesterday' ? today - 1 : today;

  const start = startedAt ?? todayKey;
  const log = logs[dateForDay(start, viewDay)];
  const todayLog = logs[dateForDay(start, today)];
  // Scheduled habits only appear on their days; every daily habit is always due, so daily plans are unchanged.
  // An exercise habit rested today isn't planned today (and never counts as missed).
  const restedToday = useMemo(() => todayLogRested(logs, start, today), [logs, start, today]);
  const dueToday = useMemo(
    () => dueOn(plan, start, today).filter((h) => !restedToday.includes(h.habitId)),
    [plan, start, today, restedToday],
  );
  // Yesterday shows what was due yesterday by its own record, even if a schedule changed since.
  const shown = useMemo(
    () => (viewDay === today ? dueToday : plan.filter((h) => wasDueOn(h, logs, start, viewDay))),
    [plan, logs, start, viewDay, today, dueToday],
  );
  const resting = useMemo(() => plan.filter((h) => !isDueOn(h, start, today)), [plan, start, today]);
  const [selfChecked, setSelfChecked] = useState<string | null>(null);
  const todayFull = isFullDay(todayLog) && dueToday.every((p) => todayLog?.completed.includes(p.habitId));
  const todayQualifies = dayQualifies(todayLog);
  const doneCount = shown.filter((p) => log?.completed.includes(p.habitId)).length;

  const xp = useMemo(() => totalXp(logs), [logs]);
  const streak = useMemo(() => currentStreak(logs, start, today), [logs, start, today]);
  const offers = useMemo(() => levelUpOffers(plan, logs, start, today), [plan, logs, start, today]);
  const { width, height: screenHeight } = useWindowDimensions();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  // The mountain and its trail stay still while the page scrolls over them. The trail area in the page is a
  // transparent placeholder: its measured position places the world, and taps on it map back to the trail.
  const [zoneTop, setZoneTop] = useState(insets.top + 96);
  const { zoneHeight } = worldFrame(width, zoneTop);
  // The world (and the trail on it) moves at PARALLAX of the page's speed, on the UI thread, so scrolling
  // drifts down the mountain past the slopes and forest while the page's words and cards move at full speed.
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const parallax = useAnimatedStyle(() => ({ transform: [{ translateY: -PARALLAX * scrollY.get() }] }));
  // Tall enough that the moving world still covers the screen at the bottom of a long page.
  const worldLayer = { height: screenHeight * 2 };
  const days = useMemo(() => ascentDays(logs, start, today), [logs, start, today]);
  const todayDone = dueToday.filter((p) => todayLog?.completed.includes(p.habitId)).length;
  // The comeback's first step is always something due today.
  const comeback = useMemo(
    () => comebackFor({ plan: dueToday, logs, startKey: start, today, yesterdayEditable }),
    [dueToday, logs, start, today, yesterdayEditable],
  );
  const onStartComeback = useCallback(
    (habitId: string) => {
      toggleHabit(today, habitId);
      rescheduleSoon();
    },
    [toggleHabit, today],
  );
  const onOpenJourney = useCallback((day?: number) => router.push(day ? `/journey?day=${day}` : '/journey'), []);
  const onTrailPress = useCallback(
    (e: GestureResponderEvent) => {
      const day = nearestDay(trailPoint(tapPoint(e), scrollY.get()), width, zoneHeight, 16);
      if (day === null || day === selectedDay) {
        setSelectedDay(null);
        return;
      }
      haptic.tap();
      setSelectedDay(day === today ? null : day);
    },
    [width, zoneHeight, selectedDay, today, scrollY],
  );

  const onToggle = useCallback(
    (habitId: string) => {
      toggleHabit(viewDay, habitId);
      rescheduleSoon();
    },
    [toggleHabit, viewDay],
  );
  const onLongPress = useCallback((habitId: string) => router.push(`/habit/${habitId}`), []);

  // Completion moment, fired only on the transition to "all done" (not on open).
  const [celebrate, setCelebrate] = useState(false);
  const wasFull = useRef(todayFull);
  useEffect(() => {
    if (todayFull && !wasFull.current) {
      haptic.success();
      setCelebrate(true);
      const t = setTimeout(() => setCelebrate(false), 2200);
      wasFull.current = todayFull;
      return () => clearTimeout(t);
    }
    wasFull.current = todayFull;
  }, [todayFull]);

  // Ceremonies: day 1 right away, milestones once that day is done (or later, if missed).
  useEffect(() => {
    if (!startedAt) return;
    const m = pendingCeremony(seen, today, todayFull, todayQualifies);
    if (m === null) return;
    // A milestone reached by a check-off waits a beat so the check animation and haptic land first.
    const t = setTimeout(() => router.push(`/ceremony?m=${m}`), m === today && m !== 1 ? 900 : 350);
    return () => clearTimeout(t);
  }, [startedAt, seen, today, todayFull, todayQualifies]);

  if (!startedAt) return null;

  return (
    <View style={styles.root}>
      <Animated.View pointerEvents="none" style={[styles.world, worldLayer, parallax]}>
        <WorldBackdrop zoneTop={zoneTop} />
        <View style={[styles.scene, { top: zoneTop }]}>
          <AscentScene days={days} today={today} width={width} selected={selectedDay} todayDone={todayQualifies} />
        </View>
      </Animated.View>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flexShrink: 1 }}>
            <T v="overline" color={c.accentInk} maxFontSizeMultiplier={1.3}>
              Schwung
            </T>
            <T v="heading" numberOfLines={1} maxFontSizeMultiplier={1.4}>
              {greeting(appNow())}
            </T>
          </View>
          <View style={styles.headerIcons}>
            <ThemeToggle />
            <IconButton name="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
          </View>
        </View>

        <Pressable
          onLayout={(e) => setZoneTop(e.nativeEvent.layout.y)}
          onPress={onTrailPress}
          accessible
          accessibilityRole="button"
          accessibilityLabel={ascentLabel(days, today)}
          accessibilityHint="Opens your journey"
          accessibilityActions={[{ name: 'activate', label: 'Open journey' }]}
          onAccessibilityAction={() => onOpenJourney()}
          style={[styles.zone, { width, height: zoneHeight }]}
        >
          {/* The words on the mountain scroll with the page; the mountain and trail behind stay still. */}
          <AscentLabels today={today} width={width} />
        </Pressable>
        <AscentCaption days={days} selected={selectedDay} onOpenJourney={onOpenJourney} />

        {viewing === 'today' ? <Comeback comeback={comeback} plan={plan} onStart={onStartComeback} /> : null}

        <Mission
          today={today}
          planned={dueToday.length}
          done={todayDone}
          qualifies={todayQualifies}
          full={todayFull}
          streak={streak}
          xp={xp}
        />

        {canFixYesterday ? (
          <ThemedView entering={FadeIn} style={[styles.segment, { backgroundColor: c.surface }]}>
            {(['yesterday', 'today'] as const).map((v) => (
              <Pressable
                key={v}
                onPress={() => {
                  haptic.tap();
                  setTab(v);
                }}
                role="tab"
                aria-selected={viewing === v}
                style={[styles.segmentItem, viewing === v && { backgroundColor: c.surfaceHigh }]}
              >
                <T v="caption" color={viewing === v ? c.text : c.textDim} style={{ fontWeight: '700' }}>
                  {v === 'today' ? 'Today' : 'Yesterday'}
                </T>
              </Pressable>
            ))}
          </ThemedView>
        ) : null}

        {viewing === 'today' ? <Notices /> : null}

        {viewing === 'today'
          ? offers.slice(0, 1).map((id) => {
              const h = plan.find((p) => p.habitId === id)!;
              const next = habitTaskAt(h, levelUp(h.level));
              return (
                <ThemedView
                  key={id}
                  entering={FadeInDown}
                  exiting={FadeOut}
                  layout={LinearTransition}
                  style={[styles.offer, { borderColor: c.accentInk, backgroundColor: c.accentSoft }]}
                >
                  <T v="overline" color={c.accentInk}>
                    {h.schedule ? '7 sessions in a row' : '7 days straight'}
                  </T>
                  <T v="bodyStrong">Level up {habitTitle(h)}?</T>
                  <T v="caption" color={c.textDim}>
                    Next: {next}
                  </T>
                  {isExercise(id) ? (
                    <SelfCheckToggle checked={selfChecked === id} onChange={(v) => setSelfChecked(v ? id : null)} />
                  ) : null}
                  <View style={styles.offerButtons}>
                    <Button
                      label="Level up"
                      style={{ flex: 1 }}
                      disabled={isExercise(id) && selfChecked !== id}
                      onPress={() => {
                        if (useApp.getState().acceptLevelUp(id, selfChecked === id)) haptic.success();
                        setSelfChecked(null);
                      }}
                    />
                    <Button
                      label="Not yet"
                      kind="secondary"
                      style={{ flex: 1 }}
                      onPress={() => useApp.getState().declineLevelUp(id)}
                    />
                  </View>
                </ThemedView>
              );
            })
          : null}

        <View style={styles.listHeader}>
          <T v="overline" color={c.textDim}>
            {viewing === 'today' ? 'Today’s habits' : 'Yesterday · editable until noon'}
          </T>
          <T v="caption" color={doneCount === shown.length ? c.accentInk : c.textDim} style={styles.tabular}>
            {doneCount} of {shown.length} done
          </T>
        </View>

        <Animated.View layout={LinearTransition.duration(200)} style={styles.list}>
          {shown.map((h) => (
            <HabitRow
              key={h.habitId}
              habit={h}
              done={!!log?.completed.includes(h.habitId)}
              onToggle={onToggle}
              onLongPress={viewing === 'today' ? onLongPress : undefined}
            />
          ))}
        </Animated.View>

        {viewing === 'today' && (resting.length || restedToday.length) ? (
          <View style={styles.resting} accessibilityRole="text">
            {resting.map((h) => (
              <T key={h.habitId} v="caption" color={c.textDim}>
                Rest day for {habitTitle(h)} · next session {nextSessionLabel(h, start, today)}
              </T>
            ))}
            {plan
              .filter((h) => restedToday.includes(h.habitId))
              .map((h) => (
                <T key={h.habitId} v="caption" color={c.textDim}>
                  Resting {habitTitle(h)} today · rest never counts as missed
                </T>
              ))}
          </View>
        ) : null}

        {viewing === 'today' ? (
          <View style={styles.footer}>
            <Pressable onPress={() => router.push('/add')} accessibilityRole="button">
              <ThemedView style={[styles.addButton, { borderColor: c.border }]}>
                <Ionicons name="add" size={20} color={c.textDim} />
                <T v="bodyStrong" color={c.textDim}>
                  Add a habit
                </T>
              </ThemedView>
            </Pressable>
            <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
              Long-press a habit to edit, swap, or remove it.
            </T>
          </View>
        ) : null}
      </Animated.ScrollView>
      {/* The same sky, fixed behind the status bar, so the page scrolls under it rather than under the clock. */}
      <View pointerEvents="none" style={[styles.statusSky, { height: insets.top }]}>
        <Animated.View style={[styles.world, worldLayer, parallax]}>
          <WorldBackdrop zoneTop={zoneTop} />
        </Animated.View>
      </View>

      {celebrate ? <Confetti spread={200} /> : null}
      {celebrate ? (
        <View pointerEvents="none" style={[styles.celebrateWrap, { bottom: insets.bottom + space.xl }]}>
          <ThemedView
            entering={FadeInDown.springify().damping(16)}
            exiting={FadeOut.duration(250)}
            style={[styles.celebrate, { backgroundColor: c.accent }]}
          >
            <Ionicons name="checkmark-done" size={22} color={c.onAccent} />
            <T v="bodyStrong" color={c.onAccent}>
              Day complete · +{XP_FULL_DAY_BONUS} XP bonus
            </T>
          </ThemedView>
        </View>
      ) : null}
    </View>
  );
}

function greeting(now: Date): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  return 'Good evening';
}

const PHASE_LINE: Record<1 | 2 | 3, string> = {
  1: 'Lay the foundation.',
  2: 'Keep the momentum.',
  3: 'Make it yours.',
};

/** Today at a glance: date, phase, progress toward a day that counts, streak and level. */
function Mission({
  today,
  planned,
  done,
  qualifies,
  full,
  streak,
  xp,
}: {
  today: number;
  planned: number;
  done: number;
  qualifies: boolean;
  full: boolean;
  streak: number;
  xp: number;
}) {
  const { c } = useTheme();
  const maintenance = today > PROGRAM_DAYS;
  const phase = phaseFor(Math.min(today, PROGRAM_DAYS));
  // How many check-offs today still needs to count (the existing 80% rule), never below zero.
  const toCount = Math.max(0, Math.ceil(planned * STREAK_THRESHOLD - 1e-9) - done);
  const message = full
    ? 'All done. Another step up the trail.'
    : qualifies
      ? 'Today counts. Finish the rest if you can.'
      : done === 0
        ? 'Start with the easiest one. Momentum builds from there.'
        : `${toCount} more and today counts.`;
  const date = appNow().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ThemedView style={[styles.mission, { backgroundColor: c.surface }]}>
      <T v="overline" color={c.textDim} maxFontSizeMultiplier={1.3}>
        {date}
      </T>
      <T v="heading" maxFontSizeMultiplier={1.4}>
        {maintenance ? 'Keep it going.' : PHASE_LINE[phase.n]}
      </T>
      <View
        style={styles.progressRow}
        accessible
        accessibilityLabel={`${done} of ${planned} habits done today. ${message}`}
      >
        <View style={styles.segments}>
          {Array.from({ length: planned }, (_, i) => (
            <ThemedView key={i} style={[styles.segmentBar, { backgroundColor: i < done ? c.accent : c.surfaceHigh }]} />
          ))}
        </View>
        <T v="caption" color={full ? c.accentInk : c.textDim} style={styles.tabular} maxFontSizeMultiplier={1.4}>
          {done} of {planned}
        </T>
      </View>
      <T v="caption" color={c.textDim} maxFontSizeMultiplier={1.4}>
        {message}
      </T>
      <ThemedView style={[styles.missionStats, { borderTopColor: c.border }]}>
        <View
          style={styles.statItem}
          accessible
          accessibilityLabel={streak > 0 ? `${streak} day streak` : 'No streak yet'}
        >
          <Ionicons name="flame" size={16} color={streak > 0 ? c.accentInk : c.textFaint} />
          <T v="caption" style={[styles.tabular, { fontWeight: '700' }]} maxFontSizeMultiplier={1.4} numberOfLines={1}>
            {streak > 0 ? `${streak}-day streak` : 'Streak starts today'}
          </T>
        </View>
        <View
          style={[styles.statItem, styles.levelItem]}
          accessible
          accessibilityLabel={`Level ${playerLevel(xp)}, ${xp} XP`}
        >
          <T v="caption" style={{ fontWeight: '700' }} maxFontSizeMultiplier={1.4} numberOfLines={1}>
            Lv {playerLevel(xp)}
          </T>
          <View style={{ width: 40 }}>
            <ProgressBar value={levelProgress(xp)} height={4} />
          </View>
          <T v="caption" color={c.textDim} style={styles.tabular} maxFontSizeMultiplier={1.4} numberOfLines={1}>
            {xp} XP
          </T>
        </View>
      </ThemedView>
    </ThemedView>
  );
}

function IconButton({
  name,
  label,
  onPress,
}: {
  name: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic.tap();
        onPress();
      }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <ThemedView style={[styles.iconButton, { backgroundColor: c.surface }]}>
        <Ionicons name={name} size={20} color={c.text} />
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  world: { position: 'absolute', left: 0, right: 0, top: 0 },
  statusSky: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  scene: { position: 'absolute', left: 0 },
  scroll: { paddingHorizontal: space.lg, gap: space.lg },
  // Full-bleed: the page has side padding, the mountain doesn't.
  zone: { marginHorizontal: -space.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  tabular: { fontVariant: ['tabular-nums'] },
  headerIcons: { flexDirection: 'row', gap: space.sm },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  mission: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.xs },
  segments: { flex: 1, flexDirection: 'row', gap: 4 },
  segmentBar: { flex: 1, height: 6, borderRadius: 3 },
  // Wraps the level onto its own line at large text sizes instead of squeezing it.
  missionStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.md,
    rowGap: space.sm,
    marginTop: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  levelItem: { flexGrow: 1, justifyContent: 'flex-end' },
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: space.sm, alignItems: 'center', borderRadius: radius.sm },
  offer: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: 4 },
  offerButtons: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm },
  list: { gap: space.sm },
  footer: { gap: space.md, marginTop: space.sm },
  resting: { gap: space.xs, paddingHorizontal: space.xs },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    minHeight: 56,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  celebrateWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  celebrate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: radius.pill,
  },
});
