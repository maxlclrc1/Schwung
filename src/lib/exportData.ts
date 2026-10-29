import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildExport } from '../core/dataExport';
import { usePreferences } from '../store/preferences';
import { RECOVERY_SLOTS, recoveryKey } from '../store/recovery';
import { pilotToday, RESET_PILOT_VERSION, resetPilotKey, useResetPilot } from '../store/resetPilot';
import { shareTemp, writeTemp } from './appFiles';

/**
 * "Export my data": builds the export (core/dataExport.ts) from what's on the phone now and opens the share sheet
 * with it as a temporary JSON file. Throws if it couldn't be made; nothing is changed either way.
 */
export async function exportMyData(): Promise<void> {
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
    saveVersion: RESET_PILOT_VERSION,
    today: program ? pilotToday({ program, devDayOffset }) : 0,
    themePreference: prefs.themePreference,
    reminders: prefs.reminders,
    comebacks: prefs.comebacks,
    recoveryCopies: copies,
    now: new Date(),
  });
  const file = await writeTemp('data', 'json', JSON.stringify(data, null, 2));
  await shareTemp(file, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: 'Export my data' });
}
