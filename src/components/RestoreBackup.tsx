import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, type ComponentProps } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import {
  MAX_BACKUP_BYTES,
  readBackup,
  summarizeBackup,
  type Backup,
  type BackupProblem,
  type BackupSummary,
} from '../core/dataImport';
import { PROGRAM_DAYS, toDateKey } from '../core/dates';
import { pickBackupFile } from '../lib/appFiles';
import { exportMyData } from '../lib/exportData';
import { haptic } from '../lib/haptics';
import { askForReminders } from '../lib/reminders';
import { usePreferences } from '../store/preferences';
import { migrateSave, pilotNow, RESET_PILOT_VERSION, useResetPilot } from '../store/resetPilot';
import { useJourneys } from '../store/journeys';
import { restoreBackup } from '../store/restore';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { SheetHeader } from './SheetHeader';
import { Button, Screen, T } from './ui';
import { formatDate, t } from '../i18n';
import { useT } from '../i18n/react';

type Icon = ComponentProps<typeof Ionicons>['name'];
const sys = ReduceMotion.System;

const problemText = (p: BackupProblem) => t(`settings.restore.problem.${p}`);
const longDate = (key: string) => formatDate(key, 'long');

/**
 * Restore from backup (Settings → Privacy & Data, or the start screen): choose a file made with Export my data,
 * see what's in it, and only then restore it. Nothing changes before the last button; a current Life Reset is
 * replaced only after a clear warning (store/restore.ts keeps it safe until the new one is saved).
 */
