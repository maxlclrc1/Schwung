import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Switch, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition, ReduceMotion } from 'react-native-reanimated';
import { habitLine, reminderText } from '../../core/reminders';
import * as P from '../../core/reset/pilot';
import { toDateKey } from '../../core/dates';
import { haptic } from '../../lib/haptics';
import { askForReminders, openNotificationSettings, reminderPermission, type Permission } from '../../lib/reminders';
import { usePreferences } from '../../store/preferences';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { space, useTheme } from '../../theme';
import { Row, Section } from '../settingsRows';
import { ThemedView } from '../../theme/transition';
import { T } from '../ui';
import { useT } from '../../i18n/react';
import { Tap } from '../Tap';

const sys = ReduceMotion.System;
const hhmm = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
const PRESETS = [
  { label: 'morning' as const, hour: 8, minute: 0 },
  { label: 'midday' as const, hour: 12, minute: 30 },
  { label: 'evening' as const, hour: 19, minute: 0 },
];

/**
 * Settings → Reminders: one optional, gentle reminder a day at a time you choose. Off by default; the phone asks
 * for permission only when it's turned on. A preview shows exactly what will arrive. Habit names are opt-in
 * (they can show on the lock screen).
 */
export function RemindersSettings() {
  const { c } = useTheme();
  const t = useT();
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
    <Animated.View layout={LinearTransition.duration(220).reduceMotion(sys)}>
      <Section title={t('settings.reminders.title')} first>
        <Row
          label={t('settings.reminders.daily')}
          hint={
            on
              ? t('settings.reminders.everyDay', { time: hhmm(reminders.hour, reminders.minute) })
              : t('settings.reminders.off')
          }
        >
          <Switch
            value={on}
            onValueChange={(v) => void turn(v)}
            trackColor={{ true: c.accent, false: c.surfaceHigh }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={c.surfaceHigh}
            accessibilityLabel={t('settings.reminders.daily')}
            accessibilityHint={on ? t('settings.reminders.hintOff') : t('settings.reminders.hintOn')}
          />
        </Row>

        {blocked ? (
          <Animated.View
            entering={FadeIn.duration(200).reduceMotion(sys)}
            style={[styles.note, { borderColor: c.peach }]}
          >
            <T v="caption" color={c.text}>
              {t('settings.reminders.blocked')}
            </T>
            <Tap onPress={openNotificationSettings} accessibilityRole="button" hitSlop={4} style={styles.link}>
              <T color={c.accentInk} style={styles.linkText}>
                {t('settings.reminders.openSettings')}
              </T>
            </Tap>
          </Animated.View>
        ) : null}
        {on ? (
          <Animated.View
            entering={FadeIn.duration(220).reduceMotion(sys)}
            exiting={FadeOut.duration(140).reduceMotion(sys)}
          >
            <ThemedView
              style={[styles.time, { borderColor: c.border }]}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={t('settings.reminders.time')}
              accessibilityValue={{ text: hhmm(reminders.hour, reminders.minute) }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(e) => shift(e.nativeEvent.actionName === 'increment' ? 15 : -15)}
            >
              <Animated.View
                key={`${reminders.hour}:${reminders.minute}`}
                entering={FadeIn.duration(160).reduceMotion(sys)}
              >
                <T style={[styles.clock, { color: c.text }]}>{hhmm(reminders.hour, reminders.minute)}</T>
              </Animated.View>
              <View style={styles.steps}>
                <Round icon="remove" label={t('settings.reminders.earlier')} onPress={() => shift(-15)} />
                <Round icon="add" label={t('settings.reminders.later')} onPress={() => shift(15)} />
              </View>
            </ThemedView>
            <ThemedView style={[styles.presets, { borderColor: c.border }]} accessibilityRole="radiogroup">
              {PRESETS.map((p) => {
                const sel = p.hour === reminders.hour && p.minute === reminders.minute;
                return (
                  <Tap
                    key={p.label}
                    onPress={() => {
                      haptic.select();
                      setReminders({ hour: p.hour, minute: p.minute });
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: sel }}
                    accessibilityLabel={t('settings.reminders.preset', {
                      name: t(`settings.reminders.${p.label}`),
                      time: hhmm(p.hour, p.minute),
                    })}
                    style={styles.preset}
                  >
                    <T color={sel ? c.accentInk : c.text} style={[styles.presetName, sel && styles.selected]}>
                      {t(`settings.reminders.${p.label}`)}
                    </T>
                    <T v="caption" color={sel ? c.accentInk : c.textDim} style={styles.presetTime}>
                      {hhmm(p.hour, p.minute)}
                    </T>
                    {sel ? <ThemedView style={[styles.underline, { backgroundColor: c.accent }]} /> : null}
                  </Tap>
                );
              })}
            </ThemedView>
            <Row label={t('settings.reminders.mention')} hint={t('settings.reminders.mentionHint')}>
              <Switch
                value={reminders.showHabits}
                onValueChange={(v) => {
                  haptic.confirm();
                  setReminders({ showHabits: v });
                }}
                trackColor={{ true: c.accent, false: c.surfaceHigh }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={c.surfaceHigh}
                accessibilityLabel={t('settings.reminders.mentionA11y')}
              />
            </Row>
            {/* What will arrive, as it will look. */}
            <View style={styles.preview} accessible accessibilityLabel={t('settings.reminders.previewA11y', preview)}>
              <T v="overline" color={c.textFaint} style={styles.previewLabel}>
                {t('settings.reminders.preview')}
              </T>
              <ThemedView style={[styles.bubble, { backgroundColor: `${c.text}0B` }]}>
                <Image source={require('../../../assets/icon.png')} style={styles.appIcon} cachePolicy="memory-disk" />
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
              <T v="caption" color={c.textDim} style={{ marginTop: space.sm }}>
                {t('settings.reminders.rules')}
              </T>
            </View>
          </Animated.View>
        ) : null}
      </Section>
    </Animated.View>
  );
}

function Round({ icon, label, onPress }: { icon: 'add' | 'remove'; label: string; onPress: () => void }) {
  const { c } = useTheme();
  return (
    <Tap onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={styles.roundHit}>
      <ThemedView style={[styles.round, { borderColor: c.border}]}>
        <Ionicons name={icon} size={18} color={c.text} />
      </ThemedView>
    </Tap>
  );
}

const styles = StyleSheet.create({
  // Blocked notifications: a short note on a thin peach rule, and the way to the phone's settings.
  note: { marginTop: space.md, paddingStart: space.md, borderStartWidth: 1.5, gap: 2 },
  link: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { fontSize: 15, lineHeight: 20, fontWeight: '500' },
  time: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  clock: { fontSize: 36, lineHeight: 44, fontWeight: '200', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  steps: { flexDirection: 'row', gap: 4 },
  roundHit: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  round: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  presets: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  preset: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm, gap: 1 },
  presetName: { fontSize: 15, lineHeight: 20, textAlign: 'center' },
  presetTime: { fontSize: 12.5, lineHeight: 16, fontVariant: ['tabular-nums'] },
  selected: { fontWeight: '600' },
  underline: {
    position: 'absolute',
    bottom: -StyleSheet.hairlineWidth,
    left: '28%',
    right: '28%',
    height: 2,
    borderRadius: 1,
  },
  preview: { marginTop: space.lg },
  previewLabel: { fontSize: 11.5, letterSpacing: 1.6 },
  bubble: {
    flexDirection: 'row',
    gap: space.md,
    padding: space.md,
    borderRadius: 14,
    alignItems: 'flex-start',
    marginTop: space.sm,
  },
  appIcon: { width: 30, height: 30, borderRadius: 7 },
  bubbleTop: { flexDirection: 'row', justifyContent: 'space-between' },
  appName: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6 },
});
