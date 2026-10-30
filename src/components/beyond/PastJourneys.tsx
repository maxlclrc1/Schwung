import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { PROGRAM_DAYS } from '../../core/dates';
import * as P from '../../core/reset/pilot';
import { haptic } from '../../lib/haptics';
import { useJourneys, type ArchivedJourney } from '../../store/journeys';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { rise, useTints } from '../onboarding/kit';
import { SheetHeader } from '../SheetHeader';
import { Screen, T } from '../ui';
import { formatDate } from '../../i18n';
import { useT } from '../../i18n/react';

const longDate = (key: string) => formatDate(key, 'long');

/**
 * Journey → Past journeys: every finished ascent, newest first, kept exactly as it was. Each opens its 66-Day Story
 * (to look at, save or share). One can be removed, after a clear confirmation; nothing here is ever changed.
 */
export function PastJourneys() {
  const { c } = useTheme();
  const t = useT();
  const journeys = useJourneys((s) => s.journeys);
  const held = useJourneys((s) => s.held);
  const list = [...journeys].reverse();
  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={t('beyond.past.title')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <T color={c.textDim}>{t('beyond.past.intro')}</T>
        {held ? (
          <T v="caption" color={c.danger}>
            {t('beyond.past.held')}
          </T>
        ) : null}
        {list.map((j, i) => (
          <Animated.View key={j.id} entering={rise(i * 60)}>
            <JourneyRow journey={j} />
          </Animated.View>
        ))}
        {!list.length && !held ? (
          <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
            {t('beyond.past.empty')}
          </T>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function JourneyRow({ journey }: { journey: ArchivedJourney }) {
  const { c } = useTheme();
  const tint = useTints();
  const t = useT();
  const p = journey.program;
  const stats = P.journeyStats(p, PROGRAM_DAYS);
  const ascent = P.ascentOf(p);
  const remove = () =>
    Alert.alert(t('beyond.past.removeTitle', { ascent }), t('beyond.past.removeBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('beyond.past.remove'),
        style: 'destructive',
        onPress: () => {
          haptic.warning();
          useJourneys.getState().remove(journey.id);
        },
      },
    ]);
  return (
    <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
      <Pressable
        onPress={() => {
          haptic.select();
          router.push(`/life-reset/story?journey=${encodeURIComponent(journey.id)}`);
        }}
        accessibilityRole="button"
        accessibilityLabel={t('beyond.past.rowA11y', {
          ascent,
          date: longDate(p.startedAt),
          done: stats.done,
          total: PROGRAM_DAYS,
        })}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
      >
        <View style={[styles.badge, { backgroundColor: tint.indigo.soft }]}>
          <T v="bodyStrong" color={tint.indigo.ink}>
            {ascent}
          </T>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="bodyStrong">{t('beyond.past.ascent', { ascent })}</T>
          <T v="caption" color={c.textDim}>
            {t('beyond.past.row', {
              date: longDate(p.startedAt),
              done: stats.done,
              total: PROGRAM_DAYS,
              xp: P.pilotXp(p),
            })}
          </T>
          <T v="caption" color={c.textFaint} numberOfLines={1}>
            {p.habits.map((id) => P.nameOf(p, id)).join(' · ')}
          </T>
        </View>
        <Ionicons name="image-outline" size={18} color={c.textDim} />
      </Pressable>
      <Pressable onPress={remove} accessibilityRole="button" hitSlop={8} style={styles.remove}>
        <T v="caption" color={c.textFaint}>
          {t('beyond.past.remove')}
        </T>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.lg },
  card: { borderRadius: radius.lg, padding: space.md, gap: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  remove: { alignSelf: 'flex-end', paddingHorizontal: space.sm, paddingVertical: 2 },
});
