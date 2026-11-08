import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PROGRAM_DAYS } from '../../core/dates';
import * as P from '../../core/reset/pilot';
import { haptic } from '../../lib/haptics';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { rise } from '../onboarding/kit';
import { ThemedImage } from '../ThemedImage';
import { TILE_HEIGHT, TILES } from '../worldTiles';
import { Screen, T } from '../ui';
import { useT } from '../../i18n/react';
import { flipX } from '../../i18n/direction';
import { pushOnce } from '../../lib/navigation';

/**
 * "What's next?": after the summit ceremony and the 66-Day Story (never over them), the next chapter on the same
 * mountain. The summit stays clear at the top and fades into the page; below it, two paths as ruled rows: Keep My
 * Momentum (the same habits go on) and Begin a New Ascent (a fresh 66 days; this one is kept); and, quieter, decide
 * later (a small card on Habits; habits and reminders rest meanwhile).
 */
export function WhatsNext() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const [busy, setBusy] = useState(false);
  if (!program) return null;
  const today = pilotToday({ program, devDayOffset: offset });
  const stats = P.journeyStats(program, Math.max(today, PROGRAM_DAYS));
  // The summit day itself is still the first ascent's: a new one can begin from tomorrow.
  const ascentOpen = today > PROGRAM_DAYS;

  const close = () => {
    if (router.canDismiss()) router.dismissAll();
    router.replace('/today');
  };

  const keep = () => {
    if (busy) return;
    setBusy(true);
    useResetPilot.getState().keepMomentum();
    haptic.success();
    close();
  };

  const k = width / TILES.dark.journey.width;
  const artHeight = Math.round(width * ART_RATIO);

  return (
    <Screen edges={['bottom']}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          // The words sit low, on the painting's fade; a short screen keeps a band of the summit above them and scrolls.
          { minHeight: height - insets.bottom, paddingTop: insets.top + Math.round(width * MIN_BAND_RATIO) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.art, { height: artHeight }]}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
        >
          <ThemedImage
            sources={{ dark: TILES.dark.journey.source, light: TILES.light.journey.source }}
            contentFit="fill"
            style={{ position: 'absolute', left: 0, top: -SUMMIT_ROW * k, width, height: TILE_HEIGHT * k }}
          />
          <LinearGradient
            colors={[`${c.bg}00`, c.bg]}
            locations={[0, 0.82]}
            style={[styles.fade, { height: artHeight * 0.62 }]}
          />
        </View>

        <Animated.View entering={rise(0)} style={styles.head}>
          <T v="overline" color={c.peachInk} style={styles.kicker} maxFontSizeMultiplier={1.5}>
            {P.ascentOf(program) > 1
              ? t('beyond.next.kickerAscent', { ascent: P.ascentOf(program), total: PROGRAM_DAYS })
              : t('beyond.next.kicker', { total: PROGRAM_DAYS })}
          </T>
          <T v="display" accessibilityRole="header" style={styles.title}>
            {t('beyond.next.title')}
          </T>
          <T color={c.textDim} style={styles.body}>
            {t('beyond.next.body', { done: stats.done, total: PROGRAM_DAYS })}
          </T>
        </Animated.View>

        <Animated.View entering={rise(120)}>
          <ThemedView style={[styles.choices, { borderColor: c.border }]}>
            <Choice
              rule={c.sage}
              ink={c.sageInk}
              title={t('beyond.next.momentum')}
              body={t('beyond.next.momentumBody')}
              onPress={keep}
              disabled={busy}
            />
            <Choice
              rule={c.accent}
              ink={c.accentInk}
              title={t('beyond.next.ascent')}
              body={ascentOpen ? t('beyond.next.ascentBody') : t('beyond.next.ascentTomorrow')}
              onPress={() => pushOnce('/life-reset/ascent')}
              disabled={busy}
              closed={!ascentOpen}
            />
          </ThemedView>
        </Animated.View>

        <Animated.View entering={rise(220)} style={styles.later}>
          <Pressable
            onPress={close}
            disabled={busy}
            accessibilityRole="button"
            hitSlop={4}
            style={({ pressed }) => [styles.laterLink, { opacity: pressed ? 0.5 : 1 }]}
          >
            <T style={[styles.laterText, { textDecorationColor: `${c.text}4D` }]}>{t('beyond.next.later')}</T>
          </Pressable>
          <T v="caption" color={c.textFaint} style={styles.centered}>
            {t('beyond.next.laterBody')}
          </T>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

/** The Journey painting's row (in its own pixels) at the top of the screen: sky, then the summit. */
const SUMMIT_ROW = 188;
/** The painting's height, and the least of it kept above the words, as shares of the width. */
const ART_RATIO = 1.18;
const MIN_BAND_RATIO = 0.56;

/** One path: a thin rule in its colour, its name in that colour, what it means, and a chevron when it's open. */
function Choice({
  rule,
  ink,
  title,
  body,
  onPress,
  disabled,
  closed,
}: {
  rule: string;
  ink: string;
  title: string;
  body: string;
  onPress: () => void;
  disabled?: boolean;
  /** Not open yet (the summit day): shown, quieter, and not pressable. */
  closed?: boolean;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || closed}
      accessibilityRole="button"
      aria-disabled={!!(disabled || closed)}
      accessibilityLabel={`${title}. ${body}`}
      style={({ pressed }) => [styles.choice, { borderColor: c.border, opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={[styles.rule, { backgroundColor: rule, opacity: closed ? 0.35 : 1 }]} />
      <View style={styles.choiceText}>
        <T v="heading" color={closed ? c.textDim : ink}>
          {title}
        </T>
        <T color={c.textDim} style={styles.choiceBody}>
          {body}
        </T>
      </View>
      {closed ? null : <Ionicons name="chevron-forward" size={18} color={c.textFaint} style={flipX} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { justifyContent: 'flex-end', paddingHorizontal: space.lg + 4, paddingBottom: space.xl },
  art: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden' },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  head: { gap: 6 },
  kicker: { letterSpacing: 1.8 },
  title: { fontSize: 40, lineHeight: 46, letterSpacing: -1 },
  body: { fontSize: 16, lineHeight: 22 },
  choices: { marginTop: space.xl, borderTopWidth: StyleSheet.hairlineWidth },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 64,
    paddingVertical: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rule: { alignSelf: 'stretch', width: 2, borderRadius: 1 },
  choiceText: { flex: 1, gap: 3 },
  choiceBody: { fontSize: 15, lineHeight: 21 },
  later: { marginTop: space.lg, alignItems: 'center', gap: 2 },
  laterLink: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm },
  laterText: { fontSize: 16, lineHeight: 21, fontWeight: '500', textDecorationLine: 'underline' },
  centered: { textAlign: 'center', maxWidth: 320 },
});
