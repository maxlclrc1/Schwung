import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_REMINDERS } from '../core/reminders';
import { useJourneys } from './journeys';
import { usePreferences } from './preferences';
import { endRecovery } from './recovery';
import { useResetPilot } from './resetPilot';
import { discardPending } from './storage';

/*
 * "Delete my data": removes everything personal Schwung keeps on the phone, and says exactly what it couldn't.
 *
 * Every Schwung save is under a `schwung-` key: the Life Reset (and its Expo Go variant), past journeys, their
 * recovery copies,
 * preferences (reminder time, welcome-back choice), and old saves from earlier versions (`schwung-state*`,
 * `schwung-fieldnotes*`). All of them go. The theme (light, dark or system) isn't personal and is kept. Pending
 * reminders and Schwung's temporary share files are removed through the functions passed in (native modules).
 * Nothing outside Schwung's own keys and folder is touched; images saved to Photos stay in Photos.
 *
 * If the stored data can't be removed, nothing else is changed and the failure is reported, so the app never
 * claims a deletion that didn't happen.
 */

export const PERSONAL_KEY_PREFIX = 'schwung-';

export type DeleteResult = { ok: boolean; failed: string[] };

export async function deleteAllLocalData(deps: {
  cancelReminders: () => Promise<void>;
  removeTempFiles: () => Promise<void> | void;
}): Promise<DeleteResult> {
  const failed: string[] = [];
  let keys: string[];
  try {
    keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PERSONAL_KEY_PREFIX));
    // Nothing waiting to be written may bring any of it back.
    discardPending(keys);
    await AsyncStorage.multiRemove(keys);
    const left = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(PERSONAL_KEY_PREFIX));
    if (left.length) return { ok: false, failed: ['Your saved progress and settings'] };
  } catch {
    return { ok: false, failed: ['Your saved progress and settings'] };
  }

  // What's in memory follows: no program, no recovery, default reminders (off). The theme stays.
  const theme = usePreferences.getState().themePreference;
  endRecovery();
  useResetPilot.setState({ program: null, devDayOffset: 0 });
  useJourneys.setState({ journeys: [], held: false });
  usePreferences.setState({ themePreference: theme, reminders: DEFAULT_REMINDERS, comebacks: true });

  try {
    await deps.cancelReminders();
  } catch {
    failed.push('Scheduled reminders');
  }
  try {
    await deps.removeTempFiles();
  } catch {
    failed.push('Temporary share files');
  }
  return { ok: failed.length === 0, failed };
}
