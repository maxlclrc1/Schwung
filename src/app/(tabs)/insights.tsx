import { Redirect } from 'expo-router';
import { memo } from 'react';
import { InsightsPage, ProgramInsights } from '../../components/Insights';
import { Screen } from '../../components/ui';
import { useWorldLayer } from '../../components/WorldLayer';
import { tabs } from '../../lib/flags';
import { pilot, usePilotActive } from '../../store/pilotGate';

/**
 * The Insights tab (testing builds; it took Field Notes' place at the lakeside camp): the shown program's numbers,
 * the Life Reset's or the previous program's, never mixed.
 */
export default function InsightsTab() {
  return <InsightsTabPage />;
}

/** Memoized, so a tab change doesn't re-render the page before the slide can start. */
const InsightsTabPage = memo(function InsightsTabPage() {
  const world = useWorldLayer();
  const lifeReset = usePilotActive();
  if (!tabs()) return <Redirect href="/" />;
  return (
    <Screen edges={[]} transparent={world}>
      <InsightsPage>{pilot && lifeReset ? <pilot.Insights /> : <ProgramInsights />}</InsightsPage>
    </Screen>
  );
});
