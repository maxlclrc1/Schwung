import type { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentType, ReactNode } from 'react';
import { Alert } from 'react-native';
import { PROGRAM_DAYS } from '../../core/dates';
import { haptic } from '../../lib/haptics';
import { usePilotActive } from '../../store/pilotGate';
import { pilotToday, useResetPilot } from '../../store/resetPilot';
import { useApp } from '../../store/useApp';
import { useTheme } from '../../theme';
import { T } from '../ui';

type SectionC = ComponentType<{ title: string; children: ReactNode }>;
type RowC = ComponentType<{
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  destructive?: boolean;
}>;

const home = () => {
  if (router.canDismiss()) router.dismissAll();
  router.replace('/');
};

/**
 * Settings → Your program: which program is shown, and the explicit ways to change it. Switching never touches
 * either program's data; only "End the Life Reset" deletes anything (the Life Reset's own, after a confirmation).
 * The choice is saved with the Life Reset (`active`), so it holds across restarts.
 */
export function PilotSettings({ Section, Row }: { Section: SectionC; Row: RowC }) {
  const { c } = useTheme();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const previous = useApp((s) => s.startedAt !== null);
  const shown = usePilotActive();
  const day = program ? Math.min(pilotToday({ program, devDayOffset: offset }), PROGRAM_DAYS) : 0;

  // Switching deletes nothing and is one tap to undo, so it needs no confirmation (ending does).
  const toPrevious = () => {
    haptic.tap();
    useResetPilot.getState().setActive(false);
    home();
  };
  const toLifeReset = () => {
    haptic.tap();
    useResetPilot.getState().setActive(true);
    home();
  };
  const end = () =>
    Alert.alert(
      'End the Life Reset?',
      previous
        ? 'Its days and progress are deleted. Your previous program stays exactly as it is.'
        : 'Its days and progress are deleted, and you can start a new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End the Life Reset',
          style: 'destructive',
          onPress: () => {
            useResetPilot.getState().end();
            home();
          },
        },
      ],
    );

  return (
    <Section title="Your program">
      <T v="caption" color={c.textDim} style={{ paddingTop: 12 }}>
        {shown
          ? `You’re on the 66-day Life Reset · Day ${day} of ${PROGRAM_DAYS}.${previous ? ' Your previous program stays saved, with all its history.' : ''}`
          : !previous
            ? 'You haven’t started a program yet.'
            : program
              ? 'You’re on your previous program. Your Life Reset is saved and ready to switch to.'
              : 'You’re on your previous program. It stays saved, with all its history, if you start the Life Reset.'}
      </T>
      {shown ? (
        previous ? (
          <Row label="Switch to my previous program" icon="return-down-back-outline" onPress={toPrevious} />
        ) : null
      ) : program ? (
        <Row label="Switch to my Life Reset" icon="swap-horizontal-outline" onPress={toLifeReset} />
      ) : (
        <Row label="Start the Life Reset" icon="leaf-outline" onPress={() => router.push('/life-reset/setup')} />
      )}
      {program ? <Row label="End the Life Reset" icon="trash-outline" destructive onPress={end} /> : null}
    </Section>
  );
}
