import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useReducedMotion,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { canEditYesterday, PROGRAM_DAYS, toDateKey } from '../../core/dates';
import { XP_FULL_DAY_BONUS } from '../../core/progression';
import * as C from '../../core/reset/charts';
import { absenceStart } from '../../core/reset/comeback';
import { newlyReached, type Collectible } from '../../core/reset/collection';
import * as P from '../../core/reset/pilot';
import { PHASE_OPENS } from '../../core/reset/readiness';
import { devTools } from '../../lib/flags';
import { haptic } from '../../lib/haptics';
import { usePreferences } from '../../store/preferences';
import { pilotNow, pilotToday, useResetPilot } from '../../store/resetPilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { CardButton, HabitCard } from '../HabitCard';
import { cover } from '../onboarding/cover';
import { ceremonyCover, setCeremonyState, useCeremonyState } from '../ceremony/state';
import { Button, T } from '../ui';
import { ReflectionInvite } from '../reflection/ReflectionInvite';
import { WelcomeBack } from './WelcomeBack';
import { UnlockMoment } from '../collection/UnlockMoment';
import { ChooseNextCard } from '../beyond/ChooseNextCard';
import { TodayHero } from './TodayHero';
import { useT } from '../../i18n/react';
import { formatList, t as tr } from '../../i18n';
import { sessionName } from '../../core/reset/pilot';

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
  const t = useT();
  const insets = useSafeAreaInsets();
  const program = useResetPilot((s) => s.program)!;
  const offset = useResetPilot((s) => s.devDayOffset);
  const today = pilotToday({ program, devDayOffset: offset });
  const [swiping, setSwiping] = useState(false);
  const { yesterdayEditable } = useResetClock();

  // Lifetime XP (earlier ascents included): the title, the collection and the chip all follow it.
  const xp = useMemo(() => P.lifetimeXp(program), [program]);
  const awaiting = P.awaitingChoice(program, today);
  const streak = useMemo(() => P.pilotStreak(program, today), [program, today]);
  const offer = useMemo(() => P.currentOffer(program, today, yesterdayEditable), [program, today, yesterdayEditable]);
  const full = P.dayFull(program, today);
  const done = program.habits.filter((id) => P.isDone(program, id, today)).length;
  const daily = program.habits.filter((id) => P.isDaily(program, id, today));
  const [changed, setChanged] = useState<string | null>(null);

  // The Day complete moment: only when a completion on this screen turns today complete (never on open, a rerender or
  // a change of day), at most once a day, and gone as soon as it's undone.
  const [celebrated, setCelebrated] = useState(false);
  const was = useRef({ day: today, full });
  const celebratedDay = useRef<number | null>(full ? today : null);
  useEffect(() => {
    const before = was.current;
    was.current = { day: today, full };
    if (full && before.day === today && !before.full && celebratedDay.current !== today) {
      celebratedDay.current = today;
      setCelebrated(true);
      // With the pill, a beat after the last card's own confirm (two moments, never one muddled buzz).
      setTimeout(() => haptic.success(), 260);
    }
  }, [full, today]);
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

  // Coming in from set-up's finale: the page rises the last few points as the finale fades (0 otherwise).
  const reduceMotion = useReducedMotion();
  // Coming in from a ceremony too: the page rises as it fades.
  const arrive = useAnimatedStyle(() => ({
    transform: [{ translateY: reduceMotion ? 0 : Math.max(cover.value, ceremonyCover.value) * 12 }],
  }));

  // The welcome back, after an absence of two or more days that had something due (comeback.ts): once per absence,
  // never during a ceremony or the onboarding finale, and only for those who haven't turned it off.
  const comebacks = usePreferences((s) => s.comebacks);
  const ceremony = useCeremonyState();
  // The days before today, judged once a day: a check-off today never changes them, so it never pays for this.
  const cells = useMemo(() => C.dayCells(useResetPilot.getState().program!, today), [today]);
  const absence = absenceStart(cells, today);
  const due =
    comebacks && absence !== null && program.comeback?.seen !== absence && !ceremony.ceremonyUp && !ceremony.finaleUp;
  const [welcome, setWelcome] = useState<number | null>(null);
  // Adjusting state while rendering (React's pattern for following a condition): it stays up until dismissed.
  if (due && welcome === null) setWelcome(absence);
  useEffect(() => {
    // Seen as soon as it's shown, so another open (or a restart) never brings it back for this absence.
    if (welcome !== null) useResetPilot.getState().markComeback(welcome);
    // A milestone moment waits while the welcome back is up.
    setCeremonyState({ welcomeUp: welcome !== null });
    return () => setCeremonyState({ welcomeUp: false });
  }, [welcome]);

  // The collection: objects XP has reached join it (for good), with a moment for the newest, once the habit that
  // earned it has landed, and never over a ceremony, the onboarding finale or the welcome back.
  const owned = program.collection?.unlocked;
  const fresh = useMemo(() => newlyReached(xp, owned ?? []), [xp, owned]);
  const [unlock, setUnlock] = useState<{ item: Collectible; more: number } | null>(null);
  const quiet = ceremony.ceremonyUp || ceremony.finaleUp || welcome !== null;
  useEffect(() => {
    if (!fresh.length || unlock || quiet) return;
    const t = setTimeout(() => {
      useResetPilot.getState().unlockCollectibles(fresh.map((f) => f.id));
      setUnlock({ item: fresh[fresh.length - 1], more: fresh.length - 1 });
    }, 900);
    return () => clearTimeout(t);
  }, [fresh, unlock, quiet]);

  const onToggle = useCallback((id: string) => void useResetPilot.getState().toggle(id), []);
  const onDetails = useCallback((id: string) => router.push(`/life-reset/${id}`), []);

  return (
    <ThemedView style={[styles.root, arrive]}>
      <Animated.ScrollView
        scrollEnabled={!swiping}
        directionalLockEnabled
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.sm, paddingBottom: space.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        <TodayHero
          today={today}
          done={done}
          total={program.habits.length}
          full={full}
          streak={streak}
          xp={xp}
          momentum={!!program.after}
          ascent={P.ascentOf(program)}
          phase={program.after ? t('beyond.momentumPhase') : phaseLine(today)}
          label={summaryLabel(
            done,
            program.habits.length,
            daily.map((id) => P.nameOf(program, id)),
          )}
        />

        {awaiting ? <ChooseNextCard /> : null}

        {welcome !== null ? (
          <WelcomeBack
            start={welcome}
            completeDays={cells.filter((d) => d.state === 'full').length}
            onClose={() => setWelcome(null)}
          />
        ) : (
          <ReflectionInvite program={program} today={today} />
        )}

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

        <View style={styles.section}>
          <T v="overline" color={c.textDim}>
            {t('today.todaysHabits')}
          </T>
          <T v="caption" color={full ? c.sageInk : c.textDim} style={{ fontWeight: '700' }}>
            {awaiting
              ? t('today.resting')
              : full
                ? t('today.allDone')
                : t('today.progress', { done, total: program.habits.length })}
          </T>
        </View>
        {/* Past the summit with nothing chosen yet: the habits rest (nothing is tracked) until the person chooses. */}
        <Animated.View
          layout={LinearTransition.duration(200)}
          style={[styles.cards, awaiting && { opacity: 0.45 }]}
          pointerEvents={awaiting ? 'none' : 'auto'}
          accessibilityElementsHidden={awaiting}
          importantForAccessibility={awaiting ? 'no-hide-descendants' : 'auto'}
        >
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
          {program.habits.length < P.MAX_HABITS && !awaiting ? (
            <Button
              label={t('today.addHabit')}
              kind="secondary"
              icon={<Ionicons name="add" size={18} color={c.text} />}
              onPress={() => router.push('/life-reset/add')}
            />
          ) : null}
          <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
            {t('today.swipeHelp')}
          </T>
          {__DEV__ && devTools() ? <PilotClock today={today} /> : null}
        </View>
      </Animated.ScrollView>

      {unlock ? <UnlockMoment item={unlock.item} more={unlock.more} onClose={() => setUnlock(null)} /> : null}
      {celebrate ? (
        <View pointerEvents="none" style={styles.celebrateWrap}>
          <ThemedView
            entering={FadeInDown.duration(380).easing(Easing.bezier(0.22, 1, 0.36, 1))}
            exiting={FadeOut.duration(250)}
            style={[styles.celebrate, { backgroundColor: c.sage }]}
          >
            <Ionicons name="checkmark-done" size={22} color={c.onTint} />
            <T v="bodyStrong" color={c.onTint}>
              {t('today.dayComplete', { xp: XP_FULL_DAY_BONUS })}
            </T>
          </ThemedView>
        </View>
      ) : null}
    </ThemedView>
  );
}

