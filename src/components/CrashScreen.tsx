import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Appearance, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { t } from '../i18n';
import { palettes } from '../theme';

/*
 * What's shown if a screen fails to draw (the root layout's ErrorBoundary, app/_layout.tsx), instead of a blank or
 * closed app. It stands alone on purpose: no theme provider, store, navigation or saved data, since any of those may
 * be what failed. It never reads, writes or deletes a save: whatever was saved stays exactly as it was, and
 * "Try again" simply draws the app again.
 */
export function CrashScreen({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  const c = palettes[Appearance.getColorScheme() === 'light' ? 'light' : 'dark'];

  useEffect(() => {
    // It may happen before the first screen, while the splash screen still covers everything.
    void SplashScreen.hideAsync().catch(() => {});
    if (__DEV__) console.warn('Schwung crash screen:', error);
  }, [error]);

  return (
    <View style={[styles.fill, { backgroundColor: c.bg }]}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
          {t('common.crash.title')}
        </Text>
        <Text style={[styles.body, { color: c.textDim }]}>{t('common.crash.body')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void retry()}
          style={({ pressed }) => [styles.button, { backgroundColor: c.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={[styles.label, { color: c.onAccent }]}>{t('common.crash.retry')}</Text>
        </Pressable>
        <Text style={[styles.hint, { color: c.textDim }]}>{t('common.crash.hint')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingVertical: 64, gap: 16 },
  title: { fontSize: 26, fontWeight: '700' },
  body: { fontSize: 17, lineHeight: 25 },
  button: { marginTop: 8, borderRadius: 999, paddingVertical: 15, paddingHorizontal: 24, alignItems: 'center' },
  label: { fontSize: 17, fontWeight: '600' },
  hint: { fontSize: 14, lineHeight: 20 },
});
