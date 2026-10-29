import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { canEditYesterday, PROGRAM_DAYS, toDateKey } from '../../core/dates';
import { levelProgress, playerLevel, XP_FULL_DAY_BONUS } from '../../core/progression';
import * as P from '../../core/reset/pilot';
import { PHASE_OPENS } from '../../core/reset/readiness';
import { devTools } from '../../lib/flags';
import { haptic } from '../../lib/haptics';
import { pilotNow, pilotToday, useResetPilot } from '../../store/resetPilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { CardButton, HabitCard } from '../HabitCard';
import { SettingsButton } from '../HeaderButton';
import { ThemeToggle } from '../ThemeToggle';
import { Button, ProgressBar, T } from '../ui';

/*
 * The Habits tab: the program's habits as illustrated cards, with what to do, how much, whether it's done and the week's progress. The whole-card swipe
 * completes and undoes; counters (tasks, people) and a strength session's details are small extras on the card.
 * Long-press a card (or open Insights) for details and difficulty. No timers: a swipe confirms.
 */

/** Re-renders when the date or the "yesterday is editable" window changes (on return to the app, and every 30 s). */
function useResetClock() {
  const offset = useResetPilot((s) => s.devDayOffset);
  const [now, setNow] = useState(() => pilotNow(offset));
  useEffect(() => {
    const refresh = () =>
      setNow((prev) => {
        const next = pilotNow(offset);
        const same = toDateKey(prev) === toDateKey(next) && canEditYesterday(prev) === canEditYesterday(next);
        return same ? prev : next;
      });
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    const id = setInterval(refresh, 30_000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [offset]);
  return { yesterdayEditable: canEditYesterday(now) };
}

export function PilotToday() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const program = useResetPilot((s) => s.program)!;
  const offset = useResetPilot((s) => s.devDayOffset);
  const today = pilotToday({ program, devDayOffset: offset });
  const [swiping, setSwiping] = useState(false);
  const { yesterdayEditable } = useResetClock();

  const xp = useMemo(() => P.pilotXp(program), [program]);
  const streak = useMemo(() => P.pilotStreak(program, today), [program, today]);
  const offer = useMemo(() => P.currentOffer(program, today, yesterdayEditable), [program, today, yesterdayEditable]);
  const full = P.dayFull(program, today);
  const done = program.habits.filter((id) => P.isDone(program, id, today)).length;
  const daily = program.habits.filter((id) => P.isDaily(program, id, today));
  const [changed, setChanged] = useState<string | null>(null);

  // The Day complete moment, only on the change to a full day (never on open), gone as soon as it's undone.
  const [celebrated, setCelebrated] = useState(false);
  const wasFull = useRef(full);
  useEffect(() => {
    if (full && !wasFull.current) {
      haptic.success();
      setCelebrated(true);
    }
    wasFull.current = full;
  }, [full]);
  const celebrate = celebrated && full;
  useEffect(() => {
    if (!celebrated) return;
    const t = setTimeout(() => setCelebrated(false), 2200);
    return () => clearTimeout(t);
  }, [celebrated]);
  useEffect(() => {
    if (!changed) return;
    const t = setTimeout(() => setChanged(null), 5000);
    return () => clearTimeout(t);
  }, [changed]);

  const onToggle = useCallback((id: string) => void useResetPilot.getState().toggle(id), []);
  const onDetails = useCallback((id: string) => router.push(`/life-reset/${id}`), []);

  return (
    <ThemedView style={styles.root}>
      <Animated.ScrollView
        scrollEnabled={!swiping}
        directionalLockEnabled
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.sm, paddingBottom: space.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flexShrink: 1 }}>
            <T v="overline" color={c.accentInk} maxFontSizeMultiplier={1.3}>
              Life Reset
            </T>
            <T v="heading" numberOfLines={1} maxFontSizeMultiplier={1.4}>
              {today > PROGRAM_DAYS ? 'Summit reached' : `Day ${today} of ${PROGRAM_DAYS}`}
            </T>
            <T v="caption" color={c.textDim} maxFontSizeMultiplier={1.4}>
              {phaseLine(today)}
            </T>
          </View>
          <View style={styles.headerIcons}>
            <ThemeToggle />
            <SettingsButton />
          </View>
        </View>

        <ThemedView style={[styles.summary, { backgroundColor: c.surface }]}>
          <T
            v="bodyStrong"
            accessibilityLabel={summaryLabel(
              done,
              program.habits.length,
              daily.map((id) => P.nameOf(program, id)),
            )}
            maxFontSizeMultiplier={1.4}
          >
            {full
              ? 'Today is complete.'
              : done
                ? `${done} of ${program.habits.length} done today`
                : 'Nothing done yet today'}
          </T>
          <T v="caption" color={c.textDim}>
            Weekly habits count on the days you do them. Rest days are never missed days.
          </T>
          <ThemedView style={[styles.stats, { borderTopColor: c.border }]}>
            <View style={styles.statItem} accessible accessibilityLabel={`${streak} day streak`}>
              <Ionicons name="flame" size={16} color={streak > 0 ? c.accentInk : c.textFaint} />
              <T v="caption" style={{ fontWeight: '700' }}>
                {streak > 0 ? `${streak}-day streak` : 'Streak starts today'}
              </T>
            </View>
            <View
              style={[styles.statItem, { flexGrow: 1, justifyContent: 'flex-end' }]}
              accessible
              accessibilityLabel={`Level ${playerLevel(xp)}, ${xp} XP`}
            >
              <T v="caption" style={{ fontWeight: '700' }}>
                Lv {playerLevel(xp)}
              </T>
              <View style={{ width: 40 }}>
                <ProgressBar value={levelProgress(xp)} height={4} />
              </View>
              <T v="caption" color={c.textDim}>
                {xp} XP
              </T>
            </View>
          </ThemedView>
        </ThemedView>

        {offer ? (
          <OfferCard
            key={`${offer.habitId}-${offer.offer.kind}`}
            program={program}
            today={today}
            habitId={offer.habitId}
            offer={offer.offer}
            onAccepted={(text) => setChanged(text)}
          />
        ) : null}
        {changed ? (
          <ThemedView
            entering={FadeInDown}
            exiting={FadeOut}
            style={[styles.changed, { backgroundColor: c.surface }]}
            accessibilityLiveRegion="polite"
          >
            <Ionicons name="calendar-outline" size={20} color={c.accentInk} />
            <T v="bodyStrong" style={{ flex: 1 }}>
              {changed}
            </T>
          </ThemedView>
        ) : null}

        <Animated.View layout={LinearTransition.duration(200)} style={styles.cards}>
          {program.habits.map((id) => (
            <PilotCard
              key={id}
              program={program}
              habitId={id}
              today={today}
              onToggle={onToggle}
              onDetails={onDetails}
              onSwipe={setSwiping}
            />
          ))}
        </Animated.View>

        <View style={styles.footer}>
          {program.habits.length < P.MAX_HABITS ? (
            <Button
              label="Add a habit"
              kind="secondary"
              icon={<Ionicons name="add" size={18} color={c.text} />}
              onPress={() => router.push('/life-reset/add')}
            />
          ) : null}
          <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
            Swipe a card to complete it. Long-press for details and difficulty.
          </T>
          {__DEV__ && devTools() ? <PilotClock today={today} /> : null}
        </View>
      </Animated.ScrollView>

      {celebrate ? (
        <View pointerEvents="none" style={styles.celebrateWrap}>
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
    </ThemedView>
  );
}

function phaseLine(today: number): string {
  if (today > PROGRAM_DAYS) return 'Your targets stay where they are.';
  if (today >= PHASE_OPENS.mastery) return 'Mastery targets are open when you’re ready';
  if (today >= PHASE_OPENS.momentum) return 'Momentum targets are open when you’re ready';
  return 'Foundation';
}

const summaryLabel = (done: number, total: number, daily: string[]) =>
  `${done} of ${total} habits done today. ${daily.length ? `${daily.join(', ')} is due every day.` : ''}`;

/** One habit as the usual card: its target, its week, and a counter or session details where it has them. */
function PilotCard({
  program,
  habitId,
  today,
  onToggle,
  onDetails,
  onSwipe,
}: {
  program: P.PilotProgram;
  habitId: P.PilotHabitId;
  today: number;
  onToggle: (id: string) => void;
  onDetails: (id: string) => void;
  onSwipe: (active: boolean) => void;
}) {
  const { isDark } = useTheme();
  const level = P.levelFor(program, habitId, today);
  const done = P.isDone(program, habitId, today);
  const week = P.weekProgress(program, habitId, today);
  const state = P.stateOn(program, habitId, today);
  const track = P.trackOf(program, habitId, today);
  const counter = P.counterTarget(program, habitId, today);
  const strength = habitId === 'strength_log';
  const ink = isDark ? '#F7F5FF' : '#1B1830';
  const chip = isDark ? 'rgba(28,27,37,0.62)' : 'rgba(255,255,255,0.72)';
  const edge = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(27,24,48,0.12)';

  const weekText =
    state === 'not-eligible'
      ? 'Not a workday · rest'
      : week
        ? week.goal === 0
          ? 'A short week: no goal this week'
          : week.credited >= week.goal
            ? `${week.credited} of ${week.goal} this week · goal met`
            : `${week.credited} of ${week.goal} this week`
        : 'Every day';
  const count = track.count ?? 0;
  const counterText = counter !== null ? `${Math.min(count, counter)} of ${counter}` : null;

  const accessory = (
    <View style={styles.accessory}>
      <T v="caption" color={ink} style={styles.week} numberOfLines={1}>
        {weekText}
      </T>
      {counter !== null && !done ? (
        <CardButton
          onPress={() => {
            haptic.tap();
            useResetPilot.getState().count(habitId, 1);
          }}
          style={[styles.pill, { backgroundColor: chip, borderColor: edge }]}
        >
          <Ionicons name="add" size={16} color={ink} />
          <T v="caption" color={ink} style={styles.pillText}>
            {counterText}
          </T>
        </CardButton>
      ) : null}
      {track.skipped && !done ? (
        <T v="caption" color={ink} style={styles.week}>
          Skipped today
        </T>
      ) : null}
      {strength && done ? (
        <CardButton
          onPress={() => onDetails(habitId)}
          style={[styles.pill, { backgroundColor: chip, borderColor: edge }]}
        >
          <Ionicons name="create-outline" size={14} color={ink} />
          <T v="caption" color={ink} style={styles.pillText}>
            {track.session?.type || track.session?.minutes
              ? [track.session.type, track.session.minutes ? `${track.session.minutes} min` : null]
                  .filter(Boolean)
                  .join(' · ')
              : 'Add details'}
          </T>
        </CardButton>
      ) : null}
    </View>
  );

  const actions =
    counter !== null && !done
      ? [{ name: 'count', label: `Add one (${counterText})`, run: () => useResetPilot.getState().count(habitId, 1) }]
      : [];

  return (
    <HabitCard
      habitId={habitId}
      scene={program.custom?.[habitId]?.scene}
      done={done}
      onToggle={onToggle}
      onLongPress={onDetails}
      onSwipe={onSwipe}
      accessory={accessory}
      actions={actions}
      display={{
        title: P.nameOf(program, habitId),
        task: P.targetText(program, habitId, today),
        levelIndex: P.phaseIndex(level),
        levelLabel: P.levelLineFor(program, habitId, today),
        summary: [weekText, counterText].filter(Boolean).join('. '),
        hint: strength ? 'Swipe right to log a session' : week ? 'Swipe right if you did it today' : undefined,
        doneText: strength ? 'Session logged' : undefined,
      }}
    />
  );
}

/** A readiness offer: step up to the next phase, or a step easier. Always the person's choice. */
function OfferCard({
  program,
  today,
  habitId,
  offer,
  onAccepted,
}: {
  program: P.PilotProgram;
  today: number;
  habitId: P.PilotHabitId;
  offer: import('../../core/reset/readiness').Offer;
  onAccepted: (text: string) => void;
}) {
  const { c } = useTheme();
  const name = P.nameOf(program, habitId);
  const next = P.targetText(P.accept(program, habitId, offer, today), habitId, offer.effectiveDay);
  const when = offer.effectiveDay === today + 1 ? 'tomorrow' : `next Monday (Day ${offer.effectiveDay})`;
  const up = offer.kind === 'step-up';
  return (
    <ThemedView
      entering={FadeInDown}
      exiting={FadeOut}
      layout={LinearTransition}
      style={[styles.offer, { borderColor: c.accentInk, backgroundColor: c.accentSoft }]}
    >
      <T v="overline" color={c.accentInk}>
        {up ? (offer.early ? 'Ahead of schedule' : 'You’ve been consistent') : 'Want it lighter?'}
      </T>
      <T v="bodyStrong">{up ? `${name} is ready for ${P.PHASE_NAME[offer.to.phase]}` : `Make ${name} a step easier`}</T>
      <T v="caption" color={c.textDim}>
        {`From ${when}: ${next}. `}
        {up ? 'Not now is fine: nothing changes and nothing is lost.' : 'You can make it harder again any time.'}
      </T>
      <View style={styles.offerButtons}>
        <Button
          label={up ? 'Step up' : 'Make it easier'}
          style={{ flex: 1 }}
          onPress={() => {
            useResetPilot.getState().accept(habitId, offer);
            haptic.success();
            onAccepted(`${name}: ${next}, from ${when}.`);
          }}
        />
        <Button
          label="Not now"
          kind="secondary"
          style={{ flex: 1 }}
          onPress={() => useResetPilot.getState().decline(habitId, offer)}
        />
      </View>
    </ThemedView>
  );
}

/** Development builds: the program's clock (time travel). */
function PilotClock({ today }: { today: number }) {
  const { c } = useTheme();
  const offset = useResetPilot((s) => s.devDayOffset);
  const set = useResetPilot((s) => s.setDevDayOffset);
  const jump = (day: number) => set(offset + (day - today));
  return (
    <ThemedView style={[styles.devClock, { borderColor: c.border }]}>
      <T v="caption" color={c.textDim}>
        Life Reset clock (development): Day {today}, offset {offset}
      </T>
      <View style={styles.devRow}>
        {[
          ['−1 day', () => set(offset - 1)],
          ['+1 day', () => set(offset + 1)],
          ['+7 days', () => set(offset + 7)],
          ['Day 22', () => jump(22)],
          ['Day 45', () => jump(45)],
          ['Reset', () => set(0)],
        ].map(([label, run]) => (
          <Button key={label as string} label={label as string} kind="secondary" onPress={run as () => void} />
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: space.lg, gap: space.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  headerIcons: { flexDirection: 'row', gap: space.sm },
  summary: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: space.md,
    rowGap: space.sm,
    marginTop: space.xs,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  offer: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: 4 },
  offerButtons: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  changed: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg, padding: space.lg },
  cards: { gap: space.lg },
  accessory: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm, marginTop: 6 },
  week: { fontWeight: '600', opacity: 0.85 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
  },
  pillText: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  footer: { gap: space.md, marginTop: space.sm },
  devClock: { borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: space.sm },
  devRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  celebrateWrap: { position: 'absolute', left: 0, right: 0, bottom: space.xl, alignItems: 'center' },
  celebrate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: radius.pill,
  },
});
