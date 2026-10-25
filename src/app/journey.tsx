import { useLocalSearchParams } from 'expo-router';
import { JourneyView } from '../components/JourneyView';
import { SheetHeader } from '../components/SheetHeader';
import { Screen } from '../components/ui';

/** The journey as a sheet over Today (the public release; testing builds show it as a tab). */
export default function Journey() {
  // Opened from a marker on the Ascent: outline that day.
  const picked = Number(useLocalSearchParams<{ day?: string }>().day) || null;
  return (
    <Screen edges={['bottom']}>
      <SheetHeader title="Your journey" />
      <JourneyView picked={picked} />
    </Screen>
  );
}
