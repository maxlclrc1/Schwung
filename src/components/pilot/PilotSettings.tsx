import { removeAllTemps } from '../../lib/appFiles';
import { flushStorage } from '../../store/storage';
import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet } from 'react-native';
import { PROGRAM_DAYS } from '../../core/dates';
import * as P from '../../core/reset/pilot';
import { startNewAscent } from '../../store/ascent';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { space, useTheme } from '../../theme';
import { Row, Section } from '../settingsRows';
import { T } from '../ui';
import { useT } from '../../i18n/react';
import { usePreferences } from '../../store/preferences';

/**
 * Settings → Your program, last on the page: where the Life Reset is, what comes after the summit, and ending it (a
 * red line of text, after a confirmation; after the summit it can be kept in Past journeys instead of deleted).
 */
export function PilotSettings() {
  const { c } = useTheme();
  const t = useT();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const today = program ? pilotToday({ program, devDayOffset: offset }) : 0;
  const pastSummit = !!program && (today > PROGRAM_DAYS || !!program.ceremonies?.summit);

  const leave = () => {
    // Its temporary share files go with it (story images, exports); recovery copies and Photos are untouched.
    try {
      removeAllTemps();
    } catch {
      // Any left are removed on a later launch.
    }
    void flushStorage().catch(() => {});
    // A fresh start opens on the language again (index.tsx).
    usePreferences.setState({ languageChosen: false });
    if (router.canDismiss()) router.dismissAll();
    router.replace('/');
  };
  const del = () => {
    useResetPilot.getState().end();
    leave();
  };
  const keep = async () => {
    const r = await startNewAscent(null);
    if (r.ok) leave();
    else Alert.alert(t('settings.program.keepFailedTitle'), t('settings.program.keepFailedBody'));
  };

  const end = () =>
    pastSummit
      ? Alert.alert(t('settings.program.endTitle'), t('settings.program.endKeepBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.program.keep'), onPress: () => void keep() },
          { text: t('settings.program.deleteIt'), style: 'destructive', onPress: del },
        ])
      : Alert.alert(t('settings.program.endTitle'), t('settings.program.endBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('settings.program.end'), style: 'destructive', onPress: del },
        ]);

  const ascent = program ? P.ascentOf(program) : 1;
  const where = !program
    ? t('settings.program.none')
    : program.after
      ? t(ascent > 1 ? 'settings.program.momentumAscent' : 'settings.program.momentum', { day: today, ascent })
      : today > PROGRAM_DAYS
        ? t('settings.program.summit')
        : t(ascent > 1 ? 'settings.program.runningAscent' : 'settings.program.running', {
            day: Math.min(today, PROGRAM_DAYS),
            total: PROGRAM_DAYS,
            ascent,
          });

  return (
    <Section title={t('settings.program.title')}>
      <T color={c.textDim} style={styles.where}>
        {where}
      </T>
      {program && P.awaitingChoice(program, today) ? (
        <Row
          label={t('settings.program.whatsNext')}
          icon="flag-outline"
          onPress={() => router.push('/life-reset/next')}
        />
      ) : null}
      {program && today > PROGRAM_DAYS ? (
        <Row
          label={t('settings.program.newAscent')}
          icon="trending-up-outline"
          onPress={() => router.push('/life-reset/ascent')}
        />
      ) : null}
      {program ? (
        <Pressable onPress={end} accessibilityRole="button" hitSlop={4} style={styles.end}>
          {({ pressed }) => (
            <T color={c.danger} style={[styles.endText, { opacity: pressed ? 0.6 : 1 }]}>
              {t('settings.program.end')}
            </T>
          )}
        </Pressable>
      ) : (
        <Row label={t('settings.program.start')} icon="leaf-outline" onPress={() => router.push('/life-reset/setup')} />
      )}
    </Section>
  );
}

const styles = StyleSheet.create({
  where: { paddingTop: space.sm, paddingBottom: space.xs },
  end: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  endText: { fontWeight: '500' },
});
