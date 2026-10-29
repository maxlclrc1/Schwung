import { Redirect } from 'expo-router';
import { StoryKeepsake } from '../../components/story/StoryKeepsake';
import { storyAvailable } from '../../core/reset/story';
import { pilotToday, useResetPilot } from '../../store/resetPilot';

/** The 66-Day Story (full screen): from the summit ceremony, and from Journey after Day 66. */
export default function StoryRoute() {
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  if (!program || !storyAvailable(program, pilotToday({ program, devDayOffset: offset }))) return <Redirect href="/" />;
  return <StoryKeepsake />;
}
