import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { COLLECTIBLES, growth, type Collectible } from '../../core/reset/collection';
import * as P from '../../core/reset/pilot';
import { useResetPilot } from '../../store/resetPilot';
import { space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { Press } from '../onboarding/Choices';
import { rise } from '../onboarding/kit';
import { SheetHeader } from '../SheetHeader';
import { Screen, T } from '../ui';
import { CollectibleArt } from './Collectible';
import { useT } from '../../i18n/react';
import type { TKey } from '../../i18n';

const sys = ReduceMotion.System;

/** An object's place in the collection, as an accession number ("03 / 07"), kept left-to-right in every language. */
const accession = (i: number) =>
  `⁦${String(i + 1).padStart(2, '0')} / ${String(COLLECTIBLES.length).padStart(2, '0')}⁩`;

/**
 * Your collection (app/life-reset/collection.tsx, from the XP chip on Habits), as expedition keepsakes: the title XP
 * has earned on one slim line with the way to the next, then the object in view on the page itself (its painting,
 * number, name, mark and reflection, or what it needs), then all seven laid out in an open specimen tray: each
 * yours from its XP mark (kept for good) or a quiet silhouette with the XP it needs. Tap one to read it.
 */
export function CollectionScreen() {
  const { c } = useTheme();
  const t = useT();
  const { width, fontScale } = useWindowDimensions();
  const program = useResetPilot((s) => s.program);
  // Lifetime XP: earlier ascents' XP is carried in, never counted twice.
  const xp = program ? P.lifetimeXp(program) : 0;
  const owned = program?.collection?.unlocked ?? [];
  const g = growth(xp);
  const latest = [...COLLECTIBLES].reverse().find((o) => owned.includes(o.id));
  const [picked, setPicked] = useState<string | null>(latest?.id ?? COLLECTIBLES[0].id);
  const shown = COLLECTIBLES.find((o) => o.id === picked) ?? COLLECTIBLES[0];
  const shownAt = COLLECTIBLES.indexOf(shown);
  const shownOwned = owned.includes(shown.id);
  const art = Math.round(Math.min(168, width * 0.43));
  // Larger text: two columns, each object beside its words.
  const wide = fontScale > 1.2;
  const cols = wide ? 2 : 4;
  const rows: Collectible[][] = [];
  for (let i = 0; i < COLLECTIBLES.length; i += cols) rows.push(COLLECTIBLES.slice(i, i + cols));

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={t('collection.title')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* The title XP has earned, the lifetime XP, and the way to the next object as a thin rule. */}
        <Animated.View entering={rise(0)}>
          <View style={styles.rankLine}>
            <T style={[styles.rank, { color: c.text }]} accessibilityRole="header">
              {g.title}
            </T>
            <T color={c.peachInk} style={styles.xp}>
              {t('collection.xp', { xp })}
            </T>
          </View>
          <View
            style={styles.track}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(g.progress * 100) }}
          >
            <ThemedView style={[styles.trackLine, { backgroundColor: c.border }]} />
            <ThemedView style={[styles.trackFill, { width: `${g.progress * 100}%`, backgroundColor: c.peach }]} />
          </View>
          <T color={c.textDim} style={styles.next}>
            {g.next
              ? t('collection.toNext', { xp: g.next.xp - xp, name: g.next.name, title: g.next.title })
              : t('collection.complete')}
          </T>
        </Animated.View>

        {/* The one in view, on the page itself: its painting, number, name, mark and reflection (or what it needs). */}
        <Animated.View key={shown.id} entering={FadeIn.duration(220).reduceMotion(sys)} style={styles.plate}>
          <CollectibleArt id={shown.id} size={art} locked={!shownOwned} />
          <T color={c.textFaint} style={styles.accession}>
            {accession(shownAt)}
          </T>
          <T style={styles.name}>{shown.name}</T>
          <T color={shownOwned ? c.peachInk : c.textFaint} style={styles.mark}>
            {shownOwned
              ? t('collection.owned', { title: shown.title, xp: shown.xp })
              : t('collection.unlocksAt', { xp: shown.xp })}
          </T>
          <T color={shownOwned ? c.text : c.textDim} style={styles.reflection}>
            {shownOwned ? shown.reflection : t('collection.keepGoing')}
          </T>
        </Animated.View>

        {/* All seven, an open specimen tray: faint dividers between objects, no box around them. */}
        <View style={styles.tray}>
          {rows.map((row, r) => (
            <ThemedView
              key={r}
              style={[
                styles.trayRow,
                r < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border },
              ]}
            >
              {row.map((o, i) => {
                const mine = owned.includes(o.id);
                const at = r * cols + i;
                const on = picked === o.id;
                return (
                  <Animated.View
                    key={o.id}
                    entering={rise(80 + at * 50)}
                    style={[
                      { width: `${100 / cols}%` },
                      i > 0 && { borderStartWidth: StyleSheet.hairlineWidth, borderColor: c.border },
                    ]}
                  >
                    <Press
                      onPress={() => setPicked(o.id)}
                      accessibilityRole="button"
                      aria-selected={on}
                      accessibilityLabel={
                        mine
                          ? t('collection.tileOwnedA11y', { name: o.name, reflection: o.reflection })
                          : t('collection.tileLockedA11y', { name: o.name, xp: o.xp })
                      }
                    >
                      <View style={[styles.cell, wide && styles.cellWide]}>
                        <CollectibleArt id={o.id} size={wide ? 44 : 52} locked={!mine} />
                        <View style={[styles.cellWords, wide && styles.cellWordsWide]}>
                          <T color={c.textFaint} style={styles.cellNumber}>
                            {String(at + 1).padStart(2, '0')}
                          </T>
                          <T
                            color={mine ? c.text : c.textDim}
                            style={[styles.cellName, !mine && styles.cellNameLocked, wide && styles.cellNameWide]}
                          >
                            {t(`progress.collection.${o.id}.short` as TKey)}
                          </T>
                          {mine ? null : (
                            <T color={c.textFaint} style={styles.cellXp}>
                              {t('collection.xp', { xp: o.xp })}
                            </T>
                          )}
                        </View>
                        {on ? <ThemedView style={[styles.underline, { backgroundColor: c.peach }]} /> : null}
                      </View>
                    </Press>
                  </Animated.View>
                );
              })}
            </ThemedView>
          ))}
        </View>

        <T color={c.textFaint} style={styles.howXp}>
          {t('collection.howXp')}
        </T>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.lg + 4, paddingBottom: space.xxl },
  rankLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md },
  rank: { flexShrink: 1, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5 },
  xp: { fontSize: 15, lineHeight: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  track: { marginTop: space.sm + 2, height: 3, justifyContent: 'center' },
  trackLine: { position: 'absolute', left: 0, right: 0, height: StyleSheet.hairlineWidth },
  trackFill: { position: 'absolute', start: 0, height: 3, borderRadius: 2 },
  next: { marginTop: space.sm, fontSize: 13.5, lineHeight: 18 },
  plate: { marginTop: space.xl, alignItems: 'center' },
  accession: { marginTop: space.md, fontSize: 11.5, lineHeight: 15, letterSpacing: 2, fontWeight: '600' },
  name: { marginTop: 4, fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.3, textAlign: 'center' },
  mark: { marginTop: 3, fontSize: 13.5, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
  reflection: { marginTop: space.sm, fontSize: 15.5, lineHeight: 22, textAlign: 'center', maxWidth: 340 },
  tray: { marginTop: space.xl },
  trayRow: { flexDirection: 'row' },
  cell: {
    minHeight: 118,
    alignItems: 'center',
    gap: 3,
    paddingTop: space.sm + 2,
    paddingBottom: space.sm + 1,
    paddingHorizontal: 4,
  },
  cellWide: { minHeight: 72, flexDirection: 'row', gap: 10, paddingHorizontal: space.sm },
  cellWords: { alignItems: 'center', gap: 1 },
  cellWordsWide: { flex: 1, alignItems: 'flex-start' },
  cellNumber: {
    marginTop: 4,
    fontSize: 10.5,
    lineHeight: 14,
    letterSpacing: 1.4,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  cellName: { fontSize: 12.5, lineHeight: 16, fontWeight: '500', textAlign: 'center' },
  cellNameLocked: { fontWeight: '400' },
  cellNameWide: { textAlign: 'auto' },
  cellXp: { fontSize: 11, lineHeight: 14, fontVariant: ['tabular-nums'] },
  underline: { position: 'absolute', bottom: 0, left: '28%', right: '28%', height: 2, borderRadius: 1 },
  howXp: { marginTop: space.lg, fontSize: 12.5, lineHeight: 17, textAlign: 'center' },
});
