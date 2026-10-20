import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { Confetti } from '../components/Art';
import { HabitRow } from '../components/HabitRow';
import { Notices } from '../components/Notices';
import { Button, ProgressBar, Screen, T } from '../components/ui';
import { dateForDay, PROGRAM_DAYS } from '../core/dates';
import { getHabit, habitTitle, levelUp } from '../core/habits';
import {
  currentStreak,
  dayQualifies,
  isFullDay,
  levelProgress,
  levelUpOffers,
  pendingCeremony,
  phaseOf,
  playerLevel,
  totalXp,
  XP_FULL_DAY_BONUS,
} from '../core/progression';
import { haptic } from '../lib/haptics';
import { rescheduleSoon } from '../lib/notifications';
import { useClock } from '../lib/useClock';
import { currentDay, useApp } from '../store/useApp';
import { radius, space, useTheme } from '../theme';

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
  const todayFull = isFullDay(todayLog) && plan.every((p) => todayLog?.completed.includes(p.habitId));
  const todayQualifies = dayQualifies(todayLog);
  const doneCount = plan.filter((p) => log?.completed.includes(p.habitId)).length;

  const xp = useMemo(() => totalXp(logs), [logs]);
  const streak = useMemo(() => currentStreak(logs, start, today), [logs, start, today]);
  const offers = useMemo(() => levelUpOffers(plan, logs, start, today), [plan, logs, start, today]);
  const maintenance = today > PROGRAM_DAYS;

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
    <Screen edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.push('/journey')}
            accessibilityRole="button"
            accessibilityLabel={
              maintenance ? 'Maintenance mode. Open journey' : `Day ${today} of ${PROGRAM_DAYS}. Open journey`
            }
            style={styles.dayBlock}
          >
            {maintenance ? (
              <T v="title">Maintenance</T>
            ) : (
              <View style={styles.dayRow}>
                <T v="display" style={styles.tabular}>
                  Day {today}
                </T>
                <T v="heading" color={c.textFaint} style={styles.tabular}>
                  {' '}
                  / {PROGRAM_DAYS}
                </T>
              </View>
            )}
            <T v="caption" color={c.textDim}>
              {maintenance ? 'Keeping your habits going' : `Phase ${phaseOf(today)} of 3`}
            </T>
          </Pressable>
          <View style={styles.headerIcons}>
            <IconButton name="grid-outline" label="Journey" onPress={() => router.push('/journey')} />
            <IconButton name="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
          </View>
        </View>

        <View style={[styles.stats, { backgroundColor: c.surface }]}>
          <View style={styles.stat}>
            <Ionicons name="flame" size={20} color={streak > 0 ? c.warm : c.textFaint} />
            <T v="heading" style={styles.tabular}>
              {streak}
            </T>
            <T v="caption" color={c.textDim} numberOfLines={1}>
              {streak === 1 ? 'day' : 'days'}
            </T>
          </View>
          <View style={[styles.divider, { backgroundColor: c.border }]} />
          <View style={[styles.stat, { flex: 1.4 }]}>
            <T v="heading" style={styles.tabular}>
              Lv {playerLevel(xp)}
            </T>
            <View style={{ flex: 1 }}>
              <ProgressBar value={levelProgress(xp)} height={5} />
            </View>
            <T v="caption" color={c.textDim} style={styles.tabular}>
              {xp} XP
            </T>
          </View>
        </View>

        {canFixYesterday ? (
          <Animated.View entering={FadeIn} style={[styles.segment, { backgroundColor: c.surface }]}>
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
          </Animated.View>
        ) : null}

        {viewing === 'today' ? <Notices /> : null}

        {viewing === 'today'
          ? offers.slice(0, 1).map((id) => {
              const h = plan.find((p) => p.habitId === id)!;
              const next = getHabit(id)!.levels[levelUp(h.level)];
              return (
                <Animated.View
                  key={id}
                  entering={FadeInDown}
                  exiting={FadeOut}
                  layout={LinearTransition}
                  style={[styles.offer, { borderColor: c.accentInk, backgroundColor: c.accentSoft }]}
                >
                  <T v="overline" color={c.accentInk}>
                    7 days straight
                  </T>
                  <T v="bodyStrong">Level up {habitTitle(h)}?</T>
                  <T v="caption" color={c.textDim}>
                    Next: {next}
                  </T>
                  <View style={styles.offerButtons}>
                    <Button
                      label="Level up"
                      style={{ flex: 1 }}
                      onPress={() => {
                        haptic.success();
                        useApp.getState().acceptLevelUp(id);
                      }}
                    />
                    <Button
                      label="Not yet"
                      kind="secondary"
                      style={{ flex: 1 }}
                      onPress={() => useApp.getState().declineLevelUp(id)}
                    />
                  </View>
                </Animated.View>
              );
            })
          : null}

        <View style={styles.listHeader}>
          <T v="overline" color={c.textDim}>
            {viewing === 'today' ? 'Today' : 'Yesterday · editable until noon'}
          </T>
          <T v="caption" color={doneCount === plan.length ? c.accentInk : c.textDim} style={styles.tabular}>
            {doneCount} of {plan.length} done
          </T>
        </View>

        <Animated.View layout={LinearTransition.duration(200)} style={styles.list}>
          {plan.map((h) => (
            <HabitRow
              key={h.habitId}
              habit={h}
              done={!!log?.completed.includes(h.habitId)}
              onToggle={onToggle}
              onLongPress={viewing === 'today' ? onLongPress : undefined}
            />
          ))}
        </Animated.View>

        {viewing === 'today' ? (
          <View style={styles.footer}>
            <Pressable
              onPress={() => router.push('/add')}
              accessibilityRole="button"
              style={[styles.addButton, { borderColor: c.border }]}
            >
              <Ionicons name="add" size={20} color={c.textDim} />
              <T v="bodyStrong" color={c.textDim}>
                Add a habit
              </T>
            </Pressable>
            <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
              Long-press a habit to edit, swap, or remove it.
            </T>
          </View>
        ) : null}
      </ScrollView>

      {celebrate ? <Confetti spread={200} /> : null}
      {celebrate ? (
        <View pointerEvents="none" style={[styles.celebrateWrap, { bottom: insets.bottom + space.xl }]}>
          <Animated.View
            entering={FadeInDown.springify().damping(16)}
            exiting={FadeOut.duration(250)}
            style={[styles.celebrate, { backgroundColor: c.accent }]}
          >
            <Ionicons name="checkmark-done" size={22} color={c.onAccent} />
            <T v="bodyStrong" color={c.onAccent}>
              Day complete · +{XP_FULL_DAY_BONUS} XP bonus
            </T>
          </Animated.View>
        </View>
      ) : null}
    </Screen>
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
      style={({ pressed }) => [styles.iconButton, { backgroundColor: c.surface, opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={name} size={20} color={c.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.xl, gap: space.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  dayBlock: { flexShrink: 1, gap: 2 },
  dayRow: { flexDirection: 'row', alignItems: 'baseline' },
  tabular: { fontVariant: ['tabular-nums'] },
  headerIcons: { flexDirection: 'row', gap: space.sm, paddingTop: space.sm },
  iconButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, padding: space.lg, gap: space.lg },
  stat: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: space.sm, alignItems: 'center', borderRadius: radius.sm },
  offer: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: 4 },
  offerButtons: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm },
  list: { gap: space.sm },
  footer: { gap: space.md, marginTop: space.sm },
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
