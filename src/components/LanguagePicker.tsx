import { Ionicons } from '@expo/vector-icons';
import { reloadAppAsync } from 'expo';
import { useRef, useSyncExternalStore, type ComponentRef, type Ref } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewProps } from 'react-native';
import { deviceLanguage, isDirectionPending, subscribeDirection } from '../i18n/device';
import { LANGUAGES, READY_LANGUAGES } from '../i18n/languages';
import { useT } from '../i18n/react';
import { haptic } from '../lib/haptics';
import { usePreferences, type LanguagePreference } from '../store/preferences';
import { space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';
import { SheetHeader } from './SheetHeader';
import { Button, Screen, T } from './ui';
import { Tap } from './Tap';

type ViewRef = ComponentRef<typeof View>;

/**
 * Settings → Language: follow the phone, or choose one. Each language is named in its own language (Deutsch,
 * Français, Türkçe), never translated. A change applies everywhere; nothing about the program changes.
 * Between a right-to-left and a left-to-right language the layout turns around with the next launch: offered here.
 * The screen (app/language.tsx) is LanguageRipple, which draws this list twice: live, and in the language about to be
 * chosen, revealed through the ripple.
 */
export function LanguagePicker({
  onChoose,
  onPrepare,
  preview,
  scrollProps,
}: {
  /*
   * For LanguageRipple. onChoose: takes over the change, given the row tapped (without it, the change applies at
   * once). onPrepare: a finger landed on a row (it may not become a choice). preview: drawn as if this were already
   * chosen. scrollProps: passed to the list's scroll view.
   */
  onChoose?: (language: LanguagePreference, row: ViewRef | null) => void;
  onPrepare?: (language: LanguagePreference, row: ViewRef | null) => void;
  preview?: { pref: LanguagePreference; restart: boolean };
  scrollProps?: ScrollViewProps & { ref?: Ref<ComponentRef<typeof ScrollView>> };
} = {}) {
  const { c } = useTheme();
  const t = useT();
  const saved = usePreferences((s) => s.language);
  const setLanguage = usePreferences((s) => s.setLanguage);
  const device = LANGUAGES.find((l) => l.code === deviceLanguage());
  const pending = useSyncExternalStore(subscribeDirection, isDirectionPending);
  const pref = preview ? preview.pref : saved;
  const restart = preview ? preview.restart : pending;
  const choose = (l: LanguagePreference, row: ViewRef | null) => {
    // The language already chosen: nothing at all.
    if (l === saved) return;
    haptic.select();
    if (onChoose) onChoose(l, row);
    else setLanguage(l);
  };
  return (
    <Screen edges={['bottom']}>
      <SheetHeader title={t('settings.language.title')} />
      <ScrollView {...scrollProps} contentContainerStyle={styles.scroll}>
        <T color={c.textDim}>{t('settings.language.intro')}</T>
        {restart ? (
          <ThemedView style={[styles.restart, { borderColor: c.accent }]}>
            <T color={c.text}>{t('settings.language.restartBody')}</T>
            <Button label={t('settings.language.restartNow')} onPress={() => void reloadAppAsync()} />
          </ThemedView>
        ) : null}
        <ThemedView style={[styles.panel, { borderColor: c.border }]} accessibilityRole="radiogroup">
          <Option
            label={t('settings.language.followDevice')}
            hint={device ? t('settings.language.followDeviceNow', { language: device.native }) : undefined}
            selected={pref === 'system'}
            onPress={(row) => choose('system', row)}
            onPressIn={onPrepare && ((row) => onPrepare('system', row))}
          />
          {READY_LANGUAGES.map((l) => (
            <View key={l.code}>
              <ThemedView style={[styles.rule, { backgroundColor: c.border }]} />
              <Option
                label={l.native}
                lang={l.code}
                selected={pref === l.code}
                onPress={(row) => choose(l.code, row)}
                onPressIn={onPrepare && ((row) => onPrepare(l.code, row))}
              />
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
  onPressIn,
}: {
  label: string;
  hint?: string;
  /** The language the label is written in, so VoiceOver reads it in its own voice. */
  lang?: string;
  selected: boolean;
  onPress: (row: ViewRef | null) => void;
  onPressIn?: (row: ViewRef | null) => void;
}) {
  const { c } = useTheme();
  const ref = useRef<ViewRef>(null);
  return (
    <Tap
      ref={ref}
      onPress={() => onPress(ref.current)}
      onPressIn={onPressIn && (() => onPressIn(ref.current))}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      accessibilityLanguage={lang}
      style={styles.row}
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
    </Tap>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.lg + 4, paddingBottom: space.xxl, gap: space.lg },
  // The languages as a plain list between hairlines, as the rest of Settings.
  panel: { borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth },
  rule: { height: StyleSheet.hairlineWidth },
  restart: { borderStartWidth: 1.5, paddingStart: space.md, gap: space.md },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
});
