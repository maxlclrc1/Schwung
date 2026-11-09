import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import { language, subscribeLanguage, t, tIn } from './index';
import type { LanguageCode } from './languages';

/*
 * Screens follow the language: `useT()` returns `t` and re-renders the component when the language changes (so a
 * switch in Settings updates every mounted screen at once, with nothing reset). Memoized values that hold text
 * should list `useLanguage()` among their dependencies.
 *
 * `LanguageOverride` shows one subtree in another language without switching the app's
 * (components/LanguageRipple.tsx: the Language screen drawn in the language about to be chosen, revealed by the
 * ripple). Without it, nothing changes: the app's language, and `t` itself.
 */

const Override = createContext<LanguageCode | null>(null);
export const LanguageOverride = Override.Provider;

export function useLanguage(): LanguageCode {
  const app = useSyncExternalStore(subscribeLanguage, language, language);
  return useContext(Override) ?? app;
}

export function useT(): typeof t {
  const override = useContext(Override);
  useLanguage();
  return useMemo(() => (override ? (((key, params) => tIn(override, key, params)) as typeof t) : t), [override]);
}
