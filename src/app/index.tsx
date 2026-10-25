import { Redirect } from 'expo-router';
import { fieldNotesAvailable, useFieldNotes } from '../store/fieldNotes';
import { useApp } from '../store/useApp';

export default function Index() {
  const started = useApp((s) => s.startedAt !== null);
  // A tester who chose Field Notes (development and internal-testing builds only) opens straight into it.
  const fieldNotes = useFieldNotes((s) => s.active) && fieldNotesAvailable();
  if (fieldNotes) return <Redirect href="/fieldnotes" />;
  return <Redirect href={started ? '/today' : '/welcome'} />;
}
