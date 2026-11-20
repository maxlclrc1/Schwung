import { Redirect, useLocalSearchParams } from 'expo-router';
import { WeeklyReflection } from '../../components/reflection/WeeklyReflection';
import { lastFinishedWeek } from '../../core/reset/reflections';
import { pilotToday, useResetPilot } from '../../store/resetPilot';

/**
 * A week's reflection (modal): opened from the invitation on Habits or from Journey's reflections, only ever for a
 * week that has finished. The route is also reachable by a `schwung://` link from outside the app, so it accepts no
 * answer (an answer is only ever saved by a tap on the sheet) and no week that hasn't finished yet.
 */
export default function ReflectRoute() {
  const params = useLocalSearchParams<{ week?: string; from?: string }>();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const week = Number(params.week);
  const finished = program ? lastFinishedWeek(pilotToday({ program, devDayOffset: offset })) : 0;
  if (!Number.isInteger(week) || week < 1 || week > finished) return <Redirect href="/" />;
  return <WeeklyReflection week={week} invite={params.from === 'invite'} />;
}
