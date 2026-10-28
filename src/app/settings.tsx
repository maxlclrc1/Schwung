import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { ReactNode, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { SheetHeader } from '../components/SheetHeader';
import { TimePicker } from '../components/TimePicker';
import { Screen, T } from '../components/ui';
import { formatTime, PROGRAM_DAYS } from '../core/dates';
import { APP_NAME, CONTACT_EMAIL, PRIVACY_URL } from '../lib/constants';
import { haptic } from '../lib/haptics';
import { channel, devTools } from '../lib/flags';
import { requestPermission, rescheduleReminders } from '../lib/notifications';
import { useFieldNotes } from '../store/fieldNotes';
import { pilot } from '../store/pilotGate';
import { currentDay, exportData, useApp } from '../store/useApp';
import type { ThemePreference, Weekday } from '../core/types';
import { radius, space, useTheme, useThemePreference } from '../theme';
import { ThemedView } from '../theme/transition';

export default function Settings() {
  const { c } = useTheme();
  const reminderTime = useApp((s) => s.reminderTime);
  const enabled = useApp((s) => s.notificationsEnabled);
  const setReminder = useApp((s) => s.setReminder);
  const [editingTime, setEditingTime] = useState(false);

  const apply = async (time: string, on: boolean) => {
    let granted = on;
    if (on) {
      granted = await requestPermission().catch(() => false);
      if (!granted) {
        Alert.alert(
          'Notifications are off',
          `Allow notifications for ${APP_NAME} in iOS Settings to get your daily reminder.`,
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => void Linking.openSettings() },
          ],
        );
      }
    }
    setReminder(time, granted);
    await rescheduleReminders().catch(() => {});
  };

  const exportJson = async () => {
    try {
      const file = new File(Paths.cache, `${APP_NAME.toLowerCase()}-export.json`);
      // Retired Field Notes data, if this phone has any, comes along so it's never out of reach.
      const fn = useFieldNotes.getState();
      const fieldNotes = fn.run || fn.archive.length ? { fieldNotes: { run: fn.run, archive: fn.archive } } : {};
      // The Life Reset (testing builds) comes along too, beside the program.
      const reset = pilot?.store.useResetPilot.getState().program;
      await file.write(
        JSON.stringify(
          {
            exportedAt: new Date().toISOString(),
            ...exportData(),
            ...fieldNotes,
            ...(reset ? { lifeReset: reset } : {}),
          },
          null,
          2,
        ),
      );
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: 'Export my data',
      });
    } catch {
      Alert.alert('Export failed', 'Something went wrong preparing your data. Please try again.');
    }
  };

  const restart = () =>
    Alert.alert(
      'Restart your program?',
      'This clears your progress, history, and plan, and starts over from the quiz. It can’t be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          style: 'destructive',
          onPress: () => {
            haptic.warning();
            useApp.getState().restart();
            void rescheduleReminders().catch(() => {});
            if (router.canDismiss()) router.dismissAll();
            router.replace('/welcome');
          },
        },
      ],
    );

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Appearance">
          <AppearancePicker />
        </Section>

        <Section title="Reminder">
          <Row label="Daily reminder">
            <Switch
              value={enabled}
              onValueChange={(v) => void apply(reminderTime, v)}
              trackColor={{ true: c.accent, false: c.surfaceHigh }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={c.surfaceHigh}
            />
          </Row>
          {enabled ? (
            <Row label="Time" onPress={() => setEditingTime((v) => !v)}>
              <T v="bodyStrong" color={c.accentInk}>
                {formatTime(reminderTime)}
              </T>
            </Row>
          ) : null}
          {enabled && editingTime ? (
            <View style={{ alignItems: 'center', paddingBottom: space.md }}>
              <TimePicker value={reminderTime} onChange={(t) => void apply(t, true)} />
            </View>
          ) : null}
        </Section>

        <Section title="Your data">
          <Row label="Export my data" icon="share-outline" onPress={exportJson} />
          <Row label="Restart program" icon="refresh" destructive onPress={restart} />
        </Section>

        {/* Testing builds only: the Life Reset, a separate program beside this one (store/pilotGate.ts). */}
        {(__DEV__ || process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL === 'internal') &&
        pilot &&
        pilot.store.resetPilotAvailable() ? (
          <pilot.Settings Section={Section} Row={Row} />
        ) : null}

        <Section title="About">
          <Row label="Privacy policy" icon="open-outline" onPress={() => void Linking.openURL(PRIVACY_URL)} />
          <Row label="Contact" icon="mail-outline" onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)} />
        </Section>

        {/* The literal __DEV__ lets release bundles drop the developer tools entirely. */}
        {__DEV__ && devTools() ? <DevTools /> : null}

        <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
          {APP_NAME} {Constants.expoConfig?.version ?? ''}
          {'\n'}Free. No account. No tracking. Everything stays on this phone.
        </T>
      </ScrollView>
    </Screen>
  );
}

