import { Redirect } from 'expo-router';
import { pilot } from '../../store/pilotGate';

/** Life Reset set-up: development and internal builds (see store/pilotGate.ts). */
export default function PilotSetupRoute() {
  if (!pilot || !pilot.store.resetPilotAvailable()) return <Redirect href="/" />;
  return <pilot.Setup />;
}
