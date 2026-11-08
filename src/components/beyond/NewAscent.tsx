import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { toDateKey } from '../../core/dates';
import { INTENSITIES, type Intensity } from '../../core/reset/habits';
import * as P from '../../core/reset/pilot';
import { isMinor, type AgeBand, type Precaution } from '../../core/reset/profile';
import { haptic } from '../../lib/haptics';
import { startNewAscent } from '../../store/ascent';
import { pilotNow, pilotToday, useResetPilot } from '../../store/resetPilot';
import { space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { CROP_COUNT } from '../habitArt';
import { Scene } from '../HabitCard';
import { AGES, HEALTH } from '../pilot/SetupParts';
import { ThemedImage } from '../ThemedImage';
import { TILE_HEIGHT, TILES } from '../worldTiles';
import { Button, Screen, T } from '../ui';
import { useLanguage, useT } from '../../i18n/react';
import { isolateNumbers, isRTLLanguage } from '../../i18n/direction';

/**
 * Begin a New Ascent: a short set-up from where the last one ended, as one page of the journal. It opens on the
 * summit just reached; the person reconfirms their age band and health precautions (they drive the safety rules and
 * may have changed), keeps or leaves out each habit and sets its level (pre-selected at the one reached); it ends at
 * the foot of the mountain, where the next climb begins. The finished Life Reset joins Past journeys in the same save
 * as the new one begins (store/ascent.ts); then Day 1's ceremony.
 */
export function NewAscent() {
  const { c } = useTheme();
  const t = useT();
  const prev = useResetPilot((s) => s.program)!;
  const offset = useResetPilot((s) => s.devDayOffset);
  const today = pilotToday({ program: prev, devDayOffset: offset });
  const defaults = useMemo(() => P.ascentDefaults(prev, today), [prev, today]);
  const next = P.ascentOf(prev) + 1;

  const [age, setAge] = useState<AgeBand | null>(prev.answers.age);
  const [health, setHealth] = useState<Precaution[] | 'unknown'>(prev.answers.precautions);
  const [confirmed, setConfirmed] = useState(false);
  const [levels, setLevels] = useState<Record<string, Intensity | null>>(() =>
    Object.fromEntries(defaults.choices.map((ch) => [ch.habitId, ch.intensity])),
  );
  const [custom, setCustom] = useState<string[]>(defaults.custom);
  const [own, setOwn] = useState(prev.answers.ownSessions ?? 3);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // Scrolled past the painting: the sheet's title and Cancel stay at the top.
  const [stuck, setStuck] = useState(false);
  const { width } = useWindowDimensions();
  const bandHeight = Math.round(width * BAND_RATIO);

  const answers: P.PilotAnswers = {
    ...prev.answers,
    age: age ?? prev.answers.age,
    precautions: health,
    ...(levels.strength_log === 'challenge' ? { ownSessions: own } : {}),
  };
  const choices: P.PilotChoice[] = Object.entries(levels)
    .filter((e): e is [P.PilotHabitId, Intensity] => e[1] !== null && P.isPilotHabit(e[0]))
    .map(([habitId, intensity]) => ({ habitId, intensity }));
  const problems = age && isMinor(age) ? [t('engine.problems.under18')] : P.setupProblems(answers, choices);
  const ready = confirmed && !!age && choices.length > 0 && problems.length === 0;

  const toggleHealth = (id: Precaution) => {
    setConfirmed(true);
    setHealth((h) => {
      const list = h === 'unknown' ? [] : h;
      return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
    });
  };
  const setLevel = (habitId: string, level: Intensity | null) => setLevels((l) => ({ ...l, [habitId]: level }));
  const reached = (habitId: string) => defaults.choices.find((ch) => ch.habitId === habitId)?.intensity ?? 'starter';

  const begin = async () => {
    if (!ready || busy) return;
    setBusy(true);
    setNote(null);
    const program = P.beginAscent(prev, answers, choices, custom, toDateKey(pilotNow(offset)), today, CROP_COUNT);
    if (!program) {
      setBusy(false);
      setNote(t('beyond.ascent.cantStart'));
      return;
    }
    const r = await startNewAscent(program);
    setBusy(false);
    if (!r.ok) {
      haptic.warning();
      setNote(r.reason === 'held' ? t('beyond.ascent.held') : t('beyond.ascent.failed'));
      return;
    }
    haptic.success();
    // Day 1's ceremony comes up over Habits by itself (it's Day 1, not yet seen).
    if (router.canDismiss()) router.dismissAll();
    router.replace('/today');
  };

  const kicker = t('beyond.ascent.kicker', { ascent: next });

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        scrollEventThrottle={32}
        onScroll={(e) => {
          const past = e.nativeEvent.contentOffset.y > bandHeight - 64;
          if (past !== stuck) setStuck(past);
        }}
      >
        {/* The summit the last ascent reached, with the next ascent's name on it. */}
        <View style={{ height: bandHeight, justifyContent: 'flex-end' }}>
          <Painting row={SUMMIT_ROW} height={bandHeight} fade="bottom" />
          <View style={styles.grabber} />
          <Cancel style={styles.cancelOnArt} />
          <View style={styles.title}>
            <T v="overline" color={c.peachInk} style={styles.kicker} maxFontSizeMultiplier={1.5}>
              {kicker}
            </T>
            <T v="title" accessibilityRole="header">
              {t('beyond.ascent.title')}
            </T>
          </View>
        </View>

        <View style={styles.page}>
          {/* I · What needs reconfirming for safety. */}
          <Chapter n={1} title={t('beyond.ascent.stillRight')} first />
          <ThemedView style={[styles.aside, { borderColor: c.peach }]}>
            <T color={c.text} style={styles.asideText}>
              {t('beyond.ascent.stillRightHint')}
            </T>
          </ThemedView>

          <T v="bodyStrong" style={styles.label}>
            {t('beyond.ascent.age')}
          </T>
          <Divided
            items={AGES.map((a) => ({ id: a.id, label: isolateNumbers(a.label) }))}
            selected={age}
            onSelect={(id) => {
              setAge(id);
              setConfirmed(true);
            }}
            fit
          />

          <T v="bodyStrong" style={styles.label}>
            {t('beyond.ascent.health')}
          </T>
          <View style={styles.checks}>
            {HEALTH.map((h) => (
              <CheckRow
                key={h.id}
                label={h.label}
                on={health !== 'unknown' && health.includes(h.id)}
                onPress={() => toggleHealth(h.id)}
              />
            ))}
            <CheckRow
              label={t('beyond.ascent.preferNot')}
              on={health === 'unknown'}
              dim
              onPress={() => {
                setConfirmed(true);
                setHealth('unknown');
              }}
            />
          </View>

          {confirmed ? (
            <Animated.View entering={FadeIn.duration(220)} style={styles.confirmed} accessibilityLiveRegion="polite">
              <View style={[styles.confirmedMark, { backgroundColor: c.sage }]}>
                <Tick color={c.bg} size={12} />
              </View>
              <T v="bodyStrong" color={c.sageInk}>
                {t('beyond.ascent.confirmed')}
              </T>
            </Animated.View>
          ) : (
            <Pressable
              onPress={() => {
                haptic.select();
                setConfirmed(true);
              }}
              accessibilityRole="button"
              style={({ pressed }) => [styles.confirm, { borderColor: c.accent, opacity: pressed ? 0.6 : 1 }]}
            >
              <T v="bodyStrong" color={c.accentInk} style={styles.centered}>
                {t('beyond.ascent.confirm')}
              </T>
            </Pressable>
          )}

          {/* II · What carries forward, and what can change. */}
          <Chapter n={2} title={t('beyond.ascent.habits')} />
          <T color={c.textDim} style={styles.lede}>
            {t('beyond.ascent.habitsHint')}
          </T>
          <ThemedView style={[styles.habits, { borderColor: c.border }]}>
            {defaults.choices.map(({ habitId }) => (
              <HabitRow
                key={habitId}
                id={habitId}
                answers={answers}
                level={levels[habitId] ?? null}
                onLevel={(i) => setLevel(habitId, i)}
                onLeave={() => setLevel(habitId, null)}
                onKeep={() => setLevel(habitId, reached(habitId))}
                own={own}
                setOwn={setOwn}
              />
            ))}
            {defaults.custom.map((id) => {
              const kept = custom.includes(id);
              return (
                <ThemedView key={id} style={[styles.habit, { borderColor: c.border }]}>
                  <View style={styles.habitTop}>
                    <Thumb id={id} scene={prev.custom?.[id]?.scene} out={!kept} />
                    <View style={styles.habitName}>
                      <T v="bodyStrong" color={kept ? c.text : c.textDim} style={!kept && styles.outName}>
                        {P.nameOf(prev, id)}
                      </T>
                      <T color={c.textDim} style={styles.target}>
                        {t('beyond.ascent.yourHabit')} · {P.frequencyText(prev, id, today)}
                      </T>
                    </View>
                    <Pressable
                      onPress={() => {
                        haptic.select();
                        setCustom((k) => (k.includes(id) ? k.filter((x) => x !== id) : [...k, id]));
                      }}
                      accessibilityRole="checkbox"
                      aria-checked={kept}
                      accessibilityLabel={P.nameOf(prev, id)}
                      hitSlop={6}
                      style={({ pressed }) => [styles.kept, { opacity: pressed ? 0.6 : 1 }]}
                    >
                      <Box on={kept} small />
                      <T v="bodyStrong" color={kept ? c.accentInk : c.textDim} style={styles.keptText}>
                        {kept ? t('beyond.ascent.kept') : t('beyond.ascent.leftOut')}
                      </T>
                    </Pressable>
                  </View>
                </ThemedView>
              );
            })}
          </ThemedView>
          <T v="caption" color={c.textFaint} style={styles.addLater}>
            {t('beyond.ascent.addLater')}
          </T>
        </View>

        {/* III · The trailhead: what happens when the next ascent begins, and Begin. */}
        <View style={{ height: Math.round(width * TRAIL_RATIO), marginTop: space.xl }}>
          <Painting row={TRAIL_ROW} height={Math.round(width * TRAIL_RATIO)} fade="both" />
        </View>
        <View style={styles.end}>
          <T v="overline" color={c.peachInk} style={styles.kicker} maxFontSizeMultiplier={1.5}>
            {kicker}
          </T>
          <T style={styles.intro}>{t('beyond.ascent.intro')}</T>
          {problems.length && confirmed ? (
            <View style={styles.problems}>
              {problems.map((p) => (
                <T key={p} v="caption" color={c.danger}>
                  {p}
                </T>
              ))}
            </View>
          ) : null}
          <Button
            label={busy ? t('beyond.ascent.beginning') : t('beyond.ascent.begin', { ascent: next })}
            onPress={() => void begin()}
            disabled={!ready || busy}
            style={styles.begin}
          />
          {!confirmed ? (
            <T v="caption" color={c.textFaint} style={styles.centered}>
              {t('beyond.ascent.confirmFirst')}
            </T>
          ) : null}
          {note ? (
            <T v="caption" color={c.textDim} accessibilityLiveRegion="polite" style={styles.centered}>
              {note}
            </T>
          ) : null}
        </View>
      </ScrollView>

      {stuck ? (
        <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.barWrap}>
          <ThemedView style={[styles.bar, { backgroundColor: c.bg, borderColor: c.border }]}>
            <ThemedView style={[styles.barGrabber, { backgroundColor: c.border }]} />
            <T v="bodyStrong" numberOfLines={1} style={styles.barTitle}>
              {t('beyond.ascent.title')}
            </T>
            <Cancel />
          </ThemedView>
        </Animated.View>
      ) : null}
    </Screen>
  );
}

