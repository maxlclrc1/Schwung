import { Redirect } from 'expo-router';
import { useResetPilot } from '../store/resetPilot';

/** Where the app opens: the program, or the start screen (which leads into set-up) when there's none yet. */
export default function Index() {
  const started = useResetPilot((s) => s.program !== null);
  return <Redirect href={started ? '/today' : '/welcome'} />;
}