function phaseLine(today: number): string {
  if (today > PROGRAM_DAYS) return tr('today.phase.after');
  if (today >= PHASE_OPENS.mastery) return tr('today.phase.mastery');
  if (today >= PHASE_OPENS.momentum) return tr('today.phase.momentum');
  return tr('today.phase.foundation');
}

const summaryLabel = (done: number, total: number, daily: string[]) =>
  `${tr('today.summary', { done, total })}${daily.length ? tr('today.dueDaily', { list: formatList(daily) }) : ''}`;

/** One habit as the usual card: its target, its week, and a counter or session details where it has them. */
/**
 * One habit's card. Its values are worked out here (cheap), and the card itself (HabitCard: the scene, the
 * gestures, the animations) is a memoized view of plain values, so completing one habit re-renders only that
 * card, never the others.
 */
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
  const level = P.levelFor(program, habitId, today);
  const done = P.isDone(program, habitId, today);
  const week = P.weekProgress(program, habitId, today);
  const state = P.stateOn(program, habitId, today);
  const track = P.trackOf(program, habitId, today);
  const counter = P.counterTarget(program, habitId, today);
  const weekText =
    state === 'not-eligible'
      ? tr('today.card.notWorkday')
      : week
        ? week.goal === 0
          ? tr('today.card.shortWeek')
          : tr(week.credited >= week.goal ? 'today.card.weekMet' : 'today.card.week', {
              done: week.credited,
              goal: week.goal,
            })
        : tr('today.card.everyDay');
  const count = track.count ?? 0;
  const session =
    track.session?.type || track.session?.minutes
      ? [
          track.session.type ? sessionName(track.session.type) : null,
          track.session.minutes ? tr('today.card.minutes', { minutes: track.session.minutes }) : null,
        ]
          .filter(Boolean)
          .join(' · ')
      : null;
  return (
    <CardView
      habitId={habitId}
      scene={program.custom?.[habitId]?.scene}
      done={done}
      weekly={!!week}
      weekText={weekText}
      counterText={
        counter !== null ? tr('today.card.counter', { done: Math.min(count, counter), goal: counter }) : null
      }
      skipped={!!track.skipped}
      session={session}
      title={P.nameOf(program, habitId)}
      task={P.targetText(program, habitId, today)}
      levelIndex={P.phaseIndex(level)}
      levelLabel={P.levelLineFor(program, habitId, today)}
      onToggle={onToggle}
      onDetails={onDetails}
      onSwipe={onSwipe}
    />
  );
}

