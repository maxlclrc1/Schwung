import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as P from '../../core/reset/pilot';
import { syncReminders } from '../../lib/reminders';
import { usePreferences } from '../../store/preferences';
import { pilotToday, useResetPilot } from '../../store/resetPilot';

/**
 * Keeps the phone's pending reminders matching the setting and the program: on start, whenever the app comes back
 * to the foreground (a new day, a new time zone, a permission changed in iOS Settings), and shortly after the
 * reminder setting or the program changes (today completed, the program ended). Renders nothing.
 */
export function ReminderSync() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      const { reminders } = usePreferences.getState();
      const { program } = useResetPilot.getState();
      const today = program ? pilotToday() : 0;
      void syncReminders(reminders, program, {
        todayComplete: !!program && today >= 1 && P.dayFull(program, today),
        habitNames: program ? program.habits.map((id) => P.nameOf(program, id)) : [],
      }).catch(() => {});
    };
    // Coalesces bursts (several check-offs in a row) into one sync.
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(sync, 800);
    };
    sync();
    const app = AppState.addEventListener('change', (s) => s === 'active' && sync());
    const prefs = usePreferences.subscribe((s, prev) => s.reminders !== prev.reminders && soon());
    const prog = useResetPilot.subscribe((s, prev) => s.program !== prev.program && soon());
    return () => {
      clearTimeout(timer);
      app.remove();
      prefs();
      prog();
    };
  }, []);
  return null;
}
