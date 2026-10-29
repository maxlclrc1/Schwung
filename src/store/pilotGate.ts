import type { ComponentType } from 'react';
import { useApp } from './useApp';

/*
 * The one door to the Life Reset (it began as the pilot, hence the names). Development and internal builds load it
 * and make it the default experience; in a production build the literal check below is folded to false when the
 * bundle is made, so its store, screens and rules aren't in the public app at all (not just hidden). Everything
 * outside reaches it only through `pilot`.
 */

type Pilot = {
  store: typeof import('./resetPilot');
  Today: ComponentType;
  Setup: ComponentType;
  Habit: ComponentType;
  Settings: typeof import('../components/pilot/PilotSettings').PilotSettings;
  Invite: ComponentType;
  Insights: ComponentType;
  journey: typeof import('../components/pilot/pilotJourney').pilotJourney;
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
        Invite: require('../components/pilot/LifeResetInvite').LifeResetInvite,
        Insights: require('../components/pilot/PilotInsights').PilotInsights,
        journey: require('../components/pilot/pilotJourney').pilotJourney,
      }
    : null;
/* eslint-enable @typescript-eslint/no-require-imports */

function useActivePilot(): boolean {
  const program = pilot!.store.useResetPilot((s) => s.program);
  const active = pilot!.store.useResetPilot((s) => s.active);
  const legacy = useApp((s) => s.startedAt !== null);
  return pilot!.store.resetPilotAvailable() && pilot!.store.lifeResetShown({ program, active }, legacy);
}
const useNoPilot = () => false;

/**
 * Whether the app shows the Life Reset rather than a V1/V2 program (store/resetPilot.ts lifeResetShown): Habits,
 * Journey, Insights and Settings all follow it. Always false in the public release.
 */
export const usePilotActive: () => boolean = pilot ? useActivePilot : useNoPilot;

type Active = { program: import('../core/reset/pilot').PilotProgram; today: number };
function useActiveProgram(): Active | null {
  const shown = useActivePilot();
  const program = pilot!.store.useResetPilot((s) => s.program);
  const offset = pilot!.store.useResetPilot((s) => s.devDayOffset);
  if (!shown || !program) return null;
  return { program, today: pilot!.store.pilotToday({ program, devDayOffset: offset }) };
}
const useNoProgram = () => null;

/** The Life Reset program while it's the one shown (and its day), for Journey and Insights; null otherwise. */
export const useLifeReset: () => Active | null = pilot ? useActiveProgram : useNoProgram;

/** The pilot's save is loaded (or there is none in this build). */
export const pilotHydrated = () => !pilot || pilot.store.useResetPilot.persist.hasHydrated();
export const onPilotHydrated = (cb: () => void) =>
  pilot ? pilot.store.useResetPilot.persist.onFinishHydration(cb) : () => {};
