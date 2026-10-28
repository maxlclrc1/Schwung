import { Redirect } from 'expo-router';
import { usePilotActive } from '../store/pilotGate';
import { useApp } from '../store/useApp';

export default function Index() {
  const started = useApp((s) => s.startedAt !== null);
  // The Life Reset (testing builds only) shows on the Habits tab, beside the untouched program.
  const pilot = usePilotActive();
  if (pilot) return <Redirect href="/today" />;
  return <Redirect href={started ? '/today' : '/welcome'} />;
}
