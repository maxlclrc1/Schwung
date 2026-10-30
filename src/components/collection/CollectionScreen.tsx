import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { COLLECTIBLES, growth } from '../../core/reset/collection';
import * as P from '../../core/reset/pilot';
import { useResetPilot } from '../../store/resetPilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Press } from '../onboarding/Choices';
import { rise } from '../onboarding/kit';
import { SheetHeader } from '../SheetHeader';
import { ProgressBar, Screen, T } from '../ui';
import { CollectibleArt } from './Collectible';

const sys = ReduceMotion.System;

/**
 * Your collection (app/life-reset/collection.tsx, from the XP chip on Habits): the title XP has earned and the way to
 * the next, then the seven alpine objects, each yours from its XP mark (kept for good) or a quiet silhouette with
 * the XP it needs. Tap one to read it.
 */
export function CollectionScreen() {
  const { c } = useTheme();
  const { width } = useWindowDimensions();
  const program = useResetPilot((s) => s.program);
  // Lifetime XP: earlier ascents' XP is carried in, never counted twice.
  const xp = program ? P.lifetimeXp(program) : 0;
  const owned = program?.collection?.unlocked ?? [];
  const g = growth(xp);
  const latest = [...COLLECTIBLES].reverse().find((o) => owned.includes(o.id));
  const [picked, setPicked] = useState<string | null>(latest?.id ?? COLLECTIBLES[0].id);
  const shown = COLLECTIBLES.find((o) => o.id === picked) ?? COLLECTIBLES[0];
  const shownOwned = owned.includes(shown.id);
  const tile = Math.floor((Math.min(width, 520) - space.xl * 2 - space.md * 2) / 3);

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Your collection" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Animated.View entering={rise(0)} style={styles.hero}>
          <T v="overline" color={c.peachInk}>
            {xp} XP
          </T>
          <T style={[styles.title, { color: c.text }]} accessibilityRole="header">
            {g.title}
          </T>
          <ProgressBar value={g.progress} height={6} color={c.peach} />
          <T v="caption" color={c.textDim}>
            {g.next
              ? `${g.next.xp - xp} XP to ${g.next.name} · ${g.next.title}`
              : 'Every object is yours. XP keeps counting every habit you do.'}
          </T>
        </Animated.View>

        {/* The one in view: its art, name and reflection (or what it needs). */}
        <Animated.View key={shown.id} entering={FadeIn.duration(220).reduceMotion(sys)}>
          <ThemedView style={[styles.detail, { backgroundColor: c.surface }]}>
            <CollectibleArt id={shown.id} size={120} locked={!shownOwned} />
            <View style={{ flex: 1, gap: 4 }}>
              <T v="bodyStrong">{shown.name}</T>
              <T v="caption" color={shownOwned ? c.peachInk : c.textFaint} style={{ fontWeight: '700' }}>
                {shownOwned ? `${shown.title} · ${shown.xp} XP` : `Unlocks at ${shown.xp} XP`}
              </T>
              <T v="caption" color={shownOwned ? c.text : c.textDim}>
                {shownOwned ? shown.reflection : 'Keep doing your habits: every one done brings it closer.'}
              </T>
            </View>
          </ThemedView>
        </Animated.View>

        <Animated.View layout={LinearTransition.duration(200).reduceMotion(sys)} style={styles.grid}>
          {COLLECTIBLES.map((o, i) => {
            const mine = owned.includes(o.id);
            return (
              <Animated.View key={o.id} entering={rise(80 + i * 50)}>
                <Press
                  onPress={() => setPicked(o.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: picked === o.id }}
                  accessibilityLabel={`${o.name}. ${mine ? `In your collection. ${o.reflection}` : `Unlocks at ${o.xp} XP`}`}
                >
                  <ThemedView
                    style={[
                      styles.tile,
                      {
                        width: tile,
                        backgroundColor: c.surface,
                        borderColor: picked === o.id ? c.peach : 'transparent',
                      },
                    ]}
                  >
                    <CollectibleArt id={o.id} size={tile * 0.58} locked={!mine} />
                    <T v="caption" numberOfLines={2} style={styles.tileName} color={mine ? c.text : c.textDim}>
                      {o.name.replace(/^The /, '')}
                    </T>
                    {mine ? (
                      <Ionicons name="checkmark-circle" size={14} color={c.sage} />
                    ) : (
                      <T v="caption" color={c.textFaint} style={styles.tileXp}>
                        {o.xp} XP
                      </T>
                    )}
                  </ThemedView>
                </Press>
              </Animated.View>
            );
          })}
        </Animated.View>

        <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
          XP comes from every habit you do (10 each, 20 more for a complete day). Objects stay yours, even after an
          undo.
        </T>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  hero: { gap: space.sm },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  tile: {
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.md,
    paddingHorizontal: space.xs,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    minHeight: 150,
  },
  tileName: { textAlign: 'center', fontWeight: '700' },
  tileXp: { fontSize: 11, fontVariant: ['tabular-nums'] },
});
