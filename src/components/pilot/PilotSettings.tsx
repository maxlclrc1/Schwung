import type { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentType, ReactNode } from 'react';
import { Alert } from 'react-native';
import { PROGRAM_DAYS } from '../../core/dates';
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

/** Settings → Your program: where the Life Reset is, and ending it (after a confirmation; it can't be undone). */
export function PilotSettings({ Section, Row }: { Section: SectionC; Row: RowC }) {
  const { c } = useTheme();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const day = program ? Math.min(pilotToday({ program, devDayOffset: offset }), PROGRAM_DAYS) : 0;

  const end = () =>
    Alert.alert('End the Life Reset?', 'Its days and progress are deleted, and you can start a new one.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End the Life Reset',
        style: 'destructive',
        onPress: () => {
          useResetPilot.getState().end();
          if (router.canDismiss()) router.dismissAll();
          router.replace('/');
        },
      },
    ]);

  return (
    <Section title="Your program">
      <T v="caption" color={c.textDim} style={{ paddingTop: 12 }}>
        {program
          ? `The 66-day Life Reset · Day ${day} of ${PROGRAM_DAYS}.`
          : 'You haven’t started your Life Reset yet.'}
      </T>
      {program ? (
        <Row label="End the Life Reset" icon="trash-outline" destructive onPress={end} />
      ) : (
        <Row label="Start the Life Reset" icon="leaf-outline" onPress={() => router.push('/life-reset/setup')} />
      )}
    </Section>
  );
}
