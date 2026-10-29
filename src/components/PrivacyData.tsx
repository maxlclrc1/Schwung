import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildExport, EXPORT_CONTAINS } from '../core/dataExport';
import { PRIVACY_URL } from '../lib/constants';
import { haptic } from '../lib/haptics';
import { removeAllTemps, shareTemp, writeTemp } from '../lib/appFiles';
import { cancelAllReminders } from '../lib/reminders';
import { deleteAllLocalData } from '../store/deleteData';
import { usePreferences } from '../store/preferences';
import { RECOVERY_SLOTS, recoveryKey } from '../store/recovery';
import { pilotToday, resetPilotKey, useResetPilot } from '../store/resetPilot';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { SheetHeader } from './SheetHeader';
import { Button, Screen, T } from './ui';

type Icon = ComponentProps<typeof Ionicons>['name'];
const sys = ReduceMotion.System;

/**
 * Settings → Privacy & Data: what Schwung keeps (all of it on this phone), a full export of it, and deleting all of
 * it. Each step says plainly what it does before it does it.
 */
export function PrivacyData() {
  const { c } = useTheme();
  const [step, setStep] = useState<'list' | 'export' | 'delete'>('list');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const exportData = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const { program, devDayOffset } = useResetPilot.getState();
      const prefs = usePreferences.getState();
      const name = resetPilotKey();
      const copies: string[] = [];
      for (let slot = 1; slot <= RECOVERY_SLOTS; slot++) {
        const raw = await AsyncStorage.getItem(recoveryKey(name, slot));
        if (raw !== null) copies.push(raw);
      }
      const data = buildExport({
        program,
        today: program ? pilotToday({ program, devDayOffset }) : 0,
        themePreference: prefs.themePreference,
        reminders: prefs.reminders,
        comebacks: prefs.comebacks,
        recoveryCopies: copies,
        now: new Date(),
      });
      const file = await writeTemp('data', 'json', JSON.stringify(data, null, 2));
      await shareTemp(file, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Export my data' });
      setStep('list');
    } catch {
      setNote('Your data couldn’t be exported just now. Nothing was changed; please try again.');
    } finally {
      setBusy(false);
    }
  };

  const deleteData = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    const result = await deleteAllLocalData({ cancelReminders: cancelAllReminders, removeTempFiles: removeAllTemps });
    setBusy(false);
    if (!result.ok && result.failed.includes('Your saved progress and settings')) {
      haptic.warning();
      setNote('Your data couldn’t be deleted just now. Nothing was removed; please try again.');
      return;
    }
    haptic.confirm();
    if (!result.ok) {
      // The data itself is gone; say honestly what's still pending.
      setNote(`Your data was deleted, but these couldn’t be removed yet: ${result.failed.join(', ')}.`);
      return;
    }
    if (router.canDismiss()) router.dismissAll();
    router.replace('/welcome');
  };

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Privacy & Data" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.intro}>
          <View style={[styles.icon, { backgroundColor: c.sageSoft }]}>
            <Ionicons name="lock-closed-outline" size={22} color={c.sageInk} />
          </View>
          <T color={c.textDim}>
            Your habits and progress are stored on your device. Schwung doesn’t require an account or upload your
            personal journey to a server.
          </T>
        </View>

        {step === 'list' ? (
          <Animated.View entering={FadeIn.duration(180).reduceMotion(sys)} style={{ gap: space.lg }}>
            <ThemedView style={[styles.panel, { backgroundColor: c.surface }]}>
              <Row
                icon="download-outline"
                label="Export my data"
                hint="A copy of everything, as a file you choose where to send"
                onPress={() => setStep('export')}
              />
              <ThemedView style={[styles.rule, { backgroundColor: c.border }]} />
              <Row
                icon="trash-outline"
                label="Delete my data"
                hint="Remove everything Schwung keeps on this phone"
                danger
                onPress={() => setStep('delete')}
              />
              <ThemedView style={[styles.rule, { backgroundColor: c.border }]} />
              <Row icon="open-outline" label="Privacy Policy" onPress={() => void Linking.openURL(PRIVACY_URL)} />
            </ThemedView>
            <T v="caption" color={c.textFaint}>
              Ending the Life Reset (in Settings) ends your current program. Delete my data removes all your personal
              data from Schwung on this phone, including earlier saves and recovery copies.
            </T>
          </Animated.View>
        ) : step === 'export' ? (
          <Animated.View entering={FadeIn.duration(180).reduceMotion(sys)} style={{ gap: space.md }}>
            <T v="heading" accessibilityRole="header">
              Export my data
            </T>
            <T color={c.textDim}>The file is made on this phone and may contain sensitive information:</T>
            <ThemedView style={[styles.panel, { backgroundColor: c.surface, paddingVertical: space.md }]}>
              {EXPORT_CONTAINS.map((line) => (
                <View key={line} style={styles.bullet}>
                  <View style={[styles.dot, { backgroundColor: c.mist }]} />
                  <T style={{ flex: 1 }}>{line}</T>
                </View>
              ))}
            </ThemedView>
            <T v="caption" color={c.textDim}>
              It’s a JSON file you can keep or send wherever you choose. Nothing is uploaded: only the place you pick in
              the share sheet receives it.
            </T>
            <Button label="Export my data" onPress={() => void exportData()} disabled={busy} />
            <Button label="Cancel" kind="ghost" onPress={() => setStep('list')} disabled={busy} />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(180).reduceMotion(sys)} style={{ gap: space.md }}>
            <T v="heading" accessibilityRole="header">
              Delete my data?
            </T>
            <T color={c.textDim}>
              This removes your Life Reset and its whole history, your own habits, set-up and health answers,
              reflections, Screen Time entries, XP and collection, earlier and recovery saves, reminders and temporary
              files. Images you saved to Photos stay in Photos.
            </T>
            <T v="bodyStrong" color={c.danger}>
              This can’t be undone. If you want a copy, export your data first.
            </T>
            <Button label="Delete my data" kind="danger" onPress={() => void deleteData()} disabled={busy} />
            <Button label="Cancel" kind="ghost" onPress={() => setStep('list')} disabled={busy} />
          </Animated.View>
        )}

        {note ? (
          <T v="caption" color={c.textDim} accessibilityLiveRegion="polite" style={{ textAlign: 'center' }}>
            {note}
          </T>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function Row({
  icon,
  label,
  hint,
  danger,
  onPress,
}: {
  icon: Icon;
  label: string;
  hint?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={() => {
        onPress();
        haptic.select();
      }}
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <Ionicons name={icon} size={20} color={danger ? c.danger : c.textDim} />
      <View style={{ flex: 1 }}>
        <T color={danger ? c.danger : c.text}>{label}</T>
        {hint ? (
          <T v="caption" color={c.textFaint}>
            {hint}
          </T>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={c.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  intro: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  panel: { borderRadius: radius.lg, paddingHorizontal: space.lg },
  rule: { height: StyleSheet.hairlineWidth },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 8 },
});
