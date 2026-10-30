import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  FadeIn,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type EntryExitAnimationFunction,
} from 'react-native-reanimated';
import { PULL_MINUTES_OPTIONS, SKILLS, type Intensity } from '../../core/reset/habits';
import * as P from '../../core/reset/pilot';
import type { ActiveDays, AgeBand, PhoneHours, Precaution } from '../../core/reset/profile';
import { haptic } from '../../lib/haptics';
import { useResetPilot } from '../../store/resetPilot';
import { flushStorage } from '../../store/storage';
import { radius, space, useTheme } from '../../theme';
import { AgeDial, bandOf, YEARS_OF } from '../onboarding/AgeDial';
import { IconTiles, Press, SoftChoice, Stairs, Stepper, Token } from '../onboarding/Choices';
import { HabitArt, HabitFan, HabitTile, StartCard, Stones } from '../onboarding/Habits';
import { DayClock, hhmm, minutesOf } from '../onboarding/DayClock';
import { markSaved, showFinale } from '../onboarding/Handoff';
import { PhoneMeter, TimeDial, TrailPicker } from '../onboarding/Instruments';
import { CHAPTERS, DragLock, Question, rise, TrailProgress, useTints, type TintName } from '../onboarding/kit';
import { Button, Screen, T } from '../ui';
import { OnboardingBackdrop } from '../World';
import { ACTIVE, duration, HEALTH, PHONE, STARTS } from './SetupParts';
import { t as tr } from '../../i18n';
import { useT } from '../../i18n/react';

type Step = 'age' | 'health' | 'habits' | P.Baseline | 'levels' | 'time' | 'review';

/** The story's chapter for each question (kit.tsx CHAPTERS): you, your habits, your life, your start, your reset. */
const CHAPTER: Record<Step, number> = {
  age: 0,
  health: 0,
  habits: 1,
  phone: 2,
  pullMinutes: 2,
  wake: 2,
  activeDays: 2,
  skill: 2,
  strengthStart: 2,
  levels: 3,
  time: 3,
  review: 4,
};
/** Which habit asks each baseline question (its name heads the screen). */
const ASKED_BY: Record<P.Baseline, string> = {
  phone: 'screen_app_limit',
  pullMinutes: 'screen_app_limit',
  wake: 'sleep_wake',
  activeDays: 'move_walk',
  skill: 'skill_practice',
  strengthStart: 'strength_log',
};
const HEALTH_ICON: Record<Precaution, React.ComponentProps<typeof Ionicons>['name']> = {
  joint: 'bandage-outline',
  walkingDifficult: 'walk-outline',
  heart: 'heart-outline',
  pregnancy: 'flower-outline',
  fluidLimit: 'water-outline',
  sleepCondition: 'moon-outline',
};
const SKILL_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  Language: 'chatbubbles-outline',
  Instrument: 'musical-notes-outline',
  Drawing: 'brush-outline',
  Coding: 'code-slash-outline',
  Writing: 'create-outline',
  'Sport skill': 'football-outline',
  Other: 'sparkles-outline',
};
const activeDetail = (id: ActiveDays) => tr(`setup.activeDetail.${id}`);
const strengthDetail = (id: P.StrengthStart) => tr(`setup.startDetail.${id}`);
/** Phone hours, lowest first; "Not sure" is its own answer. */
const PHONE_HOURS = PHONE.filter((x) => x.id !== 'unknown');
const ease = Easing.bezier(0.22, 1, 0.36, 1);

/**
 * The Life Reset set-up, how every program starts (app/life-reset/setup.tsx), told as a short story in five
 * chapters: you today, the habits you want, the bits of your life they need, where each starts, and the reveal.
 * One question a screen, each answered with its own control. Every answer is kept going back; nothing moves on by
 * itself; nothing is pre-selected. The rules are the program's own (pilot.ts setupProblems).
 */
