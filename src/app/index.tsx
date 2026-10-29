import { Redirect } from 'expo-router';
import { usePilotActive } from '../store/pilotGate';
import { useApp } from '../store/useApp';

/**
 * Where the app opens: the program shown (a Life Reset, or a V1/V2 program kept as it was), or the start screen
 * when there's none. In development and internal builds the start screen leads into the Life Reset set-up.
 */
export default function Index() {
  const started = useApp((s) => s.startedAt !== null);
  const lifeReset = usePilotActive();
  return <Redirect href={started || lifeReset ? '/today' : '/welcome'} />;
}
