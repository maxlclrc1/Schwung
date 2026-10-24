import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Button, Screen, T } from '../../components/ui';
import { OnboardingBackdrop } from '../../components/World';
import { LANDMARKS, ASCENT_PHASES } from '../../core/ascent';
import { GROWTH_NOTES } from '../../core/onboarding';
import { GOAL_LABEL } from '../../core/plan';
import { canChoose, choiceNeedsTime, iconFor, pendingTimeQuestion, previewPlan } from '../../core/v2/program';
import type { Targets } from '../../core/v2/types';
import { v2PreviewEnabled } from '../../lib/flags';
import { haptic } from '../../lib/haptics';
import { useApp } from '../../store/useApp';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

type IconName = keyof typeof Ionicons.glyphMap;

const PHASE_ABOUT = [
  'Each habit starts at the easy end of what you do now.',
  'Each habit steps up one level.',
  'Each habit reaches its full version.',
];

/** V2 plan reveal with the choice step (development preview only). */
export default function PlanV2() {
  const { c } = useTheme();
  const profile = useApp((s) => s.profile);
  const started = useApp((s) => s.startedAt !== null);
  const enabled = useApp((s) => v2PreviewEnabled(s.devV2Preview));
  const plan = useMemo(() => (profile ? previewPlan(profile) : null), [profile]);
  const [chosen, setChosen] = useState<string[]>([]);
  // A choice waiting for the wake (or bed) time it needs; added when the person comes back with an answer.
  // Refs, so setting it doesn't re-run the focus effect before the time screen opens.
  const pending = useRef<string | null>(null);
  const chosenRef = useRef(chosen);
  useEffect(() => {
    chosenRef.current = chosen;
  }, [chosen]);
  const [notice, setNotice] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!profile || !plan || plan.status !== 'ok') return;
      // Answers can change what fits (e.g. a changing wake time rules out Steady wake-up): keep every choice
      // that still fits, in order, so nothing else is lost.
      const list = chosenRef.current;
      const kept = list.reduce<string[]>((acc, id) => (canChoose(plan, acc, id) ? [...acc, id] : acc), []);
      const id = pending.current;
      pending.current = null;
      let next = kept;
      if (id && !choiceNeedsTime(profile, kept, id)) {
        if (canChoose(plan, kept, id)) {
          next = [...kept, id];
          setNotice(null);
        } else {
          const title = plan.options.find((o) => o.id === id)?.title ?? 'That habit';
          setNotice(`${title} doesn’t fit your schedule, so it wasn’t added.`);
        }
      }
      if (next.join() !== list.join()) setChosen(next);
    }, [profile, plan]),
  );

  if (started) return <Redirect href="/today" />;
  if (!enabled || !profile) return <Redirect href="/welcome" />;
  if (pendingTimeQuestion(profile)) return <Redirect href="/v2/time" />;
  if (!plan || plan.status !== 'ok') return <Redirect href="/v2/quiz" />;

  const { picks, choice, options, planNotes, limitation, blocked } = plan;
  const required = choice?.required ?? 0;
  const total = picks.length + chosen.length;
  // The plan as it will start: a required choice counts toward it from the start.
  const planned = picks.length + Math.max(required, chosen.length);
  const ready = !blocked && (required === 0 || chosen.length === required);
  // Prefer a habit the person will actually grow into; a plan of only the foundation shows their first choice.
  const firstChoice = options.find((o) => o.id === chosen[0]);
  const example = picks.find((p) => p.source !== 'foundation') ?? firstChoice ?? picks[0];

  const toggle = (id: string) => {
    haptic.tap();
    setNotice(null);
    if (!chosen.includes(id) && canChoose(plan, chosen, id) && choiceNeedsTime(profile, chosen, id)) {
      // This habit's targets need the wake time: ask now, then add it on the way back.
      pending.current = id;
      router.push({ pathname: '/v2/time', params: { with: [...chosen, id].join(',') } });
      return;
    }
    setChosen((list) =>
      list.includes(id) ? list.filter((x) => x !== id) : canChoose(plan, list, id) ? [...list, id] : list,
    );
  };

  const begin = () => {
    if (!useApp.getState().startProgramV2(chosen)) {
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
            Development preview · Built for {GOAL_LABEL[profile.goal]}
          </T>
          <T v="title" accessibilityRole="header">
            {planned} habits. Starting where you are.
          </T>
          <T color={c.textDim}>
            Each one starts at the easy end of what you do now and grows with you. Swap, edit, or add habits anytime
            from Today.
          </T>
        </Animated.View>

        <View style={styles.list}>
          {picks.map((p, i) => (
            <Animated.View
              key={p.id}
              entering={FadeInDown.delay(150 + i * 90).duration(400)}
              style={[styles.item, { backgroundColor: c.surface }]}
              accessible
              accessibilityLabel={`${p.targets.easy}.${p.forGoal ? ' For your goal.' : ''} ${p.reason} ${p.notes.join(' ')}`}
            >
              <HabitIcon id={p.id} />
              <View style={{ flex: 1, gap: 2 }}>
                <T v="bodyStrong">{p.targets.easy}</T>
                <T v="caption" color={c.textDim}>
                  {p.reason}
                </T>
                {p.notes.map((n) => (
                  <T key={n} v="caption" color={c.textFaint}>
                    {n}
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

        {choice && !blocked ? (
          <View style={{ gap: space.md }}>
            <View style={{ gap: space.xs }}>
              <T v="overline" color={c.textDim}>
                {required > 0 ? 'Choose to continue' : 'Optional'}
              </T>
              <T v="heading" accessibilityRole="header">
                {required > 0 ? `Choose ${required} more` : 'Choose one more?'}
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
                  accessibilityLabel={`${o.title}. ${o.targets.easy}. ${o.why}`}
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
                      <T v="bodyStrong">{o.targets.easy}</T>
                      <T v="caption" color={c.textDim}>
                        {o.why}
                      </T>
                      {o.notes.map((n) => (
                        <T key={n} v="caption" color={c.textFaint}>
                          {n}
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

        {example ? <Growth title={example.title} targets={example.targets} /> : null}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          label={
            blocked
              ? 'Not available yet'
              : choice && required === 0 && chosen.length === 0
                ? `Keep ${total} habits and begin`
                : 'Begin with this plan'
          }
          onPress={begin}
          disabled={!ready}
        />
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

/** How one habit's personal window grows across the three phases. */
function Growth({ title, targets }: { title: string; targets: Targets }) {
  const { c } = useTheme();
  const levels = [targets.easy, targets.medium, targets.hard];
  return (
    <View style={styles.growth}>
      <View style={{ gap: space.xs }}>
        <T v="overline" color={c.textDim}>
          How it grows
        </T>
        <T v="heading" accessibilityRole="header">
          Three phases, one level at a time.
        </T>
        <T v="caption" color={c.textDim}>
          For example, {title.toLowerCase()}:
        </T>
      </View>
      <ThemedView style={[styles.phases, { backgroundColor: c.surface }]}>
        {ASCENT_PHASES.map((phase, i) => {
          const mark = LANDMARKS[phase.to];
          const summit = i === ASCENT_PHASES.length - 1;
          return (
            <View
              key={phase.name}
              style={styles.phase}
              accessible
              accessibilityLabel={`${phase.name}, days ${phase.from} to ${phase.to}. ${levels[i]}. ${PHASE_ABOUT[i]}`}
            >
              <View style={styles.phaseRail}>
                <ThemedView
                  style={[styles.badge, { borderColor: summit ? c.gold : c.accentInk, backgroundColor: c.bg }]}
                >
                  <Ionicons name={mark.icon} size={13} color={summit ? c.gold : c.accentInk} />
                </ThemedView>
                {summit ? null : <ThemedView style={[styles.rail, { backgroundColor: c.border }]} />}
              </View>
              <View style={[styles.phaseText, summit && styles.phaseTextLast]}>
                <T v="overline" color={c.accentInk} maxFontSizeMultiplier={1.3}>
                  {phase.name} · Days {phase.from}–{phase.to}
                </T>
                <T v="bodyStrong">{levels[i]}</T>
                <T v="caption" color={c.textDim}>
                  {PHASE_ABOUT[i]}
                </T>
              </View>
            </View>
          );
        })}
      </ThemedView>
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
  phases: { borderRadius: radius.lg, padding: space.lg },
  phase: { flexDirection: 'row', gap: space.md },
  phaseRail: { alignItems: 'center', width: 26 },
  badge: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  rail: { width: 2, flex: 1, minHeight: space.md, marginVertical: 4, borderRadius: 1 },
  phaseText: { flex: 1, gap: 2, paddingBottom: space.lg },
  phaseTextLast: { paddingBottom: 0 },
  footer: { paddingHorizontal: space.xl, paddingBottom: space.md, paddingTop: space.sm },
});
