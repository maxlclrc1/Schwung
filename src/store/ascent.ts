import type { PilotProgram } from '../core/reset/pilot';
import { commitTogether, persisted } from './commit';
import { archiveEntry, JOURNEYS_VERSION, journeysKey, useJourneys } from './journeys';
import { useRecovery } from './recovery';
import { RESET_PILOT_VERSION, resetPilotKey, useResetPilot } from './resetPilot';
import { flushStorage } from './storage';

/*
 * Begin a New Ascent (docs/BEYOND_THE_SUMMIT_PLAN.md): the finished Life Reset joins Past journeys and the new one
 * (core/reset/pilot.ts beginAscent) takes its place, in one write (store/commit.ts). An interruption leaves either
 * the finished Life Reset as it was, or the archive and the new one together; never one without the other.
 */

export type AscentResult = { ok: true } | { ok: false; reason: 'noProgram' | 'held' | 'storage' };

/** `next` null: the finished Life Reset is kept in Past journeys and none runs (ending it after the summit). */
export async function startNewAscent(next: PilotProgram | null, now: Date = new Date()): Promise<AscentResult> {
  const prev = useResetPilot.getState().program;
  if (!prev) return { ok: false, reason: 'noProgram' };
  // A save waiting for recovery, or past journeys that couldn't be read: nothing may be written over them.
  if (useRecovery.getState().pending || useJourneys.getState().held) return { ok: false, reason: 'held' };
  try {
    await flushStorage();
  } catch {
    return { ok: false, reason: 'storage' };
  }
  const journeys = [...useJourneys.getState().journeys, archiveEntry(prev, now)];
  const { devDayOffset } = useResetPilot.getState();
  const ok = await commitTogether(
    [
      [resetPilotKey(), persisted({ program: next, devDayOffset }, RESET_PILOT_VERSION)],
      [journeysKey(), persisted({ journeys }, JOURNEYS_VERSION)],
    ],
    () => {
      useResetPilot.setState({});
      useJourneys.setState({});
    },
  );
  if (!ok) return { ok: false, reason: 'storage' };
  useJourneys.setState({ journeys });
  useResetPilot.setState({ program: next });
  return { ok: true };
}
