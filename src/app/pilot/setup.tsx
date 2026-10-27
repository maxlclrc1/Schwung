import { Redirect } from 'expo-router';
import { pilot } from '../../store/pilotGate';

/** Life Reset pilot set-up: development and internal-testing builds only (see store/pilotGate.ts). */
export default function PilotSetupRoute() {
  if (!pilot || !pilot.store.resetPilotAvailable()) return <Redirect href="/" />;
  return <pilot.Setup />;
}
