import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PROGRAM_DAYS, dayNumber, toDateKey } from '../core/dates';
import { shareTemp, writeTemp } from '../lib/appFiles';
import { haptic } from '../lib/haptics';
import { keepRaw, useRecovery } from '../store/recovery';
import { resetPilotKey, restoreFromRecovery, startOverFromRecovery } from '../store/resetPilot';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { Button, T } from './ui';
import { useT } from '../i18n/react';

/**
 * Shown over everything when a saved Life Reset couldn't be fully understood (store/recovery.ts). Calm and
 * plain: what was found, what couldn't be read, and three choices. Nothing is lost by waiting: the original is kept
 * on the phone, and the app saves nothing over it until a choice is made.
 */
export function RecoveryScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const rec = useRecovery();
  const [note, setNote] = useState<string | null>(null);
  const t = useT();
  const [busy, setBusy] = useState(false);
  if (!rec.pending) return null;

  const p = rec.recovered;
  const day = p ? Math.min(PROGRAM_DAYS, Math.max(1, dayNumber(p.startedAt, toDateKey(new Date())))) : null;
  const doneDays = p ? Object.values(p.logs).filter((l) => l.completed.length > 0).length : 0;

  /** Makes sure the copy is kept (tries again if keeping it failed earlier). */
  const ensureKept = async () => {
    if (useRecovery.getState().keptAt || !rec.raw) return !!useRecovery.getState().keptAt;
    const keptAt = await keepRaw(resetPilotKey(), rec.raw);
    useRecovery.setState({ keptAt });
    return !!keptAt;
  };

  const exportRaw = async () => {
    if (busy || !rec.raw) return;
    setBusy(true);
    try {
      const file = await writeTemp('recovery', 'txt', rec.raw);
      await shareTemp(file, {
        mimeType: 'text/plain',
        UTI: 'public.plain-text',
        dialogTitle: t('settings.recovery.dialog'),
      });
      setNote(t('settings.recovery.shared'));
    } catch {
      setNote(t('settings.recovery.exportFailed'));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!(await ensureKept())) {
      setNote(t('settings.recovery.notSafe'));
      return;
    }
    if (restoreFromRecovery()) haptic.confirm();
  };

  const startOver = () =>
    Alert.alert(t('settings.recovery.startOverTitle'), t('settings.recovery.startOverBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.recovery.startOver'),
        style: 'destructive',
        onPress: () =>
          void ensureKept().then((kept) => {
            if (!kept || !startOverFromRecovery()) setNote(t('settings.recovery.notSafe'));
          }),
      },
    ]);

  const which = rec.reason === 'newer' ? 'Newer' : rec.reason === 'partial' ? 'Partial' : 'Unreadable';
  const title = t(`settings.recovery.title${which}`);
  const body = t(`settings.recovery.body${which}`);

  return (
    <Animated.View
      entering={FadeIn.duration(250).reduceMotion(ReduceMotion.System)}
      style={[StyleSheet.absoluteFill, { backgroundColor: c.bg }]}
      accessibilityViewIsModal
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl },
        ]}
      >
        <View style={[styles.icon, { backgroundColor: c.mistSoft }]}>
          <Ionicons name="shield-checkmark-outline" size={26} color={c.mistInk} />
        </View>
        <T v="title" accessibilityRole="header">
          {title}
        </T>
        <T color={c.textDim}>{body}</T>

        {p ? (
          <ThemedView style={[styles.panel, { backgroundColor: c.surface }]}>
            <T v="overline" color={c.sageInk}>
              {t('settings.recovery.recovered')}
            </T>
            <T>
              {t('settings.recovery.summary', {
                today: day ? t('settings.recovery.todayIs', { day }) : '',
                habits: t('common.habits', { count: p.habits.length }),
                days: t('common.days', { count: doneDays }),
              })}
            </T>
          </ThemedView>
        ) : null}
        {rec.lost.length && rec.reason !== 'newer' ? (
          <ThemedView style={[styles.panel, { backgroundColor: c.surface }]}>
            <T v="overline" color={c.peachInk}>
              {t('settings.recovery.lost')}
            </T>
            {rec.lost.map((l) => (
              <T key={l} color={c.textDim}>
                · {l}
              </T>
            ))}
            <T v="caption" color={c.textFaint}>
              {t('settings.recovery.lostNote')}
            </T>
          </ThemedView>
        ) : null}

        <View style={styles.actions}>
          {p ? <Button label={t('settings.recovery.restore')} onPress={() => void restore()} disabled={busy} /> : null}
          <Button
            label={t('settings.recovery.export')}
            kind="secondary"
            onPress={() => void exportRaw()}
            disabled={busy || !rec.raw}
          />
          <Button label={t('settings.recovery.startOver')} kind="ghost" onPress={startOver} disabled={busy} />
        </View>
        {note ? (
          <T v="caption" color={c.textDim} style={styles.center} accessibilityLiveRegion="polite">
            {note}
          </T>
        ) : (
          <T v="caption" color={c.textFaint} style={styles.center}>
            {rec.keptAt ? t('settings.recovery.kept') : t('settings.recovery.keeping')}
          </T>
        )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, gap: space.lg, maxWidth: 560, width: '100%', alignSelf: 'center' },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  panel: { borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  actions: { gap: space.sm, marginTop: space.sm },
  center: { textAlign: 'center' },
});
