import { Redirect } from 'expo-router';
import { pilot } from '../../store/pilotGate';

/** A Life Reset habit’s details: development and internal builds (see store/pilotGate.ts). */
export default function PilotHabitRoute() {
  if (!pilot || !pilot.store.resetPilotAvailable()) return <Redirect href="/" />;
  return <pilot.Habit />;
}
