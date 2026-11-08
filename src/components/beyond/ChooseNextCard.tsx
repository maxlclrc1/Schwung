import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Press } from '../onboarding/Choices';
import { useOnArt } from '../onArt';
import { T } from '../ui';
import { useT } from '../../i18n/react';
import { flipX } from '../../i18n/direction';
import { pushOnce } from '../../lib/navigation';

const sys = ReduceMotion.System;

/**
 * On Habits, past the summit while nothing is chosen yet ("Decide later"): a quiet journal entry back to "What's
 * next?", straight on the painting. A hairline with a short warm rule at its start, the small-caps label, the title and
 * its line, and a chevron at the end; the whole entry is one tap. Habits and reminders rest meanwhile; nothing is
 * missed.
 */
export function ChooseNextCard() {
  const { c, isDark } = useTheme();
  const onArt = useOnArt();
  const t = useT();
  return (
    <Animated.View entering={FadeIn.duration(300).reduceMotion(sys)} exiting={FadeOut.duration(180).reduceMotion(sys)}>
      <Press
        onPress={() => pushOnce('/life-reset/next')}
        accessibilityRole="button"
        accessibilityLabel={t('beyond.card.a11y')}
      >
        <View style={styles.entry}>
          <ThemedView style={[styles.rule, { backgroundColor: `${c.text}29` }]} />
          <ThemedView style={[styles.accent, { backgroundColor: c.peach }]} />
          <View style={styles.row}>
            <View style={styles.words}>
              <T color={c.peachInk} style={[styles.kicker, onArt.style]}>
                {t('beyond.card.kicker')}
              </T>
              <T color={c.text} style={[styles.title, onArt.style]}>
                {t('beyond.card.title')}
              </T>
              {/* Light mode: a little stronger than the usual dim grey, which the painting's misty hills match. */}
              <T color={isDark ? c.textDim : `${c.text}CC`} style={[styles.body, onArt.style]}>
                {t('beyond.card.body')}
              </T>
            </View>
            <Ionicons name="chevron-forward" size={17} color={c.peach} style={flipX} />
          </View>
        </View>
      </Press>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  entry: { minHeight: 44, paddingTop: space.md + 2, paddingBottom: space.sm + 2, paddingHorizontal: 2 },
  rule: { position: 'absolute', top: 0, start: 0, end: 0, height: 1 },
  accent: { position: 'absolute', top: -1, start: 0, width: 32, height: 2, borderRadius: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  words: { flex: 1 },
  kicker: { fontSize: 11.5, lineHeight: 15, letterSpacing: 1.5, fontWeight: '600', textTransform: 'uppercase' },
  title: { marginTop: 4, fontSize: 19, lineHeight: 24, fontWeight: '600', letterSpacing: -0.2 },
  body: { marginTop: 2, fontSize: 13.5, lineHeight: 18 },
});
