import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { AppState, Image, Pressable, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { habitLine, reminderText } from '../../core/reminders';
import * as P from '../../core/reset/pilot';
import { toDateKey } from '../../core/dates';
import { haptic } from '../../lib/haptics';
import { askForReminders, openNotificationSettings, reminderPermission, type Permission } from '../../lib/reminders';
import { usePreferences } from '../../store/preferences';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { radius, space, useTheme } from '../../theme';
import { ThemedView } from '../../theme/transition';
import { T } from '../ui';

const sys = ReduceMotion.System;
const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const PRESETS = [
  { label: 'Morning', hour: 8, minute: 0 },
  { label: 'Midday', hour: 12, minute: 30 },
  { label: 'Evening', hour: 19, minute: 0 },
];

/**
 * Settings → Reminders: one optional, gentle reminder a day at a time you choose. Off by default; the phone asks
 * for permission only when it's turned on. A preview shows exactly what will arrive. Habit names are opt-in
 * (they can show on the lock screen).
 */
export function RemindersSettings() {
  const { c } = useTheme();
  const reminders = usePreferences((s) => s.reminders);
  const setReminders = usePreferences((s) => s.setReminders);
  const program = useResetPilot((s) => s.program);
  const [permission, setPermission] = useState<Permission | null>(null);

  // What the phone allows, read now and whenever the person comes back (e.g. from iOS Settings).
  useEffect(() => {
    const check = () => void reminderPermission().then(setPermission);
    check();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, []);

  const turn = async (on: boolean) => {
    if (!on) {
      haptic.confirm();
      setReminders({ enabled: false });
      return;
    }
    const p = await askForReminders();
    setPermission(p);
    if (p === 'granted') {
      setReminders({ enabled: true });
      haptic.confirm();
    } else if (p === 'denied') {
      haptic.warning();
    }
  };
  const shift = (by: number) => {
    haptic.tick();
    const t = (((reminders.hour * 60 + reminders.minute + by) % 1440) + 1440) % 1440;
    setReminders({ hour: Math.floor(t / 60), minute: t % 60 });
  };

  const on = reminders.enabled && permission !== 'denied';
  const blocked = permission === 'denied';
  // The preview: what tomorrow's reminder says (with a habit's name when names are on).
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const names = program ? program.habits.map((id) => P.nameOf(program, id)) : [];
  const preview =
    reminders.showHabits && names.length
      ? habitLine(names[0])
      : reminderText(toDateKey(tomorrow), program ? pilotToday() + 1 : 1, null);

  return (
    <Animated.View layout={LinearTransition.duration(220).reduceMotion(sys)} style={{ gap: space.sm }}>
      <T v="overline" color={c.textDim}>
        Reminders
      </T>
      <ThemedView style={[styles.panel, { backgroundColor: c.surface }]}>
        <View style={styles.head}>
          <View style={[styles.bell, { backgroundColor: c.accentSoft }]}>
            <Ionicons name={on ? 'notifications' : 'notifications-outline'} size={18} color={c.accentInk} />
          </View>
          <View style={{ flex: 1 }}>
            <T v="bodyStrong">Daily reminder</T>
            <T v="caption" color={c.textDim}>
              {on ? `Every day at ${hhmm(reminders.hour, reminders.minute)}` : 'Off · a gentle nudge, once a day'}
            </T>
          </View>
          <Switch
            value={on}
            onValueChange={(v) => void turn(v)}
            trackColor={{ true: c.accent, false: c.surfaceHigh }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={c.surfaceHigh}
            accessibilityLabel="Daily reminder"
            accessibilityHint={on ? 'Turns the daily reminder off' : 'Turns on one gentle reminder a day'}
          />
        </View>

        {blocked ? (
          <Animated.View
            entering={FadeIn.duration(200).reduceMotion(sys)}
            style={[styles.note, { backgroundColor: c.peachSoft }]}
          >
            <T v="caption" color={c.text} style={{ flex: 1 }}>
              Notifications are turned off for Schwung in your phone’s settings.
            </T>
            <Pressable onPress={openNotificationSettings} accessibilityRole="button" hitSlop={8}>
              <T v="caption" color={c.peachInk} style={{ fontWeight: '800' }}>
                Open Settings
              </T>
            </Pressable>
          </Animated.View>
        ) : null}

        {on ? (
          <Animated.View
            entering={FadeIn.duration(220).reduceMotion(sys)}
            exiting={FadeOut.duration(140).reduceMotion(sys)}
            style={{ gap: space.lg }}
          >
            <ThemedView style={[styles.rule, { backgroundColor: c.border }]} />
            <View
              style={styles.time}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel="Reminder time"
              accessibilityValue={{ text: hhmm(reminders.hour, reminders.minute) }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(e) => shift(e.nativeEvent.actionName === 'increment' ? 15 : -15)}
            >
              <Round icon="remove" label="15 minutes earlier" onPress={() => shift(-15)} />
              <Animated.View
                key={`${reminders.hour}:${reminders.minute}`}
                entering={FadeIn.duration(160).reduceMotion(sys)}
              >
                <T style={[styles.clock, { color: c.text }]}>{hhmm(reminders.hour, reminders.minute)}</T>
              </Animated.View>
              <Round icon="add" label="15 minutes later" onPress={() => shift(15)} />
            </View>
            <View style={styles.presets}>
              {PRESETS.map((p) => {
                const sel = p.hour === reminders.hour && p.minute === reminders.minute;
                return (
                  <Pressable
                    key={p.label}
                    onPress={() => {
                      haptic.select();
                      setReminders({ hour: p.hour, minute: p.minute });
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: sel }}
                    accessibilityLabel={`${p.label}, ${hhmm(p.hour, p.minute)}`}
                    style={{ flex: 1 }}
                  >
                    <ThemedView style={[styles.preset, { backgroundColor: sel ? c.accentSoft : c.surfaceHigh }]}>
                      <T v="caption" color={sel ? c.accentInk : c.text} style={{ fontWeight: '700' }}>
                        {p.label}
                      </T>
                      <T v="caption" color={sel ? c.accentInk : c.textDim} style={{ fontSize: 12 }}>
                        {hhmm(p.hour, p.minute)}
                      </T>
                    </ThemedView>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.head}>
              <View style={{ flex: 1 }}>
                <T>Mention my habits</T>
                <T v="caption" color={c.textDim}>
                  Now and then, by name. Off keeps your lock screen private.
                </T>
              </View>
              <Switch
                value={reminders.showHabits}
                onValueChange={(v) => {
                  haptic.confirm();
                  setReminders({ showHabits: v });
                }}
                trackColor={{ true: c.accent, false: c.surfaceHigh }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={c.surfaceHigh}
                accessibilityLabel="Mention my habits in reminders"
              />
            </View>

            {/* What will arrive, as it will look. */}
            <View accessible accessibilityLabel={`Preview: ${preview.title} ${preview.body}`}>
              <T v="caption" color={c.textFaint} style={{ marginBottom: space.xs }}>
                Preview
              </T>
              <ThemedView style={[styles.bubble, { backgroundColor: c.surfaceHigh }]}>
                <Image source={require('../../../assets/icon.png')} style={styles.appIcon} />
                <View style={{ flex: 1, gap: 1 }}>
                  <View style={styles.bubbleTop}>
                    <T v="caption" color={c.textDim} style={styles.appName}>
                      SCHWUNG
                    </T>
                    <T v="caption" color={c.textFaint} style={{ fontSize: 12 }}>
                      {hhmm(reminders.hour, reminders.minute)}
                    </T>
                  </View>
                  <T v="bodyStrong" style={{ fontSize: 15, lineHeight: 20 }}>
                    {preview.title}
                  </T>
                  <T v="caption" color={c.textDim}>
                    {preview.body}
                  </T>
                </View>
              </ThemedView>
              <T v="caption" color={c.textFaint} style={{ marginTop: space.sm }}>
                No reminder on a day you’ve already completed. Never more than one a day.
              </T>
            </View>
          </Animated.View>
        ) : null}
      </ThemedView>
    </Animated.View>
  );
}

function Round({ icon, label, onPress }: { icon: 'add' | 'remove'; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} hitSlop={6}>
      {({ pressed }) => (
        <ThemedView style={[styles.round, { backgroundColor: c.surfaceHigh, opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name={icon} size={20} color={c.text} />
        </ThemedView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  bell: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  note: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md },
  rule: { height: StyleSheet.hairlineWidth },
  time: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  clock: { fontSize: 44, lineHeight: 50, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  presets: { flexDirection: 'row', gap: space.sm },
  preset: { minHeight: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', gap: 1 },
  bubble: { flexDirection: 'row', gap: space.md, padding: space.md, borderRadius: 18, alignItems: 'flex-start' },
  appIcon: { width: 32, height: 32, borderRadius: 8 },
  bubbleTop: { flexDirection: 'row', justifyContent: 'space-between' },
  appName: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
});
