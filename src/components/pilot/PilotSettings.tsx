import type { Ionicons } from '@expo/vector-icons';
import { removeAllTemps } from '../../lib/appFiles';
import { flushStorage } from '../../store/storage';
import { router } from 'expo-router';
import type { ComponentType, ReactNode } from 'react';
import { Alert } from 'react-native';
import { PROGRAM_DAYS } from '../../core/dates';
import * as P from '../../core/reset/pilot';
import { startNewAscent } from '../../store/ascent';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { useTheme } from '../../theme';
import { T } from '../ui';

type SectionC = ComponentType<{ title: string; children: ReactNode }>;
type RowC = ComponentType<{
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  destructive?: boolean;
}>;

/**
 * Settings → Your program: where the Life Reset is, what comes after the summit, and ending it (after a confirmation;
 * after the summit it can be kept in Past journeys instead of deleted).
 */
export function PilotSettings({ Section, Row }: { Section: SectionC; Row: RowC }) {
  const { c } = useTheme();
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
    else Alert.alert('It couldn’t be kept just now', 'Nothing was changed. Please try again.');
  };

  const end = () =>
    pastSummit
      ? Alert.alert(
          'End the Life Reset?',
          'Keep it in Past journeys, with its story, or delete it. Either way you can start a new one.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Keep in Past journeys', onPress: () => void keep() },
            { text: 'Delete it', style: 'destructive', onPress: del },
          ],
        )
      : Alert.alert('End the Life Reset?', 'Its days and progress are deleted, and you can start a new one.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'End the Life Reset', style: 'destructive', onPress: del },
        ]);

  const ascent = program ? P.ascentOf(program) : 1;
  const where = !program
    ? 'You haven’t started your Life Reset yet.'
    : program.after
      ? `Keep My Momentum · Day ${today}${ascent > 1 ? ` · Ascent ${ascent}` : ''}.`
      : today > PROGRAM_DAYS
        ? 'Summit reached. Choose what’s next whenever you’re ready.'
        : `The 66-day Life Reset · Day ${Math.min(today, PROGRAM_DAYS)} of ${PROGRAM_DAYS}${ascent > 1 ? ` · Ascent ${ascent}` : ''}.`;

  return (
    <Section title="Your program">
      <T v="caption" color={c.textDim} style={{ paddingTop: 12 }}>
        {where}
      </T>
      {program && P.awaitingChoice(program, today) ? (
        <Row label="What’s next?" icon="flag-outline" onPress={() => router.push('/life-reset/next')} />
      ) : null}
      {program && today > PROGRAM_DAYS ? (
        <Row label="Begin a New Ascent" icon="trending-up-outline" onPress={() => router.push('/life-reset/ascent')} />
      ) : null}
      {program ? (
        <Row label="End the Life Reset" icon="trash-outline" destructive onPress={end} />
      ) : (
        <Row label="Start the Life Reset" icon="leaf-outline" onPress={() => router.push('/life-reset/setup')} />
      )}
    </Section>
  );
}
