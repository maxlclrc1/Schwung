import { Redirect } from 'expo-router';
import { memo } from 'react';
import { PilotToday } from '../../components/pilot/PilotToday';
import { useResetPilot } from '../../store/resetPilot';

/** The Habits tab. Memoized, so a tab change (which re-renders the navigator) doesn't re-render the page. */
export default function Today() {
  return <TodayPage />;
}

const TodayPage = memo(function TodayPage() {
  const started = useResetPilot((s) => s.program !== null);
  // No program yet (ended, or opened directly): the start screen leads into set-up.
  if (!started) return <Redirect href="/welcome" />;
  return <PilotToday />;
});