/** The Journey painting's rows (in its own pixels) at the top of the summit band and of the trailhead. */
const SUMMIT_ROW = 386;
const TRAIL_ROW = 2091;
/** Heights as a share of the width (the same part of the painting on every phone). */
const BAND_RATIO = 0.6;
const TRAIL_RATIO = 0.85;

/** A strip of the Journey painting across the page, faded into it (below, or above and below). */
function Painting({ row, height, fade }: { row: number; height: number; fade: 'bottom' | 'both' }) {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const k = width / TILES.dark.journey.width;
  return (
    <View
      style={[StyleSheet.absoluteFill, styles.clip]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <ThemedImage
        sources={{ dark: TILES.dark.journey.source, light: TILES.light.journey.source }}
        contentFit="fill"
        style={{ position: 'absolute', left: 0, top: -row * k, width, height: TILE_HEIGHT * k }}
      />
      {fade === 'both' ? (
        <LinearGradient
          colors={[c.bg, `${c.bg}00`]}
          locations={[0.04, 1]}
          style={[styles.fadeTop, { height: height * 0.36 }]}
        />
      ) : null}
      <LinearGradient
        colors={[`${c.bg}00`, c.bg]}
        locations={[0, fade === 'both' ? 0.7 : 0.92]}
        style={[styles.fadeBottom, { height: fade === 'both' ? height * 0.46 : height * 0.6 }]}
      />
    </View>
  );
}

function Cancel({ style }: { style?: object }) {
  const { c } = useTheme();
  const t = useT();
  return (
    <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" style={[styles.cancel, style]}>
      <T v="bodyStrong" color={c.accentInk}>
        {t('common.cancel')}
      </T>
    </Pressable>
  );
}

/** A section: its Roman numeral and name in small capitals on a hairline. */
function Chapter({ n, title, first }: { n: number; title: string; first?: boolean }) {
  const { c } = useTheme();
  const rtl = isRTLLanguage(useLanguage());
  return (
    <View style={[styles.chapter, { marginTop: first ? space.lg : space.xxl }]} accessible accessibilityRole="header">
      <T v="overline" color={c.textDim} style={styles.chapterTitle} maxFontSizeMultiplier={1.6}>
        {/* Arabic and Urdu: a right-to-left mark first, so the heading reads right to left from its numeral. */}
        {rtl ? '‏' : null}
        <T v="overline" color={c.textFaint} style={styles.numeral}>
          {n === 1 ? 'I' : n === 2 ? 'II' : 'III'}
        </T>
        {'   '}
        {title}
      </T>
      <ThemedView style={[styles.chapterRule, { backgroundColor: c.border }]} />
    </View>
  );
}

/** One of a few choices, side by side between hairlines; the chosen one in violet, underlined. */
function Divided<K extends string>({
  items,
  selected,
  onSelect,
  fit,
  name,
}: {
  items: { id: K; label: string; disabled?: boolean }[];
  selected: K | null;
  onSelect: (id: K) => void;
  /** Cells as wide as their labels (the age bands); else equal thirds. */
  fit?: boolean;
  /** Spoken before each choice (the habit's name). */
  name?: string;
}) {
  const { c } = useTheme();
  return (
    <ThemedView style={[styles.divided, { borderColor: c.border }]} accessibilityRole="radiogroup">
      {items.map((o, i) => {
        const on = selected === o.id;
        return (
          <Pressable
            key={o.id}
            onPress={() => {
              haptic.select();
              onSelect(o.id);
            }}
            disabled={o.disabled}
            accessibilityRole="radio"
            aria-checked={on}
            aria-disabled={!!o.disabled}
            accessibilityLabel={name ? `${name}: ${o.label}` : undefined}
            style={({ pressed }) => [
              styles.cell,
              fit ? styles.cellFit : styles.cellEqual,
              i > 0 && { borderStartWidth: StyleSheet.hairlineWidth, borderColor: c.border },
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <T
              color={o.disabled ? c.textFaint : on ? c.accentInk : c.text}
              style={[styles.cellText, on && styles.cellOn]}
              numberOfLines={fit ? 1 : 2}
            >
              {o.label}
            </T>
            {on ? <ThemedView style={[styles.underline, { backgroundColor: c.accent }]} /> : null}
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

/** A full-width row with a check box: one of several that can be chosen. */
function CheckRow({ label, on, dim, onPress }: { label: string; on: boolean; dim?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="checkbox"
      aria-checked={on}
      style={({ pressed }) => [styles.checkRow, { borderColor: c.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <Box on={on} />
      <T color={dim ? c.textDim : c.text} style={styles.checkText}>
        {label}
      </T>
    </Pressable>
  );
}

function Box({ on, small }: { on: boolean; small?: boolean }) {
  const { c } = useTheme();
  const size = small ? 20 : 22;
  return (
    <ThemedView
      style={[
        styles.box,
        {
          width: size,
          height: size,
          borderColor: on ? c.accent : c.textFaint,
          backgroundColor: on ? c.accent : undefined,
        },
      ]}
    >
      {on ? <Tick color={c.onAccent} size={small ? 11 : 12} /> : null}
    </ThemedView>
  );
}

function Tick({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 13 13">
      <Path d="M2.5 6.8l2.8 2.7 5.2-6" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** The habit's own painting (or its part of the panorama), small; faded when it's left out. */
function Thumb({ id, scene, out }: { id: string; scene?: number; out?: boolean }) {
  return (
    <View
      style={[styles.thumb, out && styles.thumbOut]}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Scene habitId={id} scene={scene} width={THUMB} height={THUMB} />
    </View>
  );
}

/** A habit carried forward: its painting, name and target, its level, and leave out (or keep). */
function HabitRow({
  id,
  answers,
  level,
  onLevel,
  onLeave,
  onKeep,
  own,
  setOwn,
}: {
  id: string;
  answers: P.PilotAnswers;
  level: Intensity | null;
  onLevel: (i: Intensity) => void;
  onLeave: () => void;
  onKeep: () => void;
  own: number;
  setOwn: (f: (n: number) => number) => void;
}) {
  const { c } = useTheme();
  const t = useT();
  const name = P.habitName(id);
  const out = level === null;
  const reason = out ? null : P.habitExclusion(id, answers);
  const options = P.intensityOptions(id, answers);
  const preview = level && !reason ? P.previewTarget(id, level, answers) : null;
  return (
    <ThemedView style={[styles.habit, { borderColor: c.border }]}>
      <View style={styles.habitTop}>
        <Thumb id={id} out={out} />
        <View style={styles.habitName}>
          <T v="bodyStrong" color={out ? c.textDim : c.text} style={out && styles.outName}>
            {name}
          </T>
          {out ? (
            <T color={c.textDim} style={styles.target}>
              {t('beyond.ascent.leftOut')}
            </T>
          ) : reason ? (
            <T color={c.danger} style={styles.target}>
              {t('setup.intensity.notAvailable', { reason })}
            </T>
          ) : preview ? (
            <T color={c.textDim} style={styles.target}>
              {t('setup.intensity.preview', preview)}
            </T>
          ) : null}
        </View>
      </View>
      {out || reason ? null : (
        <Divided
          items={INTENSITIES.map((i) => ({
            id: i,
            label: P.intensityName(i),
            disabled: !!options.find((o) => o.intensity === i)?.reason,
          }))}
          selected={level}
          onSelect={onLevel}
          name={name}
        />
      )}
      {id === 'strength_log' && level === 'challenge' && !reason ? (
        <View style={styles.own}>
          <T color={c.textDim} style={styles.ownLabel}>
            {t('setup.intensity.ownSessions')}
          </T>
          <Round
            label="−"
            a11y={`${t('setup.intensity.ownSessions')} −`}
            onPress={() => setOwn((n) => Math.max(2, n - 1))}
          />
          <T v="bodyStrong" style={styles.ownValue} accessibilityLiveRegion="polite">
            {own}
          </T>
          <Round
            label="+"
            a11y={`${t('setup.intensity.ownSessions')} +`}
            onPress={() => setOwn((n) => Math.min(7, n + 1))}
          />
        </View>
      ) : null}
      <View style={[styles.linkRow, out && styles.linkRowOut]}>
        {out ? (
          <Link label={t('beyond.ascent.keep', { habit: name })} accent onPress={onKeep} />
        ) : reason ? (
          <Link label={t('setup.intensity.removeIt')} onPress={onLeave} />
        ) : (
          <Link label={t('beyond.ascent.leaveOut', { habit: name })} onPress={onLeave} />
        )}
      </View>
    </ThemedView>
  );
}

/** A secondary action as words, underlined by a hairline (violet to bring something back). */
function Link({ label, accent, onPress }: { label: string; accent?: boolean; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      style={({ pressed }) => [styles.link, { opacity: pressed ? 0.5 : 1 }]}
    >
      <T
        color={accent ? c.accentInk : c.text}
        style={[
          styles.linkText,
          { textDecorationLine: 'underline', textDecorationColor: accent ? `${c.accent}70` : `${c.text}40` },
        ]}
      >
        {label}
      </T>
    </Pressable>
  );
}

/** − or +, a small round button (44 pt to touch). */
function Round({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        haptic.select();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.roundHit, { opacity: pressed ? 0.5 : 1 }]}
    >
      <ThemedView style={[styles.round, { borderColor: c.border }]}>
        <T style={styles.roundText}>{label}</T>
      </ThemedView>
    </Pressable>
  );
}

const THUMB = 52;

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xxl },
  clip: { overflow: 'hidden' },
  fadeTop: { position: 'absolute', left: 0, right: 0, top: 0 },
  fadeBottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  grabber: {
    position: 'absolute',
    top: 7,
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  cancel: { minHeight: 32, justifyContent: 'center' },
  cancelOnArt: { position: 'absolute', top: 14, end: space.lg },
  title: { paddingHorizontal: space.lg + 4, paddingBottom: 2, gap: space.xs },
  kicker: { letterSpacing: 1.8 },
  page: { paddingHorizontal: space.lg + 4 },
  chapter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chapterTitle: { flexShrink: 1, maxWidth: '80%', fontSize: 11.5, letterSpacing: 2 },
  numeral: { fontSize: 11.5, letterSpacing: 1 },
  chapterRule: { flex: 1, minWidth: 12, height: StyleSheet.hairlineWidth },
  aside: { marginTop: space.md, paddingStart: space.md, borderStartWidth: 1.5 },
  asideText: { fontSize: 15, lineHeight: 21 },
  label: { marginTop: space.xl },
  divided: {
    flexDirection: 'row',
    marginTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cell: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm },
  cellEqual: { flex: 1, paddingHorizontal: 2 },
  cellFit: { flexGrow: 1, flexShrink: 1, paddingHorizontal: 4 },
  cellText: { fontSize: 15, lineHeight: 20, textAlign: 'center', fontVariant: ['tabular-nums'] },
  cellOn: { fontWeight: '600' },
  underline: {
    position: 'absolute',
    bottom: -StyleSheet.hairlineWidth,
    left: '24%',
    right: '24%',
    height: 2,
    borderRadius: 1,
  },
  checks: { marginTop: space.sm },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 50,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkText: { flex: 1, fontSize: 16, lineHeight: 21 },
  box: { borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  confirm: {
    marginTop: space.lg,
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  confirmed: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: space.lg, minHeight: 44 },
  confirmedMark: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  centered: { textAlign: 'center' },
  lede: { marginTop: space.sm, fontSize: 15, lineHeight: 21 },
  habits: { marginTop: space.md, borderBottomWidth: StyleSheet.hairlineWidth },
  habit: { paddingTop: space.lg, paddingBottom: space.xs, borderTopWidth: StyleSheet.hairlineWidth },
  habitTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: space.sm },
  thumb: { width: THUMB, height: THUMB, borderRadius: 10, overflow: 'hidden' },
  thumbOut: { opacity: 0.35 },
  habitName: { flex: 1, gap: 2 },
  outName: { fontWeight: '500' },
  target: { fontSize: 14, lineHeight: 19 },
  kept: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'center' },
  keptText: { fontSize: 15 },
  linkRow: { flexDirection: 'row', justifyContent: 'flex-end' },
  linkRowOut: { justifyContent: 'flex-start', paddingStart: THUMB + 14, marginTop: -space.sm },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  own: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: space.sm },
  ownLabel: { flex: 1, fontSize: 15, lineHeight: 20 },
  ownValue: { minWidth: 24, textAlign: 'center', fontVariant: ['tabular-nums'] },
  roundHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  round: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  roundText: { fontSize: 20, lineHeight: 24, fontWeight: '300' },
  addLater: { marginTop: space.md },
  end: { paddingHorizontal: space.lg + 4, marginTop: -space.xxxl * 2, gap: space.sm },
  intro: { fontSize: 16, lineHeight: 23 },
  problems: { gap: 4, marginTop: space.sm },
  begin: { marginTop: space.lg },
  barWrap: { position: 'absolute', left: 0, right: 0, top: 0 },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.md,
    paddingHorizontal: space.lg + 4,
    paddingTop: 22,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  barGrabber: {
    position: 'absolute',
    top: 7,
    alignSelf: 'center',
    left: '50%',
    marginLeft: -18,
    width: 36,
    height: 5,
    borderRadius: 3,
  },
  barTitle: { flex: 1, paddingBottom: 6 },
});
