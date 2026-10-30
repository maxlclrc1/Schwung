import { Ionicons } from '@expo/vector-icons';
import { reloadAppAsync } from 'expo';
import { useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { deviceLanguage, isDirectionPending, subscribeDirection } from '../i18n/device';
import { LANGUAGES, READY_LANGUAGES } from '../i18n/languages';
import { useT } from '../i18n/react';
import { haptic } from '../lib/haptics';
import { usePreferences, type LanguagePreference } from '../store/preferences';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { SheetHeader } from './SheetHeader';
import { Button, Screen, T } from './ui';

/**
 * Settings → Language: follow the phone, or choose one. Each language is named in its own language (Deutsch,
 * Français, Türkçe), never translated. A change applies at once, everywhere; nothing about the program changes.
 * Between a right-to-left and a left-to-right language the layout turns around with the next launch: offered here.
 */
export function LanguagePicker() {
  const { c } = useTheme();
  const t = useT();
  const pref = usePreferences((s) => s.language);
  const setLanguage = usePreferences((s) => s.setLanguage);
  const device = LANGUAGES.find((l) => l.code === deviceLanguage());
  const restart = useSyncExternalStore(subscribeDirection, isDirectionPending);
  const choose = (l: LanguagePreference) => {
    haptic.select();
    setLanguage(l);
  };
  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={t('settings.language.title')} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <T color={c.textDim}>{t('settings.language.intro')}</T>
        {restart ? (
          <ThemedView style={[styles.restart, { backgroundColor: c.surface }]}>
            <T color={c.text}>{t('settings.language.restartBody')}</T>
            <Button label={t('settings.language.restartNow')} onPress={() => void reloadAppAsync()} />
          </ThemedView>
        ) : null}
        <ThemedView style={[styles.panel, { backgroundColor: c.surface }]} accessibilityRole="radiogroup">
          <Option
            label={t('settings.language.followDevice')}
            hint={device ? t('settings.language.followDeviceNow', { language: device.native }) : undefined}
            selected={pref === 'system'}
            onPress={() => choose('system')}
          />
          {READY_LANGUAGES.map((l) => (
            <View key={l.code}>
              <ThemedView style={[styles.rule, { backgroundColor: c.border }]} />
              <Option label={l.native} lang={l.code} selected={pref === l.code} onPress={() => choose(l.code)} />
            </View>
          ))}
        </ThemedView>
      </ScrollView>
    </Screen>
  );
}

function Option({
  label,
  hint,
  lang,
  selected,
  onPress,
}: {
  label: string;
  hint?: string;
  /** The language the label is written in, so VoiceOver reads it in its own voice. */
  lang?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      accessibilityLanguage={lang}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <T color={c.text} style={{ fontWeight: selected ? '700' : '400' }}>
          {label}
        </T>
        {hint ? (
          <T v="caption" color={c.textFaint}>
            {hint}
          </T>
        ) : null}
      </View>
      {selected ? <Ionicons name="checkmark" size={20} color={c.accentInk} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.xl, paddingBottom: space.xxl, gap: space.lg },
  panel: { borderRadius: radius.lg, paddingHorizontal: space.lg },
  rule: { height: StyleSheet.hairlineWidth },
  restart: { borderRadius: radius.lg, padding: space.lg, gap: space.md },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
});
