import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { ReactNode } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PilotSettings } from '../components/pilot/PilotSettings';
import { RemindersSettings } from '../components/reminders/RemindersSettings';
import { SheetHeader } from '../components/SheetHeader';
import { Screen, T } from '../components/ui';
import type { ThemePreference } from '../core/types';
import { APP_NAME, CONTACT_EMAIL } from '../lib/constants';
import { haptic } from '../lib/haptics';
import { legalVisible } from '../lib/legal';
import { usePreferences } from '../store/preferences';
import { radius, space, useTheme, useThemePreference } from '../theme';
import { ThemedView } from '../theme/transition';
import { language } from '../i18n';
import { LANGUAGES } from '../i18n/languages';
import { useT } from '../i18n/react';
import { flipX } from '../i18n/direction';

export default function Settings() {
  const { c } = useTheme();
  const t = useT();
  const pref = usePreferences((s) => s.language);
  const lang = LANGUAGES.find((l) => l.code === language());

  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={t('settings.title')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <PilotSettings Section={Section} Row={Row} />

        <RemindersSettings />

        <Section title={t('settings.appearance')}>
          <AppearancePicker />
        </Section>

        <Section title={t('settings.language.title')}>
          <Row label={t('settings.language.row')} onPress={() => router.push('/language')}>
            <View style={styles.value}>
              {/* The language in its own name; "Follow device" when following the phone. */}
              <T color={c.textDim} numberOfLines={1} style={{ flexShrink: 1 }}>
                {pref === 'system' ? t('settings.language.followDevice') : lang?.native}
              </T>
              <Ionicons name="chevron-forward" size={18} color={c.textFaint} style={flipX} />
            </View>
          </Row>
        </Section>

        <Section title={t('settings.privacySection')}>
          <Row label={t('settings.privacyRow')} icon="lock-closed-outline" onPress={() => router.push('/privacy')} />
        </Section>

        <Section title={t('settings.about')}>
          <Row
            label={t('settings.wellness')}
            icon="heart-outline"
            onPress={() => router.push({ pathname: '/legal', params: { doc: 'wellness' } })}
          />
          {legalVisible.terms() ? (
            <Row
              label={t('settings.terms')}
              icon="document-text-outline"
              onPress={() => router.push({ pathname: '/legal', params: { doc: 'terms' } })}
            />
          ) : null}
          {legalVisible.contact() ? (
            <Row
              label={t('settings.contact')}
              icon="mail-outline"
              onPress={() => void Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            />
          ) : null}
        </Section>

        <T v="caption" color={c.textFaint} style={{ textAlign: 'center' }}>
          {APP_NAME} {Constants.expoConfig?.version ?? ''}
          {'\n'}
          {t('settings.tagline')}
        </T>
      </ScrollView>
    </Screen>
  );
}

const APPEARANCE: { value: ThemePreference; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'system', icon: 'phone-portrait-outline' },
  { value: 'light', icon: 'sunny-outline' },
  { value: 'dark', icon: 'moon-outline' },
];

function AppearancePicker() {
  const { c } = useTheme();
  const t = useT();
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
              haptic.confirm();
              setThemePreference(o.value);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={
              o.value === 'system'
                ? t('settings.theme.systemA11y')
                : t('settings.theme.mode', { name: t(`settings.theme.${o.value}`) })
            }
            style={{ flex: 1 }}
          >
            <ThemedView style={[styles.segmentItem, { backgroundColor: selected ? c.accentSoft : c.surface }]}>
              <Ionicons name={o.icon} size={18} color={selected ? c.accentInk : c.textDim} />
              <T
                v="caption"
                color={selected ? c.accentInk : c.textDim}
                style={{ fontWeight: '700' }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {t(`settings.theme.${o.value}`)}
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
              onPress();
              haptic.select();
            }
          : undefined
      }
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <T color={color} style={{ flexShrink: 1 }}>
        {label}
      </T>
      {children ?? (icon ? <Ionicons name={icon} size={20} color={destructive ? color : c.textFaint} /> : null)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.xl },
  section: { borderRadius: radius.lg, paddingHorizontal: space.lg },
  row: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.xs,
  },
  value: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexShrink: 1 },
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
