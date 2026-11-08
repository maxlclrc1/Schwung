import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { PilotSettings } from '../components/pilot/PilotSettings';
import { RemindersSettings } from '../components/reminders/RemindersSettings';
import { Row, Section } from '../components/settingsRows';
import { ThemedImage } from '../components/ThemedImage';
import { TILE_HEIGHT, TILES } from '../components/worldTiles';
import { Screen, T } from '../components/ui';
import type { ThemePreference } from '../core/types';
import { APP_NAME, CONTACT_EMAIL } from '../lib/constants';
import { haptic } from '../lib/haptics';
import { legalVisible } from '../lib/legal';
import { usePreferences } from '../store/preferences';
import { space, useTheme, useThemePreference } from '../theme';
import { ThemedView } from '../theme/transition';
import { language } from '../i18n';
import { LANGUAGES } from '../i18n/languages';
import { useT } from '../i18n/react';

export default function Settings() {
  const { c } = useTheme();
  const t = useT();
  const pref = usePreferences((s) => s.language);
  const lang = LANGUAGES.find((l) => l.code === language());

  return (
    <Screen edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Band title={t('settings.title')} />
        <View style={styles.page}>
          <RemindersSettings />

          <Section title={t('settings.appearance')}>
            <AppearancePicker />
          </Section>

          <Section title={t('settings.language.title')}>
            {/* The language in its own name; "Follow device" when following the phone. */}
            <Row
              label={t('settings.language.row')}
              value={pref === 'system' ? t('settings.language.followDevice') : lang?.native}
              onPress={() => router.push('/language')}
            />
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

          {/* Last, apart from everyday preferences: the program, and ending it. */}
          <PilotSettings />

          <T v="caption" color={c.textFaint} style={styles.footer}>
            {APP_NAME} {Constants.expoConfig?.version ?? ''}
            {'\n'}
            {t('settings.tagline')}
          </T>
        </View>
      </ScrollView>
    </Screen>
  );
}

/**
 * The sheet's top: a shallow strip of the Habits painting (its evening sky and far peaks, the same art as the world
 * behind the tabs) fading into the page, with the grabber, Done and the title on it.
 */
function Band({ title }: { title: string }) {
  const { c } = useTheme();
  const t = useT();
  const { width } = useWindowDimensions();
  const k = width / TILES.dark.habits.width;
  return (
    <View style={styles.band}>
      <View
        style={[StyleSheet.absoluteFill, styles.clip]}
        accessible={false}
        importantForAccessibility="no-hide-descendants"
      >
        <ThemedImage
          sources={{ dark: TILES.dark.habits.source, light: TILES.light.habits.source }}
          contentFit="fill"
          style={{ position: 'absolute', left: 0, top: -BAND_ROW * k, width, height: TILE_HEIGHT * k }}
        />
        <LinearGradient colors={[`${c.bg}00`, c.bg]} locations={[0, 0.88]} style={styles.fade} />
      </View>
      <View style={styles.grabber} />
      <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" style={styles.done}>
        <T v="bodyStrong" color={c.accentInk}>
          {t('nav.done')}
        </T>
      </Pressable>
      <T v="title" accessibilityRole="header" style={styles.title} numberOfLines={2}>
        {title}
      </T>
    </View>
  );
}

/** The Habits painting's row at the band's top: the evening glow over the far peaks. */
const BAND_ROW = 824;

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
    <ThemedView style={[styles.segment, { borderColor: c.border }]} accessibilityRole="radiogroup">
      {APPEARANCE.map((o, i) => {
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
            style={({ pressed }) => [
              styles.segmentItem,
              i > 0 && { borderStartWidth: StyleSheet.hairlineWidth, borderColor: c.border },
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Ionicons name={o.icon} size={18} color={selected ? c.accentInk : c.textDim} />
            <T color={selected ? c.accentInk : c.text} style={[styles.segmentText, selected && styles.selected]}>
              {t(`settings.theme.${o.value}`)}
            </T>
            {selected ? <ThemedView style={[styles.underline, { backgroundColor: c.accent }]} /> : null}
          </Pressable>
        );
      })}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: space.xxl },
  band: { height: 150, justifyContent: 'flex-end' },
  clip: { overflow: 'hidden' },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 },
  grabber: {
    position: 'absolute',
    top: 7,
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  done: { position: 'absolute', top: 14, end: space.lg, minHeight: 32, justifyContent: 'center' },
  title: { paddingHorizontal: space.lg + 4, paddingBottom: 2 },
  page: { paddingHorizontal: space.lg + 4, paddingTop: space.lg },
  segment: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  segmentItem: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: space.sm,
    paddingHorizontal: space.xs,
  },
  segmentText: { fontSize: 15, lineHeight: 20, textAlign: 'center' },
  selected: { fontWeight: '600' },
  underline: {
    position: 'absolute',
    bottom: -StyleSheet.hairlineWidth,
    left: '30%',
    right: '30%',
    height: 2,
    borderRadius: 1,
  },
  footer: { textAlign: 'center', marginTop: space.xxl },
});
