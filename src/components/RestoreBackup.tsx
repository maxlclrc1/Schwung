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

type Icon = ComponentProps<typeof Ionicons>['name'];
const sys = ReduceMotion.System;

const PROBLEM: Record<BackupProblem, string> = {
  tooLarge: 'This file is too large to be a Schwung backup.',
  notBackup: 'This isn’t a Schwung backup. Choose the file you made with Export my data.',
  newerVersion: 'This backup was made by a newer version of Schwung. Update Schwung, then try again.',
  unsupportedVersion: 'This backup’s format can’t be read by this version of Schwung.',
  noLifeReset: 'This backup doesn’t contain a Life Reset.',
  damaged: 'This backup is damaged or incomplete, so it can’t be restored.',
};

const longDate = (key: string) =>
  new Date(`${key}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Restore from backup (Settings → Privacy & Data, or the start screen): choose a file made with Export my data,
 * see what's in it, and only then restore it. Nothing changes before the last button; a current Life Reset is
 * replaced only after a clear warning (store/restore.ts keeps it safe until the new one is saved).
 */
export function RestoreBackup() {
  const { c } = useTheme();
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
        setNote(PROBLEM[read.problem]);
        return;
      }
      setBackup(read.backup);
    } catch {
      setNote('That file couldn’t be opened. Nothing was changed; please try again.');
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
      setNote('Your current Life Reset couldn’t be exported just now. Nothing was changed.');
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
      setNote(
        result.reason === 'safetyCopy'
          ? 'Your current Life Reset couldn’t be kept safe first, so nothing was replaced. Export it, then try again.'
          : 'The backup couldn’t be saved just now. Nothing was changed; please try again.',
      );
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
      <SheetHeader title="Restore from backup" action={backup ? 'Cancel' : 'Done'} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {!backup ? (
          <Animated.View entering={FadeIn.duration(180).reduceMotion(sys)} style={{ gap: space.lg }}>
            <View style={styles.intro}>
              <View style={[styles.icon, { backgroundColor: c.accentSoft }]}>
                <Ionicons name="cloud-download-outline" size={22} color={c.accentInk} />
              </View>
              <T color={c.textDim} style={{ flex: 1 }}>
                Bring your Life Reset to this phone. Choose the file you made with Export my data, from Files, iCloud
                Drive or wherever you kept it.
              </T>
            </View>
            <Button label={busy ? 'Opening…' : 'Choose backup file'} onPress={() => void choose()} disabled={busy} />
            <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
              You’ll see what’s in it first. Nothing changes until you confirm.
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
  const made = exportedAt ? longDate(exportedAt.slice(0, 10)) : null;
  return (
    <Animated.View entering={FadeIn.duration(180).reduceMotion(sys)} style={{ gap: space.lg }}>
      <ThemedView style={[styles.panel, { backgroundColor: c.surface }]}>
        <T v="overline" color={c.indigoInk}>
          Life Reset in this backup
        </T>
        <T v="display" accessibilityRole="header">
          {s.summit ? 'Summit reached' : s.momentum ? `Day ${s.day} · Momentum` : `Day ${s.day} of ${PROGRAM_DAYS}`}
        </T>
        <View style={styles.stats}>
          <Stat icon="leaf-outline" value={s.habits} label={s.habits === 1 ? 'habit' : 'habits'} />
          <Stat icon="checkmark-done-outline" value={s.daysDone} label={s.daysDone === 1 ? 'day done' : 'days done'} />
          <Stat icon="diamond-outline" value={s.xp} label="XP" />
          <Stat icon="sparkles-outline" value={s.collectibles} label="collected" />
        </View>
        <T v="caption" color={c.textDim}>
          Started {longDate(s.startedAt)}
          {made ? ` · Backup made ${made}` : ''}
          {s.reflections ? ` · ${s.reflections} weekly ${s.reflections === 1 ? 'reflection' : 'reflections'}` : ''}
          {pastJourneys ? ` · ${pastJourneys} past ${pastJourneys === 1 ? 'journey' : 'journeys'}` : ''}
        </T>
      </ThemedView>

      {current || hasPast ? (
        <ThemedView style={[styles.panel, { backgroundColor: c.peachSoft }]}>
          <View style={styles.warnHead}>
            <Ionicons name="alert-circle-outline" size={20} color={c.peachInk} />
            <T v="bodyStrong" color={c.peachInk} style={{ flex: 1 }}>
              {current ? 'This replaces your current Life Reset' : 'This replaces your past journeys'}
            </T>
          </View>
          <T color={c.peachInk}>
            {current
              ? `On this phone you’re on ${current.summit ? 'the summit' : `day ${current.day}`} with ${current.habits} ${current.habits === 1 ? 'habit' : 'habits'} and ${current.xp} XP. `
              : ''}
            Restoring replaces {current ? 'it' : 'them'} with the backup
            {current && hasPast ? ', past journeys included' : ''}; the two are never mixed. Export first if you’d like
            a copy.
          </T>
          <Button label="Export current first" kind="secondary" onPress={onExportCurrent} disabled={busy} />
        </ThemedView>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Button
          label={current || hasPast ? 'Replace with this backup' : 'Restore this Life Reset'}
          kind={current || hasPast ? 'danger' : 'primary'}
          onPress={onRestore}
          disabled={busy}
        />
        <Button label="Choose a different file" kind="ghost" onPress={onOther} disabled={busy} />
      </View>
    </Animated.View>
  );
}

function Stat({ icon, value, label }: { icon: Icon; value: number; label: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.stat} accessible accessibilityLabel={`${value} ${label}`}>
      <Ionicons name={icon} size={16} color={c.textDim} />
      <T v="heading">{value}</T>
      <T v="caption" color={c.textDim}>
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