const CardView = memo(function CardView({
  habitId,
  scene,
  done,
  weekly,
  weekText,
  counterText,
  skipped,
  session,
  title,
  task,
  levelIndex,
  levelLabel,
  onToggle,
  onDetails,
  onSwipe,
}: {
  habitId: string;
  scene: number | undefined;
  done: boolean;
  weekly: boolean;
  weekText: string;
  counterText: string | null;
  skipped: boolean;
  session: string | null;
  title: string;
  task: string;
  levelIndex: number;
  levelLabel: string;
  onToggle: (id: string) => void;
  onDetails: (id: string) => void;
  onSwipe: (active: boolean) => void;
}) {
  const { isDark } = useTheme();
  const t = useT();
  const strength = habitId === 'strength_log';
  const ink = isDark ? '#F7F5FF' : '#1B1830';
  const chip = isDark ? 'rgba(28,27,37,0.62)' : 'rgba(255,255,255,0.72)';
  const edge = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(27,24,48,0.12)';
  const addOne = () => useResetPilot.getState().count(habitId, 1);

  const accessory = (
    <View style={styles.accessory}>
      <T v="caption" color={ink} style={styles.week} numberOfLines={1}>
        {weekText}
      </T>
      {counterText !== null && !done ? (
        <CardButton
          onPress={() => {
            haptic.select();
            addOne();
          }}
          style={[styles.pill, { backgroundColor: chip, borderColor: edge }]}
        >
          <Ionicons name="add" size={16} color={ink} />
          <T v="caption" color={ink} style={styles.pillText}>
            {counterText}
          </T>
        </CardButton>
      ) : null}
      {skipped && !done ? (
        <T v="caption" color={ink} style={styles.week}>
          {t('today.card.skipped')}
        </T>
      ) : null}
      {strength && done ? (
        <CardButton
          onPress={() => onDetails(habitId)}
          style={[styles.pill, { backgroundColor: chip, borderColor: edge }]}
        >
          <Ionicons name="create-outline" size={14} color={ink} />
          <T v="caption" color={ink} style={styles.pillText}>
            {session ?? t('today.card.addDetails')}
          </T>
        </CardButton>
      ) : null}
    </View>
  );

  const actions =
    counterText !== null && !done
      ? [{ name: 'count', label: t('today.card.addOne', { count: counterText }), run: addOne }]
      : [];

  return (
    <HabitCard
      habitId={habitId}
      scene={scene}
      done={done}
      onToggle={onToggle}
      onLongPress={onDetails}
      onSwipe={onSwipe}
      accessory={accessory}
      actions={actions}
      display={{
        title,
        task,
        levelIndex,
        levelLabel,
        summary: [weekText, counterText].filter(Boolean).join('. '),
        hint: strength ? t('today.card.strengthHint') : weekly ? t('today.card.weeklyHint') : undefined,
        doneText: strength ? t('today.card.sessionLogged') : undefined,
      }}
    />
  );
});

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
  const t = useT();
  const name = P.nameOf(program, habitId);
  const next = P.targetText(P.accept(program, habitId, offer, today), habitId, offer.effectiveDay);
  const when =
    offer.effectiveDay === today + 1
      ? t('today.offer.tomorrow')
      : t('today.offer.nextMonday', { day: offer.effectiveDay });
  const up = offer.kind === 'step-up';
  return (
    <ThemedView
      entering={FadeInDown}
      exiting={FadeOut}
      layout={LinearTransition}
      style={[styles.offer, { borderColor: c.accentInk, backgroundColor: c.accentSoft }]}
    >
      <T v="overline" color={c.accentInk}>
        {up ? (offer.early ? t('today.offer.early') : t('today.offer.consistent')) : t('today.offer.lighter')}
      </T>
      <T v="bodyStrong">
        {up
          ? t('today.offer.ready', { habit: name, phase: P.phaseName(offer.to.phase) })
          : t('today.offer.easier', { habit: name })}
      </T>
      <T v="caption" color={c.textDim}>
        {t('today.offer.from', { when, target: next })}
        {up ? t('today.offer.upNote') : t('today.offer.downNote')}
      </T>
      <View style={styles.offerButtons}>
        <Button
          label={up ? t('today.offer.stepUp') : t('today.offer.makeEasier')}
          style={{ flex: 1 }}
          onPress={() => {
            useResetPilot.getState().accept(habitId, offer);
            haptic.confirm();
            onAccepted(t('today.offer.accepted', { habit: name, target: next, when }));
          }}
        />
        <Button
          label={t('common.notNow')}
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
  offer: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: 4 },
  offerButtons: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  changed: { flexDirection: 'row', alignItems: 'center', gap: space.md, borderRadius: radius.lg, padding: space.lg },
  section: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: space.xs,
    marginBottom: -space.xs,
  },
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
