import { Redirect } from 'expo-router';
import { NewAscent } from '../../components/beyond/NewAscent';
import { PROGRAM_DAYS } from '../../core/dates';
import { pilotToday, useResetPilot } from '../../store/resetPilot';

/** Begin a New Ascent (modal): from "What's next?" or Settings, once the summit day is behind. */
export default function AscentRoute() {
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  if (!program || pilotToday({ program, devDayOffset: offset }) <= PROGRAM_DAYS) return <Redirect href="/" />;
  return <NewAscent />;
}
