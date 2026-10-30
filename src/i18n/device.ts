import { getLocales } from 'expo-localization';
import { AppState } from 'react-native';
import { usePreferences, type LanguagePreference } from '../store/preferences';
import { applyDirection } from './direction';
import { language, setLanguage } from './index';
import { FALLBACK_LANGUAGE, matchLanguage, type LanguageCode } from './languages';

/*
 * Which language Schwung speaks: the one chosen in Settings → Language, or (Follow device) the first of the phone's
 * preferred languages Schwung has, else English. Applied at launch, whenever the choice changes, and when the app
 * comes back to the foreground (the phone's language may have changed meanwhile). Changing it never touches the
 * program: only the words change.
 */

export function deviceLanguage(): LanguageCode {
  try {
    for (const l of getLocales()) {
      const m = matchLanguage(l.languageTag);
      if (m) return m;
    }
  } catch {
    // No locale information: English.
  }
  return FALLBACK_LANGUAGE;
}

export const effectiveLanguage = (pref: LanguagePreference): LanguageCode =>
  pref === 'system' ? deviceLanguage() : pref;

let started = false;

// Whether this launch still shows the other layout direction (a restart finishes the switch).
let directionPending = false;
const listeners = new Set<() => void>();
function setDirectionPending(v: boolean) {
  if (v === directionPending) return;
  directionPending = v;
  listeners.forEach((l) => l());
}
export const isDirectionPending = () => directionPending;
export function subscribeDirection(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Once, at launch: follow the preference from now on. */
export function startLanguageSync() {
  if (started) return;
  started = true;
  const apply = () => {
    setLanguage(effectiveLanguage(usePreferences.getState().language));
    setDirectionPending(applyDirection(language()));
  };
  apply();
  usePreferences.subscribe((s, prev) => s.language !== prev.language && apply());
  usePreferences.persist.onFinishHydration(apply);
  AppState.addEventListener('change', (s) => s === 'active' && apply());
}
