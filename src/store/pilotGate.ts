import type { ComponentType } from 'react';

/*
 * The one door to the Life Reset pilot. Development and internal-testing builds load it; in a production build the
 * literal check below is folded to false when the bundle is made, so the pilot's store, screens and rules aren't in
 * the public app at all (not just hidden). Everything outside the pilot reaches it only through `pilot`.
 */

type Pilot = {
  store: typeof import('./resetPilot');
  Today: ComponentType;
  Setup: ComponentType;
  Habit: ComponentType;
  Settings: typeof import('../components/pilot/PilotSettings').PilotSettings;
};

/* eslint-disable @typescript-eslint/no-require-imports */
export const pilot: Pilot | null =
  __DEV__ || process.env.EXPO_PUBLIC_SCHWUNG_CHANNEL === 'internal'
    ? {
        store: require('./resetPilot'),
        Today: require('../components/pilot/PilotToday').PilotToday,
        Setup: require('../components/pilot/PilotSetup').PilotSetup,
        Habit: require('../components/pilot/PilotHabit').PilotHabit,
        Settings: require('../components/pilot/PilotSettings').PilotSettings,
      }
    : null;
/* eslint-enable @typescript-eslint/no-require-imports */

function useActivePilot(): boolean {
  const on = pilot!.store.useResetPilot((s) => s.active && s.program !== null);
  return on && pilot!.store.resetPilotAvailable();
}
const useNoPilot = () => false;

/** Whether the Habits tab shows the pilot (a tester turned it on). Always false in the public release. */
export const usePilotActive: () => boolean = pilot ? useActivePilot : useNoPilot;

/** The pilot's save is loaded (or there is none in this build). */
export const pilotHydrated = () => !pilot || pilot.store.useResetPilot.persist.hasHydrated();
export const onPilotHydrated = (cb: () => void) =>
  pilot ? pilot.store.useResetPilot.persist.onFinishHydration(cb) : () => {};