/** Development channel only (lib/flags): time travel to test progression, reminders, and ceremonies. */
function DevTools() {
  const offset = useApp((s) => s.devDayOffset);
  const setOffset = useApp((s) => s.setDevDayOffset);
  const startedAt = useApp((s) => s.startedAt);
  const day = currentDay({ startedAt, devDayOffset: offset });
  const programVersion = useApp((s) => s.programVersion);
  const jumpTo = (target: number) => setOffset(offset + (target - day));
  const addTestSession = (days: Weekday[]) => {
    const id = useApp.getState().addDevScheduledHabit(days);
    if (id) router.push(`/habit/${id}`);
  };
  const shift = (n: number) => setOffset(offset + n);

  return (
    <Section title={`Developer · Day ${day} (offset ${offset >= 0 ? '+' : ''}${offset})`}>
      <View style={styles.devRow}>
        <DevButton label="−1 day" onPress={() => shift(-1)} />
        <DevButton label="+1 day" onPress={() => shift(1)} />
        <DevButton label="+3 days" onPress={() => shift(3)} />
        <DevButton label="+7 days" onPress={() => shift(7)} />
      </View>
      <View style={styles.devRow}>
        <DevButton label="Day 7" onPress={() => jumpTo(7)} />
        <DevButton label="Day 22" onPress={() => jumpTo(22)} />
        <DevButton label="Day 66" onPress={() => jumpTo(PROGRAM_DAYS)} />
        <DevButton label="Day 67" onPress={() => jumpTo(PROGRAM_DAYS + 1)} />
      </View>
      <View style={styles.devRow}>
        <DevButton label="Reset clock" onPress={() => setOffset(0)} />
        <DevButton label="Replay ceremonies" onPress={() => useApp.setState({ seenCeremonies: [] })} />
      </View>
      {startedAt ? (
        <View style={styles.devRow}>
          {/* Synthetic scheduled habits for testing the scheduler: not recommendations, not exercises. Each opens
              straight away so its weekdays can be confirmed or changed (owner decision 6). */}
          <DevButton label="+ Test session Mon/Wed/Fri" onPress={() => addTestSession([1, 3, 5])} />
          <DevButton label="+ Test session Tue/Thu" onPress={() => addTestSession([2, 4])} />
          <DevButton label="Exercise preview" onPress={() => router.push('/dev/exercise')} />
        </View>
      ) : null}
      <T v="caption">
        Channel: {channel()}. This program: V{programVersion}. New programs use V2; a running program keeps its own
        version.
      </T>
    </Section>
  );
}

const APPEARANCE: { value: ThemePreference; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
];

function AppearancePicker() {
  const { c } = useTheme();
  const preference = useThemePreference();
  const setThemePreference = useApp((s) => s.setThemePreference);
  return (
    <View style={styles.segment} accessibilityRole="radiogroup">
      {APPEARANCE.map((o) => {
        const selected = preference === o.value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              haptic.tap();
              setThemePreference(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={o.value === 'system' ? 'Match phone setting' : `${o.label} mode`}
            style={{ flex: 1 }}
          >
            <ThemedView style={[styles.segmentItem, { backgroundColor: selected ? c.accentSoft : c.surface }]}>
              <Ionicons name={o.icon} size={18} color={selected ? c.accentInk : c.textDim} />
              <T v="caption" color={selected ? c.accentInk : c.textDim} style={{ fontWeight: '700' }}>
                {o.label}
              </T>
            </ThemedView>
          </Pressable>
        );
      })}
    </View>
  );
}

function DevButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.devButton, { backgroundColor: c.surfaceHigh }]}>
      <T v="caption">{label}</T>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { c } = useTheme();
  return (
    <View style={{ gap: space.sm }}>
      <T v="overline" color={c.textDim}>
        {title}
      </T>
      <ThemedView style={[styles.section, { backgroundColor: c.surface }]}>{children}</ThemedView>
    </View>
  );
}

function Row({
  label,
  icon,
  onPress,
  destructive,
  children,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  destructive?: boolean;
  children?: ReactNode;
}) {
  const { c } = useTheme();
  const color = destructive ? c.danger : c.text;
  return (
    <Pressable
      onPress={
        onPress
          ? () => {
              haptic.tap();
              onPress();
            }
          : undefined
      }
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <T color={color}>{label}</T>
      {children ?? (icon ? <Ionicons name={icon} size={20} color={destructive ? color : c.textFaint} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  section: { borderRadius: radius.lg, paddingHorizontal: space.lg },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  segment: { flexDirection: 'row', gap: space.xs, paddingVertical: space.sm },
  segmentItem: {
    flex: 1,
    minHeight: 64,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  devRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingVertical: space.sm },
  devButton: { paddingHorizontal: space.md, paddingVertical: space.sm, borderRadius: radius.sm },
});
