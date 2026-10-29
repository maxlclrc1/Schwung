import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PilotSettings } from '../components/pilot/PilotSettings';
import { RemindersSettings } from '../components/reminders/RemindersSettings';
import { SheetHeader } from '../components/SheetHeader';
import { Screen, T } from '../components/ui';
import type { ThemePreference } from '../core/types';
import { APP_NAME, CONTACT_EMAIL, PRIVACY_URL } from '../lib/constants';
import { haptic } from '../lib/haptics';
import { usePreferences } from '../store/preferences';
import { useResetPilot } from '../store/resetPilot';
import { radius, space, useTheme, useThemePreference } from '../theme';
import { ThemedView } from '../theme/transition';

export default function Settings() {
  const { c } = useTheme();

  const exportJson = async () => {
    try {
      const file = new File(Paths.cache, `${APP_NAME.toLowerCase()}-export.json`);
      const { program } = useResetPilot.getState();
      const { themePreference } = usePreferences.getState();
      await file.write(
        JSON.stringify({ exportedAt: new Date().toISOString(), lifeReset: program, themePreference }, null, 2),
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

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <PilotSettings Section={Section} Row={Row} />

        <RemindersSettings />

        <Section title="Appearance">
          <AppearancePicker />
        </Section>

        <Section title="Your data">
          <Row label="Export my data" icon="share-outline" onPress={exportJson} />
        </Section>

        <Section title="About">
          <Row label="Privacy policy" icon="open-outline" onPress={() => void Linking.openURL(PRIVACY_URL)} />
          <Row label="Contact" icon="mail-outline" onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)} />
        </Section>

        <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
          {APP_NAME} {Constants.expoConfig?.version ?? ''}
          {'\n'}Free. No account. No tracking. Everything stays on this phone.
        </T>
      </ScrollView>
    </Screen>
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
  const setThemePreference = usePreferences((s) => s.setThemePreference);
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
});
