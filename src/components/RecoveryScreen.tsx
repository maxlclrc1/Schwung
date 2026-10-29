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
        dialogTitle: 'Save your recovery data',
      });
      setNote('Your recovery data was shared. A copy also stays on this phone.');
    } catch {
      setNote('It couldn’t be exported just now. Nothing was lost: a copy stays safely on this phone.');
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (!(await ensureKept())) {
      setNote('A safe copy couldn’t be made yet, so nothing has been changed. Please try again.');
      return;
    }
    if (restoreFromRecovery()) haptic.confirm();
  };

  const startOver = () =>
    Alert.alert(
      'Start a new Life Reset?',
      'The saved one stays on this phone as recovery data (you can export it any time), but the app will start fresh.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start over',
          style: 'destructive',
          onPress: () =>
            void ensureKept().then((kept) => {
              if (!kept || !startOverFromRecovery())
                setNote('A safe copy couldn’t be made yet, so nothing has been changed. Please try again.');
            }),
        },
      ],
    );

  const title =
    rec.reason === 'newer'
      ? 'This Life Reset needs a newer Schwung'
      : rec.reason === 'partial'
        ? 'Some of your Life Reset couldn’t be read'
        : 'Your saved Life Reset couldn’t be opened';
  const body =
    rec.reason === 'newer'
      ? 'It was saved by a newer version of the app. Update Schwung from the App Store to open it. It’s kept safely on this phone until then.'
      : rec.reason === 'partial'
        ? 'Most of it is fine. You can carry on with everything that was recovered; the original is kept safely on this phone.'
        : 'Something in the saved file was damaged. It’s kept exactly as it was, safely on this phone, so nothing has been deleted.';

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
              Recovered
            </T>
            <T>
              Your Life Reset from Day 1{day ? ` (today is Day ${day})` : ''}, {p.habits.length} habit
              {p.habits.length === 1 ? '' : 's'} and {doneDays} day{doneDays === 1 ? '' : 's'} of completed habits.
            </T>
          </ThemedView>
        ) : null}
        {rec.lost.length && rec.reason !== 'newer' ? (
          <ThemedView style={[styles.panel, { backgroundColor: c.surface }]}>
            <T v="overline" color={c.peachInk}>
              Couldn’t be read
            </T>
            {rec.lost.map((l) => (
              <T key={l} color={c.textDim}>
                · {l}
              </T>
            ))}
            <T v="caption" color={c.textFaint}>
              These stay in the recovery data, so nothing is thrown away.
            </T>
          </ThemedView>
        ) : null}

        <View style={styles.actions}>
          {p ? <Button label="Restore available progress" onPress={() => void restore()} disabled={busy} /> : null}
          <Button
            label="Export recovery data"
            kind="secondary"
            onPress={() => void exportRaw()}
            disabled={busy || !rec.raw}
          />
          <Button label="Start over" kind="ghost" onPress={startOver} disabled={busy} />
        </View>
        {note ? (
          <T v="caption" color={c.textDim} style={styles.center} accessibilityLiveRegion="polite">
            {note}
          </T>
        ) : (
          <T v="caption" color={c.textFaint} style={styles.center}>
            {rec.keptAt ? 'A safe copy is kept on this phone.' : 'Keeping a safe copy…'}
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
