import { Redirect } from 'expo-router';
import { fieldNotesAvailable, useFieldNotes } from '../store/fieldNotes';
import { usePilotActive } from '../store/pilotGate';
import { useApp } from '../store/useApp';

export default function Index() {
  const started = useApp((s) => s.startedAt !== null);
  // A tester who chose Field Notes (development and internal-testing builds only) opens straight into it.
  const fieldNotes = useFieldNotes((s) => s.active) && fieldNotesAvailable();
  // The Life Reset pilot (testing builds only) shows on the Habits tab, beside the untouched program.
  const pilot = usePilotActive();
  if (fieldNotes) return <Redirect href="/fieldnotes" />;
  if (pilot) return <Redirect href="/today" />;
  return <Redirect href={started ? '/today' : '/welcome'} />;
}
