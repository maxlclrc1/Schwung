import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import type * as P from '../core/reset/pilot';

/*
 * When a saved Life Reset can't be fully understood, Schwung keeps it instead of guessing or deleting it.
 *
 * - The original saved text is copied, unchanged, into a recovery slot before anything else happens. Slots are
 *   write-once: an existing copy is never overwritten (a different one goes into the next slot), and the same text
 *   is never stored twice, so repeated launches are safe.
 * - Until the person decides (Restore available progress, Export, or Start over), the Life Reset's normal saves are
 *   held back, so the original stays where it is too.
 * - Nothing here is persisted: on the next launch the same save is read the same way, and the same screen returns.
 */

export type RecoveryReason = 'partial' | 'unreadable' | 'newer';

export type Recovery = {
  pending: boolean;
  reason: RecoveryReason | null;
  /** What could be recovered (partial only). */
  recovered: P.PilotProgram | null;
  /** In plain words, what couldn't be. */
  lost: string[];
  /** The original saved text, for export. */
  raw: string | null;
  /** Where the copy is kept (null if keeping it failed: then nothing may be overwritten at all). */
  keptAt: string | null;
};

export const useRecovery = create<Recovery>(() => ({
  pending: false,
  reason: null,
  recovered: null,
  lost: [],
  raw: null,
  keptAt: null,
}));

export const RECOVERY_SLOTS = 9;
export const recoveryKey = (name: string, slot: number) =>
  slot === 1 ? `${name}-recovery` : `${name}-recovery-${slot}`;

/**
 * Keeps `raw` in the first free recovery slot (or finds it already kept). Returns the slot's key, or null if it
 * couldn't be written (the original then stays the only copy, and saves stay held back).
 */
export async function keepRaw(name: string, raw: string): Promise<string | null> {
  try {
    for (let slot = 1; slot <= RECOVERY_SLOTS; slot++) {
      const key = recoveryKey(name, slot);
      const there = await AsyncStorage.getItem(key);
      if (there === raw) return key;
      if (there === null) {
        await AsyncStorage.setItem(key, raw);
        // Read back: only a copy that's really there counts as kept.
        return (await AsyncStorage.getItem(key)) === raw ? key : null;
      }
    }
    // Every slot holds a different copy: keep them all; the original stays in place.
    return null;
  } catch {
    return null;
  }
}

/** Holds the Life Reset's saves back and shows the recovery screen. */
export function startRecovery(r: Omit<Recovery, 'pending' | 'keptAt'>, keptAt: string | null) {
  useRecovery.setState({ ...r, pending: true, keptAt });
}

export function endRecovery() {
  useRecovery.setState({ pending: false, reason: null, recovered: null, lost: [], raw: null, keptAt: null });
}
