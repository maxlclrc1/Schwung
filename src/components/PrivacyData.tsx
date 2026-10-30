import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import { EXPORT_CONTAINS } from '../core/dataExport';
import { removeAllTemps } from '../lib/appFiles';
import { PRIVACY_URL } from '../lib/constants';
import { exportMyData } from '../lib/exportData';
import { haptic } from '../lib/haptics';
import { legalVisible } from '../lib/legal';
import { cancelAllReminders } from '../lib/reminders';
import { deleteAllLocalData } from '../store/deleteData';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { SheetHeader } from './SheetHeader';
import { Button, Screen, T } from './ui';
import { formatList } from '../i18n';
import { useT } from '../i18n/react';

type Icon = ComponentProps<typeof Ionicons>['name'];
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
        <View style={styles.intro}>
          <View style={[styles.icon, { backgroundColor: c.sageSoft }]}>
            <Ionicons name="lock-closed-outline" size={22} color={c.sageInk} />
          </View>
          <T color={c.textDim}>{t('settings.privacy.intro')}</T>
        </View>

        {step === 'list' ? (
          <Animated.View entering={FadeIn.duration(180).reduceMotion(sys)} style={{ gap: space.lg }}>
            <ThemedView style={[styles.panel, { backgroundColor: c.surface }]}>
              <Row
                icon="download-outline"
                label={t('settings.privacy.export')}
                hint={t('settings.privacy.exportHint')}
                onPress={() => setStep('export')}
              />
              <ThemedView style={[styles.rule, { backgroundColor: c.border }]} />
              <Row
                icon="cloud-download-outline"
                label={t('settings.privacy.restore')}
                hint={t('settings.privacy.restoreHint')}
                onPress={() => router.push('/restore')}
              />
              <ThemedView style={[styles.rule, { backgroundColor: c.border }]} />
              <Row
                icon="trash-outline"
                label={t('settings.privacy.delete')}
                hint={t('settings.privacy.deleteHint')}
                danger
                onPress={() => setStep('delete')}
              />
              {/* Hidden from App Store builds while the address is still a placeholder (lib/legal.ts). */}
              {legalVisible.privacyPolicy() ? (
                <>
                  <ThemedView style={[styles.rule, { backgroundColor: c.border }]} />
                  <Row
                    icon="open-outline"
                    label={t('settings.privacy.policy')}
                    onPress={() => void Linking.openURL(PRIVACY_URL)}
                  />
                </>
              ) : null}
            </ThemedView>
            <T v="caption" color={c.textFaint}>
              {t('settings.privacy.footnote')}
            </T>
          </Animated.View>
        ) : step === 'export' ? (
          <Animated.View entering={FadeIn.duration(180).reduceMotion(sys)} style={{ gap: space.md }}>
            <T v="heading" accessibilityRole="header">
              {t('settings.privacy.exportTitle')}
            </T>
            <T color={c.textDim}>{t('settings.privacy.exportIntro')}</T>
            <ThemedView style={[styles.panel, { backgroundColor: c.surface, paddingVertical: space.md }]}>
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
