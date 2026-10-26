import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useAnimatedScrollHandler } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DayStrip, FieldTrail, Observation } from '../../components/FieldNotes';
import { IconButton, SettingsButton } from '../../components/HeaderButton';
import { Button, Screen, T } from '../../components/ui';
import { WorldBackdrop } from '../../components/World';
import { useOnPainting, useWorldLayer, worldAnchor, worldScroll } from '../../components/WorldLayer';
import { formatTime } from '../../core/dates';
import { experimentById, experimentOptions, GOALS, OBSERVATION } from '../../core/fieldnotes/catalog';
import { baselineLine, PATTERN_HEADING, summarize, summaryThrough, CAVEAT } from '../../core/fieldnotes/insights';
import {
  CAMPS,
  campReached,
  dayRecord,
  daysAway,
  DISCOVERY,
  FIRST_LOOK,
  FN_DAYS,
  stageOf,
  todaysAction,
  type CampKey,
} from '../../core/fieldnotes/journey';
import type { Decision, Feeling, FnRun, TimeOfDay } from '../../core/fieldnotes/types';
import { worldFrame } from '../../core/world';
import { devTools } from '../../lib/flags';
import { haptic } from '../../lib/haptics';
import { requestPermission, rescheduleReminders, rescheduleSoon } from '../../lib/notifications';
import { fieldNotesAvailable, fnToday, useFieldNotes } from '../../store/fieldNotes';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';

/** Field Notes, one day at a time: development and internal-testing builds only. */
export default function FieldNotesToday() {
  // A literal check first, so a production bundle drops the rest of this screen.
  if (!(__DEV__ || process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL === 'internal') || !fieldNotesAvailable()) {
    return <Redirect href="/" />;
  }
  return <Daily />;
}

