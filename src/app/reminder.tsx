import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { TimePicker } from '../components/TimePicker';
import { Button, Screen, T } from '../components/ui';
import { requestPermission, rescheduleReminders } from '../lib/notifications';
import { useApp } from '../store/useApp';
import { space, useTheme } from '../theme';

export default function Reminder() {
  const { c } = useTheme();
  const [time, setTime] = useState(() => useApp.getState().reminderTime);
  const [busy, setBusy] = useState(false);

  const finish = async (enable: boolean) => {
    setBusy(true);
    let granted = false;
    if (enable) granted = await requestPermission().catch(() => false);
    useApp.getState().setReminder(time, granted);
    await rescheduleReminders().catch(() => {});
    // Onboarding is done: clear it from the stack so Today is the root.
    if (router.canDismiss()) router.dismissAll();
    router.replace('/today');
  };

  return (
    <Screen>
      <View style={styles.wrap}>
        <Animated.View entering={FadeInDown.duration(400)} style={{ gap: space.md }}>
          <View style={[styles.icon, { backgroundColor: c.accentSoft }]}>
            <Ionicons name="notifications" size={26} color={c.accentInk} />
          </View>
          <T v="title">Remind me daily at…</T>
          <T color={c.textDim}>
            One quiet reminder a day, and none once you’ve finished. Change it anytime in Settings.
          </T>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(120).duration(400)} style={styles.picker}>
          <TimePicker value={time} onChange={setTime} />
        </Animated.View>
        <View style={{ gap: space.sm }}>
          <Button label="Set reminder" onPress={() => finish(true)} disabled={busy} />
          <Button label="Not now" kind="ghost" onPress={() => finish(false)} disabled={busy} />
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