export function RestoreBackup() {
  const { c } = useTheme();
  const t = useT();
  const current = useResetPilot((s) => s.program);
  const hasPast = useJourneys((s) => s.journeys.length > 0);
  const [backup, setBackup] = useState<Backup | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const todayKey = toDateKey(pilotNow());

  const choose = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const picked = await pickBackupFile(MAX_BACKUP_BYTES);
      if (picked.canceled) return;
      const read = readBackup(picked.text, { version: RESET_PILOT_VERSION, migrate: migrateSave }, picked.bytes);
      if (!read.ok) {
        haptic.warning();
        setNote(problemText(read.problem));
        return;
      }
      setBackup(read.backup);
    } catch {
      setNote(t('settings.restore.openFailed'));
    } finally {
      setBusy(false);
    }
  };

  const exportCurrent = async () => {
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      await exportMyData();
    } catch {
      setNote(t('settings.restore.exportFailed'));
    } finally {
      setBusy(false);
    }
  };

  const restore = async () => {
    if (busy || !backup) return;
    setBusy(true);
    setNote(null);
    const result = await restoreBackup(backup);
    setBusy(false);
    if (!result.ok) {
      haptic.warning();
      setNote(result.reason === 'safetyCopy' ? t('settings.restore.safetyFailed') : t('settings.restore.saveFailed'));
      return;
    }
    haptic.confirm();
    // Reminders follow the restored setting; iOS is asked only if it hasn't been yet (ReminderSync schedules them).
    if (usePreferences.getState().reminders.enabled) void askForReminders();
    if (router.canDismiss()) router.dismissAll();
    router.replace('/today');
  };

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={t('settings.restore.title')} action={backup ? t('common.cancel') : t('nav.done')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {!backup ? (
          <Animated.View entering={FadeIn.duration(180).reduceMotion(sys)} style={{ gap: space.lg }}>
            <View style={styles.intro}>
              <View style={[styles.icon, { backgroundColor: c.accentSoft }]}>
                <Ionicons name="cloud-download-outline" size={22} color={c.accentInk} />
              </View>
              <T color={c.textDim} style={{ flex: 1 }}>
                {t('settings.restore.intro')}
              </T>
            </View>
            <Button
              label={busy ? t('settings.restore.opening') : t('settings.restore.choose')}
              onPress={() => void choose()}
              disabled={busy}
            />
            <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
              {t('settings.restore.safe')}
            </T>
          </Animated.View>
        ) : (
          <Preview
            summary={summarizeBackup(backup.program, todayKey)}
            pastJourneys={backup.journeys.length}
            hasPast={hasPast}
            exportedAt={backup.exportedAt}
            current={current ? summarizeBackup(current, todayKey) : null}
            busy={busy}
            onRestore={() => void restore()}
            onExportCurrent={() => void exportCurrent()}
            onOther={() => {
              setBackup(null);
              setNote(null);
            }}
          />
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

function Preview({
  summary: s,
  pastJourneys,
  hasPast,
  exportedAt,
  current,
  busy,
  onRestore,
  onExportCurrent,
  onOther,
}: {
  summary: BackupSummary;
  pastJourneys: number;
  hasPast: boolean;
  exportedAt: string | null;
  current: BackupSummary | null;
  busy: boolean;
  onRestore: () => void;
  onExportCurrent: () => void;
  onOther: () => void;
}) {
  const { c } = useTheme();
  const t = useT();
  const made = exportedAt ? longDate(exportedAt.slice(0, 10)) : null;
  return (
    <Animated.View entering={FadeIn.duration(180).reduceMotion(sys)} style={{ gap: space.lg }}>
      <ThemedView style={[styles.panel, { backgroundColor: c.surface }]}>
        <T v="overline" color={c.indigoInk}>
          {t('settings.restore.inBackup')}
        </T>
        <T v="display" accessibilityRole="header">
          {s.summit
            ? t('settings.restore.summit')
            : s.momentum
              ? t('settings.restore.momentumDay', { day: s.day })
              : t('settings.restore.day', { day: s.day, total: PROGRAM_DAYS })}
        </T>
        <View style={styles.stats}>
          <Stat icon="leaf-outline" value={s.habits} label={t('settings.restore.habits', { count: s.habits })} />
          <Stat
            icon="checkmark-done-outline"
            value={s.daysDone}
            label={t('settings.restore.daysDone', { count: s.daysDone })}
          />
          <Stat icon="diamond-outline" value={s.xp} label={t('settings.restore.xp')} />
          <Stat icon="sparkles-outline" value={s.collectibles} label={t('settings.restore.collected')} />
        </View>
        <T v="caption" color={c.textDim}>
          {t('settings.restore.started', { date: longDate(s.startedAt) })}
          {made ? t('settings.restore.made', { date: made }) : ''}
          {s.reflections ? t('settings.restore.reflections', { count: s.reflections }) : ''}
          {pastJourneys ? t('settings.restore.journeys', { count: pastJourneys }) : ''}
        </T>
      </ThemedView>

      {current || hasPast ? (
        <ThemedView style={[styles.panel, { backgroundColor: c.peachSoft }]}>
          <View style={styles.warnHead}>
            <Ionicons name="alert-circle-outline" size={20} color={c.peachInk} />
            <T v="bodyStrong" color={c.peachInk} style={{ flex: 1 }}>
              {current ? t('settings.restore.replacesCurrent') : t('settings.restore.replacesPast')}
            </T>
          </View>
          <T color={c.peachInk}>
            {current
              ? t(current.summit ? 'settings.restore.currentSummit' : 'settings.restore.currentDay', {
                  day: current.day,
                  habits: t('common.habits', { count: current.habits }),
                  xp: current.xp,
                })
              : ''}
            {current ? t('settings.restore.replacesIt') : t('settings.restore.replacesThem')}
            {current && hasPast ? t('settings.restore.pastIncluded') : ''}
            {t('settings.restore.neverMixed')}
          </T>
          <Button
            label={t('settings.restore.exportFirst')}
            kind="secondary"
            onPress={onExportCurrent}
            disabled={busy}
          />
        </ThemedView>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Button
          label={current || hasPast ? t('settings.restore.replace') : t('settings.restore.restore')}
          kind={current || hasPast ? 'danger' : 'primary'}
          onPress={onRestore}
          disabled={busy}
        />
        <Button label={t('settings.restore.different')} kind="ghost" onPress={onOther} disabled={busy} />
      </View>
    </Animated.View>
  );
}

function Stat({ icon, value, label }: { icon: Icon; value: number; label: string }) {
  const { c } = useTheme();
  const t = useT();
  return (
    <View style={styles.stat} accessible accessibilityLabel={t('settings.restore.statA11y', { value, label })}>
      <Ionicons name={icon} size={16} color={c.textDim} />
      <T v="heading">{value}</T>
      <T v="caption" color={c.textDim} numberOfLines={2}>
        {label}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  intro: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  panel: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  stats: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  stat: { flex: 1, alignItems: 'flex-start', gap: 2 },
  warnHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
