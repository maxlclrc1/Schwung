import { Redirect } from 'expo-router';
import { usePreferences } from '../store/preferences';
import { useResetPilot } from '../store/resetPilot';

/**
 * Where the app opens: the program; or, when there's none, the language (first launch, and after a Life Reset ends
 * or the data is deleted) and then the start screen, which leads into set-up.
 */
export default function Index() {
  const started = useResetPilot((s) => s.program !== null);
  const languageChosen = usePreferences((s) => s.languageChosen === true);
  return <Redirect href={started ? '/today' : languageChosen ? '/welcome' : '/choose-language'} />;
}
