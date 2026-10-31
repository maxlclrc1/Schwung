import { Ionicons } from '@expo/vector-icons';
import { reloadAppAsync } from 'expo';
import { router } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Screen, T } from '../components/ui';
import { WorldBackdrop } from '../components/World';
import { deviceLanguage, isDirectionPending, subscribeDirection } from '../i18n/device';
import { READY_LANGUAGES, type LanguageCode } from '../i18n/languages';
import { useLanguage, useT } from '../i18n/react';
import { haptic } from '../lib/haptics';
import { usePreferences } from '../store/preferences';
import { radius, space, useTheme } from '../theme';
import { ThemedView } from '../theme/transition';

/**
 * First launch, before the first set-up question: which language Schwung speaks. The phone's language is shown
 * selected (when Schwung has it, else English); tapping another switches every word at once, Continue included.
 * Shown once: a language chosen here or in Settings skips it from then on. Between a right-to-left and a
 * left-to-right language the layout turns with a restart, offered here (set-up starts after it).
 */
export default function ChooseLanguage() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const shown = useLanguage();
  const setLanguage = usePreferences((s) => s.setLanguage);
  const confirmLanguage = usePreferences((s) => s.confirmLanguage);
  const chosen = usePreferences((s) => s.languageChosen === true);
  const restart = useSyncExternalStore(subscribeDirection, isDirectionPending);

  const choose = (code: LanguageCode) => {
    haptic.select();
    // The phone's own language stays "Follow device", so a later change of the phone's language carries over.
    setLanguage(code === deviceLanguage() ? 'system' : code);
  };
  const go = () => {
    confirmLanguage();
    router.replace('/life-reset/setup');
  };

  return (
    <Screen edges={['bottom']}>
      <Animated.View entering={FadeIn.duration(600)} style={StyleSheet.absoluteFill} pointerEvents="none">
        <WorldBackdrop zoneTop={insets.top + space.xl} />
      </Animated.View>
      <ScrollView
        contentContainerStyle={[styles.wrap, { paddingTop: insets.top + space.xxl }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.delay(120).duration(500)} style={styles.head}>
          <ThemedView style={[styles.globe, { backgroundColor: c.surface }]}>
            <Ionicons name="globe-outline" size={22} color={c.accentInk} />
          </ThemedView>
          <T v="title" accessibilityRole="header">
            {t('settings.language.title')}
          </T>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(220).duration(500)}>
          <ThemedView style={[styles.panel, { backgroundColor: c.surface }]} accessibilityRole="radiogroup">
            {READY_LANGUAGES.map((l, i) => {
              const on = l.code === shown;
              return (
                <View key={l.code}>
                  {i > 0 ? <ThemedView style={[styles.rule, { backgroundColor: c.border }]} /> : null}
                  <Pressable
                    onPress={() => choose(l.code)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={l.native}
                    accessibilityLanguage={l.code}
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.6 : 1 }]}
                  >
                    <T color={c.text} style={[styles.name, on && styles.on]}>
                      {l.native}
                    </T>
                    {on ? <Ionicons name="checkmark" size={20} color={c.accentInk} /> : null}
                  </Pressable>
                </View>
              );
            })}
          </ThemedView>
        </Animated.View>
      </ScrollView>
      <View style={styles.foot}>
        {restart && chosen ? (
          <ThemedView style={[styles.restart, { backgroundColor: c.surface }]}>
            <T color={c.text}>{t('settings.language.restartBody')}</T>
            <Button
              label={t('settings.language.restartNow')}
              onPress={() => {
                confirmLanguage();
                void reloadAppAsync();
              }}
            />
            <Button label={t('common.continue')} kind="ghost" onPress={go} />
          </ThemedView>
        ) : (
          <Button label={t('common.continue')} onPress={go} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: space.xl, paddingBottom: space.lg, gap: space.lg },
  head: { gap: space.md, alignItems: 'flex-start' },
  globe: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  panel: { borderRadius: radius.lg, paddingHorizontal: space.lg },
  rule: { height: StyleSheet.hairlineWidth },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  name: { flex: 1 },
  on: { fontWeight: '700' },
  foot: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.lg, gap: space.sm },
  restart: { borderRadius: radius.lg, padding: space.lg, gap: space.sm },
});
