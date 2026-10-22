import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TimePicker } from '../components/TimePicker';
import { Button, Screen, T } from '../components/ui';
import { formatTime } from '../core/dates';
import { permissionBlocked, requestPermission, rescheduleReminders } from '../lib/notifications';
import { useApp } from '../store/useApp';
import { space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

export default function Reminder() {
  const { c } = useTheme();
  const [time, setTime] = useState(() => useApp.getState().reminderTime);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    permissionBlocked()
      .then(setBlocked)
      .catch(() => {});
  }, []);

  const finish = async (enable: boolean) => {
    setBusy(true);
    let granted = false;
    if (enable) granted = await requestPermission().catch(() => false);
    const s = useApp.getState();
    s.setReminder(time, granted);
    await rescheduleReminders().catch(() => {});
    // Onboarding is done: Today becomes the root, and Day 1 opens straight over it, so Today never
    // flashes first. Marked seen up front so Today doesn't queue the same ceremony a second time.
    const firstTime = !s.seenCeremonies.includes(1);
    if (firstTime) s.markCeremonySeen(1);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/today');
    if (firstTime) router.push('/ceremony?m=1');
  };

  return (
    <Screen>
      <View style={styles.wrap}>
        <Animated.View entering={FadeInDown.duration(400)} style={{ gap: space.md }}>
          <ThemedView style={[styles.icon, { backgroundColor: c.accentSoft }]}>
            <Ionicons name="notifications" size={26} color={c.accentInk} />
          </ThemedView>
          <T v="overline" color={c.textDim}>
            Optional
          </T>
          <T v="title" accessibilityRole="header">
            When should we check in?
          </T>
          <T color={c.textDim}>
            One quiet reminder a day at the time you choose, and none on days you’ve already finished. Change it or turn
            it off anytime in Settings.
          </T>
          {blocked ? (
            <T v="caption" color={c.textDim}>
              Notifications are turned off for Schwung in your phone’s Settings. Turn them on there first if you’d like
              a reminder.
            </T>
          ) : null}
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.picker}>
          {blocked ? null : <TimePicker value={time} onChange={setTime} />}
        </Animated.View>
        <View style={{ gap: space.sm }}>
          {blocked ? (
            <>
              <Button label="Continue" onPress={() => finish(false)} disabled={busy} />
              <Button label="Open Settings" kind="ghost" onPress={() => void Linking.openSettings()} disabled={busy} />
            </>
          ) : (
            <>
              <Button label={`Remind me at ${formatTime(time)}`} onPress={() => finish(true)} disabled={busy} />
              <Button label="Not now" kind="ghost" onPress={() => finish(false)} disabled={busy} />
            </>
          )}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.xl, justifyContent: 'space-between' },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
  picker: { alignItems: 'center' },
});
