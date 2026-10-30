import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { StoryKeepsake } from '../../components/story/StoryKeepsake';
import { storyAvailable } from '../../core/reset/story';
import { useJourneys } from '../../store/journeys';
import { pilotToday, useResetPilot } from '../../store/resetPilot';

/**
 * The 66-Day Story (full screen): from the summit ceremony (then on to "What's next?"), from Journey after Day 66,
 * or a past journey's (`journey`, from Past journeys).
 */
export default function StoryRoute() {
  const { journey, from } = useLocalSearchParams<{ journey?: string; from?: string }>();
  const program = useResetPilot((s) => s.program);
  const offset = useResetPilot((s) => s.devDayOffset);
  const past = useJourneys((s) => (journey ? s.journeys.find((j) => j.id === journey) : undefined));
  if (journey) return past ? <StoryKeepsake archived={past.program} /> : <Redirect href="/" />;
  if (!program || !storyAvailable(program, pilotToday({ program, devDayOffset: offset }))) return <Redirect href="/" />;
  const next = from === 'summit' && !program.after;
  return <StoryKeepsake onClose={next ? () => router.replace('/life-reset/next') : undefined} />;
}
