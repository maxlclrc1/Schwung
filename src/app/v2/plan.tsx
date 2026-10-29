import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TargetPath } from '../../components/TargetPath';
import { Button, Screen, T } from '../../components/ui';
import { OnboardingBackdrop } from '../../components/World';
import { shownText } from '../../core/habits';
import { GROWTH_NOTES } from '../../core/onboarding';
import { GOAL_LABEL } from '../../core/plan';
import {
  canChoose,
  CATEGORIES,
  choiceNeedsTime,
  extraOptions,
  extraRoom,
  iconFor,
  pendingTimeQuestion,
  previewPlan,
  type LibraryOption,
} from '../../core/v2/program';
import type { ProfileV2, Targets } from '../../core/v2/types';
import { lifeResetForNewPrograms, v2ForNewPrograms } from '../../lib/flags';
import { haptic } from '../../lib/haptics';
import { useApp } from '../../store/useApp';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

type IconName = keyof typeof Ionicons.glyphMap;

// The planned path, not a promise: early offers and step-downs can change the timing (see GROWTH_NOTES).
const PHASE_ABOUT: [string, string, string] = [
  'Where you start: the easy end of what you do now.',
  'Planned from Day 22, or sooner if you’re ready.',
  'Planned from Day 45: the full version of the habit.',
];

/** Optional extras shown before "Show more". */
const EXTRAS_SHOWN = 3;

