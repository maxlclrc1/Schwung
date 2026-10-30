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

const longDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Journey → Past journeys: every finished ascent, newest first, kept exactly as it was. Each opens its 66-Day Story
 * (to look at, save or share). One can be removed, after a clear confirmation; nothing here is ever changed.
 */
export function PastJourneys() {
  const { c } = useTheme();
  const journeys = useJourneys((s) => s.journeys);
  const held = useJourneys((s) => s.held);
  const list = [...journeys].reverse();
  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Past journeys" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <T color={c.textDim}>
          Each Life Reset you finished, kept as it was: its days, habits and XP, and its 66-day story.
        </T>
        {held ? (
          <T v="caption" color={c.danger}>
            Some past journeys couldn’t be read on this phone. They’re kept safely and included in Export my data.
          </T>
        ) : null}
        {list.map((j, i) => (
          <Animated.View key={j.id} entering={rise(i * 60)}>
            <JourneyRow journey={j} />
          </Animated.View>
        ))}
        {!list.length && !held ? (
          <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
            Your finished ascents will be kept here.
          </T>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function JourneyRow({ journey }: { journey: ArchivedJourney }) {
  const { c } = useTheme();
  const t = useTints();
  const p = journey.program;
  const stats = P.journeyStats(p, PROGRAM_DAYS);
  const ascent = P.ascentOf(p);
  const remove = () =>
    Alert.alert(
      `Remove Ascent ${ascent}?`,
      'Its days, habits and story are deleted from this phone. XP it earned stays in your lifetime total. This can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            haptic.warning();
            useJourneys.getState().remove(journey.id);
          },
        },
      ],
    );
  return (
    <ThemedView style={[styles.card, { backgroundColor: c.surface }]}>
      <Pressable
        onPress={() => {
          haptic.select();
          router.push(`/life-reset/story?journey=${encodeURIComponent(journey.id)}`);
        }}
        accessibilityRole="button"
        accessibilityLabel={`Ascent ${ascent}, from ${longDate(p.startedAt)}. ${stats.done} of ${PROGRAM_DAYS} days climbed. Open its story`}
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.75 : 1 }]}
      >
        <View style={[styles.badge, { backgroundColor: t.indigo.soft }]}>
          <T v="bodyStrong" color={t.indigo.ink}>
            {ascent}
          </T>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <T v="bodyStrong">Ascent {ascent}</T>
          <T v="caption" color={c.textDim}>
            From {longDate(p.startedAt)} · {stats.done} of {PROGRAM_DAYS} days · {P.pilotXp(p)} XP
          </T>
          <T v="caption" color={c.textFaint} numberOfLines={1}>
            {p.habits.map((id) => P.nameOf(p, id)).join(' · ')}
          </T>
        </View>
        <Ionicons name="image-outline" size={18} color={c.textDim} />
      </Pressable>
      <Pressable onPress={remove} accessibilityRole="button" hitSlop={8} style={styles.remove}>
        <T v="caption" color={c.textFaint}>
          Remove
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
