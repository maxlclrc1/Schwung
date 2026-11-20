import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ScrollView, StyleSheet } from 'react-native';
import { Row } from '../components/settingsRows';
import { SheetHeader } from '../components/SheetHeader';
import { Screen, T } from '../components/ui';
import { canTip, noteFor, type Tip, type TipPhase } from '../core/tips';
import { useT } from '../i18n/react';
import type { TKey } from '../i18n';
import { APP_NAME } from '../lib/constants';
import { haptic } from '../lib/haptics';
import { buyTip, loadTips, onTipOutcome } from '../lib/tips';
import { space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

/**
 * Settings → Support Schwung: three voluntary tips through Apple. A tip unlocks nothing and is never recorded; the
 * screen never asks twice and nothing else in the app ever asks at all. Prices come from the App Store.
 */
export default function Support() {
  const { c } = useTheme();
  const t = useT();
  const [tips, setTips] = useState<Tip[] | null>(null);
  const [phase, setPhase] = useState<TipPhase>('loading');
  // The tip this screen asked for: only its verdict is shown (others are finished quietly in lib/tips.ts).
  const asked = useRef<string | null>(null);

  const show = useCallback((loaded: Tip[] | null) => {
    setTips(loaded);
    setPhase(loaded ? 'ready' : 'unavailable');
  }, []);
  const retry = () => {
    setPhase('loading');
    void loadTips().then(show);
  };

  useEffect(() => {
    let live = true;
    void loadTips().then((loaded) => live && show(loaded));
    return () => {
      live = false;
    };
  }, [show]);

  useEffect(
    () =>
      onTipOutcome(({ productId, phase: next }) => {
        if (productId !== asked.current) return;
        if (next !== 'pending') asked.current = null;
        setPhase(next);
        if (next === 'thanks') haptic.success();
      }),
    [],
  );

  const tip = async (productId: string) => {
    if (!canTip(phase)) return;
    asked.current = productId;
    setPhase('buying');
    const answer = await buyTip(productId);
    // null: the App Store has it, and its verdict comes through onTipOutcome. Keep a verdict that already arrived.
    if (answer) {
      if (answer !== 'pending') asked.current = null;
      setPhase(answer);
    } else {
      // Normally the verdict follows at once; if none comes, the tips become choosable again (never a thank-you).
      setTimeout(() => setPhase((p) => (p === 'buying' ? 'ready' : p)), 20000);
    }
  };

  const note = noteFor(phase);
  const noteText = note ? t(`settings.tips.note.${note}` as TKey, { app: APP_NAME }) : null;
  useEffect(() => {
    if (noteText && phase !== 'loading') AccessibilityInfo.announceForAccessibility(noteText);
  }, [noteText, phase]);

  const enabled = canTip(phase);
  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={t('settings.tips.title', { app: APP_NAME })} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <T style={styles.intro}>{t('settings.tips.intro', { app: APP_NAME })}</T>

        {tips ? (
          <ThemedView style={[styles.group, { borderColor: c.border }]}>
            {tips.map((x) => (
              <Row
                key={x.size}
                icon="heart-outline"
                label={t(`settings.tips.${x.size}`)}
                value={x.price}
                chevron={false}
                onPress={enabled ? () => void tip(x.productId) : undefined}
              />
            ))}
          </ThemedView>
        ) : null}

        {noteText ? (
          <T color={phase === 'thanks' ? c.accentInk : c.textDim} accessibilityLiveRegion="polite">
            {noteText}
          </T>
        ) : null}

        {phase === 'unavailable' ? (
          <ThemedView style={[styles.group, { borderColor: c.border }]}>
            <Row icon="refresh-outline" label={t('settings.tips.retry')} onPress={retry} />
          </ThemedView>
        ) : null}

        <T v="caption" color={c.textDim}>
          {t('settings.tips.footnote', { app: APP_NAME })}
        </T>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.lg + 4, paddingBottom: space.xxl, gap: space.xl },
  intro: { fontSize: 17, lineHeight: 25 },
  group: { borderTopWidth: StyleSheet.hairlineWidth },
});
