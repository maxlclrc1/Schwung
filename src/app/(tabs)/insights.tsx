import { memo } from 'react';
import { InsightsPage } from '../../components/Insights';
import { PilotInsights } from '../../components/pilot/PilotInsights';
import { Screen } from '../../components/ui';
import { useResetPilot } from '../../store/resetPilot';

/** The Insights tab, at the lakeside camp of the shared world: the program's numbers, from its saved days. */
export default function InsightsTab() {
  return <InsightsTabPage />;
}

/** Memoized, so a tab change doesn't re-render the page before the slide can start. */
const InsightsTabPage = memo(function InsightsTabPage() {
  const started = useResetPilot((s) => s.program !== null);
  return (
    <Screen edges={[]} transparent>
      <InsightsPage>{started ? <PilotInsights /> : null}</InsightsPage>
    </Screen>
  );
});
