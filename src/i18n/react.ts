import { useSyncExternalStore } from 'react';
import { language, subscribeLanguage, t } from './index';

/*
 * Screens follow the language: `useT()` returns `t` and re-renders the component when the language changes (so a
 * switch in Settings updates every mounted screen at once, with nothing reset). Memoized values that hold text
 * should list `useLanguage()` among their dependencies.
 */

export function useLanguage() {
  return useSyncExternalStore(subscribeLanguage, language, language);
}

export function useT() {
  useLanguage();
  return t;
}
