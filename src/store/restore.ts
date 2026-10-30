import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Backup } from '../core/dataImport';
import { PREFERENCES_KEY, PREFERENCES_VERSION, usePreferences, type Preferences } from './preferences';
import { keepRaw, useRecovery } from './recovery';
import { RESET_PILOT_VERSION, resetPilotKey, useResetPilot } from './resetPilot';
import { commitTogether, persisted } from './commit';
import { JOURNEYS_VERSION, journeysKey, useJourneys } from './journeys';
import { flushStorage } from './storage';

/*
 * Commits a validated backup (core/dataImport.ts) as this phone's Life Reset, only after the person confirmed.
 * Nothing changes until the new saves are on disk, all together:
 *   1. everything pending is written, so the current state on disk is complete;
 *   2. a current Life Reset (and past journeys) being replaced are copied into recovery slots first
 *      (store/recovery.ts), kept until "Delete my data", so a replace can never be the end of them; if no copy can
 *      be made, nothing is restored;
 *   3. the restored program, past journeys and preferences are written in one write and read back
 *      (store/commit.ts);
 *   4. only then does the app switch to them.
 * A failure at any step leaves the current Life Reset as it was, in memory and on disk. If the app is closed
 * during the restore, it opens either on the current Life Reset or on the restored one, never on a mix.
 */

export type RestoreResult = { ok: true } | { ok: false; reason: 'recoveryPending' | 'safetyCopy' | 'storage' };

export async function restoreBackup(backup: Backup): Promise<RestoreResult> {
  // A save that couldn't be read is still waiting for the person's decision: nothing may replace it.
  if (useRecovery.getState().pending || useJourneys.getState().held) return { ok: false, reason: 'recoveryPending' };
  const name = resetPilotKey();

  try {
    await flushStorage();
  } catch {
    return { ok: false, reason: 'storage' };
  }

  if (useResetPilot.getState().program) {
    let raw: string | null;
    try {
      raw = await AsyncStorage.getItem(name);
    } catch {
      return { ok: false, reason: 'storage' };
    }
    if (raw !== null && !(await keepRaw(name, raw))) return { ok: false, reason: 'safetyCopy' };
  }
  // Past journeys being replaced are kept the same way.
  if (useJourneys.getState().journeys.length) {
    let raw: string | null;
    try {
      raw = await AsyncStorage.getItem(journeysKey());
    } catch {
      return { ok: false, reason: 'storage' };
    }
    if (raw !== null && !(await keepRaw(journeysKey(), raw))) return { ok: false, reason: 'safetyCopy' };
  }

  const p = usePreferences.getState();
  const prefs: Preferences = {
    themePreference: backup.preferences.themePreference ?? p.themePreference,
    reminders: backup.preferences.reminders ?? p.reminders,
    comebacks: backup.preferences.comebacks ?? p.comebacks,
  };
  const ok = await commitTogether(
    [
      [name, persisted({ program: backup.program, devDayOffset: 0 }, RESET_PILOT_VERSION)],
      [PREFERENCES_KEY, persisted(prefs, PREFERENCES_VERSION)],
      [journeysKey(), persisted({ journeys: backup.journeys }, JOURNEYS_VERSION)],
    ],
    () => {
      useResetPilot.setState({});
      usePreferences.setState({});
      useJourneys.setState({});
    },
  );
  if (!ok) return { ok: false, reason: 'storage' };

  useResetPilot.setState({ program: backup.program, devDayOffset: 0 });
  usePreferences.setState(prefs);
  useJourneys.setState({ journeys: backup.journeys });
  return { ok: true };
}
