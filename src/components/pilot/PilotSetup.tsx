import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { PULL_MINUTES_OPTIONS, SKILLS, type Intensity } from '../../core/reset/habits';
import * as P from '../../core/reset/pilot';
import type { ActiveDays, AgeBand, PhoneHours, Precaution } from '../../core/reset/profile';
import { haptic } from '../../lib/haptics';
import { useResetPilot } from '../../store/resetPilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Button, Screen, T } from '../ui';
import { OnboardingBackdrop } from '../World';
import {
  ChoiceCard,
  DayOneTransition,
  HabitArt,
  HabitTile,
  LevelRow,
  Question,
  Rail,
  StopScale,
  TileRow,
} from './OnboardingParts';
import { ACTIVE, AGES, duration, HEALTH, PHONE, STARTS, WAKE_TIMES } from './SetupParts';

type Step = 'age' | 'health' | 'habits' | P.Baseline | 'levels' | 'time' | 'review';

/** Which habit asks each baseline question (its name heads the screen). */
const ASKED_BY: Record<P.Baseline, string> = {
  phone: 'screen_app_limit',
  pullMinutes: 'screen_app_limit',
  wake: 'sleep_wake',
  activeDays: 'move_walk',
  skill: 'skill_practice',
  strengthStart: 'strength_log',
};
const STRENGTH_DETAIL: Record<P.StrengthStart, string> = {
  new: 'Little or no strength training yet',
  sometimes: 'Now and then',
  regular: 'Most weeks',
};
/** A single choice moves on by itself after this long, so the choice is seen first. */
const ADVANCE_MS = 320;
const sys = ReduceMotion.System;

/**
 * The Life Reset set-up, how every program starts (app/life-reset/setup.tsx): one question a screen. About you,
 * the habits you want, only the questions those habits need, how hard each starts, the time you have, then a
 * review and into Day 1. Every answer is kept going back; nothing is pre-selected; a manageable first set is
 * suggested. The rules are the program's own (pilot.ts setupProblems).
 */
