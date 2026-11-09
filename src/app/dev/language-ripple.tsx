import { Redirect } from 'expo-router';
import { LanguageRipple } from '../../components/dev/LanguageRipple';
import { devTools } from '../../lib/flags';

/** Development builds only: the language-ripple prototype (components/dev/LanguageRipple.tsx). Elsewhere, Settings. */
export default function LanguageRippleRoute() {
  if (!devTools()) return <Redirect href="/settings" />;
  return <LanguageRipple />;
}
