import { Redirect } from 'expo-router';
import { usePreferences } from '../store/preferences';
import { ageRestricted } from '../core/reset/pilot';
import { useResetPilot } from '../store/resetPilot';

/**
 * Where the app opens: the program; or, when there's none, the language (first launch, and after a Life Reset ends
 * or the data is deleted) and then the start screen, which leads into set-up. A program started under 18 opens on
 * the age notice instead (its data stays, with export and deletion).
 */
export default function Index() {
  const started = useResetPilot((s) => s.program !== null);
  const restricted = useResetPilot((s) => !!s.program && ageRestricted(s.program));
  const languageChosen = usePreferences((s) => s.languageChosen === true);
  return (
    <Redirect
      href={restricted ? '/age-limit' : started ? '/today' : languageChosen ? '/welcome' : '/choose-language'}
    />
  );
}
