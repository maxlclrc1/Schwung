import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { EXPORT_CONTAINS } from '../core/dataExport';
import { removeAllTemps } from '../lib/appFiles';
import { PRIVACY_URL } from '../lib/constants';
import { exportMyData } from '../lib/exportData';
import { haptic } from '../lib/haptics';
import { legalVisible } from '../lib/legal';
import { cancelAllReminders } from '../lib/reminders';
import { deleteAllLocalData } from '../store/deleteData';
import { space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { Row } from './settingsRows';
import { SheetHeader } from './SheetHeader';
import { Button, Screen, T } from './ui';
import { formatList } from '../i18n';
import { useT } from '../i18n/react';
import { pushOnce } from '../lib/navigation';

const sys = ReduceMotion.System;

/**
 * Settings → Privacy & Data: what Schwung keeps (all of it on this phone), a full export of it, and deleting all of
 * it. Each step says plainly what it does before it does it.
 */
export function PrivacyData() {
  const { c } = useTheme();
  const t = useT();
  const [step, setStep] = useState<'list' | 'export' | 'delete'>('list');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const exportData = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      await exportMyData();
      setStep('list');
    } catch {
      setNote(t('settings.privacy.exportFailed'));
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
    if (!result.ok && result.failed.includes('data')) {
      haptic.warning();
      setNote(t('settings.privacy.deleteFailed'));
      return;
    }
    haptic.confirm();
    if (!result.ok) {
      // The data itself is gone; say honestly what's still pending.
      const what = result.failed.map((f) =>
        t(f === 'reminders' ? 'settings.privacy.failedReminders' : 'settings.privacy.failedTemp'),
      );
      setNote(t('settings.privacy.deletePartial', { list: formatList(what) }));
      return;
    }
    if (router.canDismiss()) router.dismissAll();
    router.replace('/welcome');
  };

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={t('settings.privacy.title')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <T style={styles.intro}>{t('settings.privacy.intro')}</T>

        {step === 'list' ? (
          <Animated.View entering={FadeIn.duration(180).reduceMotion(sys)} style={{ gap: space.lg }}>
            <ThemedView style={[styles.group, { borderColor: c.border }]}>
              <Row
                icon="download-outline"
                label={t('settings.privacy.export')}
                hint={t('settings.privacy.exportHint')}
                onPress={() => setStep('export')}
              />
              <Row
                icon="cloud-download-outline"
                label={t('settings.privacy.restore')}
                hint={t('settings.privacy.restoreHint')}
                onPress={() => pushOnce('/restore')}
              />
              {/* Hidden from App Store builds while the address is still a placeholder (lib/legal.ts). */}
              {legalVisible.privacyPolicy() ? (
                <Row
                  icon="open-outline"
                  label={t('settings.privacy.policy')}
                  onPress={() => void Linking.openURL(PRIVACY_URL)}
                />
              ) : null}
            </ThemedView>
            {/* Apart from the everyday actions. */}
            <ThemedView style={[styles.group, styles.apart, { borderColor: c.border }]}>
              <Row
                icon="trash-outline"
                label={t('settings.privacy.delete')}
                hint={t('settings.privacy.deleteHint')}
                destructive
                onPress={() => setStep('delete')}
              />
            </ThemedView>
            <T v="caption" color={c.textDim}>
              {t('settings.privacy.footnote')}
            </T>
          </Animated.View>
        ) : step === 'export' ? (
          <Animated.View entering={FadeIn.duration(180).reduceMotion(sys)} style={{ gap: space.md }}>
            <T v="heading" accessibilityRole="header">
              {t('settings.privacy.exportTitle')}
            </T>
            <T color={c.textDim}>{t('settings.privacy.exportIntro')}</T>
            <ThemedView style={[styles.list, { borderColor: c.border }]}>
              {EXPORT_CONTAINS.map((key) => (
                <View key={key} style={styles.bullet}>
                  <View style={[styles.dot, { backgroundColor: c.mist }]} />
                  <T style={{ flex: 1 }}>{t(`settings.privacy.contains.${key}`)}</T>
                </View>
              ))}
            </ThemedView>
            <T v="caption" color={c.textDim}>
              {t('settings.privacy.exportShare')}
            </T>
            <Button label={t('settings.privacy.export')} onPress={() => void exportData()} disabled={busy} />
            <Button label={t('common.cancel')} kind="ghost" onPress={() => setStep('list')} disabled={busy} />
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.duration(180).reduceMotion(sys)} style={{ gap: space.md }}>
            <T v="heading" accessibilityRole="header">
              {t('settings.privacy.deleteTitle')}
            </T>
            <T color={c.textDim}>{t('settings.privacy.deleteBody')}</T>
            <T v="bodyStrong" color={c.danger}>
              {t('settings.privacy.deleteWarning')}
            </T>
            <Button
              label={t('settings.privacy.delete')}
              kind="danger"
              onPress={() => void deleteData()}
              disabled={busy}
            />
            <Button label={t('common.cancel')} kind="ghost" onPress={() => setStep('list')} disabled={busy} />
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

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.lg + 4, paddingBottom: space.xxl, gap: space.xl },
  intro: { fontSize: 17, lineHeight: 25 },
  group: { borderTopWidth: StyleSheet.hairlineWidth },
  apart: { marginTop: space.md },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.md,
  },
  bullet: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingVertical: 4 },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 8 },
});
