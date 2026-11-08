import { Ionicons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { ageRestricted } from '../core/reset/pilot';
import { Button, Screen, T } from '../components/ui';
import { useT } from '../i18n/react';
import { useResetPilot } from '../store/resetPilot';
import { space, useTheme } from '../theme';
import { pushOnce } from '../lib/navigation';

/**
 * A Life Reset started with an age under 18, from when the minimum age was 16 (pilot.ts ageRestricted). It's kept
 * whole and never changed or deleted here: the person can export or delete their data (Privacy & Data), or say
 * they're 18 or older now and carry on.
 */
export default function AgeLimit() {
  const { c } = useTheme();
  const t = useT();
  const restricted = useResetPilot((s) => !!s.program && ageRestricted(s.program));
  if (!restricted) return <Redirect href="/" />;

  const adult = () =>
    Alert.alert(t('settings.ageLimit.confirmTitle'), t('settings.ageLimit.confirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.ageLimit.confirm'),
        onPress: () => {
          useResetPilot.getState().confirmAdult();
          router.replace('/today');
        },
      },
    ]);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.icon, { backgroundColor: c.mistSoft }]}>
          <Ionicons name="shield-checkmark-outline" size={26} color={c.mistInk} />
        </View>
        <T v="title" accessibilityRole="header">
          {t('settings.ageLimit.title')}
        </T>
        <T color={c.textDim}>{t('settings.ageLimit.body')}</T>
        <View style={styles.actions}>
          <Button label={t('settings.ageLimit.data')} onPress={() => pushOnce('/privacy')} />
          <Button label={t('settings.ageLimit.adult')} kind="ghost" onPress={adult} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: space.xl,
    paddingTop: space.xxl,
    gap: space.lg,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: space.sm, marginTop: space.sm },
});
