import type { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { ComponentType, ReactNode } from 'react';
import { Alert } from 'react-native';
import { useFieldNotes } from '../../store/fieldNotes';
import { useResetPilot } from '../../store/resetPilot';

type SectionC = ComponentType<{ title: string; children: ReactNode }>;
type RowC = ComponentType<{
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  destructive?: boolean;
}>;

/** Settings: start, open, leave or end the Life Reset. The previous program is never touched. */
export function PilotSettings({ Section, Row }: { Section: SectionC; Row: RowC }) {
  const program = useResetPilot((s) => s.program);
  const active = useResetPilot((s) => s.active);
  const open = () => {
    useResetPilot.getState().setActive(true);
    useFieldNotes.getState().setActive(false);
    if (router.canDismiss()) router.dismissAll();
    router.replace('/today');
  };
  const end = () =>
    Alert.alert(
      'End the Life Reset?',
      'Its days and progress are deleted. Your previous program stays exactly as it is.',
      [
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
      ],
    );
  return (
    <Section title="Life Reset · testing">
      {!program ? (
        <Row label="Start the 66-day Life Reset" icon="flask-outline" onPress={() => router.push('/pilot/setup')} />
      ) : active ? (
        <Row
          label="Switch to my previous program"
          icon="return-down-back-outline"
          onPress={() => {
            useResetPilot.getState().setActive(false);
            if (router.canDismiss()) router.dismissAll();
            router.replace('/');
          }}
        />
      ) : (
        <Row label="Open the Life Reset" icon="flask-outline" onPress={open} />
      )}
      {program ? <Row label="End the Life Reset" icon="trash-outline" destructive onPress={end} /> : null}
    </Section>
  );
}