/** The V2 plan reveal with the choice step (channels that offer V2 to new programs, see lib/flags). */
export default function PlanV2() {
  const { c } = useTheme();
  const profile = useApp((s) => s.profile);
  const started = useApp((s) => s.startedAt !== null);
  // Retired for new programs where they're Life Reset programs (lib/flags): the start screen leads there instead.
  const enabled = v2ForNewPrograms() && !lifeResetForNewPrograms();
  const plan = useMemo(() => (profile ? previewPlan(profile) : null), [profile]);
  const [chosen, setChosen] = useState<string[]>([]);
  // Optional extras: never preselected, added only when the person picks them.
  const [extras, setExtras] = useState<string[]>([]);
  const [moreExtras, setMoreExtras] = useState(false);
  // A choice or extra waiting for the wake (or bed) time it needs; added when the person comes back with an
  // answer. Refs, so setting it doesn't re-run the focus effect before the time screen opens.
  const pending = useRef<{ id: string; extra: boolean } | null>(null);
  const chosenRef = useRef(chosen);
  const extrasRef = useRef(extras);
  useEffect(() => {
    chosenRef.current = chosen;
    extrasRef.current = extras;
  }, [chosen, extras]);
  const [notice, setNotice] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!profile || !plan || plan.status !== 'ok') return;
      // Answers can change what fits (e.g. a changing wake time rules out Steady wake-up): keep every choice
      // that still fits, in order, so nothing else is lost.
      const list = chosenRef.current;
      const kept = list.reduce<string[]>((acc, id) => (canChoose(plan, acc, id) ? [...acc, id] : acc), []);
      const waiting = pending.current;
      pending.current = null;
      let next = kept;
      if (waiting && !waiting.extra && !choiceNeedsTime(profile, kept, waiting.id)) {
        if (canChoose(plan, kept, waiting.id)) {
          next = [...kept, waiting.id];
          setNotice(null);
        } else {
          const title = plan.options.find((o) => o.id === waiting.id)?.title ?? 'That habit';
          setNotice(`${title} doesn’t fit your schedule, so it wasn’t added.`);
        }
      }
      if (next.join() !== list.join()) setChosen(next);
      // Extras that still fit after the choices, in order; then the one that was waiting for a time answer.
      let more = keptExtras(profile, plan, next, extrasRef.current);
      if (waiting?.extra) {
        const o = extraOptions(profile, plan, [...next, ...more]).find((x) => x.id === waiting.id);
        if (o && o.needsTime === null && extraRoom(plan, [...next, ...more]) > 0) more = [...more, waiting.id];
        else if (!o || o.needsTime !== null) setNotice('That habit doesn’t fit your schedule, so it wasn’t added.');
      }
      if (more.join() !== extrasRef.current.join()) setExtras(more);
    }, [profile, plan]),
  );

  if (started) return <Redirect href="/today" />;
  if (!enabled || !profile) return <Redirect href="/welcome" />;
  if (pendingTimeQuestion(profile)) return <Redirect href="/v2/time" />;
  if (!plan || plan.status !== 'ok') return <Redirect href="/v2/quiz" />;

  const { picks, choice, options, planNotes, limitation, blocked } = plan;
  const required = choice?.required ?? 0;
  // The plan as it will start: a required choice counts toward it from the start.
  const planned = picks.length + Math.max(required, chosen.length) + extras.length;
  const ready = !blocked && (required === 0 || chosen.length === required);
  // Optional extras: offered once the plan itself is complete, and only while there's room for one more.
  const extraPool = ready ? extraOptions(profile, plan, chosen) : [];
  const roomBefore = ready ? extraRoom(plan, chosen) : 0;
  const extraAvailable = (id: string) =>
    extras.includes(id) ||
    (extraRoom(plan, [...chosen, ...extras]) > 0 &&
      extraOptions(profile, plan, [...chosen, ...extras]).some((o) => o.id === id));
  // Prefer a habit the person will actually grow into; a plan of only the foundation shows their first choice.
  const firstChoice = options.find((o) => o.id === chosen[0]);
  const example = picks.find((p) => p.source !== 'foundation') ?? firstChoice ?? picks[0];

  const toggle = (id: string) => {
    haptic.tap();
    setNotice(null);
    if (!chosen.includes(id) && canChoose(plan, chosen, id) && choiceNeedsTime(profile, chosen, id)) {
      // This habit's targets need the wake time: ask now, then add it on the way back.
      pending.current = { id, extra: false };
      router.push({ pathname: '/v2/time', params: { with: [...chosen, id].join(',') } });
      return;
    }
    const next = chosen.includes(id)
      ? chosen.filter((x) => x !== id)
      : canChoose(plan, chosen, id)
        ? [...chosen, id]
        : chosen;
    setChosen(next);
    // A different choice can change which extras still fit.
    setExtras((list) => keptExtras(profile, plan, next, list));
  };

  const toggleExtra = (o: LibraryOption) => {
    haptic.tap();
    setNotice(null);
    if (extras.includes(o.id)) {
      setExtras((list) =>
        keptExtras(
          profile,
          plan,
          chosen,
          list.filter((x) => x !== o.id),
        ),
      );
      return;
    }
    if (!extraAvailable(o.id)) return;
    if (o.needsTime) {
      // Its targets need the wake (or bed) time: ask now, then add it on the way back.
      pending.current = { id: o.id, extra: true };
      router.push({ pathname: '/v2/time', params: { with: [...chosen, ...extras, o.id].join(',') } });
      return;
    }
    setExtras((list) => [...list, o.id]);
  };

  const begin = () => {
    if (!useApp.getState().startProgramV2(chosen, extras)) {
      if (useApp.getState().startedAt) {
        if (router.canDismiss()) router.dismissAll();
        router.replace('/today');
      }
      return;
    }
    haptic.success();
    router.replace('/reminder');
  };

  return (
    <Screen backdrop={<OnboardingBackdrop />}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={FadeInDown.duration(400)} style={{ gap: space.sm }}>
          <T v="overline" color={c.accentInk}>
            Your plan · Built for {GOAL_LABEL[profile.goal]}
          </T>
          <T v="title" accessibilityRole="header">
            {planned} habits. Starting where you are.
          </T>
          <T color={c.textDim}>
            Each one starts at the easy end of what you do now and grows with you over 66 days. Swap, edit, or add
            habits anytime from Today.
          </T>
        </Animated.View>

        <View style={styles.list}>
          {picks.map((p, i) => (
            <Animated.View
              key={p.id}
              entering={FadeInDown.delay(150 + i * 90).duration(400)}
              style={[styles.item, { backgroundColor: c.surface }]}
              accessible
              accessibilityLabel={`${shownText(p.targets.easy)}.${p.forGoal ? ' For your goal.' : ''} ${p.reason} Builds toward ${shownText(p.targets.hard)}. ${p.notes.map((n) => shownText(n)).join(' ')}`}
            >
              <HabitIcon id={p.id} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{shownText(p.targets.easy)}</T>
                <T v="caption" color={c.textDim}>
                  {p.reason}
                </T>
                <BuildsToward target={p.targets.hard} />
                {p.notes.map((n) => (
                  <T key={n} v="caption" color={c.textFaint}>
                    {shownText(n)}
                  </T>
                ))}
                {p.forGoal ? (
                  <ThemedView style={[styles.tag, { backgroundColor: c.accentSoft }]}>
                    <T v="caption" color={c.accentInk} style={styles.tagText} maxFontSizeMultiplier={1.3}>
                      For your goal
                    </T>
                  </ThemedView>
                ) : null}
              </View>
            </Animated.View>
          ))}
        </View>

        {limitation || planNotes.length ? (
          <ThemedView style={[styles.notes, { backgroundColor: c.surface }]}>
            {limitation ? (
              <View style={styles.noteRow}>
                <Ionicons name="flask" size={18} color={c.accentInk} />
                <T v="caption" style={{ flex: 1 }}>
                  {limitation}
                </T>
              </View>
            ) : null}
            {planNotes.map((n) => (
              <View key={n} style={styles.noteRow}>
                <Ionicons name="information-circle" size={18} color={c.textDim} />
                <T v="caption" color={c.textDim} style={{ flex: 1 }}>
                  {n}
                </T>
              </View>
            ))}
          </ThemedView>
        ) : null}

        {/* A required choice keeps its own step; an optional one is part of "Make it yours" below. */}
        {choice && !blocked && required > 0 ? (
          <View style={{ gap: space.md }}>
            <View style={{ gap: space.xs }}>
              <T v="overline" color={c.textDim}>
                Choose to continue
              </T>
              <T v="heading" accessibilityRole="header">
                Choose {required} more
              </T>
              <T v="caption" color={c.textDim}>
                {choice.ruleNote}
              </T>
              {notice ? (
                <T v="caption" color={c.accentInk} accessibilityLiveRegion="polite">
                  {notice}
                </T>
              ) : null}
            </View>
            {options.map((o) => {
              const selected = chosen.includes(o.id);
              const available = selected || canChoose(plan, chosen, o.id);
              return (
                <Pressable
                  key={o.id}
                  onPress={() => toggle(o.id)}
                  disabled={!available}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected, disabled: !available }}
                  accessibilityLabel={`${o.title}. ${shownText(o.targets.easy)}. ${o.why} Builds toward ${shownText(o.targets.hard)}.`}
                  style={({ pressed }) => ({ opacity: !available ? 0.45 : pressed ? 0.75 : 1 })}
                >
                  <ThemedView
                    style={[
                      styles.item,
                      styles.choice,
                      {
                        backgroundColor: selected ? c.accentSoft : c.surface,
                        borderColor: selected ? c.accentInk : 'transparent',
                      },
                    ]}
                  >
                    <HabitIcon id={o.id} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <T v="bodyStrong">{shownText(o.targets.easy)}</T>
                      <T v="caption" color={c.textDim}>
                        {o.why}
                      </T>
                      <BuildsToward target={o.targets.hard} />
                      {o.notes.map((n) => (
                        <T key={n} v="caption" color={c.textFaint}>
                          {shownText(n)}
                        </T>
                      ))}
                    </View>
                    <Ionicons
                      name={selected ? 'checkbox' : 'square-outline'}
                      size={24}
                      color={selected ? c.accentInk : c.textFaint}
                    />
                  </ThemedView>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {roomBefore > 0 && extraPool.length ? (
          <Extras
            pool={extraPool}
            extras={extras}
            room={roomBefore}
            more={moreExtras}
            onMore={() => setMoreExtras(true)}
            available={extraAvailable}
            onToggle={toggleExtra}
            note={required === 0 ? choice?.ruleNote : undefined}
            notice={required === 0 ? notice : null}
          />
        ) : null}

        {example ? <Growth title={example.title} targets={example.targets} /> : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button label={blocked ? 'Not available yet' : 'Begin with this plan'} onPress={begin} disabled={!ready} />
      </View>
    </Screen>
  );
}

function HabitIcon({ id }: { id: string }) {
  const { c } = useTheme();
  return (
    <ThemedView style={[styles.num, { backgroundColor: c.accentSoft }]}>
      <Ionicons name={iconFor(id) as IconName} size={20} color={c.accentInk} />
    </ThemedView>
  );
}

/** Extras that still fit next to these choices, in the order they were added. */
function keptExtras(
  profile: ProfileV2,
  plan: Extract<ReturnType<typeof previewPlan>, { status: 'ok' }>,
  chosen: string[],
  list: string[],
): string[] {
  return list.reduce<string[]>((acc, id) => {
    const o = extraOptions(profile, plan, [...chosen, ...acc]).find((x) => x.id === id);
    return o && o.needsTime === null && extraRoom(plan, [...chosen, ...acc]) > 0 ? [...acc, id] : acc;
  }, []);
}

/** Where a habit is heading: its Mastery target, in a quiet line under the reason. */
function BuildsToward({ target }: { target: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.toward} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Ionicons name="trending-up" size={14} color={c.accentInk} />
      <T v="caption" color={c.accentInk} style={{ flex: 1 }}>
        Builds toward: {shownText(target)}
      </T>
    </View>
  );
}

/**
 * Optional extras once the plan is complete: a few habits that fit, more on request, never preselected. The plan
 * itself stays exactly as recommended; this only adds what the person picks, up to the plan maximum.
 */
function Extras({
  pool,
  extras,
  room,
  more,
  onMore,
  available,
  onToggle,
  note,
  notice,
}: {
  pool: LibraryOption[];
  extras: string[];
  room: number;
  more: boolean;
  onMore: () => void;
  available: (id: string) => boolean;
  onToggle: (o: LibraryOption) => void;
  /** The plan's own note on small plans (how the 80% rule works with this many habits). */
  note?: string;
  notice: string | null;
}) {
  const { c } = useTheme();
  const first = pool.slice(0, EXTRAS_SHOWN);
  const rest = pool.slice(EXTRAS_SHOWN);
  const left = room - extras.length;
  const row = (o: LibraryOption) => {
    const selected = extras.includes(o.id);
    const ok = available(o.id);
    return (
      <Pressable
        key={o.id}
        onPress={() => onToggle(o)}
        disabled={!ok}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected, disabled: !ok }}
        accessibilityLabel={`${o.title}. Starts at ${shownText(o.targets.easy)}. ${o.why} Builds toward ${shownText(o.targets.hard)}.`}
        style={({ pressed }) => ({ opacity: !ok ? 0.45 : pressed ? 0.75 : 1 })}
      >
        <ThemedView
          style={[
            styles.item,
            styles.choice,
            {
              backgroundColor: selected ? c.accentSoft : c.surface,
              borderColor: selected ? c.accentInk : 'transparent',
            },
          ]}
        >
          <HabitIcon id={o.id} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="bodyStrong">{o.title}</T>
            <T v="caption" color={c.textDim}>
              Starts at: {shownText(o.targets.easy)}
            </T>
            <BuildsToward target={o.targets.hard} />
          </View>
          <Ionicons
            name={selected ? 'checkbox' : 'square-outline'}
            size={24}
            color={selected ? c.accentInk : c.textFaint}
          />
        </ThemedView>
      </Pressable>
    );
  };
  return (
    <View style={{ gap: space.md }}>
      <View style={{ gap: space.xs }}>
        <T v="overline" color={c.textDim}>
          Optional
        </T>
        <T v="heading" accessibilityRole="header">
          Make it yours
        </T>
        <T v="caption" color={c.textDim}>
          Your plan is ready as it is. If one of these interests you, you can add {room === 1 ? 'it' : `up to ${room}`}
          {room === 1 ? '' : ' more'}. You can also add habits later from Today.
        </T>
        {note ? (
          <T v="caption" color={c.textDim}>
            {note}
          </T>
        ) : null}
        {notice ? (
          <T v="caption" color={c.accentInk} accessibilityLiveRegion="polite">
            {notice}
          </T>
        ) : null}
        {extras.length && left === 0 ? (
          <T v="caption" color={c.accentInk} accessibilityLiveRegion="polite">
            That makes 6 habits, the most a plan holds.
          </T>
        ) : null}
      </View>
      {first.map(row)}
      {more ? (
        CATEGORIES.map((cat) => {
          const items = rest.filter((o) => o.category === cat);
          if (!items.length) return null;
          return (
            <View key={cat} style={{ gap: space.sm }}>
              <T v="overline" color={c.textDim} accessibilityRole="header">
                {cat}
              </T>
              {items.map(row)}
            </View>
          );
        })
      ) : rest.length ? (
        <Button label={`Show ${rest.length} more`} kind="ghost" onPress={onMore} />
      ) : null}
    </View>
  );
}

/** How one habit's personal window grows across the three phases. */
function Growth({ title, targets }: { title: string; targets: Targets }) {
  const { c } = useTheme();
  return (
    <View style={styles.growth}>
      <View style={{ gap: space.xs }}>
        <T v="overline" color={c.textDim}>
          Your 66 days
        </T>
        <T v="heading" accessibilityRole="header">
          Three phases, one level at a time.
        </T>
        <T v="caption" color={c.textDim}>
          Every habit has its own path. For example, {title.toLowerCase()}:
        </T>
      </View>
      <TargetPath targets={targets} days about={PHASE_ABOUT} />
      <View style={{ gap: space.xs }}>
        {GROWTH_NOTES.map((n) => (
          <T key={n} v="caption" color={c.textDim}>
            {n}
          </T>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: space.xl, gap: space.xl },
  list: { gap: space.md },
  item: { flexDirection: 'row', gap: space.lg, padding: space.lg, borderRadius: radius.lg, alignItems: 'flex-start' },
  choice: { borderWidth: 2, alignItems: 'center' },
  num: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginTop: 4,
  },
  tagText: { fontWeight: '700' },
  notes: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  noteRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  growth: { gap: space.md },
  toward: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: 2 },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.md, paddingTop: space.sm },
});
