import { useSyncExternalStore } from 'react';
import { makeMutable } from 'react-native-reanimated';

/*
 * What the onboarding finale (onboarding/Handoff.tsx) and the ceremonies (CeremonyHost) share: whether the finale
 * is up (no ceremony starts under it), whether Day 1 was asked for by the finale's Begin Day 1, and the ceremony's
 * cover on the UI thread (1 while a ceremony covers the app, easing to 0 as Habits shows through; the Habits page
 * rises its last few points with it).
 */

export const ceremonyCover = makeMutable(0);

type State = { finaleUp: boolean; day1FromFinale: boolean; ceremonyUp: boolean; welcomeUp: boolean };
let state: State = { finaleUp: false, day1FromFinale: false, ceremonyUp: false, welcomeUp: false };
const listeners = new Set<() => void>();

export function setCeremonyState(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function useCeremonyState(): State {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
