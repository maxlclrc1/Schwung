import * as Notifications from 'expo-notifications';
import { AndroidImportance, IosAuthorizationStatus } from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { planReminders, type ReminderSettings } from '../core/reminders';

/*
 * Local reminders on the phone itself (expo-notifications): no account, no server, works offline. Every sync
 * cancels Schwung's own pending reminders and schedules the current plan (core/reminders.ts), one at a time
 * through a queue, so two syncs can never interleave into duplicates. Permission is asked for only when the person
 * turns reminders on.
 */

const PREFIX = 'schwung-reminder-';
const CHANNEL = 'reminders';

// A reminder arriving while Schwung is open goes quietly to the list, never a banner over what you're doing.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type Permission = 'granted' | 'denied' | 'undetermined';

const read = (p: Notifications.NotificationPermissionsStatus): Permission =>
  p.granted || p.ios?.status === IosAuthorizationStatus.PROVISIONAL
    ? 'granted'
    : p.status === 'undetermined'
      ? 'undetermined'
      : 'denied';

export async function reminderPermission(): Promise<Permission> {
  try {
    return read(await Notifications.getPermissionsAsync());
  } catch {
    return 'denied';
  }
}

/** Asks the system, only when it hasn't been answered yet; otherwise reports the answer already given. */
export async function askForReminders(): Promise<Permission> {
  const now = await reminderPermission();
  if (now !== 'undetermined') return now;
  try {
    return read(
      await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } }),
    );
  } catch {
    return 'denied';
  }
}

/** The phone's own settings for Schwung (where a "no" can be changed). */
export const openNotificationSettings = () => void Linking.openSettings().catch(() => {});

let queue: Promise<unknown> = Promise.resolve();

/** Replaces Schwung's pending reminders with the current plan. Safe to call as often as anything changes. */
export function syncReminders(
  settings: ReminderSettings,
  program: { startedAt: string } | null,
  opts: { todayComplete: boolean; habitNames: string[] },
): Promise<void> {
  const run = async () => {
    const pending = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
    await Promise.all(
      pending
        .filter((n) => n.identifier.startsWith(PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})),
    );
    const plan = planReminders(settings, program, new Date(), opts);
    if (!plan.length || (await reminderPermission()) !== 'granted') return;
    if (Platform.OS === 'android')
      await Notifications.setNotificationChannelAsync(CHANNEL, {
        name: 'Daily reminder',
        importance: AndroidImportance.DEFAULT,
      }).catch(() => null);
    for (const r of plan)
      await Notifications.scheduleNotificationAsync({
        identifier: r.id,
        content: { title: r.title, body: r.body, sound: 'default' },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: r.date, channelId: CHANNEL },
      }).catch(() => {});
  };
  const next = queue.then(run, run);
  queue = next.catch(() => {});
  return next;
}

/** Cancels every pending Schwung reminder ("Delete my data"). */
export async function cancelAllReminders(): Promise<void> {
  await queue.catch(() => {});
  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}