export function PilotSetup() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  // One Life Reset at a time: with one saved, set-up never runs again (it would never replace it either: start()).
  const running = useResetPilot((s) => s.program !== null);
  const [nav, setNav] = useState<{ step: Step; dir: 1 | -1 }>({ step: 'age', dir: 1 });
  const [age, setAge] = useState<AgeBand | null>(null);
  const [health, setHealth] = useState<Precaution[] | 'unknown' | null>(null);
  const [picked, setPicked] = useState<P.PilotHabitId[]>([]);
  const [levels, setLevels] = useState<Partial<Record<string, Intensity>>>({});
  const [minutes, setMinutes] = useState<number | null>(null);
  const [phone, setPhone] = useState<PhoneHours | undefined>(undefined);
  const [pull, setPull] = useState<number | undefined>(undefined);
  const [wake, setWake] = useState<P.PilotAnswers['wake']>(undefined);
  const [active, setActive] = useState<ActiveDays | undefined>(undefined);
  const [skill, setSkill] = useState<string | undefined>(undefined);
  const [start, setStart] = useState<P.StrengthStart | undefined>(undefined);
  const [own, setOwn] = useState(2);
  // Begin Day 1: the program is saved, and the way in plays before the Habits tab.
  const [launching, setLaunching] = useState<string[] | null>(null);
  const reader = useScreenReader();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);
  const enter = useCallback(() => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/today');
  }, []);

  const step = nav.step;
  const answers: P.PilotAnswers = {
    age: age ?? '18_29',
    precautions: health ?? 'unknown',
    minutesPerDay: minutes ?? 0,
    ...(phone ? { phone } : {}),
    ...(pull !== undefined ? { pullMinutes: pull } : {}),
    ...(wake ? { wake } : {}),
    ...(active ? { activeDays: active } : {}),
    ...(skill ? { skill } : {}),
    ...(start ? { strengthStart: start } : {}),
    ...(levels.strength_log === 'challenge' ? { ownSessions: own } : {}),
  };
  const intensityOf = (id: string): Intensity | null => {
    const l = levels[id];
    const allowed = P.intensityOptions(id, answers).filter((o) => !o.reason);
    if (l && allowed.some((o) => o.intensity === l)) return l;
    return P.suggestedIntensity(id, answers);
  };
  const choices: P.PilotChoice[] = picked
    .map((id) => ({ habitId: id, intensity: intensityOf(id) }))
    .filter((x): x is P.PilotChoice => x.intensity !== null);
  const baselines = P.baselinesFor(picked);
  const problems = P.setupProblems(answers, choices);
  const excludedPicked = picked.filter((id) => P.habitExclusion(id, answers));
  const total = P.busiestDayMinutes(
    choices.map((x) => ({ habitId: x.habitId, level: { intensity: x.intensity, phase: 'foundation' } })),
  );
  const timeProblem = minutes !== null ? problems.find((p) => p.startsWith('These take')) : undefined;

  const order: Step[] = ['age', 'health', 'habits', ...baselines, 'levels', 'time', 'review'];
  const index = Math.max(0, order.indexOf(step));

  const go = (dir: 1 | -1) => {
    clearTimeout(timer.current ?? undefined);
    const i = index + dir;
    if (i < 0) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
      return;
    }
    setNav({ step: order[Math.min(i, order.length - 1)], dir });
  };
  // Android's back button walks back through the questions, like the chevron.
  const back = useRef(go);
  useEffect(() => {
    back.current = go;
  });
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back.current(-1);
      return true;
    });
    return () => sub.remove();
  }, []);

  /** A single choice: chosen, then on to the next question (not with a screen reader, which reads the choice). */
  const choose = (apply: () => void, advance = true) => {
    apply();
    clearTimeout(timer.current ?? undefined);
    if (!advance || reader || index >= order.length - 1) return;
    const from = step;
    const next = order[index + 1];
    timer.current = setTimeout(() => setNav((n) => (n.step === from ? { step: next, dir: 1 } : n)), ADVANCE_MS);
  };
  const togglePick = (id: P.PilotHabitId) => {
    const on = picked.includes(id);
    if (!on && (P.habitExclusion(id, answers) || picked.length >= P.MAX_HABITS)) {
      haptic.warning();
      return;
    }
    if (on) haptic.uncheck();
    else haptic.check();
    setPicked((p) => (on ? p.filter((x) => x !== id) : [...p, id]));
  };
  const begin = () => {
    // Shown before the save, so the saved program never sends set-up away before the way in has played.
    const ids = P.PILOT_HABITS.filter((id) => picked.includes(id));
    setLaunching(ids);
    if (!useResetPilot.getState().start(answers, choices)) {
      setLaunching(null);
      return;
    }
    haptic.success();
  };

  if (running && !launching) return <Redirect href="/" />;

  const canContinue =
    step === 'age'
      ? age !== null && age !== 'u16'
      : step === 'health'
        ? health !== null
        : step === 'habits'
          ? picked.length > 0 && excludedPicked.length < picked.length
          : step === 'phone'
            ? !!phone
            : step === 'pullMinutes'
              ? pull !== undefined
              : step === 'wake'
                ? !!wake
                : step === 'activeDays'
                  ? !!active
                  : step === 'skill'
                    ? !!skill
                    : step === 'strengthStart'
                      ? !!start
                      : step === 'levels'
                        ? picked.length > 0 && excludedPicked.length === 0
                        : step === 'time'
                          ? minutes !== null && !timeProblem
                          : problems.length === 0;

  const tileWidth = Math.floor((Math.min(width, 520) - space.xl * 2 - space.md) / 2);

  const screen = (() => {
    switch (step) {
      case 'age':
        return (
          <Question
            eyebrow="The 66-day Life Reset"
            title="First, how old are you?"
            hint="So every habit fits you. It takes about a minute."
          >
            <View style={styles.list}>
              {AGES.map((a) => (
                <ChoiceCard
                  key={a.id}
                  label={a.label}
                  selected={age === a.id}
                  onPress={() => choose(() => setAge(a.id), a.id !== 'u16')}
                />
              ))}
            </View>
            {age === 'u16' ? (
              <Animated.View entering={FadeIn.duration(200).reduceMotion(sys)}>
                <T color={c.danger}>Schwung is made for people 16 and older.</T>
              </Animated.View>
            ) : null}
          </Question>
        );
      case 'health':
        return (
          <Question
            eyebrow="About you"
            title="Anything we should keep in mind?"
            hint="Choose any that apply. It shapes which habits fit, and it stays on your phone."
          >
            <View style={styles.list}>
              {HEALTH.map((h) => (
                <ChoiceCard
                  key={h.id}
                  multi
                  label={h.label}
                  selected={Array.isArray(health) && health.includes(h.id)}
                  onPress={() =>
                    setHealth((cur) => {
                      const list = Array.isArray(cur) ? cur : [];
                      return list.includes(h.id) ? list.filter((x) => x !== h.id) : [...list, h.id];
                    })
                  }
                />
              ))}
              <View style={styles.gap} />
              <ChoiceCard
                label="None of these"
                selected={Array.isArray(health) && health.length === 0}
                onPress={() => choose(() => setHealth([]))}
              />
            </View>
            <Pressable
              onPress={() => {
                haptic.tap();
                choose(() => setHealth('unknown'));
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: health === 'unknown' }}
              hitSlop={10}
              style={styles.skip}
            >
              <T v="bodyStrong" color={health === 'unknown' ? c.accentInk : c.textDim}>
                {health === 'unknown' ? 'Skipped' : 'I’d rather not say'}
              </T>
            </Pressable>
          </Question>
        );
      case 'habits':
        return (
          <Question
            eyebrow="Your habits"
            title="What do you want to build?"
            hint={`Two to four is a good start, up to ${P.MAX_HABITS}. You can add your own habits later.`}
          >
            <View style={styles.habitBar}>
              <T v="caption" color={c.textDim}>
                {picked.length ? `${picked.length} of ${P.MAX_HABITS} chosen` : 'Tap the ones you want'}
              </T>
              <Pressable
                onPress={() => {
                  haptic.check();
                  setPicked(P.SUGGESTED_START.filter((id) => !P.habitExclusion(id, answers)));
                }}
                accessibilityRole="button"
                hitSlop={10}
              >
                <T v="caption" color={c.accentInk} style={{ fontWeight: '700' }}>
                  Use the suggested three
                </T>
              </Pressable>
            </View>
            <View style={styles.grid}>
              {P.PILOT_HABITS.map((id) => {
                const on = picked.includes(id);
                const reason = P.habitExclusion(id, answers);
                return (
                  <HabitTile
                    key={id}
                    id={id}
                    width={tileWidth}
                    selected={on}
                    suggested={(P.SUGGESTED_START as readonly string[]).includes(id)}
                    reason={reason}
                    full={picked.length >= P.MAX_HABITS}
                    // A chosen habit can always be let go, even one that no longer fits.
                    onPress={() => togglePick(id)}
                  />
                );
              })}
            </View>
          </Question>
        );
      case 'phone':
        return (
          <Question eyebrow={P.habitName(ASKED_BY.phone)} title="How long are you on your phone a day?">
            <View style={styles.list}>
              {PHONE.map((x) => (
                <ChoiceCard
                  key={x.id}
                  label={x.label}
                  selected={phone === x.id}
                  onPress={() => choose(() => setPhone(x.id))}
                />
              ))}
            </View>
          </Question>
        );
      case 'pullMinutes':
        return (
          <Question
            eyebrow={P.habitName(ASKED_BY.pullMinutes)}
            title="And on the app that pulls you in most?"
            hint="Settings → Screen Time shows it, if you want the real number."
          >
            <StopScale
              label="Time a day on your main app"
              stops={PULL_MINUTES_OPTIONS.map((m) => (m === 240 ? '4 h+' : duration(m)))}
              index={pull === undefined ? null : PULL_MINUTES_OPTIONS.indexOf(pull)}
              onChange={(i) => setPull(PULL_MINUTES_OPTIONS[i])}
            />
          </Question>
        );
      case 'wake':
        return (
          <Question
            eyebrow={P.habitName(ASKED_BY.wake)}
            title="When do you usually get up?"
            hint="Your own time is the anchor. We never ask for earlier."
          >
            <StopScale
              label="Usual wake-up time"
              stops={WAKE_TIMES}
              index={wake?.kind === 'time' ? WAKE_TIMES.indexOf(wake.time) : null}
              onChange={(i) => setWake({ kind: 'time', time: WAKE_TIMES[i] })}
            />
            <View style={styles.list}>
              <ChoiceCard
                label="It varies a lot"
                selected={wake?.kind === 'varies'}
                onPress={() => choose(() => setWake({ kind: 'varies' }))}
              />
              <ChoiceCard
                label="I work shifts"
                selected={wake?.kind === 'shift'}
                onPress={() => choose(() => setWake({ kind: 'shift' }))}
              />
            </View>
          </Question>
        );
      case 'activeDays':
        return (
          <Question eyebrow={P.habitName(ASKED_BY.activeDays)} title="How many days a week are you active now?">
            <TileRow
              items={ACTIVE.map((x) => ({ ...x, detail: 'days' }))}
              value={active}
              onPick={(id) => choose(() => setActive(id))}
            />
          </Question>
        );
      case 'skill':
        return (
          <Question eyebrow={P.habitName(ASKED_BY.skill)} title="Which skill will you practise?">
            <View style={styles.list}>
              {SKILLS.map((x) => (
                <ChoiceCard key={x} label={x} selected={skill === x} onPress={() => choose(() => setSkill(x))} />
              ))}
            </View>
          </Question>
        );
      case 'strengthStart':
        return (
          <Question eyebrow={P.habitName(ASKED_BY.strengthStart)} title="Where are you starting from?">
            <View style={styles.list}>
              {STARTS.map((x) => (
                <ChoiceCard
                  key={x.id}
                  large
                  label={x.label}
                  detail={STRENGTH_DETAIL[x.id]}
                  selected={start === x.id}
                  onPress={() => choose(() => setStart(x.id))}
                />
              ))}
            </View>
            {P.habitNotes('strength_log', answers).map((n) => (
              <T key={n} v="caption" color={c.textFaint}>
                {n}
              </T>
            ))}
          </Question>
        );
      case 'levels':
        return (
          <Question
            eyebrow="Your starting point"
            title="How hard should each start?"
            hint="Starter is a gentle beginning. Each habit grows with you, and you choose when."
          >
            <View style={styles.list}>
              {picked.map((id) => (
                <LevelRow
                  key={id}
                  id={id}
                  answers={answers}
                  chosen={intensityOf(id)}
                  onChoose={(i) => setLevels((l) => ({ ...l, [id]: i }))}
                  own={own}
                  setOwn={setOwn}
                  onRemove={() => setPicked((p) => p.filter((x) => x !== id))}
                />
              ))}
            </View>
          </Question>
        );
      case 'time':
        return (
          <Question
            eyebrow="Your day"
            title="On a busy day, how much time do you have?"
            hint={`On a day all your habits fall on, they take about ${total} min. They have to fit.`}
          >
            <StopScale
              label="Time you have on a busy day"
              stops={P.PILOT_TIME_OPTIONS.map(duration)}
              index={minutes === null ? null : (P.PILOT_TIME_OPTIONS as readonly number[]).indexOf(minutes)}
              onChange={(i) => setMinutes(P.PILOT_TIME_OPTIONS[i])}
            />
            {timeProblem ? (
              <Animated.View entering={FadeIn.duration(200).reduceMotion(sys)}>
                <T v="caption" color={c.danger}>
                  {timeProblem}
                </T>
              </Animated.View>
            ) : null}
          </Question>
        );
      case 'review':
        return (
          <Question eyebrow="Ready when you are" title="Your Life Reset" hint="66 days, starting today.">
            <View style={styles.list}>
              {choices.map((x) => {
                const p = P.previewTarget(x.habitId, x.intensity, answers);
                return (
                  <ThemedView key={x.habitId} style={[styles.review, { backgroundColor: c.surface }]}>
                    <View style={styles.reviewArt}>
                      <HabitArt id={x.habitId} width={64} height={64} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T v="bodyStrong">{P.habitName(x.habitId)}</T>
                      <T v="caption">{p.target}</T>
                      <T v="caption" color={c.textDim}>
                        {p.frequency} · {P.INTENSITY_NAME[x.intensity]}
                      </T>
                    </View>
                  </ThemedView>
                );
              })}
            </View>
            <T v="caption" color={c.textDim}>
              About {total} min on a day they all fall on{minutes ? `, of the ${duration(minutes)} you have` : ''}.
              Targets only change when you choose: offers come when you’ve been consistent. A swipe marks a habit done.
            </T>
            {problems.map((p) => (
              <T key={p} v="caption" color={c.danger}>
                {p}
              </T>
            ))}
          </Question>
        );
    }
  })();

  return (
    <View style={{ flex: 1 }}>
      <Screen backdrop={<OnboardingBackdrop />}>
        <View style={styles.top}>
          <Pressable
            onPress={() => {
              haptic.tap();
              go(-1);
            }}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Back"
            disabled={!!launching}
          >
            <ThemedView style={[styles.backButton, { backgroundColor: c.surface }]}>
              <Ionicons name="chevron-back" size={22} color={c.text} />
            </ThemedView>
          </Pressable>
          <View style={{ flex: 1 }} accessibilityLabel={`Question ${index + 1} of ${order.length}`} accessible>
            <Rail value={(index + 1) / order.length} />
          </View>
        </View>
        <View style={styles.stage}>
          <Animated.View
            key={step}
            entering={(nav.dir > 0 ? FadeInRight : FadeInLeft).duration(340).reduceMotion(sys)}
            exiting={FadeOut.duration(140).reduceMotion(sys)}
            style={StyleSheet.absoluteFill}
          >
            <ScrollView
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {screen}
            </ScrollView>
          </Animated.View>
        </View>
        <View style={styles.footer}>
          <Button
            label={step === 'review' ? 'Begin Day 1' : 'Continue'}
            disabled={!canContinue || !!launching}
            onPress={step === 'review' ? begin : () => go(1)}
            icon={step === 'review' ? <Ionicons name="arrow-forward" size={20} color={c.onAccent} /> : undefined}
            style={styles.wide}
          />
        </View>
      </Screen>
      {launching ? <DayOneTransition habits={launching} onDone={enter} /> : null}
    </View>
  );
}

/** Whether VoiceOver or TalkBack is on (then a choice never moves the screen on by itself). */
function useScreenReader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isScreenReaderEnabled().then((v) => live && setOn(v));
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setOn);
    return () => {
      live = false;
      sub.remove();
    };
  }, []);
  return on;
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.sm,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stage: { flex: 1 },
  scroll: {
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.xxl,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  list: { gap: space.sm },
  gap: { height: space.xs },
  skip: { alignSelf: 'center', paddingVertical: space.sm },
  habitBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: -space.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  review: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg },
  reviewArt: { width: 64, height: 64, borderRadius: radius.sm, overflow: 'hidden' },
  footer: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.sm },
  wide: { width: '100%', maxWidth: 520, alignSelf: 'center' },
});