export function PilotSetup() {
  const { c } = useTheme();
  const t = useT();
  const tints = useTints();
  const { width } = useWindowDimensions();
  const reduce = useReducedMotion();
  // One Life Reset at a time: with one saved, set-up never runs again (it would never replace it either: start()).
  const running = useResetPilot((s) => s.program !== null);
  const [step, setStep] = useState<Step>('age');
  const [age, setAge] = useState<AgeBand | null>(null);
  // The age itself is only shown here; the program keeps its band.
  const [years, setYears] = useState<number | null>(null);
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
  const [dragging, setDragging] = useState(false);
  // Confirmed: the program is created and the finale (Handoff.tsx, above the navigator) takes it from here.
  const [launching, setLaunching] = useState<string[] | null>(null);

  // Which way the story is moving, read by the page transitions as they run.
  const dir = useSharedValue(1);

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
  const timeProblem =
    minutes !== null && total > minutes ? t('engine.problems.tooLong', { total, available: minutes }) : undefined;

  const order: Step[] = ['age', 'health', 'habits', ...baselines, 'levels', 'time', 'review'];
  const index = Math.max(0, order.indexOf(step));
  const chapter = CHAPTER[step];
  const inChapter = order.filter((s) => CHAPTER[s] === chapter);
  const progress = chapter + (chapter === CHAPTERS.length - 1 ? 0 : inChapter.indexOf(step) / inChapter.length);

  const go = (d: 1 | -1) => {
    // Once the reset is confirmed there is no going back through the questions (the finale is up).
    if (launching) return;
    const i = index + d;
    if (i < 0) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
      return;
    }
    dir.set(d);
    setStep(order[Math.min(i, order.length - 1)]);
  };
  // Android's back button walks back through the questions, like the back button.
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

  const togglePick = (id: P.PilotHabitId) => {
    const on = picked.includes(id);
    if (!on && (P.habitExclusion(id, answers) || picked.length >= P.MAX_HABITS)) {
      haptic.warning();
      return;
    }
    setPicked((p) => (on ? p.filter((x) => x !== id) : [...p, id]));
  };
  const begin = () => {
    // Once only: start() also refuses a second program, so a double tap can never make two.
    if (launching) return;
    if (!useResetPilot.getState().start(answers, choices)) return;
    haptic.success();
    const ids = P.PILOT_HABITS.filter((id) => picked.includes(id));
    setLaunching(ids);
    showFinale(ids);
    // Make sure it's on disk before Day 1 is offered; a failed write is kept and tried again.
    const save = (tries: number): Promise<void> =>
      flushStorage().catch(() =>
        tries > 1 ? new Promise((r) => setTimeout(r, 400)).then(() => save(tries - 1)) : undefined,
      );
    // (A tick first, so the store's write of the new program has been queued.)
    void new Promise((r) => setTimeout(r, 0)).then(() => save(3)).then(markSaved);
  };

  // Atmosphere: the world drifts a little further along with the story, and its light takes the chapter's tint.
  const drift = useSharedValue(progress);
  useEffect(() => {
    drift.set(withTiming(progress, { duration: 1400, easing: ease, reduceMotion: ReduceMotion.System }));
  }, [progress, drift]);
  const washes = CHAPTERS.map((ch) => tints[ch.tint].soft);
  const stops = CHAPTERS.map((_, i) => i);
  const world = useAnimatedStyle(() => ({
    transform: [{ scale: 1.08 }, { translateX: (1 - drift.value / 2) * width * 0.03 }],
  }));
  const wash = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(drift.value, stops, washes) }));

  // Pages: the new question glides in from the side it comes from, the old one eases out the other way.
  const entering: EntryExitAnimationFunction = () => {
    'worklet';
    const d = dir.value;
    return {
      initialValues: { opacity: 0, transform: [{ translateX: 22 * d }] },
      animations: {
        opacity: withTiming(1, { duration: 360, easing: ease }),
        transform: [{ translateX: withTiming(0, { duration: 520, easing: ease }) }],
      },
    };
  };
  const exiting: EntryExitAnimationFunction = () => {
    'worklet';
    const d = dir.value;
    return {
      initialValues: { opacity: 1, transform: [{ translateX: 0 }] },
      animations: {
        opacity: withTiming(0, { duration: 180, easing: Easing.in(Easing.quad) }),
        transform: [{ translateX: withTiming(-14 * d, { duration: 220, easing: Easing.in(Easing.quad) }) }],
      },
    };
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

  const content = Math.min(width, 520) - space.xl * 2;
  const tileWidth = Math.floor((content - space.md) / 2);
  const tint = (n: TintName) => tints[n];

  const screen = (() => {
    switch (step) {
      case 'age':
        return (
          <Question
            eyebrow={t('setup.q.welcome')}
            tint="lavender"
            title={t('setup.q.ageTitle')}
            hint={t('setup.q.ageHint')}
            center
          >
            <AgeDial
              years={years ?? (age ? YEARS_OF[age] : null)}
              onChange={(y) => {
                setYears(y);
                setAge(bandOf(y));
              }}
            />
          </Question>
        );
      case 'health':
        return (
          <Question
            eyebrow={t('setup.q.youToday')}
            tint="peach"
            title={t('setup.q.healthTitle')}
            hint={t('setup.q.healthHint')}
          >
            <View style={styles.tokens}>
              {HEALTH.map((h) => (
                <Token
                  key={h.id}
                  label={h.label}
                  icon={HEALTH_ICON[h.id]}
                  tint={tint('peach')}
                  on={Array.isArray(health) && health.includes(h.id)}
                  onPress={() =>
                    setHealth((cur) => {
                      const list = Array.isArray(cur) ? cur : [];
                      return list.includes(h.id) ? list.filter((x) => x !== h.id) : [...list, h.id];
                    })
                  }
                />
              ))}
            </View>
            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <SoftChoice
                  label={t('setup.q.none')}
                  icon="leaf-outline"
                  tint={tint('sage')}
                  on={Array.isArray(health) && health.length === 0}
                  onPress={() => setHealth([])}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SoftChoice
                  label={t('setup.q.ratherNot')}
                  icon="eye-off-outline"
                  tint={tint('mist')}
                  on={health === 'unknown'}
                  onPress={() => setHealth('unknown')}
                />
              </View>
            </View>
          </Question>
        );
      case 'habits':
        return (
          <Question
            eyebrow={t('setup.q.funPart')}
            tint="peach"
            title={t('setup.q.habitsTitle')}
            hint={t('setup.q.habitsHint')}
          >
            <View style={styles.habitBar}>
              <Stones count={picked.length} max={P.MAX_HABITS} />
              <Press
                onPress={() => setPicked(P.SUGGESTED_START.filter((id) => !P.habitExclusion(id, answers)))}
                accessibilityRole="button"
                accessibilityLabel={t('setup.q.suggestA11y')}
              >
                <View style={[styles.suggest, { backgroundColor: tints.lavender.soft }]}>
                  <Ionicons name="sparkles" size={14} color={tints.lavender.ink} />
                  <T v="caption" color={tints.lavender.ink} style={{ fontWeight: '700' }}>
                    {t('setup.q.suggest')}
                  </T>
                </View>
              </Press>
            </View>
            <View style={styles.grid}>
              {P.PILOT_HABITS.map((id, i) => (
                <HabitTile
                  key={id}
                  id={id}
                  order={i}
                  width={tileWidth}
                  selected={picked.includes(id)}
                  suggested={(P.SUGGESTED_START as readonly string[]).includes(id)}
                  reason={P.habitExclusion(id, answers)}
                  full={picked.length >= P.MAX_HABITS}
                  // A chosen habit can always be let go, even one that no longer fits.
                  onPress={() => togglePick(id)}
                />
              ))}
            </View>
          </Question>
        );
      case 'phone': {
        const i = PHONE_HOURS.findIndex((x) => x.id === phone);
        return (
          <Question
            eyebrow={P.habitName(ASKED_BY.phone)}
            tint="mist"
            title={t('setup.q.phoneTitle')}
            hint={t('setup.q.phoneHint')}
          >
            <PhoneMeter
              label={t('setup.q.phoneLabel')}
              stops={PHONE_HOURS.map((x) => x.label)}
              index={i >= 0 ? i : null}
              onChange={(n) => setPhone(PHONE_HOURS[n].id)}
            />
            <View style={styles.solo}>
              <SoftChoice
                label={t('setup.q.notSure')}
                icon="help-circle-outline"
                tint={tint('mist')}
                on={phone === 'unknown'}
                onPress={() => setPhone('unknown')}
              />
            </View>
          </Question>
        );
      }
      case 'pullMinutes':
        return (
          <Question
            eyebrow={P.habitName(ASKED_BY.pullMinutes)}
            tint="mist"
            title={t('setup.q.pullTitle')}
            hint={t('setup.q.pullHint')}
          >
            <PhoneMeter
              app
              label={t('setup.q.pullLabel')}
              stops={PULL_MINUTES_OPTIONS.map((m) => (m === 240 ? t('setup.fourHoursPlus') : duration(m)))}
              index={pull === undefined ? null : PULL_MINUTES_OPTIONS.indexOf(pull)}
              onChange={(n) => setPull(PULL_MINUTES_OPTIONS[n])}
            />
          </Question>
        );
      case 'wake':
        return (
          <Question
            eyebrow={P.habitName(ASKED_BY.wake)}
            tint="indigo"
            title={t('setup.q.wakeTitle')}
            hint={t('setup.q.wakeHint')}
          >
            <DayClock
              minutes={wake?.kind === 'time' ? minutesOf(wake.time) : null}
              onChange={(m) => setWake({ kind: 'time', time: hhmm(m) })}
              muted={
                wake?.kind === 'varies' ? t('setup.q.varies') : wake?.kind === 'shift' ? t('setup.q.shifts') : undefined
              }
            />
            <View style={styles.pair}>
              <View style={{ flex: 1 }}>
                <SoftChoice
                  label={t('setup.q.variesALot')}
                  icon="shuffle-outline"
                  tint={tint('indigo')}
                  on={wake?.kind === 'varies'}
                  onPress={() => setWake({ kind: 'varies' })}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SoftChoice
                  label={t('setup.q.workShifts')}
                  icon="briefcase-outline"
                  tint={tint('indigo')}
                  on={wake?.kind === 'shift'}
                  onPress={() => setWake({ kind: 'shift' })}
                />
              </View>
            </View>
          </Question>
        );
      case 'activeDays':
        return (
          <Question
            eyebrow={P.habitName(ASKED_BY.activeDays)}
            tint="sage"
            title={t('setup.q.activeTitle')}
            hint={t('setup.q.activeHint')}
            center
          >
            <TrailPicker
              label={t('setup.q.activeLabel')}
              items={ACTIVE.map((x) => ({
                id: x.id,
                label: t('setup.activeDays', { n: x.label }),
                detail: activeDetail(x.id),
              }))}
              value={active}
              onPick={setActive}
            />
          </Question>
        );
      case 'skill':
        return (
          <Question eyebrow={P.habitName(ASKED_BY.skill)} tint="lavender" title={t('setup.q.skillTitle')} center>
            <IconTiles
              items={SKILLS.map((x) => ({ id: x, label: P.skillName(x), icon: SKILL_ICON[x] ?? 'sparkles-outline' }))}
              value={skill}
              onPick={setSkill}
              tint={tint('lavender')}
            />
          </Question>
        );
      case 'strengthStart':
        return (
          <Question
            eyebrow={P.habitName(ASKED_BY.strengthStart)}
            tint="sage"
            title={t('setup.q.strengthTitle')}
            hint={t('setup.q.strengthHint')}
          >
            <Stairs
              items={STARTS.map((x) => ({ id: x.id, label: x.label, detail: strengthDetail(x.id) }))}
              value={start}
              onPick={setStart}
              tint={tint('sage')}
            />
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
            eyebrow={t('setup.q.startingPoint')}
            tint="sage"
            title={t('setup.q.levelsTitle')}
            hint={t('setup.q.levelsHint')}
          >
            <View style={styles.list}>
              {picked.map((id, i) => (
                <Animated.View key={id} entering={rise(140 + i * 70)}>
                  <StartCard
                    id={id}
                    answers={answers}
                    chosen={intensityOf(id)}
                    onChoose={(l) => setLevels((x) => ({ ...x, [id]: l }))}
                    onRemove={() => setPicked((p) => p.filter((x) => x !== id))}
                  >
                    {id === 'strength_log' && intensityOf(id) === 'challenge' ? (
                      <Stepper label={t('setup.q.ownSessions')} value={own} min={2} max={7} onChange={setOwn} />
                    ) : null}
                  </StartCard>
                </Animated.View>
              ))}
            </View>
          </Question>
        );
      case 'time':
        return (
          <Question
            eyebrow={t('setup.q.startingPoint')}
            tint="sage"
            title={t('setup.q.timeTitle')}
            hint={t('setup.q.timeHint')}
            center
          >
            <TimeDial
              label={t('setup.q.timeLabel')}
              stops={P.PILOT_TIME_OPTIONS.map(duration)}
              values={P.PILOT_TIME_OPTIONS}
              index={minutes === null ? null : (P.PILOT_TIME_OPTIONS as readonly number[]).indexOf(minutes)}
              onChange={(n) => setMinutes(P.PILOT_TIME_OPTIONS[n])}
              need={total}
            />
            <View style={styles.note}>
              {timeProblem ? (
                <Animated.View entering={FadeIn.duration(220).reduceMotion(ReduceMotion.System)}>
                  <T v="caption" color={c.danger} style={styles.centerText}>
                    {timeProblem}
                  </T>
                </Animated.View>
              ) : null}
            </View>
          </Question>
        );
      case 'review':
        return (
          <Question eyebrow={t('setup.q.yourReset')} tint="indigo" title={t('setup.q.readyTitle')}>
            <HabitFan ids={choices.map((x) => x.habitId)} width={content} />
            <View style={styles.facts}>
              {[
                {
                  icon: 'leaf-outline' as const,
                  text: t('setup.q.habitsFact', { count: choices.length }),
                  tint: tints.sage,
                },
                { icon: 'flag-outline' as const, text: t('setup.q.daysFact'), tint: tints.peach },
                { icon: 'sunny-outline' as const, text: t('setup.q.fromToday'), tint: tints.lavender },
              ].map((f, i) => (
                <Animated.View
                  key={f.text}
                  entering={rise(620 + i * 90)}
                  style={[styles.fact, { backgroundColor: f.tint.soft }]}
                >
                  <Ionicons name={f.icon} size={14} color={f.tint.ink} />
                  <T v="caption" color={f.tint.ink} style={{ fontWeight: '700' }}>
                    {f.text}
                  </T>
                </Animated.View>
              ))}
            </View>
            <View style={styles.list}>
              {choices.map((x, i) => {
                const p = P.previewTarget(x.habitId, x.intensity, answers);
                const dot = [tints.lavender, tints.peach, tints.sage, tints.mist, tints.indigo, tints.lavender][i];
                return (
                  <Animated.View key={x.habitId} entering={rise(900 + i * 80)} style={styles.reviewRow}>
                    <View style={styles.reviewArt}>
                      <HabitArt id={x.habitId} width={44} height={44} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <T v="bodyStrong">{P.habitName(x.habitId)}</T>
                      <T v="caption" color={c.textDim}>
                        {t('setup.intensity.preview', p)}
                      </T>
                    </View>
                    <View style={[styles.level, { backgroundColor: dot.soft }]}>
                      <T v="caption" color={dot.ink} style={{ fontWeight: '700' }}>
                        {P.intensityName(x.intensity)}
                      </T>
                    </View>
                  </Animated.View>
                );
              })}
            </View>
            <Animated.View entering={rise(900 + choices.length * 80)}>
              <T v="caption" color={c.textDim}>
                {minutes ? t('setup.q.totalOf', { total, have: duration(minutes) }) : t('setup.q.total', { total })}
                {t('setup.q.totalNote')}
              </T>
            </Animated.View>
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Screen
        backdrop={
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Animated.View style={[StyleSheet.absoluteFill, reduce ? null : world]}>
              <OnboardingBackdrop />
            </Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, styles.wash, wash]} />
          </View>
        }
      >
        <View style={styles.top}>
          <TrailProgress at={progress} />
          <View style={styles.chapterBox}>
            <Animated.View key={chapter} entering={reduce ? undefined : rise(0)}>
              <T v="caption" color={tints[CHAPTERS[chapter].tint].ink} style={styles.chapter}>
                {CHAPTERS[chapter].name}
              </T>
            </Animated.View>
          </View>
        </View>
        <DragLock.Provider value={setDragging}>
          <View style={styles.stage}>
            <Animated.View
              key={step}
              entering={reduce ? undefined : entering}
              exiting={reduce ? undefined : exiting}
              style={StyleSheet.absoluteFill}
            >
              <ScrollView
                scrollEnabled={!dragging}
                contentContainerStyle={styles.scroll}
                showsVerticalScrollIndicator={false}
              >
                {screen}
              </ScrollView>
            </Animated.View>
          </View>
        </DragLock.Provider>
        <View style={styles.footer}>
          <Pressable
            onPress={() => {
              haptic.select();
              go(-1);
            }}
            disabled={!!launching}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={t('setup.q.back')}
          >
            {({ pressed }) => (
              <View style={[styles.back, { backgroundColor: c.surface, opacity: pressed ? 0.7 : 1 }]}>
                <Ionicons name="chevron-back" size={24} color={c.text} />
              </View>
            )}
          </Pressable>
          <Button
            label={step === 'review' ? t('setup.q.confirm') : t('setup.q.continue')}
            disabled={!canContinue || !!launching}
            onPress={step === 'review' ? begin : () => go(1)}
            icon={step === 'review' ? <Ionicons name="arrow-forward" size={20} color={c.onAccent} /> : undefined}
            style={{ flex: 1 }}
          />
        </View>
      </Screen>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  wash: { opacity: 0.55 },
  top: { paddingHorizontal: space.xl, paddingTop: space.sm, gap: space.xs, flexDirection: 'row', alignItems: 'center' },
  chapterBox: { minWidth: 84, height: 20, overflow: 'hidden', alignItems: 'flex-end' },
  chapter: { fontWeight: '700', textAlign: 'right' },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  fact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  stage: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: space.xl,
    paddingTop: space.xl,
    paddingBottom: space.xl,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  note: { minHeight: 44, justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  tokens: { gap: space.sm },
  pair: { flexDirection: 'row', gap: space.sm },
  solo: { alignSelf: 'center' },
  habitBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  suggest: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    minHeight: 36,
    borderRadius: radius.pill,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  list: { gap: space.sm },
  reviewRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.xs },
  reviewArt: { width: 44, height: 44, borderRadius: 14, overflow: 'hidden' },
  level: { paddingHorizontal: space.sm, paddingVertical: 4, borderRadius: radius.pill },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  back: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
});
