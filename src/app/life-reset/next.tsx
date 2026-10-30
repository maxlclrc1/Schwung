import { Redirect } from 'expo-router';
import { WhatsNext } from '../../components/beyond/WhatsNext';
import { PROGRAM_DAYS } from '../../core/dates';
import { pilotToday, useResetPilot } from '../../store/resetPilot';

/** "What's next?" (full screen): only once the summit is reached and nothing has been chosen yet. */
export default function NextRoute() {
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const today = program ? pilotToday({ program, devDayOffset: offset }) : 0;
  const open = !!program && !program.after && (!!program.ceremonies?.summit || today > PROGRAM_DAYS);
  if (!open) return <Redirect href="/" />;
  return <WhatsNext />;
}