/** The Field Notes tab before an experiment has started: one way in, to the existing setup. */
function NotStarted() {
  const { c } = useTheme();
  const world = useWorldLayer();
  const insets = useSafeAreaInsets();
  return (
    <Screen edges={[]} transparent={world}>
      <View style={[styles.notStarted, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.top}>
          <T v="overline" color={c.accentInk} maxFontSizeMultiplier={1.3}>
            Field Notes · 14 days
          </T>
          <SettingsButton />
        </View>
        <View style={styles.notStartedBody}>
          <T v="heading" accessibilityRole="header" maxFontSizeMultiplier={1.6}>
            Discover what actually works for you.
          </T>
          <T color={c.textDim}>
            One question, one small thing to try, and a few notes along the way. Separate from your habit plan.
          </T>
          <Button
            label="Start Field Notes"
            style={{ marginTop: space.sm }}
            onPress={() => {
              useFieldNotes.getState().setActive(true);
              router.push('/fieldnotes/setup');
            }}
          />
        </View>
      </View>
    </Screen>
  );
}

/** What the top of the day says: where they are in the 14 days, in a few words. */
function dayLine(day: number, run: FnRun): { kicker: string; head: string; sub: string } {
  const noun = OBSERVATION[run.goal].noun;
  const action = todaysAction(run);
  if (day === 1)
    return {
      kicker: 'Day 1 · Starting point',
      head: 'Today, just notice.',
      sub: `No changes yet. This evening, note your ${noun}.`,
    };
  if (day === 2)
    return {
      kicker: 'Day 2 · Starting point',
      head: 'Keep noticing.',
      sub: 'Your starting point is what the experiment is compared with.',
    };
  if (day === 3)
    return {
      kicker: 'Day 3 · Starting point',
      head: 'Last day before the experiment.',
      sub: `Tomorrow’s small thing: ${action}.`,
    };
  if (day === 4)
    return {
      kicker: 'Day 4 · Experiment begins',
      head: 'Today, try one small thing.',
      sub: 'Then notice how the day felt.',
    };
  if (day < FIRST_LOOK)
    return {
      kicker: `Day ${day} · Experiment`,
      head: 'Try it again today.',
      sub: 'Any day you try it counts. Missed days just have no note.',
    };
  if (day === FIRST_LOOK)
    return {
      kicker: `Day ${day} · First look`,
      head: 'One week in.',
      sub: 'A quick look at how the experiment is going.',
    };
  if (day < DISCOVERY) {
    const left = DISCOVERY - day;
    return {
      kicker: `Day ${day} · Experiment`,
      head: 'Keep noticing.',
      sub: `${left} ${left === 1 ? 'day' : 'days'} until your discovery.`,
    };
  }
  if (day === DISCOVERY)
    return {
      kicker: `Day ${day} · Discovery`,
      head: 'Here’s what you’ve noticed.',
      sub: 'Then choose what to carry forward.',
    };
  if (day < FN_DAYS)
    return {
      kicker: `Day ${day} · Experiment`,
      head: run.decision ? 'Carry it forward.' : 'Your discovery is ready.',
      sub: run.decision ? `Today: ${action}.` : 'Choose what to carry forward when you’re ready.',
    };
  if (day === FN_DAYS)
    return { kicker: 'Day 14 · Last day', head: 'Your last note.', sub: 'After today, your field note is ready.' };
  return {
    kicker: 'Field Notes · Complete',
    head: 'Your field note is ready.',
    sub: 'Everything you noticed, in one place.',
  };
}

const DECISIONS: { id: Decision; label: string }[] = [
  { id: 'keep', label: 'Keep it' },
  { id: 'easier', label: 'Make it easier' },
  { id: 'different', label: 'Try something different' },
];

function Daily() {
  const { c } = useTheme();
  // Testing builds in dark mode: the tabs' shared world (the lakeside) is behind this page instead.
  const world = useWorldLayer();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const run = useFieldNotes((s) => s.run);
  const offset = useFieldNotes((s) => s.devDayOffset);
  const reminder = useFieldNotes((s) => s.reminder);
  const [zoneTop, setZoneTop] = useState(insets.top + 120);
  const { zoneHeight } = worldFrame(width, zoneTop);
  // A tapped camp, remembered with the latest camp at the time: reaching a new camp shows that one again.
  const [camp, setCamp] = useState<{ key: CampKey; latest: CampKey } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const today = run ? fnToday({ run, devDayOffset: offset }) : 0;
  // In the shared world this page scrolls the lakeside with it, so the camps stay on the art; as the pages slide
  // they keep their spot on the lakeside and fade in as the camera arrives (useOnPainting).
  const onScroll = useAnimatedScrollHandler((e) => {
    worldScroll[2].set(e.contentOffset.y);
  });
  const arrive = useOnPainting(2);

  // The latest camp reached is the one shown, until the person taps another.
  const latest = useMemo(
    () => (run ? ([...CAMPS].reverse().find((k) => campReached(k, today, run))?.key ?? 'question') : 'question'),
    [run, today],
  );

  if (!run) return <NotStarted />;

  const stage = stageOf(today);
  const rec = dayRecord(run, Math.min(today, FN_DAYS));
  const line = dayLine(today, run);
  const through = Math.min(summaryThrough(run, Math.min(today, FN_DAYS)), FN_DAYS);
  const summary = summarize(run, through);
  const away = today <= FN_DAYS ? daysAway(run, today) : 0;
  const shownCamp = camp && camp.latest === latest ? camp.key : latest;
  const def = experimentById(run.experiment.id);
  const others = experimentOptions(run.goal, run.profile, null).filter((o) => o.id !== run.experiment.id);
  const ready =
    run.decision && (today > FN_DAYS || (today === FN_DAYS && (rec?.rating !== undefined || rec?.tried !== undefined)));

  const record = (patch: Parameters<ReturnType<typeof useFieldNotes.getState>['record']>[0]) => {
    useFieldNotes.getState().record(patch);
    rescheduleSoon();
  };
  const decide = (d: Decision, id?: string) => {
    if (useFieldNotes.getState().decide(d, id)) {
      haptic.success();
      setOtherOpen(false);
    }
  };

  const campText = (key: CampKey): string => {
    const c0 = CAMPS.find((x) => x.key === key)!;
    if (!campReached(c0, today, run)) {
      return key === 'note' && today >= FN_DAYS ? 'Reached once you choose what to carry forward.' : `Day ${c0.day}.`;
    }
    if (key === 'question') return `${run.experiment.question} Try from day 4: ${run.experiment.action}.`;
    if (key === 'start') return baselineLine(run);
    if (key === 'firstLook') {
      const s = summarize(run, FIRST_LOOK);
      return `${s.lines[0] ?? ''}${run.checkIn ? ` It felt ${run.checkIn}.` : ''}`;
    }
    if (key === 'discovery') {
      const s = summarize(run, DISCOVERY - 1);
      return `${PATTERN_HEADING[s.pattern]}. ${s.lines[0] ?? ''}`;
    }
    return run.decision
      ? `You chose: ${DECISIONS.find((d) => d.id === run.decision)!.label.toLowerCase()}. Next: ${run.next?.action}.`
      : '';
  };

  const exportNotes = async () => {
    try {
      const s = useFieldNotes.getState();
      const file = new File(Paths.cache, 'schwung-field-notes.json');
      await file.write(
        JSON.stringify(
          { exportedAt: new Date().toISOString(), run: s.run, archive: s.archive, opens: s.opens },
          null,
          2,
        ),
      );
      const uri = file.uri.startsWith('file://') ? file.uri : `file://${file.uri}`;
      await Sharing.shareAsync(uri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: 'Share my notes',
      });
    } catch {
      // Cancelled or unavailable.
    }
  };

  return (
    // The tab bar keeps clear of the home indicator.
    <Screen edges={[]} transparent={world}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + space.sm }]}
        showsVerticalScrollIndicator={false}
      >
        {world ? null : (
          <View style={StyleSheet.absoluteFill}>
            <WorldBackdrop zoneTop={zoneTop} />
          </View>
        )}

        <View style={styles.pad}>
          <View style={styles.top}>
            <T v="overline" color={c.accentInk} maxFontSizeMultiplier={1.3}>
              {line.kicker}
            </T>
            <View style={styles.headerIcons}>
              <IconButton
                name="journal-outline"
                label="Your notes"
                onPress={() => router.push('/fieldnotes/history')}
              />
              <SettingsButton />
            </View>
          </View>
          <T v="heading" accessibilityRole="header" maxFontSizeMultiplier={1.6}>
            {run.experiment.question}
          </T>
        </View>

        {/* Five camps, each a real moment of the experiment: on the lakeside in the shared world, else on the
            mountain behind this page. */}
        <View
          onLayout={(e) => {
            setZoneTop(e.nativeEvent.layout.y);
            worldAnchor[2].set(e.nativeEvent.layout.y);
          }}
          style={{ width, height: zoneHeight }}
        >
          <Animated.View style={arrive}>
            <FieldTrail
              run={run}
              today={today}
              width={width}
              selected={shownCamp}
              onSelect={(k) => setCamp({ key: k, latest })}
              route={world ? 'lakeside' : 'ascent'}
            />
          </Animated.View>
        </View>

        <View style={styles.pad}>
          <Animated.View key={shownCamp} entering={FadeIn.duration(200)}>
            <ThemedView style={[styles.campCard, { backgroundColor: c.surface }]} accessibilityLiveRegion="polite">
              <T v="overline" color={c.textDim}>
                {CAMPS.find((x) => x.key === shownCamp)!.name}
              </T>
              <T>{campText(shownCamp)}</T>
            </ThemedView>
          </Animated.View>

          {away >= 2 && today <= FN_DAYS ? (
            <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
              <T v="bodyStrong">Welcome back.</T>
              <T color={c.textDim}>Days without notes just stay blank. The experiment picks up today.</T>
            </ThemedView>
          ) : null}

          {/* Today. */}
          {today <= FN_DAYS ? (
            <Animated.View entering={FadeInDown.duration(300)}>
              <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
                <View style={{ gap: 2 }}>
                  <T v="title" accessibilityRole="header" maxFontSizeMultiplier={1.5}>
                    {line.head}
                  </T>
                  <T color={c.textDim}>{line.sub}</T>
                </View>
                {stage !== 'baseline' ? (
                  <View style={{ gap: space.sm }}>
                    <T v="overline" color={c.textDim}>
                      Today’s small thing
                    </T>
                    <T v="bodyStrong">{todaysAction(run)}</T>
                    <View style={styles.pair}>
                      {(
                        [
                          [true, 'I tried it'],
                          [false, 'Not today'],
                        ] as const
                      ).map(([v, label]) => {
                        const on = rec?.tried === v;
                        return (
                          <Pressable
                            key={label}
                            onPress={() => {
                              haptic.tap();
                              record({ tried: v });
                            }}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: on }}
                            style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.75 : 1 }]}
                          >
                            <ThemedView
                              style={[
                                styles.choice,
                                {
                                  backgroundColor: on ? c.accentSoft : c.surfaceHigh,
                                  borderColor: on ? c.accentInk : 'transparent',
                                },
                              ]}
                            >
                              {v && on ? <Ionicons name="checkmark" size={18} color={c.accentInk} /> : null}
                              <T v="bodyStrong" color={on ? c.accentInk : c.text}>
                                {label}
                              </T>
                            </ThemedView>
                          </Pressable>
                        );
                      })}
                    </View>
                    {rec?.tried === true ? (
                      <View style={{ gap: space.xs }}>
                        <T v="caption" color={c.textDim}>
                          When? (optional)
                        </T>
                        <View style={styles.chips}>
                          {(['morning', 'afternoon', 'evening'] as TimeOfDay[]).map((t) => {
                            const on = rec.when === t;
                            return (
                              <Pressable
                                key={t}
                                onPress={() => record({ when: on ? undefined : t })}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: on }}
                                style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                              >
                                <ThemedView
                                  style={[
                                    styles.chip,
                                    {
                                      backgroundColor: on ? c.accentSoft : c.surfaceHigh,
                                      borderColor: on ? c.accentInk : 'transparent',
                                    },
                                  ]}
                                >
                                  <T v="caption" color={on ? c.accentInk : c.text} style={{ fontWeight: '700' }}>
                                    {t[0].toUpperCase() + t.slice(1)}
                                  </T>
                                </ThemedView>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                <Observation
                  goal={run.goal}
                  value={rec?.rating}
                  onPick={(r) => record({ rating: r })}
                  onClear={() => useFieldNotes.getState().clearRating()}
                />
              </ThemedView>
            </Animated.View>
          ) : null}

          {/* Day 7: one gentle check-in. */}
          {today >= FIRST_LOOK && today < DISCOVERY ? (
            <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
              <T v="bodyStrong" accessibilityRole="header">
                {run.checkIn ? `So far it feels ${run.checkIn}.` : 'How’s the experiment feeling so far?'}
              </T>
              <View style={styles.pair} accessibilityRole="radiogroup">
                {(['easy', 'okay', 'hard'] as Feeling[]).map((f) => {
                  const on = run.checkIn === f;
                  return (
                    <Pressable
                      key={f}
                      onPress={() => {
                        haptic.tap();
                        useFieldNotes.getState().setCheckIn(f);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      style={({ pressed }) => [{ flex: 1, opacity: pressed ? 0.75 : 1 }]}
                    >
                      <ThemedView
                        style={[
                          styles.choice,
                          {
                            backgroundColor: on ? c.accentSoft : c.surfaceHigh,
                            borderColor: on ? c.accentInk : 'transparent',
                          },
                        ]}
                      >
                        <T v="bodyStrong" color={on ? c.accentInk : c.text}>
                          {f[0].toUpperCase() + f.slice(1)}
                        </T>
                      </ThemedView>
                    </Pressable>
                  );
                })}
              </View>
              {run.checkIn === 'hard' ? (
                <T v="caption" color={c.textDim}>
                  {def ? `On day 11 you can make it easier: ${def.easier}.` : 'On day 11 you can make it easier.'}
                </T>
              ) : null}
            </ThemedView>
          ) : null}

          {/* From day 11: the discovery and the choice. */}
          {today >= DISCOVERY ? (
            <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
              <View style={styles.discoveryHead}>
                <Ionicons name="bulb" size={20} color={c.accentInk} />
                <T v="overline" color={c.accentInk}>
                  Discovery
                </T>
              </View>
              <T v="heading" accessibilityRole="header">
                {PATTERN_HEADING[summary.pattern]}
              </T>
              {summary.lines.map((l) => (
                <T key={l}>{l}</T>
              ))}
              <T v="caption" color={c.textDim}>
                {CAVEAT}
              </T>
              <View style={[styles.divider, { backgroundColor: c.border }]} />
              <T v="bodyStrong" accessibilityRole="header">
                {run.decision ? 'What you’re carrying forward' : 'What will you carry forward?'}
              </T>
              <View style={{ gap: space.sm }} accessibilityRole="radiogroup">
                {DECISIONS.map((d) => {
                  const on = run.decision === d.id;
                  const sub =
                    d.id === 'keep'
                      ? run.experiment.action
                      : d.id === 'easier'
                        ? (def?.easier ?? '')
                        : on && run.next
                          ? `Next: ${run.next.action}`
                          : 'Pick another question to explore next';
                  return (
                    <Pressable
                      key={d.id}
                      onPress={() => {
                        haptic.tap();
                        if (d.id === 'different') setOtherOpen((v) => !v);
                        else decide(d.id);
                      }}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${d.label}. ${sub}`}
                      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
                    >
                      <ThemedView
                        style={[
                          styles.decision,
                          {
                            backgroundColor: on ? c.accentSoft : c.surfaceHigh,
                            borderColor: on ? c.accentInk : 'transparent',
                          },
                        ]}
                      >
                        <View style={{ flex: 1, gap: 2 }}>
                          <T v="bodyStrong">{d.label}</T>
                          <T v="caption" color={c.textDim}>
                            {sub}
                          </T>
                        </View>
                        <Ionicons
                          name={on ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={on ? c.accentInk : c.textFaint}
                        />
                      </ThemedView>
                    </Pressable>
                  );
                })}
                {otherOpen ? (
                  others.length ? (
                    others.map((o) => (
                      <Pressable
                        key={o.id}
                        onPress={() => decide('different', o.id)}
                        accessibilityRole="button"
                        accessibilityLabel={`${o.question} Try: ${o.action}`}
                        style={({ pressed }) => [styles.other, { borderColor: c.border, opacity: pressed ? 0.75 : 1 }]}
                      >
                        <T v="bodyStrong">{o.question}</T>
                        <T v="caption" color={c.textDim}>
                          Try: {o.action}
                        </T>
                      </Pressable>
                    ))
                  ) : (
                    <T v="caption" color={c.textDim}>
                      There isn’t another experiment for this question that suits your answers.
                    </T>
                  )
                ) : null}
              </View>
              {ready ? (
                <Button label="Open your field note" onPress={() => router.push('/fieldnotes/note')} />
              ) : run.decision && today === FN_DAYS ? (
                <T v="caption" color={c.textDim}>
                  Note today, and your field note is ready.
                </T>
              ) : null}
            </ThemedView>
          ) : null}

          {/* What's been noticed so far: facts only before the discovery. */}
          {today < DISCOVERY ? (
            <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
              <T v="overline" color={c.textDim}>
                So far
              </T>
              {summary.lines.slice(0, 2).length ? (
                summary.lines.slice(0, 2).map((l) => <T key={l}>{l}</T>)
              ) : (
                <T color={c.textDim}>Your first note will appear here tonight.</T>
              )}
              <DayStrip run={run} today={Math.min(today, FN_DAYS)} />
            </ThemedView>
          ) : (
            <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
              <T v="overline" color={c.textDim}>
                Your 14 days
              </T>
              <DayStrip run={run} today={Math.min(today, FN_DAYS)} />
            </ThemedView>
          )}

          {/* Settings for this experiment, and the way back to Schwung. */}
          <View style={styles.more}>
            <Pressable
              onPress={async () => {
                const on = !reminder.on;
                const granted = on ? await requestPermission().catch(() => false) : false;
                useFieldNotes.getState().setReminder(on && granted, reminder.time);
                void rescheduleReminders().catch(() => {});
              }}
              accessibilityRole="switch"
              accessibilityState={{ checked: reminder.on }}
              style={styles.moreRow}
            >
              <T style={{ flex: 1 }}>Evening reminder {reminder.on ? `· ${formatTime(reminder.time)}` : ''}</T>
              <Ionicons
                name={reminder.on ? 'toggle' : 'toggle-outline'}
                size={30}
                color={reminder.on ? c.accentInk : c.textFaint}
              />
            </Pressable>
            <Pressable onPress={() => void exportNotes()} accessibilityRole="button" style={styles.moreRow}>
              <T style={{ flex: 1 }}>Share my notes (for the study)</T>
              <Ionicons name="share-outline" size={20} color={c.textDim} />
            </Pressable>
            <Pressable
              onPress={() => {
                useFieldNotes.getState().setActive(false);
                void rescheduleReminders().catch(() => {});
                router.replace('/');
              }}
              accessibilityRole="button"
              style={styles.moreRow}
            >
              <T style={{ flex: 1 }}>Switch to Schwung</T>
              <Ionicons name="swap-horizontal" size={20} color={c.textDim} />
            </Pressable>
            {confirmReset ? (
              <View style={{ gap: space.sm }}>
                <T v="caption" color={c.textDim}>
                  This clears these 14 days of Field Notes. Your Schwung plan and progress stay exactly as they are.
                </T>
                <View style={styles.pair}>
                  <Button label="Cancel" kind="secondary" style={{ flex: 1 }} onPress={() => setConfirmReset(false)} />
                  <Button
                    label="Start over"
                    kind="danger"
                    style={{ flex: 1 }}
                    onPress={() => {
                      useFieldNotes.getState().finish();
                      useFieldNotes.getState().setActive(true);
                      setConfirmReset(false);
                      void rescheduleReminders().catch(() => {});
                      router.push('/fieldnotes/setup');
                    }}
                  />
                </View>
              </View>
            ) : (
              <Pressable onPress={() => setConfirmReset(true)} accessibilityRole="button" style={styles.moreRow}>
                <T style={{ flex: 1 }} color={c.danger}>
                  Start Field Notes over
                </T>
              </Pressable>
            )}
            <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
              {GOALS.find((g) => g.id === run.goal)!.title} · Everything stays on this phone.
            </T>
          </View>

          {devTools() ? <DevClock today={today} /> : null}
        </View>
      </Animated.ScrollView>
    </Screen>
  );
}

/** Development builds only: moves Field Notes' own clock (Schwung's clock is separate). */
function DevClock({ today }: { today: number }) {
  const { c } = useTheme();
  const offset = useFieldNotes((s) => s.devDayOffset);
  const set = (n: number) => useFieldNotes.getState().setDevDayOffset(n);
  const jump = (day: number) => set(offset + (day - today));
  return (
    <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
      <T v="overline" color={c.textDim}>
        Developer · Field Notes day {today} (offset {offset})
      </T>
      <View style={styles.chips}>
        {[
          ['−1 day', () => set(offset - 1)],
          ['+1 day', () => set(offset + 1)],
          ['Day 4', () => jump(4)],
          ['Day 7', () => jump(7)],
          ['Day 11', () => jump(11)],
          ['Day 14', () => jump(14)],
          ['Day 15', () => jump(15)],
          ['Reset clock', () => set(0)],
        ].map(([label, fn]) => (
          <Pressable
            key={label as string}
            onPress={fn as () => void}
            accessibilityRole="button"
            style={[styles.chip, { backgroundColor: c.surfaceHigh }]}
          >
            <T v="caption" style={{ fontWeight: '700' }}>
              {label as string}
            </T>
          </Pressable>
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xxxl },
  pad: { paddingHorizontal: space.lg, gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  headerIcons: { flexDirection: 'row', gap: space.sm },
  notStarted: { flex: 1, paddingHorizontal: space.xl, gap: space.lg },
  notStartedBody: { flex: 1, justifyContent: 'center', gap: space.md },
  campCard: { borderRadius: radius.lg, padding: space.lg, gap: space.xs, marginTop: space.sm },
  card: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  pair: { flexDirection: 'row', gap: space.sm },
  choice: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 40,
    borderRadius: radius.pill,
    paddingHorizontal: space.lg,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  discoveryHead: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  divider: { height: 1 },
  decision: {
    borderRadius: radius.md,
    borderWidth: 2,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  other: { borderRadius: radius.md, borderWidth: 1.5, padding: space.md, gap: 2, marginLeft: space.lg },
  more: { gap: space.xs, marginTop: space.md },
  moreRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: space.md },
});
