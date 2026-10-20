import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { dateForDay, parseTime, PROGRAM_DAYS } from '../core/dates';
import { isFullDay } from '../core/progression';
import { appNow, currentDay, useApp } from '../store/useApp';

// Well under iOS's 64 pending-notification cap; topped up every time the app opens.
const DAYS_AHEAD = 30;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return res.granted;
}

function message(day: number): { title: string; body: string } {
  if (day > PROGRAM_DAYS) return { title: 'Keep it going', body: 'Your habits are waiting. Two minutes to check in.' };
  if (day === PROGRAM_DAYS) return { title: 'Final day', body: 'Last day of the program. Finish strong.' };
  if (day === 1) return { title: 'Day 1', body: 'Your reset starts today. One small win at a time.' };
  if (day === 7) return { title: 'Day 7', body: 'One week in. Today makes it official.' };
  if (day === 22) return { title: 'Phase 2', body: 'Your habits leveled up. Day 22 is waiting.' };
  if (day === 45) return { title: 'Phase 3', body: 'The final phase starts today. Day 45 is waiting.' };
  return { title: `Day ${day} of ${PROGRAM_DAYS}`, body: 'Your checklist is ready.' };
}

/**
 * Replace all scheduled reminders with one per upcoming day, each with that day's
 * number in it. Today's is skipped once everything's done — no nagging.
 */
export async function rescheduleReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const s = useApp.getState();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!s.notificationsEnabled || !s.startedAt) return;
  const perm = await Notifications.getPermissionsAsync();
  if (!perm.granted) return;

  const now = appNow();
  const today = currentDay(s);
  const { hour, minute } = parseTime(s.reminderTime);
  const realNow = Date.now();

  for (let i = 0; i < DAYS_AHEAD; i++) {
    const day = today + i;
    if (i === 0 && isFullDay(s.logs[dateForDay(s.startedAt, day)])) continue;
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, minute);
    // Translate dev time-travel back to the real clock so test reminders still fire.
    const fireAt = at.getTime() - (now.getTime() - realNow);
    if (fireAt <= realNow + 5_000) continue;
    await Notifications.scheduleNotificationAsync({
      content: { ...message(day), sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireAt },
    });
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;
/** Coalesce bursts of check-offs into one reschedule. */
export function rescheduleSoon() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void rescheduleReminders().catch(() => {});
  }, 1500);
}
